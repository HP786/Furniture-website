"use client";

import { useSaved } from "../lib/saved";

/** Heart toggle. Sits above the card's link overlay so it stays clickable. */
export function SaveButton({
  handle,
  title,
  size = "sm",
}: {
  handle: string;
  title: string;
  size?: "sm" | "lg";
}) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(handle);
  const box = size === "lg" ? "size-11" : "size-[38px]";
  const glyph = size === "lg" ? 19 : 17;

  return (
    <button
      type="button"
      onClick={(event) => {
        // The whole card is a link; saving must not navigate.
        event.preventDefault();
        event.stopPropagation();
        toggle(handle);
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
      data-testid="save-button"
      className={`focus-visible:outline-accent grid cursor-pointer place-items-center rounded-full border-0 bg-[color:rgb(253_251_248/0.88)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-transform motion-safe:active:scale-90 ${box} ${
        saved ? "text-walnut-700" : "text-sand-800"
      }`}
    >
      <svg
        width={glyph}
        height={glyph}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={saved ? "currentColor" : "none"}
        aria-hidden="true"
      >
        <path d="M12 20.5S3.5 15.4 3.5 9.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.5 2.6c0 5.8-8.5 10.9-8.5 10.9Z" />
      </svg>
    </button>
  );
}
