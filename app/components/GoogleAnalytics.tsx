"use client";

import { AnalyticsEvent } from "@shopify/hydrogen";
import Script from "next/script";
import { useEffect } from "react";

import { getAnalytics } from "../lib/analytics";

/**
 * Google Analytics 4.
 *
 * The storefront already publishes a full set of commerce events on Shopify's
 * analytics bus — a product viewed, a line added, the cart opened. This
 * forwards them to GA4 as its own ecommerce events rather than settling for
 * page views, so the funnel in GA4 is the funnel a shopper actually walks.
 *
 * Two things it deliberately does NOT do:
 *
 * 1. It never fires before consent. Consent Mode starts denied and is lifted
 *    from the same Customer Privacy signal the cookie banner writes to, so a
 *    visitor who declines analytics is not measured — by either system.
 * 2. It does not report the purchase. Checkout happens on the Shopify domain,
 *    off this app entirely, so `purchase` has to come from Shopify's own tag —
 *    see the note in the README of this component's PR, or the Google &
 *    YouTube channel in the Shopify admin.
 */

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

/** `window.Shopify` is typed by the standard-actions bundle, which does not
 *  describe the privacy methods — the consent banner reads them the same way. */
type CustomerPrivacy = {
  analyticsProcessingAllowed?: () => boolean;
  marketingAllowed?: () => boolean;
};

function customerPrivacy(): CustomerPrivacy | undefined {
  if (typeof window === "undefined") return undefined;
  return (window.Shopify as { customerPrivacy?: CustomerPrivacy } | undefined)?.customerPrivacy;
}

function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  window.dataLayer ??= [];
  window.dataLayer.push(args);
}

/** A GA4 `items` entry, from the product shape Shopify's bus publishes. */
type BusProduct = {
  id: string;
  title: string;
  price: string;
  vendor: string;
  variantId: string;
  variantTitle: string;
  quantity: number;
  sku?: string | null;
  productType?: string;
};

function itemFrom(product: BusProduct) {
  return {
    // The SKU is what a merchant recognises in a report; the variant id is the
    // fallback for anything that has not been given one.
    item_id: product.sku || product.variantId,
    item_name: product.title,
    item_brand: product.vendor,
    item_category: product.productType,
    item_variant: product.variantTitle,
    price: Number.parseFloat(product.price) || 0,
    quantity: product.quantity || 1,
  };
}

type CartLine = {
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    sku?: string | null;
    price: { amount: string; currencyCode: string };
    product: { title: string; vendor: string; productType: string };
  };
};

function itemFromLine(line: CartLine) {
  const { merchandise } = line;
  return {
    item_id: merchandise.sku || merchandise.id,
    item_name: merchandise.product.title,
    item_brand: merchandise.product.vendor,
    item_category: merchandise.product.productType,
    item_variant: merchandise.title,
    price: Number.parseFloat(merchandise.price.amount) || 0,
    quantity: line.quantity || 1,
  };
}

function totalOf(items: Array<{ price: number; quantity: number }>) {
  return Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function GoogleAnalytics({
  measurementId,
  currency,
}: {
  measurementId: string;
  currency: string;
}) {
  useEffect(() => {
    // Denied until the visitor says otherwise. Set before the tag configures
    // itself, which is what makes it a default rather than a correction.
    gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      wait_for_update: 500,
    });

    const applyConsent = (analyticsAllowed: boolean, marketingAllowed: boolean) => {
      gtag("consent", "update", {
        analytics_storage: analyticsAllowed ? "granted" : "denied",
        ad_storage: marketingAllowed ? "granted" : "denied",
        ad_user_data: marketingAllowed ? "granted" : "denied",
        ad_personalization: marketingAllowed ? "granted" : "denied",
      });
    };

    // The banner writes to Shopify's Customer Privacy API, which answers on
    // demand and announces later changes on `visitorConsentCollected`. Reading
    // both covers the visitor who decided on an earlier visit.
    const privacy = customerPrivacy();
    if (privacy?.analyticsProcessingAllowed) {
      applyConsent(privacy.analyticsProcessingAllowed(), privacy.marketingAllowed?.() ?? false);
    }

    const onConsent = (event: Event) => {
      const detail = record((event as CustomEvent).detail);
      if (!detail) return;
      applyConsent(Boolean(detail.analyticsAllowed), Boolean(detail.marketingAllowed));
    };

    document.addEventListener("visitorConsentCollected", onConsent);
    return () => document.removeEventListener("visitorConsentCollected", onConsent);
  }, []);

  useEffect(() => {
    // The bus is created by AnalyticsTracker on mount; this may run first, so
    // it waits for it rather than assuming an order between two effects.
    let unsubs: Array<() => void> = [];
    let timer = 0;
    let cancelled = false;

    const productsFrom = (payload: unknown) => {
      const products = record(payload)?.products;
      return Array.isArray(products) ? (products as BusProduct[]).map(itemFrom) : [];
    };

    const linesFrom = (payload: unknown) => {
      const cart = record(record(payload)?.cart);
      const nodes = record(cart?.lines)?.nodes;
      return Array.isArray(nodes) ? (nodes as CartLine[]).map(itemFromLine) : [];
    };

    const subscribe = () => {
      if (cancelled) return;
      const analytics = getAnalytics();
      if (!analytics) {
        timer = window.setTimeout(subscribe, 100);
        return;
      }

      unsubs = [
        analytics.subscribe(AnalyticsEvent.PAGE_VIEWED, (payload) => {
          gtag("event", "page_view", {
            page_location: record(payload)?.url ?? window.location.href,
          });
        }),

        analytics.subscribe(AnalyticsEvent.PRODUCT_VIEWED, (payload) => {
          const items = productsFrom(payload);
          if (items.length === 0) return;
          gtag("event", "view_item", { currency, value: totalOf(items), items });
        }),

        analytics.subscribe(AnalyticsEvent.COLLECTION_VIEWED, (payload) => {
          const collection = record(record(payload)?.collection);
          gtag("event", "view_item_list", {
            item_list_id: collection?.handle ?? "collection",
            item_list_name: collection?.handle ?? "collection",
          });
        }),

        analytics.subscribe(AnalyticsEvent.SEARCH_VIEWED, (payload) => {
          gtag("event", "search", { search_term: record(payload)?.searchTerm ?? "" });
        }),

        analytics.subscribe(AnalyticsEvent.CART_VIEWED, (payload) => {
          const items = linesFrom(payload);
          gtag("event", "view_cart", { currency, value: totalOf(items), items });
        }),

        analytics.subscribe(AnalyticsEvent.PRODUCT_ADD_TO_CART, (payload) => {
          const line = record(payload)?.currentLine;
          const items = line ? [itemFromLine(line as CartLine)] : [];
          if (items.length === 0) return;
          gtag("event", "add_to_cart", { currency, value: totalOf(items), items });
        }),

        analytics.subscribe(AnalyticsEvent.PRODUCT_REMOVED_FROM_CART, (payload) => {
          const line = record(payload)?.prevLine;
          const items = line ? [itemFromLine(line as CartLine)] : [];
          if (items.length === 0) return;
          gtag("event", "remove_from_cart", { currency, value: totalOf(items), items });
        }),
      ];
    };

    subscribe();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      for (const unsub of unsubs) unsub();
    };
  }, [currency]);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-config" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
// send_page_view is off: the storefront publishes its own page_viewed event
// on every route change, and letting both fire would double every view.
gtag('config', '${measurementId}', { send_page_view: false });`}
      </Script>
    </>
  );
}
