import { NextResponse, type NextRequest } from "next/server";

import { getStoreDomain } from "../../lib/shop";

// Server-side bridge for Shopify's session tokens. Session attribution needs
// the browser's analytics events to carry the server-issued _shopify_y/_s
// values, which Shopify delivers via the Server-Timing header on Storefront
// API responses — but Vercel's edge strips Server-Timing from responses, so
// the browser never sees them and falls back to self-generated tokens that
// Shopify won't attribute (legacy cookie attribution retired 2026-04-30).
// This handler makes the same consentManagement call server-side (where the
// header is readable), forwards the host-only tracking cookies, and returns
// the tokens in the response body instead.

const CONSENT_QUERY =
  "query ensureCookies { consentManagement { cookies(visitorConsent: {}) { cookieDomain } } }";

function serverTimingValue(header: string, metric: string): string | null {
  const match = header.match(new RegExp(`(?:^|,)\\s*${metric};desc="?([^,"]+)"?`));
  return match?.[1] ?? null;
}

export async function GET(request: NextRequest) {
  const token = process.env.PUBLIC_STOREFRONT_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "storefront token not configured" }, { status: 503 });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Shopify-Storefront-Access-Token": token,
  };
  const cookie = request.headers.get("cookie");
  if (cookie) headers.cookie = cookie;

  let upstream: Response;
  try {
    upstream = await fetch(`https://${getStoreDomain()}/api/unstable/graphql.json`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: CONSENT_QUERY }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json({ error: "tracking values unavailable" }, { status: 502 });
  }

  const serverTiming = upstream.headers.get("server-timing") ?? "";
  const response = NextResponse.json(
    {
      uniqueToken: serverTimingValue(serverTiming, "_y"),
      visitToken: serverTimingValue(serverTiming, "_s"),
    },
    { headers: { "cache-control": "no-store" } },
  );

  // Pass through the modern host-only cookies (_shopify_essential etc.) so
  // they stick first-party on this domain; skip legacy Set-Cookies that name
  // the myshopify domain — the browser would reject them here anyway.
  for (const setCookie of upstream.headers.getSetCookie()) {
    if (!/;\s*domain=/i.test(setCookie)) response.headers.append("set-cookie", setCookie);
  }
  return response;
}
