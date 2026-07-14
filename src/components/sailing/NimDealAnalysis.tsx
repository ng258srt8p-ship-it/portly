'use client';

/**
 * TripTide — NimDealAnalysis Component
 * 
 * Renders a rich, insider-sounding deal analysis from the NIM-powered
 * /api/analytics/deal-analysis/:sailingId endpoint.
 * 
 * Parses structured sections and renders each with appropriate visual treatment:
 *   - Deal Score → big number badge with color
 *   - Pricing Deep-Dive → data card
 *   - Price Trend → directional indicator
 *   - Ship & Experience → info card with icon
 *   - What the Booking Site Won't Tell You → highlighted insider tips box
 *   - Verdict → bottom-line callout
 */

import { useEffect, useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';

/* ------------------------------------------------------------------ */
/*  Types & Helpers                                                    */
/* ------------------------------------------------------------------ */

interface ParsedAnalysis {
  dealScore?: { score: number; rating: string };
  pricingDeepDive?: string;
  priceTrend?: string;
  shipExperience?: string;
  insiderTips?: string;
  verdict?: string;
}

function parseScore(value: string): { score: number; rating: string } {
  const match = value.match(/(\d{1,3})/);
  const score = match ? Math.min(100, Math.max(0, parseInt(match[1], 10))) : 0;
  const rating = value.replace(/^[\d\s–—.-]+/, '').trim() || 'Good';
  return { score, rating };
}

function getScoreColor(score: number): string {
  if (score >= 85) return 'bg-emerald-500 text-white';
  if (score >= 70) return 'bg-indigo text-white';
  if (score >= 50) return 'bg-amber-500 text-white';
  return 'bg-coral text-white';
}

function getScoreLabel(score: number): string {
  if (score >= 85) return 'Exceptional';
  if (score >= 70) return 'Great';
  if (score >= 50) return 'Average';
  return 'Below Average';
}

function parseAnalysis(text: string): ParsedAnalysis {
  const result: ParsedAnalysis = {};

  // Extract sections by the bolded heading pattern: **Section Name:**
  const sections = text.split(/(\*\*[^*]+\*\*:)/g);

  for (let i = 1; i < sections.length; i += 2) {
    const heading = sections[i].replace(/\*\*/g, '').replace(/:$/, '').trim().toLowerCase();
    const content = (sections[i + 1] || '').trim();

    if (heading.includes('deal score') || heading.includes('deal rating')) {
      result.dealScore = parseScore(content);
    } else if (heading.includes('pricing deep')) {
      result.pricingDeepDive = content;
    } else if (heading.includes('price trend')) {
      result.priceTrend = content;
    } else if (heading.includes('ship') && (heading.includes('experience') || heading.includes('info'))) {
      result.shipExperience = content;
    } else if (heading.includes('booking site') || heading.includes('won\'t tell') || heading.includes('insider')) {
      result.insiderTips = content;
    } else if (heading.includes('verdict') || heading.includes('recommendation')) {
      result.verdict = content;
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Trend icon helper                                                  */
/* ------------------------------------------------------------------ */

function TrendIcon({ text }: { text: string }) {
  const lower = (text || '').toLowerCase();
  if (lower.includes('down') || lower.includes('drop') || lower.includes('decrease')) {
    return <span className="text-emerald-600"><MaterialIcon name="trending_down" size="sm" /></span>;
  }
  if (lower.includes('up') || lower.includes('rise') || lower.includes('increase')) {
    return <span className="text-coral"><MaterialIcon name="trending_up" size="sm" /></span>;
  }
  return <span className="text-ink-faint"><MaterialIcon name="trending_flat" size="sm" /></span>;
}

/* ------------------------------------------------------------------ */
/*  Verdict badge helper                                               */
/* ------------------------------------------------------------------ */

function VerdictBadge({ text }: { text: string }) {
  const lower = (text || '').toLowerCase();
  const clean = text.replace(/^[":\s]*/, '').split(/[.!\n]/)[0].trim();

  if (lower.includes('buy now') || lower.includes('book now')) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <MaterialIcon name="check_circle" size="sm" />
          </span>
          <div>
            <p className="text-sm font-bold text-emerald-800">Buy Now</p>
            <p className="mt-1 text-sm text-emerald-700/80">{clean.replace(/^buy now[:\s]*/i, '')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (lower.includes('watch') || lower.includes('wait')) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
            <MaterialIcon name="schedule" size="sm" />
          </span>
          <div>
            <p className="text-sm font-bold text-amber-800">Watch & Wait</p>
            <p className="mt-1 text-sm text-amber-700/80">{clean.replace(/^watch\s*(&|and)\s*wait[:\s]*/i, '')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (lower.includes('skip') || lower.includes('better value') || lower.includes('avoid')) {
    return (
      <div className="rounded-xl border border-coral-ink/15 bg-coral-soft p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-coral text-white">
            <MaterialIcon name="block" size="sm" />
          </span>
          <div>
            <p className="text-sm font-bold text-coral-ink">Skip</p>
            <p className="mt-1 text-sm text-coral-ink/80">{clean.replace(/^(skip|only if you need this date)[:\s]*/i, '')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback — just render the text
  return (
    <div className="rounded-xl border border-indigo/10 bg-indigo-mist p-4">
      <p className="text-sm font-bold text-indigo-dark">{clean}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

interface NimDealAnalysisProps {
  sailingId: number;
}

export default function NimDealAnalysis({ sailingId }: NimDealAnalysisProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/analytics/deal-analysis/${sailingId}`,
          { cache: 'no-store' }
        );
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const raw = await res.text();
        const parsed = raw.startsWith('{') ? JSON.parse(raw) : { data: raw };
        const text = parsed.data || raw;
        if (!cancelled) {
          setAnalysis(text);
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

  const structured = analysis ? parseAnalysis(analysis) : {};

  /* --- Loading skeleton --- */
  if (loading) {
    return (
      <div className="rounded-3xl border border-black/[0.05] bg-white p-6 shadow-float">
        <div className="mb-4 flex items-center gap-2">
          <MaterialIcon name="analytics" size="lg" />
          <h2 className="font-display text-2xl font-bold text-ink">Deal Analysis</h2>
        </div>
        <div className="space-y-3">
          <div className="h-20 w-full animate-pulse rounded-2xl bg-black/[0.04]" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-black/[0.06]" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-black/[0.06]" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-black/[0.06]" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-black/[0.06]" />
          <p className="mt-2 text-xs text-ink-faint/60">NIM analysis in progress...</p>
        </div>
      </div>
    );
  }

  /* --- Error state --- */
  if (error) {
    return (
      <div className="rounded-3xl border border-black/[0.05] bg-white p-6 shadow-float">
        <div className="mb-4 flex items-center gap-2">
          <MaterialIcon name="analytics" size="lg" />
          <h2 className="font-display text-2xl font-bold text-ink">Deal Analysis</h2>
        </div>
        <div className="rounded-xl border border-coral-ink/15 bg-coral-soft p-4">
          <div className="flex items-start gap-2">
            <MaterialIcon name="error_outline" size="sm" />
            <div>
              <p className="text-sm font-medium text-coral-ink">Analysis unavailable</p>
              <p className="mt-1 text-xs text-coral-ink/60">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* --- No data --- */
  if (!analysis) {
    return (
      <div className="rounded-3xl border border-black/[0.05] bg-white p-6 shadow-float">
        <div className="mb-4 flex items-center gap-2">
          <MaterialIcon name="analytics" size="lg" />
          <h2 className="font-display text-2xl font-bold text-ink">Deal Analysis</h2>
        </div>
        <div className="rounded-xl border border-indigo/10 bg-indigo-mist/50 p-4">
          <div className="flex items-start gap-2">
            <MaterialIcon name="schedule" size="sm" />
            <div>
              <p className="text-sm font-medium text-indigo-dark">Coming on next sync cycle</p>
              <p className="mt-1 text-xs text-ink-soft leading-relaxed">
                Deal analysis is generated automatically every 4 hours as part of the pricing sync cycle. 
                Check back after the next sync completes, or browse our <a href="/deals" className="text-indigo underline hover:no-underline">Explore Deals</a> page to find your next cruise.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* --- Main render --- */
  const { dealScore, pricingDeepDive, priceTrend, shipExperience, insiderTips, verdict } = structured;
  const scoreColor = dealScore ? getScoreColor(dealScore.score) : 'bg-indigo text-white';

  return (
    <div className="rounded-3xl border border-black/[0.05] bg-white p-6 shadow-float">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <MaterialIcon name="analytics" size="lg" />
        <h2 className="font-display text-2xl font-bold text-ink">Deal Analysis</h2>
      </div>

      {/* Deal Score badge */}
      {dealScore && (
        <div className="mb-6 flex items-center gap-4">
          <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold ${scoreColor}`}>
            {dealScore.score}
          </div>
          <div>
            <p className="text-lg font-bold text-ink">{dealScore.rating || getScoreLabel(dealScore.score)}</p>
            <p className="text-xs text-ink-faint">Deal Score out of 100</p>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-5">
        {/* Pricing Deep-Dive */}
        {pricingDeepDive && (
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <MaterialIcon name="payments" size="sm" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Pricing Deep-Dive</h3>
            </div>
            <p className="text-sm leading-relaxed text-ink-soft">{pricingDeepDive}</p>
          </div>
        )}

        {/* Price Trend */}
        {priceTrend && (
          <div className="flex items-start gap-3 rounded-xl border border-black/[0.05] bg-canvas p-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center">
              <TrendIcon text={priceTrend} />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Price Trend</h3>
              <p className="mt-0.5 text-sm text-ink-soft">{priceTrend}</p>
            </div>
          </div>
        )}

        {/* Ship & Experience */}
        {shipExperience && (
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <MaterialIcon name="directions_boat" size="sm" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Ship & Experience</h3>
            </div>
            <p className="text-sm leading-relaxed text-ink-soft">{shipExperience}</p>
          </div>
        )}

        {/* Insider Tips (highlighted box) */}
        {insiderTips && (
          <div className="rounded-xl border border-indigo/10 bg-indigo-mist/50 p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <MaterialIcon name="travel_explore" size="sm" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-dark">
                What the Booking Site Won&apos;t Tell You
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-ink-soft">{insiderTips}</p>
          </div>
        )}

        {/* Verdict */}
        {verdict && (
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <MaterialIcon name="gavel" size="sm" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Verdict</h3>
            </div>
            <VerdictBadge text={verdict} />
          </div>
        )}

        {/* Fallback: if parser missed sections, show raw markdown */}
        {!pricingDeepDive && !priceTrend && !shipExperience && !insiderTips && !verdict && (
          <div className="prose prose-sm max-w-none prose-headings:text-ink prose-p:text-ink-soft prose-strong:text-ink">
            {analysis.split('\n').map((line, i) => {
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
    </div>
  );
}
