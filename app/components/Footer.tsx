import Link from "next/link";

import {
  collectionHref,
  FOOTER_COLUMNS,
  PAYMENT_METHODS,
  SOCIAL_ICONS,
} from "../lib/navigation";
import { Icon, WalnutMark, WalnutWordmark } from "./WalnutMark";

const footerLinkClass =
  "text-sand-300/80 hover:text-surface focus-visible:outline-accent inline-flex min-h-touch-target items-center text-sm no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors";

export function Footer() {
  return (
    <footer className="bg-sand-900 text-sand-200 mt-0">
      <div className="max-w-page px-margin mx-auto grid gap-10 pt-16 pb-10 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <div className="text-surface mb-4 flex items-center gap-3">
            <WalnutMark size={25} className="shrink-0" />
            <WalnutWordmark size="20px" />
          </div>
          <p className="text-sand-300/70 mb-6 max-w-[280px] text-sm">
            Furniture made in small runs from solid timber and honest cloth. Melbourne, since 2011.
          </p>
          <ul role="list" className="flex gap-2.5">
            {SOCIAL_ICONS.map((social) => (
              <li key={social.label}>
                <a
                  href="#"
                  aria-label={social.label}
                  className="text-sand-300/80 hover:text-surface hover:border-sand-300/60 focus-visible:outline-accent grid size-[38px] place-items-center rounded-full border border-[color:rgb(232_224_212/0.24)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={social.d} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.title} aria-labelledby={`footer-${column.title.toLowerCase()}`}>
            <h2
              className="type-overline text-walnut-300 mb-4"
              id={`footer-${column.title.toLowerCase()}`}
            >
              {column.title}
            </h2>
            <ul role="list" className="flex flex-col items-start">
              {column.items.map((item) => (
                <li key={item.handle + item.label}>
                  <Link href={collectionHref(item.handle)} className={footerLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-[color:rgb(232_224_212/0.16)]">
        <div className="max-w-page px-margin text-sand-300/60 mx-auto flex flex-col items-center justify-between gap-3 py-5 text-[12.5px] sm:flex-row">
          <span>© {new Date().getFullYear()} Walnut · All rights reserved</span>
          <ul role="list" className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((method) => (
              <li
                key={method}
                className="rounded-md border border-[color:rgb(232_224_212/0.22)] px-2.5 py-1 text-[10.5px] tracking-[0.1em]"
              >
                {method}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

/** Re-exported so the mobile tab bar can share the footer's icon treatment. */
export { Icon };
