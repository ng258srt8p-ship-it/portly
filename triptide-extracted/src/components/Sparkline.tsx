interface SparklineProps {
  data: number[];
  positive?: boolean;
  width?: number;
  height?: number;
}

export default function Sparkline({ data, positive = true, width = 140, height = 44 }: SparklineProps) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((val, i) => {
    const x = i * step;
    const y = height - ((val - min) / range) * (height - 6) - 3;
    return [x, y];
  });

  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${width},${height} L0,${height} Z`;
  const color = positive ? "#0B6B57" : "#2A44E7";
  const last = points[points.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${positive ? "mint" : "indigo"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${positive ? "mint" : "indigo"})`} stroke="none" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill={color} />
    </svg>
  );
}
