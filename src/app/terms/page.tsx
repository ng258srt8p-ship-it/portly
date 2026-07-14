import Link from 'next/link';
import { Metadata } from 'next';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

export const metadata: Metadata = {
  title: 'Terms of Service - TripTide',
  description: 'TripTide Terms of Service - Terms and conditions for using our cruise price tracking service.',
};

export default function TermsPage() {
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
              <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-coral" />
              Terms of Service
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.15] tracking-tight text-ink sm:text-6xl sm:leading-[1.1]">
              Terms of Service
            </h1>
            <p className="mt-4 text-ink-soft">
              Last updated: July 13, 2026
            </p>
          </section>

          <section className="space-y-12">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">1. Acceptance of Terms</h2>
              <p className="mt-4 text-ink-soft">
                By accessing or using TripTide ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these Terms, you may not use the Service.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">2. Description of Service</h2>
              <p className="mt-4 text-ink-soft">
                TripTide is an independent cruise price tracking and forecasting platform. We provide:
              </p>
              <ul className="mt-4 space-y-3 list-disc list-inside text-ink-soft">
                <li>Live cruise fare monitoring across major cruise lines</li>
                <li>Out-the-door price calculations (base fare + port fees + gratuities)</li>
                <li>AI-powered deal analysis and price forecasting</li>
                <li>Price alert notifications for tracked sailings</li>
                <li>Historical price trend visualization</li>
              </ul>
              <p className="mt-4 text-ink-soft">
                We are <strong>not a travel agency</strong>. We do not sell cruises, process bookings, or handle payments. We provide pricing intelligence to help you make informed decisions. All bookings are completed on third-party websites.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">3. Eligibility</h2>
              <p className="mt-4 text-ink-soft">
                You must be at least 18 years old to use this Service. By using TripTide, you represent and warrant that you are at least 18 years old and have the legal capacity to enter into these Terms.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">4. User Accounts</h2>
              <p className="mt-4 text-ink-soft">
                You may create an account to save alerts and preferences. You are responsible for:
              </p>
              <ul className="mt-4 space-y-3 list-disc list-inside text-ink-soft">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>
              <p className="mt-4 text-ink-soft">
                We reserve the right to suspend or terminate accounts that violate these Terms.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">5. Price Alerts & Notifications</h2>
              <p className="mt-4 text-ink-soft">
                You may set price alerts for specific sailings. We will notify you when prices change. Notifications are delivered via email. We do not guarantee delivery timing or that alerts will capture every price change.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">6. Intellectual Property</h2>
              <p className="mt-4 text-ink-soft">
                The Service and its original content (excluding user-provided content), features, and functionality are owned by TripTide, Inc. and are protected by international copyright, trademark, and other intellectual property laws. Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">7. Disclaimers</h2>
              <p className="mt-4 text-ink-soft">
                <strong>Pricing Accuracy:</strong> We strive for accuracy but do not guarantee that prices displayed are current, complete, or error-free. Prices change frequently and may vary by cabin, occupancy, and booking date. Always verify final price on the booking site before purchasing.
              </p>
              <p className="mt-4 text-ink-soft">
                <strong>No Travel Advice:</strong> TripTide provides pricing data and analysis, not travel advice. We are not responsible for travel decisions made based on our data.
              </p>
              <p className="mt-4 text-ink-soft">
                <strong>No Booking Guarantee:</strong> We do not guarantee availability, confirm bookings, or process payments. All bookings are subject to the terms of the booking site and cruise line.
              </p>
              <p className="mt-4 text-ink-soft">
                <strong>AI-Generated Content:</strong> Deal analyses and price forecasts are generated by AI (NVIDIA Nemotron 3 Ultra via NVIDIA NIM). While we strive for accuracy, AI can make errors. Always verify critical information independently.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">8. Limitation of Liability</h2>
              <p className="mt-4 text-ink-soft">
                To the maximum extent permitted by law, TripTide, Inc. shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use or inability to use the Service.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">9. Indemnification</h2>
              <p className="mt-4 text-ink-soft">
                You agree to indemnify and hold harmless TripTide, Inc., its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including reasonable attorneys' fees) arising out of your use of the Service or violation of these Terms.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">10. Termination</h2>
              <p className="mt-4 text-ink-soft">
                We may suspend or terminate your access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties. Upon termination, your right to use the Service ceases immediately.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">11. Governing Law</h2>
              <p className="mt-4 text-ink-soft">
                These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law provisions. Any disputes shall be resolved in the state or federal courts located in Delaware.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">12. Changes to Terms</h2>
              <p className="mt-4 text-ink-soft">
                We may modify these Terms at any time. Material changes will be posted on this page with an updated "Last updated" date. Continued use of the Service after changes constitutes acceptance of the new Terms.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">13. Contact</h2>
              <p className="mt-4 text-ink-soft">
                Questions about these Terms? Contact us at:
              </p>
              <ul className="mt-4 space-y-2 list-disc list-inside text-ink-soft">
                <li>Email: <a href="mailto:legal@triptide.net" className="text-indigo hover:underline">legal@triptide.net</a></li>
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