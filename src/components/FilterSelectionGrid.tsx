'use client';

import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import type { DealFilters } from '@/types/cruise';

// ============================================================================
// Type Definitions
// ============================================================================

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

/**
 * Filter state using the existing DealFilters field names for compatibility
 */
export interface FilterSelectionGridProps {
  filters: DealFilters;
  onChange: (filters: DealFilters) => void;
  availableLines: string[];
  availableRegions: string[];
  availableDestinations: string[];
  availableShips?: string[];
  availableCabinType?: ('Inside' | 'Oceanview' | 'Balcony' | 'Suite')[];
  hasActiveFilters?: boolean;
  onClear?: () => void;
  disabled?: boolean;
  /** Optional per-option result counts (e.g. "Royal Caribbean (42)"). */
  lineCounts?: Record<string, number>;
  destinationCounts?: Record<string, number>;
  shipCounts?: Record<string, number>;
  portCounts?: Record<string, number>;
  regionCounts?: Record<string, number>;
  /**
   * Whether the mobile collapse toggle starts expanded.
   * Set to `true` when the grid is rendered inside an already-open drawer
   * (e.g. MobileFilterBar) so the user sees filters immediately instead of
   * a collapsed nested toggle. Defaults to `false`.
   */
  defaultExpanded?: boolean;
}

export type NightOption = '0-3' | '4-7' | '8-14';
export type TypeOption = 'drop' | 'solo' | 'gold';

const NIGHT_OPTIONS: { value: NightOption; label: string; min: number; max?: number }[] = [
  { value: '0-3', label: '0–3', min: 0, max: 3 },
  { value: '4-7', label: '4–7', min: 4, max: 7 },
  { value: '8-14', label: '8+', min: 8 },
] as const;

const TYPE_OPTIONS: { value: TypeOption; label: string }[] = [
  { value: 'drop', label: 'Drop Deals' },
  { value: 'solo', label: 'Solo Friendly' },
  { value: 'gold', label: 'Great Value' },
] as const;

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Default' },
  { value: 'price-asc', label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
  { value: 'nights-asc', label: 'Nights ↑' },
  { value: 'nights-desc', label: 'Nights ↓' },
  { value: 'date-asc', label: 'Date ↑' },
  { value: 'date-desc', label: 'Date ↓' },
  { value: 'drop-desc', label: 'Biggest Drop' },
];

// ============================================================================
// Helper: Normalize cruise line names (merge duplicates)
// ============================================================================

function normalizeLineName(line: string): string {
  return line
    .replace(' Cruise Line', '')
    .replace(' Cruises', '')
    .trim();
}

function buildLineOptions(
  lines: string[],
  counts?: Record<string, number>
): FilterOption[] {
  const seen = new Map<string, { value: string; label: string; count?: number }>();
  lines.forEach((line) => {
    const normalized = normalizeLineName(line);
    if (seen.has(normalized)) {
      // Aggregate counts when the same line appears under two raw names
      const existing = seen.get(normalized)!;
      const c1 = existing.count || 0;
      const c2 = counts?.[line] || 0;
      existing.count = c1 + c2;
      return;
    }
    seen.set(normalized, {
      value: line,
      label: normalized,
      count: counts?.[line],
    });
  });
  return Array.from(seen.values());
}

// ============================================================================
// Helper: Convert min/max nights to NightOption
// ============================================================================

function getNightsOption(minNights?: number, maxNights?: number): NightOption | null {
  if (minNights === undefined && maxNights === undefined) return null;
  if (minNights === 0 && maxNights === 3) return '0-3';
  if (minNights === 4 && maxNights === 7) return '4-7';
  if (minNights === 8) return '8-14';
  return null;
}

// ============================================================================
// MultiSelectDropdown Component
// ============================================================================

interface MultiSelectDropdownProps {
  label: string;
  placeholder: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  testId?: string;
  disabled?: boolean;
}

