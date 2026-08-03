import { gql, type StorefrontApi } from "@shopify/hydrogen";
import Link from "next/link";

import { CategoryChip, CollectionTile } from "./components/CollectionTile";
import { HomeTabs, type HomeTab } from "./components/HomeTabs";
import { MobileProductPager } from "./components/MobileProductPager";
import { ProductCard } from "./components/ProductCard";
import { PRODUCT_CARD_FRAGMENT, type ProductCardData } from "./lib/product-card-fragment";
import { ProductRail } from "./components/ProductRail";
import { Reveal } from "./components/Reveal";
import { SwatchRequestForm } from "./components/SwatchRequestForm";
import { Icon, ICON_PATHS } from "./components/WalnutMark";
import { countLabel, loadCollectionIndex } from "./lib/collection-index";
import { shopifyImageUrl, srcSetFor } from "./lib/image";
import {
  BRAND_NAME,
  CATEGORY_HANDLES,
  collectionHref,
  CURATED_HANDLES,
  EDITORIAL_CARDS,
  EDITORIAL_IMAGES,
  MARQUEE_PHRASES,
  pickCollections,
  ROOM_HANDLES,
  TRUST_POINTS,
  type CollectionRef,
} from "./lib/navigation";

type EditorialImage = { url: string; altText: string };

export const HOME_QUERY = gql(
  `
    query Home {
      products(first: 12, sortKey: BEST_SELLING) {
        nodes {
          ...ProductCard
        }
      }
    }
  `,
  [PRODUCT_CARD_FRAGMENT],
);

type HomeQuery = StorefrontApi.ResultOf<typeof HOME_QUERY>;

/** Column spans for the five-room mosaic, matching the design's rhythm. */
const ROOM_SPANS = [
  "lg:col-span-5",
  "lg:col-span-4",
  "lg:col-span-3",
  "lg:col-span-6",
  "lg:col-span-6",
];

/**
 * Layout for the six curated tiles in the dark band. The design interleaves a
 * copy block into the mosaic, so spans, heights and order are explicit per
 * position. Height classes are written out in full — Tailwind only sees class
 * names it can read literally in the source, so an interpolated `md:${...}`
 * would never be generated.
 */
const CURATED_LAYOUT = [
  { span: "lg:col-span-7", height: "h-[260px] md:h-[430px]", order: "lg:order-1" },
  { span: "lg:col-span-5", height: "h-[260px] md:h-[430px]", order: "lg:order-2" },
  { span: "lg:col-span-4", height: "h-[260px] md:h-[300px]", order: "lg:order-4" },
  { span: "lg:col-span-4", height: "h-[260px] md:h-[300px]", order: "lg:order-5" },
  { span: "lg:col-span-7", height: "h-[260px] md:h-[360px]", order: "lg:order-6" },
  { span: "lg:col-span-5", height: "h-[260px] md:h-[360px]", order: "lg:order-7" },
];

async function loadHomePage() {
  const [collectionIndex, storefront] = await Promise.all([
    loadCollectionIndex(),
    import("./lib/storefront").then((mod) => mod.getStorefrontClient()),
  ]);
  const { data } = await storefront.graphql(HOME_QUERY);
  const home = data as HomeQuery | null | undefined;

  return {
    products: (home?.products.nodes ?? []) as ProductCardData[],
    index: collectionIndex,
  };
}

