// Where a product page's colour swatches come from, traced against the live
// store. Answers the question this catalogue keeps prompting: nothing in
// Shopify links one colourway to another, so what does?
//
//   node scripts/swatch-trace.mjs [handle]
//
// Defaults to the Clem coffee table. Prints, in order:
//   1. everything Shopify holds for the product that could relate it to
//      another one — variants and their option swatches, collections, tags;
//   2. the grouping this site computes from the title, with the store's own
//      `familyKey`, imported from app/lib rather than reimplemented here;
//   3. the chip colours, from each sibling's `Color_*` tag through the store's
//      own `swatchFromTags`;
//   4. what changes the answer — a renamed title, an unknown colour tag.
//
// Reads .env / .env.local for the public storefront credentials, so it needs no
// arguments and no dev server.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { familyKey } from "../app/lib/product-family.ts";
import { swatchFromTags } from "../app/lib/swatches.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HANDLE = process.argv[2] ?? "clem-coffee-table-smoke-oak";
const API_VERSION = "2025-07";

function readEnv() {
  const env = {};
  for (const file of [".env", ".env.local"]) {
    let contents;
    try {
      contents = readFileSync(path.join(ROOT, file), "utf8");
    } catch {
      continue;
    }
    for (const line of contents.split(/\r?\n/)) {
      const index = line.indexOf("=");
      if (index < 1 || line.trimStart().startsWith("#")) continue;
      env[line.slice(0, index).trim()] = line
        .slice(index + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = readEnv();
const domain = env.PUBLIC_STORE_DOMAIN;
const token = env.PUBLIC_STOREFRONT_API_TOKEN;
if (!domain || !token) {
  console.error("Missing PUBLIC_STORE_DOMAIN / PUBLIC_STOREFRONT_API_TOKEN in .env");
  process.exit(1);
}

async function storefront(query, variables) {
  const response = await fetch(`https://${domain}/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors, null, 2));
  return body.data;
}

// Everything the Storefront API will tell us about how this product relates to
// any other: its own options and their swatches, its variants, its collections.
const PRODUCT = `
  query Trace($handle: String!) {
    product(handle: $handle) {
      handle
      title
      tags
      options { name optionValues { name swatch { color image { previewImage { url } } } } }
      variants(first: 10) { nodes { title selectedOptions { name value } } }
      collections(first: 30) { nodes { handle } }
    }
  }
`;

// The same query the site runs once in the root layout to build its index.
const CATALOGUE = `
  query Catalogue {
    products(first: 250, sortKey: TITLE) {
      nodes { handle title tags }
    }
  }
`;

const rule = (label) => console.log(`\n${label}\n${"─".repeat(Math.max(label.length, 46))}`);

const [{ product }, { products }] = await Promise.all([
  storefront(PRODUCT, { handle: HANDLE }),
  storefront(CATALOGUE),
]);

if (!product) {
  console.error(`No product with handle "${HANDLE}"`);
  process.exit(1);
}

console.log(`\nSwatch trace — ${product.title}`);
console.log(`https://${domain}/products/${product.handle}`);

rule("1. What Shopify holds for this product");
console.log("tags:");
for (const tag of product.tags) console.log(`  ${tag}`);
console.log("\noptions (this is where a native Shopify colour swatch would live):");
for (const option of product.options) {
  for (const value of option.optionValues) {
    const swatch = value.swatch?.color ?? value.swatch?.image?.previewImage?.url ?? "null";
    console.log(`  ${option.name} = ${value.name}  → swatch: ${swatch}`);
  }
}
console.log("\nvariants:");
for (const variant of product.variants.nodes) console.log(`  ${variant.title}`);
console.log("\ncollections:");
for (const collection of product.collections.nodes) console.log(`  ${collection.handle}`);
console.log("\nmetafields: none — the storefront code never queries a product metafield.");
console.log("Nothing above names the other colourway. The link is not stored in Shopify.");

rule("2. The grouping the site computes, from the title");
const key = familyKey(product.title);
console.log(`familyKey("${product.title}")`);
console.log(`  → "${key}"      (trailing finish words stripped)`);

const family = products.nodes.filter((node) => familyKey(node.title) === key);
console.log(`\n${family.length} product${family.length === 1 ? "" : "s"} in the store share that key:`);
for (const node of family) console.log(`  ${node.title.padEnd(34)} ${node.handle}`);

rule("3. The chip colour, from each sibling's Color_* tag");
for (const node of family) {
  const colourTag = node.tags.find((tag) => /^color_/i.test(tag)) ?? "(none)";
  const swatch = swatchFromTags(node.tags);
  const current = node.handle === product.handle ? "  ← the page you are on" : "";
  console.log(
    `  ${colourTag.padEnd(18)} → ${(swatch?.name ?? "no chip").padEnd(12)} ${swatch?.hex ?? ""}${current}`,
  );
}
console.log("\nThe hex values live in app/lib/swatches.ts, not in Shopify.");
console.log("Each chip is a link to that sibling's own product page.");

rule("4. What changes the answer");
const renamed = `${product.title} Special Edition`;
console.log(`familyKey("${renamed}")`);
console.log(`  → "${familyKey(renamed)}"  ${familyKey(renamed) === key ? "(same family)" : "(falls out of the family — the row would drop to one)"}`);
const unknown = product.tags.map((tag) => (/^color_/i.test(tag) ? "Color_Chartreuse" : tag));
console.log(`\nswatchFromTags([... "Color_Chartreuse"]) → ${JSON.stringify(swatchFromTags(unknown))}`);
console.log("  An unrecognised colour tag renders no chip, which is why a new");
console.log("  finish needs one line in SWATCH_HEX as well as the tag in Shopify.");
console.log("");
