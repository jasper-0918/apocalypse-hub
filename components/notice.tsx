'use client';

import { useCallback, useState } from 'react';

// Shared success/error banner. Several pages used to drop failed requests on
// the floor ("// Silently fail"), so a refused action looked like a dead
// button. This is the same markup the admin users page already rendered
// inline, lifted out so every page can surface the reason in two lines.

export type NoticeState = { text: string; kind: 'ok' | 'err' } | null;

export function useNotice() {
  const [notice, setNotice] = useState<NoticeState>(null);
  const clear = useCallback(() => setNotice(null), []);
  const ok = useCallback((text: string) => setNotice({ text, kind: 'ok' }), []);
  const err = useCallback((text: string) => setNotice({ text, kind: 'err' }), []);
  return { notice, setNotice, clear, ok, err };
}

/** Read an error message out of a failed response without throwing on non-JSON. */
export async function errorTextFrom(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null as any);
  if (data && typeof data.error === 'string' && data.error.trim()) return data.error;
  if (res.status === 401) return 'Your session expired. Please sign in again.';
  if (res.status === 403) return `${fallback} You do not have permission for that.`;
  return `${fallback} (server said ${res.status})`;
}

export function Notice({ notice }: { notice: NoticeState }) {
  if (!notice) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`mb-4 rounded-md border px-4 py-2 text-sm ${
        notice.kind === 'ok'
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : 'border-red-500/30 bg-red-500/10 text-red-300'
      }`}
    >
      {notice.text}
    </div>
  );
}
