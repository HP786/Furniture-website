import { gql, type StorefrontApi } from "@shopify/hydrogen";

import type { CollectionRef } from "./navigation";
import { getStorefrontClient } from "./storefront";

/** One round trip shared by the chrome and the home page's tiles. */
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
      }
    }
  }
`);

type CollectionIndexQuery = StorefrontApi.ResultOf<typeof COLLECTION_INDEX_QUERY>;

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
  }));

  return {
    all,
    byHandle: new Map(all.map((collection) => [collection.handle, collection])),
  };
}
