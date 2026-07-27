'use client';

import Header from '@/components/layout/Header';
import ExploreDealsHero from './ExploreDealsHero';
import DealsGrid from '@/components/DealsGrid';
import Footer from '@/components/Footer';
import MobileFilterBar from '@/components/MobileFilterBar';
import type { DealFilters } from '@/types/cruise';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFilterCatalog } from '@/hooks/useFilterCatalog';

// ---------------------------------------------------------------------------
// URL <-> filter state mapping
// ---------------------------------------------------------------------------
//
// URL schema for /deals query params:
//   cruiseLine       comma-list (multi-select)
//   destination      comma-list (multi-select)
//   departurePort    comma-list (multi-select)
//   departureRegion  comma-list (multi-select)
//   ship             comma-list (multi-select, derived from cruiseLine)
//   minNights, maxNights, minPrice, maxPrice, badgeType, sort, adults,
//   children        (singletons, see below)
//   page             int (1-based, defaults to 1)
//   limit            int (12 | 24 | 48 | 96 | 'all'=500, defaults to 24)
//
// We split, multi-valued URL keys stay arrays so we keep backward compat with
// the existing search-hero / filter URL format (cruiseLine=foo,bar).
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 24;

function parseLimit(raw: string | null): number | 'all' {
  if (!raw) return DEFAULT_LIMIT;
  if (raw === 'all') return 'all';
  const n = parseInt(raw, 10);
  return n === 12 || n === 24 || n === 48 || n === 96 ? n : DEFAULT_LIMIT;
}

