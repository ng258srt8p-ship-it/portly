'use client';

/* ============================================================
   TRIPTIDE — NimPriceForecast Component
   AI-powered price forecast fetched from the existing
   GET /api/analytics/price-forecast/:sailingId endpoint.
   Shows loading skeleton, error state, or rendered markdown.
   ============================================================ */

import { useEffect, useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';

interface NimPriceForecastProps {
  sailingId: number;
}

export default function NimPriceForecast({ sailingId }: NimPriceForecastProps) {
  const [forecast, setForecast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/analytics/price-forecast/${sailingId}`,
          { cache: 'no-store' }
        );
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const raw = await res.text();
        // API returns { success: true, data: "<markdown>" }
        const parsed = raw.startsWith('{') ? JSON.parse(raw) : { data: raw };
        const text = parsed.data || raw;
        if (!cancelled) {
          setForecast(text);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [sailingId]);

  return (
    <div className="rounded-3xl border border-black/[0.05] bg-white p-6 shadow-float">
      <div className="mb-4 flex items-center gap-2">
        <MaterialIcon name="travel_explore" size="lg" />
        <h2 className="font-display text-2xl font-bold text-ink">Price Forecast</h2>
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-black/[0.06]" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-black/[0.06]" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-black/[0.06]" />
          <p className="mt-2 text-xs text-ink-faint/60">AI forecast in progress...</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-coral-ink/15 bg-coral-soft p-4">
          <p className="text-sm text-coral-ink">Forecast unavailable: {error}</p>
        </div>
      )}

      {forecast && !loading && (
        <div className="prose prose-sm max-w-none prose-headings:text-ink prose-p:text-ink-soft prose-strong:text-ink">
          {forecast.split('\n').map((line, i) => {
            if (line.startsWith('**') && line.endsWith('**')) {
              return (
                <p key={i} className="mt-3 mb-1 text-sm font-bold text-ink first:mt-0">
                  {line.replace(/\*\*/g, '')}
                </p>
              );
            }
            if (line.startsWith('- ')) {
              return (
                <p key={i} className="ml-3 text-sm text-ink-soft">
                  &bull; {line.slice(2)}
                </p>
              );
            }
            if (line.trim() === '') return <br key={i} />;
            return <p key={i} className="text-sm text-ink-soft">{line}</p>;
          })}
        </div>
      )}
    </div>
  );
}
