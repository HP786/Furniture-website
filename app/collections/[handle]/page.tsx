import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CollectionPageClient } from "../../components/CollectionPageClient";
import { loadCollectionPage } from "../../lib/collection";
import { loadCollectionIndex } from "../../lib/collection-index";
import { CATEGORY_HANDLES, pickCollections, ROOM_HANDLES } from "../../lib/navigation";
import { toURLSearchParams, type NextSearchParams } from "../../lib/url";

export const dynamic = "force-dynamic";

type CollectionPageProps = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<NextSearchParams>;
};

async function loadOrNotFound(handle: string, searchParams: URLSearchParams) {
  try {
    return await loadCollectionPage({ handle, searchParams });
  } catch (error) {
    if (error instanceof Response && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { handle } = await params;

  try {
    const data = await loadCollectionPage({ handle, searchParams: new URLSearchParams() });
    return {
      title: data.collection.seo.title ?? data.collection.title,
      description: data.collection.seo.description ?? data.collection.description,
    };
  } catch (error) {
    if (error instanceof Response && error.status === 404) return {};
    throw error;
  }
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const { handle } = await params;
  const urlSearch = toURLSearchParams(await searchParams);
  const [data, index] = await Promise.all([
    loadOrNotFound(handle, urlSearch),
    loadCollectionIndex(),
  ]);

  // The chip row is the design's quick-jump between sibling collections. Rooms
  // come first, then piece types — deduped, since a handle can appear in both
  // lists, and always led by "Shop All".
  const siblings = [
    index.byHandle.get("shop-all"),
    ...pickCollections(index.byHandle, ROOM_HANDLES),
    ...pickCollections(index.byHandle, CATEGORY_HANDLES),
  ].flatMap((collection) => (collection ? [collection] : []));

  const seen = new Set<string>();
  const chips = siblings.filter((collection) => {
    if (seen.has(collection.handle)) return false;
    seen.add(collection.handle);
    return true;
  });

  return <CollectionPageClient data={data} chips={chips} />;
}
