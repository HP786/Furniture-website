"use client";

import { CollectionProvider, useCollection } from "@shopify/hydrogen/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, type ReactNode } from "react";

import type { CollectionPageData } from "../lib/collection";
import { shopifyImageUrl, srcSetFor } from "../lib/image";
import { toJsonLd } from "../lib/json-ld";
import { collectionHref, type CollectionRef } from "../lib/navigation";
import { CollectionViewedTracker } from "./AnalyticsTrackers";
import { CollectionBrowseRow } from "./CollectionBrowseRow";
import {
  ActiveFilterChips,
  COLLECTION_SORT_OPTIONS,
  FacetForm,
  FilterDrawer,
  LoadMore,
  Toolbar,
  useLoadMore,
} from "./CollectionBrowse";
import { ProductCard } from "./ProductCard";

const FILTER_DRAWER_ID = "collection-filter-drawer";

/** Where this collection sits in the browse tree — see `lib/taxonomy`. */
type BrowseProps = {
  /** Ancestors, root-first, for the breadcrumb. */
  trail: CollectionRef[];
  /** The step back up, or null at the root of the tree. */
  up: CollectionRef | null;
  /** Children, or at a leaf the rest of the shelf this collection sits on. */
  tiles: CollectionRef[];
  /** True when `tiles` are siblings, so one of them is the current collection. */
  showActive: boolean;
};

/** Home / Shop / every ancestor in the browse tree / this collection. */
function breadcrumbJsonLd(
  collection: CollectionPageData["collection"],
  trail: CollectionRef[],
  origin: string,
) {
  const crumbs = [
    { name: "Home", item: origin },
    { name: "Shop", item: `${origin}/collections` },
    ...trail.map((ancestor) => ({
      name: ancestor.title,
      item: `${origin}/collections/${ancestor.handle}`,
    })),
    { name: collection.title, item: `${origin}/collections/${collection.handle}` },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  };
}

