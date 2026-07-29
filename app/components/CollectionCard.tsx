import { gql, type StorefrontApi } from "@shopify/hydrogen";
import Link from "next/link";

import { shopifyImageUrl, srcSetFor } from "../lib/image";

export const COLLECTION_CARD_PRODUCT_COUNT_LIMIT = 100;

export const COLLECTION_CARD_FRAGMENT = gql(`
  fragment CollectionCard on Collection {
    handle
    title
    image {
      url
      altText
      width
      height
    }
    products(first: 1) {
      nodes {
        featuredImage {
          url
          altText
          width
          height
        }
      }
    }
    productCountProbe: products(first: 100) {
      nodes {
        id
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`);

export const COLLECTION_CARD_SHAPE = gql(
  `
    query CollectionCardShape {
      collections(first: 1) {
        nodes {
          ...CollectionCard
        }
      }
    }
  `,
  [COLLECTION_CARD_FRAGMENT],
);

export type CollectionCardData = StorefrontApi.ResultOf<
  typeof COLLECTION_CARD_SHAPE
>["collections"]["nodes"][number];

type CollectionCardImage = NonNullable<CollectionCardData["image"]>;

function collectionImage(collection: CollectionCardData): CollectionCardImage | null {
  return collection.image ?? collection.products.nodes[0]?.featuredImage ?? null;
}

function productCountText(collection: CollectionCardData) {
  if (collection.productCountProbe.pageInfo.hasNextPage) {
    return `${COLLECTION_CARD_PRODUCT_COUNT_LIMIT}+ products`;
  }

  const count = collection.productCountProbe.nodes.length;
  if (count === 0) return "Coming soon";
  return `${count} ${count === 1 ? "piece" : "pieces"}`;
}

export function CollectionCard({
  collection,
  priority = false,
}: {
  collection: CollectionCardData;
  priority?: boolean;
}) {
  const image = collectionImage(collection);
  const href = `/collections/${collection.handle}`;

  return (
    <article
      className="card group rounded-card relative overflow-hidden"
      data-testid="collection-card"
    >
      <div className="tile-ground relative block aspect-[4/3] overflow-hidden">
        {image ? (
          <div className="washed h-full w-full motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-105">
            <img
              src={shopifyImageUrl(image.url, { width: 800, height: 600, crop: "center" })}
              srcSet={srcSetFor(image.url, { width: 800, height: 600, crop: "center" })}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              alt={image.altText ?? collection.title}
              className="h-full w-full object-cover"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              width={800}
              height={600}
            />
          </div>
        ) : null}
      </div>
      <div className="scrim-tile pointer-events-none absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 z-10 p-6 text-left text-white">
        <h3 className="type-heading-lg font-heading">
          <Link
            href={href}
            className="card-link text-white"
            aria-label={`Shop ${collection.title}`}
          >
            {collection.title}
          </Link>
        </h3>
        <p className="mt-1 text-[12.5px] text-white/85">{productCountText(collection)}</p>
      </div>
    </article>
  );
}
