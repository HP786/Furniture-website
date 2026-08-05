"use client";

import { useState, type FormEvent } from "react";

/**
 * The store has no swatch endpoint, so this confirms locally rather than
 * pretending to submit. Point `onSubmit` at a marketing endpoint when one exists.
 */
export function SwatchRequestForm() {
  const [sent, setSent] = useState(false);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
    window.setTimeout(() => setSent(false), 2400);
    event.currentTarget.reset();
  };

  return (
    <div className="relative">
      {/* Stacked on a phone: side by side the field is too narrow to read the
          address being typed into it. */}
      <form onSubmit={onSubmit} className="flex flex-col gap-2.5 sm:flex-row">
        <label className="sr-only" htmlFor="swatch-email">
          Your email
        </label>
        <input
          id="swatch-email"
          name="email"
          type="email"
          required
          placeholder="Your email"
          className="bg-surface h-13 flex-1 rounded-[7px] border-transparent text-[14.5px]"
        />
        {/* Cream on the brown band — the brand-brown primary button would sink
            into the surface behind it. */}
        <button
          type="submit"
          className="text-walnut-900 focus-visible:outline-accent inline-flex h-13 shrink-0 cursor-pointer items-center justify-center rounded-[7px] bg-[#f6efe6] px-7 text-[13px] tracking-[0.12em] uppercase hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[background-color,transform] motion-safe:active:scale-[0.97]"
        >
          Send swatches
        </button>
      </form>
      <p aria-live="polite" className="sr-only">
        {sent ? "Swatch wallet on its way" : ""}
      </p>
      {sent ? <div className="toast">Swatch wallet on its way</div> : null}
    </div>
  );
}
