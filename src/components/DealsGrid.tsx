'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { BadgeType, Deal, DealFilters as Filters } from '@/types/cruise';
import Sparkline from '@/components/ui/Sparkline';
import SyncStatus from '@/components/ui/SyncStatus';
import { fetchDeals } from '@/services/cruiseApi';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { useLiveData } from '@/hooks/useLiveData';
import FilterSelectionGrid from '@/components/FilterSelectionGrid';
import Pagination from '@/components/Pagination';
import ActiveFilterPills from '@/components/ActiveFilterPills';
import { useFilterCatalog } from '@/hooks/useFilterCatalog';

interface DealsGridProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  page: number;
  onPageChange: (page: number) => void;
  limit: number | 'all';
  onLimitChange: (limit: number | 'all') => void;
  onReset: () => void;
}

const badgeStyles: Record<BadgeType, string> = {
  drop: 'bg-mint-soft text-mint-ink border-mint-ink/15',
  solo: 'bg-coral-soft text-coral-ink border-coral-ink/15',
  gold: 'bg-coral-soft text-coral-ink border-coral-ink/15',
};

// Pagination: 24 per page is the default. We fetch up to limit rows from the
// worker (which caps at 500), so for "all" mode we still have a hard ceiling.
const LIMIT_OPTIONS = [12, 24, 48, 96, 'all'] as const;
const LIMIT_LABELS: Record<number | 'all', string> = {
  12: '12',
  24: '24',
  48: '48',
  96: '96',
  all: 'All',
};

function getStorageLimit(): number | 'all' {
  if (typeof window === 'undefined') return 24;
  const stored = localStorage.getItem('dealsLimit');
  if (!stored) return 24;
  if (stored === 'all') return 'all';
  const parsed = parseInt(stored, 10);
  return LIMIT_OPTIONS.includes(parsed as any) && parsed > 0 ? (parsed as number) : 24;
}

