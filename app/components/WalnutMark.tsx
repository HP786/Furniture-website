import { BRAND_NAME } from "../lib/navigation";

/** The mark is drawn at 1.5 — lighter than the 2.75 the UI icons carry. */
export function WalnutMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="16" cy="16" r="13" />
      <path d="M16 3c3.9 4.2 5.9 8.5 5.9 13s-2 8.8-5.9 13c-3.9-4.2-5.9-8.5-5.9-13S12.1 7.2 16 3Z" />
      <path d="M16 3v26" />
    </svg>
  );
}

/** The wide tracking is the identity, so it lives here rather than at each call site. */
export function WalnutWordmark({
  size = "22px",
  className,
}: {
  size?: string;
  className?: string;
}) {
  return (
    <span
      className={`font-heading font-normal uppercase leading-none ${className ?? ""}`}
      style={{ fontSize: size, letterSpacing: "0.34em" }}
    >
      {BRAND_NAME}
    </span>
  );
}

/** Inline UI icon at the heavy 2.75 stroke. */
export function Icon({
  d,
  size = 18,
  className,
  fill = "none",
}: {
  d: string;
  size?: number;
  className?: string;
  fill?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth="2.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

export const ICON_PATHS = {
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowLeft: "M19 12H5M11 6l-6 6 6 6",
  chevronDown: "m6 9 6 6 6-6",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7.5 8a7.5 7.5 0 0 1 15 0",
  heart: "M12 20.5S3.5 15.4 3.5 9.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.5 2.6c0 5.8-8.5 10.9-8.5 10.9Z",
  bag: "M5.5 8h13l-1.2 11.2a1.6 1.6 0 0 1-1.6 1.3H8.3a1.6 1.6 0 0 1-1.6-1.3Zm3.5 0V6.6a3 3 0 0 1 6 0V8",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 2-3.6-3.6",
  menu: "M4 7h16M4 12h16M4 17h11",
  close: "M6 6l12 12M18 6 6 18",
  home: "M3 11 12 4l9 7v9H3Z",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
} as const;
