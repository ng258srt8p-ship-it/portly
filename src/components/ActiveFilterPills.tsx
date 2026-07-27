'use client';

import MaterialIcon from '@/components/ui/MaterialIcon';
import type { DealFilters } from '@/types/cruise';

interface ActiveFilterPillsProps {
  filters: DealFilters;
  onChange: (filters: DealFilters) => void;
  onReset: () => void;
}

interface Pill {
  label: string;
  remove: () => void;
}

/**
 * Active filter tag pills — render one pill per selected value (or range
 * pair) with an X to remove. Each pill removes just that one filter.
 *
 * Renders nothing when no filters are active so it doesn't add visual noise.
 */
export default function ActiveFilterPills({ filters, onChange, onReset }: ActiveFilterPillsProps) {
  const pills: Pill[] = [];

  (filters.cruiseLine || []).forEach((v) => {
    pills.push({
      label: `Line: ${v}`,
      remove: () =>
        onChange({
          ...filters,
          cruiseLine: (filters.cruiseLine || []).filter((x) => x !== v),
        }),
    });
  });

  (filters.destination || []).forEach((v) => {
    pills.push({
      label: `Dest: ${v}`,
      remove: () =>
        onChange({
          ...filters,
          destination: (filters.destination || []).filter((x) => x !== v),
        }),
    });
  });

  (filters.departurePort || []).forEach((v) => {
    pills.push({
      label: `Port: ${v}`,
      remove: () =>
        onChange({
          ...filters,
          departurePort: (filters.departurePort || []).filter((x) => x !== v),
        }),
    });
  });

  (filters.departureRegion || []).forEach((v) => {
    pills.push({
      label: `Region: ${v}`,
      remove: () =>
        onChange({
          ...filters,
          departureRegion: (filters.departureRegion || []).filter((x) => x !== v),
        }),
    });
  });

  (filters.ship || []).forEach((v) => {
    pills.push({
      label: `Ship: ${v}`,
      remove: () =>
        onChange({
          ...filters,
          ship: (filters.ship || []).filter((x) => x !== v),
        }),
    });
  });

  if (filters.minNights !== undefined || filters.maxNights !== undefined) {
    const lo = filters.minNights ?? 0;
    const hi = filters.maxNights ?? '∞';
    pills.push({
      label: `Nights: ${lo}–${hi}`,
      remove: () => {
        const next = { ...filters };
        delete next.minNights;
        delete next.maxNights;
        onChange(next);
      },
    });
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const lo = filters.minPrice ?? 0;
    const hi = filters.maxPrice ?? '∞';
    pills.push({
      label: `Price: $${lo}–$${hi}`,
      remove: () => {
        const next = { ...filters };
        delete next.minPrice;
        delete next.maxPrice;
        onChange(next);
      },
    });
  }

  (filters.badgeType || []).forEach((v) => {
    pills.push({
      label: `Type: ${v}`,
      remove: () =>
        onChange({
          ...filters,
          badgeType: (filters.badgeType || []).filter((x) => x !== v),
        }),
    });
  });

  if (filters.sort) {
    pills.push({
      label: `Sort: ${filters.sort}`,
      remove: () => {
        const next = { ...filters };
        delete next.sort;
        onChange(next);
      },
    });
  }

  if (pills.length === 0) return null;

  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-2"
      data-testid="active-filter-pills"
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        Active filters
      </span>
      {pills.map((p, idx) => (
        <span
          key={`${p.label}-${idx}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-indigo/15 bg-indigo/[0.04] px-3 py-1 text-xs font-bold text-indigo"
        >
          {p.label}
          <button
            type="button"
            aria-label={`Remove filter ${p.label}`}
            data-testid={`remove-pill-${idx}`}
            onClick={p.remove}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-indigo/10 text-indigo transition-colors hover:bg-indigo hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50"
          >
            <MaterialIcon name="close" size="xs" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onReset}
        data-testid="clear-all-filters"
        className="ml-1 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50"
      >
        <MaterialIcon name="backspace" size="xs" />
        Clear all
      </button>
    </div>
  );
}
