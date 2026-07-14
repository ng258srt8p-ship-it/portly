import Link from "next/link";
import { Metadata } from "next";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export const metadata: Metadata = {
  title: "Careers - TripTide",
  description:
    "Join the TripTide team. We're building the future of cruise price intelligence.",
};

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:px-6">
        <div className="w-full max-w-6xl">
          <div className="flex w-full flex-nowrap items-center justify-between gap-3 rounded-full border px-3 py-2.5 backdrop-blur-xl transition-all duration-300 sm:px-4 border-transparent bg-white/40">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo text-white">
                <MaterialIcon
                  name="directions_boat_filled"
                  size="sm"
                  className="text-white"
                />
              </span>
              <span className="whitespace-nowrap font-display text-lg font-bold text-ink sm:text-xl">
                TripTide
              </span>
            </Link>
            <nav className="hidden min-w-0 items-center gap-1 rounded-full bg-black/[0.03] p-1 lg:flex">
              <Link
                href="/deals"
                className="whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink xl:px-4"
              >
                Explore Deals
              </Link>
              <Link
                href="/history"
                className="whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink xl:px-4"
              >
                Price History Maps
              </Link>
              <Link
                href="/solo"
                className="whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink xl:px-4"
              >
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
        <div className="mx-auto max-w-4xl">
          <section className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint shadow-float">
              <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-coral"></span>
              Join the Crew
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.15] tracking-tight text-ink sm:text-6xl sm:leading-[1.1]">
              Build the Future of Cruise Intelligence
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-ink-soft sm:text-xl">
              We're a small, high-autonomy team building the first truly
              transparent cruise price engine. No bureaucracy. Real impact.
            </p>
          </section>

          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              Open Roles
            </h2>
            <div className="mt-8 space-y-6">
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-ink">
                      Founding Engineer (Full Stack)
                    </h3>
                    <p className="mt-1 text-ink-soft">
                      TypeScript, Next.js 14, PostgreSQL, NVIDIA NIM. You'll own
                      features end-to-end.
                    </p>
                  </div>
                  <a
                    href="mailto:careers@triptide.net?subject=Application:%20Founding%20Engineer"
                    className="shrink-0 rounded-full bg-indigo px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-dark"
                  >
                    Apply
                  </a>
                </div>
              </div>
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-ink">
                      ML/AI Engineer
                    </h3>
                    <p className="mt-1 text-ink-soft">
                      NVIDIA NIM, Nemotron, prompt engineering, price
                      forecasting models. PhD not required.
                    </p>
                  </div>
                  <a
                    href="mailto:careers@triptide.net?subject=Application:%20ML%2FAI%20Engineer"
                    className="shrink-0 rounded-full bg-indigo px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-dark"
                  >
                    Apply
                  </a>
                </div>
              </div>
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-ink">
                      Data Engineer
                    </h3>
                    <p className="mt-1 text-ink-soft">
                      PostgreSQL, data pipelines, 10M+ pricing snapshots. You
                      make the data trustworthy.
                    </p>
                  </div>
                  <a
                    href="mailto:careers@triptide.net?subject=Application:%20Data%20Engineer"
                    className="shrink-0 rounded-full bg-indigo px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-dark"
                  >
                    Apply
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              Why TripTide?
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon name="bolt" size="lg" className="text-indigo" />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  High Autonomy
                </h3>
                <p className="mt-2 text-ink-soft">
                  No micromanagement. You own problems end-to-end and ship
                  directly to production.
                </p>
              </div>
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon name="work" size="lg" className="text-indigo" />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Real Impact
                </h3>
                <p className="mt-2 text-ink-soft">
                  Every line of code saves travelers money. Your work directly
                  saves people money on cruises.
                </p>
              </div>
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon
                    name="groups"
                    size="lg"
                    className="text-indigo"
                  />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Small Team, Big Problems
                </h3>
                <p className="mt-2 text-ink-soft">
                  Join a tight-knit crew solving hard problems in pricing, ML,
                  and travel tech.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              Our Stack
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-4">
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon name="code" size="lg" className="text-indigo" />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  TypeScript + Next.js 14
                </h3>
                <p className="mt-2 text-sm text-ink-soft">
                  App Router, Server Components, parallel routes.
                </p>
              </div>
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon
                    name="storage"
                    size="lg"
                    className="text-indigo"
                  />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  PostgreSQL + Prisma
                </h3>
                <p className="mt-2 text-sm text-ink-soft">
                  10M+ pricing snapshots, reliable relational storage.
                </p>
              </div>
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon
                    name="psychology"
                    size="lg"
                    className="text-indigo"
                  />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  NVIDIA NIM + Nemotron 3 Ultra
                </h3>
                <p className="mt-2 text-sm text-ink-soft">
                  AI-powered analysis and forecasting via hardware-accelerated
                  inference.
                </p>
              </div>
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon name="bolt" size="lg" className="text-indigo" />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  4-Hour Sync Cycle
                </h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Automated pipeline refreshes 200+ sailings, 1800+ ships, 10M+
                  price points daily.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              Our Principles
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon
                    name="thumb_up"
                    size="lg"
                    className="text-indigo"
                  />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  No Affiliate Bias
                </h3>
                <p className="mt-2 text-ink-soft">
                  We don't take commissions from cruise lines. Our only
                  incentive is your trust.
                </p>
              </div>
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon
                    name="verified"
                    size="lg"
                    className="text-indigo"
                  />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Data Integrity
                </h3>
                <p className="mt-2 text-ink-soft">
                  Every price is traceable to its source with timestamps. No
                  synthetic data. No estimates.
                </p>
              </div>
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon
                    name="public"
                    size="lg"
                    className="text-indigo"
                  />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Open by Default
                </h3>
                <p className="mt-2 text-ink-soft">
                  Our APIs are documented and available for developers. Build on
                  top of TripTide.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              Benefits
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon
                    name="health_and_safety"
                    size="lg"
                    className="text-indigo"
                  />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Health & Wellness
                </h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Comprehensive medical, dental, vision. Mental health stipend.
                </p>
              </div>
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon
                    name="beach_access"
                    size="lg"
                    className="text-indigo"
                  />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Unlimited PTO
                </h3>
                <p className="mt-2 text-sm text-ink-soft">
                  Take what you need. Minimum 3 weeks encouraged annually.
                </p>
              </div>
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon
                    name="computer"
                    size="lg"
                    className="text-indigo"
                  />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Top-Tier Equipment
                </h3>
                <p className="mt-2 text-sm text-ink-soft">
                  MacBook Pro (M3 Max), 32" 4K monitor, mechanical keyboard of
                  choice.
                </p>
              </div>
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon
                    name="school"
                    size="lg"
                    className="text-indigo"
                  />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Learning Budget
                </h3>
                <p className="mt-2 text-sm text-ink-soft">
                  $3,000/year for courses, conferences, books, certifications.
                </p>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint shadow-float">
              <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-coral"></span>
              Ready to ship?
            </span>
            <h2 className="mt-4 font-display text-4xl font-extrabold text-ink sm:text-5xl">
              Your next adventure starts here
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-ink-soft">
              Send us your GitHub, portfolio, or just a note about what you've
              built.
            </p>
            <a
              href="mailto:careers@triptide.net"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-indigo px-6 py-3 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(42,68,231,0.55)] transition-all hover:bg-indigo-dark hover:shadow-[0_12px_28px_-8px_rgba(42,68,231,0.65)] active:scale-[0.97]"
            >
              <MaterialIcon name="mail" size="sm" className="text-white" />
              Email careers@triptide.net
            </a>
          </section>
        </div>
      </main>

      <footer className="border-t border-black/[0.06] bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-10 md:flex-row">
            <div className="max-w-sm">
              <Link href="/" className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo text-white">
                  <MaterialIcon
                    name="directions_boat_filled"
                    size="sm"
                    className="text-white"
                  />
                </span>
                <span className="font-display text-xl font-bold text-ink">
                  TripTide
                </span>
              </Link>
              <p className="mt-4 text-sm text-ink-soft">
                An independent cruise price tracking and forecasting engine. We
                monitor fares across every major line so you never overpay for a
                stateroom again.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Product
                </p>
                <ul className="mt-4 space-y-3">
                  <li>
                    <Link
                      href="/deals"
                      className="text-sm text-ink-soft hover:text-indigo"
                    >
                      Explore Deals
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/history"
                      className="text-sm text-ink-soft hover:text-indigo"
                    >
                      Price History Maps
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/solo"
                      className="text-sm text-ink-soft hover:text-indigo"
                    >
                      Solo Hub
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/alerts"
                      className="text-sm text-ink-soft hover:text-indigo"
                    >
                      Price Alerts
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Company
                </p>
                <ul className="mt-4 space-y-3">
                  <li>
                    <Link
                      href="/about"
                      className="text-sm text-ink-soft hover:text-indigo"
                    >
                      About
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/press"
                      className="text-sm text-ink-soft hover:text-indigo"
                    >
                      Press
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/careers"
                      className="text-sm text-ink-soft hover:text-indigo"
                    >
                      Careers
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/contact"
                      className="text-sm text-ink-soft hover:text-indigo"
                    >
                      Contact
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Legal
                </p>
                <ul className="mt-4 space-y-3">
                  <li>
                    <Link
                      href="/privacy"
                      className="text-sm text-ink-soft hover:text-indigo"
                    >
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/terms"
                      className="text-sm text-ink-soft hover:text-indigo"
                    >
                      Terms
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/disclosure"
                      className="text-sm text-ink-soft hover:text-indigo"
                    >
                      Fare Disclosure
                    </Link>
                  </li>
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
    </div>
  );
}
