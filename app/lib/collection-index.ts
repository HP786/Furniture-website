import { gql, type StorefrontApi } from "@shopify/hydrogen";

import type { CollectionRef } from "./navigation";
import { ROOM_IMAGE_OVERRIDES } from "./rooms";
import { getStorefrontClient } from "./storefront";

/** One round trip shared by the chrome and the home page's tiles. */
const COLLECTION_INDEX_QUERY = gql(`
  query CollectionIndex {
    collections(first: 100) {
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

  // The override wins where one exists, so every tile, nav panel and Instagram
  // card drawn from this index picks up the supplied room photograph.
  const all: CollectionRef[] = (result?.collections.nodes ?? []).map((node) => ({
    handle: node.handle,
    title: node.title,
    image:
      ROOM_IMAGE_OVERRIDES[node.handle] ??
      (node.image ? { url: node.image.url, altText: node.image.altText ?? null } : null),
  }));

  return {
    all,
    byHandle: new Map(all.map((collection) => [collection.handle, collection])),
  };
}
