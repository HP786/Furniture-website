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

// This storefront sells the Furniture collection only, but the store's catalog also
// contains other collections (rugs, etc.) that share the same tag namespace. The
// Storefront `search` root can't be scoped to a collection natively, so we scope it
// with a query-syntax tag term: `<user query> AND tag:Furniture`. This keeps search
// 100% server-side — native filtering, sorting, cursor pagination, and totalCount —
// with no in-memory post-filtering. Requires every furniture product to carry the
// `Furniture` tag (configured in Shopify admin).
const SEARCH_SCOPE_TAG = "Furniture";

function scopedQuery(searchTerm: string) {
  return `${searchTerm} AND tag:${SEARCH_SCOPE_TAG}`;
}

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
  const after = searchParams.get("after") || undefined;
  const storefront = await getStorefrontClient();

  const { data } = await storefront.graphql(SEARCH_QUERY, {
    variables: {
      query: scopedQuery(searchTerm),
      first: SEARCH_PAGE_SIZE,
      after,
      productFilters:
        browse.filters.length > 0 ? (browse.filters as StorefrontApiProductFilter[]) : undefined,
      sortKey: sort.sortKey,
      reverse: sort.reverse || undefined,
    },
  });

  if (!data) throw new Response("Search unavailable", { status: 502 });

  const search = data.search;

  return {
    performed: true,
    searchTerm,
    products: search.nodes.filter(isProductNode),
    availableFilters: search.productFilters,
    pageInfo: search.pageInfo,
    currencyCode: data.shop.paymentSettings.currencyCode,
    totalCount: search.totalCount,
    dataSearch: searchParams.toString(),
    origin,
  };
}
