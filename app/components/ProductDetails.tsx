"use client";

import { canAddToCart, type SelectedOption, type StorefrontApi } from "@shopify/hydrogen";
import { createProductComponents, ShopPayButton } from "@shopify/hydrogen/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useCartForm } from "../lib/cart";
import { openCartDrawer } from "../lib/cart-drawer";
import { shopifyImageUrl, srcSetFor } from "../lib/image";
import { formatPercentOff, formatPrice } from "../lib/money";
import { dimensionsFromTags, faqsForType, specFromTags } from "../lib/product-spec";
import { roomFromTags } from "../lib/rooms";
import { subtitleFromTags, swatchFromTags, typeFromTags } from "../lib/swatches";
import { useColourways, usePieceOptions } from "./FamilyProvider";
import type { PRODUCT_QUERY } from "../products/[handle]/page";
import { ProductViewedTracker } from "./AnalyticsTrackers";
import { ProductCard } from "./ProductCard";
import { ModelBadge, ProductModelViewer, type ProductModel } from "./ProductModelViewer";
import { RoomTagLink } from "./RoomTag";
import { Icon, ICON_PATHS } from "./WalnutMark";

type ProductQuery = StorefrontApi.ResultOf<typeof PRODUCT_QUERY>;
type ProductData = NonNullable<ProductQuery["product"]>;
type VariantData = NonNullable<ProductData["selectedOrFirstAvailableVariant"]>;
type RelatedProduct = NonNullable<ProductQuery["relatedProducts"]>[number];
type Money = { amount: string; currencyCode: string };

const { ProductProvider, useProductForm } = createProductComponents<ProductData>();

function variantUrl(
  product: Pick<ProductData, "handle" | "options">,
  selectedOptions: SelectedOption[],
  handle = product.handle,
  base: URLSearchParams | ReadonlyURLSearchParams = new URLSearchParams(),
) {
  const params = new URLSearchParams(base);
  for (const option of product.options) params.delete(option.name);
  for (const option of selectedOptions) params.set(option.name, option.value);
  const query = params.toString();
  return `/products/${handle}${query ? `?${query}` : ""}`;
}

type ReadonlyURLSearchParams = ReturnType<typeof useSearchParams>;

function selectedOptionValue(option: { values: Array<{ selected: boolean; name: string }> }) {
  return option.values.find((value) => value.selected)?.name;
}

function swatchImageUrl(value: ProductData["options"][number]["optionValues"][number]) {
  return value.swatch?.image?.previewImage?.url ?? null;
}

/**
 * The product's 3D model, or null where it has none.
 *
 * Shopify returns one source per format: the .glb every browser renders, and
 * the .usdz iOS wants for AR, derived from the same upload. A product with no
 * model comes back as an empty media list and the gallery stays photographs.
 */
function modelFrom(product: ProductData): ProductModel | null {
  for (const node of product.media?.nodes ?? []) {
    if (!node || !("sources" in node)) continue;
    const sources = node.sources ?? [];
    const glb = sources.find((source) => source.format === "glb") ?? sources[0];
    if (!glb) continue;

    return {
      src: glb.url,
      iosSrc: sources.find((source) => source.format === "usdz")?.url ?? null,
      poster: node.previewImage?.url ?? null,
      alt: node.alt ?? `${product.title} in 3D`,
    };
  }
  return null;
}

/**
 * The +/− an accordion header carries: two bars, the upright one collapsing on
 * open. Cheaper than swapping icons and it animates, which a swap cannot.
 */
function PlusMinus({ size = 15 }: { size?: number }) {
  return (
    <span
      className="relative block shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-current" />
      <span className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-current group-open:scale-y-0 motion-safe:transition-transform motion-safe:duration-300" />
    </span>
  );
}

