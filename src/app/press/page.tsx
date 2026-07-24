import Link from "next/link";
import { Metadata } from "next";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Press - TripTide",
  description: "Press kit and media resources for TripTide.",
};

export default function PressPage() {
  return (
    <>
      <Header />
      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <section className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint shadow-float">
              <span className="h-1.5 w-1.5 rounded-full bg-coral"></span>
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
                      Plus Jakarta Sans (Display)
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
              <span className="h-1.5 w-1.5 rounded-full bg-coral"></span>
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
      <Footer />
    </>
  );
}
