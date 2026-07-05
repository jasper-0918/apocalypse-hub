'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { HeadphonesIcon, Send, CheckCircle, Loader2, MessageSquare } from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  response: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-red-500/20 text-red-400',
  in_progress: 'bg-amber-500/20 text-amber-400',
  resolved: 'bg-green-500/20 text-green-400',
  closed: 'bg-zinc-500/20 text-zinc-400',
};

export default function SupportPage() {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const token = () => localStorage.getItem('ah_session') || '';

  const loadTickets = async () => {
    if (!user) return;
    const res = await fetch('/api/support', { headers: { Authorization: `Bearer ${token()}` } });
    if (res.ok) setTickets(await res.json());
    setLoadingTickets(false);
  };

  useEffect(() => { loadTickets(); }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
    });
    if (res.ok) {
      setSubmitted(true);
      setSubject('');
      setMessage('');
      await loadTickets();
      setTimeout(() => setSubmitted(false), 4000);
    }
    setSubmitting(false);
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">Support</h1>
        <p className="text-muted-foreground">Submit a ticket and we'll get back to you</p>
      </div>

      <Card className="bg-card border-border mb-8">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
              <HeadphonesIcon className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-foreground">New Ticket</CardTitle>
              <CardDescription className="text-muted-foreground">Describe your issue and we'll respond soon</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {submitted && (
            <div className="flex items-center gap-2 text-green-400 text-sm mb-4 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Ticket submitted! We'll respond shortly.
            </div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                className="bg-secondary border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail..."
                className="bg-secondary border-border min-h-[120px]"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={submitting || !subject.trim() || !message.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" />Submit Ticket</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Your Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTickets ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No tickets yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div key={t.id} className="bg-secondary rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="font-medium text-foreground text-sm">{t.subject}</p>
                    <Badge className={`border-0 text-xs shrink-0 ${STATUS_COLOR[t.status]}`}>{t.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                  {t.response && (
                    <div className="mt-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                      <p className="text-xs text-green-400 mb-1 font-medium">Response from Support</p>
                      <p className="text-sm text-foreground">{t.response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
