import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TripTide | Track the Absolute Out-the-Door Cost of Your Next Voyage',
  description:
    'Compare out-the-door cruise pricing across 20+ cruise lines on TripTide. Base fare, port taxes, and mandatory gratuities — all in one transparent price. Catch the deal before the tide rolls out.',
  keywords: [
    'cruise comparison',
    'cruise prices',
    'cheap cruises',
    'cruise deals',
    'solo cruise',
    'all-in cruise pricing',
    'trip tide',
    'cruise tracking',
  ],
  openGraph: {
    title: 'TripTide | Track the Absolute Out-the-Door Cost of Your Next Voyage',
    description:
      'The first cruise aggregator with out-the-door pricing. No hidden fees. Catch the deal before the tide rolls out.',
    type: 'website',
    siteName: 'TripTide',
  },
};

export const viewport: Viewport = {
  themeColor: '#f8f9fa',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Tier 1: Interface + Display Fonts — Plus Jakarta Sans (used for all headings and body) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />

        {/* Tier 2: Tabular Fonts — JetBrains Mono */}
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Tier 4: Icon Font — Material Symbols */}
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-canvas text-ink font-interface antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-indigo focus:px-4 focus:py-2 focus:text-white focus:shadow-lg">
          Skip to main content
        </a>
        <main id="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}