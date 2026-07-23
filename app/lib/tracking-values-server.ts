import "server-only";

import { getStoreDomain } from "./shop";

// Fetches Shopify's server-issued visitor tokens by making a consentManagement
// call against the Storefront API and reading the Server-Timing header
// server-side (Vercel's edge strips that header from responses, so the browser
// can never read it directly). Legacy _shopify_y/_s cookies are never
// forwarded upstream: Shopify echoes client-provided legacy values back, so
// forwarding a stale self-generated pair would return the same unattributable
// tokens instead of issuing real ones.

const CONSENT_QUERY =
  "query ensureCookies { consentManagement { cookies(visitorConsent: {}) { cookieDomain } } }";

export type ServerTrackingValues = {
  uniqueToken: string | null;
  visitToken: string | null;
  /** Host-only Set-Cookie values (e.g. _shopify_essential) safe to forward first-party. */
  setCookies: string[];
};

function serverTimingValue(header: string, metric: string): string | null {
  const match = header.match(new RegExp(`(?:^|,)\\s*${metric};desc="?([^,"]+)"?`));
  return match?.[1] ?? null;
}

export function stripLegacyTrackingCookies(cookieHeader: string | null): string | undefined {
  const filtered = cookieHeader
    ?.split("; ")
    .filter((entry) => !/^_shopify_[ys]=/.test(entry))
    .join("; ");
  return filtered || undefined;
}

export async function fetchServerTrackingValues(
  cookieHeader: string | null,
): Promise<ServerTrackingValues | null> {
  const token = process.env.PUBLIC_STOREFRONT_API_TOKEN;
  if (!token) return null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Shopify-Storefront-Access-Token": token,
  };
  const cookie = stripLegacyTrackingCookies(cookieHeader);
  if (cookie) headers.cookie = cookie;

  try {
    const upstream = await fetch(`https://${getStoreDomain()}/api/unstable/graphql.json`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: CONSENT_QUERY }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    const serverTiming = upstream.headers.get("server-timing") ?? "";
    return {
      uniqueToken: serverTimingValue(serverTiming, "_y"),
      visitToken: serverTimingValue(serverTiming, "_s"),
      setCookies: upstream.headers
        .getSetCookie()
        .filter((entry) => !/;\s*domain=/i.test(entry)),
    };
  } catch {
    return null;
  }
}
