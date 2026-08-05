/**
 * Rooms — the one place the store's spaces are named.
 *
 * Every product carries a `Room_*` tag, so the room a piece belongs to is read
 * off the product itself rather than from whichever collection it happened to
 * be listed under. That is what lets a card show its room badge anywhere on the
 * site without a second request.
 */

export type Room = {
  /** Lower-cased `Room_*` tag suffix, e.g. `Room_LivingRoom` -> `livingroom`. */
  slug: string;
  /** Room name as it is shown to a shopper. */
  label: string;
  /** The collection this room links to. */
  handle: string;
};

/** In the order the home page's mosaic and trending rows use. */
export const ROOMS: readonly Room[] = [
  { slug: "livingroom", label: "Living Room", handle: "living-room-1" },
  { slug: "diningroom", label: "Dining Room", handle: "dining-room-1" },
  { slug: "bedroom", label: "Bedroom", handle: "bedroom-1" },
  { slug: "outdoor", label: "Outdoor", handle: "outdoor" },
  { slug: "bathroom", label: "Bathroom", handle: "bathroom" },
];

/**
 * Photographs that stand in for a room's Shopify collection image. Served from
 * `public/`, so they miss out on the Shopify CDN's `?width=` resizing — keep
 * them modest in size, and move them into Shopify Files if they grow.
 */
export const ROOM_IMAGE_OVERRIDES: Record<string, { url: string; altText: string }> = {
  "bedroom-1": {
    url: "/rooms/bedroom.jpg",
    altText: "A bouclé bed under an arched alcove, with a timber bedside table",
  },
  outdoor: {
    url: "/rooms/outdoor.webp",
    altText: "A teak outdoor lounge setting on a stone terrace under an olive tree",
  },
  bathroom: {
    url: "/rooms/bathroom.webp",
    altText: "A stone-tiled bathroom with a freestanding oval bath behind glass",
  },
};

const BY_SLUG = new Map(ROOMS.map((room) => [room.slug, room]));

const ROOM_TAG = /^room_(.+)$/i;

/** The product's room, or null when it carries no recognised `Room_*` tag. */
export function roomFromTags(tags: readonly string[]): Room | null {
  for (const tag of tags) {
    const match = ROOM_TAG.exec(tag);
    if (!match) continue;
    const room = BY_SLUG.get(match[1].toLowerCase());
    if (room) return room;
  }
  return null;
}
