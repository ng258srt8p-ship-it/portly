'use client';

import { useEffect, useRef, useState } from 'react';
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
 * Highlights the section currently near the viewport via scroll-spy
 * with click-suppression to prevent scroll-spy from overwriting
 * the user-clicked active state during smooth-scroll animation.
 */
export default function SailingSubNav({ sections }: SailingSubNavProps) {
  const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);
  // When user clicks a tab, we lock the active state for `lockUntil` ms
  // so the scroll-spy doesn't immediately overwrite it (smooth scroll
  // animation can take 500ms+ to complete and intermediate scroll-spy
  // calculations may pick a different section).
  const lockUntilRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !sections.length) return;

    const updateActive = () => {
      // Respect click-lock: if active is locked, don't recompute.
      if (Date.now() < lockUntilRef.current) return;

      // Read computed header + subnav heights from CSS variables.
      const root = document.documentElement;
      const headerVar = getComputedStyle(root).getPropertyValue('--header-height').trim();
      const subnavVar = getComputedStyle(root).getPropertyValue('--subnav-height').trim();
      const remToPx = (v: string): number => {
        const n = parseFloat(v);
        if (isNaN(n)) return 0;
        return v.endsWith('rem') ? n * 16 : n;
      };
      const headerH = remToPx(headerVar) || 98;
      const subnavH = remToPx(subnavVar) || 56;
      const offset = headerH + subnavH + 16;
      // The active section is the LAST one whose top is at or above the offset.
      let current = sections[0].id;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= offset) {
          current = s.id;
        }
      }
      setActive(current);
    };

    // Run on scroll (throttled with rAF)
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateActive();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    updateActive(); // Initial call

    return () => window.removeEventListener('scroll', onScroll);
  }, [sections]);

  if (!sections.length) return null;

  return (
    <nav
      data-testid="sailing-subnav"
      className="sticky top-[var(--header-height)] z-30 w-full bg-white/80 backdrop-blur-md border-b border-black/[0.06] py-2 px-4"
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
                // Lock active state for 1200ms (smooth scroll typical duration).
                lockUntilRef.current = Date.now() + 1200;
                setActive(sec.id);
                // Compute exact scroll position: header+subnav offset (98+56=154px)
                // so the section's top sits at this sticky boundary.
                const root = document.documentElement;
                const headerVar = getComputedStyle(root).getPropertyValue('--header-height').trim();
                const subnavVar = getComputedStyle(root).getPropertyValue('--subnav-height').trim();
                const remToPx = (v: string): number => {
                  const n = parseFloat(v);
                  if (isNaN(n)) return 0;
                  return v.endsWith('rem') ? n * 16 : n;
                };
                const headerH = remToPx(headerVar) || 98;
                const subnavH = remToPx(subnavVar) || 56;
                const stickyOffset = headerH + subnavH + 8;
                const elRect = el.getBoundingClientRect();
                const targetScrollY = window.scrollY + elRect.top - stickyOffset;
                window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
                // After lock expires, recompute from scroll position.
                setTimeout(() => updateActiveSafely(), 1300);
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

  // Re-export updateActive for setTimeout access. (Defined outside useEffect
  // so it can be called from onClick handler.)
  function updateActiveSafely() {
    if (typeof window === 'undefined') return;
    lockUntilRef.current = 0;
    window.dispatchEvent(new Event('scroll'));
  }
}