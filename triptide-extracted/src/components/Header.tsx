import { useEffect, useState } from "react";

const navLinks = ["Explore Deals", "Price History Maps", "Solo Hub"];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("Explore Deals");
  const [menuOpen, setMenuOpen] = useState(false);

  // Handle alerts page link
  const handleAlertsClick = () => {
    setActive("Price Alerts");
    setMenuOpen(false);
    // Navigate to alerts page (or show alert if no route)
    window.location.href = "/alerts";
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:px-6">
      <a href="/#top" className="skip-to-content" aria-label="Skip to main content">Skip to main content</a>
      <div className="w-full max-w-6xl">
        <div
          className={`flex w-full flex-nowrap items-center justify-between gap-3 rounded-full border px-3 py-2.5 backdrop-blur-xl transition-all duration-300 sm:px-4 ${
            scrolled ? "border-black/[0.06] bg-white/80 shadow-float" : "border-transparent bg-white/40"
          }`}
        >
          <a href="/" className="flex shrink-0 items-center gap-2" aria-label="TripTide home">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M2 17c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0M2 12c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="whitespace-nowrap font-display text-lg font-bold text-ink sm:text-xl">TripTide</span>
          </a>

          <nav className="hidden min-w-0 items-center gap-1 rounded-full bg-black/[0.03] p-1 lg:flex" aria-label="Main navigation">
            {navLinks.map((link) => (
              <button
                key={link}
                onClick={() => setActive(link)}
                aria-current={active === link ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors xl:px-4 ${
                  active === link ? "bg-white text-ink shadow-float" : "text-ink-soft hover:text-ink"
                }`}
              >
                {link}
              </button>
            ))}
            <button
              onClick={handleAlertsClick}
              aria-current={active === "Price Alerts" ? "page" : undefined}
              className="whitespace-nowrap rounded-full bg-indigo px-3.5 py-2 text-sm font-medium text-white transition-colors xl:px-4"
            >
              Price Alerts
            </button>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button aria-label="Create price alert" className="hidden shrink-0 whitespace-nowrap rounded-full bg-indigo px-4 py-2.5 text-xs font-semibold text-white shadow-[0_8px_20px_-6px_rgba(42,68,231,0.55)] hover:bg-indigo-dark active:scale-[0.97] sm:block sm:text-sm lg:px-5">
              Create Price Alert
            </button>
            <button aria-label="Create price alert" className="block shrink-0 whitespace-nowrap rounded-full bg-indigo px-3.5 py-2.5 text-xs font-semibold text-white shadow-[0_8px_20px_-6px_rgba(42,68,231,0.55)] hover:bg-indigo-dark active:scale-[0.97] sm:hidden">
              Alert
            </button>
            <button
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-black/[0.05] lg:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="mt-2 flex flex-col gap-1 rounded-3xl border border-black/[0.06] bg-white/95 p-2 shadow-float-lg backdrop-blur-xl lg:hidden" role="navigation" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <button
                key={link}
                onClick={() => {
                  setActive(link);
                  setMenuOpen(false);
                }}
                aria-current={active === link ? "page" : undefined}
                className={`rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                  active === link ? "bg-indigo-mist text-indigo" : "text-ink-soft hover:bg-black/[0.04] hover:text-ink"
                }`}
              >
                {link}
              </button>
            ))}
            <button
              onClick={handleAlertsClick}
              aria-current={active === "Price Alerts" ? "page" : undefined}
              className={`rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors ${
                active === "Price Alerts" ? "bg-indigo-mist text-indigo" : "text-ink-soft hover:bg-black/[0.04] hover:text-ink"
              }`}
            >
              Price Alerts
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
