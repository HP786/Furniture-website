import Link from "next/link";

import { collectionHref } from "../lib/navigation";
import type { Room } from "../lib/rooms";

const PILL =
  "inline-flex items-center rounded-[7px] px-2.5 py-1 text-[10px] leading-[1.5] tracking-[0.12em] uppercase";

/**
 * The room badge that sits on every product image. Static rather than a link:
 * a card is already one big link (`.card-link`), and nesting a second one
 * inside it would give a keyboard user a target they cannot see the edges of.
 */
export function RoomTag({ room, className = "" }: { room: Room; className?: string }) {
  return (
    <span
      className={`${PILL} text-walnut-800 bg-[color:rgb(253_251_248/0.88)] backdrop-blur-[2px] ${className}`}
    >
      <span className="sr-only">Room: </span>
      {room.label}
    </span>
  );
}

/** The same badge where nothing is covering it — on a product page, it links. */
export function RoomTagLink({ room }: { room: Room }) {
  return (
    <Link
      href={collectionHref(room.handle)}
      className={`${PILL} border-border text-sand-700 hover:bg-surface-secondary focus-visible:outline-accent border no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors`}
    >
      <span className="sr-only">Room: </span>
      {room.label}
    </Link>
  );
}
