'use client';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { FileCode2, Shield, Copy, Trash2, Eye, EyeOff, Gamepad2 } from 'lucide-react';

interface ScriptCardProps {
  script: {
    id: string;
    name: string;
    description?: string | null;
    is_protected: boolean;
    is_published?: boolean;
    game?: string;
    category?: string;
    created_at: string;
    updated_at: string;
  };
  onDelete?: (id: string) => void;
  onTogglePublish?: (id: string, published: boolean) => void;
  baseUrl?: string;
  keyParam?: string; // For paid users: "KEY_VALUE&uid=USER_ID", for free: undefined
}

export function ScriptCard({ script, onDelete, onTogglePublish, baseUrl, keyParam }: ScriptCardProps) {
  const keyPart = keyParam ?? 'YOUR_KEY_HERE';
  const loadstring = baseUrl
    ? `loadstring(game:HttpGet("${baseUrl}/api/scripts/serve/${script.id}?key=${keyPart}"))()`
    : '';

  const copyLoadstring = () => {
    if (loadstring) navigator.clipboard.writeText(loadstring);
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
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{new Date(script.created_at).toLocaleDateString()}</span>
                {script.game && (
                  <Badge variant="secondary" className="bg-secondary text-muted-foreground text-xs h-5">
                    <Gamepad2 className="h-2.5 w-2.5 mr-1" />
                    {script.game}
                  </Badge>
                )}
              </div>
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
