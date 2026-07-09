'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ListPagerProps {
  page: number;
  pageCount: number;
  setPage: (p: number) => void;
  rangeStart: number;
  rangeEnd: number;
  matchCount: number;
  q: string;
  /** Plural noun for the counter, e.g. "scripts", "users", "keys". */
  noun?: string;
  /** Smooth-scroll to top on page change (good for full-page lists). */
  scrollTop?: boolean;
  /** Current page size + setter — enables the "N / page" selector. */
  pageSize?: number;
  setPageSize?: (n: number) => void;
  /** Compact mode: hide the size selector + jump input (for tight spaces). */
  compact?: boolean;
}

const SIZE_CHOICES = [12, 24, 48, 96];

// Shared paginated-list footer: "Showing X–Y of Z · [size]/page · Prev · Page
// [jump] of M · Next".
export function ListPager({
  page,
  pageCount,
  setPage,
  rangeStart,
  rangeEnd,
  matchCount,
  q,
  noun = 'items',
  scrollTop = true,
  pageSize,
  setPageSize,
  compact = false,
}: ListPagerProps) {
  const [jump, setJump] = useState(String(page + 1));
  useEffect(() => setJump(String(page + 1)), [page]);

  if (matchCount === 0) return null;

  const go = (p: number) => {
    setPage(p);
    if (scrollTop && typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const commitJump = () => {
    const n = Math.min(Math.max(1, parseInt(jump, 10) || 1), pageCount);
    setJump(String(n));
    go(n - 1);
  };

  const sizeOptions = pageSize
    ? Array.from(new Set([pageSize, ...SIZE_CHOICES])).sort((a, b) => a - b)
    : [];

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <p className="text-xs text-muted-foreground">
          {q ? `${matchCount} match${matchCount === 1 ? '' : 'es'} · ` : ''}
          Showing {rangeStart}–{rangeEnd} of {matchCount} {noun}
        </p>
        {!compact && setPageSize && pageSize && (
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            aria-label="Items per page"
            className="rounded-md border border-border bg-secondary px-2 py-1 text-xs text-muted-foreground"
          >
            {sizeOptions.map((o) => (
              <option key={o} value={o}>
                {o} / page
              </option>
            ))}
          </select>
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 0}
            onClick={() => go(page - 1)}
            className="border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
          </Button>

          {compact ? (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Page {page + 1} of {pageCount}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
              Page
              <input
                value={jump}
                onChange={(e) => setJump(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitJump();
                }}
                onBlur={commitJump}
                inputMode="numeric"
                aria-label="Jump to page"
                className="w-12 rounded-md border border-border bg-secondary px-1.5 py-1 text-center text-foreground outline-none focus:border-red-900/40"
              />
              of {pageCount}
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount - 1}
            onClick={() => go(page + 1)}
            className="border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
