"use client";

import { useEffect } from "react";

/**
 * Stamps [data-shown] on [data-reveal] blocks as they scroll into view; the
 * start state lives in globals.css. The 1.6s fallback guarantees the page can
 * never be left invisible if the observer never fires.
 */
export function Reveal() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = () => document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-shown])");

    const revealAll = () => {
      for (const element of targets()) element.dataset.shown = "1";
    };

    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      revealAll();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.shown = "1";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    for (const element of targets()) observer.observe(element);
    const fallback = setTimeout(revealAll, 1600);

    return () => {
      clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);

  return null;
}
