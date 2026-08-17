import { getSelectedProductOptions, gql } from "@shopify/hydrogen";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PRODUCT_CARD_FRAGMENT, type ProductCardData } from "../../lib/product-card-fragment";
import { ProductDetails } from "../../components/ProductDetails";
import { pieceKey } from "../../lib/product-family";
import { specFromTags } from "../../lib/product-spec";
import { typeFromTags } from "../../lib/swatches";
import { getStorefrontClient } from "../../lib/storefront";
import { toURLSearchParams, type NextSearchParams } from "../../lib/url";

const PRODUCT_VARIANT_FRAGMENT = gql(`
  fragment ProductVariantFields on ProductVariant {
    id
    title
    availableForSale
    quantityAvailable
    sku
    selectedOptions {
      name
      value
    }
    price {
      amount
      currencyCode
    }
    compareAtPrice {
      amount
      currencyCode
    }
    image {
      id
      url
      altText
      width
      height
    }
    product {
      handle
      title
    }
  }
`);

export const PRODUCT_QUERY = gql(
  `
    query Product($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {
      product(handle: $handle) {
        id
        handle
        title
        vendor
        tags
        description
        descriptionHtml
        requiresSellingPlan
        encodedVariantExistence
        encodedVariantAvailability
        seo {
          title
          description
        }
        # Colourways, as Shopify holds them: the product's Colour option values
        # are linked to entries in Shopify's own colour metaobject, and each
        # entry carries the label and the hex. Matched to option values by
        # label, since the Storefront API does not expose the link itself.
        colourway: metafield(namespace: "custom", key: "colour_pattern") {
          references(first: 20) {
            nodes {
              ... on Metaobject {
                id
                handle
                fields {
                  key
                  value
                  # A merchant can set a photographed swatch on the colour
                  # entry — a timber grain, a fabric weave. Where they have,
                  # the chip shows the photo instead of the flat hex.
                  reference {
                    ... on MediaImage {
                      image {
                        url
                        altText
                      }
                    }
                  }
                }
              }
            }
          }
        }
        featuredImage {
          id
          url
          altText
          width
          height
        }
        images(first: 8) {
          nodes {
            id
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
        options {
          name
          optionValues {
            name
            firstSelectableVariant {
              ...ProductVariantFields
            }
            swatch {
              color
              image {
                previewImage {
                  url
                  altText
                  width
                  height
                }
              }
            }
          }
        }
        selectedOrFirstAvailableVariant(
          selectedOptions: $selectedOptions
          ignoreUnknownOptions: true
          caseInsensitiveMatch: true
        ) {
          ...ProductVariantFields
        }
        adjacentVariants(
          selectedOptions: $selectedOptions
          ignoreUnknownOptions: true
          caseInsensitiveMatch: true
        ) {
          ...ProductVariantFields
        }
      }
      # Shopify-generated recommendations. Both intents honour the rules and
      # manual overrides configured in the Search & Discovery app.
      relatedProducts: productRecommendations(productHandle: $handle, intent: RELATED) {
        ...ProductCard
      }
      complementaryProducts: productRecommendations(
        productHandle: $handle
        intent: COMPLEMENTARY
      ) {
        ...ProductCard
      }
      # Fallback pool for "Pair it with": the pieces that go with this one are
      # picked from here by type when Search & Discovery has no complementary
      # products configured, which is the case on a fresh store.
      pairPool: products(first: 60, sortKey: BEST_SELLING) {
        nodes {
          ...ProductCard
        }
      }
    }
  `,
  [PRODUCT_VARIANT_FRAGMENT, PRODUCT_CARD_FRAGMENT],
);

type ProductPageProps = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<NextSearchParams>;
};

async function loadProduct(handle: string, searchParams: NextSearchParams) {
  const selectedOptions = getSelectedProductOptions(toURLSearchParams(searchParams));
  const storefront = await getStorefrontClient();
  const { data } = await storefront.graphql(PRODUCT_QUERY, {
    variables: { handle, selectedOptions },
  });
  return data;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { handle } = await params;
  const data = await loadProduct(handle, {});
  const product = data?.product;
  if (!product) return {};

  return {
    title: product.seo.title ?? product.title,
    description: product.seo.description ?? product.description,
  };
}

/**
 * What goes with this piece: a coffee table and a side table beside a sofa, an
 * ottoman beside an armchair. Types come from the piece's own spec, in its
 * order of preference, one product per type so the row is four different
 * things rather than four coffee tables.
 */
function pairWith(product: NonNullable<Awaited<ReturnType<typeof loadProduct>>>["product"], pool: ProductCardData[]) {
  const tags = product?.tags ?? [];
  const spec = specFromTags(tags);
  if (!spec || !product) return [];

  const own = pieceKey(product.title, tags);
  const picked: ProductCardData[] = [];

  for (const wanted of spec.pairsWith) {
    const match = pool.find((candidate) => {
      const candidateTags = candidate.tags ?? [];
      if (typeFromTags(candidateTags) !== wanted) return false;
      if (pieceKey(candidate.title, candidateTags) === own) return false;
      return !picked.some(
        (already) => pieceKey(already.title, already.tags ?? []) === pieceKey(candidate.title, candidateTags),
      );
    });
    if (match) picked.push(match);
  }

  return picked;
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { handle } = await params;
  const data = await loadProduct(handle, await searchParams);
  if (!data?.product) notFound();

  const configured = data.complementaryProducts ?? [];
  const pairs =
    configured.length > 0
      ? configured
      : pairWith(data.product, (data.pairPool?.nodes ?? []) as ProductCardData[]);

  return (
    <ProductDetails
      product={data.product}
      relatedProducts={data.relatedProducts ?? []}
      complementaryProducts={pairs}
    />
  );
}
