/**
 * Grouping a piece's listings.
 *
 * This file used to hold the colourway grouping as well: each finish was its
 * own Shopify product, and a family key was recovered by stripping finish
 * words ("Otto Natural", "Smoke Oak") off the end of a title. Colourways are
 * Shopify variants now — one product, a Colour option, the colours held in
 * Shopify's own colour metaobject — so none of that guessing is needed.
 *
 * What is left is `pieceKey`, which is a looser grouping than a product: it
 * catches the same piece made in two sizes, which really are two products.
 */

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * A piece's given name is the first word of its title, and it is reused across
 * every listing of that piece — so "Leo Tall Plinth" and "Leo Short Plinth"
 * count as the same piece. The category tag joins the key so two unrelated
 * pieces sharing a name would not collide.
 */
export function pieceKey(title: string, tags: readonly string[]) {
  const normalized = normalize(title);
  const name = normalized.split(/\s+/)[0] || normalized;
  const category = tags.find((tag) => /^category_/i.test(tag))?.toLowerCase() ?? "";
  return `${name}|${category}`;
}
