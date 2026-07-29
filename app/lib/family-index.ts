import { gql, type StorefrontApi } from "@shopify/hydrogen";

import { familyKey, type FamilyMember } from "./product-family";
import { getStorefrontClient } from "./storefront";
import { swatchFromTags } from "./swatches";

const FAMILY_INDEX_QUERY = gql(`
  query FamilyIndex {
    products(first: 250, sortKey: TITLE) {
      nodes {
        handle
        title
        tags
        featuredImage {
          url
        }
      }
    }
  }
`);

type FamilyIndexQuery = StorefrontApi.ResultOf<typeof FAMILY_INDEX_QUERY>;

/** Serializable shape — a Map cannot cross the server/client boundary. */
export type SerializedFamilyIndex = Array<[string, FamilyMember[]]>;

export async function loadFamilyIndex(): Promise<SerializedFamilyIndex> {
  const storefront = await getStorefrontClient();
  const { data } = await storefront.graphql(FAMILY_INDEX_QUERY);
  const result = data as FamilyIndexQuery | null | undefined;

  const groups = new Map<string, FamilyMember[]>();
  for (const node of result?.products.nodes ?? []) {
    const swatch = swatchFromTags(node.tags ?? []);
    const key = familyKey(node.title);
    const member: FamilyMember = {
      handle: node.handle,
      title: node.title,
      hex: swatch?.hex ?? null,
      colorName: swatch?.name ?? null,
      imageUrl: node.featuredImage?.url ?? null,
    };
    const existing = groups.get(key);
    if (existing) existing.push(member);
    else groups.set(key, [member]);
  }

  // Only families with more than one colourway are worth shipping to the client.
  return [...groups].filter(([, members]) => members.length > 1);
}
