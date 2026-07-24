'use client';

/**
 * TripTide - EnhancedDealAnalysis Component (Redesigned)
 * 
 * Renders a clean, human-readable Deal Analysis dashboard by parsing JSON data
 * and rendering well-structured sections.
 * 
 * Data shapes supported:
 *   - `justification`: array of {title, content} objects OR a single string
 *   - `insiderTips`: array of {title, content} objects OR array of strings
 *   - `hiddenCosts`: {mandatoryGratuities, wifiCost, resortFees, realTotalCost}
 *   - `cabinValueBreakdown`: {Inside: {perNight, valueRating}, ...}
 *   - `pricingDeepDive`, `priceTrend`, `inventoryIntelligence`, `pricingStrategy`, etc.
 */

import { useEffect, useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';
import { cleanText } from '@/utils/text';

interface EnhancedDealAnalysisProps {
  sailingId: string | number;
  bookingUrl?: string;
  bookingLabel?: string;
}

interface Section {
  title: string;
  content: string;
}

function parseSections(value: any): Section[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((s: any) => ({
    title: s?.title || 'Tip',
    content: s?.content || String(s),
  }));
  if (typeof value === 'string') return [{ title: 'Analysis', content: value }];
  return [];
}

function ratingColor(r: string): string {
  const key = (r || '').toLowerCase();
  switch (key) {
    case 'excellent': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'great':     return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'good':      return 'bg-blue-100   text-blue-800   border-blue-200';
    case 'fair':      return 'bg-slate-100   text-slate-700  border-slate-200';
    case 'overpriced':return 'bg-red-100    text-red-700    border-red-200';
    default:          return 'bg-slate-100   text-slate-700  border-slate-200';
  }
}

const PLACEHOLDER_PATTERNS = [
  'Analysis parsing failed',
  'Analysis unavailable',
  'Data unavailable',
  'Contact agent for details',
  'Manual review recommended',
] as const;

function containsPlaceholder(text: string): boolean {
  const lower = text.toLowerCase();
  return PLACEHOLDER_PATTERNS.some(p => lower.includes(p.toLowerCase()));
}

function cleanPlaceholderText(text: string): string {
  return PLACEHOLDER_PATTERNS.reduce((t, p) => t.replace(new RegExp(p, 'gi'), ''), text);
}

function verdictColor(t: string): string {
  const l = (t || '').toLowerCase();
  if (l.includes('buy') || l.includes('strong buy') || l.includes('book now')) return 'emerald';
  if (l.includes('watch') || l.includes('wait')) return 'amber';
  if (l.includes('skip') || l.includes('below average')) return 'coral';
  return 'indigo';
}

export default function EnhancedDealAnalysis({ sailingId, bookingUrl, bookingLabel }: EnhancedDealAnalysisProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalysis = async (force = false) => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
    const url = force
      ? `${API_BASE}/api/enhanced/deal-analysis/${sailingId}?forceRefresh=true`
      : `${API_BASE}/api/enhanced/deal-analysis/${sailingId}`;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      if (!cancelled) { setData(json.data); setLoading(false); }
    } catch (err: any) {
      if (!cancelled) {
        setError(err.message.includes('Failed:') ? 'Will be available after next sync.' : err.message);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchAnalysis();
    return () => { /* cancelled is handled per-call */ };
  }, [sailingId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalysis(true);
    setRefreshing(false);
  };


  /* ====== Loading ====== */
  if (loading && !data) {
    return (
      <div data-testid="enhanced-deal-analysis" className="rounded-3xl border border-black/[0.05] dark:border-neutral-700 bg-white dark:bg-surface p-6 shadow-float">
        <div className="mb-5 flex items-center gap-2">
          <MaterialIcon name="analytics" size="lg" />
          <h2 className="font-display text-2xl font-bold text-ink dark:text-white">Deal Analysis</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 animate-pulse rounded-2xl bg-black/[0.06] dark:bg-neutral-700" />
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-black/[0.06] dark:bg-neutral-700" />
              <div className="h-3 w-24 animate-pulse rounded bg-black/[0.06] dark:bg-neutral-700" />
            </div>
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-black/[0.04] dark:bg-neutral-700" />
          ))}
          <p className="mt-2 text-xs dark:text-neutral-400">Loading cruise-specific intelligence...</p>
        </div>
      </div>
    );
  }

  /* ====== Error ====== */
  if (error) {
    return (
      <div data-testid="enhanced-deal-analysis" className="rounded-3xl border border-black/[0.05] dark:border-neutral-700 bg-white dark:bg-surface p-6 shadow-float">
        <div className="mb-4 flex items-center gap-2">
          <MaterialIcon name="analytics" size="lg" />
          <h2 className="font-display text-2xl font-bold text-ink dark:text-white">Deal Analysis</h2>
        </div>
        <div data-testid="deal-analysis-error" className="rounded-xl border border-coral-ink/15 dark:border-coral-800 bg-coral-soft dark:bg-coral-900/40 p-4">
          <div className="flex items-start gap-2">
            <MaterialIcon name="error_outline" size="sm" />
            <div>
              <p className="text-sm font-medium text-coral-ink">Analysis unavailable</p>
              <p className="mt-1 text-xs text-coral-ink/60">{error}</p>
              <p className="mt-2 text-xs text-coral-ink/50">Available after next sync cycle.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ====== No data ====== */
  if (!data) {
    return (
      <div data-testid="enhanced-deal-analysis" className="rounded-3xl border border-black/[0.05] bg-white p-6 shadow-float">
        <div className="mb-4 flex items-center gap-2">
          <MaterialIcon name="analytics" size="lg" />
          <h2 className="font-display text-2xl font-bold text-ink">Deal Analysis</h2>
        </div>
        <div className="rounded-xl border border-indigo/10 bg-white p-4">
          <div className="flex items-start gap-2">
            <MaterialIcon name="schedule" size="sm" />
            <div>
              <p className="text-sm font-medium text-indigo-dark">Coming on next sync cycle</p>
              <p className="mt-1 text-xs text-ink-soft leading-relaxed">
                Cruise-specific intelligence (inventory, pricing strategy, hidden costs) is generated automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ====== Score ====== */
  const score = Number(data.dealScore ?? 50);
  const scoreColor = score >= 85 ? 'bg-emerald-500' : score >= 70 ? 'bg-indigo' : score >= 50 ? 'bg-amber-500' : 'bg-coral';
  const scoreLabel = score >= 85 ? 'Exceptional' : score >= 70 ? 'Great Value' : score >= 50 ? 'Average' : 'Below Average';

  /* ====== Render ====== */
  const justificationSections = parseSections(data.justification);
  const tipsArray = parseSections(data.insiderTips);
  const verdict = data.verdict || '';
  const vColor = verdictColor(verdict);

  return (
    <div data-testid="enhanced-deal-analysis" className="rounded-3xl border border-black/[0.05] dark:border-neutral-700 bg-white dark:bg-surface p-6 shadow-float space-y-6">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MaterialIcon name="analytics" size="lg" />
          <h2 className="font-display text-2xl font-bold text-ink dark:text-white">Deal Analysis</h2>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <>
              {(data.is_heuristic || (
                data.pricingDeepDive && containsPlaceholder(data.pricingDeepDive)
              )) && (
                <span data-testid="heuristic-badge" className="inline-flex items-center gap-1 rounded-full bg-neutral-600 dark:bg-neutral-500 px-2.5 py-0.5 text-xs font-medium text-white dark:text-neutral-900">
                  <MaterialIcon name="calculate" size="xs" />
                  {data.is_heuristic ? 'Heuristic Estimate' : 'AI Estimate Unavailable'}
                </span>
              )}
              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="inline-flex items-center gap-1 rounded-full border border-black/10 dark:border-neutral-600 px-2.5 py-0.5 text-xs font-medium text-ink-soft dark:text-neutral-300 transition hover:bg-black/[0.04] dark:hover:bg-neutral-700 disabled:opacity-40"
                data-testid="refresh-deal-analysis"
                title="Refresh deal analysis"
              >
                <MaterialIcon name={refreshing ? 'hourglass_empty' : 'refresh'} size="xs" />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ===== Score + Verdict ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" data-testid="deal-score-badge">
        <div className="flex items-center gap-4">
          <div className={'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold text-white ' + scoreColor}>
            {score}
          </div>
          <div>
            <p className="text-lg font-bold text-ink dark:text-white">{scoreLabel}</p>
            <p className="text-xs text-ink-faint">Deal Score (0-100)</p>
          </div>
        </div>
        {/* Verdict badge - prominent */}
        <div data-testid="verdict" className="flex shrink-0 items-center gap-2">
          <MaterialIcon name="gavel" size="sm" className="text-white" />
          <span className={'inline-block rounded-2xl px-4 py-2 max-w-xs text-center whitespace-normal break-words text-xs font-semibold text-white ' + (vColor === 'emerald' ? 'bg-emerald-500' : vColor === 'amber' ? 'bg-amber-500' : vColor === 'coral' ? 'bg-coral' : 'bg-indigo')} data-testid="verdict-bubble">
            {cleanPlaceholderText(verdict) || 'Unrated'}
          </span>
        </div>
      </div>

      {/* ===== Deal Score Justification ===== */}
      {data.dealScoreJustification && Array.isArray(data.dealScoreJustification) && data.dealScoreJustification.length > 0 && (
        <div className="rounded-xl border border-emerald-500/15 bg-white p-4" data-testid="deal-score-justification">
          <div className="mb-3 flex items-center gap-1.5">
            <MaterialIcon name="fact_check" size="sm" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Why This Score</h3>
          </div>
          <div className="space-y-2.5">
            {data.dealScoreJustification.map((s: Section, i: number) => (
              <div key={i} className="bg-white/70 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-emerald-900 mb-0.5">{s.title}</h4>
                <p className="text-sm leading-relaxed text-emerald-800/80">{s.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Justification ===== */}
      {justificationSections.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-white p-4" data-testid="deal-justification">
          <div className="mb-3 flex items-center gap-1.5">
            <MaterialIcon name="lightbulb" size="sm" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-800">Why This Is a Deal</h3>
          </div>
          <div className="space-y-2.5">
            {justificationSections.map((s, i) => (
              <div key={i} className="bg-white/70 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-amber-900 mb-0.5">{s.title}</h4>
                <p className="text-sm leading-relaxed text-amber-800/80">{s.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Pricing Deep Dive ===== */}
      {data.pricingDeepDive && (
        <div data-testid="pricing-deep-dive">
          <div className="mb-1 flex items-center gap-1.5">
            <MaterialIcon name="payments" size="sm" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Pricing Deep-Dive</h3>
          </div>
          <p className="text-sm leading-relaxed text-ink-soft">{cleanText(data.pricingDeepDive)}</p>
        </div>
      )}

      {/* ===== Price Trend ===== */}
      {data.priceTrend && (
        <div className="flex items-start gap-3 rounded-xl border border-black/[0.05] bg-canvas p-3" data-testid="price-trend">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center">
            {data.priceTrend === 'rising' && <MaterialIcon name="trending_up" size="sm" className="text-coral" />}
            {data.priceTrend === 'falling' && <MaterialIcon name="trending_down" size="sm" className="text-emerald-600" />}
            {data.priceTrend === 'stable' && <MaterialIcon name="trending_flat" size="sm" className="text-ink-faint" />}
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Price Trend</h3>
            <p className="mt-0.5 text-sm text-ink-soft capitalize">{data.priceTrend}</p>
          </div>
        </div>
      )}

      {/* ===== Hidden Costs ===== */}
      {data.hiddenCosts && (() => {
        const hc = data.hiddenCosts;
        const has = hc.mandatoryGratuities !== undefined || hc.wifiCost !== undefined || hc.realTotalCost !== undefined;
        if (!has) return null;
        return (
          <div className="rounded-xl border border-rose-500/15 bg-white p-4" data-testid="hidden-cost-detector">
            <div className="mb-2 flex items-center gap-1.5">
              <MaterialIcon name="visibility_off" size="sm" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-700">Hidden Cost Detector</h3>
            </div>
            <div className="space-y-2 text-sm">
              {hc.mandatoryGratuities !== undefined && (
                <div className="flex justify-between">
                  <span className="text-ink-soft">Mandatory Gratuities:</span>
                  <span className="font-medium text-rose-700">{'$' + hc.mandatoryGratuities.toFixed(2)}</span>
                </div>
              )}
              {hc.wifiCost !== undefined && (
                <div className="flex justify-between">
                  <span className="text-ink-soft">Wi-Fi:</span>
                  <span className="font-medium text-rose-700">{'$' + hc.wifiCost.toFixed(2)}</span>
                </div>
              )}
              {hc.resortFees !== undefined && hc.resortFees > 0 && (
                <div className="flex justify-between">
                  <span className="text-ink-soft">Resort Fees:</span>
                  <span className="font-medium text-rose-700">{'$' + hc.resortFees.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-rose-200 pt-2 font-bold">
                <span className="text-ink">Real Total Cost:</span>
                <span className="text-rose-700">{'$' + (hc.realTotalCost ?? 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== Cabin Value Comparison ===== */}
      {data.cabinValueBreakdown && Object.keys(data.cabinValueBreakdown).length > 0 && (
        <div className="rounded-xl border border-indigo/10 bg-white p-4" data-testid="cabin-value-breakdown">
          <div className="mb-3 flex items-center gap-1.5">
            <MaterialIcon name="compare_arrows" size="sm" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-dark">
              Cabin Value Comparison
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Object.entries(data.cabinValueBreakdown as Record<string, { perNight: number; valueRating: string }>).map(([cabin, value]) => {
              const rating = value?.valueRating || 'Fair';
              const perNight = typeof value?.perNight === 'number' ? Math.round(value.perNight) : 0;
              return (
                <div key={cabin} className="rounded-lg bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">{cleanText(cabin || 'Unknown')}</span>
                    <span className="text-xs font-semibold tabular-nums">{perNight}/night</span>
                  </div>
                  <div className="mt-1.5">
                    <span className={'inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ' + ratingColor(rating)}>
                      {rating}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== Itinerary Value ===== */}
      {data.itineraryValue && (
        <div className="rounded-xl border border-emerald-500/15 bg-white p-4" data-testid="itinerary-value-breakdown">
          <div className="mb-2 flex items-center gap-1.5">
            <MaterialIcon name="map" size="sm" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Itinerary Value Breakdown</h3>
          </div>
          <p className="text-sm leading-relaxed text-ink-soft">{cleanText(data.itineraryValue)}</p>
        </div>
      )}

      {/* ===== Pricing Strategy ===== */}
      {data.pricingStrategy && (
        <div className="rounded-xl border border-blue-500/15 bg-white p-4" data-testid="pricing-strategy-decoder">
          <div className="mb-2 flex items-center gap-1.5">
            <MaterialIcon name="trending_up" size="sm" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-700">Pricing Strategy</h3>
          </div>
          <p className="text-sm leading-relaxed text-ink-soft">{cleanText(data.pricingStrategy)}</p>
        </div>
      )}

      {/* ===== Inventory Intelligence ===== */}
      {data.inventoryIntelligence && (
        <div className="rounded-xl border border-violet-500/15 bg-white p-4" data-testid="inventory-intelligence">
          <div className="mb-2 flex items-center gap-1.5">
            <MaterialIcon name="inventory_2" size="sm" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-700">Inventory Intelligence</h3>
          </div>
          <p className="text-sm leading-relaxed text-ink-soft">{cleanText(data.inventoryIntelligence)}</p>
        </div>
      )}

      {/* ===== Insider Tips ===== */}
      {tipsArray.length > 0 && (
        <div className="rounded-xl border border-indigo/10 bg-white p-4" data-testid="sailing-specific-tips">
          <div className="mb-2 flex items-center gap-1.5">
            <MaterialIcon name="travel_explore" size="sm" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-dark">
              Insider Tips
            </h3>
          </div>
          <div className="space-y-2">
            {tipsArray.map((tip, i) => (
              <div key={i} className="bg-white/60 rounded-lg p-2.5">
                <p className="text-xs font-medium text-ink-faint/80">{cleanText(tip.title)}</p>
                <p className="text-sm leading-relaxed text-ink-soft">{cleanText(tip.content)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Ship Value Score ===== */}
      {typeof data.shipValueScore === 'number' && (
        <div data-testid="ship-value-scoring">
          <div className="mb-2 flex items-center gap-1.5">
            <MaterialIcon name="star" size="sm" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Ship Value Score</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className={'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold text-white ' +
              (data.shipValueScore >= 75 ? 'bg-emerald-500' : data.shipValueScore >= 50 ? 'bg-amber-500' : 'bg-coral')}>
              {data.shipValueScore}
            </div>
            <p className="text-sm text-ink-soft">Value score for this ship and route</p>
          </div>
          {data.shipValueScoreJustification && Array.isArray(data.shipValueScoreJustification) && data.shipValueScoreJustification.length > 0 && (
            <div className="mt-3 space-y-2.5" data-testid="ship-value-justification">
              {data.shipValueScoreJustification.map((s: Section, i: number) => (
                <div key={i} className="bg-white/70 rounded-lg p-3 border border-blue-500/10">
                  <h4 className="text-sm font-semibold text-blue-900 mb-0.5">{s.title}</h4>
                  <p className="text-sm leading-relaxed text-blue-800/80">{s.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== CTA — single Book This Cruise button ===== */}
      {(() => {
        const effectiveBookingUrl = data?.bookingUrl || bookingUrl;
        return (
          <div className="flex justify-center pt-2" data-testid="deal-cta">
            {effectiveBookingUrl ? (
              <a
                href={effectiveBookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="booking-link-cta"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700"
              >
                <MaterialIcon name="book_online" size="sm" />
                {bookingLabel || 'Book This Cruise'}
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-8 py-3 text-sm font-semibold text-slate-700">
                <MaterialIcon name="book_online" size="sm" />
                Compare cabin options below
              </span>
            )}
          </div>
        );
      })()}
    </div>
  );
}
