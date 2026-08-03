"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Saved items ("wishlist").
 *
 * Held in localStorage rather than on the customer record: the storefront has
 * no signed-in customer, and a save should survive a reload without asking
 * anyone to create an account. Only product handles are stored — the products
 * themselves are re-fetched, so a saved item never goes stale on price or
 * availability.
 */
const STORAGE_KEY = "walnur.saved";
const CHANGED = "walnur:saved-changed";

let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  if (typeof window === "undefined") return (cache = []);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter((h) => typeof h === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(handles: string[]) {
  cache = handles;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(handles));
  } catch {
    // Private mode or a full quota — the in-memory copy still works for this
    // session, so a failed persist should not break saving.
  }
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(onChange: () => void) {
  const onExternal = () => {
    // Another tab wrote to storage, so the cached copy is stale.
    cache = null;
    onChange();
  };
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onExternal);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onExternal);
  };
}

const EMPTY: string[] = [];

export function useSaved() {
  const handles = useSyncExternalStore(
    subscribe,
    read,
    // Server render has no storage; returning a stable empty array keeps the
    // markup consistent until hydration fills it in.
    () => EMPTY,
  );

  const toggle = useCallback((handle: string) => {
    const current = read();
    write(
      current.includes(handle)
        ? current.filter((item) => item !== handle)
        : [handle, ...current],
    );
  }, []);

  const isSaved = useCallback((handle: string) => handles.includes(handle), [handles]);

  const clear = useCallback(() => write([]), []);

  return { handles, count: handles.length, isSaved, toggle, clear };
}
