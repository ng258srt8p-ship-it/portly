"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MaterialIcon from "@/components/ui/MaterialIcon";

const navLinks = [
  { label: "Explore Deals", href: "/deals" },
  { label: "Price History Maps", href: "/history" },
  { label: "Solo Hub", href: "/solo" },
];

export default function Header() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on Escape key press (focus trap)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuOpen) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // Click-outside dismiss for mobile menu
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const navigate = (href: string) => {
    router.push(href);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 sm:px-6">
      <div className="w-full max-w-6xl">
        <div
          className={`flex w-full flex-nowrap items-center justify-between gap-3 rounded-full border px-3 py-2.5 backdrop-blur-xl transition-all duration-300 sm:px-4 ${
            scrolled ? "border-black/[0.06] bg-white/80 shadow-float" : "border-transparent bg-white/40"
          }`}
        >
          <button
            onClick={() => router.push('/')}
            className="flex shrink-0 items-center gap-2"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo text-white">
              <MaterialIcon name="directions_boat_filled" size="sm" className="text-white" />
            </span>
            <span className="whitespace-nowrap font-display text-lg font-bold text-ink sm:text-xl">TripTide</span>
          </button>

          <nav className="hidden min-w-0 items-center gap-1 rounded-full bg-black/[0.03] p-1 lg:flex">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => navigate(link.href)}
                className="whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink xl:px-4"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              aria-label="Toggle dark mode"
              onClick={toggleDarkMode}
              className="hidden shrink-0 items-center justify-center rounded-full text-ink hover:bg-black/[0.05] lg:flex"
            >
              <MaterialIcon name={darkMode ? "light_mode" : "dark_mode"} size="sm" />
            </button>
            <button
              onClick={() => router.push('/alerts')}
              className="hidden shrink-0 whitespace-nowrap rounded-full bg-indigo px-4 py-2.5 text-xs font-semibold text-white shadow-[0_8px_20px_-6px_rgba(42,68,231,0.55)] hover:bg-indigo-dark active:scale-[0.97] sm:block sm:text-sm lg:px-5"
            >
              Create Price Alert
            </button>
            <button
              onClick={() => router.push('/alerts')}
              className="block shrink-0 whitespace-nowrap rounded-full bg-indigo px-3.5 py-2.5 text-xs font-semibold text-white shadow-[0_8px_20px_-6px_rgba(42,68,231,0.55)] hover:bg-indigo-dark active:scale-[0.97] sm:hidden"
            >
              Alert
            </button>
            <button
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-black/[0.05] lg:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
            <button
              aria-label="Toggle dark mode"
              onClick={toggleDarkMode}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-black/[0.05] lg:hidden"
            >
              <MaterialIcon name={darkMode ? "light_mode" : "dark_mode"} size="sm" />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div ref={menuRef} className="mt-2 flex flex-col gap-1 rounded-3xl border border-black/[0.06] bg-white/95 p-2 shadow-float-lg backdrop-blur-xl lg:hidden">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => {
                  navigate(link.href);
                  setMenuOpen(false);
                }}
                className="rounded-2xl px-4 py-3 text-left text-sm font-medium text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink"
              >
                {link.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}