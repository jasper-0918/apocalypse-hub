'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Gamepad2, Plus, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';

interface Game {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  const token = () => localStorage.getItem('ah_session') || '';

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/owner/games', { headers: { Authorization: `Bearer ${token()}` } });
    if (res.ok) setGames(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    setError('');
    const res = await fetch('/api/owner/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = await res.json();
    if (res.ok) { setNewName(''); await load(); }
    else setError(data.error || 'Failed to add game');
    setAdding(false);
  };

  const remove = async (id: string) => {
    await fetch(`/api/owner/games/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` },
    });
    setGames((g) => g.filter((x) => x.id !== id));
  };

  const toggle = async (game: Game) => {
    const res = await fetch(`/api/owner/games/${game.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ is_active: !game.is_active }),
    });
    if (res.ok) setGames((g) => g.map((x) => x.id === game.id ? { ...x, is_active: !x.is_active } : x));
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">Game Tags</h1>
        <p className="text-muted-foreground">Manage the Roblox game names shown in the script catalog filter</p>
      </div>

      <Card className="bg-card border-border mb-6">
        <CardHeader>
          <CardTitle className="text-foreground">Add New Game</CardTitle>
          <CardDescription className="text-muted-foreground">
            Add a Roblox game name to the catalog filter tags
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="e.g. Anime Defenders"
              className="bg-secondary border-border"
            />
            <Button
              onClick={add}
              disabled={adding || !newName.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Game List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
            </div>
          ) : games.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No games yet.</p>
          ) : (
            <div className="space-y-2">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="flex items-center justify-between bg-secondary rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Gamepad2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className={`text-sm font-medium ${game.is_active ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                      {game.name}
                    </span>
                    {!game.is_active && (
                      <Badge className="bg-zinc-600/20 text-zinc-400 border-0 text-xs">Hidden</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggle(game)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      title={game.is_active ? 'Hide' : 'Show'}
                    >
                      {game.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(game.id)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
