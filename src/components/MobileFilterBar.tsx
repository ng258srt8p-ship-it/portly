'use client';

import { useEffect, useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import FilterSelectionGrid from '@/components/FilterSelectionGrid';
import ActiveFilterPills from '@/components/ActiveFilterPills';
import type { DealFilters } from '@/types/cruise';

interface MobileFilterBarProps {
  filters: DealFilters;
  onFilterChange: (filters: DealFilters) => void;
  activeFilterCount: number;
  sortOptions: { value: string; label: string }[];
  onSort: (value: string) => void;
  onReset: () => void;
  /** Catalog used to populate dropdown options inside the drawer. */
  availableLines: string[];
  availableRegions: string[];
  availableDestinations: string[];
  availableShips: string[];
  lineCounts?: Record<string, number>;
  destinationCounts?: Record<string, number>;
  shipCounts?: Record<string, number>;
  portCounts?: Record<string, number>;
  regionCounts?: Record<string, number>;
}

/**
 * Mobile-only sticky bottom bar.
 *
 *   ┌─────────┬─────────┐
 *   │ Filters │  Sort   │
 *   └─────────┴─────────┘
 *
 * Filters opens a slide-up drawer that hosts the full FilterSelectionGrid.
 * Sort opens a small bottom sheet.
 */
export default function MobileFilterBar({
  filters,
  onFilterChange,
  activeFilterCount,
  sortOptions,
  onSort,
  onReset,
  availableLines,
  availableRegions,
  availableDestinations,
  availableShips,
  lineCounts,
  destinationCounts,
  shipCounts,
  portCounts,
  regionCounts,
}: MobileFilterBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!filtersOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [filtersOpen]);

  return (
    <>
      {/* Sticky bottom bar — mobile only */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-black/[0.08] bg-white/95 px-4 py-3 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] backdrop-blur-lg lg:hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          data-testid="mobile-filters-button"
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-black/[0.04] px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-black/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50"
        >
          <MaterialIcon name="filter_list" size="sm" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo px-1.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSortOpen((prev) => !prev)}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-black/[0.04] px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-black/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50"
        >
          <MaterialIcon name="swap_vert" size="sm" />
          Sort
        </button>
      </div>

      {/* Sort popover */}
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
          </div>
        </>
      )}

      {/* Filters drawer */}
      {filtersOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            onClick={() => setFiltersOpen(false)}
            data-testid="mobile-filter-backdrop"
          />
          <div
            role="dialog"
            aria-label="Filter sailings"
            aria-modal="true"
            data-testid="mobile-filter-drawer"
            className="fixed inset-x-0 bottom-0 top-12 z-50 flex flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl lg:hidden"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-4 py-3">
              <h2 className="font-display text-lg font-bold text-ink">Filter sailings</h2>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setFiltersOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50"
              >
                <MaterialIcon name="close" size="sm" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <ActiveFilterPills
                filters={filters}
                onChange={onFilterChange}
                onReset={onReset}
              />
              <FilterSelectionGrid
                filters={filters}
                onChange={onFilterChange}
                availableLines={availableLines}
                availableRegions={availableRegions}
                availableDestinations={availableDestinations}
                availableShips={availableShips}
                lineCounts={lineCounts}
                destinationCounts={destinationCounts}
                shipCounts={shipCounts}
                portCounts={portCounts}
                regionCounts={regionCounts}
                hasActiveFilters={activeFilterCount > 0}
                onClear={onReset}
                defaultExpanded={true}
              />
            </div>

            <div className="shrink-0 border-t border-black/[0.06] bg-white px-4 py-3">
              <div className="flex gap-2">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onReset();
                    }}
                    data-testid="mobile-filter-reset"
                    className="inline-flex min-h-[44px] w-1/3 items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-white text-sm font-semibold text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50"
                  >
                    <MaterialIcon name="restart_alt" size="sm" />
                    Reset
                 </button>
                )}
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  data-testid="mobile-filter-apply"
                  className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-ink text-sm font-bold text-white hover:bg-indigo focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 ${
                    activeFilterCount > 0 ? 'w-2/3' : 'w-full'
                  }`}
                >
                  Show Results
                  {activeFilterCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-bold text-ink">
                      {activeFilterCount}
                   </span>
                  )}
               </button>
             </div>
           </div>
          </div>
        </>
      )}
    </>
  );
}
