'use client';

import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import type { DealFilters } from '@/types/cruise';
import {
  NIGHT_OPTIONS,
  SORT_OPTIONS,
  BADGE_OPTIONS,
  PAGE_SIZE_OPTIONS,
  PAGE_SIZE_LABELS,
  CABIN_TYPE_OPTIONS,
  getNightsOption,
  getNightsRange,
  type NightOptionValue,
  type SortOptionValue,
  type BadgeOptionValue,
  type CabinTypeValue,
} from '@/lib/filterConstants';

// ============================================================================
// Types
// ============================================================================

export interface FilterBarProps {
  filters: DealFilters;
  onChange: (filters: DealFilters) => void;
  availableLines: string[];
  availableCabinTypes?: ('Inside' | 'Oceanview' | 'Balcony' | 'Suite')[];
  availableRegions: string[];
  availableDestinations: string[];
  availablePorts: string[];
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onSync?: () => void;
  syncLoading?: boolean;
}

interface FilterOption {
  value: string;
  label: string;
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeLineName(line: string): string {
  return line.replace(' Cruise Line', '').replace(' Cruises', '').trim();
}

function buildLineOptions(lines: string[]): FilterOption[] {
  // Return all distinct cruise lines with their original names as labels.
  // No deduplication — each unique string from the API is a distinct filter option.
  const seen = new Set<string>();
  return lines
    .filter((line) => {
      if (seen.has(line)) return false;
      seen.add(line);
      return true;
    })
    .map((line) => ({ value: line, label: line }));
}

function shouldHideFilter(options: string[]): boolean {
  return options.length <= 1;
}

// ============================================================================
// MultiSelectDropdown (inline, hides when ≤1 option)
// ============================================================================

interface MultiSelectDropdownProps {
  label: string;
  placeholder: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  testId?: string;
  hideWhenSingle?: boolean;
}

function MultiSelectDropdown({
  label,
  placeholder,
  options,
  selected,
  onChange,
  testId,
  hideWhenSingle = true,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(next);
  };

  const selectedCount = selected.length;
  const displayValue =
    selectedCount === 0
      ? placeholder
      : selectedCount === 1
        ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
        : `${selectedCount} selected`;

  // Hide when ≤1 option (instead of disabling)
  if (hideWhenSingle && options.length <= 1) return null;

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1" data-testid={testId}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`
          flex w-full min-w-0 items-center gap-3 px-3 py-2 text-left
          rounded-xl border border-black/[0.06] bg-white
          transition-colors
          hover:border-black/[0.12] hover:bg-black/[0.02]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 focus-visible:border-indigo
        `}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="shrink-0 text-ink-faint text-[11px] font-semibold uppercase tracking-wider">
          {label}
        </span>
        <span className="flex-1 truncate font-medium text-ink">
          {displayValue}
        </span>
        <MaterialIcon
          name={open ? 'expand_less' : 'expand_more'}
          size="sm"
          className={`text-ink-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto
            rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-float-lg
            animate-in fade-in-0 zoom-in-95 duration-150"
          role="listbox"
          aria-label={label}
        >
          {options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => { toggleOption(option.value); setOpen(false); }}
                className={`
                  block w-full truncate rounded-xl px-3.5 py-2.5 text-left text-sm font-medium
                  transition-colors
                  ${isSelected
                    ? 'bg-indigo-mist text-indigo'
                    : 'text-ink-soft hover:bg-black/[0.04] hover:text-ink'
                  }
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50
                `}
              >
                <span className="flex items-center gap-2">
                  {isSelected && (
                    <MaterialIcon name="check" size="xs" className="text-indigo flex-shrink-0" />
                  )}
                  <span>{option.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SingleSelectDropdown (inline, hides when ≤1 option)
// ============================================================================

interface SingleSelectDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  testId?: string;
  hideWhenSingle?: boolean;
}

function SingleSelectDropdown({
  label,
  options,
  value,
  onChange,
  testId,
  hideWhenSingle = true,
}: SingleSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  // Hide when ≤1 option (skip the "Default" option for hiding logic)
  const nonDefaultOptions = options.filter((o) => o.value !== '');
  if (hideWhenSingle && nonDefaultOptions.length <= 1) return null;

  const displayLabel = selectedOption?.label ?? 'Default';

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1" data-testid={testId}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`
          flex w-full min-w-0 items-center gap-3 px-3 py-2 text-left
          rounded-xl border border-black/[0.06] bg-white
          transition-colors
          hover:border-black/[0.12] hover:bg-black/[0.02]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 focus-visible:border-indigo
        `}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="shrink-0 text-ink-faint text-[11px] font-semibold uppercase tracking-wider">
          {label}
        </span>
        <span className="flex-1 truncate font-medium text-ink">
          {displayLabel}
        </span>
        <MaterialIcon
          name={open ? 'expand_less' : 'expand_more'}
          size="sm"
          className={`text-ink-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto
            rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-float-lg
            animate-in fade-in-0 zoom-in-95 duration-150"
          role="listbox"
          aria-label={label}
        >
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => { onChange(option.value); setOpen(false); }}
                className={`
                  block w-full truncate rounded-xl px-3.5 py-2.5 text-left text-sm font-medium
                  transition-colors
                  ${isSelected
                    ? 'bg-indigo-mist text-indigo'
                    : 'text-ink-soft hover:bg-black/[0.04] hover:text-ink'
                  }
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50
                `}
              >
                <span className="flex items-center gap-2">
                  {isSelected && (
                    <MaterialIcon name="check" size="xs" className="text-indigo flex-shrink-0" />
                  )}
                  <span>{option.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}  
    </div>
  );
}

