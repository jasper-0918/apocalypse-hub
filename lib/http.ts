import { NextResponse } from 'next/server';

// Shared Cache-Control for PUBLIC, read-only catalog responses.
//
// We only set `s-maxage` (shared/CDN caches) + `stale-while-revalidate`, never
// `max-age`, so the browser always revalidates but Vercel's edge serves repeat
// hits without re-running the function or touching Supabase. The edge caches by
// full URL, so each distinct game/search/sort/page is cached independently, and
// `stale-while-revalidate` serves the previous copy instantly while one request
// refreshes it in the background. Never use these on authenticated responses.
export function publicCacheHeaders(sMaxAge = 60, swr = 300): Record<string, string> {
  const value = `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`;
  return { 'Cache-Control': value, 'CDN-Cache-Control': value };
}

// NextResponse.json(...) with the public CDN cache headers attached.
export function cachedJson(data: unknown, sMaxAge = 60, swr = 300) {
  return NextResponse.json(data, { headers: publicCacheHeaders(sMaxAge, swr) });
}
