import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CollectionEndMatter } from "../../components/CollectionEndMatter";
import { CollectionPageClient } from "../../components/CollectionPageClient";
import { loadCollectionPage } from "../../lib/collection";
import { loadCollectionIndex } from "../../lib/collection-index";
import { pickCollections, SHOP_ALL_HANDLE } from "../../lib/navigation";
import { ancestorsOf, browseRow } from "../../lib/taxonomy";
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

  // One step of the browse tree, not the whole catalogue: Living Room offers the
  // pieces in a living room, Armchairs the rest of the living-room shelf.
  const row = browseRow(handle);

  // "Shop" in the breadcrumb already stands for the whole catalogue, so the root
  // of the tree would only repeat it.
  const trail = pickCollections(
    index.byHandle,
    ancestorsOf(handle).filter((ancestor) => ancestor !== SHOP_ALL_HANDLE),
  );

  return (
    <CollectionPageClient
      data={data}
      trail={trail}
      up={(row.up ? index.byHandle.get(row.up) : null) ?? null}
      tiles={pickCollections(index.byHandle, row.tiles)}
      showActive={row.isSiblingRow}
    >
      <CollectionEndMatter handle={handle} />
    </CollectionPageClient>
  );
}
