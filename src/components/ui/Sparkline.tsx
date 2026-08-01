"use client";

import { useId } from "react";

interface SparklineProps {
  data: number[];
  positive?: boolean;
  width?: number;
  height?: number;
  /** Accessible label — if omitted, derived from data */
  ariaLabel?: string;
}

export default function Sparkline({ data, positive = true, width = 140, height = 44, ariaLabel }: SparklineProps) {
  // Unique gradient ID per instance — required by SVG spec (id must be unique per document)
  const reactId = useId();
  const gradId = `grad-${positive ? "mint" : "indigo"}-${reactId}`;
  const color = positive ? "#0B6B57" : "#2A44E7";

  // Build accessible label from data if not provided
  const buildLabel = (): string => {
    if (ariaLabel) return ariaLabel;
    if (!data || data.length === 0) return "Price trend: no data available";
    if (data.length < 2) return `Price trend: $${Math.round(data[0])} (single data point)`;
    const start = Math.round(data[0]);
    const end = Math.round(data[data.length - 1]);
    const direction = end < start ? "falling" : end > start ? "rising" : "flat";
    return `Price trend over ${data.length} points: $${start} to $${end} (${direction})`;
  };

  // Guard: single-element or empty data — show explicit placeholder instead of misleading flat line
  if (!data || data.length < 2) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        role="img"
        aria-label={buildLabel()}
      >
        {data && data.length === 1 && (
          <circle cx={width / 2} cy={height / 2} r="3" fill={color} aria-hidden="true" />
        )}
        <text
          x={width / 2}
          y={height / 2 + 4}
          textAnchor="middle"
          fontSize="9"
          fill="#94A3B8"
          fontWeight="500"
          aria-hidden="true"
        >
          {data && data.length === 1 ? "single point" : "no history"}
        </text>
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((val, i) => {
    const x = i * step;
    const y = height - ((val - min) / range) * (height - 6) - 3;
    return [x, y];
  });

  function catmullRomToBezier(pts: {x: number; y: number}[]): string {
    if (pts.length < 2) return '';
    const eps = 0.3;
    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[Math.min(i + 1, pts.length - 1)];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];
      const c1x = p1.x + (p2.x - p0.x) * eps, c1y = p1.y + (p2.y - p0.y) * eps;
      const c2x = p2.x - (p3.x - p1.x) * eps, c2y = p2.y - (p3.y - p1.y) * eps;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d;
  }
  const path = catmullRomToBezier(points.map(p => ({x: p[0], y: p[1]})));
  const areaPath = `${path} L${width},${height} L0,${height} Z`;
  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      role="img"
      aria-label={buildLabel()}
    >
      <title>{buildLabel()}</title>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
    </svg>
  );
}
