export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getClientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { generateReply } from '@/lib/llm';
import { webSearch, isWebSearchConfigured } from '@/lib/tavily';
import {
  matchKb,
  detectSearchQuery,
  DEFAULT_SUGGESTIONS,
  SYSTEM_PROMPT,
  WEB_SYSTEM_PROMPT,
  type ChatMessage,
  type AssistantLink,
  type ScriptHit,
} from '@/lib/assistant';

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'source';
  }
}

type Hit = ScriptHit;

// Find matching published scripts in the catalog (includes imported ones).
async function searchScripts(query: string): Promise<Hit[]> {
  const supabase = createServerClient();
  const like = `%${query}%`;
  const hits: Hit[] = [];

  try {
    const { data } = await supabase
      .from('scripts')
      .select('name, slug, game, view_count')
      .eq('is_published', true)
      .or(`name.ilike.${like},game.ilike.${like}`)
      .order('view_count', { ascending: false })
      .limit(6);
    for (const s of data || []) {
      hits.push({
        title: s.name,
        game: s.game || 'Universal',
        href: `/script/${s.slug || ''}`,
        views: s.view_count ?? 0,
      });
    }
  } catch {
    /* ignore */
  }

  return hits;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  // The bot is public and may call a paid/rate-limited LLM, so keep the per-IP
  // budget modest. Failing over to the rule-based reply keeps it useful anyway.
  const rl = rateLimit(`assistant:${ip}`, 20, 5 * 60 * 1000);
  if (!rl.ok) return tooManyRequests(rl.retryAfter, 'You are sending messages too fast. Give it a moment.');

  const body = await req.json().catch(() => ({}));
  const messages: ChatMessage[] = Array.isArray(body.messages)
    ? body.messages
        .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map((m: any) => ({ role: m.role, content: m.content.slice(0, 1000) }))
        .slice(-10)
    : [];

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const question = lastUser?.content?.trim() || '';
  if (!question) {
    return NextResponse.json({ reply: "What can I help you with?", suggestions: DEFAULT_SUGGESTIONS });
  }

  let links: AssistantLink[] = [];
  let hits: Hit[] = [];
  let ruleReply = '';
  let grounding = '';
  let useWebPrompt = false;

  const query = detectSearchQuery(question);
  if (query) {
    hits = await searchScripts(query);
    if (hits.length) {
      ruleReply = `Here are some scripts I found for “${query}”. Click one to open it.`;
      grounding = `The user is searching for "${query}". These matching scripts exist (list them helpfully, do not invent others): ${hits
        .map((h) => `${h.title} [${h.game}]`)
        .join('; ')}.`;
    } else {
      ruleReply = `I couldn't find a “${query}” script in our catalog yet. Try the Discover page for popular community scripts, or open a request in Support.`;
      links = [
        { label: 'Discover', href: '/discover' },
        { label: 'Support', href: '/dashboard/support' },
      ];
      grounding = `The user searched for "${query}" but no scripts matched. Suggest the Discover page (/discover) and Support (/dashboard/support). Do not invent scripts.`;
    }
  } else {
    const kb = matchKb(question);
    if (kb) {
      ruleReply = kb.answer;
      links = kb.links || [];
    } else {
      // Not in our knowledge base — reach for live web results if configured.
      const web = question.length >= 6 && isWebSearchConfigured() ? await webSearch(question) : null;
      if (web && (web.answer || web.results.length)) {
        useWebPrompt = true;
        ruleReply = web.answer || 'Here’s what I found on the web.';
        links = web.results
          .filter((r) => r.url)
          .slice(0, 4)
          .map((r) => ({ label: hostLabel(r.url), href: r.url }));
        grounding =
          `Live web search results for "${question}":\n` +
          web.results
            .map((r, i) => `[${i + 1}] ${r.title} — ${r.url}\n${r.content.slice(0, 350)}`)
            .join('\n\n');
      } else {
        ruleReply =
          "I can help with getting a key, using or uploading scripts, pricing, earnings, and account help. Try one of the suggestions below, or open a support ticket for anything else.";
        links = [
          { label: 'Get a key', href: '/get-key' },
          { label: 'Support', href: '/dashboard/support' },
        ];
      }
    }
  }

  // Prefer a natural LLM reply when a provider is configured; otherwise fall
  // back to the deterministic KB/search/web text. The LLM only writes prose —
  // the links and script results always come from our own server logic.
  const base = useWebPrompt ? WEB_SYSTEM_PROMPT : SYSTEM_PROMPT;
  const system = grounding ? `${base}\n\nContext for this turn: ${grounding}` : base;
  const aiReply = await generateReply(
    system,
    messages.map((m) => ({ role: m.role, content: m.content }))
  );

  return NextResponse.json({
    reply: aiReply || ruleReply,
    links,
    hits,
    suggestions: messages.length <= 1 ? DEFAULT_SUGGESTIONS : undefined,
  });
}
