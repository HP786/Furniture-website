/**
 * The browse tree — what the tile row on a collection page offers next.
 *
 * A collection page shows the step down (its children) or, at a leaf, the rest
 * of the shelf it sits on (its siblings), never the whole catalogue. Living Room
 * offers the pieces in a living room; Armchairs offers the things you would put
 * beside one.
 *
 * Every handle here is checked against the collections Shopify actually returns
 * before it is rendered, the same way `buildNavigation` does, so a deleted
 * collection drops out of the row instead of turning into a 404.
 */

import { CURATED_HANDLES, ROOM_HANDLES, SHOP_ALL_HANDLE } from "./navigation";

/**
 * Top-level piece types, between the rooms and the curated collections. Not to
 * be confused with navigation's CATEGORY_HANDLES, which is the home page's
 * "Popular categories" row and mixes types with materials.
 */
const PIECE_TYPE_HANDLES = ["sofas", "chairs", "tables"] as const;

/**
 * Children, in the order they are shown. A handle may appear under more than one
 * parent — Armchairs is both a living-room piece and a kind of chair — which is
 * what CANONICAL_PARENT below exists to settle.
 */
/**
 * The three shelves the root is made of. A top-level collection with nothing
 * under it shows the rest of its own shelf, not all three — Bathroom offers the
 * other rooms, Soft Texture the other curated collections. Without this they
 * would each fall back to the root's full list, which is the everything-row this
 * tree exists to get rid of.
 */
const TOP_LEVEL_SHELVES: readonly (readonly string[])[] = [
  ROOM_HANDLES,
  PIECE_TYPE_HANDLES,
  CURATED_HANDLES,
];

const CHILDREN: Record<string, readonly string[]> = {
  [SHOP_ALL_HANDLE]: TOP_LEVEL_SHELVES.flat(),

  // Rooms. Only the pieces that room actually holds — the store tags every
  // product with its room, so these lists match the Room_* smart collections.
  "living-room-1": ["sofas", "armchairs", "ottomans", "coffee-tables", "side-tables"],
  "dining-room-1": ["dining-tables"],
  "bedroom-1": ["bedside-tables"],

  // Piece types.
  chairs: ["armchairs", "ottomans"],
  tables: ["coffee-tables", "side-tables", "bedside-tables", "dining-tables"],

  // The bottom level, split on whatever axis the pieces actually differ by:
  // upholstery for the seating, finish for the tables, height for the bedsides.
  // Each set is exhaustive — the last entry of a pair is a "everything else"
  // rule in Shopify, so no product falls out of the browse tree.
  sofas: ["boucle-sofas", "fabric-sofas"],
  armchairs: ["boucle-armchairs", "fabric-armchairs", "leather-armchairs"],
  ottomans: ["boucle-ottomans", "fabric-ottomans"],
  "coffee-tables": ["light-oak-coffee-tables", "smoke-oak-coffee-tables", "oak-coffee-tables"],
  "side-tables": ["timber-side-tables", "steel-side-tables"],
  "bedside-tables": ["short-bedside-tables", "tall-bedside-tables"],
  // Dining Tables stays a leaf — one product, nothing to split it on yet.
};

/**
 * Where a node goes "up" to: its breadcrumb parent, the tile that leads its row,
 * and whose children it borrows when it has none of its own.
 *
 * Only handles reachable from two parents need an entry. The living-room pieces
 * point at the room rather than at their piece type, so Armchairs reads as
 * Living Room / Armchairs — the room 32 of the store's 37 products sit in —
 * rather than as Chairs / Armchairs.
 */
const CANONICAL_PARENT: Record<string, string> = {
  sofas: "living-room-1",
  armchairs: "living-room-1",
  ottomans: "living-room-1",
  "coffee-tables": "living-room-1",
  "side-tables": "living-room-1",
  "bedside-tables": "tables",
  "dining-tables": "tables",
};

/** First parent wins, then CANONICAL_PARENT overrides it. */
const PARENT: Map<string, string> = (() => {
  const parents = new Map<string, string>();

  for (const [parent, children] of Object.entries(CHILDREN)) {
    for (const child of children) {
      if (child !== parent && !parents.has(child)) parents.set(child, parent);
    }
  }
  for (const [child, parent] of Object.entries(CANONICAL_PARENT)) {
    parents.set(child, parent);
  }

  return parents;
})();

/**
 * The root has no parent. Anything the tree has never heard of — a collection
 * added in Shopify but not placed here yet — hangs off the root, so its page
 * still gets a row rather than an empty gap.
 */
function parentOf(handle: string): string | null {
  if (handle === SHOP_ALL_HANDLE) return null;
  return PARENT.get(handle) ?? SHOP_ALL_HANDLE;
}

export type BrowseRow = {
  /** The step back up, or null at the root. */
  up: string | null;
  /** Tiles to offer, in order. */
  tiles: string[];
  /**
   * True when the tiles are the node's siblings rather than its children, in
   * which case the node itself is among them and should read as the current one.
   */
  isSiblingRow: boolean;
};

/**
 * What to offer from `handle`: its children where it has any, otherwise the
 * shelf it sits on — siblings included, so a leaf still shows where you are.
 */
export function browseRow(handle: string): BrowseRow {
  const up = parentOf(handle);
  const children = CHILDREN[handle] ?? [];

  if (children.length > 0) return { up, tiles: [...children], isSiblingRow: false };
  if (!up) return { up: null, tiles: [], isSiblingRow: false };

  // Only a node hanging directly off the root narrows to its own shelf; deeper
  // nodes take the parent's children, which are already one shelf.
  const shelf =
    (up === SHOP_ALL_HANDLE
      ? TOP_LEVEL_SHELVES.find((group) => group.includes(handle))
      : undefined) ?? CHILDREN[up];

  return { up, tiles: [...(shelf ?? [])], isSiblingRow: true };
}

/**
 * Ancestors root-first, excluding the node itself — the breadcrumb's middle.
 * The visited set is what stops a mis-edit of the tables above (a node made its
 * own ancestor) from hanging the render.
 */
export function ancestorsOf(handle: string): string[] {
  const trail: string[] = [];
  const seen = new Set<string>([handle]);

  let current = parentOf(handle);
  while (current && !seen.has(current)) {
    trail.unshift(current);
    seen.add(current);
    current = parentOf(current);
  }

  return trail;
}
