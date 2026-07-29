/**
 * Colour chips. Swatches come from each product's `Color_*` tag rather than a
 * variant option, keyed by the tag suffix as Shopify spells it.
 */
const SWATCH_HEX: Record<string, string> = {
  natural: "#e8ded0",
  chalk: "#ecebe5",
  haze: "#cfcbc2",
  oyster: "#ded8cf",
  ivory: "#efe9df",
  cream: "#f2ece1",
  pine: "#ddc9a6",
  light_oak: "#d9bf98",
  oak: "#cdae83",
  smoke_oak: "#6d5947",
  walnut: "#6b4a32",
  tan: "#a9713f",
  clay: "#b98a6c",
  sangria: "#8d3a34",
};

const COLOR_TAG = /^color_(.+)$/i;
const MATERIAL_TAG = /^material_(.+)$/i;
const TYPE_TAG = /^type_(.+)$/i;

function titleCase(slug: string) {
  return slug
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function readTag(tags: readonly string[], pattern: RegExp) {
  for (const tag of tags) {
    const match = pattern.exec(tag);
    if (match) return match[1];
  }
  return null;
}

export type Swatch = { name: string; hex: string };

/** The product's colourway, or null when it carries no recognised colour tag. */
export function swatchFromTags(tags: readonly string[]): Swatch | null {
  const slug = readTag(tags, COLOR_TAG);
  if (!slug) return null;
  const hex = SWATCH_HEX[slug.toLowerCase()];
  if (!hex) return null;
  return { name: titleCase(slug), hex };
}

/** The one-line descriptor under a card's title, e.g. "Bouclé, Armchair". */
export function subtitleFromTags(tags: readonly string[]): string | null {
  const material = readTag(tags, MATERIAL_TAG);
  const type = readTag(tags, TYPE_TAG);
  const parts = [material, type].flatMap((slug) => (slug ? [titleCase(slug)] : []));
  return parts.length > 0 ? parts.join(", ") : null;
}
