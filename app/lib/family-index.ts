import { gql, type StorefrontApi } from "@shopify/hydrogen";

import { pieceKey } from "./product-family";
import { getStorefrontClient } from "./storefront";

const FAMILY_INDEX_QUERY = gql(`
  query FamilyIndex {
    products(first: 250, sortKey: TITLE) {
      nodes {
        handle
        title
        tags
      }
    }
  }
`);

type FamilyIndexQuery = StorefrontApi.ResultOf<typeof FAMILY_INDEX_QUERY>;

/** One way a piece is made, where the same piece comes in more than one. */
export type PieceOption = {
  handle: string;
  title: string;
  /** "Short", "Tall", "Round" — read off the `Size_*` / `Shape_*` tag. */
  label: string;
};

export type SerializedPieceIndex = Array<[string, PieceOption[]]>;

export type StoreIndex = {
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
 * The sizes a piece is made in, indexed across the catalogue.
 *
 * `pieces` groups by `pieceKey`, which catches the same piece made in two
 * sizes: "Leo Short Plinth" and "Leo Tall Plinth" are one plinth, short or
 * tall, and the product page offers that as a choice. Colourways used to be
 * indexed here too, by stripping finish words off titles — they are Shopify
 * variants now, and a product carries its own.
 */
export async function loadStoreIndex(): Promise<StoreIndex> {
  const storefront = await getStorefrontClient();
  const { data } = await storefront.graphql(FAMILY_INDEX_QUERY);
  const result = data as FamilyIndexQuery | null | undefined;

  const pieces = new Map<string, PieceOption[]>();

  for (const node of result?.products.nodes ?? []) {
    const tags = node.tags ?? [];
    // One entry per way the piece is made, not per listing.
    const label = variantLabel(tags);
    if (!label) continue;
    const key = pieceKey(node.title, tags);
    const pieceGroup = pieces.get(key);
    if (!pieceGroup) pieces.set(key, [{ handle: node.handle, title: node.title, label }]);
    else if (!pieceGroup.some((option) => option.label === label)) {
      pieceGroup.push({ handle: node.handle, title: node.title, label });
    }
  }

  // Only groups offering a choice are worth shipping to the client.
  return { pieces: [...pieces].filter(([, options]) => options.length > 1) };
}
