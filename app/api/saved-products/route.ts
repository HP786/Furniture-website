import { gql, type StorefrontApi } from "@shopify/hydrogen";
import { NextResponse, type NextRequest } from "next/server";

import { PRODUCT_CARD_FRAGMENT, type ProductCardData } from "../../lib/product-card-fragment";
import { getStorefrontClient } from "../../lib/storefront";

// Resolves saved product handles into full cards. Saved items live in the
// browser, but the Storefront token must not, so the lookup happens here.
export const dynamic = "force-dynamic";

const SAVED_PRODUCTS_QUERY = gql(
  `
    query SavedProducts($query: String!) {
      products(first: 50, query: $query) {
        nodes {
          ...ProductCard
        }
      }
    }
  `,
  [PRODUCT_CARD_FRAGMENT],
);

type SavedProductsQuery = StorefrontApi.ResultOf<typeof SAVED_PRODUCTS_QUERY>;

// Cap what a crafted request can ask for.
const MAX_HANDLES = 50;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("handles") ?? "";
  const handles = raw
    .split(",")
    .map((handle) => handle.trim())
    // Handles are lowercase alphanumerics and dashes; anything else is not one,
    // and must not reach the search query.
    .filter((handle) => /^[a-z0-9-]+$/.test(handle))
    .slice(0, MAX_HANDLES);

  if (handles.length === 0) {
    return NextResponse.json({ products: [] }, { headers: { "cache-control": "no-store" } });
  }

  try {
    const storefront = await getStorefrontClient();
    const { data } = await storefront.graphql(SAVED_PRODUCTS_QUERY, {
      variables: { query: handles.map((handle) => `handle:${handle}`).join(" OR ") },
    });
    const result = data as SavedProductsQuery | null | undefined;
    const found = (result?.products.nodes ?? []) as ProductCardData[];

    // Return them in the order they were saved, newest first, rather than in
    // whatever order the search happened to come back in.
    const byHandle = new Map(found.map((product) => [product.handle, product]));
    const products = handles.flatMap((handle) => {
      const product = byHandle.get(handle);
      return product ? [product] : [];
    });

    return NextResponse.json({ products }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "saved products unavailable" }, { status: 502 });
  }
}
