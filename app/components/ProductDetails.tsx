"use client";

import { canAddToCart, type SelectedOption, type StorefrontApi } from "@shopify/hydrogen";
import { createProductComponents, ShopPayButton } from "@shopify/hydrogen/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import { openCartDrawer } from "../lib/cart-drawer";
import { shopifyImageUrl, srcSetFor } from "../lib/image";
import { formatPercentOff, formatPrice } from "../lib/money";
import { dimensionsFromTags, specFromTags } from "../lib/product-spec";
import { roomFromTags } from "../lib/rooms";
import { subtitleFromTags, swatchFromTags } from "../lib/swatches";
import { useColourways, usePieceOptions } from "./FamilyProvider";
import type { PRODUCT_QUERY } from "../products/[handle]/page";
import { ProductViewedTracker } from "./AnalyticsTrackers";
import { ProductCard } from "./ProductCard";
import { RoomTagLink } from "./RoomTag";
import { Icon } from "./WalnutMark";

type ProductQuery = StorefrontApi.ResultOf<typeof PRODUCT_QUERY>;
type ProductData = NonNullable<ProductQuery["product"]>;
type VariantData = NonNullable<ProductData["selectedOrFirstAvailableVariant"]>;
type RelatedProduct = NonNullable<ProductQuery["relatedProducts"]>[number];

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

