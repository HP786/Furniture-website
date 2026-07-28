import "server-only";
import { gql } from "@shopify/hydrogen";

import { EMPTY_PREDICTIVE_RESULTS, type PredictiveSearchResults } from "./predictive-search-types";
import { getStorefrontClient } from "./storefront";

export * from "./predictive-search-types";

// As-you-type suggestions. `predictiveSearch` is the Storefront API surface for
// the Search & Discovery app: synonyms, search term boosts/pins and the query
// suggestions merchants configure there all apply to these results, so nothing
// about ranking is reimplemented here.
export const PREDICTIVE_SEARCH_QUERY = gql(`
  query PredictiveSearch($query: String!, $limit: Int!) {
    predictiveSearch(
      query: $query
      limit: $limit
      limitScope: EACH
      types: [QUERY, PRODUCT, COLLECTION]
      unavailableProducts: LAST
    ) {
      # styledText is deliberately not requested: it embeds the shopper's own
      # query inside Shopify-generated markup, and the UI bolds the match itself
      # rather than rendering that HTML.
      queries {
        text
      }
      collections {
        id
        handle
        title
        image {
          url
          altText
        }
      }
      products {
        id
        handle
        title
        featuredImage {
          url
          altText
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`);

// Shopify rejects limits outside 1–10.
const PREDICTIVE_LIMIT = 5;

// An empty `term` is valid: Shopify answers it with default suggestions (best
// sellers and top collections), so the box has something to show on focus.
export async function loadPredictiveSearch(term: string): Promise<PredictiveSearchResults> {
  const query = term.trim();
  const storefront = await getStorefrontClient();
  const { data } = await storefront.graphql(PREDICTIVE_SEARCH_QUERY, {
    variables: { query, limit: PREDICTIVE_LIMIT },
  });

  const result = data?.predictiveSearch;
  if (!result) return EMPTY_PREDICTIVE_RESULTS;

  return {
    queries: result.queries.map((suggestion) => ({ text: suggestion.text })),
    collections: result.collections.map((collection) => ({
      id: collection.id,
      handle: collection.handle,
      title: collection.title,
    })),
    products: result.products.map((product) => ({
      id: product.id,
      handle: product.handle,
      title: product.title,
      image: product.featuredImage
        ? { url: product.featuredImage.url, altText: product.featuredImage.altText ?? null }
        : null,
      price: product.priceRange.minVariantPrice,
    })),
  };
}
