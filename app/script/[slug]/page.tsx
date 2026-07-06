import type { Metadata } from 'next';
import { getPublicScript } from '@/lib/scripts-server';
import { SITE_URL, SITE_NAME } from '@/lib/seo';
import { slugify } from '@/lib/utils';
import { ScriptDetailClient, EMPTY_REACTIONS, ScriptDetail } from './script-detail-client';

export const dynamic = 'force-dynamic';

function metaDescription(name: string, game: string, description: string): string {
  const gameLabel = game && game !== 'Universal' ? ` for ${game}` : '';
  const base =
    description.trim() ||
    `Get the ${name} Roblox script${gameLabel} on ${SITE_NAME}. Unlock it with a free key, copy the loadstring, and run it in your executor.`;
  return base.replace(/\s+/g, ' ').trim().slice(0, 160);
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const script = await getPublicScript(params.slug);
  if (!script) {
    return { title: 'Script not found', robots: { index: false, follow: true } };
  }

  const gameLabel = script.game && script.game !== 'Universal' ? ` (${script.game})` : '';
  const title = `${script.name}${gameLabel} — Roblox Script`;
  const description = metaDescription(script.name, script.game, script.description);
  const url = `${SITE_URL}/script/${script.slug}`;
  const ogImage =
    script.thumbnail_url ||
    `/api/og?title=${encodeURIComponent(script.name)}&subtitle=${encodeURIComponent(
      script.game && script.game !== 'Universal' ? `${script.game} script` : 'Roblox script'
    )}`;
  const images = [{ url: ogImage, alt: script.name }];

  return {
    title,
    description,
    keywords: [
      script.name,
      `${script.name} script`,
      ...(script.games || []).map((g) => `${g} script`),
      'roblox script',
      'roblox script hub',
      'free roblox scripts',
    ],
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      siteName: SITE_NAME,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ScriptPage({ params }: { params: { slug: string } }) {
  const script = await getPublicScript(params.slug);

  // Structured data helps Google show a rich result for the script, plus a
  // breadcrumb trail (Home › Game › Script) for the search snippet.
  const jsonLd = script
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: script.name,
          description: metaDescription(script.name, script.game, script.description),
          applicationCategory: 'GameApplication',
          operatingSystem: 'Roblox',
          url: `${SITE_URL}/script/${script.slug}`,
          image: script.thumbnail_url || undefined,
          datePublished: script.created_at,
          dateModified: script.updated_at,
          author: { '@type': 'Person', name: script.owner_username },
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            {
              '@type': 'ListItem',
              position: 2,
              name: script.game,
              item: `${SITE_URL}/game/${slugify(script.game)}`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: script.name,
              item: `${SITE_URL}/script/${script.slug}`,
            },
          ],
        },
      ]
    : null;

  const initialScript: ScriptDetail | null = script
    ? { ...script, reactions: EMPTY_REACTIONS }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ScriptDetailClient slug={params.slug} initialScript={initialScript} />
    </>
  );
}
