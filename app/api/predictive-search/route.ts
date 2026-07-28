import { NextResponse, type NextRequest } from "next/server";

import { loadPredictiveSearch } from "../../lib/predictive-search";

// Type-ahead endpoint for the search box. Runs server-side so the private
// Storefront token and buyer IP stay off the client.
//
// An empty `q` is passed straight through rather than short-circuited: Shopify
// answers the empty query with default suggestions (best sellers and top
// collections), which is what the box shows before anything is typed.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const term = (request.nextUrl.searchParams.get("q") ?? "").trim();

  try {
    const results = await loadPredictiveSearch(term);
    return NextResponse.json(results, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "predictive search unavailable" }, { status: 502 });
  }
}
