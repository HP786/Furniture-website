import type { Metadata } from "next";
import { Figtree, Jost } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";

import { AnalyticsDebugOverlay } from "./components/AnalyticsDebugOverlay";
import { CartDrawer } from "./components/CartDrawer";
import { ConsentBanner } from "./components/ConsentBanner";
import { FamilyProvider } from "./components/FamilyProvider";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { MobileTabBar } from "./components/MobileTabBar";
import { Providers } from "./components/Providers";
import { getShopAnalyticsData } from "./lib/analytics-shop";
import { cartHandlers } from "./lib/cart-handlers";
import { loadCollectionIndex } from "./lib/collection-index";
import { loadStoreIndex } from "./lib/family-index";
import { BRAND_NAME, buildNavigation } from "./lib/navigation";
import { analyticsConsent, getStoreDomain } from "./lib/shop";
import { getStorefrontClient } from "./lib/storefront";

import "./globals.css";

// Jost carries the headings, Figtree the body. Both are exposed as CSS
// variables so tokens.css can own the --font-heading / --font-body mapping
// rather than components reaching for the font objects directly.
const jost = Jost({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  variable: "--font-jost",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BRAND_NAME} — Furniture made in small runs from solid timber and honest cloth`,
  description: `${BRAND_NAME} makes sofas, armchairs, ottomans and solid oak tables in small runs. Bouclé, Otto fabric, leather and oak, with free fabric samples and white-glove delivery across Australia.`,
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} — Furniture made in small runs`,
    description:
      "Sofas, armchairs, ottomans and solid oak tables in bouclé, Otto fabric, leather and oak. Free fabric samples, white-glove delivery.",
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const storefrontClient = await getStorefrontClient();
  const [{ data: cartData }, collectionIndex, storeIndex, analyticsShop] = await Promise.all([
    cartHandlers.get({ storefrontClient }),
    loadCollectionIndex(),
    loadStoreIndex(),
    getShopAnalyticsData(),
  ]);

  const navigation = buildNavigation(collectionIndex.byHandle);
  const analyticsDebug = process.env.PUBLIC_ANALYTICS_DEBUG === "1";

  return (
    <html lang="en" className={`${jost.variable} ${figtree.variable}`}>
      <head>
        <Script
          type="module"
          src="https://cdn.shopify.com/storefront/standard-actions.js"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-surface text-on-surface font-body flex min-h-svh flex-col antialiased">
        <a
          href="#main-content"
          className="focus-visible:bg-interactive focus-visible:text-interactive-text sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:start-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded focus-visible:px-4 focus-visible:py-2"
        >
          Skip to content
        </a>
        <Providers
          cart={cartData.cart ?? undefined}
          analyticsShop={analyticsShop}
          analyticsConsent={analyticsConsent}
          enableTestTap={analyticsDebug}
        >
          <FamilyProvider index={storeIndex}>
            <Header
              navigation={navigation}
              accountUrl={`https://${getStoreDomain()}/account/login`}
            />
            {children}
          </FamilyProvider>
          <Footer />
          {/* Clears the fixed mobile tab bar so the footer's last row is never
              trapped underneath it. */}
          <div aria-hidden="true" className="h-20 md:hidden" />
          <MobileTabBar />
          <CartDrawer />
          <ConsentBanner forceShow={process.env.MOCK_SHOP === "1"} />
          {analyticsDebug ? <AnalyticsDebugOverlay /> : null}
        </Providers>
      </body>
    </html>
  );
}
