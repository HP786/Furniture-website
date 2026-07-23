// ─────────────────────────────────────────────────────────────────────────────
// Store configuration.
//
// Mode is auto-detected per request (see `useMockShop` below):
//   • Real store — used automatically whenever a PRIVATE Storefront API token is
//     present. On Vercel, set PRIVATE_STOREFRONT_API_TOKEN and PUBLIC_STORE_DOMAIN
//     in project environment variables; for local real-store dev set them in `.env`.
//   • mock.shop — the tokenless fallback used when no token is present (so a
//     fresh deploy always renders), and forced explicitly by MOCK_SHOP=1.
//
// `storeDomain` below is the default used only when PUBLIC_STORE_DOMAIN is unset.
// It points at Shopify's public Hydrogen Preview store as an EXAMPLE — replace it
// or set PUBLIC_STORE_DOMAIN. (mock.shop is a different data source.)
// ─────────────────────────────────────────────────────────────────────────────

export const storefrontConfig = {
  storeDomain: "hydrogen-preview.myshopify.com",
  i18n: { country: "AU", language: "EN" },
} as const;

// Analytics shop identity. The Hydrogen sales channel populates SHOP_ID and
// PUBLIC_STOREFRONT_ID for a linked store (e.g. via `shopify hydrogen env pull`,
// or set them in `.env` / your host's project env). MOCK_SHOP=1 still falls back
// to the public Hydrogen Preview store's demo IDs; outside of that, a missing
// value in production is a hard failure rather than a silent demo-store ID,
// since the wrong subchannel/shop ID makes analytics attribute to the wrong store.
const DEMO_SHOP_GID = "gid://shopify/Shop/55145660472";
const DEMO_HYDROGEN_SUBCHANNEL_ID = "1000014875";

function toShopGid(shopId: string): string {
  return shopId.startsWith("gid://") ? shopId : `gid://shopify/Shop/${shopId}`;
}

function resolveShopId(): string {
  if (process.env.SHOP_ID) return toShopGid(process.env.SHOP_ID);
  if (process.env.MOCK_SHOP === "1") return DEMO_SHOP_GID;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SHOP_ID is required in production. Set it in your environment (see .env.example), " +
        "or run with MOCK_SHOP=1 for the tokenless mock.shop demo.",
    );
  }
  return DEMO_SHOP_GID;
}

function resolveHydrogenSubchannelId(): string {
  if (process.env.PUBLIC_STOREFRONT_ID) return process.env.PUBLIC_STOREFRONT_ID;
  if (process.env.MOCK_SHOP === "1") return DEMO_HYDROGEN_SUBCHANNEL_ID;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "PUBLIC_STOREFRONT_ID is required in production. Set it in your environment (see .env.example), " +
        "or run with MOCK_SHOP=1 for the tokenless mock.shop demo.",
    );
  }
  return DEMO_HYDROGEN_SUBCHANNEL_ID;
}

export const analyticsShop = {
  shopId: resolveShopId(),
  acceptedLanguage: "EN",
  currency: "USD",
  hydrogenSubchannelId: resolveHydrogenSubchannelId(),
} as const;

export const analyticsConsent = {
  // Store-wide cookie banner is disabled in every region, so there is no click
  // to wait for. "custom-banner" makes Hydrogen buffer events for a 10s timeout
  // expecting a banner interaction that never happens; "no-banner" cuts that to 3s.
  mode: "no-banner",
  country: "AU",
  language: "EN",
  // Public (32-char) Storefront API token. Required so the Customer Privacy API
  // can resolve this store's consent settings from a headless domain — without
  // it the browser-side consent/tracking-token requests carry no store identity.
  publicStorefrontAccessToken: process.env.PUBLIC_STOREFRONT_API_TOKEN,
  // IMPORTANT: leave consentDomain unset so the browser bootstraps consent and
  // tracking values through the SAME-ORIGIN SFAPI proxy (/api/unstable/graphql.json,
  // served by proxy.ts). Same-origin is required for the browser to receive the
  // server-issued _shopify_essential/_shopify_analytics cookies (host-only
  // Set-Cookie) and to read the Server-Timing tracking tokens — legacy
  // _shopify_y/_s attribution was retired by Shopify on 2026-04-30, so pointing
  // this at the myshopify.com domain (cross-origin: cookies rejected, timing
  // unreadable) silently kills session attribution for cart events.
  ...(process.env.PUBLIC_CHECKOUT_DOMAIN
    ? { consentDomain: process.env.PUBLIC_CHECKOUT_DOMAIN }
    : {}),
} as const;

export function useMockShop(
  env:
    | { MOCK_SHOP?: string; PRIVATE_STOREFRONT_API_TOKEN?: string }
    | Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
  return env.MOCK_SHOP === "1" || !env.PRIVATE_STOREFRONT_API_TOKEN;
}

// Store domain for real-store mode: prefer PUBLIC_STORE_DOMAIN from the
// environment (set it in `.env` locally or in your host's project env vars), else
// fall back to the configured default above.
export function getStoreDomain(
  env:
    | { PUBLIC_STORE_DOMAIN?: string }
    | Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): string {
  return env.PUBLIC_STORE_DOMAIN || storefrontConfig.storeDomain;
}

export function getPrivateStorefrontToken(
  env:
    | { PRIVATE_STOREFRONT_API_TOKEN?: string }
    | Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): string {
  const token = env.PRIVATE_STOREFRONT_API_TOKEN;
  if (!token) {
    throw new Error(
      "PRIVATE_STOREFRONT_API_TOKEN is required for SSR requests against a real store. " +
        "Set it in your environment (see .env.example), or run with MOCK_SHOP=1 for the tokenless mock.shop demo.",
    );
  }
  return token;
}

const BUYER_IP_HEADERS = ["oxygen-buyer-ip", "cf-connecting-ip", "x-forwarded-for"] as const;
export const DEVELOPMENT_BUYER_IP = "127.0.0.1";

export function getBuyerIp(headers: Pick<Headers, "get">): string {
  for (const header of BUYER_IP_HEADERS) {
    const ip = headers.get(header)?.split(",")[0]?.trim();
    if (ip) return ip;
  }
  if (process.env.NODE_ENV !== "production") return DEVELOPMENT_BUYER_IP;
  throw new Error(`${BUYER_IP_HEADERS.join(", ")} is required for private Storefront API clients`);
}