/**
 * Navigation model. Every entry points at a real collection handle;
 * `buildNavigation` drops anything Shopify no longer has, so no nav link 404s.
 */

export type CollectionRef = {
  handle: string;
  title: string;
  image: { url: string; altText: string | null } | null;
  productCount: number | null;
};

export type NavItem = { handle: string; title: string };
export type NavColumn = { title: string; items: NavItem[]; image: CollectionRef["image"] };
export type NavGroup = {
  /** Label shown in the nav bar. Falls back to the collection title. */
  label: string;
  /** Where the label itself links — always a real collection. */
  handle: string;
  columns: NavColumn[];
  promo: { handle: string; title: string; body: string; image: CollectionRef["image"] } | null;
};

export const SHOP_ALL_HANDLE = "shop-all";

/** Store name. Single source so the wordmark, footer and metadata agree. */
export const BRAND_NAME = "Walnur";

/**
 * Page furniture rather than collection data — a collection carries only one
 * image, and several of these sit on sections pointing at the same collection.
 * Stored in Shopify Files so `?width=` CDN resizing still applies.
 */
const CDN = "https://cdn.shopify.com/s/files/1/0829/2407/7295/files";

export const EDITORIAL_IMAGES = {
  hero: {
    url: `${CDN}/walnut-hero-fireplace.png?v=1785308672`,
    altText: "A Federation cottage living room with a lit fireplace and woven armchairs",
  },
  bandLook: {
    url: `${CDN}/walnut-band-terracotta.png?v=1785308672`,
    altText: "A terracotta rug and oak table in a room with concrete floors",
  },
  bandVisit: {
    url: `${CDN}/walnut-showroom-rugs.png?v=1785308671`,
    altText: "The Melbourne showroom floor with rugs and fabric samples",
  },
  featureLeather: {
    url: `${CDN}/walnut-leather-chair.png?v=1785308672`,
    altText: "A tan leather armchair in low afternoon light",
  },
  editorialColour: {
    url: `${CDN}/walnut-rug-terracotta.png?v=1785308672`,
    altText: "Terracotta, chalk and clay tones in a room with afternoon light",
  },
} as const;

/** Room tiles on the home page, in the design's mosaic order. */
export const ROOM_HANDLES = [
  "living-room-1",
  "dining-room-1",
  "bedroom-1",
  "outdoor",
  "bathroom",
] as const;

/** The six curated collections in the dark "Shop by collection" band. */
export const CURATED_HANDLES = [
  "long-afternoons",
  "soft-texture",
  "warm-timber",
  "pale-and-quiet",
  "lived-in-leather",
  "small-spaces",
] as const;

/** The "Popular categories" circle row. */
export const CATEGORY_HANDLES = [
  "sofas",
  "armchairs",
  "coffee-tables",
  "side-tables",
  "bedside-tables",
  "dining-tables",
  "ottomans",
  "soft-texture",
  "lived-in-leather",
  "warm-timber",
] as const;

/** The three editorial feature panels. */
export const FEATURE_PANELS = [
  {
    handle: "long-afternoons",
    kicker: "Winter 26",
    body: "Sofas and armchairs built for sinking into — bouclé, Otto fabric and tan leather, deep-seated and low.",
  },
  {
    handle: "soft-texture",
    kicker: "The edit",
    body: "Wool, jute and bouclé in the warm neutrals that make a room feel finished rather than decorated.",
  },
  {
    handle: "dining-tables",
    kicker: "Made local",
    body: "Solid oak dining tables and benches, finished in hardwax oil by a workshop twenty minutes from our door.",
  },
] as const;

/** The two magazine-style editorial cards below the marquee. */
export const EDITORIAL_CARDS = [
  {
    handle: "warm-timber",
    kicker: "A house we love",
    title: "The Cottage at Red Hill",
    body: "A weatherboard cottage furnished slowly — a cream three-seater, an oval oak table and a jute rug that has earned its marks.",
  },
  {
    handle: "pale-and-quiet",
    kicker: "Colour study",
    title: "Terracotta, Chalk, Clay",
    body: "How three warm tones behave in a room with concrete floors and a lot of afternoon light.",
  },
] as const;

