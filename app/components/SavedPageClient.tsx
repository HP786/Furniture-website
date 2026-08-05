"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { ProductCardData } from "../lib/product-card-fragment";
import { collectionHref } from "../lib/navigation";
import { useSaved } from "../lib/saved";
import { ProductCard } from "./ProductCard";
import { Arrow } from "./WalnutMark";

export function SavedPageClient() {
  const { handles, count, clear } = useSaved();
  const [products, setProducts] = useState<ProductCardData[] | null>(null);

  const key = handles.join(",");

  useEffect(() => {
    if (key === "") {
      setProducts([]);
      return;
    }

    const controller = new AbortController();
    setProducts(null);

    fetch(`/api/saved-products?handles=${encodeURIComponent(key)}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : { products: [] }))
      .then((data) => setProducts(data.products ?? []))
      .catch(() => {
        // An aborted request is a newer one taking over, not a failure.
        if (!controller.signal.aborted) setProducts([]);
      });

    return () => controller.abort();
  }, [key]);

  return (
    <main className="flex-1" id="main-content" tabIndex={-1}>
      <div className="max-w-page px-margin mx-auto w-full py-8 md:py-12">
        <nav aria-label="Breadcrumb" className="mb-5">
          <ol className="text-sand-600 flex items-center gap-2 text-[12.5px]">
            <li>
              <Link href="/" className="hover:text-on-surface motion-safe:transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <span aria-current="page" className="text-on-surface">
                Saved
              </span>
            </li>
          </ol>
        </nav>

        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="type-overline text-walnut-700 mb-3">Your list</p>
            <h1 className="type-display text-on-surface">Saved</h1>
          </div>
          {count > 0 ? (
            <button
              type="button"
              onClick={clear}
              className="text-sand-600 hover:text-on-surface focus-visible:outline-accent cursor-pointer bg-transparent text-[13px] tracking-[0.1em] uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors"
            >
              Clear all
            </button>
          ) : null}
        </div>

        {products === null ? (
          <p className="text-sand-600 text-[15px]">Loading your saved pieces…</p>
        ) : products.length > 0 ? (
          <ul
            role="list"
            className="grid grid-cols-2 gap-x-5.5 gap-y-8 lg:grid-cols-4"
            data-testid="saved-grid"
          >
            {products.map((product, index) => (
              <li key={product.id}>
                <ProductCard
                  product={product}
                  priority={index < 4}
                  sizes="(min-width: 1024px) 23vw, 50vw"
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-border bg-surface-secondary rounded-lg border p-10 text-center">
            <p className="type-heading-sm text-on-surface">Nothing saved yet</p>
            <p className="text-sand-600 mx-auto mt-2 max-w-[380px] text-[14px]">
              Tap the heart on any piece to keep it here while you decide.
            </p>
            <Link
              href={collectionHref("shop-all")}
              className="button-primary rounded-button focus-visible:outline-accent mt-6 inline-flex items-center gap-2 px-6 py-3.5 text-[14px] no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Browse the range
              <Arrow size={16} />
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
