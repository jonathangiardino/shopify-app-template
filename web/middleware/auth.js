import { Shopify } from "@shopify/shopify-api";
import { gdprTopics } from "@shopify/shopify-api/dist/webhooks/registry.js";
import { getShop, createShop, updateShop } from "../database/shops/handlers.js";
import { getTimestamp } from "../helpers/utils.js";
import { GET_SHOP_DATA } from "../graphql/queries/shop.js";

import ensureBilling from "../helpers/ensure-billing.js";
import topLevelAuthRedirect from "../helpers/top-level-auth-redirect.js";

export default function applyAuthMiddleware(
  app,
  { billing = { required: false } } = { billing: { required: false } }
) {
  app.get("/api/auth", async (req, res) => {
    const shop = Shopify.Utils.sanitizeShop(req.query.shop);
    if (!shop) {
      res.status(500);
      return res.send("No shop provided");
    }

    if (!req.signedCookies[app.get("top-level-oauth-cookie")]) {
      return res.redirect(
        `/api/auth/toplevel?shop=${encodeURIComponent(shop)}`
      );
    }

    const redirectUrl = await Shopify.Auth.beginAuth(
      req,
      res,
      shop,
      "/api/auth/callback",
      app.get("use-online-tokens")
    );

    res.redirect(redirectUrl);
  });

  app.get("/api/auth/toplevel", (req, res) => {
    const shop = Shopify.Utils.sanitizeShop(req.query.shop);
    if (!shop) {
      res.status(500);
      return res.send("No shop provided");
    }

    res.cookie(app.get("top-level-oauth-cookie"), "1", {
      signed: true,
      httpOnly: true,
      sameSite: "strict",
    });

    res.set("Content-Type", "text/html");

    res.send(
      topLevelAuthRedirect({
        apiKey: Shopify.Context.API_KEY,
        hostName: Shopify.Context.HOST_NAME,
        shop: shop,
      })
    );
  });

  app.get("/api/auth/callback", async (req, res) => {
    let fetchShopData = true;

    try {
      const session = await Shopify.Auth.validateAuthCallback(
        req,
        res,
        req.query
      );

      const host = Shopify.Utils.sanitizeHost(req.query.host, true);

      const responses = await Shopify.Webhooks.Registry.registerAll({
        shop: session.shop,
        accessToken: session.accessToken,
      });

      console.log(responses);

      Object.entries(responses).map(([topic, response]) => {
        // The response from registerAll will include errors for the GDPR topics.  These can be safely ignored.
        // To register the GDPR topics, please set the appropriate webhook endpoint in the
        // 'GDPR mandatory webhooks' section of 'App setup' in the Partners Dashboard.
        if (!response.success && !gdprTopics.includes(topic)) {
          console.log(
            `Failed to register ${topic} webhook: ${response.result.errors[0].message}`
          );
        }
      });

      const existingShop = await getShop(session.shop);
      const betaUsers = [""];

      if (!existingShop) {
        await createShop({
          shop: session.shop,
          scopes: session.scope,
          isInstalled: true,
          subscription: null,
          settings: null,
          installedAt: getTimestamp(),
          uninstalledAt: null,
          notifications: [],
          settings: { beta: betaUsers.includes(session.shop) ? true : false },
        });

        // Track install event
        // analytics.track({
        //   event: "install",
        //   userId: session.shop,
        // });
      } else if (!existingShop.isInstalled) {
        // This is a REINSTALL
        await updateShop({
          shop: session.shop,
          isInstalled: true,
          installedAt: getTimestamp(),
          uninstalledAt: null,
          showOnboarding: true,
          settings: { beta: betaUsers.includes(session.shop) ? true : false },
        });

        // Track reinstall event
        // analytics.track({
        //   event: "reinstall",
        //   userId: session.shop,
        // });
      } else {
        if (!!existingShop.shopData) {
          fetchShopData = false;
        }
      }

      if (fetchShopData) {
        const client = new Shopify.Clients.Graphql(
          session.shop,
          session.accessToken
        );

        // Track reauth event
        // analytics.track({
        //   event: "reauth",
        //   userId: session.shop,
        // });

        const res = await client.query({ data: GET_SHOP_DATA });

        if (!res?.body?.data?.shop) {
          console.warn(`Missing shop data on ${shop}`);
        } else {
          const shopData = res.body.data.shop;

          await updateShop({
            shop: session.shop,
            shopData,
          });
        }
      }

      // If billing is required, check if the store needs to be charged right away to minimize the number of redirects.
      let redirectUrl = `/?shop=${encodeURIComponent(
        session.shop
      )}&host=${encodeURIComponent(host)}`;
      if (billing.required) {
        const [hasPayment, confirmationUrl] = await ensureBilling(
          session,
          billing
        );

        if (!hasPayment) {
          redirectUrl = confirmationUrl;
        }
      }

      // Redirect to app with shop parameter upon auth
      res.redirect(redirectUrl);
    } catch (e) {
      console.warn(e);
      switch (true) {
        case e instanceof Shopify.Errors.InvalidOAuthError:
          res.status(400);
          res.send(e.message);
          break;
        case e instanceof Shopify.Errors.CookieNotFound:
        case e instanceof Shopify.Errors.SessionNotFound:
          // This is likely because the OAuth session cookie expired before the merchant approved the request
          const shop = Shopify.Utils.sanitizeShop(req.query.shop);
          if (!shop) {
            res.status(500);
            return res.send("No shop provided");
          }

          res.redirect(`/api/auth?shop=${encodeURIComponent(shop)}`);
          break;
        default:
          res.status(500);
          res.send(e.message);
          break;
      }
    }
  });
}
