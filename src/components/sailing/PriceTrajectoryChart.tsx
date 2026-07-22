'use client';

/**
 * TripTide — PriceTrajectoryChart Component (Phase 3)
 * 
 * SVG-based interactive chart showing price trajectories for all cabin types.
 * No external charting library needed — pure SVG + React.
 * 
 * Shows:
 *   - Current price for each cabin type
 *   - 7-day forecast point
 *   - 30-day forecast point  
 *   - Confidence bands (dashed areas)
 *   - Color-coded cabin type lines
 */

import type { CabinForecast } from '@/types/enhancedAnalytics';

interface PriceTrajectoryChartProps {
  cabinForecasts: CabinForecast[];
}

const CHART_CONFIG = {
  width: 700,
  height: 280,
  padding: { top: 20, right: 20, bottom: 40, left: 70 },
  yTicks: 6,
};

const cabinColors: Record<string, string> = {
  Inside: '#64748b',    // slate-500
  Oceanview: '#3b82f6', // blue-500
  Balcony: '#6366f1',   // indigo-500
  Suite: '#f59e0b',     // amber-500
};

const cabinFillColors: Record<string, string> = {
  Inside: 'rgba(100, 116, 139, 0.08)',
  Oceanview: 'rgba(59, 130, 246, 0.08)',
  Balcony: 'rgba(99, 102, 241, 0.08)',
  Suite: 'rgba(245, 158, 11, 0.08)',
};

export default function PriceTrajectoryChart({ cabinForecasts }: PriceTrajectoryChartProps) {
  if (!cabinForecasts || cabinForecasts.length === 0) return null;

  const { width, height, padding } = CHART_CONFIG;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Find min/max prices across all data points
  const allPrices = cabinForecasts.flatMap(cf => [
    cf.currentPrice, cf.forecast7d, cf.forecast30d,
  ]);
  const minPrice = Math.floor(Math.min(...allPrices) * 0.95);
  const maxPrice = Math.ceil(Math.max(...allPrices) * 1.05);
  const priceRange = maxPrice - minPrice || 1;

  // Scale functions
  const scaleX = (x: number) => padding.left + (x / 2) * chartWidth; // 0=current, 1=7d, 2=30d
  const scaleY = (price: number) => padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

  // Y-axis ticks
  const yTicks: number[] = [];
  for (let i = 0; i <= CHART_CONFIG.yTicks; i++) {
    yTicks.push(minPrice + (priceRange * i) / CHART_CONFIG.yTicks);
  }

  // Build path data for each cabin type
  const buildPath = (cf: CabinForecast, points: { x: number; y: number }[]) => {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  // Build confidence band polygons (7d to 30d range)
  const buildConfidenceBand = (cf: CabinForecast) => {
    const currentX = scaleX(0);
    const forecast7dX = scaleX(1);
    const forecast30dX = scaleX(2);

    const currentY = scaleY(cf.currentPrice);
    const forecast7dY = scaleY(cf.forecast7d);
    const forecast30dY = scaleY(cf.forecast30d);

    // Confidence band: area between 7d and 30d forecast
    const lowerPrice = Math.min(cf.forecast7d, cf.forecast30d);
    const upperPrice = Math.max(cf.forecast7d, cf.forecast30d);
    const lowerY = scaleY(upperPrice); // Inverted: higher price = lower y
    const upperY = scaleY(lowerPrice);

    return (
      <polygon
        points={`${forecast7dX},${lowerY} ${forecast30dX},${lowerY} ${forecast30dX},${upperY} ${forecast7dX},${upperY}`}
        fill={cabinFillColors[cf.cabinType] || 'rgba(0,0,0,0.05)'}
        stroke="none"
      />
    );
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto min-w-[300px]"
        data-testid="price-trajectory-svg"
        role="img"
        aria-label="Price trajectory chart showing current, 7-day, and 30-day forecasts for each cabin type"
      >
        {/* Background */}
        <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} fill="rgba(0,0,0,0.02)" rx="4" />

        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick, i) => {
          const y = scaleY(tick);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-500"
                fontFamily="system-ui"
              >
                ${Math.round(tick).toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {['Now', '7 Days', '30 Days'].map((label, i) => (
          <text
            key={label}
            x={scaleX(i)}
            y={height - 8}
            textAnchor="middle"
            className="text-[11px] fill-slate-500"
            fontFamily="system-ui"
          >
            {label}
          </text>
        ))}

        {/* Confidence bands (behind lines) */}
        {cabinForecasts.map(cf => (
          <g key={`band-${cf.cabinType}`}>
            {buildConfidenceBand(cf)}
          </g>
        ))}

        {/* Price trajectory lines */}
        {cabinForecasts.map(cf => {
          const points = [
            { x: scaleX(0), y: scaleY(cf.currentPrice) },
            { x: scaleX(1), y: scaleY(cf.forecast7d) },
            { x: scaleX(2), y: scaleY(cf.forecast30d) },
          ];
          const path = buildPath(cf, points);
          const color = cabinColors[cf.cabinType] || '#94a3b8';

          return (
            <g key={`line-${cf.cabinType}`}>
              {/* Line */}
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Data points */}
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={i === 0 ? 4 : 3}
                  fill={color}
                  stroke="white"
                  strokeWidth="1.5"
                />
              ))}
              {/* Labels for 30-day point */}
              <text
                x={scaleX(2) + 6}
                y={scaleY(cf.forecast30d) - 6}
                className="text-[9px] font-medium"
                fill={color}
                fontFamily="system-ui"
              >
                ${cf.forecast30d.toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${padding.left}, ${height - 16})`}>
          {cabinForecasts.map((cf, i) => (
            <g key={`legend-${cf.cabinType}`} transform={`translate(${i * 90}, 0)`}>
              <circle cx={8} cy={0} r={4} fill={cabinColors[cf.cabinType] || '#94a3b8'} />
              <text x={16} y={4} className="text-[10px]" fill="#475569" fontFamily="system-ui">
                {cf.cabinType}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
