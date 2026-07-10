import type { Metadata } from 'next';
import { SITE_URL, SITE_NAME } from '@/lib/seo';

const title = 'Discover Roblox Scripts';
const description =
  `Discover thousands of free Roblox scripts on ${SITE_NAME} — search by game, sort by popular ` +
  `or latest, and unlock any script with a quick key system.`;
const image = '/api/og?title=Discover%20Scripts&subtitle=Thousands%20of%20free%20Roblox%20scripts';

// /discover renders as a client component, so its SEO metadata lives in this
// route-segment layout instead of the page.
export const metadata: Metadata = {
  title,
  description,
  keywords: ['discover roblox scripts', 'free roblox scripts', 'roblox script library', 'roblox script hub'],
  alternates: { canonical: `${SITE_URL}/discover` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/discover`,
    title: `${title} | ${SITE_NAME}`,
    description,
    siteName: SITE_NAME,
    images: [image],
  },
  twitter: { card: 'summary_large_image', title: `${title} | ${SITE_NAME}`, description, images: [image] },
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
