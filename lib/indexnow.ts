import { SITE_URL } from './seo';

// IndexNow instantly notifies participating search engines (Bing, Yandex,
// Seznam, Naver — and the protocol Google has been trialing) that a URL changed,
// so new/updated pages get crawled within minutes instead of waiting for the
// next scheduled recrawl.
//
// The key is *meant* to be public: engines verify ownership by fetching it as a
// plaintext file at /<key>.txt. Because there's no secret to protect, we hardcode
// it here so the served file (public/<key>.txt) and the ping payload can never
// drift out of sync. If you ever rotate it, rename the public file to match.
export const INDEXNOW_KEY = 'apocd879a9e5cadf4f4984b64663d5bc507c2bc05373';

const ENDPOINT = 'https://api.indexnow.org/indexnow';

export interface IndexNowResult {
  ok: boolean;
  submitted: number;
  status?: number;
  skipped?: string;
}

function toAbsolute(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/**
 * Notify IndexNow engines that the given pages changed. Best-effort: it never
 * throws and self-aborts after a few seconds, so it can be awaited inside an API
 * route without meaningfully delaying (or ever breaking) the response.
 */
export async function pingIndexNow(paths: string[]): Promise<IndexNowResult> {
  try {
    const host = new URL(SITE_URL).host;
    // Engines can't fetch the key file on a local/preview host, so skip there.
    if (!host || host.includes('localhost') || host.endsWith('.local') || /^\d/.test(host)) {
      return { ok: false, submitted: 0, skipped: 'non-public host' };
    }

    const urlList = Array.from(new Set(paths.map(toAbsolute))).filter(Boolean).slice(0, 10000);
    if (urlList.length === 0) return { ok: false, submitted: 0, skipped: 'no urls' };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host,
          key: INDEXNOW_KEY,
          keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
          urlList,
        }),
        signal: controller.signal,
      });
      return { ok: res.ok, submitted: urlList.length, status: res.status };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Never let SEO pinging break the request that triggered it.
    return { ok: false, submitted: 0, skipped: 'error' };
  }
}
