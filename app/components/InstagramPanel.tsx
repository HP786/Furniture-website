import Link from "next/link";

import { shopifyImageUrl, srcSetFor } from "../lib/image";
import { INSTAGRAM_HANDLE, SOCIAL_ICONS } from "../lib/navigation";

export type InstagramPost = {
  href: string;
  caption: string;
  image: { url: string; altText?: string | null } | null;
};

const instagramGlyph = SOCIAL_ICONS.find((social) => social.label === "Instagram")?.d ?? "";

/**
 * The feed as a square grid — three across on a phone, six on desktop — so it
 * reads as Instagram rather than as another row of product tiles. Each post
 * links into the collection it was shot for, and the caption is the accessible
 * name; on desktop it also surfaces on hover.
 */
export function InstagramPanel({ posts }: { posts: InstagramPost[] }) {
  if (posts.length === 0) return null;

  return (
    // The padding belongs to this section, so the bands below it can stack
    // flush instead of being separated by a stripe of bare page.
    <section className="mt-16 pb-14 md:mt-20 md:pb-20" aria-labelledby="instagram-heading">
      <div className="max-w-page px-margin mx-auto">
        <div
          data-reveal
          className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8"
        >
          <div>
            <p className="type-overline text-walnut-700 mb-2">Follow along</p>
            <h2 id="instagram-heading" className="type-display m-0">
              {INSTAGRAM_HANDLE} on Instagram
            </h2>
          </div>
          {/* Placeholder destination, matching the footer's social links until a
              real profile URL is wired in. */}
          <a
            href="#"
            className="border-border text-on-surface hover:bg-interactive hover:text-interactive-text focus-visible:outline-accent inline-flex shrink-0 items-center gap-2.5 self-start rounded-[7px] border px-5 py-3 text-[12px] tracking-[0.14em] uppercase no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-colors sm:self-auto"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={instagramGlyph} />
            </svg>
            Follow us
          </a>
        </div>

        <ul role="list" className="grid grid-cols-3 gap-1.5 md:grid-cols-6 md:gap-2">
          {posts.map((post, index) => (
            <li key={`${post.href}-${index}`}>
              <Link
                href={post.href}
                className="card group tile-ground focus-visible:outline-accent relative block aspect-square overflow-hidden rounded-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {post.image ? (
                  <img
                    src={shopifyImageUrl(post.image.url, { width: 600, height: 600, crop: "center" })}
                    srcSet={srcSetFor(post.image.url, { width: 600, height: 600, crop: "center" })}
                    sizes="(min-width: 768px) 16vw, 32vw"
                    alt=""
                    className="washed h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-105"
                    loading="lazy"
                    width={600}
                    height={600}
                  />
                ) : null}

                <span className="pointer-events-none absolute inset-0 grid place-items-center bg-[rgb(43_38_32/0.45)] text-white opacity-0 motion-safe:transition-opacity motion-safe:duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d={instagramGlyph} />
                  </svg>
                </span>
                <span className="sr-only">{post.caption}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
