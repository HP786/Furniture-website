"use client";

import { useId, useRef, useState, type ReactNode } from "react";

export type HomeTab = {
  id: string;
  label: string;
  panel: ReactNode;
};

/**
 * The three browse sections share one block near the top of the page instead of
 * stacking down it. Panels are all rendered and toggled with `hidden`, so
 * switching tabs costs no request and the content stays in the document for
 * crawlers.
 */
export function HomeTabs({ tabs }: { tabs: HomeTab[] }) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys move between tabs, Home/End jump to the ends — the expected
  // keyboard behaviour for a tablist.
  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = active === last ? 0 : active + 1;
    else if (event.key === "ArrowLeft") next = active === 0 ? last : active - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section className="pt-14 md:pt-20" aria-label="Browse the range">
      <div
        role="tablist"
        aria-label="Browse the range"
        onKeyDown={onKeyDown}
        className="scrollbar-none max-w-page px-margin mx-auto mb-9 flex items-stretch justify-start gap-0 overflow-x-auto md:justify-center"
      >
        {tabs.map((tab, index) => {
          const selected = index === active;
          return (
            <div key={tab.id} className="flex shrink-0 items-center">
              {index > 0 ? (
                <span aria-hidden="true" className="bg-border mx-6 h-6 w-px shrink-0 md:mx-12" />
              ) : null}
              <button
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(index)}
                className={`font-heading focus-visible:outline-accent cursor-pointer border-b-2 bg-transparent pb-1.5 text-[15px] font-light tracking-[0.14em] whitespace-nowrap uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 motion-safe:transition-colors md:text-[18px] ${
                  selected
                    ? "border-on-surface text-on-surface"
                    : "text-sand-600 hover:text-on-surface border-transparent"
                }`}
              >
                {tab.label}
              </button>
            </div>
          );
        })}
      </div>

      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={index !== active}
          tabIndex={0}
        >
          {tab.panel}
        </div>
      ))}
    </section>
  );
}