// ============================================================================
// NightsSegmentedGroup (inline)
// ============================================================================

interface NightsSegmentedGroupProps {
  value: NightOptionValue | null;
  onChange: (value: NightOptionValue | null) => void;
  testId?: string;
}

function NightsSegmentedGroup({ value, onChange, testId }: NightsSegmentedGroupProps) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl border border-black/[0.06] bg-white p-0.5"
      data-testid={testId}
      role="group"
      aria-label="Nights"
    >
      {NIGHT_OPTIONS.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(isActive ? null : option.value)}
            className={`
              relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium
              transition-all duration-150
              ${isActive
                ? 'bg-indigo text-white shadow-sm'
                : 'text-ink-soft hover:bg-black/[0.04] hover:text-ink'
              }
              focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 focus-visible:ring-offset-2
            `}
            aria-pressed={isActive}
          >
            <span className="font-semibold tabular-nums">{option.label}</span>
            <span className="text-[10px] font-normal opacity-70">nights</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// TypePillGroup (inline)
// ============================================================================

interface TypePillGroupProps {
  value: BadgeOptionValue[];
  onChange: (value: BadgeOptionValue[]) => void;
  testId?: string;
}

function TypePillGroup({ value, onChange, testId }: TypePillGroupProps) {
  const toggleType = (type: BadgeOptionValue) => {
    const next = value.includes(type)
      ? value.filter((v) => v !== type)
      : [...value, type];
    onChange(next);
  };

  return (
    <div
      className="inline-flex items-center gap-1.5 flex-wrap"
      data-testid={testId}
      role="group"
      aria-label="Deal types"
    >
      {BADGE_OPTIONS.map((option) => {
        const isActive = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleType(option.value)}
            className={`
              inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium
              transition-all duration-150
              ${isActive
                ? 'bg-indigo text-white shadow-sm'
                : 'bg-white text-ink-soft border border-black/[0.06] hover:border-black/[0.12] hover:bg-black/[0.02] hover:text-ink'
              }
              focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 focus-visible:ring-offset-2
            `}
            aria-pressed={isActive}
          >
            {isActive && (
              <MaterialIcon name="check" size="xs" className="flex-shrink-0" />
            )}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// CabinTypeFilter (inline) — Icon + Label pills for room types
// ============================================================================

interface CabinTypeFilterProps {
  value: ('Inside' | 'Oceanview' | 'Balcony' | 'Suite')[];
  onChange: (value: ('Inside' | 'Oceanview' | 'Balcony' | 'Suite')[]) => void;
  testId?: string;
  availableCabinTypes?: ('Inside' | 'Oceanview' | 'Balcony' | 'Suite')[];
  hideWhenEmpty?: boolean;
}

function CabinTypeFilter({ value, onChange, testId, availableCabinTypes, hideWhenEmpty = true }: CabinTypeFilterProps) {
  const toggleCabinType = (cabinType: 'Inside' | 'Oceanview' | 'Balcony' | 'Suite') => {
    const next = value.includes(cabinType)
      ? value.filter((v) => v !== cabinType)
      : [...value, cabinType];
    onChange(next);
  };

  // Hide when no cabin types available in data (not the constant options)
  if (hideWhenEmpty && availableCabinTypes && availableCabinTypes.length === 0) return null;

  // Filter CABIN_TYPE_OPTIONS to only show types that exist in the data
  const visibleOptions = availableCabinTypes && availableCabinTypes.length > 0
    ? CABIN_TYPE_OPTIONS.filter((opt) => availableCabinTypes.includes(opt.value))
    : CABIN_TYPE_OPTIONS;

  // Hide if no visible options after filtering
  if (hideWhenEmpty && visibleOptions.length === 0) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 flex-wrap"
      data-testid={testId}
      role="group"
      aria-label="Room type"
    >
      {CABIN_TYPE_OPTIONS.map((option) => {
        const isActive = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleCabinType(option.value)}
            className={`
              inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium
              transition-all duration-150
              ${isActive
                ? 'bg-indigo text-white shadow-sm'
                : 'bg-white text-ink-soft border border-black/[0.06] hover:border-black/[0.12] hover:bg-black/[0.02] hover:text-ink'
              }
              focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 focus-visible:ring-offset-2
            `}
            aria-pressed={isActive}
          >
            {isActive && (
              <MaterialIcon name="check" size="xs" className="flex-shrink-0" />
            )}
            <MaterialIcon name={option.icon as any} size="xs" className="flex-shrink-0" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// PriceInputs (inline)
// ============================================================================

interface PriceInputsProps {
  minPrice: number | undefined;
  maxPrice: number | undefined;
  onChange: (min: number | undefined, max: number | undefined) => void;
  testId?: string;
}

function PriceInputs({ minPrice, maxPrice, onChange, testId }: PriceInputsProps) {
  return (
    <div className="inline-flex items-center gap-1.5" data-testid={testId}>
      <label htmlFor="filter-price-min" className="sr-only">Min price</label>
      <input
        id="filter-price-min"
        type="number"
        placeholder="Min $"
        value={minPrice ?? ''}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
          onChange(val, maxPrice);
        }}
        className={`
          w-20 rounded-lg border border-black/[0.06] bg-white px-2.5 py-2 text-sm font-medium text-ink
          placeholder:text-ink-faint
          transition-colors
          hover:border-black/[0.12]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 focus-visible:border-indigo
          [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
        `}
        data-testid="filter-price-min"
        min="0"
        step="10"
      />
      <span className="text-xs text-ink-faint font-medium">–</span>
      <label htmlFor="filter-price-max" className="sr-only">Max price</label>
      <input
        id="filter-price-max"
        type="number"
        placeholder="Max $"
        value={maxPrice ?? ''}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
          onChange(minPrice, val);
        }}
        className={`
          w-20 rounded-lg border border-black/[0.06] bg-white px-2.5 py-2 text-sm font-medium text-ink
          placeholder:text-ink-faint
          transition-colors
          hover:border-black/[0.12]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 focus-visible:border-indigo
          [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
        `}
        data-testid="filter-price-max"
        min="0"
        step="10"
      />
    </div>
  );
}

// ============================================================================
// PageSizeSelector (inline)
// ============================================================================

interface PageSizeSelectorProps {
  value: number;
  onChange: (size: number) => void;
  testId?: string;
}

function PageSizeSelector({ value, onChange, testId }: PageSizeSelectorProps) {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white px-2 py-1 shadow-float"
      data-testid={testId}
      role="group"
      aria-label="Page size"
    >
      <span className="mr-1 pl-1 text-[11px] font-semibold text-ink-faint">Show</span>
      {PAGE_SIZE_OPTIONS.map((size) => {
        const isActive = value === size;
        return (
          <button
            key={size}
            type="button"
            onClick={() => onChange(size)}
            className={`
              rounded-full px-3 py-1.5 text-xs font-bold transition-all
              ${isActive
                ? 'bg-ink text-white shadow-sm'
                : 'text-ink-soft hover:text-ink hover:bg-black/[0.04]'
              }
            `}
            aria-pressed={isActive ? 'true' : 'false'}
          >
            {PAGE_SIZE_LABELS[size]}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// ClearFilters Button (inline)
// ============================================================================

interface ClearFiltersButtonProps {
  onClick: () => void;
}

function ClearFiltersButton({ onClick }: ClearFiltersButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 rounded-xl border border-coral-ink/15 bg-coral-soft px-3 py-2 text-sm font-bold text-coral-ink
        transition-all duration-150
        hover:bg-coral-ink hover:text-white hover:border-coral-ink
        focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2
      `}
      data-testid="filter-clear"
    >
      <MaterialIcon name="close" size="xs" />
      <span>Clear all</span>
    </button>
  );
}

// ============================================================================
// ApplyButton (inline) — mirrors ClearFiltersButton style
// ============================================================================

interface ApplyButtonProps {
  onClick: () => void;
  loading?: boolean;
}

function ApplyButton({ onClick, loading }: ApplyButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`
        inline-flex items-center gap-1.5 rounded-xl border border-coral-ink/15 bg-coral-soft px-3 py-2 text-sm font-bold text-coral-ink
        transition-all duration-150
        hover:bg-coral-ink hover:text-white hover:border-coral-ink
        focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2
        disabled:opacity-40 disabled:cursor-not-allowed
      `}
      data-testid="filter-apply"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={loading ? 'animate-spin' : ''}
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
      <span>{loading ? 'Syncing…' : 'Apply'}</span>
    </button>
  );
}

// ============================================================================
// Main FilterBar Component
// ============================================================================

export default function FilterBar({
  filters,
  onChange,
  availableLines,
  availableCabinTypes = [],
  availableRegions,
  availableDestinations,
  availablePorts,
  pageSize,
  onPageSizeChange,
  onSync,
  syncLoading = false,
}: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  // Prepare line options (deduplicated) with counts
  const lineOptions = buildLineOptions(availableLines);
  const regionOptions: FilterOption[] = availableRegions.sort().map((r) => ({ value: r, label: r }));
  const destinationOptions: FilterOption[] = availableDestinations.sort().map((d) => ({ value: d, label: d }));
  const portOptions: FilterOption[] = availablePorts.sort().map((p) => ({ value: p, label: p }));

  // Determine if there are any active filters (for showing clear button)
  const hasActiveFilters = Boolean(
    filters.cruiseLine?.length ||
    filters.cabinType?.length ||
    filters.destination?.length ||
    filters.departurePort?.length ||
    filters.departureRegion?.length ||
    filters.minNights !== undefined ||
    filters.maxNights !== undefined ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.badgeType?.length ||
    filters.sort
  );

  // Get current nights option
  const currentNights = getNightsOption(filters.minNights, filters.maxNights);

  // Count active filters for badge
  const activeCount = [
    filters.cruiseLine?.length,
    filters.cabinType?.length,
    filters.destination?.length,
    filters.departurePort?.length,
    filters.departureRegion?.length,
    filters.minNights !== undefined,
    filters.maxNights !== undefined,
    filters.minPrice !== undefined,
    filters.maxPrice !== undefined,
    filters.badgeType?.length,
    filters.sort ? 1 : 0,
  ].filter(Boolean).length;

  // Handlers
  const handleCabinTypesChange = (cabinTypes: ('Inside' | 'Oceanview' | 'Balcony' | 'Suite')[]) => {
    onChange({ ...filters, cabinType: cabinTypes.length ? cabinTypes : undefined });
  };

  // Handlers
  const handleLinesChange = (lines: string[]) => {
    onChange({ ...filters, cruiseLine: lines.length ? lines : undefined });
  };

  const handleRegionsChange = (regions: string[]) => {
    onChange({ ...filters, departureRegion: regions.length ? regions : undefined });
  };

  const handleDestinationsChange = (destinations: string[]) => {
    onChange({ ...filters, destination: destinations.length ? destinations : undefined });
  };

  const handlePortsChange = (ports: string[]) => {
    onChange({ ...filters, departurePort: ports.length ? ports : undefined });
  };

  const handleNightsChange = (value: NightOptionValue | null) => {
    if (value === null) {
      onChange({ ...filters, minNights: undefined, maxNights: undefined });
      return;
    }
    const { min, max } = getNightsRange(value);
    onChange({ ...filters, minNights: min, maxNights: max });
  };

  const handleTypesChange = (types: BadgeOptionValue[]) => {
    onChange({ ...filters, badgeType: types.length ? types : undefined });
  };

  const handlePriceChange = (min: number | undefined, max: number | undefined) => {
    onChange({ ...filters, minPrice: min, maxPrice: max });
  };

  const handleSortChange = (value: string) => {
    if (!value) {
      onChange({ ...filters, sort: undefined });
    } else {
      onChange({ ...filters, sort: value as any });
    }
  };

  const handleClear = () => {
    onChange({
      cruiseLine: undefined,
      cabinType: undefined,
      destination: undefined,
      departurePort: undefined,
      departureRegion: undefined,
      minNights: undefined,
      maxNights: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      badgeType: undefined,
      sort: undefined,
    });
  };

  return (
    <div className="space-y-3" data-testid="filter-bar">
      {/* Mobile collapse toggle — only visible on small screens */}
      <div className="block lg:hidden">
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-black/[0.12] hover:bg-black/[0.02]"
          aria-expanded={expanded}
        >
          <span className="flex items-center gap-2">
            <MaterialIcon name="filter_list" size="sm" />
            Filters
            {activeCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </span>
          <MaterialIcon
            name={expanded ? 'expand_less' : 'expand_more'}
            size="sm"
            className={`text-ink-faint transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Collapsible body — hidden on mobile when collapsed */}
        {!expanded && (
          <div className="mt-2 flex flex-col gap-2">
            {/* Minimal mobile: just price + clear */}
            <div className="flex flex-wrap items-center gap-2">
              <PriceInputs
                minPrice={filters.minPrice}
                maxPrice={filters.maxPrice}
                onChange={handlePriceChange}
              />
              {hasActiveFilters && <ClearFiltersButton onClick={handleClear} />}
            </div>
          </div>
        )}
      </div>

      {/* Desktop: always visible, 2-row layout */}
      <div className="hidden lg:block">
        {/* Row 1: Geographic filters (Line, Region, Destination, Port) */}
        <div className="flex flex-wrap items-stretch gap-3">
          <MultiSelectDropdown
            label="Line"
            placeholder="All lines"
            options={lineOptions}
            selected={filters.cruiseLine ?? []}
            onChange={handleLinesChange}
            testId="filter-cruise-line"
          />

          <MultiSelectDropdown
            label="Region"
            placeholder="All regions"
            options={regionOptions}
            selected={filters.departureRegion ?? []}
            onChange={handleRegionsChange}
            testId="filter-region"
          />

          <MultiSelectDropdown
            label="Destination"
            placeholder="All destinations"
            options={destinationOptions}
            selected={filters.destination ?? []}
            onChange={handleDestinationsChange}
            testId="filter-destination"
          />

          <MultiSelectDropdown
            label="Port"
            placeholder="All ports"
            options={portOptions}
            selected={filters.departurePort ?? []}
            onChange={handlePortsChange}
            testId="filter-port"
          />
        </div>

        {/* Row 2: Nights, Type, Price, Sort, Clear, Page size */}
        <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-ink-faint text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap">
              Nights
            </span>
            <NightsSegmentedGroup
              value={currentNights}
              onChange={handleNightsChange}
              testId="filter-nights"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="shrink-0 text-ink-faint text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap">
              Type
            </span>
            <TypePillGroup
              value={(filters.badgeType as BadgeOptionValue[]) ?? []}
              onChange={handleTypesChange}
              testId="filter-type"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="shrink-0 text-ink-faint text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap">
              Room
            </span>
            <CabinTypeFilter
              value={(filters.cabinType as ('Inside' | 'Oceanview' | 'Balcony' | 'Suite')[]) ?? []}
              onChange={handleCabinTypesChange}
              testId="filter-cabin-type"
              availableCabinTypes={availableCabinTypes}
              hideWhenEmpty={availableCabinTypes.length === 0}
            />
          </div>

          <div className="flex items-center gap-3">
            <PriceInputs
              minPrice={filters.minPrice}
              maxPrice={filters.maxPrice}
              onChange={handlePriceChange}
              testId="filter-price"
            />
          </div>

          <div className="flex items-center gap-3">
            <SingleSelectDropdown
              label="Sort"
              options={SORT_OPTIONS.filter((o) => o.value !== "").map((o) => ({ value: o.value, label: o.label }))}
              value={filters.sort ?? ''}
              onChange={handleSortChange}
              testId="filter-sort"
            />
          </div>

          <div className="flex items-center">
            <PageSizeSelector
              value={pageSize}
              onChange={onPageSizeChange}
              testId="filter-page-size"
            />
          </div>

          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <ClearFiltersButton onClick={handleClear} />
              {onSync && <ApplyButton onClick={onSync} loading={syncLoading} />}
            </div>
          )}
        </div>
      </div>

      {/* Mobile expanded body — compact 2x2 grid + wrapped secondary row */}
      {expanded && (
        <div className="block lg:hidden pt-2 pb-4" data-testid="filter-bar-mobile-expanded">
          {/* Mobile Row 1: Geographic filters (2x2 grid) */}
          <div className="grid grid-cols-2 gap-2">
            <MultiSelectDropdown
              label="Line"
              placeholder="All lines"
              options={lineOptions}
              selected={filters.cruiseLine ?? []}
              onChange={handleLinesChange}
              testId="filter-cruise-line"
            />

            <MultiSelectDropdown
              label="Region"
              placeholder="All regions"
              options={regionOptions}
              selected={filters.departureRegion ?? []}
              onChange={handleRegionsChange}
              testId="filter-region"
            />

            <MultiSelectDropdown
              label="Dest"
              placeholder="All dests"
              options={destinationOptions}
              selected={filters.destination ?? []}
              onChange={handleDestinationsChange}
              testId="filter-destination"
            />

            <MultiSelectDropdown
              label="Port"
              placeholder="All ports"
              options={portOptions}
              selected={filters.departurePort ?? []}
              onChange={handlePortsChange}
              testId="filter-port"
            />
          </div>

          {/* Mobile Row 2: Nights, Type, Price, Sort, Clear */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-ink-faint text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap">
                Nights
              </span>
              <NightsSegmentedGroup
                value={currentNights}
                onChange={handleNightsChange}
                testId="filter-nights"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="shrink-0 text-ink-faint text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap">
                Type
              </span>
              <TypePillGroup
                value={(filters.badgeType as BadgeOptionValue[]) ?? []}
                onChange={handleTypesChange}
                testId="filter-type"
              />
            </div>

            <PriceInputs
              minPrice={filters.minPrice}
              maxPrice={filters.maxPrice}
              onChange={handlePriceChange}
              testId="filter-price"
            />

            <SingleSelectDropdown
              label="Sort"
              options={SORT_OPTIONS.filter((o) => o.value !== "").map((o) => ({ value: o.value, label: o.label }))}
              value={filters.sort ?? ''}
              onChange={handleSortChange}
              testId="filter-sort"
              hideWhenSingle={false}
            />

            {hasActiveFilters && (
              <ClearFiltersButton onClick={handleClear} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
