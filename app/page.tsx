import { gql, type StorefrontApi } from "@shopify/hydrogen";
import Link from "next/link";

import { CategoryTile, CircleChip } from "./components/CollectionTile";
import { HomeTabs, type HomeTab } from "./components/HomeTabs";
import { InstagramPanel, type InstagramPost } from "./components/InstagramPanel";
import { MobileProductPager } from "./components/MobileProductPager";
import { ProductCard } from "./components/ProductCard";
import { PRODUCT_CARD_FRAGMENT, type ProductCardData } from "./lib/product-card-fragment";
import { ProductRail } from "./components/ProductRail";
import { Reveal } from "./components/Reveal";
import { SwatchRequestForm } from "./components/SwatchRequestForm";
import { Arrow, Icon } from "./components/WalnutMark";
import { loadCollectionIndex } from "./lib/collection-index";
import { shopifyImageUrl, srcSetFor } from "./lib/image";
import {
  BRAND_NAME,
  CATEGORY_HANDLES,
  CATEGORY_TILE_SOURCES,
  collectionHref,
  EDITORIAL_IMAGES,
  INSTAGRAM_POSTS,
  MARQUEE_PHRASES,
  pickCollections,
  ROOM_HANDLES,
  TRUST_POINTS,
  type CollectionRef,
} from "./lib/navigation";
import { pieceKey } from "./lib/product-family";
import { ROOMS, type Room } from "./lib/rooms";
import { swatchBrightness, typeFromTags } from "./lib/swatches";

type EditorialImage = { url: string; altText: string };

/** How many cards the trending rail ends up carrying. */
const TRENDING_COUNT = 18;

/** How many cards the new-arrivals rail carries. */
const NEW_ARRIVAL_COUNT = 12;

/** Below this perceived brightness a finish counts as deep — smoke oak, walnut,
 *  tan, clay and sangria clear it; oak, pine and the pale bouclés do not. */
const DARK_FINISH = 0.72;

/**
 * Trending is read a room at a time rather than as one best-selling run, so the
 * rail carries every space rather than whichever one outsells the others — the
 * badge on each card says which. One aliased field per room in `ROOMS`, written
 * out because the query is typed from the document itself.
 *
 * Each room is over-fetched: most of what comes back is the same few pieces in
 * different finishes, and only one listing of each piece makes the rail.
 */
export const HOME_QUERY = gql(
  `
    query Home {
      livingRoom: collection(handle: "living-room-1") {
        products(first: 40, sortKey: BEST_SELLING) {
          nodes {
            ...ProductCard
          }
        }
      }
      diningRoom: collection(handle: "dining-room-1") {
        products(first: 40, sortKey: BEST_SELLING) {
          nodes {
            ...ProductCard
          }
        }
      }
      bedroom: collection(handle: "bedroom-1") {
        products(first: 40, sortKey: BEST_SELLING) {
          nodes {
            ...ProductCard
          }
        }
      }
      outdoor: collection(handle: "outdoor") {
        products(first: 40, sortKey: BEST_SELLING) {
          nodes {
            ...ProductCard
          }
        }
      }
      bathroom: collection(handle: "bathroom") {
        products(first: 40, sortKey: BEST_SELLING) {
          nodes {
            ...ProductCard
          }
        }
      }
      # Newest first, and the same run doubles as the pool the category tiles
      # take their photography from.
      catalogue: products(first: 60, sortKey: CREATED_AT, reverse: true) {
        nodes {
          ...ProductCard
        }
      }
    }
  `,
  [PRODUCT_CARD_FRAGMENT],
);

type HomeQuery = StorefrontApi.ResultOf<typeof HOME_QUERY>;

/** A room and the pieces it contributes to the trending rail. */
type RoomGroup = { room: Room; products: ProductCardData[] };

/**
 * Round-robin: the first of every list, then the second, and so on, stopping at
 * `limit`. Lists that run out early drop away and the rest keep dealing.
 */
