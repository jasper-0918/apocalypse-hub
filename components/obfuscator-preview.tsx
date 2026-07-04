'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export function ObfuscatorPreview() {
  const [input, setInput] = useState('-- Example Lua script\nlocal playerName = "Player1"\nlocal health = 100\nprint("Hello " .. playerName .. "! Health: " .. health)');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOutput, setShowOutput] = useState(true);

  const handleObfuscate = async () => {
    if (!input) return;
    setLoading(true);
    try {
      const res = await fetch('/api/obfuscate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: input }),
      });
      const data = await res.json();
      setOutput(data.result || 'Obfuscation failed');
    } catch {
      setOutput('Error: Could not obfuscate');
    }
    setLoading(false);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
            <Lock className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <CardTitle className="text-lg text-foreground">Lua Obfuscator</CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Hybrid obfuscation: string encoding, variable renaming, control flow flattening
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Input (Lua)</label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={8}
            className="font-mono text-sm bg-secondary border-border resize-none"
            placeholder="Paste your Lua script here..."
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleObfuscate}
            disabled={loading || !input}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Obfuscating...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Obfuscate
              </>
            )}
          </Button>
          {output && (
            <Button
              variant="outline"
              onClick={() => setShowOutput(!showOutput)}
              className="text-muted-foreground"
            >
              {showOutput ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {showOutput ? 'Hide' : 'Show'} Output
            </Button>
          )}
        </div>

        {output && showOutput && (
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Obfuscated Output</label>
            <pre className="bg-secondary border border-border rounded-lg p-4 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
              {output}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
