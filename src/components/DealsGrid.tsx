'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BadgeType, Deal, DealFilters as Filters } from '@/types/cruise';
import Sparkline from '@/components/ui/Sparkline';
import SyncStatus from '@/components/ui/SyncStatus';
import { fetchDeals } from '@/services/cruiseApi';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { useLiveData } from '@/hooks/useLiveData';
import FilterSelectionGrid from '@/components/FilterSelectionGrid';

interface DealsGridProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

const badgeStyles: Record<BadgeType, string> = {
  drop: 'bg-mint-soft text-mint-ink border-mint-ink/15',
  solo: 'bg-coral-soft text-coral-ink border-coral-ink/15',
  gold: 'bg-coral-soft text-coral-ink border-coral-ink/15',
};

const LIMIT_OPTIONS = [5, 10, 20, 0] as const; // 0 = all

const LIMIT_LABELS: Record<number, string> = {
  5: '5',
  10: '10',
  20: '20',
  0: 'All',
};

function getStorageLimit(): number {
  if (typeof window === 'undefined') return 0; // 0 = All
  const stored = localStorage.getItem('dealsLimit');
  const parsed = stored ? parseInt(stored, 10) : 0;
  return LIMIT_OPTIONS.includes(parsed as any) ? parsed : 0;
}

