import Header from '@/components/layout/Header';
import ExploreDealsHero from './ExploreDealsHero';
import DealsGrid from '@/components/DealsGrid';
import Footer from '@/components/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore Cruise Deals | TripTide',
  description:
    'Deep-dive into the best out-the-door cruise pricing across 20+ cruise lines. Base fare, port taxes, and gratuities — all in one transparent price.',
};

export default function DealsPage() {
  return (
    <>
      <Header />
      <main className="pt-24">
        <ExploreDealsHero />
        <DealsGrid />
      </main>
      <Footer />
    </>
  );
}