function deal(lists: ProductCardData[][], limit: number) {
  const dealt: ProductCardData[] = [];
  const depth = Math.max(0, ...lists.map((list) => list.length));
  for (let slot = 0; slot < depth && dealt.length < limit; slot += 1) {
    for (const list of lists) {
      if (dealt.length >= limit) break;
      const product = list[slot];
      if (product) dealt.push(product);
    }
  }
  return dealt;
}

/** How many each list contributes: one apiece per round, so a short list is
 *  never squeezed out by a long one. */
function quotas(lists: ProductCardData[][], limit: number) {
  const taken = lists.map(() => 0);
  const available = lists.reduce((sum, list) => sum + list.length, 0);
  let remaining = Math.min(limit, available);

  while (remaining > 0) {
    for (let index = 0; index < lists.length && remaining > 0; index += 1) {
      if (taken[index] >= lists[index].length) continue;
      taken[index] += 1;
      remaining -= 1;
    }
  }
  return taken;
}

/**
 * Merge the rooms so the scarce ones are spaced along the rail rather than used
 * up in the opening cards — dealing them in turn would put the store's one
 * dining piece third and leave a long tail of nothing but the living room.
 *
 * Each room's picks are laid on a 0–1 track at even intervals and the tracks
 * are merged, so a room contributing three pieces surfaces about every third of
 * the way along however many the others contribute.
 */
function weave(lists: ProductCardData[][], limit: number) {
  const taken = quotas(lists, limit);

  const placed = lists.flatMap((list, listIndex) =>
    list.slice(0, taken[listIndex]).map((product, index) => ({
      product,
      listIndex,
      at: (index + 0.5) / taken[listIndex],
    })),
  );
  placed.sort((a, b) => a.at - b.at || a.listIndex - b.listIndex);

  return placed.map((entry) => entry.product);
}

/** At or below this many products, a room shows everything it has. */
const SMALL_ROOM = 6;

/**
 * One listing per piece, ordered so consecutive cards are different kinds of
 * thing — otherwise best-selling order hands back every colourway of one side
 * table, then every colourway of the next. `seen` is shared across rooms so a
 * piece listed in two of them is still only offered once.
 *
 * A room with only a handful of products skips the collapsing: there, the
 * different sizes and finishes are all the room has, and folding them together
 * would leave it with one card.
 */
function variedOrder(products: ProductCardData[], seen: Set<string>) {
  const byType = new Map<string, ProductCardData[]>();
  const collapse = products.length > SMALL_ROOM;

  for (const product of products) {
    const tags = product.tags ?? [];
    const key = collapse ? pieceKey(product.title, tags) : product.id;
    if (seen.has(key)) continue;
    seen.add(key);

    const type = typeFromTags(tags) ?? "other";
    const bucket = byType.get(type);
    if (bucket) bucket.push(product);
    else byType.set(type, [product]);
  }

  return deal([...byType.values()], Number.POSITIVE_INFINITY);
}

