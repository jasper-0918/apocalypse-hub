import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Apocalypse Hub — Premium Script Protection',
  description: 'Premium Roblox script hosting and key protection platform. Obfuscate, protect, and serve your scripts with military-grade key system security.',
  openGraph: {
    title: 'Apocalypse Hub',
    description: 'Premium Roblox script hosting and key protection platform.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        {children}
      </body>
    </html>
  );
}
