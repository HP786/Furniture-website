/**
 * Colourway grouping. Each finish is its own Shopify product ("Ester Armchair
 * Oyster", "Ester Armchair - Otto Natural"), but the design presents them as
 * one piece with a swatch row. Stripping the finish words off the title gives a
 * family key; swatches still link to each colourway's own product page, so the
 * catalogue needs no restructuring.
 */

// Words that describe a finish rather than the piece. Longest first so
// "Light Oak" is consumed before "Oak".
const FINISH_WORDS = [
  "tan leather",
  "otto natural",
  "otto fabric",
  "light oak",
  "smoke oak",
  "walnut linen",
  "boucle",
  "bouclé",
  "leather",
  "natural",
  "sangria",
  "oyster",
  "walnut",
  "chalk",
  "cream",
  "fabric",
  "ivory",
  "linen",
  "clay",
  "haze",
  "pine",
  "otto",
  "oak",
  "tan",
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * "Ester Armchair - Otto Natural" → "ester armchair".
 * Strips trailing finish words, then any dangling separator, repeatedly.
 */
export function familyKey(title: string) {
  let working = title.trim();

  let changed = true;
  while (changed) {
    changed = false;
    const normalized = normalize(working);

    for (const word of FINISH_WORDS) {
      if (normalized.endsWith(` ${word}`)) {
        working = working.slice(0, working.length - word.length).trimEnd();
        changed = true;
        break;
      }
    }

    const trimmed = working.replace(/[-–—·,]\s*$/, "").trimEnd();
    if (trimmed !== working) {
      working = trimmed;
      changed = true;
    }
  }

  // Never strip a title down to nothing — fall back to the original.
  return normalize(working) || normalize(title);
}

/**
 * A looser key than `familyKey`, for runs of cards that should read as variety.
 *
 * A piece's given name is the first word of its title, and it is reused across
 * every listing of that piece — so "Leo Tall Plinth Light Oak" and "Leo Short
 * Plinth Smoke Oak" count as the same piece here, where `familyKey` keeps them
 * apart (they are separate products with separate swatch rows). The category
 * tag joins the key so two unrelated pieces sharing a name would not collide.
 */
export function pieceKey(title: string, tags: readonly string[]) {
  const normalized = normalize(title);
  const name = normalized.split(/\s+/)[0] || normalized;
  const category = tags.find((tag) => /^category_/i.test(tag))?.toLowerCase() ?? "";
  return `${name}|${category}`;
}

export type FamilyMember = {
  handle: string;
  title: string;
  hex: string | null;
  colorName: string | null;
  imageUrl: string | null;
};

export type FamilyIndex = Map<string, FamilyMember[]>;

/**
 * Siblings of a product, in a stable order, or an empty array when the piece
 * only comes one way. Callers render swatches only when length > 1.
 */
export function familyMembers(index: FamilyIndex | undefined, title: string): FamilyMember[] {
  if (!index) return [];
  const members = index.get(familyKey(title));
  return members && members.length > 1 ? members : [];
}
