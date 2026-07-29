import { gql, type StorefrontApi } from "@shopify/hydrogen";

import type { CollectionRef } from "./navigation";
import { getStorefrontClient } from "./storefront";

/**
 * One round trip shared by the chrome and the home page's tiles. Counts come
 * from a probe page because the Storefront API has no `productsCount`.
 */
const COLLECTION_INDEX_QUERY = gql(`
  query CollectionIndex {
    collections(first: 40) {
      nodes {
        handle
        title
        description
        image {
          url
          altText
        }
        countProbe: products(first: 60) {
          nodes {
            id
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    }
  }
`);

type CollectionIndexQuery = StorefrontApi.ResultOf<typeof COLLECTION_INDEX_QUERY>;

const COUNT_PROBE_LIMIT = 60;

export type CollectionIndex = {
  byHandle: Map<string, CollectionRef>;
  all: CollectionRef[];
};

export async function loadCollectionIndex(): Promise<CollectionIndex> {
  const storefront = await getStorefrontClient();
  const { data } = await storefront.graphql(COLLECTION_INDEX_QUERY);
  const result = data as CollectionIndexQuery | null | undefined;

  const all: CollectionRef[] = (result?.collections.nodes ?? []).map((node) => ({
    handle: node.handle,
    title: node.title,
    image: node.image ? { url: node.image.url, altText: node.image.altText ?? null } : null,
    // `null` means "we could not count past the probe" and renders as "60+".
    productCount: node.countProbe.pageInfo.hasNextPage
      ? null
      : node.countProbe.nodes.length,
  }));

  return {
    all,
    byHandle: new Map(all.map((collection) => [collection.handle, collection])),
  };
}

export function countLabel(count: number | null) {
  if (count === null) return `${COUNT_PROBE_LIMIT}+ pieces`;
  if (count === 0) return "Coming soon";
  return `${count} ${count === 1 ? "piece" : "pieces"}`;
}