function ProductGallery({
  product,
  selectedVariant,
}: {
  product: ProductData;
  selectedVariant: VariantData | null;
}) {
  const images = useMemo(() => {
    const seen = new Set<string>();
    const ordered = [
      selectedVariant?.image,
      product.featuredImage,
      ...product.images.nodes,
    ].flatMap((image) => {
      if (!image?.url || seen.has(image.url)) return [];
      seen.add(image.url);
      return [image];
    });
    return ordered;
  }, [product, selectedVariant]);

  if (images.length === 0) {
    return (
      <div data-testid="product-gallery" className="bg-surface-secondary aspect-[4/5] rounded-lg" />
    );
  }

  return (
    <div data-testid="product-gallery" className="flex flex-col gap-3.5">
      {/* On mobile the stage is a snap scroller; from md it becomes a single
          stage with the thumbnail strip below, as in the design. */}
      <div
        data-product-gallery-track
        className="scrollbar-none bg-surface-secondary flex snap-x snap-mandatory overflow-x-auto rounded-lg md:block md:overflow-visible"
        tabIndex={0}
        aria-label={`${product.title} gallery images`}
      >
        {images.map((image, index) => (
          <div
            key={image.url}
            role="group"
            aria-roledescription="slide"
            className={`w-full shrink-0 snap-center contain-paint ${index === 0 ? "md:block" : "md:hidden"}`}
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

      {images.length > 1 ? (
        <ul role="list" className="hidden grid-cols-4 gap-3.5 md:grid">
          {images.slice(0, 4).map((image, index) => (
            <li key={`thumb-${image.url}`}>
              <div
                className={`bg-surface-secondary aspect-square overflow-hidden rounded border-2 ${index === 0 ? "border-interactive" : "border-transparent"}`}
              >
                <img
                  src={shopifyImageUrl(image.url, { width: 300, height: 300, crop: "center" })}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  width={300}
                  height={300}
                />
              </div>
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

function InventoryHint({ selectedVariant }: { selectedVariant: VariantData | null }) {
  if (!selectedVariant) return null;
  if (!selectedVariant.availableForSale) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm" data-product-inventory>
        <span
          className="bg-critical inline-block h-2 w-2 shrink-0 rounded-full"
          aria-hidden="true"
        />
        <span className="text-critical font-medium">Out of stock</span>
      </div>
    );
  }

  const quantity = selectedVariant.quantityAvailable;
  if (typeof quantity === "number" && quantity > 0 && quantity <= 5) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm" data-product-inventory>
        <span
          className="bg-warning inline-block h-2 w-2 shrink-0 rounded-full"
          aria-hidden="true"
        />
        <span className="text-warning font-medium">Only {quantity} left in stock</span>
      </div>
    );
  }

  return null;
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

  return (
    <div data-product-form>
      <span className="sr-only" aria-live="polite" data-add-to-cart-status />
      <form {...formProps({ afterSubmit: openCartDrawer })}>
        <input type="hidden" {...register("merchandiseId", {})} />
        <div className="mt-6 mb-10 flex items-center gap-4">
          <div className="shrink-0">
            <label className="text-on-surface mb-2 block text-sm font-medium" htmlFor="quantity">
              Quantity
            </label>
            <div
              data-testid="quantity-stepper"
              className="quantity-selector-outlined rounded-input inline-flex items-center"
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
                onChange={(event) =>
                  setQuantity(Math.max(1, Number(event.currentTarget.value) || 1))
                }
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
        </div>
        <button
          type="submit"
          className="rounded-button button-primary focus-visible:outline-accent inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
          disabled={!addable || pending}
          data-testid="add-to-cart"
        >
          Add to cart
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
            height="44px"
            borderRadius="8px"
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * The spec sheet. "The detail" is the product's own copy from Shopify; the rest
 * comes from what kind of piece this is — see `product-spec.ts` for where the
 * measurements live and how to move them onto the product itself.
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
      title: "The detail",
      body: (
        <div
          className="richtext text-sand-700 max-w-[520px] pb-5 text-[14px] leading-[1.65]"
          dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
        />
      ),
    },
  ];

  if (dimensions.length > 0) {
    panels.push({
      id: "dimensions",
      title: "Dimensions",
      body: (
        <dl className="text-sand-700 max-w-[520px] pb-5 text-[14px] leading-[1.65]">
          {dimensions.map((row) => (
            <div key={row.label} className="border-border flex justify-between gap-6 border-b py-2.5 last:border-0">
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
      id: "materials",
      title: "Materials & care",
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

    panels.push({
      id: "assembly",
      title: "Assembly",
      body: (
        <p className="text-sand-700 max-w-[520px] pb-5 text-[14px] leading-[1.65]">{spec.assembly}</p>
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
    <div className="border-border flex flex-col border-t">
      <h2 className="sr-only">Product details</h2>
      {panels.map((panel, index) => (
        <details
          key={panel.id}
          className="group border-border border-b"
          name="product-details"
          open={index === 0}
        >
          <summary className="marker-hidden text-on-surface flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[14.5px]">
            {panel.title}
            <span
              className="shrink-0 group-open:rotate-180 motion-safe:transition-transform motion-safe:duration-300"
              aria-hidden="true"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </summary>
          {panel.body}
        </details>
      ))}
    </div>
  );
}

/**
 * The two rows every furniture page needs under the buy button: what delivery
 * costs, and where you can go and sit on it.
 */
function FulfilmentRows() {
  return (
    <ul role="list" className="border-border bg-surface-secondary my-6 flex flex-col rounded-lg border">
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
  );
}

function ProductInfo({ product }: { product: ProductData }) {
  const { selectedVariant } = useProductForm();
  const tags = product.tags ?? [];
  const swatch = swatchFromTags(tags);
  const subtitle = subtitleFromTags(tags);
  const room = roomFromTags(tags);
  const colourways = useColourways(product.title);
  const sizes = usePieceOptions(product.title, tags);
  const spec = specFromTags(tags);

  return (
    <div className="flex flex-col gap-0 md:sticky md:top-38 md:self-start">
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
        <div className="font-heading mt-4 text-[26px] md:text-[30px]">
          <PriceBlock product={product} selectedVariant={selectedVariant} />
        </div>
        <p className="text-sand-600 mt-1.5 text-[13px]">or four instalments — no interest</p>
        <InventoryHint selectedVariant={selectedVariant} />
      </div>
      <span className="sr-only" aria-live="polite" id="inventory-status" />

      {/* Colourways. Each finish is its own product in this catalogue, so the
          swatches are links between sibling products rather than variant
          buttons — same behaviour as the design, no catalogue restructuring. */}
      {colourways.length > 1 ? (
        <div className="mt-7">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="type-overline text-sand-700">{spec?.finishLabel ?? "Fabric"}</span>
            <span className="text-sand-600 text-[13.5px]">{swatch?.name ?? ""}</span>
          </div>
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
        <div className="mt-7">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="type-overline text-sand-700">{spec?.finishLabel ?? "Fabric"}</span>
            <span className="text-sand-600 text-[13.5px]">{swatch.name}</span>
          </div>
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

      <div className="mt-6">
        <VariantSelector product={product} />
      </div>
      <AddToCartForm product={product} />

      <FulfilmentRows />

      <a
        href="#swatch-heading"
        className="button-secondary rounded-button focus-visible:outline-accent mt-4 mb-7 inline-flex w-full items-center justify-center py-4 text-[14px] no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Order free fabric samples
      </a>

      <ProductAccordions product={product} />
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
          <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-[1.15fr_1fr] md:items-start md:gap-14">
            <div className="relative">
              <ProductDetailsGallery product={product} />
            </div>
            <ProductInfo product={product} />
          </div>
        </section>
        {/* Search & Discovery's COMPLEMENTARY intent where it is configured,
            otherwise picked by type — see `pairWith` on the route. */}
        <RecommendationShelf title="Pair it with our picks" products={complementary} />
        <RecommendationShelf title="You may also like" products={related} />
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
