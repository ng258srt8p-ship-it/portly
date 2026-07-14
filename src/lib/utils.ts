import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency (USD default)
 */
export function formatPrice(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a date string for display
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calculate per-person-per-night pricing
 */
export function calcPerPersonPerNight(
  total: number,
  passengers: number,
  nights: number
): number {
  return total / passengers / nights;
}

/**
 * Determine deal rating label and color class
 */
export function getDealRating(
  pricePerDay: number,
  avgPricePerDay: number
): { icon: string; label: string; className: string } {
  const ratio = pricePerDay / avgPricePerDay;
  if (ratio <= 0.7) return { icon: 'local_fire_department', label: 'Hot Deal', className: 'badge-hot' };
  if (ratio <= 0.85) return { icon: 'monetization_on', label: 'Great Value', className: 'badge-great' };
  if (ratio <= 1.0) return { icon: 'thumb_up', label: 'Good Deal', className: 'badge-good' };
  if (ratio <= 1.15) return { icon: '', label: 'Average', className: 'badge-average' };
  return { icon: '', label: 'Below Avg', className: 'badge-average' };
}
