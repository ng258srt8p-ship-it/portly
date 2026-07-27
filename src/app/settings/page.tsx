'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/Footer';

interface AlertPreference {
  email: string;
  default_threshold: number;
  created_at: string | null;
  updated_at: string | null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SettingsPage() {
  const [email, setEmail] = useState('');
  const [threshold, setThreshold] = useState(10);
  const [savedThreshold, setSavedThreshold] = useState<number | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email || !EMAIL_REGEX.test(email)) {
      setSavedThreshold(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/alert-preferences?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((j: AlertPreference) => {
        if (cancelled) return;
        const v = typeof j.default_threshold === 'number' ? j.default_threshold : 10;
        setSavedThreshold(v);
        setThreshold(v);
      })
      .catch(() => {
        if (cancelled) return;
        setSavedThreshold(null);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [email]);

  const save = async () => {
    if (!EMAIL_REGEX.test(email)) {
      setMessage({ kind: 'err', text: 'Enter a valid email first.' });
      return;
    }
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/alert-preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, default_threshold: threshold }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setMessage({ kind: 'err', text: j.error || `Save failed (HTTP ${res.status})` });
        return;
      }
      const j = await res.json();
      setSavedThreshold(threshold);
      setMessage({ kind: 'ok', text: 'Saved — your next alerts will fire at this threshold.' });
    } catch (e: any) {
      setMessage({ kind: 'err', text: e.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 px-4 sm:px-6" id="main-content">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-4xl font-extrabold text-ink sm:text-5xl">Settings</h1>
          <p className="mt-4 text-lg text-ink-soft">
            Set your default price-drop threshold. We&apos;ll apply it to any new alerts you create until you change it.
          </p>

          <div className="mt-10 space-y-6 rounded-3xl border border-black/[0.05] bg-white p-8 shadow-float">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint" htmlFor="settings-email">
                Your email
              </label>
              <input
                id="settings-email"
                data-testid="settings-email"
                type="email"
                aria-label="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-2xl border border-black/[0.08] px-4 py-3 text-sm text-ink outline-none focus:border-indigo"
              />
              {savedThreshold !== null && (
                <p className="mt-2 text-xs text-ink-soft" data-testid="settings-saved-threshold-note">
                  Current stored threshold: <strong>{savedThreshold}%</strong>
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint" htmlFor="settings-threshold">
                  Default drop threshold
                </label>
                <output className="text-sm font-bold text-indigo" data-testid="settings-threshold-output">
                  {threshold}%
                </output>
              </div>
              <input
                id="settings-threshold"
                data-testid="settings-threshold"
                type="range"
                min={5}
                max={50}
                step={1}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                aria-label="Default price drop threshold percent"
                className="mt-3 w-full cursor-pointer accent-indigo"
              />
              <div className="mt-1 flex justify-between text-xs text-ink-faint">
                <span>5% (sensitive)</span>
                <span>50% (rare)</span>
              </div>
            </div>

            <button
              data-testid="settings-save"
              onClick={save}
              disabled={loading || !EMAIL_REGEX.test(email)}
              className={`rounded-full px-8 py-3 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(42,68,231,0.55)] ${
                EMAIL_REGEX.test(email) && !loading
                  ? 'bg-indigo hover:bg-indigo-dark'
                  : 'bg-indigo/50 cursor-not-allowed'
              }`}
            >
              {loading ? 'Saving…' : 'Save settings'}
            </button>

            {message && (
              <p
                data-testid="settings-message"
                role="alert"
                className={`text-sm font-medium ${
                  message.kind === 'ok' ? 'text-emerald-700' : 'text-coral-ink'
                }`}
              >
                {message.text}
              </p>
            )}
          </div>

          <p className="mt-8 text-xs text-ink-faint">
            Tip: you can override the default on a per-alert basis in the <a className="underline" href="/alerts">create-alert</a>
            {' '}form. Existing alerts stay at their original threshold until you edit them.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
