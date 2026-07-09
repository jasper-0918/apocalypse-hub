// Thin client for the public ScriptBlox API. Used to populate the "Discover"
// catalog (external_scripts). We only read public listing endpoints:
//   * latest   -> /api/script/fetch?page=N
//   * popular  -> /api/script/fetch?sortBy=views&order=desc&page=N
//   * search   -> /api/script/search?q=...&sortBy=views&order=desc&page=N

const BASE = 'https://scriptblox.com';

export interface ScriptbloxScript {
  externalId: string;
  title: string;
  slug: string;
  gameName: string;
  gameImage: string | null;
  image: string | null;
  script: string | null;
  scriptUrl: string;
  scriptType: 'free' | 'paid';
  isKey: boolean;
  isUniversal: boolean;
  isVerified: boolean;
  isPatched: boolean;
  views: number;
  sourceCreatedAt: string | null;
}

export interface ScriptbloxPage {
  scripts: ScriptbloxScript[];
  totalPages: number;
  nextPage: number | null;
}

export type ScriptbloxMode = 'popular' | 'latest';

function toAbsolute(url: unknown): string | null {
  if (typeof url !== 'string' || !url) return null;
  if (url.startsWith('http')) return url;
  return `${BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

function mapScript(raw: any): ScriptbloxScript | null {
  const externalId = raw?._id ? String(raw._id) : '';
  const title = typeof raw?.title === 'string' ? raw.title.trim() : '';
  if (!externalId || !title) return null;

  const slug = typeof raw?.slug === 'string' ? raw.slug : '';
  const scriptType = raw?.scriptType === 'paid' ? 'paid' : 'free';

  return {
    externalId,
    title,
    slug,
    gameName: (raw?.game?.name && String(raw.game.name).trim()) || 'Universal',
    gameImage: toAbsolute(raw?.game?.imageUrl),
    image: toAbsolute(raw?.image ?? raw?.game?.imageUrl),
    script: typeof raw?.script === 'string' ? raw.script : null,
    scriptUrl: slug ? `${BASE}/script/${slug}` : BASE,
    scriptType,
    isKey: !!raw?.key,
    isUniversal: !!raw?.isUniversal,
    isVerified: !!raw?.verified,
    isPatched: !!raw?.isPatched,
    views: Number(raw?.views) || 0,
    sourceCreatedAt: raw?.createdAt || raw?.lastBump || null,
  };
}

async function getJson(url: string, timeoutMs = 15000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // ScriptBlox rejects requests without a browser-like UA.
        'User-Agent':
          'Mozilla/5.0 (compatible; ApocalypseBloxHub/1.0; +https://apocalypsebloxhub.vercel.app)',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`ScriptBlox ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function parsePage(json: any): ScriptbloxPage {
  const rawScripts: any[] = Array.isArray(json?.result?.scripts) ? json.result.scripts : [];
  const scripts = rawScripts.map(mapScript).filter((s): s is ScriptbloxScript => !!s);
  return {
    scripts,
    totalPages: Number(json?.result?.totalPages) || 1,
    nextPage: json?.result?.nextPage ?? null,
  };
}

/** One page of the latest or most-viewed scripts. */
export async function fetchScriptbloxList(mode: ScriptbloxMode, page = 1): Promise<ScriptbloxPage> {
  const params =
    mode === 'popular'
      ? `?sortBy=views&order=desc&page=${page}`
      : `?page=${page}`;
  const json = await getJson(`${BASE}/api/script/fetch${params}`);
  return parsePage(json);
}

/** Search ScriptBlox (most-viewed first). Used by the assistant's "find a script". */
export async function searchScriptblox(query: string, page = 1): Promise<ScriptbloxPage> {
  const q = encodeURIComponent(query.trim());
  const json = await getJson(`${BASE}/api/script/search?q=${q}&sortBy=views&order=desc&page=${page}`);
  return parsePage(json);
}
