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

export default function SailingSubNav({ sections }: SailingSubNavProps) {
 const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);
 const lockUntilRef = useRef<number>(0);

 useEffect(() => {
  if (typeof window === 'undefined' || !sections.length) return;

  const updateActive = () => {
   if (Date.now() < lockUntilRef.current) return;
   const root = document.documentElement;
   const headerVar = getComputedStyle(root)
    .getPropertyValue('--header-height')
    .trim();
   const subnavVar = getComputedStyle(root)
    .getPropertyValue('--subnav-height')
    .trim();
   const remToPx = (v: string): number => {
    const n = parseFloat(v);
    if (isNaN(n)) return 0;
    return v.endsWith('rem') ? n * 16 : n;
   };
   const headerH = remToPx(headerVar) || 98;
   const subnavH = remToPx(subnavVar) || 56;
   const offset = headerH + subnavH + 16;
   let current = sections[0].id;
   for (const s of sections) {
    const el = document.getElementById(s.id);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.top <= offset) current = s.id;
   }
   setActive(current);
  };

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
  updateActive();
  return () => window.removeEventListener('scroll', onScroll);
 }, [sections]);

 const handleNavigate = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  lockUntilRef.current = Date.now() + 1200;
  setActive(id);
  const root = document.documentElement;
  const headerVar = getComputedStyle(root)
   .getPropertyValue('--header-height')
   .trim();
  const subnavVar = getComputedStyle(root)
   .getPropertyValue('--subnav-height')
   .trim();
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
  if (typeof document !== 'undefined') {
   const open = document.querySelector(
    'details[data-sailing-subnav-popover][open]'
   );
   if (open) open.removeAttribute('open');
  }
  setTimeout(() => {
   lockUntilRef.current = 0;
   window.dispatchEvent(new Event('scroll'));
  }, 1300);
 };

 if (!sections.length) return null;
 const activeSection = sections.find((s) => s.id === active) ?? sections[0];

 const pillBase =
  'w-full max-w-6xl rounded-full border border-black/[0.06] bg-white/80 backdrop-blur-xl shadow-float';

 return (
  <div
   data-testid="sailing-subnav"
   className="sticky top-[var(--header-height)] z-30 flex justify-center px-4 pt-2 sm:px-6"
   aria-label="Section navigation"
  >
   <div className={'md:hidden ' + pillBase + ' has-[[open]]:rounded-2xl'}>
    <details data-sailing-subnav-popover className="group">
     <summary
      className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 text-sm font-semibold text-ink-soft [&::-webkit-details-marker]:hidden"
      aria-label="Jump to section"
     >
      <span className="flex items-center gap-2">
       <MaterialIcon
        name="directions_boat_filled"
        size="xs"
        className="text-indigo"
       />
       {activeSection.label}
      </span>
      <MaterialIcon
       name="expand_more"
       size="sm"
       className="transition-transform group-open:rotate-180"
      />
     </summary>
     <ul className="px-3 pb-3 pt-1 grid grid-cols-2 gap-1.5">
      {sections.map((sec) => (
       <li key={sec.id}>
        <button
         type="button"
         onClick={() => handleNavigate(sec.id)}
         className={
          'flex w-full items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-colors hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 ' +
          (active === sec.id ? 'bg-indigo/10 text-indigo' : 'text-ink-soft')
         }
        >
         <MaterialIcon
          name="circle"
          size="xs"
          className={active === sec.id ? 'text-indigo' : 'text-ink-faint'}
         />
         <span className="truncate">{sec.label}</span>
        </button>
       </li>
      ))}
     </ul>
    </details>
   </div>

   <div className={'hidden md:flex ' + pillBase + ' items-center gap-1 px-2 py-1.5'}>
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo/10 text-indigo">
     <MaterialIcon name="directions_boat_filled" size="xs" />
    </span>
    <nav
     className="flex flex-1 min-w-0 items-center gap-1 overflow-x-auto scrollbar-none"
     aria-label="Sections"
    >
     {sections.map((sec) => (
      <button
       key={sec.id}
       type="button"
       id={'nav-' + sec.id}
       aria-current={active === sec.id ? 'true' : undefined}
       onClick={() => handleNavigate(sec.id)}
       className={
        'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full min-h-[32px] px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo/50 ' +
        (active === sec.id ? 'bg-indigo/10 text-indigo' : 'text-ink-soft')
       }
      >
       <MaterialIcon
        name="circle"
        size="xs"
        className={active === sec.id ? 'text-indigo' : 'text-ink-faint'}
       />
       {sec.label}
      </button>
     ))}
    </nav>
   </div>
  </div>
 );
}
