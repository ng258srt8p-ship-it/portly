'use client';

import { useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import type { DealFilters } from '@/types/cruise';

interface MobileFilterBarProps {
  filters: DealFilters;
  onFilterChange: (filters: DealFilters) => void;
  activeFilterCount: number;
  sortOptions: { value: string; label: string }[];
  onSort: (value: string) => void;
  onReset: () => void;
}

export default function MobileFilterBar({
  filters,
  activeFilterCount,
  sortOptions,
  onSort,
  onReset,
}: MobileFilterBarProps) {
  const [sortOpen, setSortOpen] = useState(false);

  return (
    <>
      {/* Sticky bottom bar — mobile only */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-black/[0.08] bg-white/95 px-4 py-3 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] backdrop-blur-lg lg:hidden">
        <a
          href="#deals-filters"
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-black/[0.04] px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-black/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50"
        >
          <MaterialIcon name="filter_list" size="sm" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo px-1.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </a>
        <button
          onClick={() => setSortOpen((prev) => !prev)}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-black/[0.04] px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-black/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50"
        >
          <MaterialIcon name="swap_vert" size="sm" />
          Sort
        </button>
      </div>

      {/* Sort dropdown — slides up from bottom bar */}
      {sortOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 lg:hidden"
            onClick={() => setSortOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-[72px] z-50 rounded-t-2xl border-t border-black/[0.08] bg-white p-2 shadow-lg lg:hidden">
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onSort(opt.value);
                  setSortOpen(false);
                }}
                className="block min-h-[44px] w-full truncate rounded-lg px-4 py-3 text-left text-sm font-medium text-ink-soft hover:bg-black/[0.04] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50"
              >
                {opt.label}
              </button>
            ))}
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  onReset();
                  setSortOpen(false);
                }}
                className="block min-h-[44px] w-full border-t border-black/[0.06] px-4 py-3 text-left text-sm font-bold text-indigo hover:bg-indigo/[0.04]"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
