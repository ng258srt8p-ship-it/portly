'use client';

import { useEffect, useState } from 'react';

interface AlertRow {
  id: number;
  sailing_id: string | null;
  sailing_url: string | null;
  threshold_pct: number;
  is_active: number;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function MyAlertsPanel() {
  const [email, setEmail] = useState('');
  const [alerts, setAlerts] = useState<AlertRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<number | null>(null); // busy state per-row

  const load = async (em: string) => {
    if (!EMAIL_REGEX.test(em)) {
      setAlerts(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/alerts?email=${encodeURIComponent(em)}`
      );
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        setAlerts([]);
        return;
      }
      const j = await res.json();
      setAlerts((Array.isArray(j.alerts) ? j.alerts : []).filter((a: AlertRow) => a.is_active === 1));
    } catch (e: any) {
      setError(e.message || 'Network error');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  // Reload whenever the email changes (debounce-free; the API is fast).
  useEffect(() => {
    const id = setTimeout(() => load(email), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const setActive = async (row: AlertRow, isActive: boolean) => {
    setPulseId(row.id);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/alerts/${row.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          // Re-enabling (1) clears the worker-side cooldown so a fresh
          // evaluation can fire immediately on the next tick.
          body: JSON.stringify({ is_active: isActive ? 1 : 0, threshold_pct: row.threshold_pct }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load(email);
    } catch (e: any) {
      setError(e.message || 'Update failed');
    } finally {
      setPulseId(null);
    }
  };

  const setThreshold = async (row: AlertRow, pct: number) => {
    setPulseId(row.id);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/alerts/${row.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threshold_pct: pct }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load(email);
    } catch (e: any) {
      setError(e.message || 'Update failed');
    } finally {
      setPulseId(null);
    }
  };

  const remove = async (row: AlertRow) => {
    setPulseId(row.id);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/alerts/${row.id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load(email);
    } catch (e: any) {
      setError(e.message || 'Delete failed');
    } finally {
      setPulseId(null);
    }
  };

  const isEmail = EMAIL_REGEX.test(email);

  return (
    <section
      aria-labelledby="my-alerts-heading"
      className="mt-12 rounded-3xl border border-black/[0.05] bg-white p-8 shadow-float"
      data-testid="my-alerts-panel"
    >
      <h2 id="my-alerts-heading" className="font-display text-xl font-bold text-ink">
        Manage your alerts
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        Enter the email you used when subscribing to view, pause, or delete your alerts.
      </p>

      <div className="mt-4 max-w-md">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email used to subscribe"
          data-testid="manage-email"
          className="w-full rounded-2xl border border-black/[0.08] px-4 py-3 text-sm text-ink outline-none focus:border-indigo"
        />
      </div>

      {!isEmail && (
        <p className="mt-4 text-xs text-ink-faint">Type a valid email to see alerts.</p>
      )}

      {isEmail && loading && alerts === null && (
        <p className="mt-4 text-sm text-ink-soft" data-testid="manage-loading">
          Loading…
        </p>
      )}

      {isEmail && alerts !== null && alerts.length === 0 && (
        <p className="mt-4 text-sm text-ink-soft" data-testid="manage-empty">
          No alerts for {email} yet — create one above.
        </p>
      )}

      {error && (
        <p className="mt-4 text-xs text-coral-ink" data-testid="manage-error" role="alert">
          {error}
        </p>
      )}

      {isEmail && alerts && alerts.length > 0 && (
        <ul className="mt-6 space-y-3" data-testid="manage-list">
          {alerts.map((a) => (
            <li
              key={a.id}
              data-testid="manage-row"
              className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-canvas/40 p-4 sm:flex-row sm:items-center"
            >
              <div className="flex-1">
                <div className="text-sm font-semibold text-ink">
                  {a.sailing_id ? a.sailing_id : (a.sailing_url || 'Any sailing')}
                </div>
                <div className="text-xs text-ink-soft">
                  Created {new Date(a.created_at + (a.created_at.includes('Z') ? '' : 'Z')).toLocaleDateString()}
                  {a.last_notified_at
                    ? ` · last pinged ${new Date(a.last_notified_at + (a.last_notified_at.includes('Z') ? '' : 'Z')).toLocaleString()}`
                    : ' · never pinged'}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-ink-soft">
                <span>Threshold</span>
                <input
                  data-testid="manage-threshold"
                  type="number"
                  min={5}
                  max={50}
                  step={1}
                  value={a.threshold_pct}
                  onChange={(e) => setThreshold(a, Number(e.target.value))}
                  disabled={pulseId === a.id}
                  className="w-16 rounded-lg border border-black/[0.1] px-2 py-1 text-sm"
                />
                <span>%</span>
              </label>

              <button
                data-testid="manage-toggle"
                onClick={() => setActive(a, !a.is_active)}
                disabled={pulseId === a.id}
                className={`min-h-[44px] rounded-full px-4 py-2 text-xs font-bold transition ${
                  a.is_active
                    ? 'border border-mint-ink/30 bg-mint-soft text-mint-ink hover:bg-mint-ink hover:text-white'
                    : 'border border-ink-faint/30 bg-white text-ink-soft hover:text-ink'
                }`}
              >
                {a.is_active ? 'Active · click to pause' : 'Paused · click to resume'}
              </button>

              <button
                data-testid="manage-remove"
                onClick={() => remove(a)}
                disabled={pulseId === a.id}
                className="min-h-[44px] rounded-full border border-coral-ink/30 bg-coral-soft px-4 py-2 text-xs font-bold text-coral-ink hover:bg-coral-ink hover:text-white"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
