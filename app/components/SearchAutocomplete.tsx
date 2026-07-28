"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { shopifyImageUrl } from "../lib/image";
import { formatPrice } from "../lib/money";
import {
  EMPTY_PREDICTIVE_RESULTS,
  type PredictiveSearchResults,
} from "../lib/predictive-search-types";

const DEBOUNCE_MS = 200;

type Option = { key: string; href: string; label: string };

// Flat list of everything rendered, in visual order, so arrow keys and the
// active-descendant announcement can walk the panel as one listbox.
function toOptions(results: PredictiveSearchResults): Option[] {
  return [
    ...results.queries.map((suggestion) => ({
      key: `query:${suggestion.text}`,
      href: `/search?q=${encodeURIComponent(suggestion.text)}`,
      label: suggestion.text,
    })),
    ...results.products.map((product) => ({
      key: `product:${product.id}`,
      href: `/products/${product.handle}`,
      label: product.title,
    })),
    ...results.collections.map((collection) => ({
      key: `collection:${collection.id}`,
      href: `/collections/${collection.handle}`,
      label: collection.title,
    })),
  ];
}

export function SearchAutocomplete({
  defaultValue = "",
  id = "search-q",
  autoFocus = false,
}: {
  defaultValue?: string;
  id?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const panelId = useId();
  const [term, setTerm] = useState(defaultValue);
  // Results are stored alongside the term they belong to, so what's on screen
  // always matches what's in the box — no stale suggestions during typing.
  const [fetched, setFetched] = useState<{ term: string | null; results: PredictiveSearchResults }>({
    term: null,
    results: EMPTY_PREDICTIVE_RESULTS,
  });
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = term.trim();
  const isDefaultSuggestions = query === "";
  const results = fetched.term === query ? fetched.results : EMPTY_PREDICTIVE_RESULTS;
  const loading = fetched.term !== query;

  const options = toOptions(results);
  const hasResults = options.length > 0;

  // Debounced fetch, including the empty query — Shopify answers that one with
  // default suggestions, so opening the box already has something to show. Each
  // keystroke aborts the in-flight request so a slow early response can never
  // overwrite a newer one.
  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/predictive-search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : EMPTY_PREDICTIVE_RESULTS))
        .then((data: PredictiveSearchResults) => setFetched({ term: query, results: data }))
        .catch(() => {});
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (!open || !hasResults) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = activeIndex + step;
      setActiveIndex(next < -1 ? options.length - 1 : next >= options.length ? -1 : next);
      return;
    }
    // Enter with a highlighted row goes straight to it; otherwise the form
    // submits normally to the full results page.
    if (event.key === "Enter" && activeIndex >= 0 && activeIndex < options.length) {
      event.preventDefault();
      close();
      router.push(options[activeIndex].href);
    }
  }

  const activeOption = activeIndex >= 0 && activeIndex < options.length ? options[activeIndex] : null;
  const showPanel = open;

  return (
    <div ref={containerRef} className="relative">
      <form action="/search" method="get" role="search" className="space-y-2">
        <label htmlFor={id} className="type-body-sm text-on-surface block font-medium">
          Search
        </label>
        <div className="relative">
          <img
            src="/icons/icon-search.svg"
            alt=""
            className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            id={id}
            type="search"
            name="q"
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setActiveIndex(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="ps-10 pe-12"
            placeholder="Search products"
            autoComplete="off"
            autoFocus={autoFocus}
            role="combobox"
            aria-expanded={showPanel && hasResults}
            aria-controls={panelId}
            aria-autocomplete="list"
            aria-activedescendant={activeOption ? `${panelId}-${activeIndex}` : undefined}
          />
          {term ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setTerm("");
                close();
                inputRef.current?.focus();
              }}
              className="button-icon focus-visible:outline-accent absolute end-1 top-1/2 inline-flex -translate-y-1/2 cursor-pointer items-center justify-center rounded bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <img src="/icons/icon-x.svg" alt="" className="size-5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </form>

      <span aria-live="polite" className="sr-only">
        {showPanel && !loading
          ? hasResults
            ? `${options.length} suggestions available`
            : "No suggestions"
          : ""}
      </span>

      {showPanel && hasResults ? (
        <div
          id={panelId}
          role="listbox"
          aria-label="Search suggestions"
          className="border-border bg-surface absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-lg border shadow-lg"
        >
          {results.queries.length > 0 ? (
            <Section title="Suggestions">
              {results.queries.map((suggestion) => {
                const index = options.findIndex((o) => o.key === `query:${suggestion.text}`);
                return (
                  <Row
                    key={suggestion.text}
                    id={`${panelId}-${index}`}
                    href={`/search?q=${encodeURIComponent(suggestion.text)}`}
                    active={index === activeIndex}
                    onHover={() => setActiveIndex(index)}
                    onSelect={close}
                  >
                    <img
                      src="/icons/icon-search.svg"
                      alt=""
                      className="size-4 shrink-0 opacity-60"
                      aria-hidden="true"
                    />
                    {/* styledText is Shopify-generated markup that <b>-wraps the matched span. */}
                    <span
                      className="type-body-sm text-on-surface truncate"
                      dangerouslySetInnerHTML={{ __html: suggestion.styledText }}
                    />
                  </Row>
                );
              })}
            </Section>
          ) : null}

          {results.products.length > 0 ? (
            <Section title={isDefaultSuggestions ? "Popular right now" : "Products"}>
              {results.products.map((product) => {
                const index = options.findIndex((o) => o.key === `product:${product.id}`);
                return (
                  <Row
                    key={product.id}
                    id={`${panelId}-${index}`}
                    href={`/products/${product.handle}`}
                    active={index === activeIndex}
                    onHover={() => setActiveIndex(index)}
                    onSelect={close}
                  >
                    <span className="bg-surface-secondary size-12 shrink-0 overflow-hidden rounded">
                      {product.image ? (
                        <img
                          src={shopifyImageUrl(product.image.url, {
                            width: 96,
                            height: 96,
                            crop: "center",
                          })}
                          alt={product.image.altText ?? ""}
                          width={48}
                          height={48}
                          className="size-12 object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="type-body-sm text-on-surface block truncate">
                        {product.title}
                      </span>
                      <span className="text-on-surface-secondary block text-sm">
                        {formatPrice(product.price)}
                      </span>
                    </span>
                  </Row>
                );
              })}
            </Section>
          ) : null}

          {results.collections.length > 0 ? (
            <Section title={isDefaultSuggestions ? "Browse collections" : "Collections"}>
              {results.collections.map((collection) => {
                const index = options.findIndex((o) => o.key === `collection:${collection.id}`);
                return (
                  <Row
                    key={collection.id}
                    id={`${panelId}-${index}`}
                    href={`/collections/${collection.handle}`}
                    active={index === activeIndex}
                    onHover={() => setActiveIndex(index)}
                    onSelect={close}
                  >
                    <span className="type-body-sm text-on-surface truncate">{collection.title}</span>
                  </Row>
                );
              })}
            </Section>
          ) : null}

          {/* No "view all" for the default suggestions — there's no term to view. */}
          <div className={`border-border border-t ${isDefaultSuggestions ? "hidden" : ""}`}>
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              onClick={close}
              className="text-on-surface hover:bg-surface-secondary block px-4 py-3 text-sm font-medium no-underline"
            >
              View all results for “{query}”
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-border border-b last:border-b-0">
      <p className="text-on-surface-secondary px-4 pt-3 pb-1 text-xs font-medium tracking-wide uppercase">
        {title}
      </p>
      <ul role="presentation" className="pb-2">
        {children}
      </ul>
    </div>
  );
}

function Row({
  id,
  href,
  active,
  onHover,
  onSelect,
  children,
}: {
  id: string;
  href: string;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <li role="option" id={id} aria-selected={active}>
      <Link
        href={href}
        tabIndex={-1}
        onMouseEnter={onHover}
        onClick={onSelect}
        className={`flex items-center gap-3 px-4 py-2 no-underline ${
          active ? "bg-surface-secondary" : ""
        }`}
      >
        {children}
      </Link>
    </li>
  );
}
