'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/lib/session';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageSquare, ChevronDown, ChevronUp, Send, UserCheck } from 'lucide-react';

interface Ticket {
  id: string;
  username: string | null;
  email: string | null;
  subject: string;
  message: string;
  status: string;
  priority: string;
  response: string | null;
  assigned_username: string | null;
  created_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-red-500/20 text-red-400',
  in_progress: 'bg-amber-500/20 text-amber-400',
  resolved: 'bg-green-500/20 text-green-400',
  closed: 'bg-zinc-500/20 text-zinc-400',
};

const PRIORITY_COLOR: Record<string, string> = {
  low: 'text-zinc-400',
  normal: 'text-sky-400',
  high: 'text-amber-400',
  urgent: 'text-red-400',
};

export function SupportTicketsPanel() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async (status?: string) => {
    setLoading(true);
    const params = status && status !== 'all' ? `?status=${status}` : '';
    const res = await fetch(`/api/owner/support${params}`, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (res.ok) setTickets(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(statusFilter); }, [statusFilter]);

  const update = async (id: string, updates: Record<string, any>) => {
    setSaving(true);
    const res = await fetch(`/api/owner/support/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      setTickets((t) => t.map((x) => (x.id === id ? { ...x, ...updated } : x)));
      if (updates.response !== undefined) {
        setResponse('');
        setExpanded(null);
      }
    }
    setSaving(false);
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tickets</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
        </div>
      ) : tickets.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-3 opacity-40" />
            <p>No tickets found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Card key={t.id} className="bg-card border-border">
              <CardContent className="p-0">
                <button
                  className="w-full text-left p-4 hover:bg-secondary/30 transition-colors rounded-t-lg"
                  onClick={() => { setExpanded(expanded === t.id ? null : t.id); setResponse(t.response || ''); }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-foreground text-sm truncate">{t.subject}</span>
                        <Badge className={`border-0 text-xs shrink-0 ${STATUS_COLOR[t.status]}`}>{t.status}</Badge>
                        <span className={`text-xs font-medium shrink-0 ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</span>
                        {t.assigned_username && (
                          <Badge className="border-0 text-xs shrink-0 bg-sky-500/15 text-sky-400">
                            <UserCheck className="h-3 w-3 mr-1" />
                            {t.assigned_username}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.username || t.email || 'Anonymous'} · {new Date(t.created_at).toLocaleString()}
                      </p>
                    </div>
                    {expanded === t.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    )}
                  </div>
                </button>

                {expanded === t.id && (
                  <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
                    <div className="bg-secondary rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Message</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{t.message}</p>
                    </div>

                    {t.response && (
                      <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                        <p className="text-xs text-green-400 mb-1">Previous Response</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{t.response}</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <Textarea
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        placeholder="Write your response..."
                        className="bg-secondary border-border min-h-[80px] text-sm"
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          onClick={() => update(t.id, { response, status: 'resolved' })}
                          disabled={saving || !response.trim()}
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                          Respond & Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={saving}
                          onClick={() => update(t.id, { claim: true })}
                          className="border-sky-500/30 text-sky-400 hover:text-sky-300 text-xs h-8"
                        >
                          <UserCheck className="h-3.5 w-3.5 mr-1" /> Claim
                        </Button>
                        {(['open', 'in_progress', 'resolved', 'closed'] as const).map((s) =>
                          t.status !== s ? (
                            <Button
                              key={s}
                              size="sm"
                              variant="outline"
                              disabled={saving}
                              onClick={() => update(t.id, { status: s })}
                              className="border-border text-muted-foreground hover:text-foreground text-xs h-8"
                            >
                              Mark {s.replace('_', ' ')}
                            </Button>
                          ) : null
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
