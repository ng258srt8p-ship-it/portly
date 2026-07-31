'use client';

import MaterialIcon from '@/components/ui/MaterialIcon';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Show "Showing X–Y of Z" summary above the buttons. */
  total: number;
  pageSize: number;
  /** Hide the component entirely when total fits on a single page. */
  className?: string;
}

/**
 * Returns a compact pagination range like [1, '…', 4, 5, 6, '…', 12]
 * showing the current page plus up to 2 siblings on each side.
 */
function buildPaginationRange(current: number, total: number): (number | '…')[] {
  if (total <= 1) return [];
  // Small total — always render every page so the user can jump directly.
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const delta = 1; // siblings on each side of current
  const range: (number | '…')[] = [];
  const left = Math.max(2, current - delta);
  // Ensure `right` covers at least current+1 so the immediate next page is
  // always reachable from page 1 (fixes R2-003: Page 3 missing on small sets).
  const right = Math.min(total - 1, Math.max(current + delta, current + 1));

  range.push(1);
  if (left > 2) range.push('…');
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push('…');
  if (total > 1) range.push(total);

  return range;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
  pageSize,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(start + pageSize - 1, total);
  const items = buildPaginationRange(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className={`mt-10 flex flex-col items-center justify-between gap-3 border-t border-black/[0.06] pt-6 sm:flex-row ${className}`}
    >
      <p className="text-sm text-ink-soft" data-testid="pagination-summary">
        Showing <span className="font-semibold text-ink">{start}</span>–
        <span className="font-semibold text-ink">{end}</span> of{' '}
        <span className="font-semibold text-ink">{total}</span> sailings
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          data-testid="pagination-prev"
          className="inline-flex h-10 min-w-[40px] items-center justify-center gap-1 rounded-full border border-black/[0.06] bg-white px-3 text-xs font-bold text-ink-soft transition-colors hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50"
        >
          <MaterialIcon name="chevron_left" size="xs" />
          Prev
        </button>
        {items.map((it, idx) =>
          it === '…' ? (
            <span
              key={`dots-${idx}`}
              aria-hidden
              className="px-1 text-xs font-bold text-ink-faint"
            >
              …
            </span>
          ) : (
            <button
              key={it}
              type="button"
              onClick={() => onPageChange(it)}
              aria-label={`Page ${it}`}
              aria-current={it === page ? 'page' : undefined}
              data-testid={`pagination-page-${it}`}
              className={`inline-flex h-10 min-w-[40px] items-center justify-center rounded-full px-3 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 ${
                it === page
                  ? 'bg-ink text-white shadow-sm'
                  : 'border border-black/[0.06] bg-white text-ink-soft hover:bg-black/[0.04]'
              }`}
            >
              {it}
            </button>
          )
        )}
        <button
          type="button"
          aria-label="Next page"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          data-testid="pagination-next"
          className="inline-flex h-10 min-w-[40px] items-center justify-center gap-1 rounded-full border border-black/[0.06] bg-white px-3 text-xs font-bold text-ink-soft transition-colors hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50"
        >
          Next
          <MaterialIcon name="chevron_right" size="xs" />
        </button>
      </div>
    </nav>
  );
}