function parseFiltersFromURL(): { filters: DealFilters; page: number; limit: number | 'all' } {
  if (typeof window === 'undefined') {
    return { filters: {}, page: 1, limit: DEFAULT_LIMIT };
  }
  const sp = new URLSearchParams(window.location.search);
  const f: DealFilters = {};
  const cl = sp.get('cruiseLine');
  if (cl) f.cruiseLine = cl.split(',').filter(Boolean);
  const dest = sp.get('destination');
  if (dest) f.destination = dest.split(',').filter(Boolean);
  const dp = sp.get('departurePort');
  if (dp) f.departurePort = dp.split(',').filter(Boolean);
  const dr = sp.get('departureRegion');
  if (dr) f.departureRegion = dr.split(',').filter(Boolean);
  const minN = sp.get('minNights');
  if (minN) f.minNights = parseInt(minN, 10);
  const maxN = sp.get('maxNights');
  if (maxN) f.maxNights = parseInt(maxN, 10);
  const minP = sp.get('minPrice');
  if (minP) f.minPrice = parseInt(minP, 10);
  const maxP = sp.get('maxPrice');
  if (maxP) f.maxPrice = parseInt(maxP, 10);
  const bt = sp.get('badgeType');
  if (bt) f.badgeType = bt.split(',').filter(Boolean) as ('drop' | 'solo' | 'gold')[];
  const s = sp.get('sort');
  if (s) f.sort = s as DealFilters['sort'];
  const ad = sp.get('adults');
  if (ad) f.adults = Math.min(8, Math.max(1, parseInt(ad, 10) || 2));
  const ps = sp.get('passengers'); // backward compat
  if (ps && !ad) f.adults = Math.min(8, Math.max(1, parseInt(ps, 10) || 2));
  const ch = sp.get('children');
  if (ch) f.children = Math.min(6, Math.max(0, parseInt(ch, 10) || 0));
  const sh = sp.get('ship');
  if (sh) f.ship = sh.split(',').filter(Boolean);

  const pageRaw = parseInt(sp.get('page') || '1', 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.min(pageRaw, 1000) : 1;
  const limit = parseLimit(sp.get('limit'));
  return { filters: f, page, limit };
}

const SORT_OPTIONS = [
  { value: '', label: 'Featured / Best Value' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'date-asc', label: 'Departure: Earliest First' },
  { value: 'drop-desc', label: 'Highest Savings %' },
];

export default function DealsPage() {
  const router = useRouter();
  const initial = useMemo(parseFiltersFromURL, []);
  const [filters, setFilters] = useState<DealFilters>(initial.filters);
  const [page, setPage] = useState<number>(initial.page);
  const [limit, setLimit] = useState<number | 'all'>(initial.limit);
  const catalog = useFilterCatalog();

  // Sync filters + page + limit to URL (single useEffect so we don't fight
  // ourselves; the URL is always derived from the latest state).
  useEffect(() => {
    const sp = new URLSearchParams();
    if (filters.cruiseLine?.length) sp.set('cruiseLine', filters.cruiseLine.join(','));
    if (filters.destination?.length) sp.set('destination', filters.destination.join(','));
    if (filters.departurePort?.length) sp.set('departurePort', filters.departurePort.join(','));
    if (filters.departureRegion?.length) sp.set('departureRegion', filters.departureRegion.join(','));
    if (filters.minNights !== undefined) sp.set('minNights', String(filters.minNights));
    if (filters.maxNights !== undefined) sp.set('maxNights', String(filters.maxNights));
    if (filters.minPrice !== undefined) sp.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice !== undefined) sp.set('maxPrice', String(filters.maxPrice));
    if (filters.badgeType?.length) sp.set('badgeType', filters.badgeType.join(','));
    if (filters.sort) sp.set('sort', filters.sort);
    if (filters.adults !== undefined && filters.adults !== 2) sp.set('adults', String(filters.adults));
    if (filters.children !== undefined && filters.children > 0) sp.set('children', String(filters.children));
    if (filters.ship?.length) sp.set('ship', filters.ship.join(','));
    if (page > 1) sp.set('page', String(page));
    if (limit !== DEFAULT_LIMIT) sp.set('limit', String(limit));
    const qs = sp.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }, [filters, page, limit, router]);

  // When any filter dimension changes, reset to page 1 so the user sees the
  // top of the new result set. Limit changes do NOT reset page.
  const handleFilterChange = useCallback((next: DealFilters) => {
    setFilters(next);
    setPage(1);
  }, []);

  const handleLimitChange = useCallback((next: number | 'all') => {
    setLimit(next);
    setPage(1);
  }, []);

  const handleReset = useCallback(() => {
    setFilters({});
    setPage(1);
    setLimit(DEFAULT_LIMIT);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.cruiseLine?.length) count += filters.cruiseLine.length;
    if (filters.destination?.length) count += filters.destination.length;
    if (filters.departurePort?.length) count += filters.departurePort.length;
    if (filters.departureRegion?.length) count += filters.departureRegion.length;
    if (filters.ship?.length) count += filters.ship.length;
    if (filters.minNights !== undefined || filters.maxNights !== undefined) count += 1;
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count += 1;
    if (filters.badgeType?.length) count += filters.badgeType.length;
    if (filters.sort) count += 1;
    return count;
  }, [filters]);

  return (
    <>
      <Header />
      <main className="pt-20 pb-20 lg:pb-0">
        <ExploreDealsHero filters={filters} onFilterChange={handleFilterChange} />
        <div id="deals-filters" className="scroll-mt-24">
          <DealsGrid
            filters={filters}
            onFilterChange={handleFilterChange}
            page={page}
            onPageChange={setPage}
            limit={limit}
            onLimitChange={handleLimitChange}
            onReset={handleReset}
          />
        </div>
      </main>
      <MobileFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        activeFilterCount={activeFilterCount}
        sortOptions={SORT_OPTIONS}
        onSort={(val) =>
          handleFilterChange({ ...filters, sort: (val || undefined) as DealFilters['sort'] })
        }
        onReset={handleReset}
        availableLines={catalog.cruiseLines}
        availableRegions={catalog.departureRegions}
        availableDestinations={catalog.destinations}
        availableShips={catalog.ships}
      />
      <Footer />
    </>
  );
}
