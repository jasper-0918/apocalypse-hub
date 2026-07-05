'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Flame,
  Shield,
  Lock,
  Key,
  Search,
  Copy,
  CheckCircle,
  Gamepad2,
  Eye,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface CatalogScript {
  id: string;
  name: string;
  description: string | null;
  game: string;
  category: string;
  is_protected: boolean;
  created_at: string;
  owner_username: string;
}

export default function HomePage() {
  const [scripts, setScripts] = useState<CatalogScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeGame, setActiveGame] = useState('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [games, setGames] = useState<string[]>(['All']);
  const [paidKeyInfo, setPaidKeyInfo] = useState<{ key: string; uid: string } | null>(null);

  useEffect(() => {
    const fetchScripts = async () => {
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (activeGame !== 'All') params.set('game', activeGame);
        const res = await fetch(`/api/scripts/catalog?${params}`);
        if (res.ok) setScripts(await res.json());
      } catch {
        // Silently fail
      }
      setLoading(false);
    };
    fetchScripts();
  }, [search, activeGame]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ah_session') : null;
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((meData) => {
        if (!meData?.user) return;
        const PAID = ['PRO', 'SCRIPTER', 'DEVELOPER'];
        if (!PAID.includes(meData.user.plan) && meData.user.role !== 'OWNER') return;
        return fetch('/api/keys/paid', { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => r.ok ? r.json() : null)
          .then((keyData) => {
            if (keyData?.key?.value) {
              setPaidKeyInfo({ key: keyData.key.value, uid: meData.user.id });
            }
          });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/owner/games')
      .then((r) => r.ok ? r.json() : [])
      .then((data: any[]) => {
        const names = data.filter((g) => g.is_active).map((g: any) => g.name);
        if (names.length > 0) setGames(['All', ...names]);
      })
      .catch(() => {});
  }, []);

  const copyLoadstring = (scriptId: string) => {
    const baseUrl = window.location.origin;
    const keyPart = paidKeyInfo
      ? `${paidKeyInfo.key}&uid=${paidKeyInfo.uid}`
      : 'YOUR_KEY_HERE';
    const snippet = `loadstring(game:HttpGet("${baseUrl}/api/scripts/serve/${scriptId}?key=${keyPart}"))()`;
    navigator.clipboard.writeText(snippet);
    setCopiedId(scriptId);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(239,68,68,0.06)_0%,_transparent_50%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-12 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-3">
            Apocalypse <span className="text-red-500 text-glow-red">Hub</span>
          </h1>
          <p className="text-muted-foreground text-lg mb-6 max-w-xl mx-auto">
            Premium script hub protected by key system. Get your key, copy the loadstring, and execute.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/get-key">
              <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold h-10 px-6 glow-red">
                <Key className="mr-2 h-4 w-4" />
                Get Free Key
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="border-border text-foreground h-10 px-6">
                Upload Scripts
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-red-400" /> Key Protected</span>
            <span className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-amber-400" /> Obfuscated</span>
            <span className="flex items-center gap-1.5"><Gamepad2 className="h-4 w-4 text-emerald-400" /> {scripts.length} Scripts</span>
          </div>
        </div>
      </section>

      {/* Script Catalog */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        {/* Search + Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scripts..."
              className="pl-9 bg-card border-border h-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
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
        </div>

        {/* Script Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          </div>
        ) : scripts.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
                <Gamepad2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">No scripts found</h2>
              <p className="text-muted-foreground max-w-md mb-4">
                {search || activeGame !== 'All'
                  ? 'Try adjusting your search or game filter.'
                  : 'No scripts have been published yet. Be the first to upload!'}
              </p>
              <Link href="/register">
                <Button className="bg-red-600 hover:bg-red-700 text-white">
                  Upload Scripts
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scripts.map((script) => (
              <Card key={script.id} className="bg-card border-border hover:border-red-900/30 transition-colors group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base text-foreground truncate">{script.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="secondary" className="bg-secondary text-muted-foreground text-xs">
                          <Gamepad2 className="h-3 w-3 mr-1" />
                          {script.game}
                        </Badge>
                        <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Protected
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {script.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{script.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span>by {script.owner_username}</span>
                    <span>{new Date(script.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2">
                    {!paidKeyInfo && (
                      <Link href={`/get-key?scriptId=${script.id}`} className="flex-1">
                        <Button
                          size="sm"
                          className="w-full bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Key className="mr-1.5 h-3.5 w-3.5" />
                          Get Key
                        </Button>
                      </Link>
                    )}
                    <Button
                      onClick={() => copyLoadstring(script.id)}
                      variant="outline"
                      size="sm"
                      className={`${paidKeyInfo ? 'w-full' : 'flex-1'} border-border text-foreground hover:bg-red-500/10 hover:text-red-400 hover:border-red-900/30`}
                    >
                      {copiedId === script.id ? (
                        <>
                          <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-green-400" />
                          <span className="text-green-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1.5 h-3.5 w-3.5" />
                          {paidKeyInfo ? 'Copy Loadstring' : 'Copy'}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
                description: 'Complete a short task on Work.ink or Linkvertise to claim a free key. Keys unlock all scripts and are valid for all games.',
                color: 'text-red-400',
                bg: 'bg-red-500/10 border-red-500/20',
              },
              {
                icon: Copy,
                title: '2. Copy Loadstring',
                description: 'Browse the script catalog, click "Copy Loadstring", and replace YOUR_KEY_HERE with your key.',
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
          <h2 className="text-2xl font-bold text-foreground mb-2">Protect Your Scripts</h2>
          <p className="text-muted-foreground mb-6">Create an account to upload, obfuscate, and key-lock your Lua scripts.</p>
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
