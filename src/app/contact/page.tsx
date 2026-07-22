import Link from "next/link";
import { Metadata } from "next";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import Header from "@/components/layout/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Contact - TripTide",
  description: "Contact the TripTide team. We'd love to hear from you.",
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <section className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint shadow-float">
              <span className="h-1.5 w-1.5 rounded-full bg-coral"></span>
              Contact Us
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.15] tracking-tight text-ink sm:text-6xl sm:leading-[1.1]">
              Let's Talk
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-ink-soft sm:text-xl">
              Whether you have a question about a sailing, want to partner with
              us, or just want to say hello — we'd love to hear from you.
            </p>
          </section>

          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              Get in Touch
            </h2>
            <div className="mt-8 space-y-6 max-w-xl">
              <a
                href="mailto:hello@triptide.net"
                className="flex w-full items-center gap-4 rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float transition-all hover:border-indigo/30 hover:shadow-float-lg"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon name="mail" size="lg" className="text-indigo" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">
                    General Inquiries
                  </h3>
                  <p className="mt-1 text-ink-soft">hello@triptide.net</p>
                  <p className="mt-1 text-sm text-ink-faint">
                    We typically respond within 24 hours.
                  </p>
                </div>
              </a>

              <a
                href="mailto:press@triptide.net"
                className="flex w-full items-center gap-4 rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float transition-all hover:border-indigo/30 hover:shadow-float-lg"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon
                    name="campaign"
                    size="lg"
                    className="text-indigo"
                  />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">
                    Press & Media
                  </h3>
                  <p className="mt-1 text-ink-soft">press@triptide.net</p>
                  <p className="mt-1 text-sm text-ink-faint">
                    Press inquiries, interviews, media partnerships.
                  </p>
                </div>
              </a>

              <a
                href="mailto:careers@triptide.net"
                className="flex w-full items-center gap-4 rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float transition-all hover:border-indigo/30 hover:shadow-float-lg"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon name="work" size="lg" className="text-indigo" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">
                    Careers
                  </h3>
                  <p className="mt-1 text-ink-soft">careers@triptide.net</p>
                  <p className="mt-1 text-sm text-ink-faint">
                    Join the crew. We're always looking for exceptional people.
                  </p>
                </div>
              </a>

              <a
                href="mailto:partnerships@triptide.net"
                className="flex w-full items-center gap-4 rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float transition-all hover:border-indigo/30 hover:shadow-float-lg"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                  <MaterialIcon
                    name="handshake"
                    size="lg"
                    className="text-indigo"
                  />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">
                    Partnerships
                  </h3>
                  <p className="mt-1 text-ink-soft">
                    partnerships@triptide.net
                  </p>
                  <p className="mt-1 text-sm text-ink-faint">
                    API access, affiliate programs, integration inquiries.
                  </p>
                </div>
              </a>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              Frequently Asked
            </h2>
            <div className="mt-8 space-y-4 max-w-xl">
              <details className="group rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <summary className="flex cursor-pointer items-center justify-between gap-4 list-none">
                  <h3 className="font-display text-lg font-semibold text-ink">
                    How accurate are your prices?
                  </h3>
                  <MaterialIcon
                    name="expand_more"
                    size="md"
                    className="text-ink-faint transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="mt-4 pt-4 border-t border-black/[0.05] text-ink-soft">
                  <p>
                    Our prices come directly from live fare polling of cruise
                    line booking engines. We capture base fare, port taxes, and
                    mandatory gratuities — the true out-the-door cost. Prices
                    update every 4 hours via our automated sync pipeline.
                  </p>
                </div>
              </details>
              <details className="group rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <summary className="flex cursor-pointer items-center justify-between gap-4 list-none">
                  <h3 className="font-display text-lg font-semibold text-ink">
                    Do you take commissions from cruise lines?
                  </h3>
                  <MaterialIcon
                    name="expand_more"
                    size="md"
                    className="text-ink-faint transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="mt-4 pt-4 border-t border-black/[0.05] text-ink-soft">
                  <p>
                    No. We don't take affiliate commissions, referral fees, or
                    any compensation from cruise lines. Our only incentive is
                    your trust. We're funded by our users and investors who
                    believe in transparent pricing.
                  </p>
                </div>
              </details>
              <details className="group rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <summary className="flex cursor-pointer items-center justify-between gap-4 list-none">
                  <h3 className="font-display text-lg font-semibold text-ink">
                    How do I set a price alert?
                  </h3>
                  <MaterialIcon
                    name="expand_more"
                    size="md"
                    className="text-ink-faint transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="mt-4 pt-4 border-t border-black/[0.05] text-ink-soft">
                  <p>
                    Go to any sailing detail page and click "Create Alert," or
                    visit the{" "}
                    <a href="/alerts" className="text-indigo hover:underline">
                      Price Alerts page
                    </a>
                    . Enter your email and the sailing ID or URL. We'll notify
                    you the moment the price drops or a solo supplement waiver
                    appears.
                  </p>
                </div>
              </details>
              <details className="group rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <summary className="flex cursor-pointer items-center justify-between gap-4 list-none">
                  <h3 className="font-display text-lg font-semibold text-ink">
                    Can I track prices for a specific cabin category?
                  </h3>
                  <MaterialIcon
                    name="expand_more"
                    size="md"
                    className="text-ink-faint transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="mt-4 pt-4 border-t border-black/[0.05] text-ink-soft">
                  <p>
                    Yes. On any sailing detail page, you can view price history
                    by cabin type (Inside, Oceanview, Balcony, Suite) and set
                    alerts for specific categories. Our price comparison table
                    shows per-person, per-day costs for each cabin tier.
                  </p>
                </div>
              </details>
              <details className="group rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <summary className="flex cursor-pointer items-center justify-between gap-4 list-none">
                  <h3 className="font-display text-lg font-semibold text-ink">
                    How does the deal score work?
                  </h3>
                  <MaterialIcon
                    name="expand_more"
                    size="md"
                    className="text-ink-faint transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="mt-4 pt-4 border-t border-black/[0.05] text-ink-soft">
                  <p>
                    Our AI analyzes each sailing against market averages,
                    historical trends, ship-specific context, and seasonal
                    patterns. Scores range 0-100: 80+ = exceptional deal, 60-79
                    = good value, 40-59 = fair, below 40 = overpriced. The
                    analysis includes pricing deep-dive, ship experience,
                    insider tips, and a clear verdict.
                  </p>
                </div>
              </details>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
              Book a Demo
            </h2>
            <div className="mt-8 rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float max-w-xl">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                <MaterialIcon name="event" size="lg" className="text-indigo" />
              </div>
              <h3 className="font-display text-xl font-semibold text-ink">
                Schedule a Walkthrough
              </h3>
              <p className="mt-2 text-ink-soft">
                Want a personalized tour of TripTide for your team or
                publication? Book a 20-minute live demo with our team.
              </p>
              <a
                href="https://calendly.com/triptide/demo"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-indigo px-6 py-3 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(42,68,231,0.55)] transition-all hover:bg-indigo-dark hover:shadow-[0_12px_28px_-8px_rgba(42,68,231,0.65)] active:scale-[0.97]"
              >
                <MaterialIcon name="event" size="sm" className="text-white" />
                Book a Demo
              </a>
            </div>
          </section>

          <section className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint shadow-float">
              <span className="h-1.5 w-1.5 rounded-full bg-coral"></span>
              Ready to catch the deal?
            </span>
            <h2 className="mt-4 font-display text-4xl font-extrabold text-ink sm:text-5xl">
              Start tracking today
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
