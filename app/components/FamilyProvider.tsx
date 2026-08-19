"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { PieceOption, StoreIndex } from "../lib/family-index";
import { familyMembers, pieceKey, type FamilyIndex, type FamilyMember } from "../lib/product-family";

const FamilyContext = createContext<FamilyIndex | undefined>(undefined);
const PieceContext = createContext<Map<string, PieceOption[]> | undefined>(undefined);

export function FamilyProvider({ index, children }: { index: StoreIndex; children: ReactNode }) {
  const families = useMemo(() => new Map(index.families), [index.families]);
  const pieces = useMemo(() => new Map(index.pieces), [index.pieces]);

  return (
    <FamilyContext.Provider value={families}>
      <PieceContext.Provider value={pieces}>{children}</PieceContext.Provider>
    </FamilyContext.Provider>
  );
}

/** Colourways of the piece with this title, or [] when it only comes one way. */
export function useColourways(title: string): FamilyMember[] {
  const index = useContext(FamilyContext);
  return familyMembers(index, title);
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