type GroupBlueprint = {
  label: string;
  handle: string;
  columns: { title: string; handles: string[] }[];
  promo: { handle: string; body: string } | null;
};

const BLUEPRINT: GroupBlueprint[] = [
  {
    label: "Living",
    handle: "living-room-1",
    columns: [
      { title: "Seating", handles: ["sofas", "armchairs", "ottomans"] },
      { title: "Tables", handles: ["coffee-tables", "side-tables"] },
      { title: "By material", handles: ["soft-texture", "warm-timber", "lived-in-leather"] },
      { title: "Shop by", handles: ["long-afternoons", "pale-and-quiet", "small-spaces", "shop-all"] },
    ],
    promo: {
      handle: "long-afternoons",
      body: "Sixty-four pieces, chosen to sit quietly together.",
    },
  },
  {
    label: "Dining",
    handle: "dining-room-1",
    columns: [
      { title: "Tables", handles: ["dining-tables", "tables"] },
      { title: "Seating", handles: ["armchairs", "ottomans"] },
      { title: "By finish", handles: ["warm-timber", "pale-and-quiet"] },
      { title: "Shop by", handles: ["dining-room-1", "shop-all"] },
    ],
    promo: {
      handle: "dining-tables",
      body: "Solid oak, pedestal base, seats four comfortably.",
    },
  },
  {
    label: "Bedroom",
    handle: "bedroom-1",
    columns: [
      { title: "Bedside", handles: ["bedside-tables"] },
      { title: "Seating", handles: ["ottomans", "armchairs"] },
      { title: "By finish", handles: ["warm-timber", "pale-and-quiet"] },
      { title: "Shop by", handles: ["bedroom-1", "small-spaces", "shop-all"] },
    ],
    promo: {
      handle: "bedside-tables",
      body: "Oak, one drawer, nothing you do not need.",
    },
  },
  {
    label: "Sofas",
    handle: "sofas",
    columns: [
      { title: "By fabric", handles: ["soft-texture", "pale-and-quiet", "lived-in-leather"] },
      { title: "Ranges", handles: ["sofas", "long-afternoons"] },
      { title: "By room", handles: ["living-room-1"] },
      { title: "Shop by", handles: ["small-spaces", "shop-all"] },
    ],
    promo: {
      handle: "sofas",
      body: "Cloud-like bouclé, deep-seated, generously cushioned.",
    },
  },
  {
    label: "Armchairs",
    handle: "armchairs",
    columns: [
      { title: "By fabric", handles: ["soft-texture", "lived-in-leather", "pale-and-quiet"] },
      { title: "Ranges", handles: ["armchairs", "chairs"] },
      { title: "With it", handles: ["ottomans", "side-tables"] },
      { title: "Shop by", handles: ["long-afternoons", "shop-all"] },
    ],
    promo: {
      handle: "lived-in-leather",
      body: "Tan leather that ages into the best seat in the house.",
    },
  },
  {
    label: "Tables",
    handle: "tables",
    columns: [
      { title: "Coffee Tables", handles: ["coffee-tables"] },
      { title: "Side Tables", handles: ["side-tables"] },
      { title: "Bedside", handles: ["bedside-tables"] },
      { title: "By finish", handles: ["warm-timber", "dining-tables", "shop-all"] },
    ],
    promo: {
      handle: "coffee-tables",
      body: "Round, in light or smoke oak, with sculptural legs.",
    },
  },
];

export function collectionHref(handle: string) {
  return `/collections/${handle}`;
}

/**
 * Resolve the blueprint against the collections that actually exist.
 * Columns with no surviving items are dropped; so are groups with no columns.
 */