function CollectionHeader({
  collection,
  trail,
  origin,
}: {
  collection: CollectionPageData["collection"];
  trail: CollectionRef[];
  origin: string;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(breadcrumbJsonLd(collection, trail, origin)) }}
      />
      <nav aria-label="Breadcrumb" className="mb-5">
        {/* Wraps rather than scrolls — a deep trail on a phone is still only
            three or four short words, and a hidden crumb is a lost way back. */}
        <ol className="text-sand-600 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
          <li>
            <Link href="/" className="hover:text-on-surface rounded-sm motion-safe:transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href="/collections"
              className="hover:text-on-surface rounded-sm motion-safe:transition-colors"
            >
              Shop
            </Link>
          </li>
          {trail.map((ancestor) => (
            <Fragment key={ancestor.handle}>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={collectionHref(ancestor.handle)}
                  className="hover:text-on-surface rounded-sm motion-safe:transition-colors"
                >
                  {ancestor.title}
                </Link>
              </li>
            </Fragment>
          ))}
          <li aria-hidden="true">/</li>
          <li>
            <span aria-current="page" className="text-on-surface">
              {collection.title}
            </span>
          </li>
        </ol>
      </nav>

      {/* Full-bleed banner. Falls back to the warm gradient ground when the
          collection has no image, so the headline always has a dark backdrop. */}
      <div className="tile-ground relative mb-6 h-[220px] overflow-hidden rounded-lg md:h-[300px]">
        {collection.image ? (
          <img
            src={shopifyImageUrl(collection.image.url, { width: 2000, height: 600, crop: "center" })}
            srcSet={srcSetFor(collection.image.url, { width: 2000, height: 600, crop: "center" })}
            sizes="100vw"
            alt=""
            className="washed h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
            width={2000}
            height={600}
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(43_38_32/0.6),rgb(43_38_32/0.08))]" />
        <div className="px-margin absolute inset-0 flex flex-col justify-center md:px-13">
          <p className="type-overline mb-3 text-[#e2d2bc]">Shop</p>
          <h1 className="font-heading mb-2.5 text-[32px] leading-[1.04] font-light tracking-[-0.025em] text-white md:text-[54px]">
            {collection.title}
          </h1>
          {collection.description ? (
            <p className="m-0 max-w-[520px] text-[14px] text-white/85 md:text-[15.5px]">
              {collection.description}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}

function CollectionContent({
  data,
  trail,
  up,
  tiles,
  showActive,
  children,
}: {
  data: CollectionPageData;
  /** Rendered under the grid. Passed from the server page, so the copy and the
   *  questions down there never reach the browser as a bundle. */
  children?: ReactNode;
} & BrowseProps) {
  const state = useCollection();
  const basePath = `/collections/${data.collection.handle}`;
  const { items, pageInfo, pending, setPending } = useLoadMore({
    initialItems: data.products,
    pageInfo: data.pageInfo,
    dataSearch: data.dataSearch,
  });
  const isLoading = state.status === "loading";

  return (
    <main className="flex-1" id="main-content" tabIndex={-1}>
      <div className="max-w-page px-margin mx-auto w-full py-8 md:py-12">
        <CollectionViewedTracker collection={data.collection} />
        <CollectionHeader collection={data.collection} trail={trail} origin={data.origin} />
        <CollectionBrowseRow
          up={up}
          tiles={tiles}
          activeHandle={data.collection.handle}
          showActive={showActive}
        />

        <div className="lg:grid lg:grid-cols-[250px_1fr] lg:gap-11">
          <aside className="hidden lg:block" aria-label="Filters">
            <div className="sticky top-38">
              <h2 className="type-overline text-walnut-700 mb-3">Filters</h2>
              <FacetForm availableFilters={data.availableFilters} idPrefix="collection-desktop" />
            </div>
          </aside>

          <div className="min-w-0">
            <Toolbar
              countText={`${items.length} ${items.length === 1 ? "piece" : "pieces"}`}
              defaultSortValue={COLLECTION_SORT_OPTIONS[0].value}
              filterDrawerId={FILTER_DRAWER_ID}
            />
            <ActiveFilterChips
              basePath={basePath}
              clearHref={basePath}
              currencyCode={data.currencyCode}
            />

            <h2 className="sr-only">Products</h2>
            {items.length > 0 ? (
              <div className={`px-1 contain-paint ${isLoading ? "opacity-60" : ""}`}>
                <ul
                  id="product-grid"
                  role="list"
                  // A fourth column past 1440px — the measure widens there, and
                  // three cards across a 1440p laptop are oversized.
                  className="grid grid-cols-2 gap-x-5.5 gap-y-6.5 lg:grid-cols-3 min-[90rem]:grid-cols-4"
                  data-testid="product-grid"
                >
                  {items.map((product, index) => (
                    <li key={product.id}>
                      <ProductCard
                        product={product}
                        priority={index < 3}
                        sizes="(min-width: 1024px) 30vw, 50vw"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : isLoading ? (
              <div
                className="border-border bg-surface-secondary rounded-lg border p-8 text-sm"
                data-testid="product-grid"
              >
                Updating products…
              </div>
            ) : (
              <div
                className="border-border bg-surface-secondary rounded-lg border p-8 text-center"
                data-testid="product-grid"
              >
                <p className="type-heading-sm text-on-surface">No products found</p>
                <p className="text-on-surface-secondary mt-2 text-sm">
                  Try clearing filters to see more products.
                </p>
                <Link
                  href={basePath}
                  className="button-outline rounded-button focus-visible:outline-accent min-h-touch-target mt-4 inline-flex items-center justify-center px-4 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  Clear all filters
                </Link>
              </div>
            )}

            <LoadMore
              pageInfo={pageInfo}
              pending={pending}
              setPending={setPending}
              shownCount={items.length}
            />
          </div>
        </div>
      </div>
      {children}
      <FilterDrawer id={FILTER_DRAWER_ID} availableFilters={data.availableFilters} />
    </main>
  );
}

export function CollectionPageClient({
  data,
  trail,
  up,
  tiles,
  showActive,
  children,
}: {
  data: CollectionPageData;
  children?: ReactNode;
} & BrowseProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.toString();

  return (
    <CollectionProvider
      data={{ handle: data.collection.handle, dataSearch: data.dataSearch }}
      urlSearch={urlSearch}
      onChange={(search) => {
        const next = new URLSearchParams(search);
        next.delete("after");
        const query = next.toString();
        const href = query ? `${pathname}?${query}` : pathname;
        if (urlSearch) router.replace(href, { scroll: false });
        else router.push(href, { scroll: false });
        router.refresh();
      }}
    >
      <CollectionContent
        data={data}
        trail={trail}
        up={up}
        tiles={tiles}
        showActive={showActive}
      >
        {children}
      </CollectionContent>
    </CollectionProvider>
  );
}
