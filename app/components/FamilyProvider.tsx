"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { SerializedFamilyIndex } from "../lib/family-index";
import { familyMembers, type FamilyIndex, type FamilyMember } from "../lib/product-family";

const FamilyContext = createContext<FamilyIndex | undefined>(undefined);

export function FamilyProvider({
  index,
  children,
}: {
  index: SerializedFamilyIndex;
  children: ReactNode;
}) {
  const map = useMemo(() => new Map(index), [index]);
  return <FamilyContext.Provider value={map}>{children}</FamilyContext.Provider>;
}

/** Colourways of the piece with this title, or [] when it only comes one way. */
export function useColourways(title: string): FamilyMember[] {
  const index = useContext(FamilyContext);
  return familyMembers(index, title);
}