export default function DealsGrid({ filters, onFilterChange }: DealsGridProps) {
  const router = useRouter();

  const [limit, setLimit] = useState(getStorageLimit);

  const fetcher = useCallback(() => fetchDeals(limit, filters), [limit, filters]);
  const { data: deals, loading, error, lastSyncedAt, refresh } = useLiveData(fetcher, { pollIntervalMs: 30000 });

  const setLimitAndPersist = (n: number) => {
    setLimit(n);
    localStorage.setItem('dealsLimit', String(n));
  };

  // Extract available filter options from full deals data
  const availableOptions = useMemo(() => {
    if (!deals) return { lines: [], destinations: [], ports: [], regions: [], ships: [] };
    return {
      lines: [...new Set(deals.map((d) => d.cruiseLine))].sort(),
      destinations: [...new Set(deals.map((d) => d.destination))].sort(),
      ports: [...new Set(deals.map((d) => d.departurePort))].sort(),
      regions: [...new Set(deals.map((d) => d.departureRegion).filter(Boolean))].sort() as string[],
      ships: [...new Set(deals.map((d) => d.ship))].sort(),
    };
  }, [deals]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6" id="deals">
      <div className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo">Curated right now</span>
          <h2 className="mt-3 font-display text-4xl font-extrabold text-ink sm:text-5xl">Hot Deals on the Radar</h2>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <p className="max-w-sm text-ink-soft">
            Every card is powered by live fare polling — we flag the sailings where the tide has genuinely turned in your
            favor.
          </p>
          <SyncStatus loading={loading} lastSyncedAt={lastSyncedAt} onRefresh={refresh} />
        </div>
      </div>

      {error && (
        <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-3xl border border-amber-ink/15 bg-amber-soft p-6 sm:flex-row sm:items-center">
         <p className="text-sm font-medium text-amber-ink">
           Live prices temporarily unavailable. {error}
         </p>
         <button
           onClick={refresh}
           className="shrink-0 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white hover:opacity-90"
         >
           Retry
         </button>
        </div>
       )}

      {/* Filter bar */}
      {deals && !loading && (
        <div className="mb-5">
          <FilterSelectionGrid
          filters={filters}
          onChange={onFilterChange}
          availableLines={availableOptions.lines}
          availableRegions={availableOptions.regions}
          availableDestinations={availableOptions.destinations}
          availableShips={availableOptions.ships}
          hasActiveFilters={Boolean(
            filters.cruiseLine?.length ||
            filters.destination?.length ||
            filters.departureRegion?.length ||
            filters.ship?.length ||
            filters.minNights !== undefined ||
            filters.maxNights !== undefined ||
            filters.minPrice !== undefined ||
            filters.maxPrice !== undefined ||
            filters.badgeType?.length ||
            filters.sort
          )}
        />
        </div>
      )}

      {/* Deal size selector + count */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink-soft">
          {deals && !loading
            ? `${deals.length} deal${deals.length !== 1 ? 's' : ''} available`
            : 'Loading...'}
        </p>
        <div className="flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white px-2 py-1 shadow-float">
          <span className="mr-1 pl-1 text-[11px] font-semibold text-ink-faint">Show</span>
          {LIMIT_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => setLimitAndPersist(n)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                limit === n
                  ? 'bg-ink text-white shadow-sm'
                  : 'text-ink-soft hover:text-ink hover:bg-black/[0.04]'
              }`}
            >
              {LIMIT_LABELS[n]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {renderGridContent(loading, deals, refresh, router)}
      </div>
    </section>
  );
}

function renderGridContent(
  loading: boolean,
  deals: Deal[] | null | undefined,
  refresh: () => void,
  router: ReturnType<typeof useRouter>
) {
  if (loading && !deals) {
    return Array.from({ length: 6 }).map((_, i) => <DealCardSkeleton key={i} />);
  }

  if (!deals || deals.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
        <MaterialIcon name="search" size="3xl" className="text-ink-faint/40" />
        <p className="font-display text-xl font-bold text-ink">No deals found right now</p>
        <p className="mt-1 max-w-xs text-sm text-ink-soft">
          Check back soon &mdash; we&apos;re polling live fares to surface the best opportunities.
        </p>
        <button
          onClick={refresh}
          className="mt-6 rounded-full bg-ink px-6 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo"
        >
          Refresh
        </button>
      </div>
    );
  }

  return deals.map((deal) => (
    <article
      key={deal.id}
      data-testid="deal-card"
      className="group flex flex-col justify-between rounded-3xl border border-black/[0.05] bg-white p-6 shadow-float transition-all duration-300 hover:-translate-y-1 hover:shadow-float-lg"
    >
      <div>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {deal.cruiseLine}
            </p>
            <h3 className="mt-1 truncate font-display text-xl font-bold text-ink">{deal.ship}</h3>
          </div>
          <span
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold ${badgeStyles[deal.badgeType]}`}
          >
            <MaterialIcon name={deal.badgeType === 'drop' ? 'trending_down' : deal.badgeType === 'solo' ? 'person' : 'star'} size="xs" />
            {deal.badgeText}
          </span>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <Tag>{deal.destination}</Tag>
          <Tag>{deal.departurePort}</Tag>
          <Tag>{deal.duration}</Tag>
        </div>

        <div className="mb-5 flex items-end justify-between gap-3 rounded-2xl bg-canvas p-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">90-day trend</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="font-mono-tab text-2xl font-bold text-ink">${deal.price.toLocaleString()}</span>
              {deal.dropPercent > 0 && (
                <span className="font-mono-tab text-sm text-ink-faint line-through">
                  ${deal.originalPrice.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <Sparkline data={deal.history} positive={deal.dropPercent > 0} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-black/[0.06] pt-4">
        <span className="text-xs font-medium text-ink-faint">Sails {deal.sailDate}</span>
        <div className="flex items-center gap-2 justify-between" >
          <a
            href={deal.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-[128px] h-[48px] flex items-center justify-center gap-1.5 rounded-full bg-mint-ink px-4 py-2 text-xs font-bold text-white hover:bg-mint hover:text-mint-ink transition ${!deal.bookingUrl ? 'hidden' : ''}`}
          >
            <span className="material-symbols-outlined leading-none select-none text-[18px] text-white">link</span>
            <span className="truncate">{deal.bookingLabel || 'Book Now'}</span>
          </a>
          <button
            onClick={() => router.push(`/sailing/${deal.id}`)}
            className="w-[128px] h-[48px] flex items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-indigo active:scale-[0.97]"
          >
            <span className="material-symbols-outlined leading-none select-none text-[18px] text-white">arrow_forward</span>
            <span className="truncate">View Deal</span>
          </button>
        </div>
      </div>
    </article>
  ));
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="truncate rounded-lg bg-black/[0.035] px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
      {children}
    </span>
  );
}

function DealCardSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-black/[0.05] bg-white p-6 shadow-float">
      <div>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="w-2/3 space-y-2">
            <div className="h-3 w-1/2 animate-pulse rounded bg-black/[0.06]" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-black/[0.06]" />
          </div>
          <div className="h-6 w-20 shrink-0 animate-pulse rounded-full bg-black/[0.06]" />
        </div>
        <div className="mb-5 flex gap-2">
          <div className="h-6 w-20 animate-pulse rounded-lg bg-black/[0.05]" />
          <div className="h-6 w-16 animate-pulse rounded-lg bg-black/[0.05]" />
          <div className="h-6 w-16 animate-pulse rounded-lg bg-black/[0.05]" />
        </div>
        <div className="h-20 animate-pulse rounded-2xl bg-black/[0.04]" />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-black/[0.06] pt-4">
        <div className="h-3 w-20 animate-pulse rounded bg-black/[0.05]" />
        <div className="h-8 w-24 animate-pulse rounded-full bg-black/[0.06]" />
      </div>
    </div>
  );
}
