/**
 * Colourways that used to be their own product.
 *
 * Each finish was a separate Shopify product until they were merged into one
 * product with a Colour option. The absorbed products are archived rather than
 * deleted, so their pages would 404 — and their links are out in the world, in
 * search results and in people's messages. This maps each retired handle onto
 * the product that swallowed it, with the colour preselected, so an old link
 * still lands on the right thing.
 *
 * Add a line here whenever a family is merged; there is nothing else to update.
 */

export type MergedHandle = {
  /** The surviving product's handle. */
  handle: string;
  /** Option name and value to preselect, so the page opens on that colour. */
  option: { name: string; value: string };
};

export const MERGED_HANDLES: Record<string, MergedHandle> = {
  "clem-coffee-table-smoke-oak": {
    handle: "clem-coffee-table-light-oak",
    option: { name: "Colour", value: "Smoke Oak" },
  },
};

/** Where a retired colourway handle should go, or null if it is not one. */
export function mergedDestination(handle: string): string | null {
  const merged = MERGED_HANDLES[handle];
  if (!merged) return null;
  const params = new URLSearchParams({ [merged.option.name]: merged.option.value });
  return `/products/${merged.handle}?${params.toString()}`;
}
