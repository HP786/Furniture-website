"use client";

import { CollectionProvider, useCollection } from "@shopify/hydrogen/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { CollectionPageData } from "../lib/collection";
import { shopifyImageUrl, srcSetFor } from "../lib/image";
import { toJsonLd } from "../lib/json-ld";
import { collectionHref, type CollectionRef } from "../lib/navigation";
import { CollectionViewedTracker } from "./AnalyticsTrackers";
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

function breadcrumbJsonLd(collection: CollectionPageData["collection"], origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: origin,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: collection.title,
        item: `${origin}/collections/${collection.handle}`,
      },
    ],
  };
}

function CollectionHeader({
  collection,
  origin,
}: {
  collection: CollectionPageData["collection"];
  origin: string;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(breadcrumbJsonLd(collection, origin)) }}
      />
      <nav aria-label="Breadcrumb" className="mb-5">
        <ol className="text-sand-600 flex items-center gap-2 text-[12.5px]">
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

/** Quick-jump chips across sibling collections. */
function CollectionChips({
  chips,
  activeHandle,
}: {
  chips: CollectionRef[];
  activeHandle: string;
}) {
  if (chips.length === 0) return null;

  return (
    <nav aria-label="Browse collections" className="mb-8">
      <ul role="list" className="flex flex-wrap gap-2.5">
        {chips.map((chip) => {
          const active = chip.handle === activeHandle;
          return (
            <li key={chip.handle}>
              <Link
                href={collectionHref(chip.handle)}
                aria-current={active ? "page" : undefined}
                className={`focus-visible:outline-accent inline-flex items-center rounded-[7px] border px-4.5 py-2.5 text-[13px] font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors ${
                  active
                    ? "border-sand-900 bg-sand-900 text-sand-100"
                    : "border-border text-on-surface hover:bg-surface-secondary"
                }`}
              >
                {chip.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function CollectionContent({ data, chips }: { data: CollectionPageData; chips: CollectionRef[] }) {
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
        <CollectionHeader collection={data.collection} origin={data.origin} />
        <CollectionChips chips={chips} activeHandle={data.collection.handle} />

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
      <FilterDrawer id={FILTER_DRAWER_ID} availableFilters={data.availableFilters} />
    </main>
  );
}

export function CollectionPageClient({
  data,
  chips = [],
}: {
  data: CollectionPageData;
  chips?: CollectionRef[];
}) {
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
      <CollectionContent data={data} chips={chips} />
    </CollectionProvider>
  );
}
