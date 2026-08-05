"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { Arrow } from "./WalnutMark";

/**
 * Scrolling rail with prev/next controls and a slow auto-drift.
 *
 * Native scroll does the work, so swipe, trackpad, arrows and keyboard all
 * work. The drift runs on fine-pointer devices only — it pauses on hover, after
 * any manual scroll, and under reduced motion — and reverses at each end rather
 * than duplicating cards, which would repeat products to a screen reader.
 */
export function ProductRail({
  title,
  children,
  viewAllHref,
  viewAllLabel = "View all",
  autoScroll = true,
  headingHidden = false,
  tone = "light",
}: {
  title: string;
  children: ReactNode;
  viewAllHref?: string;
  viewAllLabel?: string;
  autoScroll?: boolean;
  /** Inside a tab panel the tab already names the rail, so the visible
   *  heading would repeat it. It stays in the accessibility tree either way. */
  headingHidden?: boolean;
  /** `dark` is for a rail sitting on the brown ground: light heading, and
   *  controls that invert on hover rather than filling with ink. */
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  const controlClass = dark
    ? "border-[color:rgb(246_239_230/0.35)] text-[#f6efe6] hover:bg-[#f6efe6] hover:text-walnut-900 hover:border-[#f6efe6]"
    : "border-border text-on-surface hover:bg-sand-900 hover:text-sand-100 hover:border-sand-900";

  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Timestamp of the last user-driven scroll. The drift stays out of the way
  // for HANDOFF_MS afterwards, which is what lets a swipe (and its momentum)
  // run to completion instead of being overwritten frame by frame.
  const userScrollAt = useRef(0);
  // Hover holds the drift indefinitely, rather than only for the handoff
  // window — a pointer resting on the rail should keep it still.
  const hovering = useRef(false);

  const HANDOFF_MS = 2500;

  // Handoff is driven by input events only. The obvious alternative — compare
  // scrollLeft against the offset the drift last wrote — does not work: scroll
  // events arrive a frame or more late, so the drift reads its own stale
  // positions as user input and permanently cancels itself.
  const markUserScroll = useCallback(() => {
    userScrollAt.current = performance.now();
  }, []);

  const pause = useCallback(() => {
    markUserScroll();
  }, [markUserScroll]);

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
    // No drift on touch devices. A touch drag is scrolled by the compositor,
    // but this loop writes scrollLeft from the main thread every frame, which
    // cancels that scroll mid-gesture and makes the rail feel stuck. Swiping is
    // the primary way to move a rail on a phone, so it wins.
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let frame = 0;
    let last = performance.now();
    let direction = 1;
    let position = rail.scrollLeft;

    const step = (now: number) => {
      const delta = Math.min(64, now - last);
      last = now;
      const max = rail.scrollWidth - rail.clientWidth;
      const handsOff = hovering.current || now - userScrollAt.current < HANDOFF_MS;

      if (handsOff || max <= 8) {
        // Stay where the user left it, and resume drifting from there.
        position = rail.scrollLeft;
      } else {
        position += direction * delta * 0.045;
        if (position >= max) {
          position = max;
          direction = -1;
        } else if (position <= 0) {
          position = 0;
          direction = 1;
        }
        rail.scrollLeft = Math.round(position);
      }

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [autoScroll]);

  const nudge = (direction: 1 | -1) => () => {
    const rail = railRef.current;
    if (!rail) return;
    markUserScroll();
    // Scroll by just under a viewport so a partial card stays visible as an
    // affordance that there is more to the right.
    rail.scrollBy({ left: direction * Math.round(rail.clientWidth * 0.9), behavior: "smooth" });
  };

  return (
    <>
      <div
        className={`max-w-page px-margin mx-auto flex items-end gap-6 ${headingHidden ? "mb-4 justify-end" : "mb-8 justify-between"}`}
      >
        <h2
          className={
            headingHidden ? "sr-only" : `type-display m-0 ${dark ? "text-[#f6efe6]" : ""}`
          }
        >
          {title}
        </h2>
        <div className="flex items-center gap-3">
          {viewAllHref ? (
            <a
              href={viewAllHref}
              className="text-walnut-700 focus-visible:outline-accent hidden items-center gap-2 text-[13px] tracking-[0.1em] uppercase no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:inline-flex"
            >
              {viewAllLabel}
              <Arrow size={16} />
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
              className={`${controlClass} focus-visible:outline-accent grid size-[46px] cursor-pointer place-items-center rounded-full border bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-current motion-safe:transition-colors`}
            >
              <Arrow size={18} direction="left" />
            </button>
            <button
              type="button"
              onClick={() => {
                pause();
                nudge(1)();
              }}
              disabled={atEnd}
              aria-label="Scroll right"
              className={`${controlClass} focus-visible:outline-accent grid size-[46px] cursor-pointer place-items-center rounded-full border bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-current motion-safe:transition-colors`}
            >
              <Arrow size={18} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={railRef}
        onScroll={syncEdges}
        // Any of these means the user has taken over; the drift backs off for
        // HANDOFF_MS and keeps deferring while they stay engaged.
        onPointerDown={markUserScroll}
        onPointerMove={(event) => {
          if (event.buttons > 0 || event.pointerType === "touch") markUserScroll();
        }}
        onTouchStart={markUserScroll}
        onTouchMove={markUserScroll}
        onWheel={markUserScroll}
        onFocusCapture={markUserScroll}
        onMouseEnter={() => {
          hovering.current = true;
        }}
        onMouseLeave={() => {
          hovering.current = false;
          markUserScroll();
        }}
        // No touch-action override: `pan-x` would let the browser honour only
        // horizontal panning, so swiping up to scroll the page while your
        // finger is on the rail would do nothing.
        className="scrollbar-none px-margin overflow-x-auto overflow-y-hidden overscroll-x-contain"
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
