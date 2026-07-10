'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/site-header';
import { ScriptHubCard, HubScript, ScriptGridSkeleton } from '@/components/script-hub-card';
import { TrendingUp, Eye } from 'lucide-react';
import Link from 'next/link';

export default function TrendingPage() {
  const [scripts, setScripts] = useState<HubScript[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/scripts/catalog?sort=trending&limit=40')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: HubScript[]) => setScripts(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader active="/trending" />

      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="h-7 w-7 text-red-500" />
          <h1 className="text-3xl font-bold text-foreground">Trending Scripts</h1>
        </div>
        <p className="text-muted-foreground mb-6">The most-viewed scripts on Apocalypse Blox Hub right now.</p>

        {loading ? (
          <ScriptGridSkeleton count={8} />
        ) : scripts.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
                <Eye className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">No scripts yet</h2>
              <p className="text-muted-foreground max-w-md mb-4">Once scripts get views they&apos;ll show up here.</p>
              <Link href="/register">
                <Button className="bg-red-600 hover:bg-red-700 text-white">Upload Scripts</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {scripts.map((script, i) => (
              <div key={script.id} className="relative">
                <span className="absolute -left-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow">
                  {i + 1}
                </span>
                <ScriptHubCard script={script} priority={i < 4} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
