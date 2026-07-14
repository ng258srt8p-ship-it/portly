import Link from "next/link";
import { Metadata } from "next";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export const metadata: Metadata = {
  title: "Press - TripTide",
  description: "Press kit and media resources for TripTide.",
};

export default function PressPage() {
  return (
    <main className="min-h-screen bg-canvas">
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
              Press Kit
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.15] tracking-tight text-ink sm:text-6xl sm:leading-[1.1]">
              Press & Media Resources
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-ink-soft sm:text-xl">
              Everything you need to cover TripTide — logos, screenshots, key
              facts, and contact information.
            </p>
          </section>

          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              Quick Facts
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon
                    name="insights"
                    size="lg"
                    className="text-indigo"
                  />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  What We Do
                </h3>
                <p className="mt-2 text-ink-soft">
                  Cruise price tracking & forecasting across 8+ major lines,
                  180+ ships, 10M+ price points.
                </p>
              </div>
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon
                    name="calendar_month"
                    size="lg"
                    className="text-indigo"
                  />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Founded
                </h3>
                <p className="mt-2 text-ink-soft">2024</p>
              </div>
              <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon
                    name="location_on"
                    size="lg"
                    className="text-indigo"
                  />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Headquarters
                </h3>
                <p className="mt-2 text-ink-soft">
                  [City, State] / Remote-first
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
                  Team Size
                </h3>
                <p className="mt-2 text-ink-soft">
                  [X] engineers, analysts, and cruise experts
                </p>
              </div>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              Logos & Brand Assets
            </h2>
            <div className="mt-8 space-y-6">
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Primary Logo
                </h3>
                <div className="mt-4 flex gap-8 flex-wrap">
                  <div className="rounded-xl border border-black/[0.05] bg-white p-6 shadow-float">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo text-white">
                      <MaterialIcon
                        name="directions_boat_filled"
                        size="xl"
                        className="text-white"
                      />
                    </div>
                    <p className="mt-2 text-sm text-ink-soft">
                      Full color (primary)
                    </p>
                  </div>
                  <div className="rounded-xl border border-black/[0.05] bg-white p-6 shadow-float">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/5">
                      <MaterialIcon
                        name="directions_boat_filled"
                        size="xl"
                        className="text-black/60"
                      />
                    </div>
                    <p className="mt-2 text-sm text-ink-soft">Monochrome</p>
                  </div>
                  <div className="rounded-xl border border-black/[0.05] bg-white p-6 shadow-float">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                      <MaterialIcon
                        name="directions_boat_filled"
                        size="xl"
                        className="text-white"
                      />
                    </div>
                    <p className="mt-2 text-sm text-ink-soft">
                      Icon only (app icon)
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Color Palette
                </h3>
                <div className="mt-4 flex gap-4 flex-wrap">
                  <div className="rounded-xl border border-black/[0.05] bg-white p-4 shadow-float text-center min-w-[120px]">
                    <div className="h-10 w-full rounded-lg bg-indigo mb-2" />
                    <p className="text-sm font-mono text-ink">
                      Indigo
                      <br />
                      #2A44E7
                    </p>
                  </div>
                  <div className="rounded-xl border border-black/[0.05] bg-white p-4 shadow-float text-center min-w-[120px]">
                    <div className="h-10 w-full rounded-lg bg-coral mb-2" />
                    <p className="text-sm font-mono text-ink">
                      Coral
                      <br />
                      #E8191F
                    </p>
                  </div>
                  <div className="rounded-xl border border-black/[0.05] bg-white p-4 shadow-float text-center min-w-[120px]">
                    <div className="h-10 w-full rounded-lg bg-ink mb-2" />
                    <p className="text-sm font-mono text-ink">
                      Ink
                      <br />
                      #000000
                    </p>
                  </div>
                  <div className="rounded-xl border border-black/[0.05] bg-white p-4 shadow-float text-center min-w-[120px]">
                    <div className="h-10 w-full rounded-lg bg-white/10 border border-black/[0.06] mb-2" />
                    <p className="text-sm font-mono text-ink">
                      Canvas
                      <br />
                      #F8F9FA
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Typography
                </h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-black/[0.05] bg-white p-4 shadow-float">
                    <p className="font-display text-2xl font-bold text-ink">
                      Syne (Display)
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      Headlines, hero text, numbers
                    </p>
                  </div>
                  <div className="rounded-xl border border-black/[0.05] bg-white p-4 shadow-float">
                    <p className="font-interface text-base text-ink">
                      Plus Jakarta Sans (UI)
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      Body text, UI, buttons
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              Screenshots & Assets
            </h2>
            <p className="mt-4 text-ink-soft">
              High-resolution screenshots available on request. For now, key
              product views:
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-black/[0.05] bg-white p-4 shadow-float">
                <div className="aspect-video bg-black/5 rounded-lg mb-2" />
                <p className="text-sm font-medium text-ink">
                  Deals Page — Grid View
                </p>
              </div>
              <div className="rounded-xl border border-black/[0.05] bg-white p-4 shadow-float">
                <div className="aspect-video bg-black/5 rounded-lg mb-2" />
                <p className="text-sm font-medium text-ink">
                  Sailing Detail — Cabin Breakdown
                </p>
              </div>
              <div className="rounded-xl border border-black/[0.05] bg-white p-4 shadow-float">
                <div className="aspect-video bg-black/5 rounded-lg mb-2" />
                <p className="text-sm font-medium text-ink">
                  Price History Maps
                </p>
              </div>
              <div className="rounded-xl border border-black/[0.05] bg-white p-4 shadow-float">
                <div className="aspect-video bg-black/5 rounded-lg mb-2" />
                <p className="text-sm font-medium text-ink">
                  Deal Analysis Modal
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-ink-soft">
              Need higher resolution or specific UI states? Email{" "}
              <a
                href="mailto:press@triptide.net"
                className="text-indigo hover:underline"
              >
                press@triptide.net
              </a>
              .
            </p>
          </section>

          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              Media Contact
            </h2>
            <div className="mt-8 rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float max-w-xl">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                <MaterialIcon name="mail" size="lg" className="text-indigo" />
              </div>
              <h3 className="font-display text-lg font-semibold text-ink">
                Press Inquiries
              </h3>
              <p className="mt-2 text-ink-soft">
                For press inquiries, interview requests, or media partnerships:
              </p>
              <div className="mt-4 space-y-3">
                <a
                  href="mailto:press@triptide.net"
                  className="flex w-full items-center gap-4 rounded-2xl border border-black/[0.05] bg-white p-4 shadow-float transition-all hover:border-indigo/30 hover:shadow-float-lg"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                    <MaterialIcon
                      name="mail"
                      size="lg"
                      className="text-indigo"
                    />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink">
                      press@triptide.net
                    </h3>
                    <p className="mt-1 text-ink-soft">Primary media contact</p>
                  </div>
                </a>
                <a
                  href="https://calendly.com/triptide/media"
                  className="flex w-full items-center gap-4 rounded-2xl border border-black/[0.05] bg-white p-4 shadow-float transition-all hover:border-indigo/30 hover:shadow-float-lg"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                    <MaterialIcon
                      name="event"
                      size="lg"
                      className="text-indigo"
                    />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink">
                      Book a Media Briefing
                    </h3>
                    <p className="mt-1 text-ink-soft">
                      Schedule a 20-min walkthrough with our team
                    </p>
                  </div>
                </a>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint shadow-float">
              <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-coral"></span>
              Covering TripTide?
            </span>
            <h2 className="mt-4 font-display text-4xl font-extrabold text-ink sm:text-5xl">
              We'd love to help
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-ink-soft">
              Logos, data, interviews, demo access — just let us know what you
              need.
            </p>
            <a
              href="mailto:press@triptide.net"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-indigo px-6 py-3 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(42,68,231,0.55)] transition-all hover:bg-indigo-dark hover:shadow-[0_12px_28px_-8px_rgba(42,68,231,0.65)] active:scale-[0.97]"
            >
              <MaterialIcon name="mail" size="sm" className="text-white" />
              Email press@triptide.net
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
    </main>
  );
}
