"use client";

import Link from "next/link";
import { useState } from "react";

import { shopifyImageUrl, srcSetFor } from "../lib/image";
import { formatPrice } from "../lib/money";
import type { ProductCardData } from "../lib/product-card-fragment";
import { roomFromTags } from "../lib/rooms";
import { subtitleFromTags, swatchFromTags } from "../lib/swatches";
import { useColourways } from "./FamilyProvider";
import { RoomTag } from "./RoomTag";
import { SaveButton } from "./SaveButton";

function moneyGreater(a: { amount: string } | null | undefined, b: { amount: string }) {
  return Number.parseFloat(a?.amount ?? "0") > Number.parseFloat(b.amount);
}

export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw",
  /** Square crops let a 2x2 grid of cards fit a phone screen; the taller 4:5
   *  portrait is the default everywhere else. */
  aspectClass = "aspect-[4/5]",
}: {
  product: ProductCardData;
  priority?: boolean;
  sizes?: string;
  aspectClass?: string;
}) {
  const colourways = useColourways(product.title);
  // Hovering a swatch previews that colourway in place; the swatch itself is a
  // link, so clicking still lands on that colourway's own product page.
  const [preview, setPreview] = useState<string | null>(null);

  const ownImage = product.featuredImage ?? product.images.nodes[0] ?? null;
  const image = preview ? { url: preview, altText: null } : ownImage;
  const hoverImage = preview
    ? null
    : (product.images.nodes.find((node) => node.url !== ownImage?.url) ?? null);

  const price = product.priceRange.minVariantPrice;
  const compareAtPrice = product.compareAtPriceRange.minVariantPrice;
  const onSale = moneyGreater(compareAtPrice, price);
  const soldOut = !product.availableForSale;
  const tags = product.tags ?? [];
  const swatch = swatchFromTags(tags);
  const subtitle = subtitleFromTags(tags);
  const room = roomFromTags(tags);

  return (
    <article
      className="group card relative flex h-full flex-col gap-3"
      aria-label={product.title}
      data-testid="product-card"
    >
      <div
        className={`rounded-lg bg-surface-secondary relative block overflow-hidden ${aspectClass}`}
      >
        {image ? (
          <div className="h-full w-full motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-105">
            <img
              src={shopifyImageUrl(image.url, { width: 620, height: 775, crop: "center" })}
              srcSet={srcSetFor(image.url, { width: 620, height: 775, crop: "center" })}
              sizes={sizes}
              alt={image.altText ?? product.title}
              className="h-full w-full object-cover"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              width={620}
              height={775}
            />
          </div>
        ) : null}

        {hoverImage ? (
          <div className="pointer-events-none absolute inset-0 opacity-0 motion-safe:transition-opacity motion-safe:duration-500 motion-safe:group-hover:opacity-100">
            <img
              src={shopifyImageUrl(hoverImage.url, { width: 620, height: 775, crop: "center" })}
              srcSet={srcSetFor(hoverImage.url, { width: 620, height: 775, crop: "center" })}
              sizes={sizes}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              width={620}
              height={775}
            />
          </div>
        ) : null}

        <div className="absolute end-3.5 top-3.5 z-10">
          <SaveButton handle={product.handle} title={product.title} />
        </div>

        {/* Status first, then the room the piece is for — stacked so the two
            never sit on top of each other. */}
        <div className="absolute start-3.5 top-3.5 flex flex-col items-start gap-1.5">
          {soldOut ? (
            <span className="badge-soldout inline-flex items-center rounded-[7px] text-[10.5px] tracking-[0.12em] uppercase">
              Sold out
            </span>
          ) : onSale ? (
            <span className="text-walnut-800 inline-flex items-center rounded-[7px] bg-[color:rgb(253_251_248/0.9)] px-3 py-1.5 text-[10.5px] tracking-[0.12em] uppercase">
              Sale
            </span>
          ) : null}
          {room ? <RoomTag room={room} /> : null}
        </div>

        {/* Quick view. The card itself is a link overlay (.card-link), so this
            sits above it and points at the same product — a keyboard user
            reaches the product once, through the title. */}
        <div className="pointer-events-none absolute inset-x-3.5 bottom-3.5 z-10 hidden opacity-0 motion-safe:translate-y-3.5 motion-safe:transition-[opacity,transform] motion-safe:duration-500 motion-safe:group-hover:translate-y-0 group-hover:opacity-100 md:block">
          <span className="button-primary pointer-events-none flex w-full items-center justify-center rounded-[7px] py-3.5 text-[12.5px] font-semibold tracking-[0.1em] uppercase">
            View piece
          </span>
        </div>
      </div>

      {colourways.length > 1 ? (
        <ul role="list" className="relative z-10 flex h-[19px] items-center gap-2">
          {colourways.map((colourway) => {
            const isCurrent = colourway.handle === product.handle;
            return (
              <li key={colourway.handle}>
                <Link
                  href={`/products/${colourway.handle}`}
                  onMouseEnter={() => setPreview(colourway.imageUrl)}
                  onFocus={() => setPreview(colourway.imageUrl)}
                  onMouseLeave={() => setPreview(null)}
                  onBlur={() => setPreview(null)}
                  aria-label={`${colourway.title}${isCurrent ? " (shown)" : ""}`}
                  title={colourway.colorName ?? colourway.title}
                  className="border-border focus-visible:outline-accent block size-[17px] rounded-full border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    background: colourway.hex ?? "var(--color-surface-secondary)",
                    boxShadow: isCurrent
                      ? "0 0 0 2px var(--color-surface), 0 0 0 3.5px var(--color-interactive)"
                      : undefined,
                  }}
                />
              </li>
            );
          })}
        </ul>
      ) : swatch ? (
        <div className="flex h-[19px] items-center gap-2">
          <span
            className="border-border size-[17px] rounded-full border"
            style={{ background: swatch.hex }}
            title={swatch.name}
          />
          <span className="sr-only">Colour: {swatch.name}</span>
        </div>
      ) : null}

      <div className="flex flex-col">
        <h3 className="text-on-surface text-[15.5px] leading-[1.35] font-normal">
          <Link href={`/products/${product.handle}`} className="card-link text-on-surface">
            {product.title}
          </Link>
        </h3>
        {subtitle ? <p className="text-sand-600 mt-1 text-[13px]">{subtitle}</p> : null}
        <div className="font-heading mt-2.5 inline-flex flex-wrap items-baseline gap-2 text-[19px]">
          {onSale ? (
            <>
              <span className="text-sale">
                <span className="sr-only">Sale price: </span>
                {formatPrice(price)}
              </span>
              <s className="text-compare text-sm">
                <span className="sr-only">Regular price: </span>
                {formatPrice(compareAtPrice)}
              </s>
            </>
          ) : (
            <span className="text-on-surface">
              <span className="sr-only">Price: </span>
              {formatPrice(price)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
