'use client';

import { useState } from 'react';

/* ============================================================
   TRIPTIDE — PriceHistoryPanel Component
   Displays the price history as a sparkline chart and a
   compact snapshot table of all cabin types. Users can click
   any cabin card to switch which cabin type's history is shown.
   ============================================================ */

interface PriceSnapshot {
  recorded_date: string;
  cabin_type: string;
  passenger_count: number;
  total_usd: string;
}

interface CabinBreakdownEntry {
  cabinType: string;
  baseFare: string;
  portFees: string;
  gratuities: string;
  total: string;
  perPersonPerDay: string;
  raw: {
    totalOutTheDoor: number;
    perPersonPerDay: number;
    soloSupplementPercent: number;
    soloSupplementApplied: boolean;
    totalPassengers: number;
  };
}

interface PriceHistoryPanelProps {
  priceHistory: PriceSnapshot[];
  currentPrice: number;
  cabinBreakdown?: CabinBreakdownEntry[];
}

function SparklineChart({ data, cabinType }: { data: number[]; cabinType?: string }) {
  if (data.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-ink-soft">
        More data collection needed. Sync again to build history.
      </div>
    );
  }

  const w = 400;
  const h = 80;
  const pad = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const positive = data[data.length - 1] >= data[0];

  const pts = data.map((v, i) => {
    const x = i * step;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });

  const path = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${path} L${w},${h} L0,${h} Z`;
  const color = positive ? '#0B6B57' : '#2A44E7';
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-h-24" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`hist-grad-${positive ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#hist-grad-${positive ? 'up' : 'down'})`} stroke="none" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="4" fill={color} />
    </svg>
  );
}

/** Format a raw price (number) for display in the cabin table */
function fmtPrice(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

export default function PriceHistoryPanel({
  priceHistory,
  currentPrice,
  cabinBreakdown,
}: PriceHistoryPanelProps) {
  if (!priceHistory || priceHistory.length === 0) {
    return (
      <div className="rounded-3xl border border-black/[0.05] bg-white p-6 shadow-float">
        <h2 className="mb-4 font-display text-2xl font-bold text-ink">Price History</h2>
        <p className="text-ink-soft">No price history recorded yet. Each sync adds data points.</p>
      </div>
    );
  }

  // --- Determine available cabin types from the full (now unfiltered) history ---
  const cabinTypesSet = new Set(priceHistory.map((s) => s.cabin_type));
  const cabinTypes = [...cabinTypesSet];

  // Default to the cheapest cabin type from cabinBreakdown, or first available
  const cheapestCabinType =
    (cabinBreakdown && cabinBreakdown.length > 0
      ? cabinBreakdown[0].cabinType
      : cabinTypes[0]) || '';

  const [selectedCabinType, setSelectedCabinType] = useState<string>(cheapestCabinType);

  // --- Sparkline: filter data to the selected cabin type ---
  const sorted = [...priceHistory]
    .filter((s) => s.cabin_type === selectedCabinType)
    .sort((a, b) => new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime());
  const sparkValues = sorted.map((s) => parseFloat(s.total_usd)).filter((v) => !isNaN(v));

  // --- Cabin price table: use cabinBreakdown if available, otherwise extract from priceHistory ---
  let cabinRows: { label: string; price: string }[];
  if (cabinBreakdown && cabinBreakdown.length > 0) {
    cabinRows = cabinBreakdown.map((cb) => ({
      label: cb.cabinType,
      price: fmtPrice(cb.raw.totalOutTheDoor),
    }));
  } else {
    // Fallback: de-duplicate cabin types from price history
    const seen = new Set<string>();
    cabinRows = [];
    for (const snap of priceHistory) {
      const key = snap.cabin_type;
      if (!seen.has(key)) {
        seen.add(key);
        cabinRows.push({ label: key, price: `$${Math.round(parseFloat(snap.total_usd)).toLocaleString()}` });
      }
    }
  }

  return (
    <div className="rounded-3xl border border-black/[0.05] bg-white p-6 shadow-float">
      <h2 className="mb-2 font-display text-2xl font-bold text-ink">Price History</h2>
      <p className="mb-6 text-sm text-ink-soft">
        90-day trend for <strong>{selectedCabinType}</strong>
        {cabinRows.length > 1 && (
          <span className="ml-1 text-ink-faint/60">
            · click a cabin below to switch
          </span>
        )}
      </p>

      {/* Sparkline */}
      <div className="rounded-2xl bg-canvas p-4">
        <SparklineChart data={sparkValues} cabinType={selectedCabinType} />
        {sorted.length > 0 && (
          <div className="mt-2 flex justify-between text-xs text-ink-faint/60">
            <span>{new Date(sorted[0].recorded_date).toLocaleDateString()}</span>
            <span>{new Date(sorted[sorted.length - 1].recorded_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Cabin price snapshot table — now clickable */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cabinRows.map((row) => {
          const isSelected = row.label === selectedCabinType;
          return (
            <button
              key={row.label}
              type="button"
              onClick={() => setSelectedCabinType(row.label)}
              className={`rounded-xl border p-3 text-left transition-all ${
                isSelected
                  ? 'border-mint-ink/20 bg-mint-soft ring-1 ring-mint-ink/20'
                  : 'border-black/[0.04] bg-canvas hover:border-black/[0.12] hover:bg-black/[0.02] active:scale-[0.97]'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{row.label}</p>
              <p className="font-mono-tab text-lg font-bold text-ink">{row.price}</p>
              {isSelected && (
                <p className="text-[10px] font-medium text-mint-ink">Trend shown</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