function MultiSelectDropdown({
  label,
  placeholder,
  options,
  selected,
  onChange,
  testId,
  disabled,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Use requestAnimationFrame to allow click events to process before closing
      requestAnimationFrame(() => {
        if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
          setOpen(false);
        }
      });
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
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

  if (!options.length) return null;

  return (
      <div ref={rootRef} className="relative min-w-0 flex-1" data-testid={testId}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          className={`flex h-10 w-full items-center gap-2 rounded-lg border border-black/[0.06] bg-white
            px-3 py-2 text-left text-sm font-medium text-ink shadow-xs
            transition-colors
            hover:border-black/[0.12] hover:bg-black/[0.02]
            focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/40 focus-visible:border-indigo/30
            disabled:opacity-40 disabled:cursor-not-allowed
          `}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          {label}
        </span>
        <span className="flex-1 truncate text-sm font-medium text-ink">
          {displayValue}
        </span>
        <MaterialIcon
          name={open ? 'expand_less' : 'expand_more'}
          size="xs"
          className={`shrink-0 text-ink-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && !disabled && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto
            rounded-xl border border-black/[0.06] bg-white p-1 shadow-lg
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
                onClick={() => toggleOption(option.value)}
                className={`
                  block w-full truncate rounded-lg px-3 py-3 text-left text-sm font-medium
                  transition-colors
                  ${isSelected
                    ? 'bg-indigo-mist text-indigo'
                    : 'text-ink-soft hover:bg-black/[0.04] hover:text-ink'
                  }
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50
                `}
              >
                <span className="flex items-center gap-2 w-full">
                  {isSelected && (
                    <MaterialIcon name="check" size="xs" className="text-indigo flex-shrink-0" />
                  )}
                  <span className="truncate">{option.label}</span>
                  {typeof option.count === 'number' && (
                    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/[0.04] px-1.5 text-[10px] font-bold text-ink-soft">
                      {option.count}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-ink-faint">No options available</div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SingleSelectDropdown (Sort)
// ============================================================================

interface SingleSelectDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  testId?: string;
  disabled?: boolean;
}

function SingleSelectDropdown({
  label,
  options,
  value,
  onChange,
  testId,
  disabled,
}: SingleSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Use requestAnimationFrame to allow click events to process before closing
      requestAnimationFrame(() => {
        if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
          setOpen(false);
        }
      });
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className="relative min-w-0" data-testid={testId}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`
          flex w-full h-10 min-w-0 items-center gap-2 rounded-lg border border-black/[0.06] bg-white px-3 py-2 text-left text-sm font-medium text-ink shadow-xs
          transition-colors
          hover:border-black/[0.12] hover:bg-black/[0.02]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/40 focus-visible:border-indigo/30
          disabled:opacity-40 disabled:cursor-not-allowed
        `}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="shrink-0 text-ink-faint text-[11px] font-semibold uppercase tracking-wider">
          {label}
        </span>
        <span className="flex-1 truncate text-sm font-medium text-ink">
          {selectedOption?.label ?? 'Default'}
        </span>
        <MaterialIcon
          name={open ? 'expand_less' : 'expand_more'}
          size="xs"
          className={`shrink-0 text-ink-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && !disabled && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto
            rounded-xl border border-black/[0.06] bg-white p-1 shadow-lg
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
                onClick={() => onChange(option.value)}
                className={`
                  block w-full truncate rounded-lg px-3 py-3 text-left text-sm font-medium
                  transition-colors
                  ${isSelected
                    ? 'bg-indigo-mist text-indigo'
                    : 'text-ink-soft hover:bg-black/[0.04] hover:text-ink'
                  }
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50
                `}
              >
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// NightsSegmentedGroup Component
// ============================================================================

interface NightsSegmentedGroupProps {
  value: NightOption | null;
  onChange: (value: NightOption | null) => void;
  testId?: string;
  disabled?: boolean;
}

function NightsSegmentedGroup({
  value,
  onChange,
  testId,
  disabled,
}: NightsSegmentedGroupProps) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg border border-black/[0.06] bg-white p-0.5"
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
            disabled={disabled}
            onClick={() => onChange(isActive ? null : option.value)}
            className={`
              relative flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-md px-3 py-2 text-xs font-medium
              transition-all duration-150
              ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
              ${isActive
                ? 'bg-indigo text-white shadow-sm'
                : 'text-ink-soft hover:bg-black/[0.04] hover:text-ink'
              }
              focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 focus-visible:ring-offset-2
            `}
            aria-pressed={isActive}
          >
            <span className="font-semibold tabular-nums">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// TypePillGroup Component
// ============================================================================

interface TypePillGroupProps {
  value: TypeOption[];
  onChange: (value: TypeOption[]) => void;
  testId?: string;
  disabled?: boolean;
}

function TypePillGroup({
  value,
  onChange,
  testId,
  disabled,
}: TypePillGroupProps) {
  const toggleType = (type: TypeOption) => {
    const next = value.includes(type)
      ? value.filter((v) => v !== type)
      : [...value, type];
    onChange(next);
  };

  return (
    <div
      className="inline-flex items-center gap-1 flex-wrap"
      data-testid={testId}
      role="group"
      aria-label="Deal types"
    >
      {TYPE_OPTIONS.map((option) => {
        const isActive = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => toggleType(option.value)}
            className={`inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium
              transition-all duration-150
              ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
              ${isActive
                ? 'bg-indigo text-white shadow-sm'
                : 'bg-white text-ink-soft border border-black/[0.06] hover:border-black/[0.12] hover:bg-black/[0.02] hover:text-ink'}
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
// PriceInputs Component
// ============================================================================

interface PriceInputsProps {
  minPrice: number | undefined;
  maxPrice: number | undefined;
  onChange: (min: number | undefined, max: number | undefined) => void;
  testId?: string;
  disabled?: boolean;
}

function PriceInputs({
  minPrice,
  maxPrice,
  onChange,
  testId,
  disabled,
}: PriceInputsProps) {
  const handleMinChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
    onChange(val, maxPrice);
  };

  const handleMaxChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
    onChange(minPrice, val);
  };

  return (
    <div
      className="inline-flex items-center gap-1.5"
      data-testid={testId}
    >
      <label htmlFor="filter-price-min" className="sr-only">Min price</label>
      <input
        id="filter-price-min"
        type="number"
        placeholder="Min"
        value={minPrice ?? ''}
        onChange={handleMinChange}
        disabled={disabled}
        className={`
          w-16 min-h-[44px] rounded-lg border border-black/[0.06] bg-white px-2 py-2 text-xs font-medium text-ink
          placeholder:text-ink-faint
          transition-colors
          hover:border-black/[0.12]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 focus-visible:border-indigo
          disabled:opacity-40 disabled:cursor-not-allowed
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
        placeholder="Max"
        value={maxPrice ?? ''}
        onChange={handleMaxChange}
        disabled={disabled}
        className={`
          w-16 min-h-[44px] rounded-lg border border-black/[0.06] bg-white px-2 py-2 text-xs font-medium text-ink
          placeholder:text-ink-faint
          transition-colors
          hover:border-black/[0.12]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 focus-visible:border-indigo
          disabled:opacity-40 disabled:cursor-not-allowed
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
// ClearFilters Button
// ============================================================================

interface ClearFiltersButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

function ClearFiltersButton({ onClick, disabled }: ClearFiltersButtonProps) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-coral-ink/15 bg-coral-soft px-3 py-2 text-xs font-bold text-coral-ink
          transition-all duration-150
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-coral-ink hover:text-white hover:border-coral-ink'}
          focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2
        `}
        data-testid="filter-clear"
      >
        <MaterialIcon name="close" size="xs" />
        <span>Clear</span>
      </button>
    );
  }

// ============================================================================
// Main FilterSelectionGrid Component
// ============================================================================

export default function FilterSelectionGrid({
  filters,
  onChange,
  availableLines,
  availableRegions,
  availableDestinations,
  availableShips = [],
  availableCabinType = [],
  hasActiveFilters = false,
  onClear,
  disabled = false,
  lineCounts,
  destinationCounts,
  shipCounts,
  portCounts,
  regionCounts,
  defaultExpanded = false,
}: FilterSelectionGridProps) {
  // Mobile collapse state
  const [expanded, setExpanded] = useState(defaultExpanded);
  console.log('FilterSelectionGrid expanded state:', expanded, 'defaultExpanded:', defaultExpanded);

  // Count active filters for badge
  const activeCount = [
    filters.cruiseLine?.length || 0,
    filters.cabinType?.length || 0,
    filters.destination?.length || 0,
    filters.departurePort?.length || 0,
    filters.departureRegion?.length || 0,
    filters.ship?.length || 0,
    filters.minNights !== undefined ? 1 : 0,
    filters.maxNights !== undefined ? 1 : 0,
    filters.minPrice !== undefined ? 1 : 0,
    filters.maxPrice !== undefined ? 1 : 0,
    filters.badgeType?.length || 0,
    filters.sort ? 1 : 0,
  ].filter(Boolean).length;

  // Prepare line options
  const lineOptions = buildLineOptions(availableLines, lineCounts);
  const regionOptions: FilterOption[] = availableRegions
    .sort()
    .map((region) => ({ value: region, label: region, count: regionCounts?.[region] }));
  const destinationOptions: FilterOption[] = availableDestinations
    .sort()
    .map((dest) => ({ value: dest, label: dest, count: destinationCounts?.[dest] }));
  const shipOptions: FilterOption[] = [...new Set(availableShips)]
    .sort()
    .map((ship) => ({ value: ship, label: ship, count: shipCounts?.[ship] }));

  // Get current nights option
  const currentNights = getNightsOption(filters.minNights, filters.maxNights);

  const handleLinesChange = (lines: string[]) => {
    onChange({ ...filters, cruiseLine: lines.length ? lines : undefined });
  };

  const handleRegionsChange = (regions: string[]) => {
    onChange({ ...filters, departureRegion: regions.length ? regions : undefined });
  };

  const handleDestinationsChange = (destinations: string[]) => {
    onChange({ ...filters, destination: destinations.length ? destinations : undefined });
  };

  const handleShipsChange = (ships: string[]) => {
    onChange({ ...filters, ship: ships.length ? ships : undefined });
  };

  const handleNightsChange = (value: NightOption | null) => {
    if (value === null) {
      onChange({ ...filters, minNights: undefined, maxNights: undefined });
      return;
    }
    const opt = NIGHT_OPTIONS.find((o) => o.value === value);
    if (opt) {
      onChange({ ...filters, minNights: opt.min, maxNights: opt.max });
    }
  };

  const handleTypesChange = (types: TypeOption[]) => {
    onChange({ ...filters, badgeType: types.length ? types : undefined });
  };

  const handlePriceChange = (min: number | undefined, max: number | undefined) => {
    onChange({ ...filters, minPrice: min, maxPrice: max });
  };

  const handleSortChange = (value: string) => {
    onChange({ ...filters, sort: value as DealFilters['sort'] });
  };

  const handleClear = () => {
    onChange({
      cruiseLine: undefined,
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
    onClear?.();
  };

  // Shared components used by both mobile and desktop
  const renderFilters = () => (
    <>
      {/* Row 1: Geographic Filters (Line, Region, Destination) */}
      <div className="flex flex-wrap items-stretch gap-2">
        <MultiSelectDropdown
          label="Line"
          placeholder="Any line"
          options={lineOptions}
          selected={filters.cruiseLine ?? []}
          onChange={handleLinesChange}
          testId="filter-cruise-line"
          disabled={lineOptions.length <= 1 || disabled}
        />

        <MultiSelectDropdown
          label="Region"
          placeholder="Any region"
          options={regionOptions}
          selected={filters.departureRegion ?? []}
          onChange={handleRegionsChange}
          testId="filter-region"
          disabled={regionOptions.length <= 1 || disabled}
        />

        <MultiSelectDropdown
          label="Dest"
          placeholder="Any dest"
          options={destinationOptions}
          selected={filters.destination ?? []}
          onChange={handleDestinationsChange}
          testId="filter-destination"
          disabled={destinationOptions.length <= 1 || disabled}
        />

        <MultiSelectDropdown
          label="Ship"
          placeholder="Any ship"
          options={shipOptions}
          selected={filters.ship ?? []}
          onChange={handleShipsChange}
          testId="filter-ship"
          disabled={shipOptions.length <= 1 || disabled}
        />
      </div>

      {/* Row 2: Nights, Type, Price, Sort, Clear */}
      <div className="flex flex-wrap items-center gap-2">
        <NightsSegmentedGroup
          value={currentNights}
          onChange={handleNightsChange}
          testId="filter-nights"
          disabled={disabled}
        />

        <TypePillGroup
          value={(filters.badgeType as TypeOption[]) ?? []}
          onChange={handleTypesChange}
          testId="filter-type"
          disabled={disabled}
        />

        <PriceInputs
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          onChange={handlePriceChange}
          testId="filter-price"
          disabled={disabled}
        />

        <SingleSelectDropdown
          label="Sort"
          options={SORT_OPTIONS}
          value={filters.sort ?? ''}
          onChange={handleSortChange}
          testId="filter-sort"
          disabled={disabled}
        />

        {hasActiveFilters && (
          <ClearFiltersButton onClick={handleClear} disabled={disabled} />
        )}
      </div>
    </>
  );

  // ─── Mobile Collapse Toggle ───
  return (
    <div data-testid="filter-selection-grid" className="space-y-2">
      {/* Mobile: collapsed toggle + expandable body (hidden on desktop) */}
      <div className="block lg:hidden">
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full h-10 items-center justify-between gap-2 rounded-lg border border-black/[0.06] bg-white px-3 py-2 text-sm font-medium text-ink shadow-xs transition-colors hover:border-black/[0.12] hover:bg-black/[0.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/40 focus-visible:border-indigo/30"
          aria-expanded={expanded}
          aria-haspopup="listbox"
        >
          <span className="flex items-center gap-2">
            <MaterialIcon name="filter_list" size="sm" />
            Filters
            {activeCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo text-[9px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </span>
          <MaterialIcon
            name={expanded ? 'expand_less' : 'expand_more'}
            size="sm"
            className="shrink-0 text-ink-faint transition-transform duration-200"
          />
        </button>

        {expanded && (
          <div className="py-2">
            {renderFilters()}
          </div>
        )}
      </div>

      {/* Desktop: always visible, 2-row layout (hidden on mobile) */}
      <div className="hidden lg:block">
        {renderFilters()}
      </div>
    </div>
  );
}
