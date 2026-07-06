// Lightweight in-memory rate limiter for auth endpoints.
//
// This is best-effort: on serverless each warm instance keeps its own counters,
// so it slows brute-force / abuse without being a hard global guarantee. For a
// strict global limit you'd back this with Redis/Upstash, but for protecting
// login/register/reset from casual abuse this is a big, dependency-free win.

interface Bucket {
  count: number;
  reset: number; // epoch ms when the window resets
}

const buckets = new Map<string, Bucket>();

/** Best-effort client IP from the proxy headers Vercel sets. */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export interface RateResult {
  ok: boolean;
  retryAfter: number; // seconds until the window resets (when blocked)
}

/**
 * Fixed-window limiter. Returns ok:false once `limit` hits happen within
 * `windowMs` for the same key.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();

  // Opportunistic cleanup so the map can't grow unbounded on a long-lived instance.
  if (buckets.size > 5000) {
    buckets.forEach((b, k) => {
      if (now > b.reset) buckets.delete(k);
    });
  }

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.reset - now) / 1000)) };
  }
  return { ok: true, retryAfter: 0 };
}
