import Link from "next/link";
import { Metadata } from "next";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export const metadata: Metadata = {
  title: "Fare Disclosure - TripTide",
  description:
    "TripTide Fare Disclosure - Important information about how we calculate and display cruise prices.",
};

export default function DisclosurePage() {
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
        <div className="mx-auto max-w-3xl">
          <section className="mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint shadow-float">
              <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-coral" />
              Fare Disclosure
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.15] tracking-tight text-ink sm:text-6xl sm:leading-[1.1]">
              How We Calculate & Display Prices
            </h1>
            <p className="mt-4 text-ink-soft">Last updated: July 13, 2026</p>
          </section>

          <section className="space-y-12">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                Our Pricing Philosophy
              </h2>
              <p className="mt-4 text-ink-soft">
                TripTide exists to bring transparency to cruise pricing. We
                believe every traveler deserves to see the true, out-the-door
                cost of a cruise — not just a teaser "from" price that excludes
                mandatory fees. This page explains exactly what&apos;s included
                in our prices, where our data comes from, and what you should
                know before booking.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                What&apos;s Included in Every Price
              </h2>
              <p className="mt-4 text-ink-soft">
                Every price displayed on TripTide includes these three mandatory
                components:
              </p>
              <div className="mt-6 grid gap-6 md:grid-cols-3">
                <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                    <MaterialIcon
                      name="price_check"
                      size="lg"
                      className="text-indigo"
                    />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-ink">
                    1. Base Fare
                  </h3>
                  <p className="mt-2 text-ink-soft">
                    The cruise line&apos;s published fare for the stateroom
                    category, before taxes and fees. This varies by cabin type
                    (Inside, Oceanview, Balcony, Suite), sailing date, and
                    availability.
                  </p>
                </div>
                <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                    <MaterialIcon
                      name="receipt_long"
                      size="lg"
                      className="text-indigo"
                    />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-ink">
                    2. Port Fees & Taxes
                  </h3>
                  <p className="mt-2 text-ink-soft">
                    Government-imposed charges, port taxes, and
                    non-commissionable fees (NCFs) collected by the cruise line
                    on behalf of ports and governments. These are mandatory and
                    non-negotiable.
                  </p>
                </div>
                <div className="rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-mist text-indigo">
                    <MaterialIcon
                      name="monetization_on"
                      size="lg"
                      className="text-indigo"
                    />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-ink">
                    3. Mandatory Gratuities
                  </h3>
                  <p className="mt-2 text-ink-soft">
                    Daily service charges automatically added per guest, per
                    night (typically $16–$25/night depending on cruise line and
                    cabin category). These are charged to your onboard account
                    and are not optional.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                What&apos;s NOT Included
              </h2>
              <p className="mt-4 text-ink-soft">
                The following are <strong>not</strong> included in our displayed
                out-the-door price and will be additional charges if you choose
                them:
              </p>
              <ul className="mt-4 space-y-3 list-disc list-inside text-ink-soft">
                <li>Alcoholic beverages, specialty dining, spa services</li>
                <li>Shore excursions, Wi-Fi packages, laundry services</li>
                <li>Travel insurance, airfare, pre/post-cruise hotel stays</li>
                <li>
                  Transfers to/from the port (unless a package includes them)
                </li>
                <li>Anything purchased onboard via your shipboard account</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                Per-Person, Double-Occupancy Basis
              </h2>
              <p className="mt-4 text-ink-soft">
                All prices on TripTide are shown{" "}
                <strong>per person, based on double occupancy</strong> (two
                people sharing a stateroom). This is the industry standard for
                cruise pricing.
              </p>
              <div className="mt-6 rounded-2xl border border-black/[0.05] bg-white p-6 shadow-float">
                <h3 className="font-display text-lg font-semibold text-ink">
                  Solo Traveler Supplement
                </h3>
                <p className="mt-2 text-ink-soft">
                  Solo travelers typically pay a "single supplement" — often
                  150–200% of the per-person fare — because cruise lines price
                  cabins for two. We flag sailings with waived or reduced
                  supplements in our{" "}
                  <a href="/solo" className="text-indigo hover:underline">
                    Solo Hub
                  </a>
                  .
                </p>
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                Currency & Rounding
              </h2>
              <ul className="mt-4 space-y-2 list-disc list-inside text-ink-soft">
                <li>
                  All prices shown in <strong>US Dollars (USD)</strong>
                </li>
                <li>Prices rounded to the nearest dollar for display</li>
                <li>
                  Actual charges on booking sites may differ by a few dollars
                  due to rounding or real-time exchange rates
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                Data Sources & Freshness
              </h2>
              <p className="mt-4 text-ink-soft">
                Our pricing data comes from live polling of cruise line booking
                engines and public fare APIs. We do not use synthetic or
                estimated data.
              </p>
              <ul className="mt-4 space-y-2 list-disc list-inside text-ink-soft">
                <li>
                  Prices updated every <strong>4 hours</strong> via automated
                  sync
                </li>
                <li>Each price snapshot timestamped with exact capture time</li>
                <li>
                  Historical data retained for trend analysis and forecasting
                </li>
                <li>
                  Data sourced directly from cruise line public booking
                  interfaces
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                Price Accuracy & Limitations
              </h2>
              <p className="mt-4 text-ink-soft">
                While we strive for accuracy, please be aware:
              </p>
              <ul className="mt-4 space-y-2 list-disc list-inside text-ink-soft">
                <li>
                  Prices change rapidly — a price shown may differ from what you
                  see at booking time
                </li>
                <li>
                  Promotional codes, resident rates, military/senior discounts
                  not always reflected
                </li>
                <li>
                  Group rates, travel agent exclusives, and past-guest offers
                  not included
                </li>
                <li>
                  Dynamic pricing means the same sailing can show different
                  prices minutes apart
                </li>
                <li>
                  Always verify the final price on the booking site before
                  purchasing
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                Booking Links
              </h2>
              <p className="mt-4 text-ink-soft">
                Our "View Deal" and "Book This Cruise" buttons link to{" "}
                <strong>VacationsToGo.com</strong>, our affiliate booking
                partner. We earn a small referral commission if you book through
                these links — this supports our free service and does not affect
                the price you pay.
              </p>
              <p className="mt-4 text-ink-soft">
                You are free to book directly with the cruise line or your
                preferred travel agent. Our job is to show you the true price so
                you can compare.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                Solo Supplement Waivers
              </h2>
              <p className="mt-4 text-ink-soft">
                We track sailings where cruise lines offer reduced or waived
                single supplements. These are flagged with a "Solo Friendly"
                badge. Availability is limited and subject to change — always
                confirm the supplement status at booking.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                Promotional Pricing
              </h2>
              <p className="mt-4 text-ink-soft">
                "Sale" or "Drop" badges reflect a price decrease from our
                previously recorded price for that sailing/cabin. The percentage
                shown is the drop from our last recorded price, not necessarily
                from the cruise line&apos;s original "brochure" rate.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                AI-Generated Content
              </h2>
              <p className="mt-4 text-ink-soft">
                Deal analyses, price forecasts, and deal scores are generated by
                AI (NVIDIA Nemotron 3 Ultra via NVIDIA NIM). While we train and
                validate extensively, AI can make errors. We clearly label
                AI-generated content. Always use your own judgment and verify
                critical details before booking.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                No Travel Agency Relationship
              </h2>
              <p className="mt-4 text-ink-soft">
                TripTide is not a travel agency, tour operator, or cruise line.
                We do not sell travel, issue tickets, or assume liability for
                travel arrangements. We are a pricing intelligence platform. All
                bookings are governed by the terms of the booking site and
                cruise line.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">
                Contact
              </h2>
              <p className="mt-4 text-ink-soft">
                Questions about our pricing methodology or this disclosure?
                Contact us:
              </p>
              <ul className="mt-4 space-y-2 list-disc list-inside text-ink-soft">
                <li>
                  Email:{" "}
                  <a
                    href="mailto:disclosure@triptide.net"
                    className="text-indigo hover:underline"
                  >
                    disclosure@triptide.net
                  </a>
                </li>
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
