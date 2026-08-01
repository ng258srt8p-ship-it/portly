'use client';

/**
 * TripTide — EnhancedPriceForecast Component (Phase 3)
 * 
 * Renders per-cabin-type price forecasts with:
 *   - Individual forecasts for Inside, Oceanview, Balcony, Suite
 *   - Confidence intervals (not single numbers)
 *   - Competing sailing comparisons (same route, different ships)
 *   - Optimal booking window (sailing-specific)
 *   - Price drop alert triggers
 * 
 * Fetches from /api/enhanced/price-forecast/:sailingId
 */

import { useEffect, useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import PriceTrajectoryChart from './PriceTrajectoryChart';
import { cleanText } from '@/utils/text';
import type { PriceForecastOutput, CabinForecast, CompetingSailingData, PriceAlert } from '@/types/enhancedAnalytics';

interface EnhancedPriceForecastProps {
  sailingId: string | number;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ConfidenceBar({ confidence }: { confidence: number }) {
  const width = Math.round(confidence * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-ink-faint/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            confidence >= 0.7 ? 'bg-emerald-500' :
            confidence >= 0.5 ? 'bg-amber-500' : 'bg-coral'
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className={`text-xs font-medium tabular-nums ${
        confidence >= 0.7 ? 'text-emerald-600' :
        confidence >= 0.5 ? 'text-amber-600' : 'text-coral'
      }`}>
        {Math.round(confidence * 100)}%
      </span>
    </div>
  );
}

function CabinForecastCard({ forecast }: { forecast: CabinForecast }) {
  const isRising = forecast.trend === 'rising';
  const isFalling = forecast.trend === 'falling';

  const priceChange7d = ((forecast.forecast7d - forecast.currentPrice) / forecast.currentPrice * 100);
  const priceChange30d = ((forecast.forecast30d - forecast.currentPrice) / forecast.currentPrice * 100);

  const cabinColors: Record<string, string> = {
    Inside: 'border-slate-400 bg-white',
    Oceanview: 'border-blue-400 bg-white',
    Balcony: 'border-indigo-400 bg-white',
    Suite: 'border-amber-400 bg-white',
  };

  return (
    <div
      data-testid={`cabin-forecast-${forecast.cabinType.toLowerCase()}`}
      className={`rounded-xl border-2 p-3 ${cabinColors[forecast.cabinType] || 'border-gray-300 bg-gray-50'}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-bold text-ink">{forecast.cabinType}</h4>
        <span className={`text-xs font-semibold uppercase tabular-nums ${
          isRising ? 'text-coral' : isFalling ? 'text-emerald-600' : 'text-ink-faint'
        }`}>
          {forecast.trend}
        </span>
      </div>

      <div className="space-y-1.5">
        {/* Current price */}
        <div className="flex justify-between text-sm">
          <span className="text-ink-faint">Current</span>
          <span className="font-bold text-ink tabular-nums">
            ${forecast.currentPrice.toLocaleString()}
          </span>
        </div>

        {/* 7-day forecast */}
        <div className="flex justify-between text-sm">
          <span className="text-ink-faint">7-Day Forecast</span>
          <span className={`font-medium tabular-nums ${isRising ? 'text-coral' : isFalling ? 'text-emerald-600' : 'text-ink-soft'}`}>
            ${forecast.forecast7d.toLocaleString()}
          </span>
        </div>

        {/* 30-day forecast */}
        <div className="flex justify-between text-sm">
          <span className="text-ink-faint">30-Day Forecast</span>
          <span className={`font-medium tabular-nums ${isRising ? 'text-coral' : isFalling ? 'text-emerald-600' : 'text-ink-soft'}`}>
            ${forecast.forecast30d.toLocaleString()}
          </span>
        </div>

        {/* Confidence interval */}
        <div className="pt-1.5">
          <div className="flex items-center justify-between text-xs text-ink-faint mb-1">
            <span>Confidence</span>
            <span className="tabular-nums">{Math.round(forecast.confidence * 100)}%</span>
          </div>
          <ConfidenceBar confidence={forecast.confidence} />
        </div>

        {/* Price change indicators */}
        <div className="flex justify-between text-xs tabular-nums">
          <span className={priceChange7d > 0 ? 'text-coral' : priceChange7d < 0 ? 'text-emerald-600' : 'text-ink-faint'}>
            7d: {priceChange7d > 0 ? '+' : ''}{priceChange7d.toFixed(1)}%
          </span>
          <span className={priceChange30d > 0 ? 'text-coral' : priceChange30d < 0 ? 'text-emerald-600' : 'text-ink-faint'}>
            30d: {priceChange30d > 0 ? '+' : ''}{priceChange30d.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function EnhancedPriceForecast({ sailingId }: EnhancedPriceForecastProps) {
  const [data, setData] = useState<PriceForecastOutput | null>(null);
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
          `${API_BASE}/api/enhanced/price-forecast/${sailingId}`,
          { cache: 'no-store' }
        );
        if (!res.ok) {
          const msgs: Record<number, string> = {
            404: 'This sailing does not have an enhanced forecast available yet.',
            500: 'We encountered an issue. Please try again later.',
          };
          throw new Error(msgs[res.status] || `Error ${res.status}`);
        }

        const json = await res.json();
        if (!cancelled) {
          setData(json.data);
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message.includes('Failed:') ? 'Forecast will be available after the next sync cycle.' : err.message);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [sailingId]);

  /* --- Loading skeleton (matches final dimensions) --- */
  if (loading) {
    return (
      <div data-testid="enhanced-price-forecast" className="rounded-3xl border border-black/[0.05] bg-white p-4 shadow-float">
        <div className="mb-5 flex items-center gap-2">
          <MaterialIcon name="trending_up" size="lg" />
          <h2 className="font-display text-2xl font-bold text-ink">Price Forecast</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {['Inside', 'Oceanview', 'Balcony', 'Suite'].map(c => (
              <div key={c} className="h-40 rounded-xl bg-black/[0.04] animate-pulse" />
            ))}
          </div>
          <div className="h-20 rounded-xl bg-black/[0.04] animate-pulse" />
          <div className="h-28 rounded-xl bg-black/[0.04] animate-pulse" />
          <p className="mt-2 text-xs text-ink-faint/60">Generating per-cabin price forecasts...</p>
        </div>
      </div>
    );
  }

  /* --- Error state --- */
  if (error) {
    return (
      <div data-testid="enhanced-price-forecast" className="rounded-3xl border border-black/[0.05] bg-white p-4 shadow-float">
        <div className="mb-4 flex items-center gap-2">
          <MaterialIcon name="trending_up" size="lg" />
          <h2 className="font-display text-2xl font-bold text-ink">Price Forecast</h2>
        </div>
        <div data-testid="forecast-error" className="rounded-xl border border-coral-ink/15 bg-coral-soft p-4">
          <div className="flex items-start gap-2">
            <MaterialIcon name="error_outline" size="sm" />
            <div>
              <p className="text-sm font-medium text-coral-ink">Forecast unavailable</p>
              <p className="mt-1 text-xs text-coral-ink/60">{error}</p>
              <p className="mt-2 text-xs text-coral-ink/50">
                Enhanced forecasts are generated automatically every 4 hours during sync cycles.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* --- No data --- */
  if (!data) {
    return (
      <div data-testid="enhanced-price-forecast" className="rounded-3xl border border-black/[0.05] bg-white p-4 shadow-float">
        <div className="mb-4 flex items-center gap-2">
          <MaterialIcon name="trending_up" size="lg" />
          <h2 className="font-display text-2xl font-bold text-ink">Price Forecast</h2>
        </div>
        <div className="rounded-xl border border-indigo/10 bg-indigo-mist/50 p-4">
          <div className="flex items-start gap-2">
            <MaterialIcon name="schedule" size="sm" />
            <div>
              <p className="text-sm font-medium text-indigo-dark">Enhanced forecast coming on next sync cycle</p>
              <p className="mt-1 text-xs text-ink-soft leading-relaxed">
                Per-cabin price forecasts with confidence intervals and competing sailing comparisons are generated automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* --- Main render — all dimensions --- */
  return (
    <div data-testid="enhanced-price-forecast" className="rounded-3xl border border-black/[0.05] bg-white p-4 shadow-float space-y-3">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MaterialIcon name="trending_up" size="lg" />
          <h2 className="font-display text-2xl font-bold text-ink">Price Forecast</h2>
        </div>
        {data.is_heuristic && (
          <span className="inline-flex items-center gap-1 rounded-full bg-ink-faint/10 px-2.5 py-0.5 text-xs font-medium text-ink-soft">
            <MaterialIcon name="calculate" size="xs" />
            Heuristic Estimate
          </span>
        )}
      </div>

      {/* Per-Cabin Forecasts Grid */}
      {data.cabinForecasts && data.cabinForecasts.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="cabin-forecasts-grid">
          {data.cabinForecasts.map(forecast => (
            <CabinForecastCard key={forecast.cabinType} forecast={forecast} />
          ))}
        </div>
      )}

      {/* Price Trajectory Chart */}
      {data.cabinForecasts && data.cabinForecasts.length > 0 && (
        <div data-testid="price-trajectory-chart">
          <PriceTrajectoryChart cabinForecasts={data.cabinForecasts} />
        </div>
      )}

      {/* Trend Context (NEW) */}
      {data.trendContext && data.trendContext.windows && data.trendContext.windows.length > 0 && (
        <div className="rounded-xl border border-indigo/10 bg-indigo-mist/50 p-4" data-testid="trend-context">
          <div className="mb-3 flex items-center gap-1.5">
            <MaterialIcon name="trending_up" size="sm" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-dark">
              Price Trend Analysis
            </h3>
          </div>
          <div className="mb-3 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              data.trendContext.direction === 'rising' ? 'bg-red-100 text-red-700' :
              data.trendContext.direction === 'falling' ? 'bg-emerald-100 text-emerald-700' :
              'bg-slate-100 text-slate-700'
            }`}>
              <MaterialIcon name={data.trendContext.direction === 'rising' ? 'trending_up' : data.trendContext.direction === 'falling' ? 'trending_down' : 'horizontal_rule'} size="xs" />
              {cleanText(data.trendContext.direction.charAt(0).toUpperCase() + data.trendContext.direction.slice(1))}
              {' '}{cleanText(data.trendContext.magnitude > 0 ? '+' : '')}{data.trendContext.magnitude.toFixed(1)}%
            </span>
            {data.seasonalIndicator && data.seasonalIndicator !== 'unknown' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">
                <MaterialIcon name="wb_sunny" size="xs" />
                {data.seasonalIndicator.charAt(0).toUpperCase() + data.seasonalIndicator.slice(1)} Season
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(() => {
              const windows = data.trendContext.windows;
              const firstMagnitude = windows[0]?.magnitude ?? null;
              const hasDuplicateMagnitudes =
                firstMagnitude !== null && windows.every((w) => w.magnitude === firstMagnitude);
              return windows.map((w: any, i: number) => (
                <div key={i} className="rounded-lg bg-white p-2.5 text-center shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{w.period ?? (w.windowDays ? w.windowDays + 'd' : '—')}</p>
                  <p className={`mt-0.5 text-sm font-bold tabular-nums ${
                    (w.direction === 'rising' || (w.changePercent ?? 0) > 0) ? 'text-coral' :
                    (w.direction === 'falling' || (w.changePercent ?? 0) < 0) ? 'text-emerald-600' : 'text-ink-soft'
                  }`}>
                    {hasDuplicateMagnitudes && windows.length > 1
                      ? null
                      : ((w.magnitude ?? w.changePercent ?? 0) > 0 ? '+' : '') + (w.magnitude ?? w.changePercent ?? 0).toFixed(1) + '%'
                    }
                  </p>
                  <p className="text-[10px] text-ink-faint">
                    {hasDuplicateMagnitudes && windows.length > 1
                      ? 'Data unavailable'
                      : (w.snapshots ?? '') + ' snapshots'}
                  </p>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Rate Lock Urgency (NEW) */}
      {data.rateLock && data.rateLock.urgency && data.rateLock.urgency !== 'low' && (
        <div
          className={`rounded-xl border p-4 ${
            data.rateLock.urgency === 'critical' ? 'border-red-300 bg-red-50' :
            data.rateLock.urgency === 'high' ? 'border-orange-300 bg-orange-50' :
            'border-yellow-300 bg-yellow-50'
          }`}
          data-testid="rate-lock-urgency"
        >
          <div className="flex items-center gap-2">
            <MaterialIcon
              name={data.rateLock.urgency === 'critical' ? 'error_outline' : 'warning'}
              size="sm"
              className={data.rateLock.urgency === 'critical' ? 'text-rose-600' : 'text-amber-600'}
            />
            <div>
              <p className={`text-sm font-bold ${
                data.rateLock.urgency === 'critical' ? 'text-rose-800' : 'text-amber-800'
              }`}>
                {data.rateLock.urgency === 'critical' ? 'Prices Climbing Fast' : 'Act Soon - Prices May Rise'}
              </p>
              {data.rateLock.minutesRemaining !== undefined && (
                <p className="text-xs text-ink-faint">
                  {data.rateLock.minutesRemaining <= 0
                    ? 'Price hold expired'
                    : data.rateLock.minutesRemaining < 60
                      ? `Price hold expires in ~${Math.round(data.rateLock.minutesRemaining)} minutes`
                      : data.rateLock.minutesRemaining < 1440
                        ? `Price hold expires in ~${Math.round(data.rateLock.minutesRemaining / 60)} hours`
                        : data.rateLock.minutesRemaining < 10080
                          ? `Price hold expires in ~${Math.round(data.rateLock.minutesRemaining / 60 / 24)} days`
                          : `Price hold expires in ~${Math.round(data.rateLock.minutesRemaining / 60 / 24 / 7)} weeks`
                  }
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Optimal Booking Window */}
      {data.optimalBookingWindow && (
        <div className="rounded-xl border border-emerald-500/15 bg-white p-4" data-testid="optimal-booking-window">
          <div className="flex items-center gap-1.5">
            <MaterialIcon name="event_available" size="sm" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Optimal Booking Window</h3>
          </div>
          <p className="mt-1 text-sm font-medium text-emerald-800">{data.optimalBookingWindow}</p>
        </div>
      )}

      {/* Competing Sailings */}
      {data.competingSailings && data.competingSailings.length > 0 && (
        <div data-testid="competing-sailing-comparison">
          <div className="mb-2 flex items-center gap-1.5">
            <MaterialIcon name="compare_arrows" size="sm" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Competing Sailings</h3>
          </div>
          <div className="space-y-2">
            {data.competingSailings.map((s, i) => {
              const balconyHere = data.cabinForecasts?.find((cf: any) => cf.cabinType === 'Balcony')?.currentPrice ?? 0;
              const delta = s.balconyPrice - balconyHere;
              const cheaper = delta < 0;
              return (
              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <div>
                  <p className="text-sm font-medium text-ink">{s.cruiseLine} - {s.shipName}</p>
                  <p className="text-xs text-ink-faint">
                    Departs:{' '}
                    {new Date(s.departureDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold tabular-nums ${cheaper ? 'text-emerald-600' : 'text-coral'}`}>
                    {cheaper ? '−' : '+'}${Math.abs(delta).toLocaleString()}
                  </p>
                  <p className="text-xs text-ink-faint">{cheaper ? 'cheaper than balcony here' : 'pricier than balcony here'}</p>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Drop Alerts */}
      {data.alerts && data.alerts.length > 0 && (
        <div data-testid="price-alert-triggers">
          <div className="mb-2 flex items-center gap-1.5">
            <MaterialIcon name="notifications_active" size="sm" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Price Drop Alerts</h3>
          </div>
          <div className="space-y-2">
            {data.alerts.map((alert: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-rose-50 p-3">
                <div>
                  <p className="text-sm font-medium text-ink">{alert.cabinType ?? alert.type ?? 'Alert'}</p>
                  <p className="text-xs text-ink-faint">{alert.message ?? (alert.triggerPrice ? 'Alert triggers at $' + alert.triggerPrice.toLocaleString() : '')}</p>
                </div>
                {alert.savings != null && (
                  <span className="text-sm font-bold text-rose-600 tabular-nums">
                    Save ${alert.savings.toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
