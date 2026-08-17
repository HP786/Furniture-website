import { shopifyImageUrl, srcSetFor } from "../lib/image";
import { faqsForCollection, storyForCollection } from "../lib/collection-content";
import { toJsonLd } from "../lib/json-ld";

/**
 * What sits under the grid on every collection page: a short piece of copy
 * beside a photograph, then the questions people ask about that shelf.
 *
 * Server components on purpose — this is text and two `<details>` lists, and
 * `<details>` opens without JavaScript, so none of it needs to reach the
 * browser as a bundle. The copy itself lives in `lib/collection-content.ts`.
 */

function faqJsonLd(faqs: ReturnType<typeof faqsForCollection>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

function CollectionStory({ handle }: { handle: string }) {
  const story = storyForCollection(handle);

  return (
    <section
      className="max-w-page px-margin mx-auto w-full pt-4 pb-14 md:pt-8 md:pb-20"
      aria-labelledby="collection-story-heading"
    >
      <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-16">
        <img
          src={shopifyImageUrl(story.image.url, { width: 1000, height: 750, crop: "center" })}
          srcSet={srcSetFor(story.image.url, { width: 1000, height: 750, crop: "center" })}
          sizes="(min-width: 768px) 45vw, 100vw"
          alt={story.image.altText}
          className="bg-surface-secondary aspect-[4/3] w-full rounded-2xl object-cover"
          loading="lazy"
          width={1000}
          height={750}
        />
        <div>
          <p className="type-overline text-walnut-700 mb-4">{story.overline}</p>
          <h2
            id="collection-story-heading"
            className="font-heading m-0 max-w-[520px] text-[27px] leading-[1.08] font-light tracking-[-0.025em] text-pretty md:text-[36px]"
          >
            {story.title}
          </h2>
          <p className="text-sand-700 mt-5 max-w-[560px] text-[15px] leading-relaxed md:text-[16.5px]">
            {story.body}
          </p>
        </div>
      </div>
    </section>
  );
}

function CollectionFaq({ handle }: { handle: string }) {
  const faqs = faqsForCollection(handle);

  return (
    <section
      className="max-w-page px-margin mx-auto w-full pb-16 md:pb-24"
      aria-labelledby="collection-faq-heading"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(faqJsonLd(faqs)) }}
      />
      <div className="border-border border-t pt-10">
        <p className="type-overline text-walnut-700 mb-4" aria-hidden="true">
          FAQ
        </p>
        <h2 id="collection-faq-heading" className="sr-only">
          Frequently asked questions
        </h2>

        <div className="flex flex-col">
          {faqs.map((faq) => (
            <details key={faq.question} className="group border-border border-b">
              <summary className="marker-hidden text-on-surface flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[15px] md:text-[16.5px]">
                {faq.question}
                <span
                  className="text-sand-600 shrink-0 group-open:rotate-180 motion-safe:transition-transform motion-safe:duration-300"
                  aria-hidden="true"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </summary>
              <p className="text-sand-700 mb-5 max-w-[820px] text-[14.5px] leading-[1.65]">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The story and the questions, in the order every collection page shows them. */
export function CollectionEndMatter({ handle }: { handle: string }) {
  return (
    <>
      <CollectionStory handle={handle} />
      <CollectionFaq handle={handle} />
    </>
  );
}
