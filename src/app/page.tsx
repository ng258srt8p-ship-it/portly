import Header from '@/components/layout/Header';
import SearchHero from '@/components/search/SearchHero';
import PriceComparisonTable from '@/components/PriceComparisonTable';
import TrustStrip from '@/components/TrustStrip';
import Footer from '@/components/Footer';
import Link from 'next/link';
import MaterialIcon from '@/components/ui/MaterialIcon';

export default function HomePage() {
  return (
    <>
      <Header />

      <main>
        {/* Search Hero Section */}
        <SearchHero />

        {/* Trust Strip */}
        <TrustStrip />

        {/* Explore Deals CTA — full deals page with filters & live data */}
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo">Hot Deals on the Radar</span>
          <h2 className="mt-3 font-display text-4xl font-extrabold text-ink sm:text-5xl">Find Your Perfect Voyage</h2>
          <p className="mx-auto mt-4 max-w-sm text-ink-soft">
            Every card is powered by live fare polling — we flag the sailings where the tide has genuinely turned in your favor.
          </p>
          <Link
            href="/deals"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-indigo px-6 py-3 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(42,68,231,0.55)] transition-all hover:bg-indigo-dark hover:shadow-[0_12px_28px_-8px_rgba(42,68,231,0.65)] active:scale-[0.97]"
          >
            Explore All Deals
            <MaterialIcon name="arrow_forward" size="sm" />
          </Link>
        </div>

        {/* Transparent Checkout Matrix */}
        <PriceComparisonTable />
      </main>

      <Footer />
    </>
  );
}