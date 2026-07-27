'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useLiveData } from '@/hooks/useLiveData';
import { fetchDeals } from '@/services/cruiseApi';
import type { Deal } from '@/types/cruise';
import MaterialIcon from '@/components/ui/MaterialIcon';

function fmtPrice(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US');
}

function fmtDate(s: string): string {
  try {
    return new Date(s + (s.includes('T') ? '' : 'T00:00:00Z')).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return s || '';
  }
}

export default function DealsGridLite() {
  const fetcher = useMemo(() => () => fetchDeals(6, { sort: 'drop-desc' }), []);
  const { data: deals, loading, error } = useLiveData<Deal[]>(fetcher, { pollIntervalMs: 60_000 });

  if (loading && !deals) {
    return (
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        data-testid="home-deals-grid-loading"
      >
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl bg-black/[0.04]" />
        ))}
      </div>
    );
  }

  if (error || !deals || deals.length === 0) {
    return (
      <div
        className="rounded-2xl border border-amber-ink/15 bg-amber-soft p-6 text-sm text-amber-ink"
        data-testid="home-deals-grid-empty"
      >
        We&apos;re loading inventory now — try{' '}
        <Link className="underline" href="/deals">
          the deals page
        </Link>{' '}
        in a few seconds.
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="home-deals-list"
    >
      {deals.map((d) => (
        <Link
          key={d.id}
          href={`/sailing/${encodeURIComponent(d.id)}`}
          className="group flex flex-col rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-float"
          aria-label={`${d.cruiseLine} ${d.ship} — ${fmtPrice(d.price)}`}
          data-testid="home-deal-card"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {d.cruiseLine}
              </div>
              <div className="truncate text-base font-bold text-ink">{d.ship}</div>
            </div>
            {typeof d.dropPercent === 'number' && d.dropPercent > 0 && (
              <span className="shrink-0 rounded-full bg-mint-soft px-2.5 py-1 text-[11px] font-bold text-mint-ink">
                -{Math.round(d.dropPercent)}%
              </span>
            )}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
            <dt className="text-ink-faint">Region</dt>
            <dd className="text-right text-ink">{d.destination || '—'}</dd>
            <dt className="text-ink-faint">Sail date</dt>
            <dd className="text-right text-ink">{fmtDate(d.sailDate)}</dd>
            <dt className="text-ink-faint">Nights</dt>
            <dd className="text-right text-ink">{d.nights}</dd>
          </dl>

          <div className="mt-auto pt-4 flex items-end justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-ink-faint">From</div>
              <div className="font-display text-2xl font-extrabold text-ink">
                {fmtPrice(d.price)}
              </div>
              {d.originalPrice > d.price && (
                <div className="text-xs text-ink-faint line-through">{fmtPrice(d.originalPrice)}</div>
              )}
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo opacity-0 transition group-hover:opacity-100">
              View <MaterialIcon name="arrow_forward" size="sm" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
