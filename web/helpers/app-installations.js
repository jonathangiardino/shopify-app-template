import { Shopify } from "@shopify/shopify-api";
import { updateShop } from "../database/shops/handlers.js";
import { getTimestamp } from "./utils.js";

export const AppInstallations = {
  includes: async function (shopDomain) {
    const shopSessions =
      await Shopify.Context.SESSION_STORAGE.findSessionsByShop(shopDomain);

    if (shopSessions.length > 0) {
      for (const session of shopSessions) {
        if (session.accessToken) return true;
      }
    }

    return false;
  },

  delete: async function (shopDomain) {
    const shopSessions =
      await Shopify.Context.SESSION_STORAGE.findSessionsByShop(shopDomain);
    if (shopSessions.length > 0) {
      console.log("Deleting sessions for shop: " + shopDomain);
      await Shopify.Context.SESSION_STORAGE.deleteSessions(
        shopSessions.map((session) => session.id)
      );

      console.log("Setting " + shopDomain + " to uninstalled");
      await updateShop({
        shop: shopDomain,
        isInstalled: false,
        uninstalledAt: getTimestamp(),
      });
    }
  },
};
