import Header from "./components/Header";
import Hero from "./components/Hero";
import TrustStrip from "./components/TrustStrip";
import DealsGrid from "./components/DealsGrid";
import ComparisonMatrix from "./components/ComparisonMatrix";
import Footer from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen bg-canvas font-body text-ink antialiased">
      <Header />
      <main>
        <Hero />
        <TrustStrip />
        <DealsGrid />
        <ComparisonMatrix />
      </main>
      <Footer />
    </div>
  );
}
