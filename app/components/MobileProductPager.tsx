"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const ADVANCE_MS = 4500;
// How long to leave the pager alone after the user touches it.
const HANDOFF_MS = 9000;

/**
 * Mobile trending pager: four products on screen at a time, advancing a whole
 * page at a time.
 *
 * Paging uses scroll-snap, so a swipe works normally and the auto-advance is a
 * single `scrollTo` every few seconds rather than a per-frame write — the
 * latter is what fights the compositor and makes a rail feel stuck. Any
 * interaction defers the next advance, and reduced motion disables it.
 */
export function MobileProductPager({
  pages,
  label,
}: {
  pages: ReactNode[];
  label: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const userAt = useRef(0);

  const markUser = useCallback(() => {
    userAt.current = performance.now();
  }, []);

  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const page = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    setCurrent(Math.min(pages.length - 1, Math.max(0, page)));
  }, [pages.length]);

  useEffect(() => {
    if (pages.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      if (performance.now() - userAt.current < HANDOFF_MS) return;

      const width = track.clientWidth;
      const page = Math.round(track.scrollLeft / Math.max(1, width));
      const next = page >= pages.length - 1 ? 0 : page + 1;
      track.scrollTo({ left: next * width, behavior: "smooth" });
    }, ADVANCE_MS);

    return () => clearInterval(timer);
  }, [pages.length]);

  const goTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    markUser();
    track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
  };

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={onScroll}
        onPointerDown={markUser}
        onTouchStart={markUser}
        onTouchMove={markUser}
        onWheel={markUser}
        className="scrollbar-none flex snap-x snap-mandatory touch-pan-x overflow-x-auto overscroll-x-contain"
        role="group"
        aria-label={label}
        tabIndex={0}
      >
        {pages.map((page, index) => (
          <div key={index} className="w-full shrink-0 snap-start px-[var(--spacing-margin)]">
            {page}
          </div>
        ))}
      </div>

      {pages.length > 1 ? (
        <div className="mt-6 flex justify-center gap-2">
          {pages.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Page ${index + 1} of ${pages.length}`}
              aria-current={index === current ? "true" : undefined}
              className={`focus-visible:outline-accent h-1.5 cursor-pointer rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 motion-safe:transition-all ${
                index === current ? "bg-walnut-700 w-6" : "bg-sand-400 w-1.5"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
