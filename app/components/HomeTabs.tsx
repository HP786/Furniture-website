"use client";

import { useId, useRef, useState, type ReactNode } from "react";

export type HomeTab = {
  id: string;
  /** Short text on the tab itself. */
  label: string;
  /** Full section heading, shown beside the tabs for whichever tab is open. */
  heading: string;
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
      {/* The open tab titles the block, so the heading carries the full wording
          and the tabs themselves stay short. */}
      <div className="max-w-page px-margin mx-auto mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div>
          <h2 className="type-display m-0">{tabs[active].heading}</h2>
          <span aria-hidden="true" className="bg-border mt-2.5 block h-px w-[86px]" />
        </div>

        <div
          role="tablist"
          aria-label="Browse the range"
          onKeyDown={onKeyDown}
          className="scrollbar-none -mx-[var(--spacing-margin)] flex shrink-0 gap-7 overflow-x-auto px-[var(--spacing-margin)] pb-1 sm:mx-0 sm:px-0 sm:pb-0"
        >
          {tabs.map((tab, index) => {
            const selected = index === active;
            return (
              <button
                key={tab.id}
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
                className={`focus-visible:outline-accent shrink-0 cursor-pointer border-b bg-transparent pb-1.5 text-[12px] tracking-[0.14em] whitespace-nowrap uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 motion-safe:transition-colors md:text-[12.5px] ${
                  selected
                    ? "border-on-surface text-on-surface"
                    : "text-sand-600 hover:text-on-surface border-transparent"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
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
