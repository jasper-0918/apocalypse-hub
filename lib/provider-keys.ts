// Shared helpers for the assistant's external providers (LLMs + Tavily).
// Server-only: reads API keys from env and rotates them. Keeping this in one
// place avoids duplicating the parse/shuffle logic across lib/llm.ts and
// lib/tavily.ts.

/** Split a comma/newline/space separated key list from the first env var that's set. */
export function readEnvKeys(...names: string[]): string[] {
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

/** Fisher–Yates copy — used to spread load across free-tier keys. */
export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
