"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { PieceOption, StoreIndex } from "../lib/family-index";
import { pieceKey } from "../lib/product-family";

const PieceContext = createContext<Map<string, PieceOption[]> | undefined>(undefined);

/**
 * Sizes, indexed across the catalogue.
 *
 * This used to carry colourways too, grouped by stripping finish words off
 * product titles. Colourways are Shopify variants now, so a product knows its
 * own — see `colourMapFrom` in ProductDetails. Sizes still cross product
 * boundaries (a short plinth and a tall one are two products), so the index
 * stays for those.
 */
export function FamilyProvider({ index, children }: { index: StoreIndex; children: ReactNode }) {
  const pieces = useMemo(() => new Map(index.pieces), [index.pieces]);

  return <PieceContext.Provider value={pieces}>{children}</PieceContext.Provider>;
}

/**
 * The sizes or shapes this piece is made in, or [] when it is made one way.
 * Ordered small to large where the labels say so, otherwise as indexed.
 */
const SIZE_ORDER = ["short", "low", "small", "round", "tall", "high", "large", "long"];

export function usePieceOptions(title: string, tags: readonly string[]): PieceOption[] {
  const index = useContext(PieceContext);
  const options = index?.get(pieceKey(title, tags));
  if (!options || options.length < 2) return [];

  return [...options].sort(
    (a, b) => SIZE_ORDER.indexOf(a.label.toLowerCase()) - SIZE_ORDER.indexOf(b.label.toLowerCase()),
  );
}
