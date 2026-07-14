/**
 * Filter Selection Grid - Type Definitions
 * 
 * Centralized type definitions for the filter selection grid component
 * and its sub-components.
 */

import type { DealFilters } from '@/types/cruise';

// ============================================================================
// Core Filter State Types
// ============================================================================

/**
 * Represents a single filter option with optional count badge
 */
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

/**
 * Complete filter state for the deal search grid
 * 
 * - lines: Selected cruise lines (deduplicated, e.g., "Holland America" not "Holland America Line")
 * - regions: Selected departure regions
 * - destinations: Selected destinations
 * - nights: Selected night range ('0-3' | '4-7' | '8-14' | null)
 * - types: Selected deal types ('drop' | 'solo' | 'gold')
 * - minPrice/maxPrice: Price range filters
 * - sort: Sort order for results
 */
export interface FilterState {
  lines: string[];
  regions: string[];
  destinations: string[];
  nights: string | null;
  types: ('drop' | 'solo' | 'gold')[];
  minPrice: number | undefined;
  maxPrice: number | undefined;
  sort: DealFilters['sort'];
}

/**
 * Initial/default filter state (all filters cleared)
 */
export const DEFAULT_FILTER_STATE: FilterState = {
  lines: [],
  regions: [],
  destinations: [],
  nights: null,
  types: [],
  minPrice: undefined,
  maxPrice: undefined,
  sort: undefined,
};

// ============================================================================
// Filter Option Constants
// ============================================================================

/**
 * Night range options for the segmented button group
 */
export type NightOption = '0-3' | '4-7' | '8-14';

export const NIGHT_OPTIONS: { value: NightOption; label: string; min: number; max?: number }[] = [
  { value: '0-3', label: '0–3', min: 0, max: 3 },
  { value: '4-7', label: '4–7', min: 4, max: 7 },
  { value: '8-14', label: '8+', min: 8 },
] as const;

/**
 * Deal type options for the pill group
 */
export type TypeOption = 'drop' | 'solo' | 'gold';

export const TYPE_OPTIONS: { value: TypeOption; label: string }[] = [
  { value: 'drop', label: 'Drop Deals' },
  { value: 'solo', label: 'Solo Friendly' },
  { value: 'gold', label: 'Great Value' },
] as const;

/**
 * Sort options for the dropdown
 */
export const SORT_OPTIONS = [
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
// Helper Functions
// ============================================================================

/**
 * Normalize cruise line name by removing common suffixes
 * Merges duplicates like "Holland America" and "Holland America Line"
 */
export function normalizeLineName(line: string): string {
  return line
    .replace(' Cruise Line', '')
    .replace(' Cruises', '')
    .trim();
}

/**
 * Deduplicate an array of cruise line names based on normalized form
 */
export function deduplicateLines(lines: string[]): string[] {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const normalized = normalizeLineName(line);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

/**
 * Build filter options from raw line names with normalized labels
 */
export function buildLineOptions(lines: string[]): FilterOption[] {
  const uniqueLines = deduplicateLines(lines);
  return uniqueLines.map((line) => ({
    value: line,
    label: normalizeLineName(line),
  }));
}

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.lines.length > 0 ||
    filters.regions.length > 0 ||
    filters.destinations.length > 0 ||
    filters.nights !== null ||
    filters.types.length > 0 ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.sort !== undefined
  );
}

/**
 * Clear all filters - return to default state
 */
export function clearFilters(): FilterState {
  return DEFAULT_FILTER_STATE;
}

/**
 * Apply filter changes immutably
 */
export function applyFilterChange(
  current: FilterState,
  changes: Partial<FilterState>
): FilterState {
  return { ...current, ...changes };
}