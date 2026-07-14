'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/Footer';
import { useState } from 'react';

export default function AlertsPage() {
  const [email, setEmail] = useState('');
  const [sailingUrl, setSailingUrl] = useState('');

  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-4xl font-extrabold text-ink sm:text-5xl">Price Alerts</h1>
          <p className="mt-4 text-lg text-ink-soft">
            Get notified the moment your tracked sailing drops in price or a solo waiver appears.
          </p>

          <div className="mt-12 space-y-6">
            <div className="rounded-3xl border border-black/[0.05] bg-white p-8 shadow-float">
              <h2 className="font-display text-xl font-bold text-ink">Create New Alert</h2>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1 w-full rounded-2xl border border-black/[0.08] px-4 py-3 text-sm text-ink outline-none focus:border-indigo"
                    data-testid="alert-email-input"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Sailing URL or ID</label>
                  <input
                    type="text"
                    value={sailingUrl}
                    onChange={(e) => setSailingUrl(e.target.value)}
                    placeholder="Paste a sailing link or ID"
                    className="mt-1 w-full rounded-2xl border border-black/[0.08] px-4 py-3 text-sm text-ink outline-none focus:border-indigo"
                    data-testid="alert-sailing-input"
                  />
                </div>
                <button className="rounded-full bg-indigo px-8 py-3 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(42,68,231,0.55)] hover:bg-indigo-dark" data-testid="alert-submit">
                  Create Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
