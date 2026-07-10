import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { ScriptHubCard } from '@/components/script-hub-card';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { getScriptsByGameSlug } from '@/lib/scripts-server';
import { SITE_URL, SITE_NAME } from '@/lib/seo';

// ISR, not force-dynamic — the game listing is public, read-only data. New
// imports appear within the revalidate window.
export const revalidate = 300;

// Generate each game page on first request, then serve it cached (see the
// script page for why the empty array matters).
export function generateStaticParams() {
  return [];
}

function ogFor(name: string): string {
  return `/api/og?title=${encodeURIComponent(`${name} Scripts`)}&subtitle=${encodeURIComponent(
    `Free ${name} Roblox scripts`
  )}`;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const data = await getScriptsByGameSlug(params.slug);
  if (!data) {
    return { title: 'Game not found', robots: { index: false, follow: true } };
  }

  const n = data.scripts.length;
  const title = `${data.name} Scripts`;
  const description =
    `Browse ${n} free ${data.name} Roblox script${n === 1 ? '' : 's'} on ${SITE_NAME}. ` +
    `Unlock with a quick key system, copy the loadstring, and run it in your executor.`;
  const url = `${SITE_URL}/game/${params.slug}`;
  const image = ogFor(data.name);

  return {
    title,
    description: description.slice(0, 160),
    keywords: [
      `${data.name} script`,
      `${data.name} roblox script`,
      `free ${data.name} scripts`,
      `${data.name} hack`,
      'roblox scripts',
    ],
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: `${title} | ${SITE_NAME}`,
      description: description.slice(0, 160),
      siteName: SITE_NAME,
      images: [image],
    },
    twitter: { card: 'summary_large_image', title: `${title} | ${SITE_NAME}`, images: [image] },
  };
}

export default async function GamePage({ params }: { params: { slug: string } }) {
  const data = await getScriptsByGameSlug(params.slug);
  if (!data) notFound();

  const { name, scripts } = data;
  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${name} Scripts`,
    url: `${SITE_URL}/game/${params.slug}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: scripts.length,
      itemListElement: scripts.slice(0, 50).map((s, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/script/${s.slug}`,
        name: s.name,
      })),
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name, href: `/game/${params.slug}` }]} />

        <h1 className="text-3xl font-bold text-foreground">{name} Scripts</h1>
        <p className="text-muted-foreground mt-1 mb-6">
          {scripts.length} free {name} Roblox script{scripts.length === 1 ? '' : 's'} with key-system unlocks.
          Copy the loadstring and run it in your executor.
        </p>

        {scripts.length === 0 ? (
          <p className="text-muted-foreground">
            No scripts yet for this game.{' '}
            <Link href="/" className="text-red-400 hover:underline">
              Browse all scripts
            </Link>
            .
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {scripts.map((s) => (
              <ScriptHubCard key={s.id} script={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
