import {
  createStorefrontClient,
  createStorefrontRequestContext,
  handleShopifyRoutes,
} from "@shopify/hydrogen";
import { NextResponse, type NextRequest } from "next/server";

import { cartHandlers } from "./app/lib/cart-handlers";
import {
  DEVELOPMENT_BUYER_IP,
  getBuyerIp,
  getPrivateStorefrontToken,
  getStoreDomain,
  storefrontConfig,
  useMockShop,
} from "./app/lib/shop";
import {
  fetchServerTrackingValues,
  type ServerTrackingValues,
} from "./app/lib/tracking-values-server";

// Mirrors Hydrogen's deprecated-cookies expiries (360 days / 30 minutes).
const SEEDED_MARKER = "_tracking_seeded";
const UNIQUE_TOKEN_MAX_AGE = 3600 * 24 * 360;
const VISIT_TOKEN_MAX_AGE = 1800;

function isDocumentRequest(request: NextRequest): boolean {
  if (request.method !== "GET") return false;
  if (request.headers.get("sec-fetch-dest") === "document") return true;
  return request.headers.get("accept")?.includes("text/html") ?? false;
}

function getMockBuyerIp(headers: Pick<Headers, "get">): string {
  try {
    return getBuyerIp(headers);
  } catch {
    return DEVELOPMENT_BUYER_IP;
  }
}

export async function proxy(request: NextRequest) {
  const requestContext = createStorefrontRequestContext(request);
  const storefrontClient = createStorefrontClient({
    type: "private",
    config: useMockShop(process.env)
      ? {
          storeDomain: "mock.shop",
          i18n: storefrontConfig.i18n,
          privateStorefrontToken: "mock-shop",
          buyerIp: getMockBuyerIp(request.headers),
          requestContext,
          fetch: (_input, init) => fetch("https://mock.shop/api", init),
        }
      : {
          storeDomain: getStoreDomain(process.env),
          i18n: storefrontConfig.i18n,
          privateStorefrontToken: getPrivateStorefrontToken(),
          buyerIp: getBuyerIp(request.headers),
          requestContext,
        },
  });

  const shopifyRoute = await handleShopifyRoutes({
    request,
    storefrontClient,
    handlers: [cartHandlers],
  });
  if (shopifyRoute) return shopifyRoute;

  const requestHeaders = requestContext.getForwardedRequestHeaders();

  // Seed Shopify's SERVER-issued visitor tokens on the document response
  // itself, so the tracking cookies exist before the page renders — a visitor
  // who clicks "Add to cart" instantly can no longer race the client-side
  // bootstrap and create their cart under an unattributable identity. Runs
  // once per browser (the marker cookie gates it). Self-generated legacy
  // cookies from pre-fix visits are replaced, since Shopify never attributes
  // them (legacy cookie attribution was retired 2026-04-30).
  let seeded: ServerTrackingValues | null = null;
  if (isDocumentRequest(request) && !request.cookies.has(SEEDED_MARKER)) {
    seeded = await fetchServerTrackingValues(request.headers.get("cookie"));
    if (seeded?.uniqueToken && seeded.visitToken) {
      const otherCookies =
        requestHeaders
          .get("cookie")
          ?.split("; ")
          .filter((entry) => !/^_shopify_[ys]=/.test(entry)) ?? [];
      // Let this request's SSR see the new tokens too, not just the browser.
      requestHeaders.set(
        "cookie",
        [...otherCookies, `_shopify_y=${seeded.uniqueToken}`, `_shopify_s=${seeded.visitToken}`].join(
          "; ",
        ),
      );
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  requestContext.applyResponseHeaders(response.headers);

  if (seeded?.uniqueToken && seeded.visitToken) {
    const options = { path: "/", sameSite: "lax" as const };
    response.cookies.set("_shopify_y", seeded.uniqueToken, {
      ...options,
      maxAge: UNIQUE_TOKEN_MAX_AGE,
    });
    response.cookies.set("_shopify_s", seeded.visitToken, {
      ...options,
      maxAge: VISIT_TOKEN_MAX_AGE,
    });
    response.cookies.set(SEEDED_MARKER, "1", { ...options, maxAge: UNIQUE_TOKEN_MAX_AGE });
    // Host-only modern cookies (_shopify_essential etc.) stick first-party.
    for (const setCookie of seeded.setCookies) response.headers.append("set-cookie", setCookie);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon.ico).*)"],
};