/** The circular pager control used by the gallery, the pair tile and the card row. */
function RoundControl({
  direction,
  onClick,
  label,
  className = "",
  size = 40,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  label: string;
  className?: string;
  size?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`bg-surface text-on-surface focus-visible:outline-accent inline-flex cursor-pointer items-center justify-center rounded-full shadow-[0_2px_10px_rgb(0_0_0/0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-transform motion-safe:active:scale-[0.92] ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon d={direction === "prev" ? "m14.5 5-6.5 7 6.5 7" : "m9.5 5 6.5 7-6.5 7"} size={17} />
    </button>
  );
}

/**
 * The gallery: one snapping stage with a slide counter, arrows from md, and a
 * thumbnail strip under it. The track is the same element at every breakpoint,
 * so an arrow, a thumbnail and a swipe all move the one thing.
 */
function ProductGallery({
  product,
  selectedVariant,
}: {
  product: ProductData;
  selectedVariant: VariantData | null;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const images = useMemo(() => {
    const seen = new Set<string>();
    return [selectedVariant?.image, product.featuredImage, ...product.images.nodes].flatMap(
      (image) => {
        if (!image?.url || seen.has(image.url)) return [];
        seen.add(image.url);
        return [image];
      },
    );
  }, [product, selectedVariant]);

  // A product that has a 3D model leads with it — the piece turned by hand
  // beats any photograph of it. Products without one are unchanged.
  const model = useMemo(() => modelFrom(product), [product]);
  const slideCount = images.length + (model ? 1 : 0);

  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setActive(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const clamped = (index + slideCount) % slideCount;
      track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
    },
    [slideCount],
  );

  if (images.length === 0) {
    return (
      <div data-testid="product-gallery" className="bg-surface-secondary aspect-[4/5] rounded-lg" />
    );
  }

  return (
    <div data-testid="product-gallery" className="flex flex-col gap-3">
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          data-product-gallery-track
          className="scrollbar-none bg-surface-secondary flex snap-x snap-mandatory overflow-x-auto rounded-lg"
          tabIndex={0}
          aria-label={`${product.title} gallery images`}
        >
          {model ? (
            <div
              role="group"
              aria-roledescription="slide"
              aria-label={`1 of ${slideCount}: 3D model`}
              className="w-full shrink-0 snap-center contain-paint"
            >
              <ProductModelViewer model={model} />
            </div>
          ) : null}

          {images.map((image, index) => (
            <div
              key={image.url}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1 + (model ? 1 : 0)} of ${slideCount}`}
              className="w-full shrink-0 snap-center contain-paint"
            >
              <div className="aspect-[4/5] overflow-hidden rounded-lg">
                <img
                  src={shopifyImageUrl(image.url, { width: 1000, height: 1250, crop: "center" })}
                  srcSet={srcSetFor(image.url, { width: 1000, height: 1250, crop: "center" })}
                  sizes="(min-width: 768px) 55vw, 100vw"
                  alt={image.altText ?? product.title}
                  className="h-full w-full object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  width={1000}
                  height={1250}
                  data-testid={index === 0 ? "product-gallery-image" : undefined}
                />
              </div>
            </div>
          ))}
        </div>

        {slideCount > 1 ? (
          <>
            <div className="pointer-events-none absolute inset-y-0 start-4 end-4 hidden items-center justify-between md:flex">
              <RoundControl
                direction="prev"
                onClick={() => goTo(active - 1)}
                label="Previous image"
                size={46}
                className="pointer-events-auto"
              />
              <RoundControl
                direction="next"
                onClick={() => goTo(active + 1)}
                label="Next image"
                size={46}
                className="pointer-events-auto"
              />
            </div>
            <span
              className="text-on-surface absolute bottom-4 start-4 rounded-full bg-[color:rgb(253_251_248/0.92)] px-3 py-1.5 text-[12.5px] tabular-nums"
              aria-hidden="true"
            >
              {Math.min(active + 1, slideCount)}/{slideCount}
            </span>
          </>
        ) : null}
      </div>

      {slideCount > 1 ? (
        <ul role="list" className="grid grid-cols-5 gap-2.5 md:gap-3.5">
          {model ? (
            <li>
              <button
                type="button"
                onClick={() => goTo(0)}
                aria-label="Show the 3D model"
                aria-current={active === 0 ? "true" : undefined}
                className={`bg-surface-secondary focus-visible:outline-accent relative block aspect-square w-full cursor-pointer overflow-hidden rounded-lg border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors ${
                  active === 0 ? "border-on-surface" : "border-transparent"
                }`}
              >
                {model.poster ? (
                  <img
                    src={model.poster}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
                <ModelBadge />
              </button>
            </li>
          ) : null}

          {images.slice(0, model ? 4 : 5).map((image, index) => (
            <li key={`thumb-${image.url}`}>
              <button
                type="button"
                onClick={() => goTo(index + (model ? 1 : 0))}
                aria-label={`Show image ${index + 1}`}
                aria-current={index + (model ? 1 : 0) === active ? "true" : undefined}
                className={`bg-surface-secondary focus-visible:outline-accent block aspect-square w-full cursor-pointer overflow-hidden rounded-lg border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors ${
                  index + (model ? 1 : 0) === active ? "border-on-surface" : "border-transparent"
                }`}
              >
                <img
                  src={shopifyImageUrl(image.url, { width: 300, height: 300, crop: "center" })}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  width={300}
                  height={300}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PriceBlock({
  product,
  selectedVariant,
}: {
  product: ProductData;
  selectedVariant: VariantData | null;
}) {
  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;
  const compareAtPrice = selectedVariant?.compareAtPrice;
  const percentOff = formatPercentOff(price, compareAtPrice);

  return (
    <div className="mt-4" data-product-price>
      <div className="inline-flex flex-wrap items-baseline gap-2">
        {compareAtPrice && percentOff ? (
          <>
            <span className="text-sale font-medium">
              <span className="sr-only">Sale price: </span>
              {formatPrice(price)}
            </span>
            <s className="text-compare text-sm">
              <span className="sr-only">Regular price: </span>
              {formatPrice(compareAtPrice)}
            </s>
            <span className="text-sale text-sm font-medium" aria-label={`Save ${percentOff}`}>
              ({percentOff})
            </span>
          </>
        ) : (
          <span className="text-on-surface font-medium">
            <span className="sr-only">Price: </span>
            {formatPrice(price)}
          </span>
        )}
      </div>
    </div>
  );
}

/** A quarter of the price, to the cent — the instalment line under the price. */
function instalment(price: Money): Money {
  return {
    amount: (Math.round(Number.parseFloat(price.amount) * 25) / 100).toFixed(2),
    currencyCode: price.currencyCode,
  };
}

/**
 * Stock, as a sentence rather than a badge: a dotted ring in the state colour
 * and the line a buyer is actually looking for before they commit.
 */
function StockLine({ selectedVariant }: { selectedVariant: VariantData | null }) {
  if (!selectedVariant) return null;

  const quantity = selectedVariant.quantityAvailable;
  const low = typeof quantity === "number" && quantity > 0 && quantity <= 5;
  // Full class names, never assembled from parts: Tailwind reads the source as
  // text, so a class built at runtime is a class that never gets generated.
  const state = !selectedVariant.availableForSale
    ? {
        tone: "text-critical",
        ring: "border-critical",
        dot: "bg-critical",
        label: "Out of stock — made to order",
      }
    : low
      ? {
          tone: "text-warning",
          ring: "border-warning",
          dot: "bg-warning",
          label: `Low stock: ${quantity} left`,
        }
      : {
          tone: "text-success",
          ring: "border-success",
          dot: "bg-success",
          label: "In stock and ready to ship",
        };

  return (
    <div className="mt-4 flex items-center gap-2.5 text-[14px]" data-product-inventory>
      <span
        className={`grid size-[15px] shrink-0 place-items-center rounded-full border-2 ${state.ring}`}
        aria-hidden="true"
      >
        <span className={`block size-[5px] rounded-full ${state.dot}`} />
      </span>
      <span className={`${state.tone} font-medium`}>{state.label}</span>
    </div>
  );
}

/**
 * A single-variant product reports a "Title" option whose only value is
 * "Default Title" — Shopify plumbing, not a choice. Rendering it would put a
 * dead pill on the page, so it is filtered out.
 */
function isPlaceholderOption(option: { name: string; values: Array<{ name: string }> }) {
  return (
    option.name === "Title" &&
    option.values.length === 1 &&
    option.values[0]?.name === "Default Title"
  );
}

function VariantSelector({ product }: { product: ProductData }) {
  const { options, register } = useProductForm();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const visibleOptions = options.filter((option) => !isPlaceholderOption(option));

  if (visibleOptions.length === 0) {
    // The form still needs the pathname for its return-to redirect even when
    // there is nothing to choose.
    return <input type="hidden" name="returnTo" value={pathname} readOnly />;
  }

  return (
    <div className="swatch-buttons space-y-4">
      {visibleOptions.map((option) => {
        const current = selectedOptionValue(option);
        const productOption = product.options.find((item) => item.name === option.name);
        const isColor = /colou?r/i.test(option.name);
        const hasSwatches = productOption?.optionValues.some(
          (value) => value.swatch?.color || swatchImageUrl(value),
        );

        return (
          <fieldset key={option.name} className="space-y-2">
            <legend className="text-on-surface text-sm font-medium">
              {option.name}
              {current ? `: ${current}` : ""}
            </legend>
            <div className="flex flex-wrap gap-2" role="group" aria-label={option.name}>
              {option.values.map((value) => {
                const productValue = productOption?.optionValues.find(
                  (item) => item.name === value.name,
                );
                const registered = register("optionValue", {
                  optionName: option.name,
                  value: value.name,
                });
                const url = variantUrl(product, value.selectedOptions, value.handle, searchParams);
                const unavailableLabel = !value.available && value.exists ? " (Sold out)" : "";
                const commonClass = value.exists ? "" : "opacity-50";

                if (value.handle !== product.handle) {
                  return (
                    <Link
                      key={`${option.name}:${value.name}`}
                      href={url}
                      className="option-pill focus-visible:outline-accent motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
                      aria-pressed={value.selected}
                    >
                      {value.name}
                    </Link>
                  );
                }

                if (isColor && hasSwatches) {
                  const imageUrl = productValue ? swatchImageUrl(productValue) : null;
                  return (
                    <button
                      key={`${option.name}:${value.name}`}
                      type="button"
                      {...registered}
                      disabled={!value.exists}
                      aria-pressed={value.selected}
                      aria-label={`${value.name}${unavailableLabel}`}
                      data-testid="color-swatch"
                      className={`min-h-touch-target min-w-touch-target relative inline-flex cursor-pointer items-center justify-center motion-safe:transition-transform motion-safe:active:scale-[0.93] ${commonClass}`}
                    >
                      <span
                        className={`swatch-md relative inline-flex items-center justify-center overflow-hidden rounded-full border-2 ring-offset-2 ${value.selected ? "border-interactive" : "border-border"}`}
                        style={{
                          backgroundColor: productValue?.swatch?.color ?? undefined,
                          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
                          backgroundSize: imageUrl ? "cover" : undefined,
                        }}
                        aria-hidden="true"
                      >
                        {!value.available ? (
                          <span className="text-on-surface-secondary absolute inset-0 flex items-center justify-center">
                            /
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    key={`${option.name}:${value.name}`}
                    type="button"
                    {...registered}
                    disabled={!value.exists}
                    aria-pressed={value.selected}
                    data-testid={isColor ? "color-swatch" : undefined}
                    className={`option-pill focus-visible:outline-accent motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97] ${commonClass}`}
                  >
                    {value.name}
                    {!value.available && value.exists ? (
                      <span className="sr-only"> Sold out</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
      <input type="hidden" name="returnTo" value={pathname} readOnly />
    </div>
  );
}

function AddToCartForm({ product }: { product: ProductData }) {
  const { options, selectedVariant, register, formProps, errors, pending } = useProductForm();
  const [quantity, setQuantity] = useState(1);
  const addable = canAddToCart(product, options);
  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;

  return (
    <div data-product-form className="mt-6">
      <span className="sr-only" aria-live="polite" data-add-to-cart-status />
      <form {...formProps({ afterSubmit: openCartDrawer })}>
        <input type="hidden" {...register("merchandiseId", {})} />
        <div className="mb-4 flex items-center justify-between gap-4">
          <label className="text-sand-700 text-[13.5px]" htmlFor="quantity">
            Quantity
          </label>
          <div
            data-testid="quantity-stepper"
            className="quantity-selector-outlined inline-flex items-center rounded-full"
          >
            <button
              type="button"
              className="text-on-surface-secondary hover:text-on-surface inline-flex h-11 w-11 items-center justify-center focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[color,transform] motion-safe:active:scale-[0.90]"
              aria-label="Decrease quantity"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            >
              <img src="/icons/icon-minus.svg" alt="" className="size-4" aria-hidden="true" />
            </button>
            <input
              {...register("quantity", { value: quantity })}
              id="quantity"
              type="number"
              min={1}
              max={99}
              step={1}
              className="number-reset text-on-surface h-11 w-12 rounded-none border-0 bg-transparent p-0 text-center text-sm focus-visible:outline-none"
              aria-label="Quantity"
              onChange={(event) => setQuantity(Math.max(1, Number(event.currentTarget.value) || 1))}
            />
            <button
              type="button"
              className="text-on-surface-secondary hover:text-on-surface inline-flex h-11 w-11 items-center justify-center focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[color,transform] motion-safe:active:scale-[0.90]"
              aria-label="Increase quantity"
              onClick={() => setQuantity((value) => Math.min(99, value + 1))}
            >
              <img src="/icons/icon-plus.svg" alt="" className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        {/* The price rides in the button label, as on the reference: the one
            control a buyer aims at also states what it will cost. */}
        <button
          type="submit"
          className="button-primary focus-visible:outline-accent inline-flex h-[54px] w-full cursor-pointer items-center justify-center gap-3 rounded-full px-4 text-[15px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[color,background-color,transform] motion-safe:active:scale-[0.985]"
          disabled={!addable || pending}
          data-testid="add-to-cart"
        >
          Add to cart
          <span aria-hidden="true" className="opacity-60">
            —
          </span>
          {formatPrice(price)}
        </button>
        {errors.userErrors.length > 0 || errors.networkErrors.length > 0 ? (
          <div role="alert" className="text-critical mt-3 text-sm">
            {[...errors.userErrors, ...errors.networkErrors]
              .map((error) => error.message)
              .join(" ")}
          </div>
        ) : null}
      </form>
      {selectedVariant ? (
        <div className="mt-3">
          <ShopPayButton
            variants={[{ id: selectedVariant.id, quantity }]}
            channel="hydrogen"
            disabled={!addable || pending}
            width="100%"
            height="48px"
            borderRadius="999px"
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * "Pairs well with", inside the buy box: one suggestion at a time, paged, and
 * buyable where it stands. Adding uses the cart form directly rather than the
 * product form, because the thing being added is a different product.
 */
function PairsWellWith({ products }: { products: RelatedProduct[] }) {
  const { formProps, register } = useCartForm();
  const [index, setIndex] = useState(0);
  if (products.length === 0) return null;

  const current = products[Math.min(index, products.length - 1)];
  const image = current.featuredImage ?? current.images.nodes[0] ?? null;
  const variantId = current.availableForSale
    ? (current.selectedOrFirstAvailableVariant?.id ?? null)
    : null;

  return (
    <section className="mt-8" aria-labelledby="pairs-heading">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 id="pairs-heading" className="font-heading m-0 text-[19px] font-light">
          Pairs well with
        </h2>
        {products.length > 1 ? (
          <div className="text-sand-600 flex items-center gap-2 text-[13px]">
            <RoundControl
              direction="prev"
              size={30}
              label="Previous suggestion"
              onClick={() => setIndex((value) => (value - 1 + products.length) % products.length)}
            />
            <span className="tabular-nums">
              {index + 1}/{products.length}
            </span>
            <RoundControl
              direction="next"
              size={30}
              label="Next suggestion"
              onClick={() => setIndex((value) => (value + 1) % products.length)}
            />
          </div>
        ) : null}
      </div>

      <div className="bg-surface-secondary flex items-center gap-4 rounded-xl p-3.5">
        <Link
          href={`/products/${current.handle}`}
          className="bg-surface block size-[68px] shrink-0 overflow-hidden rounded-lg"
          tabIndex={-1}
          aria-hidden="true"
        >
          {image ? (
            <img
              src={shopifyImageUrl(image.url, { width: 200, height: 200, crop: "center" })}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              width={200}
              height={200}
            />
          ) : null}
        </Link>

        <div className="min-w-0 flex-1">
          <p className="m-0 text-[14.5px] leading-snug">
            <Link href={`/products/${current.handle}`} className="text-on-surface">
              {current.title}
            </Link>
          </p>
          <p className="text-on-surface m-0 mt-1 text-[14.5px]">
            {formatPrice(current.priceRange.minVariantPrice)}
          </p>
        </div>

        {variantId ? (
          <form {...formProps({ afterSubmit: openCartDrawer })} className="shrink-0">
            <input type="hidden" {...register("merchandiseId", { value: variantId })} />
            <input type="hidden" {...register("quantity", { value: 1 })} />
            <button
              type="submit"
              {...register("add")}
              aria-label={`Add ${current.title} to cart`}
              className="bg-surface text-on-surface focus-visible:outline-accent inline-flex size-11 cursor-pointer items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-transform motion-safe:active:scale-[0.92]"
            >
              <Icon d={ICON_PATHS.bag} size={18} />
            </button>
          </form>
        ) : (
          <Link
            href={`/products/${current.handle}`}
            className="text-sand-700 border-border shrink-0 rounded-full border px-4 py-2.5 text-[13px] no-underline"
          >
            View
          </Link>
        )}
      </div>
    </section>
  );
}

/**
 * The spec sheet. "Description" is the product's own copy from Shopify; the
 * rest comes from what kind of piece this is — see `product-spec.ts` for where
 * the measurements live and how to move them onto the product itself.
 */
function ProductAccordions({ product }: { product: ProductData }) {
  const tags = product.tags ?? [];
  const spec = specFromTags(tags);
  const dimensions = dimensionsFromTags(tags);
  const swatch = swatchFromTags(tags);
  const material = subtitleFromTags(tags);

  const panels: Array<{ id: string; title: string; body: ReactNode }> = [
    {
      id: "details",
      title: "Description",
      body: (
        <div
          className="richtext text-sand-700 max-w-[520px] pb-5 text-[14px] leading-[1.65]"
          dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
        />
      ),
    },
  ];

  if (spec) {
    panels.push({
      id: "features",
      title: "Features",
      body: (
        <div className="text-sand-700 max-w-[520px] pb-5 text-[14px] leading-[1.65]">
          <ul role="list" className="mb-3 flex flex-col gap-1.5">
            {[
              material ? `${material} over a kiln-dried hardwood frame.` : null,
              swatch ? `Shown in ${swatch.name}.` : null,
              ...spec.details,
            ]
              .filter((line): line is string => Boolean(line))
              .map((line) => (
                <li key={line} className="before:text-sand-500 before:mr-2 before:content-['—']">
                  {line}
                </li>
              ))}
          </ul>
          <p className="m-0">{spec.care}</p>
        </div>
      ),
    });
  }

  if (dimensions.length > 0) {
    panels.push({
      id: "dimensions",
      title: "Dimensions",
      body: (
        <dl className="text-sand-700 max-w-[520px] pb-5 text-[14px] leading-[1.65]">
          {dimensions.map((row) => (
            <div
              key={row.label}
              className="border-border flex justify-between gap-6 border-b py-2.5 last:border-0"
            >
              <dt>{row.label}</dt>
              <dd className="text-on-surface">{row.value}</dd>
            </div>
          ))}
        </dl>
      ),
    });
  }

  if (spec) {
    panels.push({
      id: "assembly",
      title: "Assembly",
      body: (
        <p className="text-sand-700 max-w-[520px] pb-5 text-[14px] leading-[1.65]">
          {spec.assembly}
        </p>
      ),
    });
  }

  panels.push({
    id: "delivery",
    title: "Delivery, warranty and returns",
    body: (
      <p className="text-sand-700 max-w-[520px] pb-5 text-[14px] leading-[1.65]">
        Dispatched within three business days from Melbourne. Complimentary white-glove delivery on
        orders over $1,500 — we carry it in, place it and take the packaging away. Ten-year frame
        guarantee, and thirty days to change your mind.
      </p>
    ),
  });

  return (
    <div className="border-border mt-2 flex flex-col border-t">
      <h2 className="sr-only">Product details</h2>
      {panels.map((panel) => (
        <details key={panel.id} className="group border-border border-b" name="product-details">
          <summary className="marker-hidden text-on-surface flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[15px]">
            {panel.title}
            <PlusMinus />
          </summary>
          {panel.body}
        </details>
      ))}
    </div>
  );
}

/**
 * The things that are nobody's fault but are worth saying before the piece is
 * in the room. Boxed and dashed so it reads as a note rather than as marketing.
 */
function GoodToKnow({ product }: { product: ProductData }) {
  const spec = specFromTags(product.tags ?? []);
  if (!spec) return null;

  return (
    <section className="border-border mt-6 rounded-xl border border-dashed p-5" aria-labelledby="know-heading">
      <h2
        id="know-heading"
        className="text-on-surface m-0 mb-3 flex items-center gap-2 text-[14.5px]"
      >
        <Icon d="M12 8.5v5m0 3.2v.1M12 3.5 2.5 20h19Z" size={17} className="text-walnut-700" />
        Good to know
      </h2>
      <ul role="list" className="text-sand-700 flex list-disc flex-col gap-2 ps-5 text-[13.5px] leading-[1.6]">
        <li>Measure your doorways, hallway and any turn on the stairs before ordering.</li>
        <li>{spec.assembly}</li>
        <li>{spec.care}</li>
        <li>Timber grain and fabric tone vary piece to piece — that is the material, not a fault.</li>
      </ul>
    </section>
  );
}

/**
 * When it lands. Rendered after mount rather than during it: the window is
 * counted off today's date, and a server-rendered date would disagree with the
 * browser's the moment the two sit either side of midnight.
 */
function DeliveryWindow() {
  const [window, setWindow] = useState<string | null>(null);

  useEffect(() => {
    const format = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
    };
    // Three business days on the bench, then five to eight in transit.
    setWindow(`${format(8)} – ${format(13)}`);
  }, []);

  if (!window) return null;

  return (
    <p className="text-sand-700 mt-3.5 text-center text-[13.5px]">
      Reaches your home: <span className="text-on-surface">{window}</span>
    </p>
  );
}

/** Collection from the showroom floor, stated where the buy button is. */
function PickupLine() {
  return (
    <div className="mt-4 flex items-start gap-2.5">
      <Icon d="m4.5 12.5 5 5 10-11" size={17} className="text-success mt-0.5 shrink-0" />
      <p className="text-sand-700 m-0 text-[13.5px] leading-[1.6]">
        Collection from <span className="text-on-surface">our Northcote showroom</span>. Usually
        ready in 2–4 days.{" "}
        <a href="#where-heading" className="text-on-surface underline underline-offset-2">
          View showroom details
        </a>
      </p>
    </div>
  );
}

/** The two promises that decide a furniture purchase, side by side. */
function GuaranteeRow() {
  const items = [
    { label: "30-day returns", d: "M9 5 4 10l5 5M4 10h9a7 7 0 0 1 0 14h-1" },
    { label: "Ten-year frame guarantee", d: "M12 3.5 5 6.5v5c0 4.5 2.9 8.4 7 9.5 4.1-1.1 7-5 7-9.5v-5Z" },
  ];

  return (
    <ul
      role="list"
      className="border-border text-sand-700 mt-6 grid grid-cols-2 gap-3 border-t py-4 text-[13px]"
    >
      {items.map((item) => (
        <li key={item.label} className="flex items-center justify-center gap-2.5 text-center">
          <Icon d={item.d} size={17} className="text-walnut-700 shrink-0" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Where to get it: whether it is in stock, what delivery costs, and where you
 * can go and sit on it before deciding.
 */
function WhereToGetIt({ selectedVariant }: { selectedVariant: VariantData | null }) {
  const inStock = selectedVariant?.availableForSale ?? true;

  return (
    <section className="mt-7 scroll-mt-32" aria-labelledby="where-heading">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 id="where-heading" className="font-heading m-0 text-[19px] font-light">
          Where to get it
        </h2>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] ${
            inStock ? "bg-walnut-900 text-[#f6efe6]" : "border-border text-sand-700 border"
          }`}
        >
          <span
            aria-hidden="true"
            className={`block size-[7px] rounded-full ${inStock ? "bg-walnut-300" : "bg-sand-500"}`}
          />
          {inStock ? "In stock" : "Made to order"}
        </span>
      </div>

      <ul role="list" className="border-border bg-surface-secondary flex flex-col rounded-lg border">
        <li className="border-border flex items-start gap-3.5 border-b p-4">
          <Icon
            d="M3 16V7h11v9M14 11h4l3 3v2h-7M6.5 19a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2ZM17.5 19a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z"
            size={19}
            className="text-walnut-700 mt-0.5 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-on-surface m-0 text-[14px]">Delivery — calculated per shipment</p>
            <p className="text-sand-600 m-0 mt-0.5 text-[13px]">
              Ships from Melbourne. Free white-glove delivery over $1,500.
            </p>
          </div>
        </li>
        <li className="flex items-start gap-3.5 p-4">
          <Icon
            d="M4 9h16l-1 11H5ZM4 9l1.5-4h13L20 9M9 13v3M15 13v3"
            size={19}
            className="text-walnut-700 mt-0.5 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-on-surface m-0 text-[14px]">Locate our showroom</p>
            <p className="text-sand-600 m-0 mt-0.5 text-[13px]">
              Northcote, Melbourne — on the floor Thursday to Sunday.
            </p>
          </div>
        </li>
      </ul>
    </section>
  );
}

/**
 * The card that follows you down the page once the buy button has scrolled
 * away — a floating card rather than a full-width bar, so the page still shows
 * through either side of it. It is a second form on the same product context,
 * so adding from here is the same submit as adding from the main one.
 */
function StickyBuyBar({ product }: { product: ProductData }) {
  const { options, selectedVariant, register, formProps, pending } = useProductForm();
  const [shown, setShown] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const addable = canAddToCart(product, options);
  const colourways = useColourways(product.title);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;

    // Only once the buy button is above the viewport — a bar that appears
    // while the real button is still on screen is two buttons doing one job.
    const observer = new IntersectionObserver(
      ([entry]) => setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const image = selectedVariant?.image ?? product.featuredImage;
  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;

  return (
    <>
      <div ref={sentinel} aria-hidden="true" />
      {/* Cleared of the mobile tab bar on a phone; a plain margin from the
          bottom of the window from md, where there is no tab bar. */}
      <div
        className="px-margin pointer-events-none fixed inset-x-0 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+5.25rem))] z-40 md:bottom-6"
        // Hidden from everything, not just from view: the same controls are
        // already in the page above, and a screen reader should not meet them
        // twice.
        aria-hidden={!shown}
        inert={!shown}
      >
        <div
          className={`bg-surface pointer-events-auto mx-auto flex max-w-[880px] items-center gap-4 rounded-full py-2.5 ps-2.5 pe-2.5 shadow-[0_10px_40px_-8px_rgb(32_30_29/0.28)] motion-safe:transition-[transform,opacity] motion-safe:duration-300 ${
            shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[140%] opacity-0"
          }`}
        >
          {image ? (
            <img
              src={shopifyImageUrl(image.url, { width: 140, height: 140, crop: "center" })}
              alt=""
              className="bg-surface-secondary hidden size-[52px] shrink-0 rounded-full object-cover sm:block"
              width={140}
              height={140}
            />
          ) : null}

          {colourways.length > 1 ? (
            <ul role="list" className="hidden shrink-0 items-center gap-1.5 lg:flex">
              {colourways.slice(0, 8).map((colourway) => (
                <li key={colourway.handle}>
                  <Link
                    href={`/products/${colourway.handle}`}
                    aria-label={colourway.title}
                    title={colourway.colorName ?? colourway.title}
                    tabIndex={shown ? 0 : -1}
                    className="border-border block size-[19px] rounded-full border"
                    style={{
                      background: colourway.hex ?? "var(--color-surface-secondary)",
                      boxShadow:
                        colourway.handle === product.handle
                          ? "0 0 0 2px var(--color-surface), 0 0 0 3.5px var(--color-interactive)"
                          : undefined,
                    }}
                  />
                </li>
              ))}
            </ul>
          ) : null}

          <div className="min-w-0 flex-1 ps-1.5">
            <p className="text-on-surface m-0 truncate text-[14px]">{product.title}</p>
            <p className="text-sand-600 m-0 text-[13px]">{formatPrice(price)}</p>
          </div>

          <form {...formProps({ afterSubmit: openCartDrawer })} className="shrink-0">
            <input type="hidden" {...register("merchandiseId", {})} />
            <input type="hidden" {...register("quantity", { value: 1 })} />
            <button
              type="submit"
              className="button-primary focus-visible:outline-accent inline-flex h-11 cursor-pointer items-center justify-center gap-2.5 rounded-full px-6 text-[14px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!addable || pending}
              tabIndex={shown ? 0 : -1}
            >
              Add to cart
              <span aria-hidden="true" className="hidden opacity-60 sm:inline">
                —
              </span>
              <span className="hidden sm:inline">{formatPrice(price)}</span>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

/** Back to the top of a long page, once there is a page above you. */
function BackToTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 1200);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      tabIndex={shown ? 0 : -1}
      aria-hidden={!shown}
      className={`bg-walnut-900 focus-visible:outline-accent fixed end-5 bottom-[max(9.5rem,calc(env(safe-area-inset-bottom)+9.25rem))] z-40 inline-flex size-11 items-center justify-center rounded-full text-[#f6efe6] shadow-[0_6px_20px_-4px_rgb(32_30_29/0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[opacity,transform] motion-safe:duration-300 md:bottom-24 ${
        shown ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <Icon d="M12 19V6m0 0-6 6m6-6 6 6" size={18} />
    </button>
  );
}

/**
 * The picture cards under the buy box: what this kind of piece is made of and
 * why, one claim per card, each against a photograph of the piece itself. A
 * scroller rather than a grid, because the third card half in view is what
 * tells you to keep going.
 */
function HighlightCards({ product }: { product: ProductData }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const spec = specFromTags(product.tags ?? []);

  const images = useMemo(() => {
    const seen = new Set<string>();
    return [...product.images.nodes, product.featuredImage].flatMap((image) => {
      if (!image?.url || seen.has(image.url)) return [];
      seen.add(image.url);
      return [image];
    });
  }, [product]);

  const page = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.6, behavior: "smooth" });
  }, []);

  if (!spec || spec.highlights.length === 0) return null;

  return (
    <section className="max-w-page px-margin mx-auto pt-14 md:pt-20" aria-label="Why this piece">
      <div className="relative">
        <div
          ref={trackRef}
          className="scrollbar-none flex snap-x snap-mandatory gap-5 overflow-x-auto pb-1"
        >
          {spec.highlights.map((highlight, index) => {
            const image = images[index % Math.max(1, images.length)];
            return (
              <article
                key={highlight.title}
                className="bg-surface-secondary flex w-[86vw] shrink-0 snap-start flex-col overflow-hidden rounded-2xl md:w-[calc((100%-2.5rem)/2)] md:flex-row"
              >
                {image ? (
                  <img
                    src={shopifyImageUrl(image.url, { width: 700, height: 700, crop: "center" })}
                    srcSet={srcSetFor(image.url, { width: 700, height: 700, crop: "center" })}
                    sizes="(min-width: 768px) 25vw, 86vw"
                    alt=""
                    className="aspect-[4/3] w-full object-cover md:aspect-auto md:h-[300px] md:w-[45%]"
                    loading="lazy"
                    width={700}
                    height={700}
                  />
                ) : null}
                <div className="flex flex-1 flex-col justify-center gap-3 p-6 md:p-8">
                  <h3 className="font-heading m-0 text-[24px] leading-[1.1] font-light tracking-[-0.02em] md:text-[28px]">
                    {highlight.title}
                  </h3>
                  <p className="text-sand-700 m-0 text-[14px] leading-[1.6]">{highlight.body}</p>
                </div>
              </article>
            );
          })}
        </div>

        {spec.highlights.length > 1 ? (
          <div className="pointer-events-none absolute inset-y-0 start-4 end-4 hidden items-center justify-between md:flex">
            <RoundControl
              direction="prev"
              label="Previous card"
              size={44}
              className="pointer-events-auto"
              onClick={() => page(-1)}
            />
            <RoundControl
              direction="next"
              label="Next card"
              size={44}
              className="pointer-events-auto"
              onClick={() => page(1)}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * The range, told once: a photograph beside the paragraph. Both come from the
 * type rather than the product, so every sofa page carries the same sofa story
 * — which is what makes it worth writing well.
 */
function TypeStory({ product }: { product: ProductData }) {
  const tags = product.tags ?? [];
  const spec = specFromTags(tags);
  const image = product.images.nodes.at(-1) ?? product.featuredImage;
  if (!spec) return null;

  return (
    <section className="max-w-page px-margin mx-auto pt-16 md:pt-24" aria-labelledby="story-heading">
      <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-16">
        {image ? (
          <img
            src={shopifyImageUrl(image.url, { width: 900, height: 900, crop: "center" })}
            srcSet={srcSetFor(image.url, { width: 900, height: 900, crop: "center" })}
            sizes="(min-width: 768px) 45vw, 100vw"
            alt=""
            className="bg-surface-secondary aspect-square w-full rounded-2xl object-cover"
            loading="lazy"
            width={900}
            height={900}
          />
        ) : null}
        <div>
          <p className="type-overline text-walnut-700 mb-4">{spec.plural}</p>
          <h2
            id="story-heading"
            className="font-heading m-0 max-w-[520px] text-[28px] leading-[1.08] font-light tracking-[-0.025em] text-pretty md:text-[38px]"
          >
            {spec.intro.title}
          </h2>
          <p className="text-sand-700 mt-5 max-w-[560px] text-[15px] leading-relaxed md:text-[16.5px]">
            {spec.intro.body}
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * The questions people ask before buying this kind of piece, on a band of its
 * own so the page changes gear: heading held on the left, answers on the right.
 */
function FaqBand({ product }: { product: ProductData }) {
  const type = typeFromTags(product.tags ?? []);
  const faqs = type ? faqsForType(type) : [];
  if (faqs.length === 0) return null;

  return (
    <section
      className="bg-walnut-700 mt-16 text-[#f6efe6] md:mt-24"
      aria-labelledby="faq-heading"
    >
      <div className="max-w-page px-margin mx-auto grid grid-cols-1 gap-8 py-16 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] md:gap-16 md:py-24">
        <h2
          id="faq-heading"
          className="font-heading m-0 text-[30px] leading-[1.05] font-light tracking-[-0.025em] md:text-[44px]"
        >
          Frequently asked questions
        </h2>

        <div className="flex flex-col">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group border-b border-[color:rgb(246_239_230/0.32)]"
              name="product-faq"
            >
              <summary className="marker-hidden flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[15px] md:text-[16.5px]">
                {faq.question}
                <PlusMinus size={17} />
              </summary>
              <p className="mt-0 mb-5 max-w-[680px] text-[14.5px] leading-[1.65] text-[color:rgb(246_239_230/0.82)]">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductInfo({
  product,
  complementaryProducts,
}: {
  product: ProductData;
  complementaryProducts: RelatedProduct[];
}) {
  const { selectedVariant } = useProductForm();
  const tags = product.tags ?? [];
  const swatch = swatchFromTags(tags);
  const subtitle = subtitleFromTags(tags);
  const room = roomFromTags(tags);
  const colourways = useColourways(product.title);
  const sizes = usePieceOptions(product.title, tags);
  const spec = specFromTags(tags);
  const price = selectedVariant?.price ?? product.priceRange.minVariantPrice;

  return (
    <div className="flex flex-col gap-0">
      <ProductViewedTracker product={product} selectedVariant={selectedVariant} />
      <div className="pt-4 md:pt-0">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <p className="type-overline text-walnut-700 m-0">The Quiet Rooms</p>
          {room ? <RoomTagLink room={room} /> : null}
        </div>
        <h1 className="font-heading text-[32px] leading-[1.06] font-light tracking-[-0.025em] text-pretty md:text-[46px]">
          {product.title}
        </h1>
        {subtitle ? <p className="text-sand-600 mt-2.5 text-[15px]">{subtitle}</p> : null}
      </div>
      <span className="sr-only" aria-live="polite" id="inventory-status" />

      {/* Colourways. Each finish is its own product in this catalogue, so the
          swatches are links between sibling products rather than variant
          buttons — same behaviour as the design, no catalogue restructuring. */}
      {colourways.length > 1 ? (
        <div className="mt-6">
          <p className="text-sand-700 mb-3 text-[13.5px]">
            {spec?.finishLabel ?? "Fabric"} : <span className="text-on-surface">{swatch?.name ?? ""}</span>
          </p>
          <ul role="list" className="flex flex-wrap gap-3">
            {colourways.map((colourway) => {
              const isCurrent = colourway.handle === product.handle;
              return (
                <li key={colourway.handle}>
                  <Link
                    href={`/products/${colourway.handle}`}
                    aria-current={isCurrent ? "page" : undefined}
                    aria-label={colourway.title}
                    title={colourway.colorName ?? colourway.title}
                    className="border-border focus-visible:outline-accent block size-11 rounded-full border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-transform"
                    style={{
                      background: colourway.hex ?? "var(--color-surface-secondary)",
                      boxShadow: isCurrent
                        ? "0 0 0 3px var(--color-surface), 0 0 0 4.5px var(--color-interactive)"
                        : undefined,
                      transform: isCurrent ? "scale(1.06)" : undefined,
                    }}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ) : swatch ? (
        <div className="mt-6">
          <p className="text-sand-700 mb-3 text-[13.5px]">
            {spec?.finishLabel ?? "Fabric"} : <span className="text-on-surface">{swatch.name}</span>
          </p>
          <span
            className="border-border ring-interactive inline-block size-11 rounded-full border ring-2 ring-offset-2 ring-offset-[color:var(--color-surface)]"
            style={{ background: swatch.hex }}
            title={swatch.name}
          />
        </div>
      ) : null}

      {/* Sizes are separate products in this catalogue — a short plinth and a
          tall one — so the choice is a row of links, not variant buttons. */}
      {sizes.length > 1 ? (
        <div className="mt-7">
          <span className="type-overline text-sand-700 mb-3 block">Size</span>
          <ul role="list" className="flex flex-wrap gap-2.5">
            {sizes.map((size) => {
              const isCurrent = size.handle === product.handle;
              return (
                <li key={size.handle}>
                  <Link
                    href={`/products/${size.handle}`}
                    aria-current={isCurrent ? "page" : undefined}
                    className={`focus-visible:outline-accent inline-flex min-h-11 items-center rounded-[7px] border px-5 text-[14px] no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors ${
                      isCurrent
                        ? "border-on-surface text-on-surface"
                        : "border-border text-sand-700 hover:border-on-surface hover:text-on-surface"
                    }`}
                  >
                    {size.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="font-heading mt-6 text-[26px] md:text-[30px]">
        <PriceBlock product={product} selectedVariant={selectedVariant} />
      </div>
      <p className="text-sand-600 mt-1.5 text-[13px]">
        GST included. Delivery calculated at checkout.
      </p>
      <p className="text-sand-700 mt-2.5 text-[13.5px]">
        or 4 interest-free payments of{" "}
        <span className="text-on-surface font-medium">{formatPrice(instalment(price))}</span>
      </p>
      <StockLine selectedVariant={selectedVariant} />

      <div className="mt-6">
        <VariantSelector product={product} />
      </div>
      <AddToCartForm product={product} />
      <DeliveryWindow />
      <PickupLine />
      <StickyBuyBar product={product} />

      <PairsWellWith products={complementaryProducts} />

      <GuaranteeRow />
      <ProductAccordions product={product} />
      <GoodToKnow product={product} />
      <WhereToGetIt selectedVariant={selectedVariant} />

      <a
        href="#swatch-heading"
        className="button-secondary focus-visible:outline-accent mt-4 mb-7 inline-flex w-full items-center justify-center rounded-full py-4 text-[14px] no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Order free fabric samples
      </a>
    </div>
  );
}

export function ProductDetails({
  product,
  relatedProducts,
  complementaryProducts,
}: {
  product: ProductData;
  relatedProducts: RelatedProduct[];
  complementaryProducts: RelatedProduct[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const related = relatedProducts.filter((item) => item.handle !== product.handle).slice(0, 4);
  const complementary = complementaryProducts
    .filter((item) => item.handle !== product.handle)
    .slice(0, 4);

  return (
    <ProductProvider
      product={product}
      onSelect={(result) => {
        const nextHandle = result.selectedVariant?.product?.handle ?? product.handle;
        router.replace(variantUrl(product, result.selectedOptions, nextHandle, searchParams), {
          scroll: false,
        });
        if (result.status === "unresolved" || nextHandle !== product.handle) router.refresh();
      }}
    >
      <main className="flex-1" id="main-content" tabIndex={-1}>
        <nav aria-label="Breadcrumb" className="max-w-page px-margin mx-auto w-full pt-5.5">
          <ol className="text-sand-600 flex flex-wrap items-center gap-2 text-[12.5px]">
            <li>
              <Link href="/" className="hover:text-on-surface motion-safe:transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href="/collections/shop-all"
                className="hover:text-on-surface motion-safe:transition-colors"
              >
                Shop
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <span aria-current="page" className="text-on-surface">
                {product.title}
              </span>
            </li>
          </ol>
        </nav>

        <section className="max-w-page px-margin mx-auto w-full pt-6 pb-4">
          {/* Buy box left, gallery right on desktop — the reverse on a phone,
              where the piece has to be seen before it can be read about. */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_1.15fr] md:items-start md:gap-14">
            <div className="order-2 md:order-1">
              <ProductInfo product={product} complementaryProducts={complementary} />
            </div>
            <div className="relative order-1 md:order-2 md:sticky md:top-24">
              <ProductDetailsGallery product={product} />
            </div>
          </div>
        </section>

        <HighlightCards product={product} />
        <TypeStory product={product} />

        {/* Search & Discovery's COMPLEMENTARY intent where it is configured,
            otherwise picked by type — see `pairWith` on the route. */}
        <RecommendationShelf title="Pair it with our picks" products={complementary} />
        <RecommendationShelf title="You may also like" products={related} />

        <FaqBand product={product} />
        <BackToTop />
      </main>
    </ProductProvider>
  );
}

function RecommendationShelf({
  title,
  products,
}: {
  title: string;
  products: RelatedProduct[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="py-4">
      <div className="pt-12">
        <h2 className="type-display max-w-page px-margin mx-auto mb-7">{title}</h2>
        <div className="max-w-page px-margin mx-auto contain-paint">
          <ul role="list" className="grid grid-cols-2 gap-x-5.5 gap-y-8 lg:grid-cols-4">
            {products.map((product, index) => (
              <li key={product.id}>
                <ProductCard
                  product={product}
                  priority={index === 0}
                  sizes="(min-width: 1024px) 23vw, 50vw"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function ProductDetailsGallery({ product }: { product: ProductData }) {
  const { selectedVariant } = useProductForm();
  return <ProductGallery product={product} selectedVariant={selectedVariant} />;
}