export function buildNavigation(byHandle: Map<string, CollectionRef>): NavGroup[] {
  const groups: NavGroup[] = [];

  for (const group of BLUEPRINT) {
    const anchor = byHandle.get(group.handle);
    if (!anchor) continue;

    const columns: NavColumn[] = [];
    for (const column of group.columns) {
      const items: NavItem[] = [];
      for (const handle of column.handles) {
        const collection = byHandle.get(handle);
        if (collection) items.push({ handle, title: collection.title });
      }
      if (items.length === 0) continue;
      columns.push({
        title: column.title,
        items,
        image: byHandle.get(items[0].handle)?.image ?? null,
      });
    }
    if (columns.length === 0) continue;

    const promoCollection = group.promo ? byHandle.get(group.promo.handle) : undefined;

    groups.push({
      label: group.label,
      handle: group.handle,
      columns,
      promo:
        group.promo && promoCollection
          ? {
              handle: group.promo.handle,
              title: promoCollection.title,
              body: group.promo.body,
              image: promoCollection.image,
            }
          : null,
    });
  }

  return groups;
}

/** Look up a fixed list of handles in order, skipping any that are missing. */
export function pickCollections(
  byHandle: Map<string, CollectionRef>,
  handles: readonly string[],
): CollectionRef[] {
  const picked: CollectionRef[] = [];
  for (const handle of handles) {
    const collection = byHandle.get(handle);
    if (collection) picked.push(collection);
  }
  return picked;
}

export function productCountLabel(count: number | null) {
  if (count === null) return "";
  if (count === 0) return "Coming soon";
  return `${count} ${count === 1 ? "piece" : "pieces"}`;
}

export const FOOTER_COLUMNS = [
  {
    title: "Shop",
    items: [
      { label: "Shop all", handle: "shop-all" },
      { label: "Sofas", handle: "sofas" },
      { label: "Armchairs", handle: "armchairs" },
      { label: "Dining", handle: "dining-room-1" },
      { label: "Bedroom", handle: "bedroom-1" },
      { label: "Small spaces", handle: "small-spaces" },
    ],
  },
  {
    title: "Collections",
    items: [
      { label: "Long Afternoons", handle: "long-afternoons" },
      { label: "Soft Texture", handle: "soft-texture" },
      { label: "Warm Timber", handle: "warm-timber" },
      { label: "Pale & Quiet", handle: "pale-and-quiet" },
      { label: "Lived-in Leather", handle: "lived-in-leather" },
    ],
  },
  {
    title: "Rooms",
    items: [
      { label: "Living Room", handle: "living-room-1" },
      { label: "Dining Room", handle: "dining-room-1" },
      { label: "Bedroom", handle: "bedroom-1" },
      { label: "Outdoor", handle: "outdoor" },
      { label: "Bathroom", handle: "bathroom" },
    ],
  },
] as const;

export const TRUST_POINTS = [
  { label: "Australian owned and made", d: "M12 3a9 9 0 1 0 9 9" },
  { label: "Own it now, pay later", d: "M12 3v18M8 7.5h6a2.5 2.5 0 0 1 0 5H10a2.5 2.5 0 0 0 0 5h6" },
  {
    label: "Free white-glove delivery over $1,500",
    d: "M3 16V7h11v9M14 11h4l3 3v2h-7M6.5 19a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2ZM17.5 19a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z",
  },
] as const;

export const MARQUEE_PHRASES = [
  "Solid timber, no veneer",
  "Ten-year frame guarantee",
  "Free fabric samples",
  "Melbourne since 2011",
  "Thirty-day returns",
] as const;

export const PAYMENT_METHODS = ["VISA", "MASTERCARD", "AMEX", "AFTERPAY"] as const;

export const SOCIAL_ICONS = [
  { label: "Facebook", d: "M14 8h-2a2 2 0 0 0-2 2v11M8 13h6" },
  { label: "Pinterest", d: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5v8" },
  {
    label: "Instagram",
    d: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 5.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z",
  },
  {
    label: "YouTube",
    d: "M3 8.5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3Zm7.5 1 4 2.5-4 2.5Z",
  },
] as const;
