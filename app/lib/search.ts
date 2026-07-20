import "server-only";
import { gql, parseCollectionParams, type StorefrontApi } from "@shopify/hydrogen";
import type {
  ProductFilter as StorefrontApiProductFilter,
  SearchSortKeys,
} from "@shopify/hydrogen/storefront-api-types";

import { PRODUCT_CARD_FRAGMENT } from "../components/ProductCard";
import { getStorefrontClient } from "./storefront";
import { getRequestOrigin } from "./url";

const SEARCH_PAGE_SIZE = 9;
// Collection.products has no free-text `query` arg, so the Storefront API can't search
// within a single collection directly. We search the whole catalog, then keep only
// products that belong to the Furniture collection — this store's product surface
// is scoped to that collection everywhere else too (see app/page.tsx, app/lib/collections.ts).
const SEARCH_CANDIDATE_POOL_SIZE = 50;

const FURNITURE_PRODUCT_IDS_QUERY = gql(`
  query FurnitureProductIds {
    collection(handle: "furniture") {
      products(first: 250) {
        nodes {
          id
        }
      }
    }
  }
`);

export const SEARCH_QUERY = gql(
  `
    query SearchPage(
      $query: String!
      $first: Int!
      $after: String
      $productFilters: [ProductFilter!]
      $sortKey: SearchSortKeys
      $reverse: Boolean
    ) {
      shop {
        paymentSettings {
          currencyCode
        }
      }
      search(
        query: $query
        first: $first
        after: $after
        productFilters: $productFilters
        sortKey: $sortKey
        reverse: $reverse
        types: [PRODUCT]
      ) {
        totalCount
        productFilters {
          id
          label
          type
          presentation
          values {
            id
            label
            count
            input
            image {
              image {
                url
                altText
                width
                height
              }
              previewImage {
                url
                altText
                width
                height
              }
            }
            swatch {
              color
              image {
                image {
                  url
                  altText
                  width
                  height
                }
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
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          __typename
          ... on Product {
            ...ProductCard
          }
        }
      }
    }
  `,
  [PRODUCT_CARD_FRAGMENT],
);

type SearchQuery = StorefrontApi.ResultOf<typeof SEARCH_QUERY>;
type SearchConnection = SearchQuery["search"];
type SearchNode = SearchConnection["nodes"][number];
type SearchProduct = Extract<SearchNode, { __typename: "Product" }>;
type SearchPageInfo = SearchConnection["pageInfo"];

const EMPTY_PAGE_INFO: SearchPageInfo = { hasNextPage: false, endCursor: null };

export type SearchPageData = {
  searchTerm: string;
  products: SearchProduct[];
  availableFilters: SearchConnection["productFilters"];
  pageInfo: SearchPageInfo;
  dataSearch: string;
  origin: string;
  totalCount: number;
} & (
  | { performed: false; currencyCode: null }
  | { performed: true; currencyCode: SearchQuery["shop"]["paymentSettings"]["currencyCode"] }
);

function isProductNode(node: SearchNode): node is SearchProduct {
  return node.__typename === "Product";
}

function searchTermFromParams(searchParams: URLSearchParams) {
  return (searchParams.get("q") ?? "").trim();
}

function toSearchSort(sortKey: string | undefined, reverse: boolean) {
  if (sortKey === "PRICE") {
    return { sortKey: "PRICE" as SearchSortKeys, reverse };
  }

  return { sortKey: "RELEVANCE" as SearchSortKeys, reverse: false };
}

export async function loadSearchPage({
  searchParams,
}: {
  searchParams: URLSearchParams;
}): Promise<SearchPageData> {
  const searchTerm = searchTermFromParams(searchParams);
  const origin = await getRequestOrigin();

  if (!searchTerm) {
    return {
      performed: false,
      searchTerm,
      products: [],
      availableFilters: [],
      pageInfo: EMPTY_PAGE_INFO,
      currencyCode: null,
      totalCount: 0,
      dataSearch: searchParams.toString(),
      origin,
    };
  }

  const browse = parseCollectionParams(searchParams);
  const sort = toSearchSort(browse.sortKey, browse.reverse);
  const storefront = await getStorefrontClient();

  const [{ data }, { data: furnitureData }] = await Promise.all([
    storefront.graphql(SEARCH_QUERY, {
      variables: {
        query: searchTerm,
        first: SEARCH_CANDIDATE_POOL_SIZE,
        after: undefined,
        productFilters:
          browse.filters.length > 0 ? (browse.filters as StorefrontApiProductFilter[]) : undefined,
        sortKey: sort.sortKey,
        reverse: sort.reverse || undefined,
      },
    }),
    storefront.graphql(FURNITURE_PRODUCT_IDS_QUERY),
  ]);

  if (!data) throw new Response("Search unavailable", { status: 502 });

  const furnitureIds = new Set(furnitureData?.collection?.products.nodes.map((node) => node.id));
  const search = data.search;
  const products = search.nodes.filter(isProductNode).filter((product) => furnitureIds.has(product.id));

  return {
    performed: true,
    searchTerm,
    products,
    availableFilters: search.productFilters,
    pageInfo: EMPTY_PAGE_INFO,
    currencyCode: data.shop.paymentSettings.currencyCode,
    totalCount: products.length,
    dataSearch: searchParams.toString(),
    origin,
  };
}
