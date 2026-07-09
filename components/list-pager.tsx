'use client';

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
  /** Smooth-scroll to top when the page changes (good for full-page lists). */
  scrollTop?: boolean;
}

// Shared "Showing X–Y of Z · Prev · Page N/M · Next" footer for paginated lists.
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
}: ListPagerProps) {
  if (matchCount === 0) return null;

  const go = (p: number) => {
    setPage(p);
    if (scrollTop && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        {q ? `${matchCount} match${matchCount === 1 ? '' : 'es'} · ` : ''}
        Showing {rangeStart}–{rangeEnd} of {matchCount} {noun}
      </p>

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
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Page {page + 1} of {pageCount}
          </span>
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
