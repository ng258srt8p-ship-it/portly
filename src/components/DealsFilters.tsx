'use client';

import { useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import type { DealFilters as FilterState } from '@/types/cruise';

interface DealsFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  availableLines: string[];
  availableDestinations: string[];
  availablePorts: string[];
  availableRegions: string[];
  initiallyExpanded?: boolean;
}

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

const NIGHT_OPTIONS = [
  { value: '0-3', label: '0–3', min: 0, max: 3 },
  { value: '4-7', label: '4–7', min: 4, max: 7 },
  { value: '8-14', label: '8+', min: 8, max: undefined },
] as const;

const BADGE_OPTIONS = [
  { value: 'drop', label: 'Drop Deals' },
  { value: 'solo', label: 'Solo Friendly' },
  { value: 'gold', label: 'Great Value' },
] as const;

function Cbx({
  id,
  checked,
  label,
  onChange,
}: {
  id: string;
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label
      htmlFor={id}
      className="group flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-ink transition hover:bg-black/[0.03] has-[:checked]:bg-indigo/5"
    >
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center rounded border border-black/20 bg-white transition-colors group-has-[:checked]:border-indigo group-has-[:checked]:bg-indigo">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer absolute inset-0 cursor-pointer opacity-0"
        />
        {checked && (
          <svg
            viewBox="0 0 16 16"
            className="h-3 w-3 fill-white"
            aria-hidden="true"
          >
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
          </svg>
        )}
      </span>
      <span>{label}</span>
    </label>
  );
}

