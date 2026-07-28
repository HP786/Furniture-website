import { NextResponse, type NextRequest } from "next/server";

import { EMPTY_PREDICTIVE_RESULTS, loadPredictiveSearch } from "../../lib/predictive-search";

// Type-ahead endpoint for the search box. Runs server-side so the private
// Storefront token and buyer IP stay off the client.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const term = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (!term) {
    return NextResponse.json(EMPTY_PREDICTIVE_RESULTS, {
      headers: { "cache-control": "no-store" },
    });
  }

  try {
    const results = await loadPredictiveSearch(term);
    return NextResponse.json(results, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "predictive search unavailable" }, { status: 502 });
  }
}
