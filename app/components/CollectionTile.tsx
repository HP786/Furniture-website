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
            <img
              src={shopifyImageUrl(collection.image.url, { width: 900, height: 900, crop: "center" })}
              srcSet={srcSetFor(collection.image.url, { width: 900, height: 900, crop: "center" })}
              sizes={sizes}
              alt={collection.image.altText ?? collection.title}
              className="h-full w-full object-cover"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              width={900}
              height={900}
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
 * The circular "Popular categories" chip — image in a circle, label beneath.
 */
export function CategoryChip({ collection }: { collection: CollectionRef }) {
  return (
    <Link
      href={collectionHref(collection.handle)}
      className="group hover:text-walnut-700 text-on-surface focus-visible:outline-accent flex flex-col items-center gap-3 no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 motion-safe:transition-colors"
    >
      <div className="washed bg-surface-secondary relative aspect-square w-full overflow-hidden rounded-full motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:-translate-y-1">
        {collection.image ? (
          <img
            src={shopifyImageUrl(collection.image.url, { width: 400, height: 400, crop: "center" })}
            srcSet={srcSetFor(collection.image.url, { width: 400, height: 400, crop: "center" })}
            sizes="(min-width: 1024px) 12vw, 30vw"
            alt=""
            className="h-full w-full scale-110 object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-125"
            loading="lazy"
            width={400}
            height={400}
          />
        ) : null}
      </div>
      <span className="text-center text-[12px] tracking-[0.1em] uppercase">{collection.title}</span>
    </Link>
  );
}
