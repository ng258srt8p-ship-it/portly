'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/Footer';
import { useState } from 'react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AlertsPage() {
  const [email, setEmail] = useState('');
  const [sailingUrl, setSailingUrl] = useState('');
  const [emailError, setEmailError] = useState('');
  const [urlError, setUrlError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const isEmailValid = email.length > 0 ? EMAIL_REGEX.test(email) : true;
  const isUrlValid = sailingUrl.length === 0 || sailingUrl.trim().length > 0;

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (e.target.value.length > 0 && !EMAIL_REGEX.test(e.target.value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSailingUrl(e.target.value);
    if (e.target.value.length > 0 && !e.target.value.trim()) {
      setUrlError('Please enter a sailing URL or ID');
    } else {
      setUrlError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_BASE}/api/alerts/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, sailingUrl }),
      });
      const json = await res.json();
      if (json.success) {
        setSubscribed(true);
      } else {
        setEmailError(json.error || 'Failed to create alert');
      }
    } catch (err: any) {
      setEmailError(err.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = email.length > 0 && EMAIL_REGEX.test(email) && (sailingUrl.length === 0 || sailingUrl.trim().length > 0);

  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 px-4 sm:px-6" id="main-content">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-4xl font-extrabold text-ink sm:text-5xl">Price Alerts</h1>
          <p className="mt-4 text-lg text-ink-soft">
            Get notified the moment your tracked sailing drops in price or a solo waiver appears.
          </p>

          <div className="mt-12 space-y-6">
            <div className="rounded-3xl border border-black/[0.05] bg-white p-8 shadow-float">
              <h2 className="font-display text-xl font-bold text-ink">Create New Alert</h2>
              <div className="mt-6 space-y-4">
                {subscribed && (
                  <div className="rounded-xl border border-emerald-500/15 bg-emerald-50 p-4" role="alert">
                    <p className="text-sm font-medium text-emerald-800">
                      Alert created! You&apos;ll receive an email at {email} when price changes are detected.
                    </p>
                    <button
                      onClick={() => setSubscribed(false)}
                      className="mt-2 text-xs text-emerald-600 underline hover:text-emerald-800"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                <form onSubmit={handleSubmit}>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint" htmlFor="alert-email">
                      Email <span className="text-coral-ink">*</span>
                    </label>
                    <input
                      id="alert-email"
                      type="email"
                      aria-label="Email address"
                      aria-invalid={!!emailError}
                      aria-describedby={emailError ? 'email-error' : undefined}
                      value={email}
                      onChange={handleEmailChange}
                      placeholder="you@example.com"
                      className={`mt-1 w-full rounded-2xl border px-4 py-3 text-sm text-ink outline-none focus:border-indigo ${
                        emailError ? 'border-coral-ink' : 'border-black/[0.08]'
                      }`}
                      data-testid="alert-email-input"
                    />
                    {emailError && (
                      <p id="email-error" className="mt-1 text-xs text-coral-ink" role="alert">
                        {emailError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-ink-faint" htmlFor="alert-sailing">
                      Sailing URL or ID <span className="text-coral-ink">*</span>
                    </label>
                    <input
                      id="alert-sailing"
                      type="text"
                      aria-label="Sailing URL or ID"
                      aria-invalid={!!urlError}
                      aria-describedby={urlError ? 'url-error' : undefined}
                      value={sailingUrl}
                      onChange={handleUrlChange}
                      placeholder="Paste a sailing link or ID"
                      className={`mt-1 w-full rounded-2xl border px-4 py-3 text-sm text-ink outline-none focus:border-indigo ${
                        urlError ? 'border-coral-ink' : 'border-black/[0.08]'
                      }`}
                      data-testid="alert-sailing-input"
                    />
                    {urlError && (
                      <p id="url-error" className="mt-1 text-xs text-coral-ink" role="alert">
                        {urlError}
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!isFormValid || submitting}
                    className={`rounded-full px-8 py-3 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(42,68,231,0.55)] ${
                      isFormValid && !submitting
                        ? 'bg-indigo hover:bg-indigo-dark'
                        : 'bg-indigo/50 cursor-not-allowed'
                    }`}
                    data-testid="alert-submit"
                  >
                    {submitting ? 'Creating...' : 'Create Alert'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
