/**
 * Shared filter constants for the Deals page filter bar.
 * Imported by FilterBar.tsx and any other component that needs
 * standardized filter option lists.
 */

export const NIGHT_OPTIONS = [
  { value: '0-3' as const, label: '0–3', min: 0, max: 3 },
  { value: '4-7' as const, label: '4–7', min: 4, max: 7 },
  { value: '8+' as const, label: '8+', min: 8 },
] as const;

export type NightOptionValue = (typeof NIGHT_OPTIONS)[number]['value'];

export const SORT_OPTIONS = [
  { value: '' as const, label: 'Default' },
  { value: 'price-asc' as const, label: 'Price ↑' },
  { value: 'price-desc' as const, label: 'Price ↓' },
  { value: 'nights-asc' as const, label: 'Nights ↑' },
  { value: 'nights-desc' as const, label: 'Nights ↓' },
  { value: 'date-asc' as const, label: 'Date ↑' },
  { value: 'date-desc' as const, label: 'Date ↓' },
  { value: 'drop-desc' as const, label: 'Biggest Drop' },
] as const;

export type SortOptionValue = (typeof SORT_OPTIONS)[number]['value'];

export const BADGE_OPTIONS = [
  { value: 'drop' as const, label: 'Drop Deals' },
  { value: 'solo' as const, label: 'Solo Friendly' },
  { value: 'gold' as const, label: 'Great Value' },
] as const;

export type BadgeOptionValue = (typeof BADGE_OPTIONS)[number]['value'];

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 0] as const;
export const PAGE_SIZE_LABELS: Record<number, string> = { 5: '5', 10: '10', 20: '20', 0: 'All' };

// ============================================================================
// Cabin Type (Room Type) Options
// ============================================================================

export const CABIN_TYPE_OPTIONS = [
  { value: 'Inside' as const, label: 'Inside', icon: 'bed' },
  { value: 'Oceanview' as const, label: 'Ocean View', icon: 'window' },
  { value: 'Balcony' as const, label: 'Balcony', icon: 'waves' },
  { value: 'Suite' as const, label: 'Suite', icon: 'star' },
] as const;

export type CabinTypeValue = (typeof CABIN_TYPE_OPTIONS)[number]['value'];

/**
 * Convert min/max nights state to a NightOptionValue (or null).
 */
export function getNightsOption(minNights?: number, maxNights?: number): NightOptionValue | null {
  if (minNights === undefined && maxNights === undefined) return null;
  if (minNights === 0 && maxNights === 3) return '0-3';
  if (minNights === 4 && maxNights === 7) return '4-7';
  if (minNights === 8) return '8+';
  return null;
}

/**
 * Convert a NightOptionValue back to min/max numbers.
 */
export function getNightsRange(value: NightOptionValue): { min: number; max?: number } {
  const opt = NIGHT_OPTIONS.find((o) => o.value === value);
  if (!opt) return { min: 0 };
  const result: { min: number; max?: number } = { min: opt.min };
  const maybeMax = (opt as { max?: number }).max;
  if (maybeMax !== undefined) result.max = maybeMax;
  return result;
}
