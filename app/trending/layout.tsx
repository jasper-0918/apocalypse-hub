import type { Metadata } from 'next';
import { SITE_URL, SITE_NAME } from '@/lib/seo';

const title = 'Trending Roblox Scripts';
const description =
  `The most-viewed Roblox scripts on ${SITE_NAME} right now. Browse trending, key-protected ` +
  `loadstrings for popular games and run them in your executor.`;
const image = '/api/og?title=Trending%20Scripts&subtitle=Most-viewed%20Roblox%20scripts';

// /trending renders as a client component, so its SEO metadata lives in this
// route-segment layout instead of the page.
export const metadata: Metadata = {
  title,
  description,
  keywords: ['trending roblox scripts', 'popular roblox scripts', 'most viewed roblox scripts', 'roblox script hub'],
  alternates: { canonical: `${SITE_URL}/trending` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/trending`,
    title: `${title} | ${SITE_NAME}`,
    description,
    siteName: SITE_NAME,
    images: [image],
  },
  twitter: { card: 'summary_large_image', title: `${title} | ${SITE_NAME}`, description, images: [image] },
};

export default function TrendingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
