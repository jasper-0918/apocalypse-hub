import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/seo';
import { AuthProvider } from '@/components/auth-provider';
import { Analytics } from '@vercel/analytics/react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Apocalypse Hub — Free Roblox Scripts & Key System',
    template: '%s | Apocalypse Hub',
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'roblox scripts',
    'roblox script hub',
    'free roblox scripts',
    'roblox exploits',
    'script loader',
    'loadstring',
    'roblox key system',
    'roblox executor scripts',
    'apocalypse hub',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'Apocalypse Hub — Free Roblox Scripts & Key System',
    description: SITE_DESCRIPTION,
    locale: 'en_US',
    images: ['/api/og?title=Apocalypse%20Hub&subtitle=Free%20Roblox%20Scripts%20%26%20Key%20System'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Apocalypse Hub — Free Roblox Scripts & Key System',
    description: SITE_DESCRIPTION,
    images: ['/api/og?title=Apocalypse%20Hub&subtitle=Free%20Roblox%20Scripts%20%26%20Key%20System'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION in Vercel to auto-add the tag.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

const siteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
