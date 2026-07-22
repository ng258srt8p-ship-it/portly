export default function Footer() {
  return (
    <footer className="border-t border-black/[0.06] bg-white px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M2 17c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0M2 12c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="font-display text-xl font-bold text-ink">TripTide</span>
            </div>
            <p className="mt-4 text-sm text-ink-soft">
              An independent cruise price tracking and forecasting engine. We monitor fares across every major line so you
              never overpay for a stateroom again.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <FooterCol title="Product" links={[
              { href: "/deals", label: "Explore Deals" },
              { href: "/price-history", label: "Price History Maps" },
              { href: "/solo", label: "Solo Hub" },
              { href: "/alerts", label: "Price Alerts" },
            ]} />
            <FooterCol title="Company" links={[
              { href: "/about", label: "About" },
              { href: "/press", label: "Press" },
              { href: "/careers", label: "Careers" },
              { href: "/contact", label: "Contact" },
            ]} />
            <FooterCol title="Legal" links={[
              { href: "/privacy", label: "Privacy" },
              { href: "/terms", label: "Terms" },
              { href: "/fare-disclosure", label: "Fare Disclosure" },
            ]} />
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-black/[0.06] pt-8 text-xs text-ink-faint sm:flex-row">
          <span>© {new Date().getFullYear()} TripTide, Inc. All rights reserved.</span>
          <span className="font-mono-tab">triptide.net</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{title}</p>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <a href={link.href} className="text-sm text-ink-soft hover:text-indigo">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
