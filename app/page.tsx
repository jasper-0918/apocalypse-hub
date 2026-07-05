'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScriptHubCard, HubScript } from '@/components/script-hub-card';
import {
  Flame,
  Shield,
  Lock,
  Key,
  Search,
  Copy,
  Eye,
  Loader2,
  Users,
  BookOpen,
  Rocket,
  TrendingUp,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [scripts, setScripts] = useState<HubScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeGame, setActiveGame] = useState('All');
  const [sort, setSort] = useState<'recent' | 'trending'>('recent');
  const [games, setGames] = useState<string[]>(['All']);

  useEffect(() => {
    const fetchScripts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (activeGame !== 'All') params.set('game', activeGame);
        if (sort === 'trending') params.set('sort', 'trending');
        const res = await fetch(`/api/scripts/catalog?${params}`);
        if (res.ok) setScripts(await res.json());
      } catch {
        // Silently fail
      }
      setLoading(false);
    };
    fetchScripts();
  }, [search, activeGame, sort]);

  useEffect(() => {
    fetch('/api/owner/games')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        const names = data.filter((g) => g.is_active).map((g: any) => g.name);
        if (names.length > 0) setGames(['All', ...names]);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Flame className="h-7 w-7 text-red-500" />
            <span className="text-xl font-bold text-foreground">Apocalypse Hub</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/get-key">
              <Button variant="outline" size="sm" className="border-red-900/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                <Key className="mr-1.5 h-3.5 w-3.5" />
                Get Key
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                Sign In
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero + Search */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(239,68,68,0.06)_0%,_transparent_50%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-3 text-center">
            Apocalypse <span className="text-red-500 text-glow-red">Hub</span>
          </h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto text-center">
            Search the best Lua scripts, key-protected and obfuscated — uploaded by the community.
          </p>

          {/* Search bar */}
          <div className="relative max-w-3xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Try "Blox Fruits"'
              className="pl-12 h-14 text-base bg-card border-border"
            />
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {[
              { icon: Users, title: 'Active community', text: 'Join thousands of people already sharing and using scripts every day.', color: 'text-red-400' },
              { icon: BookOpen, title: 'Protected collection', text: 'Every script is key-locked and obfuscated, so your work stays yours.', color: 'text-amber-400' },
              { icon: Rocket, title: 'Earn from your scripts', text: 'Upload, share, and get paid per unique key-system completion.', color: 'text-emerald-400' },
            ].map((c) => (
              <Card key={c.title} className="bg-card/60 border-border">
                <CardContent className="p-5">
                  <c.icon className={`h-6 w-6 ${c.color} mb-2`} />
                  <h3 className="text-sm font-semibold text-foreground mb-1">{c.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Script Catalog */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-foreground">
              {sort === 'trending' ? 'Trending Scripts' : 'Recent Scripts'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={sort === 'recent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSort('recent')}
              className={sort === 'recent' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-border text-muted-foreground'}
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" /> Recent
            </Button>
            <Button
              variant={sort === 'trending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSort('trending')}
              className={sort === 'trending' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-border text-muted-foreground'}
            >
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Trending
            </Button>
          </div>
        </div>

        {/* Game filter chips */}
        {games.length > 1 && (
          <div className="flex gap-2 flex-wrap mb-6">
            {games.map((game) => (
              <Button
                key={game}
                variant={activeGame === game ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveGame(game)}
                className={activeGame === game ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-border text-muted-foreground hover:text-foreground'}
              >
                {game}
              </Button>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          </div>
        ) : scripts.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
                <Eye className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">No scripts found</h2>
              <p className="text-muted-foreground max-w-md mb-4">
                {search || activeGame !== 'All'
                  ? 'Try adjusting your search or game filter.'
                  : 'No scripts have been published yet. Be the first to upload!'}
              </p>
              <Link href="/register">
                <Button className="bg-red-600 hover:bg-red-700 text-white">Upload Scripts</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {scripts.map((script) => (
              <ScriptHubCard key={script.id} script={script} />
            ))}
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="border-t border-border">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Key,
                title: '1. Get Your Key',
                description: 'Complete a short task on Work.ink, Linkvertise, or Lootlabs to claim a free key that unlocks the scripts.',
                color: 'text-red-400',
                bg: 'bg-red-500/10 border-red-500/20',
              },
              {
                icon: Copy,
                title: '2. Copy Loadstring',
                description: 'Open any script page, copy the loadstring, and drop your key in place of YOUR_KEY_HERE.',
                color: 'text-amber-400',
                bg: 'bg-amber-500/10 border-amber-500/20',
              },
              {
                icon: Eye,
                title: '3. Execute in Roblox',
                description: 'Paste the loadstring into your executor. The script is validated, obfuscated, and delivered securely.',
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10 border-emerald-500/20',
              },
            ].map((step) => (
              <Card key={step.title} className="bg-card border-border">
                <CardContent className="p-5">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${step.bg} border mb-3`}>
                    <step.icon className={`h-5 w-5 ${step.color}`} />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA for scripters */}
      <section className="border-t border-border">
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Protect &amp; Sell Your Scripts</h2>
          <p className="text-muted-foreground mb-6">Create an account to upload, obfuscate, key-lock, and earn from your Lua scripts.</p>
          <Link href="/register">
            <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold h-11 px-8 glow-red">
              Create Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-red-500" />
            <span className="text-sm text-muted-foreground">Apocalypse Hub</span>
          </div>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <Link href="/get-key" className="hover:text-foreground transition-colors">Get Key</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Register</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
