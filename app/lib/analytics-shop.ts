import "server-only";
import { gql, type ShopAnalytics } from "@shopify/hydrogen";

import { analyticsShop } from "./shop";
import { getStorefrontClient } from "./storefront";

const SHOP_ANALYTICS_QUERY = gql(`
  query ShopAnalytics {
    shop {
      id
      paymentSettings {
        currencyCode
      }
    }
  }
`);

// Resolve the analytics shop identity from the Storefront API so shopId and
// currency always match the connected store (the static `analyticsShop` config
// hardcodes them and drifts when the store changes). Falls back to the config
// values if the query fails, so a render never breaks over analytics.
export async function getShopAnalyticsData(): Promise<ShopAnalytics> {
  try {
    const storefrontClient = await getStorefrontClient();
    const { data } = await storefrontClient.graphql(SHOP_ANALYTICS_QUERY);
    return {
      shopId: data?.shop?.id ?? analyticsShop.shopId,
      acceptedLanguage: analyticsShop.acceptedLanguage,
      currency: data?.shop?.paymentSettings?.currencyCode ?? analyticsShop.currency,
      hydrogenSubchannelId: analyticsShop.hydrogenSubchannelId,
    };
  } catch (error) {
    console.error("[analytics] shop query failed, using configured fallbacks", error);
    return analyticsShop;
  }
}
