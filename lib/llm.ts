// Multi-provider LLM client for the assistant. Supports OpenAI-compatible chat
// APIs (Groq, Cerebras, OpenRouter) plus Anthropic, each with MULTIPLE keys.
//
// Keys are read from env only (never hardcoded, never sent to the browser — this
// module is server-only). For each request we try providers in priority order;
// within a provider we try its keys in random order so free-tier rate limits are
// spread out, and on any failure (429/5xx/timeout) we fall through to the next
// key, then the next provider, then finally the caller's rule-based fallback.
//
// The assistant is intentionally TEXT-ONLY: the model never gets tools or DB
// access, so a jailbreak can't do anything but produce off-topic text.

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

type ProviderKind = 'openai' | 'anthropic';

interface Provider {
  name: string;
  kind: ProviderKind;
  url: string;
  model: string;
  keys: string[];
}

// Split a comma/newline/space separated key list from any of the given env vars.
function readKeys(...names: string[]): string[] {
  for (const n of names) {
    const raw = process.env[n];
    if (raw && raw.trim()) {
      return Array.from(
        new Set(
          raw
            .split(/[,\s]+/)
            .map((k) => k.trim())
            .filter(Boolean)
        )
      );
    }
  }
  return [];
}

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build the enabled provider list, in priority order. Only providers with at
// least one key are included.
function getProviders(): Provider[] {
  const catalog: Record<string, () => Provider | null> = {
    groq: () => {
      const keys = readKeys('GROQ_API_KEYS', 'GROQ_API_KEY');
      return keys.length
        ? {
            name: 'groq',
            kind: 'openai',
            url: 'https://api.groq.com/openai/v1/chat/completions',
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            keys,
          }
        : null;
    },
    cerebras: () => {
      const keys = readKeys('CEREBRAS_API_KEYS', 'CEREBRAS_API_KEY');
      return keys.length
        ? {
            name: 'cerebras',
            kind: 'openai',
            url: 'https://api.cerebras.ai/v1/chat/completions',
            model: process.env.CEREBRAS_MODEL || 'llama-3.3-70b',
            keys,
          }
        : null;
    },
    openrouter: () => {
      const keys = readKeys('OPENROUTER_API_KEYS', 'OPENROUTER_API_KEY');
      return keys.length
        ? {
            name: 'openrouter',
            kind: 'openai',
            url: 'https://openrouter.ai/api/v1/chat/completions',
            model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
            keys,
          }
        : null;
    },
    anthropic: () => {
      const keys = readKeys('ANTHROPIC_API_KEYS', 'ANTHROPIC_API_KEY');
      return keys.length
        ? {
            name: 'anthropic',
            kind: 'anthropic',
            url: 'https://api.anthropic.com/v1/messages',
            model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
            keys,
          }
        : null;
    },
  };

  const order = (process.env.LLM_PROVIDER_ORDER || 'groq,cerebras,openrouter,anthropic')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const providers: Provider[] = [];
  for (const name of order) {
    const make = catalog[name];
    if (!make) continue;
    const p = make();
    if (p) providers.push(p);
  }
  return providers;
}

export function isLlmConfigured(): boolean {
  return getProviders().length > 0;
}

const MAX_TOKENS = 320;
const TIMEOUT_MS = 12000;

async function callOpenAiCompatible(
  p: Provider,
  key: string,
  system: string,
  messages: LlmMessage[]
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(p.url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        // OpenRouter attribution headers (ignored by others).
        'HTTP-Referer': 'https://apocalypsebloxhub.vercel.app',
        'X-Title': 'Apocalypse Blox Hub',
      },
      body: JSON.stringify({
        model: p.model,
        max_tokens: MAX_TOKENS,
        temperature: 0.4,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
    });
    if (!res.ok) return null; // 401/429/5xx → let caller try the next key/provider
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === 'string' && text.trim() ? text.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function callAnthropic(
  p: Provider,
  key: string,
  system: string,
  messages: LlmMessage[]
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(p.url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: p.model, max_tokens: MAX_TOKENS, system, messages }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('').trim()
      : '';
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generate a reply, trying each provider (priority order) and each key (random
 * order) until one succeeds. Returns null if nothing is configured or every
 * attempt fails — the caller then uses its rule-based answer.
 */
export async function generateReply(system: string, messages: LlmMessage[]): Promise<string | null> {
  const trimmed = messages.slice(-8);
  for (const p of getProviders()) {
    for (const key of shuffled(p.keys)) {
      const text =
        p.kind === 'anthropic'
          ? await callAnthropic(p, key, system, trimmed)
          : await callOpenAiCompatible(p, key, system, trimmed);
      if (text) return text;
    }
  }
  return null;
}