async function loadHomePage() {
  const [collectionIndex, storefront] = await Promise.all([
    loadCollectionIndex(),
    import("./lib/storefront").then((mod) => mod.getStorefrontClient()),
  ]);
  const { data } = await storefront.graphql(HOME_QUERY);
  const home = data as HomeQuery | null | undefined;

  // Paired by hand rather than by index: the aliases are spelled out in the
  // query, so this is the one place the two lists have to agree. A room with
  // nothing in it yet is dropped, so the block never shows an empty row.
  const roomGroups: RoomGroup[] = [
    { slug: "livingroom", nodes: home?.livingRoom?.products.nodes },
    { slug: "diningroom", nodes: home?.diningRoom?.products.nodes },
    { slug: "bedroom", nodes: home?.bedroom?.products.nodes },
    { slug: "outdoor", nodes: home?.outdoor?.products.nodes },
    { slug: "bathroom", nodes: home?.bathroom?.products.nodes },
  ].flatMap(({ slug, nodes }) => {
    const room = ROOMS.find((candidate) => candidate.slug === slug);
    const products = (nodes ?? []) as ProductCardData[];
    if (!room || products.length === 0) return [];
    return [{ room, products }];
  });

  // Woven rather than concatenated, so the badges keep changing the whole way
  // along the rail instead of the smaller rooms being spent in the first cards.
  const seen = new Set<string>();
  const trending = weave(
    roomGroups.map((group) => variedOrder(group.products, seen)),
    TRENDING_COUNT,
  );

  // Newest listed first, with the same collapsing so the rail is not four Cove
  // side tables in four finishes. Deep finishes lead: the rail sits on the brown
  // ground, where a chalk bouclé on a paper-white product shot washes out.
  // Paler pieces top the rail up if the dark ones do not fill it.
  const arrivals = (home?.catalogue.nodes ?? []) as ProductCardData[];
  const darkest = [...arrivals].sort(
    (a, b) => (swatchBrightness(a.tags ?? []) ?? 1) - (swatchBrightness(b.tags ?? []) ?? 1),
  );
  const finishSeen = new Set<string>();
  const deep = darkest.filter((product) => (swatchBrightness(product.tags ?? []) ?? 1) < DARK_FINISH);
  const newArrivals = [
    ...variedOrder(deep, finishSeen),
    ...variedOrder(darkest, finishSeen),
  ].slice(0, NEW_ARRIVAL_COUNT);

  // Category tiles get a styled shot rather than the collection's own cut-out.
  // Anything that cannot be resolved is simply left out, and the tile falls
  // back to the collection image.
  const categoryImages: Record<string, CollectionRef["image"]> = {};

  for (const [handle, source] of Object.entries(CATEGORY_TILE_SOURCES)) {
    if ("collection" in source) {
      const borrowed = collectionIndex.byHandle.get(source.collection)?.image;
      if (borrowed) categoryImages[handle] = borrowed;
      continue;
    }
    if ("editorial" in source) {
      categoryImages[handle] = EDITORIAL_IMAGES[source.editorial];
      continue;
    }
    if ("file" in source) {
      // The tile renders its image as decorative — the collection name sits
      // directly beneath it as the link — so there is no alt text to carry.
      categoryImages[handle] = { url: source.file, altText: null };
      continue;
    }
    for (const product of arrivals) {
      const styled = product.images.nodes.find((image) => image.url.includes(source.photo));
      if (!styled) continue;
      categoryImages[handle] = { url: styled.url, altText: styled.altText ?? null };
      break;
    }
  }

  return { trending, newArrivals, categoryImages, index: collectionIndex };
}

