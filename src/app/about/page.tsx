import Link from "next/link";
import { Metadata } from "next";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "About TripTide",
  description:
    "Learn about TripTide - the independent cruise price tracking and forecasting engine.",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Hero Section */}
          <section className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint shadow-float">
              <span className="h-1.5 w-1.5 rounded-full bg-coral" />
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
              <span className="h-1.5 w-1.5 rounded-full bg-coral" />
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
      <Footer />
    </>
  );
}
