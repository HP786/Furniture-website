"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { Icon, ICON_PATHS } from "./WalnutMark";

/**
 * Scrolling rail with prev/next controls and a slow auto-drift. Native scroll
 * does the work, so touch, trackpad and keyboard all keep working. The drift
 * pauses on hover/focus/touch and under reduced motion, and reverses at each
 * end rather than duplicating cards (which would repeat products to a reader).
 */
export function ProductRail({
  title,
  children,
  viewAllHref,
  viewAllLabel = "View all",
  autoScroll = true,
}: {
  title: string;
  children: ReactNode;
  viewAllHref?: string;
  viewAllLabel?: string;
  autoScroll?: boolean;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const pausedRef = useRef(false);

  const syncEdges = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const max = rail.scrollWidth - rail.clientWidth;
    setAtStart(rail.scrollLeft <= 1);
    setAtEnd(rail.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    if (!autoScroll) return;
    const rail = railRef.current;
    if (!rail) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let last = performance.now();
    let direction = 1;
    let position = rail.scrollLeft;

    const step = (now: number) => {
      const delta = Math.min(64, now - last);
      last = now;
      const max = rail.scrollWidth - rail.clientWidth;

      if (!pausedRef.current && max > 8) {
        position += direction * delta * 0.045;
        if (position >= max) {
          position = max;
          direction = -1;
        } else if (position <= 0) {
          position = 0;
          direction = 1;
        }
        rail.scrollLeft = Math.round(position);
      } else {
        // Resync so a manual scroll doesn't get yanked back on resume.
        position = rail.scrollLeft;
      }

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [autoScroll]);

  const pause = () => {
    pausedRef.current = true;
  };
  const resume = () => {
    pausedRef.current = false;
  };

  const nudge = (direction: 1 | -1) => () => {
    const rail = railRef.current;
    if (!rail) return;
    // Scroll by just under a viewport so a partial card stays visible as an
    // affordance that there is more to the right.
    rail.scrollBy({ left: direction * Math.round(rail.clientWidth * 0.9), behavior: "smooth" });
  };

  return (
    <>
      <div className="max-w-page px-margin mx-auto mb-8 flex items-end justify-between gap-6">
        <h2 className="type-display m-0">{title}</h2>
        <div className="flex items-center gap-3">
          {viewAllHref ? (
            <a
              href={viewAllHref}
              className="text-walnut-700 focus-visible:outline-accent hidden items-center gap-2 text-[13px] tracking-[0.1em] uppercase no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:inline-flex"
            >
              {viewAllLabel}
              <Icon d={ICON_PATHS.arrowRight} size={16} />
            </a>
          ) : null}
          <div className="hidden gap-2 md:flex">
            <button
              type="button"
              onClick={() => {
                pause();
                nudge(-1)();
              }}
              disabled={atStart}
              aria-label="Scroll left"
              className="border-border text-on-surface hover:bg-sand-900 hover:text-sand-100 hover:border-sand-900 focus-visible:outline-accent grid size-[46px] cursor-pointer place-items-center rounded-full border bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-current motion-safe:transition-colors"
            >
              <Icon d={ICON_PATHS.arrowLeft} />
            </button>
            <button
              type="button"
              onClick={() => {
                pause();
                nudge(1)();
              }}
              disabled={atEnd}
              aria-label="Scroll right"
              className="border-border text-on-surface hover:bg-sand-900 hover:text-sand-100 hover:border-sand-900 focus-visible:outline-accent grid size-[46px] cursor-pointer place-items-center rounded-full border bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-current motion-safe:transition-colors"
            >
              <Icon d={ICON_PATHS.arrowRight} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={railRef}
        onScroll={syncEdges}
        onPointerEnter={pause}
        onPointerLeave={resume}
        onPointerDown={pause}
        onFocusCapture={pause}
        onBlurCapture={resume}
        onTouchStart={pause}
        className="scrollbar-none px-margin overflow-x-auto overflow-y-hidden"
        // A scrollable region needs to be focusable to be keyboard-operable.
        tabIndex={0}
        role="group"
        aria-label={title}
      >
        <ul role="list" className="flex w-max gap-[22px] pb-1">
          {children}
        </ul>
      </div>
    </>
  );
}
