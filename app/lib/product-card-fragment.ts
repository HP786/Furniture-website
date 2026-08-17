import { gql, type StorefrontApi } from "@shopify/hydrogen";

/**
 * The ProductCard fragment lives here rather than beside the component because
 * ProductCard is a client component. A server component importing a value from
 * a "use client" module receives a client-reference proxy, not the value — so
 * composing the fragment into a server-side query would silently produce a
 * broken document and the query would come back empty.
 */
export const PRODUCT_CARD_FRAGMENT = gql(`
  fragment ProductCard on Product {
    id
    handle
    title
    tags
    availableForSale
    # Enough to add the piece straight to the cart from a card — the "Pairs
    # well with" tile on the product page buys without a detour to the PDP.
    selectedOrFirstAvailableVariant {
      id
      availableForSale
    }
    featuredImage {
      url
      altText
      width
      height
    }
    images(first: 2) {
      nodes {
        url
        altText
        width
        height
      }
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
  }
`);

export const PRODUCT_CARD_SHAPE = gql(
  `
    query ProductCardShape {
      products(first: 1) {
        nodes {
          ...ProductCard
        }
      }
    }
  `,
  [PRODUCT_CARD_FRAGMENT],
);

export type ProductCardData = StorefrontApi.ResultOf<
  typeof PRODUCT_CARD_SHAPE
>["products"]["nodes"][number];
