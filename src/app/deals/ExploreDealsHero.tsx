'use client';

import { useCallback } from 'react';
import { useLiveData } from '@/hooks/useLiveData';
import MaterialIcon from '@/components/ui/MaterialIcon';

interface Stats {
  trackedSailings: number;
  pricingSnapshots: number;
}

export default function ExploreDealsHero() {
  const fetcher = useCallback(async () => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${API_BASE}/api/stats`);
    if (!res.ok) throw new Error('Failed to load stats');
    return res.json() as Promise<Stats>;
  }, []);

  const { data: stats } = useLiveData(fetcher, { pollIntervalMs: 60000 });

  return (
    <section className="relative overflow-hidden border-b border-black/[0.04] bg-gradient-to-b from-indigo/[0.03] via-transparent to-transparent">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(42,68,231,0.06)_0%,transparent_70%)]" />

      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          {/* Live badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-mint-ink/20 bg-mint-soft px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-mint-ink animate-pulse" />
            <span className="text-xs font-semibold text-mint-ink">
              {stats
                ? `${stats.trackedSailings.toLocaleString()} sailings tracked live`
                : 'Live fare polling'}
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl font-extrabold tracking-tight text-ink sm:text-6xl lg:text-7xl">
            Find Your{' '}
            <span className="bg-gradient-to-r from-indigo to-indigo/70 bg-clip-text text-transparent">
              Perfect Voyage
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-lg text-ink-soft sm:text-xl">
            Compare out-the-door pricing across {stats ? stats.trackedSailings.toLocaleString() : 'hundreds of'} sailings.
            Base fare, port taxes, and mandatory gratuities — all in one transparent price.
          </p>

          {/* Quick action chips */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Chip icon="trending_down" label="Price Drop" />
            <Chip icon="person" label="Solo Friendly" />
            <Chip icon="star" label="Best Value" />
            <Chip icon="sort" label="Any Duration" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Chip({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white px-4 py-2 text-xs font-semibold text-ink-soft shadow-float transition-colors hover:border-indigo/30 hover:text-indigo">
      <MaterialIcon name={icon} size="xs" />
      {label}
    </span>
  );
}
