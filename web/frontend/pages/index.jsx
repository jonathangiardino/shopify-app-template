import { useNavigate } from "@shopify/app-bridge-react";
import {
  Card,
  Page,
  Layout,
  TextContainer,
  Stack,
  Link,
  Heading,
  Button,
} from "@shopify/polaris";

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <Page narrowWidth>
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <Stack
              wrap={false}
              spacing="extraTight"
              distribution="trailing"
              alignment="center"
            >
              <Stack.Item fill>
                <TextContainer spacing="loose">
                  <Heading>Let's build a Shopify app 🎉</Heading>
                  <p>
                    Your app is ready to explore! It contains everything you
                    need to get started including the{" "}
                    <Link url="https://polaris.shopify.com/" external>
                      Polaris design system
                    </Link>
                    ,{" "}
                    <Link url="https://shopify.dev/api/admin-graphql" external>
                      Shopify Admin API
                    </Link>
                    ,{" "}
                    <Link
                      url="https://shopify.dev/apps/tools/app-bridge"
                      external
                    >
                      App Bridge
                    </Link>{" "}
                    UI library and components, and{" "}
                    <Link url="https://supabase.com/" external>
                      Supabase
                    </Link>{" "}
                    to store sessions and shops.
                  </p>
                  <p>Ready to build something meaningful? </p>
                </TextContainer>
              </Stack.Item>
            </Stack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card sectioned title="Check out this shop data">
            <Button onClick={() => navigate("/shopdata")} primary>
              Fetch Shop Data
            </Button>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
