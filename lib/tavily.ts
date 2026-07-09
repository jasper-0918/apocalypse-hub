// Tavily web-search client for the assistant's "search the web" mode. Server-only.
// Multiple keys are rotated (free-tier friendly). Returns a short answer + the top
// source results; the caller grounds the LLM on these and shows the sources.

export interface WebResult {
  title: string;
  url: string;
  content: string;
}

export interface WebSearch {
  answer: string | null;
  results: WebResult[];
}

function readKeys(): string[] {
  const raw = process.env.TAVILY_API_KEYS || process.env.TAVILY_API_KEY || '';
  return Array.from(
    new Set(
      raw
        .split(/[,\s]+/)
        .map((k) => k.trim())
        .filter(Boolean)
    )
  );
}

export function isWebSearchConfigured(): boolean {
  return readKeys().length > 0;
}

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Search the web via Tavily. Returns null if not configured or every key fails. */
export async function webSearch(query: string): Promise<WebSearch | null> {
  const keys = readKeys();
  if (keys.length === 0 || !query.trim()) return null;

  for (const key of shuffled(keys)) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: key,
          query: query.slice(0, 400),
          search_depth: 'basic',
          max_results: 5,
          include_answer: true,
        }),
      });
      if (!res.ok) continue; // rate-limited/invalid key → try the next
      const data = await res.json();
      const results: WebResult[] = Array.isArray(data?.results)
        ? data.results.slice(0, 5).map((r: any) => ({
            title: typeof r?.title === 'string' ? r.title : '',
            url: typeof r?.url === 'string' ? r.url : '',
            content: typeof r?.content === 'string' ? r.content : '',
          }))
        : [];
      const answer = typeof data?.answer === 'string' && data.answer.trim() ? data.answer.trim() : null;
      if (answer || results.length) return { answer, results };
      return null;
    } catch {
      // timeout/network → try the next key
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