export default function DealsGrid({
  filters,
  onFilterChange,
  page,
  onPageChange,
  limit,
  onLimitChange,
  onReset,
}: DealsGridProps) {
  const router = useRouter();

  // If parent didn't supply a limit (legacy prop drilling), fall back to localStorage.
  // We only use the local one if the prop is undefined.
  const [localLimit, setLocalLimit] = useState<number | 'all'>(getStorageLimit);
  const effectiveLimit: number | 'all' = limit ?? localLimit;
  const setLimitAndPersist = (n: number | 'all') => {
    setLocalLimit(n);
    localStorage.setItem('dealsLimit', String(n));
    if (onLimitChange) onLimitChange(n);
  };

  // Fetch enough rows to power pagination. 'all' = 500 (worker cap).
  const fetchLimit: number = effectiveLimit === 'all' ? 500 : Math.max(effectiveLimit * page, 96);
  const fetcher = useCallback(
    () => fetchDeals(fetchLimit, filters),
    [fetchLimit, filters]
  );
  const { data: rawDeals, loading, error, lastSyncedAt, refresh } = useLiveData(fetcher, { pollIntervalMs: 30000 });

  // Pull the full filter catalog (all cruise lines, destinations, ships, ports,
  // regions) from the cheap /api/filters endpoint. We use this for the filter
  // dropdowns so they always reflect the entire data set, not just the current
  // page of deals (which would otherwise disable filters when the page happens
  // to contain a single line/ship/etc.).
  const catalog = useFilterCatalog();

  // Apply client-side filters that the API doesn't support (price range)
  const deals = useMemo(() => {
    if (!rawDeals) return rawDeals;
    let filtered = rawDeals;
    if (filters.minPrice !== undefined) {
      filtered = filtered.filter((d) => d.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter((d) => d.price <= filters.maxPrice!);
    }
    return filtered;
  }, [rawDeals, filters.minPrice, filters.maxPrice]);

  // CASCADING: when cruiseLine is selected, only show ships that appear with
  // that line in the current deals data. This is the source of truth for the
  // "Ship" dropdown so changing the Line filter narrows the Ship list.
  // We also auto-clear any selected ship that doesn't belong to the new line.
  const cascadingShips = useMemo(() => {
    const allShips = catalog.ships.length > 0
      ? catalog.ships
      : [...new Set((deals || []).map((d) => d.ship))].sort();
    const selectedLines = filters.cruiseLine || [];
    if (selectedLines.length === 0 || !deals) return allShips;
    return [...new Set(
      deals
        .filter((d) => selectedLines.includes(d.cruiseLine))
        .map((d) => d.ship)
    )].sort();
  }, [deals, catalog.ships, filters.cruiseLine]);

  useEffect(() => {
    const selectedLines = filters.cruiseLine || [];
    const selectedShips = filters.ship || [];
    if (selectedLines.length === 0 || selectedShips.length === 0 || !deals) return;
    // Drop any ship that doesn't exist for at least one selected line.
    const validShips = new Set(
      deals
        .filter((d) => selectedLines.includes(d.cruiseLine))
        .map((d) => d.ship)
    );
    const pruned = selectedShips.filter((s) => validShips.has(s));
    if (pruned.length !== selectedShips.length) {
      onFilterChange({ ...filters, ship: pruned.length ? pruned : undefined });
    }
  }, [filters, deals, onFilterChange]);

  // Per-option result counts (e.g. "Royal Caribbean (42)"). Computed from the
  // current deal set so badges always reflect post-filter totals.
  const dealCounts = useMemo(() => {
    const counts = {
      lines: new Map<string, number>(),
      destinations: new Map<string, number>(),
      ports: new Map<string, number>(),
      regions: new Map<string, number>(),
      ships: new Map<string, number>(),
    };
    (deals || []).forEach((d) => {
      counts.lines.set(d.cruiseLine, (counts.lines.get(d.cruiseLine) || 0) + 1);
      counts.destinations.set(d.destination, (counts.destinations.get(d.destination) || 0) + 1);
      counts.ports.set(d.departurePort, (counts.ports.get(d.departurePort) || 0) + 1);
      if (d.departureRegion) counts.regions.set(d.departureRegion, (counts.regions.get(d.departureRegion) || 0) + 1);
      counts.ships.set(d.ship, (counts.ships.get(d.ship) || 0) + 1);
    });
    return counts;
  }, [deals]);

  // Extract available filter options. We prefer the full /api/filters catalog
  // (which lists every line/ship/region/destination across the entire data set)
  // and only fall back to the current page of deals if the catalog hasn't
  // loaded yet. This prevents filters from being wrongly disabled when the
  // current 20-deal page happens to contain a single cruise line, etc.
  const availableOptions = useMemo(() => {
    if (!deals && catalog.cruiseLines.length === 0) {
      return { lines: [], destinations: [], ports: [], regions: [], ships: [] };
    }
    return {
      lines: catalog.cruiseLines.length > 0
        ? catalog.cruiseLines
        : [...new Set((deals || []).map((d) => d.cruiseLine))].sort(),
      destinations: catalog.destinations.length > 0
        ? catalog.destinations
        : [...new Set((deals || []).map((d) => d.destination))].sort(),
      ports: catalog.departurePorts.length > 0
        ? catalog.departurePorts
        : [...new Set((deals || []).map((d) => d.departurePort))].sort(),
      regions: catalog.departureRegions.length > 0
        ? catalog.departureRegions
        : [...new Set((deals || []).map((d) => d.departureRegion).filter(Boolean))].sort() as string[],
      ships: cascadingShips,
    };
  }, [deals, catalog, cascadingShips]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8" id="deals">
      <div className="mb-8 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo">Curated right now</span>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Hot Deals on the Radar</h2>
       </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="max-w-sm text-sm text-ink-soft">
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
            className="shrink-0 rounded-full bg-ink min-h-[44px] px-4 py-2 text-xs font-bold text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50"
          >
            Retry
         </button>
       </div>
      )}

      {/* Active filter pills — quick-remove tags + clear-all */}
      {deals && !loading && (
        <ActiveFilterPills filters={filters} onChange={onFilterChange} onReset={onReset} />
      )}

      {/* Filter bar — desktop only. Mobile users open the drawer via MobileFilterBar. */}
      {deals && !loading && (
        <div className="mb-5 hidden md:block">
          <FilterSelectionGrid
            filters={filters}
            onChange={onFilterChange}
            availableLines={availableOptions.lines}
            availableRegions={availableOptions.regions}
            availableDestinations={availableOptions.destinations}
            availableShips={availableOptions.ships}
            lineCounts={Object.fromEntries(dealCounts.lines)}
            destinationCounts={Object.fromEntries(dealCounts.destinations)}
            shipCounts={Object.fromEntries(dealCounts.ships)}
            portCounts={Object.fromEntries(dealCounts.ports)}
            regionCounts={Object.fromEntries(dealCounts.regions)}
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

      {/* Pagination math: slice the current page out of the deals array */}
      {(() => {
        const totalDeals = deals?.length ?? 0;
        const pageSize: number = effectiveLimit === 'all' ? Math.max(totalDeals, 1) : effectiveLimit;
        const totalPages: number = pageSize > 0 ? Math.max(1, Math.ceil(totalDeals / pageSize)) : 1;
        const safePage = Math.min(Math.max(1, page || 1), totalPages);
        const startIdx = (safePage - 1) * pageSize;
        const pageDeals: Deal[] | null | undefined =
          deals == null ? deals : deals.slice(startIdx, startIdx + pageSize);

        return (
          <>
            {/* Count + page-size selector */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-ink-soft">
                {deals && !loading
                  ? totalDeals > pageSize
                    ? `${totalDeals.toLocaleString()} deal${totalDeals !== 1 ? 's' : ''} match your filters`
                    : `${totalDeals} deal${totalDeals !== 1 ? 's' : ''} available`
                  : 'Loading...'}
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-black/[0.06] bg-white p-1 shadow-xs">
                <span className="mr-1 pl-1 text-[11px] font-semibold text-ink-soft">Show</span>
                {LIMIT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setLimitAndPersist(n)}
                    data-testid={`limit-${n}`}
                    className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-3 py-2 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 ${
                      effectiveLimit === n
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
              {renderGridContent(loading, pageDeals, refresh, router, onFilterChange, onReset)}
           </div>

            <Pagination
              page={safePage}
              totalPages={totalPages}
              total={totalDeals}
              pageSize={pageSize}
              onPageChange={(p) => {
                onPageChange?.(p);
                // Smooth-scroll back to the top of the grid so the user sees
                // the new page's results rather than the pagination at the bottom.
                const target =
                  typeof document !== 'undefined'
                    ? document.getElementById('deals-filters')
                    : null;
                if (target && typeof target.scrollIntoView === 'function') {
                  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            />
          </>
        );
      })()}
   </section>
  );
}

function renderGridContent(
  loading: boolean,
  deals: Deal[] | null | undefined,
  refresh: () => void,
  router: ReturnType<typeof useRouter>,
  onFilterChange: (filters: Filters) => void,
  onReset: () => void,
) {
  const onClearFilters = onReset;
  if (loading && !deals) {
    return Array.from({ length: 6 }).map((_, i) => <DealCardSkeleton key={i} />);
  }

  if (!deals || deals.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
        <MaterialIcon name="search" size="3xl" className="text-ink-faint/40" />
        <p className="font-display text-xl font-bold text-ink">No cruise deals match your selected filters</p>
        <p className="mt-1 max-w-xs text-sm text-ink-soft">
          Try adjusting your search criteria to see more sailings.
       </p>
        <button
          onClick={onClearFilters}
          className="mt-6 min-h-[44px] rounded-full bg-ink px-6 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50"
        >
          Reset All Filters
       </button>
     </div>
    );
  }

  return deals.map((deal) => (
    <article
      key={deal.id}
      data-testid="deal-card"
      data-sailing-id={deal.id}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-black/[0.06] bg-card text-ink shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-black/[0.12] hover:shadow-md"
    >
      {/* Card Header: cruise line + ship + badge */}
      <header className="flex items-start justify-between gap-3 border-b border-black/[0.04] bg-black/[0.015] p-4 sm:p-5">
        <div className="min-w-0">
          <p className="line-clamp-1 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
            {deal.cruiseLine}
         </p>
          <h3 className="mt-0.5 line-clamp-1 text-base font-semibold tracking-tight text-ink">
            {deal.ship}
         </h3>
       </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${badgeStyles[deal.badgeType]}`}
        >
          <MaterialIcon name={deal.badgeType === 'drop' ? 'trending_down' : deal.badgeType === 'solo' ? 'person' : 'star'} size="xs" />
          {deal.badgeText}
       </span>
     </header>

      {/* Card Body: route + tags (price & CTAs live in dedicated footers below) */}
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap gap-1.5">
          <Tag>{deal.destination}</Tag>
          <Tag>{deal.departurePort}</Tag>
          <Tag>{deal.duration}</Tag>
        </div>

        {/* Itinerary route strip — clamped to 2 lines so long voyages stay tidy */}
        {deal.itinerary && deal.itinerary.length > 1 && (
          <div className="overflow-hidden text-xs text-ink-soft" tabIndex={0} role="region" aria-label="Itinerary route">
            <div className="line-clamp-2 flex items-center gap-1 whitespace-normal break-words">
              {deal.itinerary.map((port, idx) => (
                <span key={idx} className="flex items-center gap-1">
                  {idx > 0 && <span className="text-ink-faint/40">→</span>}
                  <span className={idx === 0 || idx === deal.itinerary!.length - 1 ? 'font-semibold text-ink' : ''}>
                    {port}
                 </span>
               </span>
              ))}
           </div>
         </div>
        )}
     </div>

      {/* Price footer — out-the-door price stack with explicit hierarchy */}
      <footer className="mt-auto flex items-end justify-between gap-3 border-t border-black/[0.04] bg-black/[0.02] p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">90-day low · out-the-door</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-indigo">
              ${deal.price.toLocaleString()}
           </span>
            {deal.dropPercent > 0 && (
              <span className="font-mono text-xs text-ink-faint line-through">
                ${deal.originalPrice.toLocaleString()}
             </span>
            )}
         </div>
          <p className="mt-0.5 text-[11px] text-ink-faint">
            per person · incl. taxes & gratuities · ${Math.round(deal.price / Math.max(deal.nights, 1))}/night
         </p>
       </div>
        <Sparkline data={deal.history} positive={deal.dropPercent > 0} />
     </footer>

      {/* Action footer — sail date + CTAs */}
      <footer className="flex items-center justify-between gap-2 border-t border-black/[0.04] bg-black/[0.015] p-4 sm:p-5">
        <span className="text-xs font-medium text-ink-faint">Sails {deal.sailDate}</span>
        <div className="flex items-center gap-2">
          <a
            href={deal.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex h-9 min-w-[100px] items-center justify-center gap-1.5 rounded-md px-4 text-xs font-medium text-white shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 ${!deal.bookingUrl ? 'hidden' : 'bg-mint-ink hover:bg-mint hover:text-mint-ink'}`}
          >
            <span className="material-symbols-outlined text-[16px] leading-none">link</span>
            <span className="truncate">{deal.bookingLabel || 'Book Now'}</span>
         </a>
          <button
            onClick={() => router.push(`/sailing/${deal.id}`)}
            className="inline-flex h-9 min-w-[100px] items-center justify-center gap-1.5 rounded-md bg-ink px-4 text-xs font-medium text-white shadow-xs transition-colors hover:bg-indigo active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50"
          >
            <span className="material-symbols-outlined text-[16px] leading-none">arrow_forward</span>
            <span className="truncate">View Deal</span>
         </button>
       </div>
     </footer>
   </article>
  ));
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center truncate rounded-md bg-black/[0.035] px-2 py-0.5 text-[11px] font-medium text-ink-soft">
      {children}
   </span>
  );
}

function DealCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-black/[0.06] bg-card shadow-xs">
      <div className="flex items-start justify-between gap-3 border-b border-black/[0.04] bg-black/[0.015] p-4 sm:p-5">
        <div className="w-2/3 space-y-2">
          <div className="h-3 w-1/2 animate-pulse rounded bg-black/[0.06]" />
          <div className="h-5 w-3/4 animate-pulse rounded bg-black/[0.06]" />
       </div>
        <div className="h-6 w-20 shrink-0 animate-pulse rounded-full bg-black/[0.06]" />
     </div>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex gap-1.5">
          <div className="h-5 w-20 animate-pulse rounded-md bg-black/[0.05]" />
          <div className="h-5 w-16 animate-pulse rounded-md bg-black/[0.05]" />
          <div className="h-5 w-16 animate-pulse rounded-md bg-black/[0.05]" />
       </div>
        <div className="h-20 animate-pulse rounded-lg bg-black/[0.04]" />
     </div>
      <div className="mt-auto flex items-end justify-between border-t border-black/[0.04] bg-black/[0.02] p-4 sm:p-5">
        <div className="h-3 w-20 animate-pulse rounded bg-black/[0.05]" />
        <div className="h-10 w-24 animate-pulse rounded-md bg-black/[0.06]" />
     </div>
      <div className="flex items-center justify-between border-t border-black/[0.04] bg-black/[0.015] p-4 sm:p-5">
        <div className="h-3 w-20 animate-pulse rounded bg-black/[0.05]" />
        <div className="h-8 w-24 animate-pulse rounded-md bg-black/[0.06]" />
     </div>
   </div>
  );
}
