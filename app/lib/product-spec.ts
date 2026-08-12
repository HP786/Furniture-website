/**
 * What a piece is, per kind of piece.
 *
 * The catalogue carries no dimensions, materials or care metafields — only
 * `Type_*`, `Material_*`, `Size_*` and `Shape_*` tags — so the page builds its
 * spec sheet from the type. Every field below is a property of the *type*, not
 * of one product: an Otis coffee table and a Bower coffee table are described
 * the same way, because that is all the catalogue knows.
 *
 * When per-product measurements land in Shopify (metafields on the product),
 * read them there and fall back to this table; nothing else has to change.
 */

import { typeFromTags } from "./swatches";

export type SpecRow = { label: string; value: string };

export type PieceSpec = {
  /** Plural name of the type, for headings and copy. */
  plural: string;
  /** What the colourway selector is called on this type. */
  finishLabel: string;
  /** The spec sheet, before any size override. */
  dimensions: SpecRow[];
  /** Measurements that change with the `Size_*` tag, keyed by tag suffix. */
  bySize?: Record<string, SpecRow[]>;
  /** Construction notes — the "Details" panel. */
  details: string[];
  /** One line on what arrives flat and what does not. */
  assembly: string;
  /** How to look after it. */
  care: string;
  /** Types that go with this one, best first, for "Pair it with". */
  pairsWith: string[];
};