function Hero({ collection, image }: { collection: CollectionRef | undefined; image: EditorialImage }) {
  return (
    <section className="relative h-[520px] overflow-hidden md:h-[660px]" aria-labelledby="hero-heading">
      <div className="tile-ground absolute inset-0">
        <img
          src={shopifyImageUrl(image.url, { width: 2000, height: 1320, crop: "center" })}
          srcSet={srcSetFor(image.url, { width: 2000, height: 1320, crop: "center" })}
          sizes="100vw"
          alt=""
          className="washed h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
          width={2000}
          height={1320}
        />
      </div>
      <div className="scrim-hero pointer-events-none absolute inset-0" />

      <div className="max-w-page px-margin relative mx-auto flex h-full flex-col justify-center">
        <div className="max-w-[640px]">
          <p className="type-overline mb-4 text-[#e2d2bc]">Winter 26 · The Quiet Rooms</p>
          <h1
            id="hero-heading"
            className="font-heading mb-5 text-[44px] leading-[1.02] font-light tracking-[-0.025em] text-white text-pretty md:text-[74px]"
          >
            Made to be lived in
          </h1>
          <p className="mb-8 max-w-[470px] text-[16px] leading-relaxed text-white/85 md:text-[17.5px]">
            Solid oak, Australian wool and bouclé you can actually live on. Built slowly, in small
            runs, to be kept.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={collectionHref(collection?.handle ?? "shop-all")}
              className="text-sand-900 focus-visible:outline-accent inline-flex items-center justify-center rounded-[7px] bg-[#fdfbf8] px-7 py-4 text-[15px] no-underline hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors"
            >
              Shop the collection
            </Link>
            <Link
              href={collectionHref("shop-all")}
              className="focus-visible:outline-accent inline-flex items-center justify-center rounded-[7px] border border-white/50 px-7 py-4 text-[15px] text-white no-underline hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors"
            >
              Explore new arrivals
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function BandSection({
  collection,
  image,
  kicker,
  title,
  body,
  cta,
  align = "start",
}: {
  collection: CollectionRef | undefined;
  image: EditorialImage;
  kicker: string;
  title: string;
  body: string;
  cta?: string;
  align?: "start" | "end";
}) {
  return (
    <section
      data-reveal
      className="relative h-[420px] overflow-hidden md:h-[560px]"
      aria-label={title}
    >
      <div className="tile-ground absolute inset-0">
        <img
          src={shopifyImageUrl(image.url, { width: 2000, height: 1120, crop: "center" })}
          srcSet={srcSetFor(image.url, { width: 2000, height: 1120, crop: "center" })}
          sizes="100vw"
          alt=""
          className="washed h-full w-full object-cover"
          loading="lazy"
          width={2000}
          height={1120}
        />
      </div>
      <div
        className={`pointer-events-none absolute inset-0 ${align === "end" ? "scrim-band rotate-180" : "scrim-band"}`}
      />
      <div
        className={`max-w-page px-margin relative mx-auto flex h-full flex-col justify-center ${align === "end" ? "items-end text-right" : ""}`}
      >
        <div className="max-w-[520px]">
          <p className="type-overline mb-4 text-[#e2d2bc]">{kicker}</p>
          <h2 className="font-heading mb-4 text-[34px] leading-[1.02] font-light tracking-[-0.025em] text-white text-pretty md:text-[56px]">
            {title}
          </h2>
          <p className="text-[15px] leading-relaxed text-white/85 md:text-[16.5px]">{body}</p>
          {cta && collection ? (
            <Link
              href={collectionHref(collection.handle)}
              className="focus-visible:outline-accent mt-7 inline-flex items-center justify-center rounded-[7px] border border-white/55 px-7 py-4 text-[14.5px] text-white no-underline hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors"
            >
              {cta}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const { products, index } = await loadHomePage();
  const { byHandle } = index;

  const rooms = pickCollections(byHandle, ROOM_HANDLES);
  const curated = pickCollections(byHandle, CURATED_HANDLES);
  const categories = pickCollections(byHandle, CATEGORY_HANDLES);
  const heroCollection = byHandle.get("long-afternoons") ?? byHandle.get("shop-all");
  const bandCollection = byHandle.get("warm-timber") ?? heroCollection;
  const visitCollection = byHandle.get("soft-texture") ?? heroCollection;

  // The journal cards each want their own shot; where a dedicated editorial
  // photo reads better than the collection's own image, it is keyed here.
  const editorialImageOverrides: Record<string, EditorialImage> = {
    "warm-timber": EDITORIAL_IMAGES.hero,
    "pale-and-quiet": EDITORIAL_IMAGES.editorialColour,
  };

  // The three browse sections, now panels of one tabbed block. Each is dropped
  // if it has nothing to show, so an empty tab is never offered. Order matters:
  // the first entry is the tab that opens by default.
  const browseTabs: HomeTab[] = [];

  if (rooms.length > 0) {
    browseTabs.push({
      id: "rooms",
      label: "Shop by room",
      panel: (
        <>
          {/* Mobile: every room fits on screen at once — a two-column mosaic
              with the first tile spanning the full width, as in the design. No
              horizontal scrolling to reach the rest. */}
          <div className="px-margin md:hidden">
            <ul role="list" className="grid grid-cols-2 gap-3">
              {rooms.map((room, roomIndex) => (
                <li
                  key={`m-room-${room.handle}`}
                  className={roomIndex === 0 ? "col-span-2" : undefined}
                >
                  <CollectionTile
                    collection={room}
                    heightClass={roomIndex === 0 ? "h-[190px]" : "h-[150px]"}
                    sizes={roomIndex === 0 ? "100vw" : "50vw"}
                  />
                </li>
              ))}
            </ul>
            <div className="mt-7 flex justify-center">
              <Link
                href="/collections"
                className="text-walnut-700 focus-visible:outline-accent inline-flex items-center gap-2 text-[13px] tracking-[0.1em] uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                View all rooms
                <Icon d={ICON_PATHS.arrowRight} size={16} />
              </Link>
            </div>
          </div>

          <div className="max-w-page px-margin mx-auto hidden md:block">
            <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
              {rooms.map((room, roomIndex) => (
                <li key={room.handle} className={ROOM_SPANS[roomIndex] ?? "lg:col-span-4"}>
                  <CollectionTile
                    collection={room}
                    heightClass="h-[320px] md:h-[460px]"
                    sizes="(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 100vw"
                  />
                </li>
              ))}
            </ul>
            <div className="mt-9 flex justify-center">
              <Link
                href="/collections"
                className="text-walnut-700 focus-visible:outline-accent inline-flex items-center gap-2 text-[13px] tracking-[0.1em] uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                View all rooms
                <Icon d={ICON_PATHS.arrowRight} size={16} />
              </Link>
            </div>
          </div>
        </>
      ),
    });
  }

  if (categories.length > 0) {
    browseTabs.push({
      id: "categories",
      label: "Popular categories",
      panel: (
        <div className="max-w-page px-margin mx-auto">
          <ul
            role="list"
            className="grid grid-cols-3 gap-x-6 gap-y-8 md:grid-cols-5 lg:gap-x-6 lg:gap-y-8"
          >
            {categories.map((category) => (
              <li key={`cat-${category.handle}`}>
                <CategoryChip collection={category} />
              </li>
            ))}
          </ul>
          <div className="mt-9 flex justify-center">
            <Link
              href="/collections"
              className="text-walnut-700 focus-visible:outline-accent inline-flex items-center gap-2 text-[13px] tracking-[0.1em] uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              View all categories
              <Icon d={ICON_PATHS.arrowRight} size={16} />
            </Link>
          </div>
        </div>
      ),
    });
  }

  if (products.length > 0) {
    // Mobile shows four at a time, so chunk the run into pages of four.
    const productPages: ProductCardData[][] = [];
    for (let index = 0; index < products.length; index += 4) {
      productPages.push(products.slice(index, index + 4));
    }

    browseTabs.push({
      id: "trending",
      label: "Trending pieces",
      panel: (
        <>
          <div className="md:hidden">
            <MobileProductPager
              label="Trending pieces"
              pages={productPages.map((page, pageIndex) => (
                <ul key={pageIndex} role="list" className="grid grid-cols-2 gap-x-4 gap-y-7">
                  {page.map((product, productIndex) => (
                    <li key={product.id}>
                      <ProductCard
                        product={product}
                        priority={pageIndex === 0 && productIndex < 2}
                        sizes="50vw"
                        aspectClass="aspect-square"
                      />
                    </li>
                  ))}
                </ul>
              ))}
            />
            <div className="mt-7 flex justify-center">
              <Link
                href={collectionHref("shop-all")}
                className="text-walnut-700 focus-visible:outline-accent inline-flex items-center gap-2 text-[13px] tracking-[0.1em] uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                View all
                <Icon d={ICON_PATHS.arrowRight} size={16} />
              </Link>
            </div>
          </div>

          <div className="hidden md:block">
            <ProductRail
              title="Trending pieces"
              headingHidden
              viewAllHref={collectionHref("shop-all")}
              viewAllLabel="View all"
            >
              {products.map((product, productIndex) => (
                <li key={product.id} className="w-[308px] shrink-0">
                  <ProductCard product={product} priority={productIndex < 2} sizes="308px" />
                </li>
              ))}
            </ProductRail>
          </div>
        </>
      ),
    });
  }

  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <Reveal />

      <Hero collection={heroCollection} image={EDITORIAL_IMAGES.hero} />

      {/* Trust bar. Three static columns from md; below that the points would
          stack into a tall block, so they loop as a marquee instead. */}
      <section className="border-border border-b bg-[#f4ecdd]" aria-label={`Why shop with ${BRAND_NAME}`}>
        <div className="overflow-hidden py-4 md:hidden">
          <div className="marquee-track-slow" aria-hidden="true">
            {[0, 1].map((half) => (
              <div key={half} className="flex">
                {TRUST_POINTS.map((point) => (
                  <span
                    key={`${half}-${point.label}`}
                    className="flex shrink-0 items-center gap-3 px-6"
                  >
                    <Icon
                      d={point.d}
                      size={18}
                      className={`text-walnut-700 shrink-0 ${point.flip ? "-scale-x-100" : ""}`}
                    />
                    <span className="text-sand-700 whitespace-nowrap text-[11px] tracking-[0.13em] uppercase">
                      {point.label}
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
          {/* The loop duplicates its items, so the readable copy is offered
              once here rather than twice through the marquee. */}
          <ul role="list" className="sr-only">
            {TRUST_POINTS.map((point) => (
              <li key={point.label}>{point.label}</li>
            ))}
          </ul>
        </div>

        <ul role="list" className="max-w-page px-margin mx-auto hidden gap-5 py-6 md:grid md:grid-cols-3">
          {TRUST_POINTS.map((point) => (
            <li key={point.label} className="flex items-center justify-center gap-3.5">
              <Icon
                d={point.d}
                size={20}
                className={`text-walnut-700 shrink-0 ${point.flip ? "-scale-x-100" : ""}`}
              />
              <span className="text-sand-700 text-[12px] tracking-[0.13em] uppercase">
                {point.label}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* One tabbed browser instead of three stacked sections, so the range is
          reachable without scrolling past it. */}
      {browseTabs.length > 0 ? <HomeTabs tabs={browseTabs} /> : null}

      <div className="mt-20 md:mt-25">
        <BandSection
          collection={bandCollection}
          image={EDITORIAL_IMAGES.bandLook}
          kicker="The Walnur look"
          title="Natural textures, relaxed rooms"
          body="Oak, wool, jute and linen — pieces designed for the way Australians actually live, and styled here in a Federation cottage in Northcote."
          cta="Shop the look"
        />
      </div>

      <div className="mt-20 md:mt-24">
        <BandSection
          collection={visitCollection}
          image={EDITORIAL_IMAGES.bandVisit}
          kicker="Visit us"
          title="See it, sit in it, take a sample home"
          body="Every fabric and finish is on the floor in Melbourne — and our team will pull swatches for you to borrow."
          align="end"
        />
      </div>

      {/* Shop by collection — dark band */}
      {curated.length > 0 ? (
        <section className="bg-walnut-900" aria-labelledby="collections-heading">
          <div className="max-w-page px-margin mx-auto py-16 md:py-22">
            <div data-reveal>
              <div className="mb-8 flex items-end justify-between gap-6">
                <h2 id="collections-heading" className="type-display m-0 text-[#f6efe6]">
                  Shop by collection
                </h2>
                <Link
                  href="/collections"
                  className="text-walnut-300 focus-visible:outline-accent inline-flex shrink-0 items-center gap-2 text-[13px] tracking-[0.1em] uppercase no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  All collections
                  <Icon d={ICON_PATHS.arrowRight} size={16} />
                </Link>
              </div>

              {/* Mobile: the design runs these as a horizontal carousel. */}
              <div className="md:hidden">
                <ProductRail title="Shop by collection" autoScroll>
                  {curated.map((collection) => (
                    <li key={`m-${collection.handle}`} className="w-[168px] shrink-0">
                      <CollectionTile
                        collection={collection}
                        heightClass="h-[200px]"
                        sizes="168px"
                      />
                    </li>
                  ))}
                </ProductRail>
              </div>

              <div className="hidden gap-5 md:grid md:grid-cols-2 lg:grid-cols-12">
                <div className="flex flex-col justify-center pe-0 lg:order-3 lg:col-span-4 lg:pe-8">
                  <p className="font-heading mb-3 text-[26px] leading-[1.1] font-light tracking-[-0.02em] text-[#f6efe6] text-pretty md:text-[30px]">
                    Six ways into the range
                  </p>
                  <p className="mb-5 text-[14.5px] leading-relaxed text-[#f6efe6]/65">
                    We group pieces the way people actually shop — by the feeling of a room, the hand
                    of a fabric, the grain of a timber. Start anywhere.
                  </p>
                  <Link
                    href={collectionHref("shop-all")}
                    className="text-walnut-300 focus-visible:outline-accent inline-flex items-center gap-2 text-[12.5px] tracking-[0.1em] uppercase no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    Browse everything
                    <Icon d={ICON_PATHS.arrowRight} size={15} />
                  </Link>
                </div>

                {curated.map((collection, curatedIndex) => {
                  const layout = CURATED_LAYOUT[curatedIndex] ?? CURATED_LAYOUT[2];
                  return (
                    <div
                      key={collection.handle}
                      className={`${layout.span} ${layout.order}`}
                    >
                      <CollectionTile
                        collection={collection}
                        heightClass={layout.height}
                        sizes="(min-width: 1024px) 50vw, 100vw"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Marquee — two identical halves so the -50% loop lands on the seam. */}
      <section className="bg-sand-900 text-sand-200 overflow-hidden py-5.5" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((half) => (
            <div key={half} className="flex">
              {MARQUEE_PHRASES.map((phrase) => (
                <span
                  key={`${half}-${phrase}`}
                  className="font-heading flex items-center gap-6.5 px-6.5 text-[20px] font-light opacity-95 md:text-[25px]"
                >
                  {phrase}
                  <span className="bg-walnut-400 block size-[7px] rounded-full" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Editorial pair */}
      <section className="grid md:grid-cols-2" aria-label="From the journal">
        {EDITORIAL_CARDS.flatMap((card) => {
          const collection = byHandle.get(card.handle);
          if (!collection) return [];
          const image = editorialImageOverrides[card.handle] ?? collection.image;
          return [
            <Link
              key={card.handle}
              href={collectionHref(collection.handle)}
              data-reveal
              className="group text-on-surface block no-underline"
            >
              <div className="tile-ground relative h-[320px] overflow-hidden md:h-[520px]">
                {image ? (
                  <img
                    src={shopifyImageUrl(image.url, {
                      width: 1200,
                      height: 1040,
                      crop: "center",
                    })}
                    srcSet={srcSetFor(image.url, {
                      width: 1200,
                      height: 1040,
                      crop: "center",
                    })}
                    sizes="(min-width: 768px) 50vw, 100vw"
                    alt=""
                    className="washed h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-1000 motion-safe:group-hover:scale-105"
                    loading="lazy"
                    width={1200}
                    height={1040}
                  />
                ) : null}
              </div>
              <div className="px-margin flex items-start justify-between gap-5 pt-6">
                <div>
                  <p className="type-overline text-walnut-700 mb-2">{card.kicker}</p>
                  <p className="font-heading max-w-[420px] text-[24px] leading-[1.08] font-light md:text-[30px]">
                    {card.title}
                  </p>
                  <p className="text-sand-700 mt-2.5 max-w-[430px] text-[14.5px] text-pretty">
                    {card.body}
                  </p>
                </div>
                <span className="border-border text-on-surface group-hover:bg-interactive group-hover:text-interactive-text grid size-[52px] shrink-0 place-items-center rounded-[7px] border motion-safe:transition-[transform,background-color,color] motion-safe:duration-500 motion-safe:group-hover:translate-x-1">
                  <Icon d={ICON_PATHS.arrowRight} size={19} />
                </span>
              </div>
            </Link>,
          ];
        })}
      </section>

      {/* Swatch request */}
      <section className="mt-16 md:mt-20" aria-labelledby="swatch-heading">
        <div
          data-reveal
          className="bg-walnut-200 relative grid items-center gap-10 overflow-hidden px-[var(--spacing-margin)] py-16 md:py-22 lg:grid-cols-[1.1fr_1fr]"
        >
          <div className="bg-walnut-300 pointer-events-none absolute -end-[90px] -bottom-[130px] size-[340px] rounded-full opacity-65" />
          <div className="relative">
            <h2 id="swatch-heading" className="type-display mb-3.5 max-w-[470px]">
              Take the room home before you buy it
            </h2>
            <p className="text-walnut-800 m-0 max-w-[450px] text-[16px]">
              Order up to six fabric and timber swatches, free. We send them in a linen wallet so you
              can live with them for a week.
            </p>
          </div>
          <SwatchRequestForm />
        </div>
      </section>

      {/* Collection counts are surfaced for screen readers as a text summary so
          the mosaic's hover-revealed counts are not the only way to get them. */}
      <p className="sr-only">
        {rooms
          .map((room) => `${room.title}: ${countLabel(room.productCount)}`)
          .join(". ")}
      </p>
    </main>
  );
}
