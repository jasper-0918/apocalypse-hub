'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { copyText } from '@/lib/clipboard';
import { ThumbnailFallback } from '@/components/script-hub-card';
import { isFamousGame } from '@/lib/games';
import { Lock, Loader2, CheckCircle, Copy, ArrowLeft, Plus, X, Gamepad2, ImagePlus, Trash2 } from 'lucide-react';
import Link from 'next/link';

const DEFAULT_GAMES = ['Universal', 'Blox Fruits', 'Pet Simulator X', 'Murder Mystery 2', 'Da Hood', 'Arsenal', 'Adopt Me!', 'Doors', 'Brookhaven'];

export default function UploadScriptPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [games, setGames] = useState<string[]>(['Universal']);
  const [gameInput, setGameInput] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [thumbError, setThumbError] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ loadstring?: string; slug?: string; error?: string } | null>(null);
  const [suggestions, setSuggestions] = useState(DEFAULT_GAMES);

  useEffect(() => {
    fetch('/api/owner/games')
      .then((r) => r.ok ? r.json() : [])
      .then((data: any[]) => {
        const names = data.filter((g: any) => g.is_active).map((g: any) => g.name);
        if (names.length > 0) setSuggestions(names);
      })
      .catch(() => {});
  }, []);

  const addGame = (value: string) => {
    const g = value.trim();
    if (!g) return;
    setGames((prev) => (prev.some((x) => x.toLowerCase() === g.toLowerCase()) ? prev : [...prev, g]));
    setGameInput('');
  };

  const removeGame = (g: string) => setGames((prev) => prev.filter((x) => x !== g));

  const uploadThumb = async (file: File) => {
    setThumbError('');
    setUploadingThumb(true);
    try {
      const token = localStorage.getItem('ah_session');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/scripts/thumbnail', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok) setThumbnailUrl(data.url);
      else setThumbError(data.error || 'Upload failed.');
    } catch {
      setThumbError('Upload failed. Please try again.');
    }
    setUploadingThumb(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (games.length === 0) {
      setResult({ error: 'Add at least one supported game.' });
      return;
    }
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
        body: JSON.stringify({ name, description, content, games, thumbnailUrl, isPublished }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ loadstring: data.loadstring, slug: data.slug });
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

            {/* Supported games — add as many as the script works for */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Supported Games</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  list="game-suggestions"
                  value={gameInput}
                  onChange={(e) => setGameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addGame(gameInput);
                    }
                  }}
                  className="bg-secondary border-border"
                  placeholder="Type a game (e.g. Blox Fruits) and press Add"
                />
                <datalist id="game-suggestions">
                  {suggestions.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
                <Button
                  type="button"
                  onClick={() => addGame(gameInput)}
                  className="bg-secondary hover:bg-secondary/70 text-foreground border border-border shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              {games.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {games.map((g, i) => (
                    <Badge
                      key={g}
                      variant="secondary"
                      className="bg-red-500/10 text-red-300 border border-red-500/20 pl-2 pr-1 py-1 gap-1"
                    >
                      <Gamepad2 className="h-3 w-3" />
                      {g}
                      {i === 0 && <span className="text-[10px] uppercase text-muted-foreground ml-0.5">primary</span>}
                      <button type="button" onClick={() => removeGame(g)} className="ml-0.5 rounded hover:bg-red-500/20 p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">The first game is the primary one shown on the card. Add more for universal or multi-game scripts.</p>
            </div>

            {/* Thumbnail / cover image */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Thumbnail (optional)</Label>
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Live preview */}
                <div className="relative aspect-video w-full sm:w-64 shrink-0 overflow-hidden rounded-lg border border-border bg-black">
                  {thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbnailUrl} alt="Thumbnail preview" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <ThumbnailFallback name={name || 'Your Script'} game={games[0]} />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadThumb(f); e.currentTarget.value = ''; }}
                      />
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground hover:bg-secondary/70">
                        {uploadingThumb ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                        {uploadingThumb ? 'Uploading…' : 'Upload image'}
                      </span>
                    </label>
                    {thumbnailUrl && (
                      <Button type="button" variant="outline" size="sm" className="text-red-400 hover:bg-red-500/10" onClick={() => setThumbnailUrl('')}>
                        <Trash2 className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
                  <Input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    className="bg-secondary border-border"
                    placeholder="…or paste an image URL"
                  />
                  {thumbError && <p className="text-xs text-red-400">{thumbError}</p>}
                  <p className="text-xs text-muted-foreground">
                    PNG/JPG/WebP/GIF, up to 3MB.{' '}
                    {!thumbnailUrl && isFamousGame(games[0])
                      ? `No image? We'll use a recommended ${games[0]} cover automatically.`
                      : !thumbnailUrl
                      ? "No image? A default Roblox-style cover is used automatically."
                      : ''}
                  </p>
                </div>
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
            {isPublished && result.slug && (
              <p className="text-sm text-emerald-400 mb-2">
                Published to the public hub —{' '}
                <Link href={`/script/${result.slug}`} className="underline hover:text-emerald-300">
                  view its page
                </Link>
                .
              </p>
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
              onClick={() => copyText(result.loadstring!)}
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
