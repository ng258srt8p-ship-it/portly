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
  /** Upgrade multiplier over Inside (e.g. Balcony=1.35, Suite=1.75) — used
   *  to synthesize price-history lines for cabin tiers without their own
   *  history rows. Frontend falls back to multiplying Inside history. */
  multiplier?: number;
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

function SparklineChart({ data, dates, cabinType }: { data: number[]; dates: string[]; cabinType?: string }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-ink-soft">
        More data collection needed. Sync again to build history.
      </div>
    );
  }

  // ── Sleeker dimensions: smaller viewBox + tighter padding ──
  const w = 480;
  const h = 110;
  const padLeft = 44;
  const padRight = 12;
  const padTop = 14;
  const padBottom = 26;
  // Extra buffer zone below chart area for tooltip rendering — prevents clipping at peak data points
  const tooltipBuffer = 48;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;
  const totalH = h + tooltipBuffer;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = chartW / (data.length - 1);
  // Phase 3: inverted color logic — falling prices (good for buyer) = mint, rising = coral
  const isFalling = data[data.length - 1] < data[0];

  const pts = data.map((v, i) => ({
    x: padLeft + i * step,
    y: padTop + chartH - ((v - min) / range) * chartH,
  }));

  // Generate smooth cubic bezier path through points (Catmull-Rom spline)
  function catmullRomToBezier(points: { x: number; y: number }[]): string {
    if (points.length < 2) return '';
    const eps = 0.4; // tension factor - lower = smoother
    let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[Math.min(i + 1, points.length - 1)];
      const p3 = points[Math.min(i + 2, points.length - 1)];

      const cp1x = p1.x + (p2.x - p0.x) * eps;
      const cp1y = p1.y + (p2.y - p0.y) * eps;
      const cp2x = p2.x - (p3.x - p1.x) * eps;
      const cp2y = p2.y - (p3.y - p1.y) * eps;

      d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }

  const linePath = catmullRomToBezier(pts);
  const areaPath = `${linePath} L${padLeft + chartW},${padTop + chartH} L${padLeft},${padTop + chartH} Z`;
  // Phase 3: inverted color logic — mint for falling (good), coral for rising (warning)
  const color = isFalling ? '#0B6B57' : '#E76E50';
  const hoverColor = isFalling ? '#065F46' : '#B8442A';

  // Y-axis: only 3 labels (min / median / max) — was 5
  const yMin = Math.floor(min / 100) * 100;
  const yMax = Math.ceil(max / 100) * 100;
  const yMid = Math.round((yMin + yMax) / 2);
  const yLabels: { label: string; y: number }[] = [
    { label: '$' + yMin.toLocaleString(), y: padTop + chartH - ((yMin - min) / range) * chartH },
    { label: '$' + yMid.toLocaleString(), y: padTop + chartH - ((yMid - min) / range) * chartH },
    { label: '$' + yMax.toLocaleString(), y: padTop + chartH - ((yMax - min) / range) * chartH },
  ];

  // X-axis: only 3 labels (first / middle / last) — was 5
  const xLabelIndices = data.length <= 3
    ? data.map((_, i) => i)
    : [0, Math.floor((data.length - 1) / 2), data.length - 1];
  const xLabels: { date: string; x: number }[] = xLabelIndices.map((i) => ({
    date: dates[i] ? new Date(dates[i]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
    x: padLeft + i * step,
  }));

  // Tooltip positioning — render BELOW data point with buffer to avoid top-edge clipping
  const tooltipX = hoveredIdx !== null ? pts[hoveredIdx].x : -100;
  const tooltipY = hoveredIdx !== null ? pts[hoveredIdx].y + tooltipBuffer : -100;
  const tooltipDate = hoveredIdx !== null && dates[hoveredIdx]
    ? new Date(dates[hoveredIdx]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  return (
    <svg viewBox={`0 0 ${w} ${totalH}`} className="mx-auto w-full max-w-2xl" preserveAspectRatio="xMidYMid meet" data-testid="price-history-chart">
      <defs>
        <linearGradient id={`hist-grad-${isFalling ? 'fall' : 'rise'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id="tooltip-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15" />
        </filter>
      </defs>
      {/* Grid lines */}
      {yLabels.map((yl, i) => (
        <line key={`grid-${i}`} x1={padLeft} y1={yl.y} x2={padLeft + chartW} y2={yl.y} stroke="#000" strokeOpacity="0.06" strokeWidth="1" />
      ))}
      {/* Area fill */}
      <path d={areaPath} fill={`url(#hist-grad-${isFalling ? 'fall' : 'rise'})`} stroke="none" />
      {/* Smooth curve line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      {/* Invisible hover targets + data points */}
      {pts.map((pt, i) => (
        <g key={i}>
          {/* Larger invisible hit area for easier hovering */}
          <rect
            x={pt.x - step / 2}
            y={padTop}
            width={step}
            height={chartH}
            fill="transparent"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            className="cursor-crosshair"
          />
          {/* Visible data point - larger when hovered */}
          <circle
            cx={pt.x}
            cy={pt.y}
            r={hoveredIdx === i ? 4 : 2.5}
            fill={hoveredIdx === i ? hoverColor : color}
            className="transition-all"
            pointerEvents="none"
          />
          {/* Vertical hover guide line */}
          {hoveredIdx === i && (
            <line
              x1={pt.x}
              y1={padTop}
              x2={pt.x}
              y2={padTop + chartH}
              stroke={color}
              strokeOpacity="0.2"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          )}
        </g>
      ))}
      {/* Tooltip */}
      {hoveredIdx !== null && (
        <g filter="url(#tooltip-shadow)">
          <rect
            x={tooltipX - 42}
            y={tooltipY - 12}
            width="84"
            height="28"
            rx="4"
            fill="white"
            stroke="#E5E7EB"
            strokeWidth="1"
          />
          <text
            x={tooltipX}
            y={tooltipY + 1}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill={hoverColor}
          >
            ${Math.round(data[hoveredIdx]).toLocaleString()}
          </text>
          <text
            x={tooltipX}
            y={tooltipY + 14}
            textAnchor="middle"
            fontSize="9"
            fill="#6B7280"
          >
            {tooltipDate}
          </text>
        </g>
      )}
      {/* Y-axis labels */}
      {yLabels.map((yl, i) => (
        <text key={`yl-${i}`} x={padLeft - 8} y={yl.y + 3} textAnchor="end" fontSize="10" fill="#94A3B8" fontWeight="500">
          {yl.label}
      </text>
      ))}
      {/* X-axis labels */}
      {xLabels.map((xl, i) => (
        <text key={`xl-${i}`} x={xl.x} y={h - 8} textAnchor="middle" fontSize="10" fill="#94A3B8" fontWeight="500">
          {xl.date}
      </text>
      ))}
   </svg>
  );
}
function fmtPrice(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

export default function PriceHistoryPanel({
  priceHistory,
  currentPrice,
  cabinBreakdown,
}: PriceHistoryPanelProps) {
  const [selectedCabinType, setSelectedCabinType] = useState<string>(() => {
    const cabinTypesSet = new Set(priceHistory.map((s) => s.cabin_type));
    const cabinTypes = [...cabinTypesSet];
    return (cabinBreakdown && cabinBreakdown.length > 0
      ? cabinBreakdown[0].cabinType
      : cabinTypes[0]) || '';
  });

  if (!priceHistory || priceHistory.length === 0) {
    return (
      <div className="rounded-3xl border border-black/[0.05] bg-white p-4 shadow-float">
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

  // --- Sparkline: filter to selected cabin type + standard 2-passenger count ---
  // When no history rows exist for the selected cabin tier, fall back to
  // Inside history scaled by the tier's multiplier (from cabinBreakdown).
  // This ensures every cabin button produces a real chart, not an empty state.
  const insideHistory = [...priceHistory]
    .filter((s) => s.cabin_type === 'Inside' && Number(s.passenger_count) === 2)
    .sort((a, b) => new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime());

  const selectedMultiplier = (cabinBreakdown ?? []).find(
    (cb: any) => (cb.cabinType || cb.cabin_type) === selectedCabinType
  )?.multiplier ?? 1.0;

  const directSorted = [...priceHistory]
    .filter((s) => s.cabin_type === selectedCabinType && Number(s.passenger_count) === 2)
    .sort((a, b) => new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime());
  const usingSynthesis = directSorted.length < 2 && insideHistory.length >= 2 && selectedMultiplier !== 1.0;
  const sorted = usingSynthesis
    ? insideHistory.map((s) => ({
        ...s,
        total_usd: String(Math.round(parseFloat(s.total_usd) * selectedMultiplier)),
        cabin_type: selectedCabinType,
      }))
    : directSorted;
  const sparkValues = sorted.map((s) => parseFloat(s.total_usd)).filter((v) => !isNaN(v));

  // --- Cabin price table: use cabinBreakdown if available, otherwise extract from priceHistory ---
  let cabinRows: { label: string; price: string }[];
  if (cabinBreakdown && cabinBreakdown.length > 0 && cabinBreakdown.some((cb: any) => (cb.raw?.totalOutTheDoor ?? cb.totalOutTheDoor ?? 0) > 0)) {
    cabinRows = cabinBreakdown.map((cb: any) => ({
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
    <div className="rounded-3xl border border-black/[0.05] bg-white p-4 shadow-float">
      <h2 className="mb-2 font-display text-2xl font-bold text-ink">Price History</h2>
      <p className="mb-4 text-sm text-ink-soft">
        90-day trend for <strong>{selectedCabinType}</strong>
        {cabinRows.length > 1 && (
          <span className="ml-1 text-ink-faint/60">
            · click a cabin below to switch
          </span>
        )}
      </p>

      {/* Sparkline */}
      <div className="rounded-2xl bg-canvas p-4">
        <SparklineChart
          data={sparkValues}
          dates={sorted.map((s) => s.recorded_date)}
          cabinType={selectedCabinType}
        />
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
