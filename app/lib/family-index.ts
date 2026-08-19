import { gql, type StorefrontApi } from "@shopify/hydrogen";

import { familyKey, pieceKey, type FamilyMember } from "./product-family";
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

/** One way a piece is made, where the same piece comes in more than one. */
export type PieceOption = {
  handle: string;
  title: string;
  /** "Short", "Tall", "Round" — read off the `Size_*` / `Shape_*` tag. */
  label: string;
};

export type SerializedPieceIndex = Array<[string, PieceOption[]]>;

export type StoreIndex = {
  families: SerializedFamilyIndex;
  pieces: SerializedPieceIndex;
};

const VARIANT_TAG = /^(?:size|shape)_(.+)$/i;

function variantLabel(tags: readonly string[]) {
  for (const tag of tags) {
    const match = VARIANT_TAG.exec(tag);
    if (match) {
      const slug = match[1];
      return slug.charAt(0).toUpperCase() + slug.slice(1).toLowerCase();
    }
  }
  return null;
}

/**
 * Both indexes off one round trip.
 *
 * `families` groups the colourways of a listing — "Ester Armchair Oyster" and
 * "Ester Armchair - Otto Natural" are one piece in two fabrics. `pieces` groups
 * a level looser, by `pieceKey`, which is what catches the same piece made in
 * two sizes: "Leo Short Plinth" and "Leo Tall Plinth" are one plinth, short or
 * tall, and the product page offers that as a choice.
 */
export async function loadStoreIndex(): Promise<StoreIndex> {
  const storefront = await getStorefrontClient();
  const { data } = await storefront.graphql(FAMILY_INDEX_QUERY);
  const result = data as FamilyIndexQuery | null | undefined;

  const groups = new Map<string, FamilyMember[]>();
  const pieces = new Map<string, PieceOption[]>();

  for (const node of result?.products.nodes ?? []) {
    const tags = node.tags ?? [];
    const swatch = swatchFromTags(tags);
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

    // One entry per way the piece is made, not per listing: three of the four
    // Leo plinths are the same two sizes in different oaks.
    const label = variantLabel(tags);
    if (!label) continue;
    const pieceGroup = pieces.get(pieceKey(node.title, tags));
    if (!pieceGroup) pieces.set(pieceKey(node.title, tags), [{ handle: node.handle, title: node.title, label }]);
    else if (!pieceGroup.some((option) => option.label === label)) {
      pieceGroup.push({ handle: node.handle, title: node.title, label });
    }
  }

  // Only groups offering a choice are worth shipping to the client.
  return {
    families: [...groups].filter(([, members]) => members.length > 1),
    pieces: [...pieces].filter(([, options]) => options.length > 1),
  };
}
