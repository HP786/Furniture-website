"use client";

// Mirrors Hydrogen's deprecated-cookies expiries (360 days / 30 minutes).
const UNIQUE_TOKEN_MAX_AGE = 3600 * 24 * 360;
const VISIT_TOKEN_MAX_AGE = 1800;

function hasCookie(name: string): boolean {
  return document.cookie.split("; ").some((entry) => entry.startsWith(`${name}=`));
}

function setCookie(name: string, value: string, maxAgeInSeconds: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAgeInSeconds}; path=/; SameSite=Lax`;
}

// Seed the legacy _shopify_y/_s cookies with SERVER-issued values before the
// analytics bus reads them. Hydrogen normally learns these tokens from the
// Server-Timing header of its same-origin SFAPI call, but Vercel's edge strips
// that header, leaving the bus to self-generate tokens that Shopify won't
// attribute to a session. /api/tracking-values reads the header server-side
// and hands the real tokens over in the body; Hydrogen's own cookie sync then
// preserves whatever values already exist.
export async function ensureServerIssuedTrackingCookies(): Promise<void> {
  if (typeof document === "undefined") return;
  if (hasCookie("_shopify_y") && hasCookie("_shopify_s")) return;

  try {
    const response = await fetch("/api/tracking-values", { cache: "no-store" });
    if (!response.ok) return;
    const { uniqueToken, visitToken } = (await response.json()) as {
      uniqueToken?: string | null;
      visitToken?: string | null;
    };
    if (uniqueToken) setCookie("_shopify_y", uniqueToken, UNIQUE_TOKEN_MAX_AGE);
    if (visitToken) setCookie("_shopify_s", visitToken, VISIT_TOKEN_MAX_AGE);
  } catch {
    // Non-fatal: analytics falls back to self-generated tokens.
  }
}
