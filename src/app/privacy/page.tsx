import Link from 'next/link';
import { Metadata } from 'next';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

export const metadata: Metadata = {
  title: 'Privacy Policy - TripTide',
  description: 'TripTide Privacy Policy - How we collect, use, and protect your information.',
};

export default function PrivacyPage() {
  const lastUpdated = 'July 13, 2026';

  return (
    <main className="min-h-screen bg-canvas">
      <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:px-6">
        <div className="w-full max-w-6xl">
          <div className="flex w-full flex-nowrap items-center justify-between gap-3 rounded-full border px-3 py-2.5 backdrop-blur-xl transition-all duration-300 sm:px-4 border-transparent bg-white/40">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo text-white">
                <MaterialIcon name="directions_boat_filled" size="sm" className="text-white" />
              </span>
              <span className="whitespace-nowrap font-display text-lg font-bold text-ink sm:text-xl">TripTide</span>
            </Link>
            <nav className="hidden min-w-0 items-center gap-1 rounded-full bg-black/[0.03] p-1 lg:flex">
              <Link href="/deals" className="whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink xl:px-4">
                Explore Deals
              </Link>
              <Link href="/history" className="whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink xl:px-4">
                Price History Maps
              </Link>
              <Link href="/solo" className="whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink xl:px-4">
                Solo Hub
              </Link>
            </nav>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/alerts"
                className="hidden shrink-0 whitespace-nowrap rounded-full bg-indigo px-4 py-2.5 text-xs font-semibold text-white shadow-[0_8px_20px_-6px_rgba(42,68,231,0.55)] hover:bg-indigo-dark active:scale-[0.97] sm:block sm:text-sm lg:px-5"
              >
                Create Price Alert
              </Link>
              <Link
                href="/alerts"
                className="block shrink-0 whitespace-nowrap rounded-full bg-indigo px-3.5 py-2.5 text-xs font-semibold text-white shadow-[0_8px_20px_-6px_rgba(42,68,231,0.55)] hover:bg-indigo-dark active:scale-[0.97] sm:hidden"
              >
                Alert
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <section className="mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint shadow-float">
              <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-coral"></span>
              Privacy Policy
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.15] tracking-tight text-ink sm:text-6xl sm:leading-[1.1]">
              Privacy Policy
            </h1>
            <p className="mt-4 text-ink-soft">
              Last updated: {lastUpdated}
            </p>
          </section>

          <section className="space-y-12">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">1. Information We Collect</h2>
              <p className="mt-4 text-ink-soft">
                We collect only the information necessary to provide our cruise price tracking and alerting services:
              </p>
              <ul className="mt-4 space-y-3 list-disc list-inside text-ink-soft">
                <li><strong>Account Information:</strong> Email address (for alerts and notifications)</li>
                <li><strong>Alert Preferences:</strong> Sailing IDs, price thresholds, cabin types you want to track</li>
                <li><strong>Usage Data:</strong> Page views, feature interactions, search queries (anonymized)</li>
                <li><strong>Technical Data:</strong> IP address, browser type, device information (for security and analytics)</li>
              </ul>
              <p className="mt-4 text-ink-soft">
                We do <strong>not</strong> collect: payment information, social security numbers, passport details, or precise location data.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">2. How We Use Your Information</h2>
              <ul className="mt-4 space-y-3 list-disc list-inside text-ink-soft">
                <li>Deliver price alerts and notifications for your tracked sailings</li>
                <li>Personalize your deal recommendations based on tracked preferences</li>
                <li>Improve our price forecasting models (aggregated, anonymized)</li>
                <li>Send occasional service updates (you can unsubscribe anytime)</li>
                <li>Security monitoring and fraud prevention</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">3. Information Sharing</h2>
              <p className="mt-4 text-ink-soft">
                We do <strong>not</strong> sell your personal information. We share data only in these limited circumstances:
              </p>
              <ul className="mt-4 space-y-3 list-disc list-inside text-ink-soft">
                <li><strong>Service Providers:</strong> Email delivery (transactional alerts only), hosting, analytics (anonymized)</li>
                <li><strong>Legal Requirements:</strong> When required by law, court order, or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets (with notice)</li>
              </ul>
              <p className="mt-4 text-ink-soft">
                We do <strong>not</strong> share your data with cruise lines, travel agencies, or third-party marketers for their own purposes.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">4. Data Retention</h2>
              <ul className="mt-4 space-y-3 list-disc list-inside text-ink-soft">
                <li>Account data: Retained while your account is active</li>
                <li>Alert preferences: Retained until you delete the alert or account</li>
                <li>Anonymized analytics: Retained indefinitely for product improvement</li>
                <li>Security logs: 90 days</li>
              </ul>
              <p className="mt-4 text-ink-soft">
                You can request deletion of your account and all associated data at any time by emailing hello@triptide.net.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">5. Your Rights</h2>
              <p className="mt-4 text-ink-soft">
                Depending on your location, you may have the right to:
              </p>
              <ul className="mt-4 space-y-3 list-disc list-inside text-ink-soft">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Restrict or object to processing</li>
                <li>Data portability</li>
                <li>Withdraw consent (where processing is based on consent)</li>
              </ul>
              <p className="mt-4 text-ink-soft">
                To exercise these rights, email hello@triptide.net with "Privacy Request" in the subject line.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">6. Security</h2>
              <ul className="mt-4 space-y-3 list-disc list-inside text-ink-soft">
                <li>All data transmitted over TLS 1.2+</li>
                <li>Database encryption at rest (AES-256)</li>
                <li>Regular security audits and penetration testing</li>
                <li>Minimal data collection principle — we only store what we need</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">7. Cookies & Tracking</h2>
              <p className="mt-4 text-ink-soft">
                We use minimal cookies:
              </p>
              <ul className="mt-4 space-y-3 list-disc list-inside text-ink-soft">
                <li><strong>Essential:</strong> Session management, CSRF protection (required for service)</li>
                <li><strong>Analytics:</strong> Anonymous page view tracking (no personal identifiers)</li>
                <li><strong>No:</strong> Advertising cookies, third-party tracking pixels, fingerprinting</li>
              </ul>
              <p className="mt-4 text-ink-soft">
                You can disable non-essential cookies in your browser settings without affecting core functionality.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">8. International Transfers</h2>
              <p className="mt-4 text-ink-soft">
                TripTide is hosted in the United States. If you access our service from outside the US, your data will be transferred to and processed in the US. We implement appropriate safeguards (Standard Contractual Clauses) for international data transfers.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">9. Children's Privacy</h2>
              <p className="mt-4 text-ink-soft">
                TripTide is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us immediately.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">10. Changes to This Policy</h2>
              <p className="mt-4 text-ink-soft">
                We may update this policy from time to time. Material changes will be notified via email (if you have an account) or prominently on our website. The "Last updated" date at the top reflects the most recent revision.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">11. Contact Us</h2>
              <p className="mt-4 text-ink-soft">
                Questions about this policy or your data? Contact us:
              </p>
              <ul className="mt-4 space-y-2 list-disc list-inside text-ink-soft">
                <li>Email: <a href="mailto:privacy@triptide.net" className="text-indigo hover:underline">privacy@triptide.net</a></li>
                <li>Mail: TripTide, Inc., [Address], [City, State ZIP]</li>
              </ul>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-black/[0.06] bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-10 md:flex-row">
            <div className="max-w-sm">
              <Link href="/" className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo text-white">
                  <MaterialIcon name="directions_boat_filled" size="sm" className="text-white" />
                </span>
                <span className="font-display text-xl font-bold text-ink">TripTide</span>
              </Link>
              <p className="mt-4 text-sm text-ink-soft">
                An independent cruise price tracking and forecasting engine. We monitor fares across every major line so you never overpay for a stateroom again.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Product</p>
                <ul className="mt-4 space-y-3">
                  <li><Link href="/deals" className="text-sm text-ink-soft hover:text-indigo">Explore Deals</Link></li>
                  <li><Link href="/history" className="text-sm text-ink-soft hover:text-indigo">Price History Maps</Link></li>
                  <li><Link href="/solo" className="text-sm text-ink-soft hover:text-indigo">Solo Hub</Link></li>
                  <li><Link href="/alerts" className="text-sm text-ink-soft hover:text-indigo">Price Alerts</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Company</p>
                <ul className="mt-4 space-y-3">
                  <li><Link href="/about" className="text-sm text-ink-soft hover:text-indigo">About</Link></li>
                  <li><Link href="/press" className="text-sm text-ink-soft hover:text-indigo">Press</Link></li>
                  <li><Link href="/careers" className="text-sm text-ink-soft hover:text-indigo">Careers</Link></li>
                  <li><Link href="/contact" className="text-sm text-ink-soft hover:text-indigo">Contact</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Legal</p>
                <ul className="mt-4 space-y-3">
                  <li><Link href="/privacy" className="text-sm text-ink-soft hover:text-indigo">Privacy</Link></li>
                  <li><Link href="/terms" className="text-sm text-ink-soft hover:text-indigo">Terms</Link></li>
                  <li><Link href="/disclosure" className="text-sm text-ink-soft hover:text-indigo">Fare Disclosure</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-black/[0.06] pt-8 text-xs text-ink-faint sm:flex-row">
            <span>© 2026 TripTide, Inc. All rights reserved.</span>
            <span className="font-mono-tab">triptide.net</span>
          </div>
        </div>
      </footer>
    </main>
  );
}