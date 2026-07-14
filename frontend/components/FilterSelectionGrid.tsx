'use client';

import { useState, useRef, useEffect, type ReactNode, type ChangeEvent } from 'react';
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

export interface FilterGroup {
  key: keyof FilterState;
  label: string;
  options: FilterOption[];
  placeholder: string;
  allowMultiple?: boolean;
}

export interface FilterState {
  lines: string[];
  regions: string[];
  destinations: string[];
  nights: string | null; // '0-3' | '4-7' | '8-14' | null
  types: ('drop' | 'solo' | 'gold')[];
  minPrice: number | undefined;
  maxPrice: number | undefined;
  sort: DealFilters['sort'];
}

export interface FilterSelectionGridProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  availableLines: string[];
  availableRegions: string[];
  availableDestinations: string[];
  hasActiveFilters?: boolean;
  onClear?: () => void;
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

const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'price-asc', label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
  { value: 'nights-asc', label: 'Nights ↑' },
  { value: 'nights-desc', label: 'Nights ↓' },
  { value: 'date-asc', label: 'Date ↑' },
  { value: 'date-desc', label: 'Date ↓' },
  { value: 'drop-desc', label: 'Biggest Drop' },
] as const;

// ============================================================================
// Helper: normalize cruise line names (merge duplicates)
// ============================================================================

function normalizeLineName(line: string): string {
  return line
    .replace(' Cruise Line', '')
    .replace(' Cruises', '')
    .trim();
}

