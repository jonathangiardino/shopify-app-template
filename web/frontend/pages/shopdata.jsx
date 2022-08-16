import { Card, Page, Layout, Spinner, Stack } from "@shopify/polaris";

import { useAppQuery } from "../hooks/useAppQuery";

export default function ShopData() {
  const {
    data: shop,
    isLoading,
    isRefetching,
  } = useAppQuery({
    url: "/api/shop",
  });

  if (isLoading && !isRefetching) {
    return (
      <div
        style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Spinner size="small" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div
        style={{
          width: "100%",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        Could not fetch data
      </div>
    );
  }
  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card sectioned title="Shop data">
            <Stack>
              <Stack.Item fill>
                <pre
                  style={{
                    background: "#2c3e50",
                    padding: "16px",
                    width: "100%",
                    color: "#ecf0f1",
                    lineHeight: "150%",
                    fontSize: "16px",
                    borderRadius: "8px",
                  }}
                >
                  {JSON.stringify(shop.data.shop, null, 2)}
                </pre>
              </Stack.Item>
            </Stack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
