'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Loader2, CheckCircle, Copy, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function UploadScriptPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [game, setGame] = useState('Universal');
  const [category, setCategory] = useState('general');
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ loadstring?: string; error?: string } | null>(null);
  const [games, setGames] = useState(['Universal', 'Blox Fruits', 'Pet Simulator X', 'Murder Mystery 2', 'Da Hood', 'Arsenal', 'Adopt Me!', 'Doors', 'Brookhaven']);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/owner/games')
      .then((r) => r.ok ? r.json() : [])
      .then((data: any[]) => {
        const names = data.filter((g: any) => g.is_active).map((g: any) => g.name);
        if (names.length > 0) setGames(names);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const token = localStorage.getItem('ah_session');
    try {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description, content, game, category, isPublished }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ loadstring: data.loadstring });
      } else {
        setResult({ error: data.error });
      }
    } catch {
      setResult({ error: 'Upload failed. Please try again.' });
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/dashboard/scripts" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to Scripts
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">Upload Script</h1>
        <p className="text-muted-foreground">Your script will be obfuscated and protected with the key system automatically.</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
              <Lock className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-foreground">Script Details</CardTitle>
              <CardDescription className="text-muted-foreground">Paste your Lua script below</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Script Name</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-secondary border-border"
                placeholder="My Awesome Script"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Description (optional)</Label>
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-secondary border-border"
                placeholder="What does this script do?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Game</Label>
                <Input
                  type="text"
                  list="game-suggestions"
                  value={game}
                  onChange={(e) => setGame(e.target.value)}
                  className="bg-secondary border-border"
                  placeholder="Type any game (e.g. Blox Fruits)"
                />
                <datalist id="game-suggestions">
                  {games.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">Pick a suggestion or type the game your script is for.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="combat">Combat</SelectItem>
                    <SelectItem value="movement">Movement</SelectItem>
                    <SelectItem value="utility">Utility</SelectItem>
                    <SelectItem value="gui">GUI</SelectItem>
                    <SelectItem value="auto-farm">Auto Farm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Lua Script Content</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={14}
                className="font-mono text-sm bg-secondary border-border resize-none"
                placeholder="-- Paste your Lua script here..."
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Publish to Hub</p>
                <p className="text-xs text-muted-foreground">Make this script visible in the public catalog for all users</p>
              </div>
              <Switch
                checked={isPublished}
                onCheckedChange={setIsPublished}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-11"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading & Obfuscating...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Upload & Protect Script
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result?.loadstring && (
        <Card className="mt-6 bg-card border-green-900/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-green-400 font-semibold mb-3">
              <CheckCircle className="h-5 w-5" />
              Script uploaded successfully!
            </div>
            {isPublished && (
              <p className="text-sm text-emerald-400 mb-2">Published to the public hub catalog.</p>
            )}
            <p className="text-muted-foreground text-sm mb-3">
              Use this loadstring in your Roblox game (replace YOUR_KEY_HERE with a valid key):
            </p>
            <pre className="bg-secondary border border-border rounded-lg p-4 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
              {result.loadstring}
            </pre>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(result.loadstring!)}
              className="mt-3 text-muted-foreground"
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy to clipboard
            </Button>
          </CardContent>
        </Card>
      )}

      {result?.error && (
        <Card className="mt-6 bg-card border-red-900/30">
          <CardContent className="p-4">
            <p className="text-red-400">{result.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
