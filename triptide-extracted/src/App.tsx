import { useState } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import TrustStrip from "./components/TrustStrip";
import DealsGrid from "./components/DealsGrid";
import ComparisonMatrix from "./components/ComparisonMatrix";
import Footer from "./components/Footer";
import Toast from "./components/Toast";

export default function App() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const handleSyncComplete = () => {
    setToast({ message: "Fares synced successfully", type: "success" });
  };

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
      {toast && (
        <div className="fixed bottom-4 right-4 z-50" aria-live="assertive">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}