function deduplicateLines(lines: string[]): string[] {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const normalized = normalizeLineName(line);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
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
  const buttonRef = useRef<HTMLButtonElement>(null);

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
  const displayValue = selectedCount === 0
    ? placeholder
    : selectedCount === 1
      ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
      : `${selectedCount} selected`;

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1" data-testid={testId}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`
          flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left
          disabled:opacity-40 disabled:cursor-not-allowed
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

      {open && !disabled && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto
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
                onClick={() => toggleOption(option.value)}
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
                  {option.count !== undefined && (
                    <span className="ml-auto text-xs text-ink-faint font-normal">
                      {option.count}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          {options.length === 0 && (
            <div className="px-3.5 py-2.5 text-sm text-ink-faint">
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SingleSelectDropdown Component (for Sort)
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
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1" data-testid={testId}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`
          flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left
          disabled:opacity-40 disabled:cursor-not-allowed
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
          {selectedOption?.label ?? 'Default'}
        </span>
        <MaterialIcon
          name={open ? 'expand_less' : 'expand_more'}
          size="sm"
          className={`text-ink-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && !disabled && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto
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
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
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
            disabled={disabled}
            onClick={() => onChange(isActive ? null : option.value)}
            className={`
              relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium
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
            <span className="text-[10px] font-normal opacity-70">nights</span>
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
      className="inline-flex items-center gap-1.5 flex-wrap"
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
            className={`
              inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium
              transition-all duration-150
              ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
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
      <label
        htmlFor="filter-price-min"
        className="sr-only"
      >
        Min price
      </label>
      <input
        id="filter-price-min"
        type="number"
        placeholder="Min $"
        value={minPrice ?? ''}
        onChange={handleMinChange}
        disabled={disabled}
        className={`
          w-20 rounded-lg border border-black/[0.06] bg-white px-2.5 py-2 text-sm font-medium text-ink
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
      <label
        htmlFor="filter-price-max"
        className="sr-only"
      >
        Max price
      </label>
      <input
        id="filter-price-max"
        type="number"
        placeholder="Max $"
        value={maxPrice ?? ''}
        onChange={handleMaxChange}
        disabled={disabled}
        className={`
          w-20 rounded-lg border border-black/[0.06] bg-white px-2.5 py-2 text-sm font-medium text-ink
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
      className={`
        inline-flex items-center gap-1.5 rounded-xl border border-coral-ink/15 bg-coral-soft px-3 py-2 text-sm font-bold text-coral-ink
        transition-all duration-150
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-coral-ink hover:text-white hover:border-coral-ink'}
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
// Main FilterSelectionGrid Component
// ============================================================================

export default function FilterSelectionGrid({
  filters,
  onChange,
  availableLines,
  availableRegions,
  availableDestinations,
  hasActiveFilters = false,
  onClear,
}: FilterSelectionGridProps) {
  // Prepare deduplicated line options
  const uniqueLines = deduplicateLines(availableLines).sort();
  const lineOptions: FilterOption[] = uniqueLines.map((line) => ({
    value: line,
    label: normalizeLineName(line),
  }));

  const regionOptions: FilterOption[] = availableRegions
    .sort()
    .map((region) => ({ value: region, label: region }));

  const destinationOptions: FilterOption[] = availableDestinations
    .sort()
    .map((dest) => ({ value: dest, label: dest }));

  const handleLinesChange = (values: string[]) => {
    onChange({ ...filters, cruiseLine: values.length ? values : undefined });
  };

  const handleRegionsChange = (values: string[]) => {
    onChange({ ...filters, departureRegion: values.length ? values : undefined });
  };

  const handleDestinationsChange = (values: string[]) => {
    onChange({ ...filters, destination: values.length ? values : undefined });
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

  const handleTypesChange = (values: TypeOption[]) => {
    onChange({ ...filters, badgeType: values.length ? values : undefined });
  };

  const handlePriceChange = (min: number | undefined, max: number | undefined) => {
    onChange({ ...filters, minPrice: min, maxPrice: max });
  };

  const handleSortChange = (value: string) => {
    onChange({ ...filters, sort: value as DealFilters['sort'] });
  };

  const handleClear = () => {
    onChange({});
    onClear?.();
  };

  return (
    <div className="space-y-3" data-testid="filter-selection-grid">
      {/* Row 1: Geographic Filters (Lines, Regions, Destinations) */}
      <div className="flex flex-col sm:flex-row items-stretch gap-3">
        <MultiSelectDropdown
          label="Line"
          placeholder="All lines"
          options={lineOptions}
          selected={filters.lines ?? []}
          onChange={handleLinesChange}
          testId="filter-cruise-line"
          disabled={lineOptions.length <= 1}
        />

        <MultiSelectDropdown
          label="Region"
          placeholder="All regions"
          options={regionOptions}
          selected={filters.regions ?? []}
          onChange={handleRegionsChange}
          testId="filter-region"
          disabled={regionOptions.length <= 1}
        />

        <MultiSelectDropdown
          label="Destination"
          placeholder="All destinations"
          options={destinationOptions}
          selected={filters.destinations ?? []}
          onChange={handleDestinationsChange}
          testId="filter-destination"
          disabled={destinationOptions.length <= 1}
        />
      </div>

      {/* Row 2: Nights, Type, Price, Sort, Clear */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="shrink-0 text-ink-faint text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap">
            Nights
          </span>
          <NightsSegmentedGroup
            value={filters.nights}
            onChange={handleNightsChange}
            testId="filter-nights"
          />
        </div>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="shrink-0 text-ink-faint text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap">
            Type
          </span>
          <TypePillGroup
            value={filters.types ?? []}
            onChange={handleTypesChange}
            testId="filter-type"
          />
        </div>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <PriceInputs
            minPrice={filters.minPrice}
            maxPrice={filters.maxPrice}
            onChange={handlePriceChange}
            testId="filter-price"
          />
        </div>

        <div className="flex items-center gap-3 flex-1 min-w-0 sm:flex-[0_0_auto]">
          <SingleSelectDropdown
            label="Sort"
            options={SORT_OPTIONS}
            value={filters.sort ?? ''}
            onChange={handleSortChange}
            testId="filter-sort"
          />
        </div>

        {hasActiveFilters && (
          <div className="flex items-center sm:flex-[0_0_auto]">
            <ClearFiltersButton onClick={handleClear} />
          </div>
        )}
      </div>
    </div>
  );
}