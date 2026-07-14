import Link from "next/link";
import { Metadata } from "next";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export const metadata: Metadata = {
  title: "About TripTide",
  description:
    "Learn about TripTide - the independent cruise price tracking and forecasting engine.",
};

export default function AboutPage() {
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
          {/* Hero Section */}
          <section className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint shadow-float">
              <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-coral" />
              About TripTide
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.15] tracking-tight text-ink sm:text-6xl sm:leading-[1.1]">
              The Cruise Price Engine That Works For You
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-ink-soft sm:text-xl">
              TripTide is an independent cruise price tracking and forecasting
              platform. We monitor fares across every major line so you never
              overpay for a stateroom again.
            </p>
          </section>

          {/* Mission */}
          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              Our Mission
            </h2>
            <div className="mt-6 space-y-6">
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-mist text-indigo">
                    <MaterialIcon
                      name="search"
                      size="lg"
                      className="text-indigo"
                    />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-ink">
                      Transparency First
                    </h3>
                    <p className="mt-2 text-ink-soft">
                      We surface the true out-the-door price — base fare, port
                      taxes, and mandatory gratuities bundled into one honest
                      number. No hidden fees. No surprise charges at checkout.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-mist text-indigo">
                    <MaterialIcon
                      name="track_changes"
                      size="lg"
                      className="text-indigo"
                    />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-ink">
                      Live Intelligence
                    </h3>
                    <p className="mt-2 text-ink-soft">
                      TripTide polls thousands of sailings around the clock
                      across every major cabin category and cruise line. Our
                      pricing engine refreshes every 4 hours, so you always see
                      the latest fares.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-mist text-indigo">
                    <MaterialIcon
                      name="psychology"
                      size="lg"
                      className="text-indigo"
                    />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-ink">
                      Insider Analysis
                    </h3>
                    <p className="mt-2 text-ink-soft">
                      Our AI-powered deal analysis reads like a cruise expert
                      wrote it — because it was trained on one. Get deal scores,
                      pricing deep-dives, ship experience notes, and booking
                      recommendations backed by real data.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-mist text-indigo">
                    <MaterialIcon
                      name="notifications_active"
                      size="lg"
                      className="text-indigo"
                    />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-ink">
                      You Get Notified First
                    </h3>
                    <p className="mt-2 text-ink-soft">
                      The moment your tracked sailing drops or a solo supplement
                      waiver appears, you're the first to know. Set it and
                      forget it — we'll watch the tide for you.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              How It Works
            </h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              <div className="relative pl-10">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-mist text-indigo">
                  <MaterialIcon
                    name="hourglass_top"
                    size="lg"
                    className="text-indigo"
                  />
                </div>
                <p className="font-mono-tab text-xs font-semibold text-ink-faint">
                  01
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold text-ink">
                  We Track
                </h3>
                <p className="mt-2 text-ink-soft">
                  Our engine polls live fares across 8+ major cruise lines, 180+
                  ships, and 10M+ price points every 4 hours. Base fare, port
                  fees, gratuities — all captured.
                </p>
              </div>
              <div className="relative pl-10">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-mist text-indigo">
                  <MaterialIcon
                    name="analytics"
                    size="lg"
                    className="text-indigo"
                  />
                </div>
                <p className="font-mono-tab text-xs font-semibold text-ink-faint">
                  02
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold text-ink">
                  We Analyze
                </h3>
                <p className="mt-2 text-ink-soft">
                  Our AI evaluates every sailing against market averages,
                  historical trends, ship-specific context, and seasonal
                  patterns. Each deal gets a score, a verdict, and insider tips.
                </p>
              </div>
              <div className="relative pl-10">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-mist text-indigo">
                  <MaterialIcon
                    name="notifications_active"
                    size="lg"
                    className="text-indigo"
                  />
                </div>
                <p className="font-mono-tab text-xs font-semibold text-ink-faint">
                  03
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold text-ink">
                  You Decide
                </h3>
                <p className="mt-2 text-ink-soft">
                  You get clear deal scores, price forecasts, and booking links.
                  No pressure. No spam. Just the data you need to book with
                  confidence.
                </p>
              </div>
            </div>
          </section>

          {/* Tech Stack */}
          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              Built Different
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
                  App Router, Server Components, parallel routes for instant
                  navigation.
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
                  AI-powered deal analysis and forecasting via
                  hardware-accelerated inference.
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

          {/* Principles */}
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

          {/* CTA */}
          <section className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint shadow-float">
              <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-coral" />
              Ready to catch the deal?
            </span>
            <h2 className="mt-4 font-display text-4xl font-extrabold text-ink sm:text-5xl">
              Find Your Perfect Voyage
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-ink-soft">
              Every card is powered by live fare polling — we flag the sailings
              where the tide has genuinely turned in your favor.
            </p>
            <Link
              href="/deals"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-indigo px-6 py-3 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(42,68,231,0.55)] transition-all hover:bg-indigo-dark hover:shadow-[0_12px_28px_-8px_rgba(42,68,231,0.65)] active:scale-[0.97]"
            >
              Explore All Deals
              <MaterialIcon
                name="arrow_forward"
                size="sm"
                className="leading-none select-none text-[16px]"
                aria-hidden="true"
              />
            </Link>
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