const SPECS: Record<string, PieceSpec> = {
  sofa: {
    plural: "Sofas",
    finishLabel: "Fabric",
    dimensions: [
      { label: "Width", value: "210 cm" },
      { label: "Depth", value: "95 cm" },
      { label: "Height", value: "78 cm" },
      { label: "Seat height", value: "43 cm" },
      { label: "Seats", value: "Three" },
    ],
    details: [
      "Kiln-dried hardwood frame, corner-blocked and dowelled.",
      "Serpentine suspension under a high-resilience foam and feather-blend seat.",
      "Removable, replaceable covers on every cushion.",
      "Solid oak legs, screwed rather than glued, so they can be swapped.",
    ],
    assembly: "Arrives fully built. The legs screw on by hand — no tools, about five minutes.",
    care: "Vacuum weekly on a low setting, rotate the cushions monthly, and blot spills rather than rubbing them.",
    pairsWith: ["coffee_table", "side_table", "ottoman"],
  },
  armchair: {
    plural: "Armchairs",
    finishLabel: "Fabric",
    dimensions: [
      { label: "Width", value: "78 cm" },
      { label: "Depth", value: "82 cm" },
      { label: "Height", value: "74 cm" },
      { label: "Seat height", value: "42 cm" },
    ],
    details: [
      "Kiln-dried hardwood frame with a webbed and sprung seat platform.",
      "Moulded foam back, wrapped in a feather-blend jacket.",
      "Covers are removable for cleaning.",
      "Felted glides underfoot, so it moves without marking a floor.",
    ],
    assembly: "Arrives fully built. Legs screw on by hand where the design has them.",
    care: "Vacuum weekly on a low setting; blot spills, never rub. Keep out of direct afternoon sun.",
    pairsWith: ["ottoman", "side_table", "coffee_table"],
  },
  ottoman: {
    plural: "Ottomans",
    finishLabel: "Fabric",
    dimensions: [
      { label: "Width", value: "60 cm" },
      { label: "Depth", value: "60 cm" },
      { label: "Height", value: "42 cm" },
    ],
    details: [
      "Hardwood frame, foam-topped and hand-upholstered.",
      "Light enough to move one-handed, firm enough to sit on.",
      "Removable cover.",
    ],
    assembly: "Arrives fully built. Nothing to assemble.",
    care: "Vacuum weekly on a low setting; blot spills rather than rubbing.",
    pairsWith: ["armchair", "sofa", "side_table"],
  },
  coffee_table: {
    plural: "Coffee tables",
    finishLabel: "Finish",
    dimensions: [
      { label: "Diameter", value: "90 cm" },
      { label: "Height", value: "34 cm" },
      { label: "Weight", value: "24 kg" },
    ],
    details: [
      "Solid timber top and legs — no veneer anywhere.",
      "Finished in hardwax oil, which can be re-oiled rather than resprayed.",
      "Sculptural legs, mortised into the top.",
      "Grain and tone vary piece to piece; that is the timber, not a fault.",
    ],
    assembly: "Legs bolt on with the supplied hex key — about ten minutes, two people to turn it over.",
    care: "Wipe with a barely damp cloth. Re-oil once a year, or wherever the surface starts to look dry.",
    pairsWith: ["sofa", "armchair", "side_table"],
  },
  side_table: {
    plural: "Side tables",
    finishLabel: "Finish",
    dimensions: [
      { label: "Diameter", value: "40 cm" },
      { label: "Height", value: "52 cm" },
      { label: "Weight", value: "9 kg" },
    ],
    details: [
      "Solid timber or powder-coated steel, depending on the finish.",
      "Sized to sit beside a sofa arm or a bed without crowding it.",
      "Felted base, so it can be slid rather than lifted.",
    ],
    assembly: "Arrives fully built.",
    care: "Wipe with a barely damp cloth. Re-oil timber once a year; steel needs nothing.",
    pairsWith: ["sofa", "armchair", "ottoman"],
  },
  bedside_table: {
    plural: "Bedside tables",
    finishLabel: "Finish",
    dimensions: [
      { label: "Width", value: "40 cm" },
      { label: "Depth", value: "36 cm" },
      { label: "Height", value: "55 cm" },
    ],
    bySize: {
      short: [
        { label: "Width", value: "40 cm" },
        { label: "Depth", value: "36 cm" },
        { label: "Height", value: "45 cm" },
      ],
      tall: [
        { label: "Width", value: "40 cm" },
        { label: "Depth", value: "36 cm" },
        { label: "Height", value: "70 cm" },
      ],
    },
    details: [
      "Solid oak, finished in hardwax oil.",
      "One soft-close drawer, dovetailed at the corners.",
      "Sized to sit level with a standard mattress top.",
    ],
    assembly: "Arrives fully built.",
    care: "Wipe with a barely damp cloth. Re-oil once a year.",
    pairsWith: ["armchair", "ottoman", "side_table"],
  },
  dining_table: {
    plural: "Dining tables",
    finishLabel: "Finish",
    dimensions: [
      { label: "Diameter", value: "120 cm" },
      { label: "Height", value: "75 cm" },
      { label: "Seats", value: "Four comfortably, six at a push" },
      { label: "Weight", value: "48 kg" },
    ],
    details: [
      "Solid oak top on a turned pedestal base — no leg in anyone's way.",
      "Hardwax oil finish, repairable in place.",
      "Levelling feet under the base for uneven floors.",
    ],
    assembly: "The top sits onto the base and bolts from underneath. Two people, about twenty minutes.",
    care: "Wipe with a barely damp cloth, use a mat under anything hot, and re-oil once a year.",
    pairsWith: ["armchair", "side_table", "coffee_table"],
  },
};

/** Everything a page needs about a piece, or null for a type we do not know. */
export function specFromTags(tags: readonly string[]): PieceSpec | null {
  const type = typeFromTags(tags);
  return type ? (SPECS[type] ?? null) : null;
}

/** Look a spec up by type slug, for pages that work in types rather than tags. */
export function specForType(type: string): PieceSpec | null {
  return SPECS[type] ?? null;
}

const SIZE_TAG = /^size_(.+)$/i;

/** The spec sheet for this exact product, with any size override applied. */
export function dimensionsFromTags(tags: readonly string[]): SpecRow[] {
  const spec = specFromTags(tags);
  if (!spec) return [];

  for (const tag of tags) {
    const match = SIZE_TAG.exec(tag);
    const rows = match && spec.bySize?.[match[1].toLowerCase()];
    if (rows) return rows;
  }
  return spec.dimensions;
}
