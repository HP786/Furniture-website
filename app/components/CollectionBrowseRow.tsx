import Link from "next/link";

import { shopifyImageUrl, srcSetFor } from "../lib/image";
import { collectionHref, type CollectionRef } from "../lib/navigation";
import { Arrow } from "./WalnutMark";

const TILE_WIDTH = 142;

const TILE =
  "focus-visible:outline-accent flex h-full w-[118px] shrink-0 flex-col overflow-hidden rounded-[10px] border bg-surface no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors md:w-[142px]";

const LABEL = "flex flex-1 items-center justify-center px-2.5 py-2.5 text-center text-[12.5px] leading-[1.25]";

const MEDIA = "tile-ground relative h-[74px] w-full overflow-hidden md:h-[86px]";

/**
 * The step down from the collection you are on — its children, or at a leaf the
 * rest of the shelf it sits on. Leads with the way back up, so the row is both
 * the drill-down and the breadcrumb's tappable twin.
 *
 * A horizontal scroller rather than a wrapping grid: the row is a detour from
 * the products, and pushing the grid down a line every time someone goes one
 * level deeper makes the page feel like it is growing under them.
 */
export function CollectionBrowseRow({
  up,
  tiles,
  activeHandle,
  showActive,
}: {
  up: CollectionRef | null;
  tiles: CollectionRef[];
  activeHandle: string;
  /** True when the current collection is among the tiles and should be marked. */
  showActive: boolean;
}) {
  if (!up && tiles.length === 0) return null;

  return (
    <nav
      aria-label="Browse this collection"
      // Bleeds to the screen edge on a phone so a scrolled row reads as
      // scrollable, then sits back inside the margin from `sm` up.
      className="scrollbar-none -mx-[var(--spacing-margin)] mb-8 overflow-x-auto px-[var(--spacing-margin)] sm:mx-0 sm:px-0"
    >
      <ul role="list" className="flex items-stretch gap-2.5">
        {up ? (
          <li>
            <Link
              href={collectionHref(up.handle)}
              className={`${TILE} border-border text-on-surface hover:border-sand-900`}
            >
              <span className={`${MEDIA} bg-surface-secondary grid place-items-center`}>
                <span className="border-border text-walnut-700 grid size-9 place-items-center rounded-full border">
                  <Arrow size={16} direction="left" />
                </span>
              </span>
              <span className={LABEL}>
                <span className="sr-only">Back to </span>
                {up.title}
              </span>
            </Link>
          </li>
        ) : null}

        {tiles.map((tile) => {
          const active = showActive && tile.handle === activeHandle;

          return (
            <li key={tile.handle}>
              <Link
                href={collectionHref(tile.handle)}
                aria-current={active ? "page" : undefined}
                className={`${TILE} ${
                  active
                    ? "border-sand-900 text-on-surface font-medium"
                    : "border-border text-on-surface hover:border-sand-900"
                }`}
              >
                <span className={MEDIA}>
                  {tile.image ? (
                    <img
                      src={shopifyImageUrl(tile.image.url, {
                        width: TILE_WIDTH * 2,
                        height: 172,
                        crop: "center",
                      })}
                      srcSet={srcSetFor(tile.image.url, {
                        width: TILE_WIDTH,
                        height: 86,
                        crop: "center",
                      })}
                      sizes={`${TILE_WIDTH}px`}
                      alt=""
                      loading="lazy"
                      width={TILE_WIDTH}
                      height={86}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </span>
                <span className={LABEL}>{tile.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
