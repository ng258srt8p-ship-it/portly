import Link from 'next/link';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

export default function Footer() {
  return (
    <footer className="border-t border-black/[0.06] bg-white px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo text-white">
                <MaterialIcon name="directions_boat_filled" size="sm" className="text-white" />
              </span>
              <span className="font-display text-xl font-bold text-ink">TripTide</span>
            </Link>
            <p className="mt-4 text-sm text-ink-soft">
              An independent cruise price tracking and forecasting engine. We monitor fares across every major line so you
              never overpay for a stateroom again.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <FooterCol title="Product" links={[
              { label: "Explore Deals", href: "/deals" },
              { label: "Price History Maps", href: "/history" },
              { label: "Solo Hub", href: "/solo" },
              { label: "Price Alerts", href: "/alerts" },
            ]} />
            <FooterCol title="Company" links={[
              { label: "About", href: "/about" },
              { label: "Press", href: "/press" },
              { label: "Careers", href: "/careers" },
              { label: "Contact", href: "/contact" },
            ]} />
            <FooterCol title="Legal" links={[
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
              { label: "Fare Disclosure", href: "/disclosure" },
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

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{title}</p>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-ink-soft hover:text-indigo">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}