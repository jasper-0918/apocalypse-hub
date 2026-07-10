import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Home, TrendingUp, Compass, Key, Search } from 'lucide-react';

// Custom 404 — replaces Next's unbranded default. Shown for unknown routes and
// whenever a page calls notFound() (e.g. a deleted/renamed script or game).
// Goal: keep the visitor on-site by routing them to real content.
export default function NotFound() {
  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/trending', label: 'Trending scripts', icon: TrendingUp },
    { href: '/discover', label: 'Discover scripts', icon: Compass },
    { href: '/get-key', label: 'Get a key', icon: Key },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(239,68,68,0.08)_0%,_transparent_55%)]" />
        <div className="relative max-w-2xl mx-auto px-4 py-20 text-center">
          <p className="text-7xl md:text-8xl font-extrabold tracking-tight text-red-500 text-glow-red">404</p>
          <h1 className="mt-4 text-2xl md:text-3xl font-bold text-foreground">
            This script ran into an error
          </h1>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            The page you&apos;re looking for was moved, deleted, or never existed. Try searching
            the hub or jump to one of these instead.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/">
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                <Search className="mr-2 h-4 w-4" /> Search scripts
              </Button>
            </Link>
            <Link href="/trending">
              <Button variant="outline" className="border-border text-muted-foreground hover:text-foreground">
                <TrendingUp className="mr-2 h-4 w-4" /> See what&apos;s trending
              </Button>
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card/60 px-4 py-5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:border-red-900/40"
              >
                <l.icon className="h-5 w-5 text-red-400" />
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
