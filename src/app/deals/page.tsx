'use client';

import Header from '@/components/layout/Header';
import ExploreDealsHero from './ExploreDealsHero';
import DealsGrid from '@/components/DealsGrid';
import Footer from '@/components/Footer';
import MobileFilterBar from '@/components/MobileFilterBar';
import type { DealFilters } from '@/types/cruise';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

function parseFiltersFromURL(): DealFilters {
  const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const f: DealFilters = {};
  const cl = sp.get('cruiseLine');
  if (cl) f.cruiseLine = cl.split(',');
  const dest = sp.get('destination');
  if (dest) f.destination = dest.split(',');
  const dp = sp.get('departurePort');
  if (dp) f.departurePort = dp.split(',');
  const dr = sp.get('departureRegion');
  if (dr) f.departureRegion = dr.split(',');
  const minN = sp.get('minNights');
  if (minN) f.minNights = parseInt(minN);
  const maxN = sp.get('maxNights');
  if (maxN) f.maxNights = parseInt(maxN);
  const minP = sp.get('minPrice');
  if (minP) f.minPrice = parseInt(minP);
  const maxP = sp.get('maxPrice');
  if (maxP) f.maxPrice = parseInt(maxP);
  const bt = sp.get('badgeType');
  if (bt) f.badgeType = bt.split(',') as ('drop' | 'solo' | 'gold')[];
  const s = sp.get('sort');
  if (s) f.sort = s as DealFilters['sort'];
  const ad = sp.get('adults');
  if (ad) f.adults = Math.min(8, Math.max(1, parseInt(ad) || 2));
  // Backward compat: old "passengers" param maps to adults
  const ps = sp.get('passengers');
  if (ps && !ad) f.adults = Math.min(8, Math.max(1, parseInt(ps) || 2));
  const ch = sp.get('children');
  if (ch) f.children = Math.min(6, Math.max(0, parseInt(ch) || 0));
  const sh = sp.get('ship');
  if (sh) f.ship = sh.split(',');
  return f;
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
  const [filters, setFilters] = useState<DealFilters>(parseFiltersFromURL);

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

  // Sync filters to URL
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
    const qs = sp.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }, [filters, router]);

  return (
    <>
      <Header />
      <main className="pt-24 pb-20 lg:pb-0">
        <ExploreDealsHero filters={filters} onFilterChange={setFilters} />
        <div id="deals-filters" className="scroll-mt-24">
          <DealsGrid filters={filters} onFilterChange={setFilters} />
        </div>
      </main>
      <MobileFilterBar
        filters={filters}
        onFilterChange={setFilters}
        activeFilterCount={activeFilterCount}
        sortOptions={SORT_OPTIONS}
        onSort={(val) => setFilters((prev) => ({ ...prev, sort: val as DealFilters['sort'] }))}
        onReset={() => setFilters({})}
      />
      <Footer />
    </>
  );
}