export default function DealsFilters({
  filters,
  onChange,
  availableLines,
  availableDestinations,
  availablePorts,
  availableRegions,
  initiallyExpanded,
}: DealsFiltersProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded ?? false);

  const hasActiveFilters =
    filters.cruiseLine?.length ||
    filters.destination?.length ||
    filters.departurePort?.length ||
    filters.departureRegion?.length ||
    filters.minNights !== undefined ||
    filters.maxNights !== undefined ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.badgeType?.length ||
    filters.sort;

  const toggleStr = (
    key: 'cruiseLine' | 'destination' | 'departurePort' | 'departureRegion' | 'badgeType',
    val: string,
  ) => {
    const cur = (filters[key] as string[] | undefined) || [];
    const next = cur.includes(val)
      ? cur.filter((v) => v !== val)
      : [...cur, val];
    onChange({ ...filters, [key]: next.length ? next : undefined });
  };

  const toggleNights = (value: string) => {
    const active =
      (filters.minNights === 0 && filters.maxNights === 3 && value === '0-3') ||
      (filters.minNights === 4 && filters.maxNights === 7 && value === '4-7') ||
      (filters.minNights === 8 && value === '8-14');
    if (active) {
      onChange({ ...filters, minNights: undefined, maxNights: undefined });
    } else {
      const opt = NIGHT_OPTIONS.find((o) => o.value === value);
      if (opt) onChange({ ...filters, minNights: opt.min, maxNights: opt.max });
    }
  };

  const nightsChecked = (v: string) =>
    (filters.minNights === 0 && filters.maxNights === 3 && v === '0-3') ||
    (filters.minNights === 4 && filters.maxNights === 7 && v === '4-7') ||
    (filters.minNights === 8 && v === '8-14');

  const clear = () => {
    onChange({});
    setExpanded(false);
  };

  const Section = ({ label, children, testId }: { label: string; children: React.ReactNode; testId?: string }) => (
    <div className="flex flex-wrap items-center gap-1" data-testid={testId}>
      <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </span>
      {children}
    </div>
  );

  return (
    <div className="mb-6">
      <button
        onClick={() => setExpanded((o) => !o)}
        className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-soft lg:hidden"
      >
        <MaterialIcon name="filter_list" size="sm" />
        {expanded ? 'Hide filters' : 'Show filters'}
        {hasActiveFilters && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo text-[10px] font-bold text-white">
            !
          </span>
        )}
      </button>

      <div
        className={`flex flex-col gap-3 ${expanded ? 'block' : 'hidden lg:block'}`}
      >
        {/* Row 1 — Line + Region + Destination */}
        <div className="flex flex-wrap items-start gap-y-2 gap-x-6">
          {availableLines.length > 1 && (
            <Section label="Line" testId="filter-cruise-line">
              {availableLines.map((l) => (
                <Cbx
                  key={l}
                  id={`l-${l.replace(/\s/g, '-')}`}
                  label={l.replace(' Cruise Line', '').replace(' Cruises', '')}
                  checked={!!filters.cruiseLine?.includes(l)}
                  onChange={() => toggleStr('cruiseLine', l)}
                />
              ))}
            </Section>
          )}

          {availableRegions.length > 1 && (
            <Section label="Region" testId="filter-region">
              {availableRegions.map((r) => (
                <Cbx
                  key={r}
                  id={`reg-${r.replace(/\s/g, '-')}`}
                  label={r}
                  checked={!!filters.departureRegion?.includes(r)}
                  onChange={() => toggleStr('departureRegion', r)}
                />
              ))}
            </Section>
          )}

          {availableDestinations.length > 1 && (
            <Section label="Dest" testId="filter-destination">
              {availableDestinations.map((d) => (
                <Cbx
                  key={d}
                  id={`d-${d.replace(/\s/g, '-')}`}
                  label={d}
                  checked={!!filters.destination?.includes(d)}
                  onChange={() => toggleStr('destination', d)}
                />
              ))}
            </Section>
          )}
        </div>

        {/* Row 2 — Nights + Type + Price + Sort */}
        <div className="flex flex-wrap items-start gap-y-2 gap-x-6">
          <Section label="Nights" testId="filter-nights">
            {NIGHT_OPTIONS.map((o) => (
              <Cbx
                key={o.value}
                id={`n-${o.value}`}
                label={o.label}
                checked={nightsChecked(o.value)}
                onChange={() => toggleNights(o.value)}
              />
            ))}
          </Section>

          <Section label="Type" testId="filter-type">
            {BADGE_OPTIONS.map((o) => (
              <Cbx
                key={o.value}
                id={`t-${o.value}`}
                label={o.label}
                checked={!!filters.badgeType?.includes(o.value as 'drop' | 'solo' | 'gold')}
                onChange={() => toggleStr('badgeType', o.value)}
              />
            ))}
          </Section>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              Price
            </span>
            <input
              type="number"
              placeholder="Min $"
              value={filters.minPrice ?? ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  minPrice: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              className="w-16 rounded-md border border-black/[0.08] px-2 py-1 text-xs font-medium text-ink outline-none transition-colors focus:border-indigo [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              data-testid="filter-price-min"
            />
            <span className="text-xs text-ink-faint">–</span>
            <input
              type="number"
              placeholder="Max $"
              value={filters.maxPrice ?? ''}
              onChange={(e) =>
                onChange({
                  ...filters,
                  maxPrice: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              className="w-16 rounded-md border border-black/[0.08] px-2 py-1 text-xs font-medium text-ink outline-none transition-colors focus:border-indigo [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              data-testid="filter-price-max"
            />

            <select
                          value={filters.sort ?? ''}
                          onChange={(e) =>
                            onChange({ ...filters, sort: (e.target.value || undefined) as FilterState['sort'] })
                          }
                          className="ml-1 appearance-none rounded-md border border-black/[0.08] bg-white px-2.5 py-1 pr-6 text-xs font-medium text-ink outline-none transition-colors focus:border-indigo"
                          style={{
                            backgroundImage:
                              `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 6px center',
                          }}
                          data-testid="filter-sort"
                        >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clear}
              className="flex items-center gap-1 rounded-md border border-coral-ink/15 bg-coral-soft px-2.5 py-1 text-xs font-bold text-coral-ink transition-colors hover:bg-coral-ink hover:text-white"
              data-testid="filter-clear"
            >
              <MaterialIcon name="close" size="xs" />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
