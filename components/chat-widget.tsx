'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, X, Send, Loader2, ExternalLink, Eye } from 'lucide-react';
import { Logo } from '@/components/logo';
import { formatCount } from '@/lib/utils';
import { GREETING, ASSISTANT_NAME, DEFAULT_SUGGESTIONS, type AssistantLink } from '@/lib/assistant';

interface Hit {
  title: string;
  game: string;
  href: string;
  views: number;
  source: 'internal' | 'external';
  external?: boolean;
}

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  links?: AssistantLink[];
  hits?: Hit[];
  suggestions?: string[];
}

const INITIAL: Msg = { role: 'assistant', content: GREETING, suggestions: DEFAULT_SUGGESTIONS };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([INITIAL]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, loading]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;
    const nextMessages: Msg[] = [...messages, { role: 'user', content: question }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply || "Sorry, I didn't catch that. Try rephrasing?",
          links: data.links,
          hits: data.hits,
          suggestions: data.suggestions,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'I hit a snag reaching the server. Please try again in a moment.' },
      ]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open help assistant"
          className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-900/40 transition-transform hover:scale-105 hover:bg-red-700"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-[60] flex h-[min(600px,80vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-background/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <Logo className="h-6 w-6" />
              <div>
                <p className="text-sm font-semibold text-foreground">{ASSISTANT_NAME}</p>
                <p className="flex items-center gap-1 text-xs text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className="max-w-[85%] space-y-2">
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'rounded-br-sm bg-red-600 text-white'
                        : 'rounded-bl-sm bg-secondary text-foreground'
                    }`}
                  >
                    {m.content}
                  </div>

                  {/* Script results */}
                  {m.hits && m.hits.length > 0 && (
                    <div className="space-y-1.5">
                      {m.hits.map((h, j) =>
                        h.external ? (
                          <a
                            key={j}
                            href={h.href}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-red-900/40"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-foreground">{h.title}</span>
                              <span className="block truncate text-muted-foreground">{h.game}</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                              <Eye className="h-3 w-3" />
                              {formatCount(h.views)}
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </span>
                          </a>
                        ) : (
                          <Link
                            key={j}
                            href={h.href}
                            onClick={() => setOpen(false)}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-red-900/40"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-foreground">{h.title}</span>
                              <span className="block truncate text-muted-foreground">{h.game}</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                              <Eye className="h-3 w-3" />
                              {formatCount(h.views)}
                            </span>
                          </Link>
                        )
                      )}
                    </div>
                  )}

                  {/* Inline links (internal pages, or external web sources) */}
                  {m.links && m.links.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.links.map((l, j) =>
                        /^https?:\/\//i.test(l.href) ? (
                          <a
                            key={j}
                            href={l.href}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="inline-flex items-center gap-1 rounded-full border border-red-900/40 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20"
                          >
                            {l.label}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <Link
                            key={j}
                            href={l.href}
                            onClick={() => setOpen(false)}
                            className="rounded-full border border-red-900/40 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20"
                          >
                            {l.label}
                          </Link>
                        )
                      )}
                    </div>
                  )}

                  {/* Quick-reply suggestions */}
                  {m.suggestions && m.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.suggestions.map((s, j) => (
                        <button
                          key={j}
                          onClick={() => send(s)}
                          className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-red-900/40 hover:text-foreground"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-secondary px-3.5 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything…"
              className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-red-900/40"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-700 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
