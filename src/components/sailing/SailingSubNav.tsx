'use client';

import { useEffect, useState } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';

interface NavSection {
  id: string;
  label: string;
}

interface SailingSubNavProps {
  sections: NavSection[];
}

/**
 * Sticky anchor sub-navigation bar for sailing detail page.
 * Appears below the main header, provides quick jump to sections.
 * Highlights the section currently near the viewport via IntersectionObserver.
 */
export default function SailingSubNav({ sections }: SailingSubNavProps) {
  const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);

  useEffect(() => {
    if (typeof window === 'undefined' || !sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { threshold: 0.3, rootMargin: '-20% 0px -80% 0px' }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  if (!sections.length) return null;

  return (
    <nav
      data-testid="sailing-subnav"
      className="sticky top-[72px] z-30 w-full bg-white/80 backdrop-blur-md border-b border-black/[0.06] py-2 px-4"
      aria-label="Section navigation"
    >
      <div className="flex overflow-x-auto space-x-4">
        {sections.map((sec) => (
          <button
            key={sec.id}
            id={`nav-${sec.id}`}
            aria-current={active === sec.id ? 'true' : undefined}
            onClick={() => {
              const el = document.getElementById(sec.id);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/500 ${active === sec.id ? 'bg-indigo/10 text-indigo' : 'text-ink-soft'}`}
          >
            <MaterialIcon name="circle" size="xs" className={`text-xs font-medium ${active === sec.id ? 'text-indigo' : 'text-ink-faint'}`} />
            <span className="whitespace-nowrap">{sec.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}