import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import SearchHero from '@/components/search/SearchHero';
import TrustStrip from '@/components/TrustStrip';
import PriceComparisonTable from '@/components/PriceComparisonTable';
import DealsGridLite from '@/components/DealsGridLite';
import Footer from '@/components/Footer';
import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://portly-1i0.pages.dev';

export const metadata: Metadata = {
  title: 'TripTide — Cruise Price Tracking & Insider Deal Intelligence',
  description:
    'Track every cruise fare across 14+ lines and 80+ ships. Out-the-door pricing (base fare, port taxes, gratuities) — never hidden fees. Real-time price-drop alerts, history maps, and AI-powered cabin strategy.',
  keywords: [
    'cruise price tracker',
    'cruise deals',
    'out the door cruise price',
    'cruise price history',
    'cruise cabin strategy',
    'cheap cruises',
    'best cruise deals',
    'all-inclusive cruise pricing',
    'cruise fare forecast',
    'solo cruise',
  ],
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'TripTide — Insider Cruise Price Intelligence',
    description:
      'Compare out-the-door cruise pricing across 14+ lines, 80+ ships, 81 sailings. Catch the deal before the tide rolls out.',
    type: 'website',
    url: SITE_URL,
    siteName: 'TripTide',
    images: [
      {
        url: `${SITE_URL}/og-default.svg`,
        width: 1200,
        height: 630,
        alt: 'TripTide — Cruise Price Tracking',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TripTide — Insider Cruise Price Intelligence',
    description:
      'Real-time cruise price tracking with out-the-door pricing. Catch the deal before the tide rolls out.',
    images: [`${SITE_URL}/og-default.svg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

/* ---------- JSON-LD structured data ---------- */
function structuredData() {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TripTide',
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    description:
      'Cruise price tracking service with out-the-door pricing, history maps, and AI-powered deal intelligence.',
    sameAs: [],
  };

  const site = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'TripTide',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/deals?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What does out-the-door pricing include?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Out-the-door means every charge the cruise line adds before you board: base fare, port fees/taxes, and mandatory gratuities. We exclude optional things like excursions, specialty dining, and alcohol — those are yours to pick.',
        },
      },
      {
        '@type': 'Question',
        name: 'How often is pricing updated?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Our worker pulls from cruise-line fare APIs every 30 minutes and runs lightweight price-drift modelling between pulls, so the prices you see are always fresh within that window.',
        },
      },
      {
        '@type': 'Question',
        name: 'How accurate is the price-drop forecast?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Every sailing gets a per-cabin forecast with confidence bands. Tier heuristics come from 90 days of price history; we mark the result clearly as heuristic when AI content has not yet been applied.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is TripTide free?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Browsing deals, sailing detail pages, and history maps is free. Optional alerts are also free — leave your email and we will ping you when a specific fare drops.',
        },
      },
      {
        '@type': 'Question',
        name: 'Does TripTide sell cruises?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. We are an independent price-tracking service. We do not earn commission on any booking.</p>',
        },
      },
    ],
  };

  return [org, site, faq];
}

export default function HomePage() {
  const ldJson = structuredData();

  return (
    <>
      <Header />

      <main>
        {/* Search Hero Section */}
        <SearchHero />

        {/* Trust Strip */}
        <TrustStrip />

        {/* Hot deals preview — show 6 actual cards on the homepage so the
            page earns its keep rather than relying on a hero CTA only.            */}
        <section
          aria-labelledby="home-deals-heading"
          className="mx-auto max-w-7xl px-4 pt-12 sm:px-6"
          id="home-deals"
        >
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo">Hot Deals on the Radar</span>
              <h2
                id="home-deals-heading"
                className="mt-3 font-display text-4xl font-extrabold text-ink sm:text-5xl"
              >
                Find Your Perfect Voyage
              </h2>
            </div>
            <Link
              href="/deals"
              className="inline-flex items-center gap-2 rounded-full bg-indigo px-6 py-3 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(42,68,231,0.55)] transition-all hover:bg-indigo-dark active:scale-[0.97]"
            >
              <MaterialIcon name="explore" size="sm" />
              Explore All Deals
              <MaterialIcon name="arrow_forward" size="sm" />
            </Link>
          </div>
          <div className="mt-8" data-testid="home-deals-grid">
            <DealsGridLite />
          </div>
        </section>

        {/* Sample fare preview — drives both SEO content and product UI */}
        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6" id="sample-pricing">
          <PriceComparisonTable sailingId="carnival_conquest_2026-03-12_miami_4" />
        </section>

        {/* SSR-only SEO fallback content — hidden visually but crawlable */}
        <section className="sr-only" aria-label="TripTide overview">
          <h2>Out-The-Door Cruise Pricing, Plain English</h2>
          <p>
            Most cruise comparison sites advertise a base fare and then bury port fees, taxes, and mandatory gratuities
            in the fine print. TripTide publishes the total out-the-door cost every price gets billed at, on every
            sailing, refreshed every 30 minutes. Compare Inside, Oceanview, Balcony, and Suite categories side by side,
            see historical pricing graphs, set up price-drop alerts, and read insider cabin strategy for every sailing
            our AI engine has profiled.
          </p>
          <h3>Sailings you can browse right now</h3>
          <ul>
            <li>Carnival Conquest — 4 Nights Bahamas from Miami, March 2026</li>
            <li>Royal Caribbean Mariner of the Seas — 8 Nights Caribbean</li>
            <li>Norwegian Sky — Bahamas from Miami, April 2026</li>
            <li>Royal Caribbean Utopia of the Seas — Bahamas, January 2026</li>
            <li>Carnival Sunrise — Bahamas, February 2026</li>
          </ul>
        </section>
      </main>

      <Footer />

      {/* JSON-LD structured data for SEO — server-rendered, not visible */}
      {ldJson.map((doc, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(doc) }}
        />
      ))}
    </>
  );
}
