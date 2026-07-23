import { NextResponse, type NextRequest } from "next/server";

import { fetchServerTrackingValues } from "../../lib/tracking-values-server";

// Client-side fallback for Shopify's server-issued visitor tokens. The primary
// seeding happens in proxy.ts, which sets the cookies on the document response
// itself; this endpoint covers clients that somehow missed it (e.g. cached
// documents) so the browser can still fetch and store the tokens.

export async function GET(request: NextRequest) {
  const values = await fetchServerTrackingValues(request.headers.get("cookie"));
  if (!values) {
    return NextResponse.json({ error: "tracking values unavailable" }, { status: 502 });
  }

  const response = NextResponse.json(
    { uniqueToken: values.uniqueToken, visitToken: values.visitToken },
    { headers: { "cache-control": "no-store" } },
  );
  // Pass through the modern host-only cookies (_shopify_essential etc.) so
  // they stick first-party on this domain.
  for (const setCookie of values.setCookies) response.headers.append("set-cookie", setCookie);
  return response;
}
