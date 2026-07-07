'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { FileCode2, Shield, Copy, Trash2, Eye, EyeOff, Gamepad2, Pencil, X, Plus, Check, Loader2 } from 'lucide-react';

interface ScriptCardProps {
  script: {
    id: string;
    name: string;
    description?: string | null;
    is_protected: boolean;
    is_published?: boolean;
    game?: string;
    games?: string[];
    created_at: string;
    updated_at: string;
  };
  onDelete?: (id: string) => void;
  onTogglePublish?: (id: string, published: boolean) => void;
  onUpdateGames?: (id: string, games: string[]) => Promise<void> | void;
  baseUrl?: string;
  keyParam?: string; // For paid users: "KEY_VALUE&uid=USER_ID", for free: undefined
}

export function ScriptCard({ script, onDelete, onTogglePublish, onUpdateGames, baseUrl, keyParam }: ScriptCardProps) {
  const keyPart = keyParam ?? 'YOUR_KEY_HERE';
  const loadstring = baseUrl
    ? `loadstring(game:HttpGet("${baseUrl}/api/scripts/serve/${script.id}?key=${keyPart}"))()`
    : '';

  const currentGames = script.games?.length ? script.games : script.game ? [script.game] : [];

  const [editingGames, setEditingGames] = useState(false);
  const [games, setGames] = useState<string[]>(currentGames);
  const [newGame, setNewGame] = useState('');
  const [savingGames, setSavingGames] = useState(false);

  const copyLoadstring = () => {
    if (loadstring) navigator.clipboard.writeText(loadstring);
  };

  const addGame = () => {
    const g = newGame.trim();
    if (!g) return;
    if (!games.some((x) => x.toLowerCase() === g.toLowerCase())) {
      setGames((prev) => [...prev, g].slice(0, 20));
    }
    setNewGame('');
  };

  const removeGame = (g: string) => setGames((prev) => prev.filter((x) => x !== g));

  const startEdit = () => {
    setGames(currentGames);
    setEditingGames(true);
  };

  const saveGames = async () => {
    if (!onUpdateGames || games.length === 0) return;
    setSavingGames(true);
    await onUpdateGames(script.id, games);
    setSavingGames(false);
    setEditingGames(false);
  };

  return (
    <Card className="bg-card border-border hover:border-red-900/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
              <FileCode2 className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-base text-foreground">{script.name}</CardTitle>
              <span className="text-xs text-muted-foreground">{new Date(script.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex gap-1.5">
            {script.is_protected && (
              <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Protected
              </Badge>
            )}
            {script.is_published !== undefined && (
              <Badge className={script.is_published ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs' : 'bg-secondary text-muted-foreground text-xs'}>
                {script.is_published ? 'Published' : 'Private'}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Supported games — viewable and (when editable) add/remove to keep updated */}
        <div className="mb-3">
          {editingGames ? (
            <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Supported games</p>
              <div className="flex flex-wrap gap-1.5">
                {games.map((g) => (
                  <span key={g} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                    {g}
                    <button onClick={() => removeGame(g)} className="text-muted-foreground hover:text-red-400" title={`Remove ${g}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {games.length === 0 && <span className="text-xs text-muted-foreground">Add at least one game.</span>}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newGame}
                  onChange={(e) => setNewGame(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGame(); } }}
                  placeholder="Add a game…"
                  className="h-8 bg-secondary border-border text-sm"
                />
                <Button size="sm" variant="outline" onClick={addGame} className="h-8 text-muted-foreground">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveGames} disabled={savingGames || games.length === 0} className="h-8 bg-red-600 hover:bg-red-700 text-white">
                  {savingGames ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1" />Save</>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingGames(false)} disabled={savingGames} className="h-8 text-muted-foreground">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {currentGames.map((g) => (
                <Badge key={g} variant="secondary" className="bg-secondary text-muted-foreground text-xs h-5">
                  <Gamepad2 className="h-2.5 w-2.5 mr-1" />
                  {g}
                </Badge>
              ))}
              {onUpdateGames && (
                <button onClick={startEdit} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" title="Edit supported games">
                  <Pencil className="h-3 w-3" />
                  Edit games
                </button>
              )}
            </div>
          )}
        </div>

        {script.description && (
          <p className="text-sm text-muted-foreground mb-3">{script.description}</p>
        )}

        {loadstring && (
          <div className="bg-secondary rounded-lg p-3 mb-3">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Loadstring Snippet</p>
            <code className="text-xs text-green-400 font-mono break-all leading-relaxed">{loadstring}</code>
          </div>
        )}

        <div className="flex gap-2">
          {loadstring && (
            <Button variant="outline" size="sm" onClick={copyLoadstring} className="text-muted-foreground">
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy
            </Button>
          )}
          {onTogglePublish && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTogglePublish(script.id, !script.is_published)}
              className={script.is_published ? 'text-emerald-400 hover:text-emerald-300' : 'text-muted-foreground'}
            >
              {script.is_published ? <EyeOff className="h-3.5 w-3.5 mr-1.5" /> : <Eye className="h-3.5 w-3.5 mr-1.5" />}
              {script.is_published ? 'Unpublish' : 'Publish'}
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(script.id)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
