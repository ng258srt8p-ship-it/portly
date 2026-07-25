'use client';

import { useCallback } from 'react';
import { useLiveData } from '@/hooks/useLiveData';
import MaterialIcon from '@/components/ui/MaterialIcon';
import type { DealFilters } from '@/types/cruise';

interface Stats {
  trackedSailings: number;
  pricingSnapshots: number;
}

interface ExploreDealsHeroProps {
  filters: DealFilters;
  onFilterChange: (filters: DealFilters) => void;
}

export default function ExploreDealsHero({ filters, onFilterChange }: ExploreDealsHeroProps) {
  const fetcher = useCallback(async () => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${API_BASE}/api/stats`);
    if (!res.ok) throw new Error('Failed to load stats');
    return res.json() as Promise<Stats>;
  }, []);

  const { data: stats } = useLiveData(fetcher, { pollIntervalMs: 60000 });

  const toggleBadge = (badgeType: 'drop' | 'solo' | 'gold') => {
    const current = filters.badgeType ?? [];
    const next = current.includes(badgeType)
      ? current.filter((b) => b !== badgeType)
      : [...current, badgeType];
    onFilterChange({ ...filters, badgeType: next.length ? next : undefined });
  };

  const toggleAnyDuration = () => {
    const isAnyDuration = filters.minNights === undefined && filters.maxNights === undefined;
    if (isAnyDuration) return; // already "any duration", nothing to do
    onFilterChange({ ...filters, minNights: undefined, maxNights: undefined });
  };

  return (
    <section className="relative overflow-hidden border-b border-black/[0.04] bg-gradient-to-b from-indigo/[0.03] via-transparent to-transparent">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(42,68,231,0.06)_0%,transparent_70%)]" />

      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          {/* Live badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-mint-ink/20 bg-mint-soft px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-mint-ink animate-pulse" />
            <span className="text-xs font-semibold text-mint-ink">
              {stats
                ? `${stats.trackedSailings.toLocaleString()} sailings tracked live`
                : 'Live fare polling'}
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl font-extrabold tracking-tight text-ink sm:text-6xl lg:text-7xl">
            Find Your{' '}
            <span className="bg-gradient-to-r from-indigo to-indigo/70 bg-clip-text text-transparent">
              Perfect Voyage
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-lg text-ink-soft sm:text-xl">
            Compare out-the-door pricing across {stats ? stats.trackedSailings.toLocaleString() : 'hundreds of'} sailings.
            Base fare, port taxes, and mandatory gratuities — all in one transparent price.
          </p>

          {/* Quick action chips */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <FilterChip
              icon="trending_down"
              label="Price Drop"
              testId="hero-chip-price-drop"
              active={!!(filters.badgeType ?? []).includes('drop')}
              onClick={() => toggleBadge('drop')}
            />
            <FilterChip
              icon="person"
              label="Solo Friendly"
              testId="hero-chip-solo-friendly"
              active={!!(filters.badgeType ?? []).includes('solo')}
              onClick={() => toggleBadge('solo')}
            />
            <FilterChip
              icon="star"
              label="Best Value"
              testId="hero-chip-best-value"
              active={!!(filters.badgeType ?? []).includes('gold')}
              onClick={() => toggleBadge('gold')}
            />
            <FilterChip
              icon="sort"
              label="Any Duration"
              testId="hero-chip-any-duration"
              active={filters.minNights === undefined && filters.maxNights === undefined}
              onClick={toggleAnyDuration}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterChip({
  icon,
  label,
  testId,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  testId: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`
        inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold
        shadow-float transition-all duration-150
        ${active
          ? 'bg-indigo text-white border-indigo shadow-sm'
          : 'border border-black/[0.06] bg-white text-ink-soft hover:border-indigo/30 hover:text-indigo'
        }
        focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 focus-visible:ring-offset-2
      `}
    >
      <MaterialIcon name={icon} size="xs" />
      {label}
    </button>
  );
}
