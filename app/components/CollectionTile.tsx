import Link from "next/link";

import { shopifyImageUrl, srcSetFor } from "../lib/image";
import { collectionHref, type CollectionRef } from "../lib/navigation";

/**
 * Image tile for rooms and curated collections. Height comes in as a class so
 * the mosaic stays in the parent, where the grid is defined.
 */
export function CollectionTile({
  collection,
  className = "",
  heightClass = "h-[300px]",
  priority = false,
  sizes = "(min-width: 1024px) 33vw, 100vw",
  compact = false,
}: {
  collection: CollectionRef;
  className?: string;
  heightClass?: string;
  priority?: boolean;
  sizes?: string;
  /** Lighter label for narrow tiles, where the full heading fills the image. */
  compact?: boolean;
}) {
  return (
    <article
      className={`card group bg-surface-secondary relative overflow-hidden rounded-lg ${heightClass} ${className}`}
    >
      <div className="tile-ground absolute inset-0">
        {collection.image ? (
          <div className="washed h-full w-full motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-105">
            {/* Full frame rather than a square CDN crop. These tiles run from
                near-square to very wide, and a square crop threw away the sides
                of the photograph before `object-cover` cropped it again — every
                wide tile ended up a close-up. Asking for width alone leaves all
                the framing to `object-cover`, held slightly above centre so the
                subject is not cut off at the foot of the tile. */}
            <img
              src={shopifyImageUrl(collection.image.url, { width: 1400 })}
              srcSet={srcSetFor(collection.image.url, { width: 1400 })}
              sizes={sizes}
              alt={collection.image.altText ?? collection.title}
              className="h-full w-full object-cover object-[50%_45%]"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              width={1400}
              height={933}
            />
          </div>
        ) : null}
      </div>

      <div className="scrim-tile pointer-events-none absolute inset-0 opacity-80 motion-safe:transition-opacity motion-safe:duration-500 group-hover:opacity-95" />

      <div
        className={`absolute inset-x-0 bottom-0 text-left motion-safe:translate-y-2 motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:translate-y-0 ${
          compact ? "p-4" : "p-6"
        }`}
      >
        <h3
          className={`font-heading text-white ${
            compact ? "text-[17px] leading-[1.15] font-light tracking-[-0.02em]" : "type-heading-lg"
          }`}
        >
          <Link
            href={collectionHref(collection.handle)}
            className="card-link text-white"
            aria-label={`Shop ${collection.title}`}
          >
            {collection.title}
          </Link>
        </h3>
      </div>
    </article>
  );
}

/**
 * A category tile — the product shot in a box with the name beneath, rather
 * than laid over it. Most category images are cut-outs on near-white, so an
 * overlaid label the way the room tiles do it has nothing to sit against.
 *
 * The box is 4:5, which is the native shape of the catalogue's product shots,
 * so nothing is cropped out of them.
 */
export function CategoryTile({
  collection,
  priority = false,
  sizes = "(min-width: 768px) 20vw, 45vw",
}: {
  collection: CollectionRef;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <article className="card group flex h-full flex-col gap-3.5">
      <div className="bg-surface-secondary relative aspect-[4/5] overflow-hidden rounded-lg">
        {collection.image ? (
          <img
            src={shopifyImageUrl(collection.image.url, { width: 640, height: 800, crop: "center" })}
            srcSet={srcSetFor(collection.image.url, { width: 640, height: 800, crop: "center" })}
            sizes={sizes}
            alt=""
            className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-105"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            width={640}
            height={800}
          />
        ) : null}
      </div>

      <h3 className="text-center">
        <Link
          href={collectionHref(collection.handle)}
          className="card-link text-on-surface hover:text-walnut-700 focus-visible:outline-accent text-[12.5px] tracking-[0.1em] uppercase motion-safe:transition-colors"
        >
          {collection.title}
        </Link>
      </h3>
    </article>
  );
}

/**
 * The circular chip — image in a circle, label beneath. `tone` picks the label
 * colours: the row sits on the dark band on the home page and on the warm paper
 * elsewhere.
 */
export function CircleChip({
  collection,
  tone = "light",
}: {
  collection: CollectionRef;
  tone?: "light" | "dark";
}) {
  return (
    <Link
      href={collectionHref(collection.handle)}
      className={`group focus-visible:outline-accent flex flex-col items-center gap-3 no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 motion-safe:transition-colors ${
        tone === "dark"
          ? "hover:text-walnut-300 text-[#f6efe6]"
          : "hover:text-walnut-700 text-on-surface"
      }`}
    >
      <div className="washed bg-surface-secondary relative aspect-square w-full overflow-hidden rounded-full motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:-translate-y-1">
        {collection.image ? (
          <img
            src={shopifyImageUrl(collection.image.url, { width: 600, height: 600, crop: "center" })}
            srcSet={srcSetFor(collection.image.url, { width: 600, height: 600, crop: "center" })}
            sizes="(min-width: 640px) 260px, 30vw"
            alt=""
            className="h-full w-full scale-110 object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-125"
            loading="lazy"
            width={600}
            height={600}
          />
        ) : null}
      </div>
      <span className="text-center text-[12.5px] tracking-[0.1em] uppercase">{collection.title}</span>
    </Link>
  );
}