function Hero({ collection, image }: { collection: CollectionRef | undefined; image: EditorialImage }) {
  return (
    <section
      // Fills what is left of the first screen under the sticky header, so the
      // page opens on the photograph and nothing else.
      className="relative flex min-h-[calc(100svh-var(--header-h))] flex-col overflow-hidden"
      aria-labelledby="hero-heading"
    >
      <div className="tile-ground absolute inset-0">
        {/* Requested at full frame rather than a fixed crop: the box is now
            viewport-shaped, so `object-position` does the framing — held low
            enough that the sofa, table and chairs stay in shot at every width. */}
        <img
          src={shopifyImageUrl(image.url, { width: 2000 })}
          srcSet={srcSetFor(image.url, { width: 2000 })}
          sizes="100vw"
          alt=""
          className="washed h-full w-full object-cover object-[50%_82%] md:object-[50%_72%]"
          loading="eager"
          fetchPriority="high"
          width={2000}
          height={1245}
        />
      </div>
      <div className="scrim-hero pointer-events-none absolute inset-0" />

      <div className="max-w-page px-margin relative mx-auto flex w-full flex-1 flex-col justify-center py-20">
        <div className="max-w-[640px]">
          <p className="type-overline mb-4 text-[#e2d2bc]">Winter 26 · The Quiet Rooms</p>
          <h1
            id="hero-heading"
            className="font-heading mb-5 text-[38px] leading-[1.02] font-light tracking-[-0.025em] text-white text-pretty md:text-[74px]"
          >
            Made to be lived in
          </h1>
          <p className="mb-8 max-w-[470px] text-[15px] leading-relaxed text-white/85 md:text-[17.5px]">
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

type BandCopy = {
  kicker: string;
  title: string;
  body: string;
  cta?: { label: string; href: string };
};

function BandCopyBlock({ copy }: { copy: BandCopy }) {
  return (
    <div className="max-w-[460px]">
      <p className="type-overline mb-3.5 text-[#e2d2bc]">{copy.kicker}</p>
      <h2 className="font-heading mb-3 text-[24px] leading-[1.06] font-light tracking-[-0.025em] text-white text-pretty md:mb-3.5 md:text-[42px] md:leading-[1.04]">
        {copy.title}
      </h2>
      <p className="text-[14px] leading-relaxed text-white/85 md:text-[16px]">{copy.body}</p>
      {copy.cta ? (
        <Link
          href={copy.cta.href}
          className="focus-visible:outline-accent mt-6 inline-flex items-center justify-center rounded-[7px] border border-white/55 px-7 py-3.5 text-[14.5px] text-white no-underline hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors"
        >
          {copy.cta.label}
        </Link>
      ) : null}
    </div>
  );
}

/**
 * A photograph across the full width carrying one message, set against the left
 * edge. It runs between two brown sections as a break, so the scrim is weighted
 * the same way the bands are and the copy still clears AA over the picture.
 */
function MessageBand({ image, copy }: { image: EditorialImage; copy: BandCopy }) {
  return (
    <section data-reveal className="relative overflow-hidden" aria-label={copy.title}>
      <div className="tile-ground absolute inset-0">
        <img
          src={shopifyImageUrl(image.url, { width: 2400 })}
          srcSet={srcSetFor(image.url, { width: 2400 })}
          sizes="100vw"
          alt=""
          className="washed h-full w-full object-cover object-[50%_55%]"
          loading="lazy"
          width={2400}
          height={1500}
        />
      </div>
      <div className="scrim-band pointer-events-none absolute inset-0" />

      <div className="max-w-page px-margin relative mx-auto py-20 md:py-32">
        <BandCopyBlock copy={copy} />
      </div>
    </section>
  );
}

/**
 * One photograph beside one message, both given half the measure. Copy sits on
 * the page's own surface rather than over the picture, so the type can be as
 * large as the photograph without fighting it for contrast.
 */
function SplitFeature({
  image,
  copy,
  imageFirst = false,
  tone = "light",
  objectPosition = "object-[50%_45%]",
}: {
  image: EditorialImage;
  copy: BandCopy;
  /** Puts the photograph on the left. Off by default, so the eye meets the
   *  words first and the two features on the page do not mirror each other. */
  imageFirst?: boolean;
  /** `dark` gives the whole band the brown ground and light type. */
  tone?: "light" | "dark";
  /** Where a tall photograph is held as the box crops it. Written as a whole
   *  class at the call site — Tailwind only generates what it can read. */
  objectPosition?: string;
}) {
  const dark = tone === "dark";

  return (
    <section data-reveal aria-label={copy.title} className={dark ? "bg-walnut-900" : ""}>
      <div
        // The dark band paints its own ground, so it carries the space top and
        // bottom. On the light ground the section above already supplies the
        // gap overhead; this only has to close the one underneath, or the
        // photograph runs straight into whatever follows.
        className={`max-w-page px-margin mx-auto grid items-center gap-9 md:grid-cols-2 md:gap-14 lg:gap-20 ${
          dark ? "py-14 md:py-24" : "pb-16 md:pb-24"
        }`}
      >
        <div
          className={`tile-ground relative h-[360px] overflow-hidden rounded-lg md:h-[640px] min-[90rem]:h-[720px] ${
            imageFirst ? "" : "md:order-2"
          }`}
        >
          <img
            src={shopifyImageUrl(image.url, { width: 1600 })}
            srcSet={srcSetFor(image.url, { width: 1600 })}
            sizes="(min-width: 768px) 50vw, 100vw"
            alt={image.altText}
            className={`washed h-full w-full object-cover ${objectPosition}`}
            loading="lazy"
            width={1600}
            height={1066}
          />
        </div>

        <div className="max-w-[540px]">
          <p className={`type-overline mb-4 ${dark ? "text-[#e2d2bc]" : "text-walnut-700"}`}>
            {copy.kicker}
          </p>
          <h2
            className={`font-heading mb-4 text-[30px] leading-[1.04] font-light tracking-[-0.025em] text-pretty md:mb-5 md:text-[48px] ${
              dark ? "text-[#f6efe6]" : ""
            }`}
          >
            {copy.title}
          </h2>
          <p
            className={`text-[15px] leading-relaxed md:text-[17.5px] ${
              dark ? "text-[#f6efe6]/75" : "text-sand-700"
            }`}
          >
            {copy.body}
          </p>
          {copy.cta ? (
            <Link
              href={copy.cta.href}
              className={`focus-visible:outline-accent mt-8 inline-flex items-center justify-center rounded-[7px] px-8 py-4 text-[14.5px] no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors ${
                dark
                  ? "text-sand-900 bg-[#fdfbf8] hover:bg-white"
                  : "button-primary"
              }`}
            >
              {copy.cta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const { trending, newArrivals, categoryImages, index } = await loadHomePage();
  const { byHandle } = index;

  const rooms = pickCollections(byHandle, ROOM_HANDLES);
  const categories = pickCollections(byHandle, CATEGORY_HANDLES);
  const heroCollection = byHandle.get("long-afternoons") ?? byHandle.get("shop-all");
  const bandCollection = byHandle.get("warm-timber") ?? heroCollection;

  // A post is dropped if its collection is missing, so the grid never shows a
  // tile that leads nowhere.
  const instagramPosts: InstagramPost[] = INSTAGRAM_POSTS.flatMap((post) => {
    const collection = byHandle.get(post.handle);
    if (!collection) return [];
    return [
      {
        href: collectionHref(collection.handle),
        caption: post.caption,
        image: "image" in post ? post.image : collection.image,
      },
    ];
  });

  // The two browse sections, panels of one tabbed block. Each is dropped if it
  // has nothing to show, so an empty tab is never offered. Order matters: the
  // first entry is the tab that opens by default.
  const browseTabs: HomeTab[] = [];

  if (categories.length > 0) {
    browseTabs.push({
      id: "categories",
      label: "All categories",
      heading: "Shop by category",
      panel: (
        <div className="max-w-page px-margin mx-auto">
          {/* Two across on a phone, five from `md` — ten categories land as two
              even rows rather than a ragged mosaic. */}
          <ul
            role="list"
            className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-5 md:gap-x-6 md:gap-y-10"
          >
            {categories.map((category, categoryIndex) => (
              <li key={`cat-${category.handle}`}>
                <CategoryTile
                  collection={{
                    ...category,
                    image: categoryImages[category.handle] ?? category.image,
                  }}
                  priority={categoryIndex < 5}
                />
              </li>
            ))}
          </ul>
          <div className="mt-9 flex justify-center">
            <Link
              href="/collections"
              className="text-walnut-700 focus-visible:outline-accent inline-flex items-center gap-2 text-[13px] tracking-[0.1em] uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              View all categories
              <Arrow size={16} />
            </Link>
          </div>
        </div>
      ),
    });
  }

  if (trending.length > 0) {
    // Mobile shows four at a time, so chunk the run into pages of four.
    const productPages: ProductCardData[][] = [];
    for (let index = 0; index < trending.length; index += 4) {
      productPages.push(trending.slice(index, index + 4));
    }

    browseTabs.push({
      id: "trending",
      label: "Trending pieces",
      heading: "Trending pieces",
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
                <Arrow size={16} />
              </Link>
            </div>
          </div>

          <div className="hidden md:block">
            {/* No "view all" beside the arrows — it crowded them. The link
                sits under the rail instead. */}
            <ProductRail title="Trending pieces" headingHidden>
              {trending.map((product, productIndex) => (
                <li key={product.id} className="w-[308px] shrink-0">
                  <ProductCard product={product} priority={productIndex < 2} sizes="308px" />
                </li>
              ))}
            </ProductRail>
            <div className="mt-9 flex justify-center">
              <Link
                href={collectionHref("shop-all")}
                className="text-walnut-700 focus-visible:outline-accent inline-flex items-center gap-2 text-[13px] tracking-[0.1em] uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                View all pieces
                <Arrow size={16} />
              </Link>
            </div>
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

      {/* New arrivals — newest listed first, straight after the browse block. */}
      {newArrivals.length > 0 ? (
        <section
          data-reveal
          className="py-16 md:py-24"
          aria-label="New arrivals"
        >
          <ProductRail title="New arrivals">
            {newArrivals.map((product, productIndex) => (
              <li key={product.id} className="w-[62vw] shrink-0 sm:w-[308px]">
                <ProductCard
                  product={product}
                  priority={productIndex < 2}
                  sizes="(min-width: 640px) 308px, 62vw"
                />
              </li>
            ))}
          </ProductRail>
          <div className="mt-9 flex justify-center">
            <Link
              href={collectionHref("shop-all")}
              className="text-walnut-700 focus-visible:outline-accent inline-flex items-center gap-2 text-[13px] tracking-[0.1em] uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              View all pieces
              <Arrow size={16} />
            </Link>
          </div>
        </section>
      ) : null}

      <div>
        <SplitFeature
          image={EDITORIAL_IMAGES.bandLook}
          objectPosition="object-[50%_62%]"
          copy={{
            kicker: "The Walnur look",
            title: "Natural textures, relaxed rooms",
            body: "Oak, wool, jute and linen — pieces designed for the way Australians actually live, and styled here in a Federation cottage in Northcote.",
            cta: bandCollection
              ? { label: "Shop the look", href: collectionHref(bandCollection.handle) }
              : undefined,
          }}
        />
      </div>

      {/* A photograph between the two brown sections, so the run of them does
          not read as one long band. */}
      <MessageBand
        image={EDITORIAL_IMAGES.editorialColour}
        copy={{
          kicker: "Winter 26 · The palette",
          title: "Terracotta, chalk and clay",
          body: "The season's colours, worked into wool rugs, bouclé and cast stone — warm enough to carry a room through a Melbourne winter.",
          cta: { label: "Shop the palette", href: collectionHref("pale-and-quiet") },
        }}
      />

      {/* Shop by room — the five spaces on the brown ground, as circle chips.
          The room photographs are scenes, so they hold up cropped to a circle
          where a product cut-out would not. */}
      {rooms.length > 0 ? (
        <section className="bg-walnut-900" aria-labelledby="rooms-heading">
          <div className="max-w-page px-margin mx-auto py-14 md:py-22">
            <div data-reveal>
              {/* Stacked on mobile — side by side the heading wraps and the link
                  gets squeezed against it. */}
              <div className="mb-9 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8 md:mb-12">
                <div>
                  <h2 id="rooms-heading" className="type-display m-0 text-[#f6efe6]">
                    Shop by room
                  </h2>
                  <p className="mt-3.5 max-w-[470px] text-[14.5px] leading-relaxed text-[#f6efe6]/65">
                    Every space we furnish, from the room you sit in to the one you wake up in.
                    Start where you are.
                  </p>
                </div>
                <Link
                  href="/collections"
                  className="text-walnut-300 focus-visible:outline-accent inline-flex shrink-0 items-center gap-2 text-[13px] tracking-[0.1em] uppercase no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  All rooms
                  <Arrow size={16} />
                </Link>
              </div>

              {/* All five across from `sm` up. Capped per chip — five across a
                  1440p measure would otherwise give circles the size of tiles. */}
              <ul
                role="list"
                className="grid grid-cols-3 gap-x-6 gap-y-9 sm:grid-cols-5 md:gap-x-9 md:gap-y-12"
              >
                {rooms.map((room) => (
                  <li key={`room-${room.handle}`} className="mx-auto w-full max-w-[260px]">
                    <CircleChip collection={room} tone="dark" />
                  </li>
                ))}
              </ul>

              {/* Photograph and copy, split. The message bands elsewhere set
                  their type over a full-bleed photo; on the brown ground the
                  picture is a tile beside the words instead. */}
              <div className="mt-14 grid items-center gap-8 md:mt-20 md:grid-cols-2 md:gap-12 lg:gap-16">
                <div className="tile-ground relative h-[240px] overflow-hidden rounded-lg md:h-[400px] min-[90rem]:h-[480px]">
                  <img
                    src={shopifyImageUrl(EDITORIAL_IMAGES.bandVisit.url, { width: 1400 })}
                    srcSet={srcSetFor(EDITORIAL_IMAGES.bandVisit.url, { width: 1400 })}
                    sizes="(min-width: 768px) 50vw, 100vw"
                    alt={EDITORIAL_IMAGES.bandVisit.altText}
                    className="washed h-full w-full object-cover object-[50%_45%]"
                    loading="lazy"
                    width={1400}
                    height={933}
                  />
                </div>
                <BandCopyBlock
                  copy={{
                    kicker: "Visit the showroom",
                    title: "Come and sit on it first",
                    body: "Every piece we make is on the floor in Northcote, in every finish — feel the weave, open the drawers, and take a wallet of swatches home with you. Thursday to Sunday, ten till four.",
                    cta: { label: "Browse the range", href: collectionHref("shop-all") },
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <InstagramPanel posts={instagramPosts} />

      {/* Swatch request — the deep brown band, hairlined off the marquee below
          so the two still read as separate bands. */}
      <section aria-labelledby="swatch-heading">
        <div
          data-reveal
          className="bg-walnut-900 grid items-center gap-9 border-y border-[color:rgb(232_224_212/0.16)] px-[var(--spacing-margin)] py-14 md:gap-10 md:py-22 lg:grid-cols-[1.1fr_1fr]"
        >
          <div>
            <p className="type-overline text-walnut-300 mb-3">Free swatches</p>
            <h2 id="swatch-heading" className="type-display mb-3.5 max-w-[470px] text-[#f6efe6]">
              Take the room home before you buy it
            </h2>
            <p className="m-0 max-w-[450px] text-[15px] text-[#f6efe6]/75 md:text-[16px]">
              Order up to six fabric and timber swatches, free. We send them in a linen wallet so you
              can live with them for a week.
            </p>
          </div>
          <SwatchRequestForm />
        </div>
      </section>

      {/* Marquee — two identical halves so the -50% loop lands on the seam.
          Shares the footer's surface, so a hairline keeps it a distinct band. */}
      <section
        className="bg-sand-900 text-sand-200 overflow-hidden border-b border-[color:rgb(232_224_212/0.16)] py-5.5"
        aria-hidden="true"
      >
        <div className="marquee-track">
          {[0, 1].map((half) => (
            <div key={half} className="flex">
              {MARQUEE_PHRASES.map((phrase) => (
                <span
                  key={`${half}-${phrase}`}
                  className="font-heading flex items-center gap-5 px-5 text-[16px] font-light opacity-95 md:gap-6.5 md:px-6.5 md:text-[25px]"
                >
                  {phrase}
                  <span className="bg-walnut-400 block size-[7px] rounded-full" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
