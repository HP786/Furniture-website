import "server-only";
import { gql, parseCollectionParams, type StorefrontApi } from "@shopify/hydrogen";
import type { ProductFilter as StorefrontApiProductFilter } from "@shopify/hydrogen/storefront-api-types";

import { PRODUCT_CARD_FRAGMENT } from "../components/ProductCard";
import { getStorefrontClient } from "./storefront";
import { getRequestOrigin } from "./url";

const COLLECTION_PAGE_SIZE = 9;
// Shopify's `collection.products(filters:...)` silently ignores tag filters that
// aren't configured as discoverable filters in the Search & Discovery admin app —
// confirmed against this store. `available`/`price` ARE configured there and work
// natively; tag-based facets (Category/Material/Color/Room/...) don't, so we fetch
// a large-enough pool with only the native filters applied, then filter + paginate
// by tag ourselves. This also lets us build the tag facets directly from real
// product data instead of depending on admin configuration that may never be set.
const TAG_CANDIDATE_POOL_SIZE = 250;
const TAG_FACET_GROUPS = ["Category", "Material", "Color", "Room", "Construction", "Style"];

export const COLLECTION_QUERY = gql(
  `
    query CollectionPage(
      $handle: String!
      $first: Int!
      $filters: [ProductFilter!]
      $sortKey: ProductCollectionSortKeys
      $reverse: Boolean
    ) {
      shop {
        paymentSettings {
          currencyCode
        }
      }
      collection(handle: $handle) {
        id
        handle
        title
        description
        descriptionHtml
        image {
          url
          altText
          width
          height
        }
        seo {
          title
          description
        }
        products(first: $first, filters: $filters, sortKey: $sortKey, reverse: $reverse) {
          filters {
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
          nodes {
            ...ProductCard
            tags
          }
        }
      }
    }
  `,
  [PRODUCT_CARD_FRAGMENT],
);

type CollectionQuery = StorefrontApi.ResultOf<typeof COLLECTION_QUERY>;
type Collection = NonNullable<CollectionQuery["collection"]>;
type CollectionProduct = Collection["products"]["nodes"][number];
type AvailableFilters = Collection["products"]["filters"];
type PageInfo = { hasNextPage: boolean; endCursor: string | null };

export type CollectionPageData = {
  collection: Collection;
  products: CollectionProduct[];
  availableFilters: AvailableFilters;
  pageInfo: PageInfo;
  currencyCode: CollectionQuery["shop"]["paymentSettings"]["currencyCode"];
  dataSearch: string;
  origin: string;
};

function decodeOffsetCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  try {
    const parsed = Number.parseInt(atob(cursor), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function encodeOffsetCursor(offset: number): string {
  return btoa(String(offset));
}

function tagFacetGroup(tag: string): { prefix: string; value: string } | null {
  for (const prefix of TAG_FACET_GROUPS) {
    if (tag.startsWith(`${prefix}_`)) {
      return { prefix, value: tag.slice(prefix.length + 1) };
    }
  }
  return null;
}

function humanizeTagValue(value: string): string {
  return value.replace(/_/g, " ");
}

function buildTagFacets(products: CollectionProduct[]): AvailableFilters {
  const counts = new Map<string, Map<string, number>>();

  for (const product of products) {
    for (const tag of product.tags) {
      const group = tagFacetGroup(tag);
      if (!group) continue;
      const values = counts.get(group.prefix) ?? new Map<string, number>();
      values.set(group.value, (values.get(group.value) ?? 0) + 1);
      counts.set(group.prefix, values);
    }
  }

  return TAG_FACET_GROUPS.filter((prefix) => counts.has(prefix)).map((prefix) => {
    const values = counts.get(prefix)!;
    return {
      id: `custom.tag.${prefix}`,
      label: prefix,
      type: "LIST",
      presentation: "TEXT",
      values: [...values.entries()].map(([value, count]) => ({
        id: `custom.tag.${prefix}.${value}`,
        label: humanizeTagValue(value),
        count,
        input: JSON.stringify({ tag: `${prefix}_${value}` }),
        image: null,
        swatch: null,
      })),
    };
  }) as AvailableFilters;
}

export async function loadCollectionPage({
  handle,
  searchParams,
}: {
  handle: string;
  searchParams: URLSearchParams;
}): Promise<CollectionPageData> {
  const browse = parseCollectionParams(searchParams);
  const nativeFilters = browse.filters.filter((filter) => !filter.tag);
  const tagFilters = browse.filters
    .map((filter) => filter.tag)
    .filter((tag): tag is string => Boolean(tag));
  const offset = decodeOffsetCursor(searchParams.get("after") || undefined);
  const storefront = await getStorefrontClient();
  const origin = await getRequestOrigin();

  const { data } = await storefront.graphql(COLLECTION_QUERY, {
    variables: {
      handle,
      first: TAG_CANDIDATE_POOL_SIZE,
      filters: nativeFilters.length > 0 ? (nativeFilters as StorefrontApiProductFilter[]) : undefined,
      sortKey: browse.sortKey,
      reverse: browse.reverse || undefined,
    },
  });

  if (!data?.collection) {
    throw new Response("Collection not found", { status: 404 });
  }

  const nativeMatched = data.collection.products.nodes;
  const tagFacets = buildTagFacets(nativeMatched);
  const matched =
    tagFilters.length > 0
      ? nativeMatched.filter((product) => tagFilters.every((tag) => product.tags.includes(tag)))
      : nativeMatched;

  const page = matched.slice(offset, offset + COLLECTION_PAGE_SIZE);
  const hasNextPage = matched.length > offset + COLLECTION_PAGE_SIZE;

  return {
    collection: data.collection,
    products: page,
    availableFilters: [...data.collection.products.filters, ...tagFacets] as AvailableFilters,
    pageInfo: {
      hasNextPage,
      endCursor: hasNextPage ? encodeOffsetCursor(offset + COLLECTION_PAGE_SIZE) : null,
    },
    currencyCode: data.shop.paymentSettings.currencyCode,
    dataSearch: searchParams.toString(),
    origin,
  };
}
