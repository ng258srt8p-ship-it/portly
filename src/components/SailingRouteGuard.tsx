'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import SailingDetailClient from '@/app/sailing/[id]/SailingDetailClient';

/**
 * Client-side route guard for Cloudflare Pages static export.
 *
 * Problem: Next.js output:'export' doesn't generate per-SSG HTML files
 * for dynamic routes. The Cloudflare Pages _redirects catch-all serves
 * the homepage index.html for ALL paths including /sailing/<id>/.
 * The homepage RSC data hydrates the homepage page chunk, so
 * SailingDetailClient never mounts — the user sees the homepage
 * instead of the sailing detail page.
 *
 * Solution: This client component is included on the homepage. After
 * hydration, it checks window.location.pathname. If the URL matches
 * /sailing/<id>/, it renders SailingDetailClient (which fetches the
 * sailing data from the API) and hides the homepage content.
 */
export default function SailingRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSailingRoute, setIsSailingRoute] = useState(false);
  const [sailingId, setSailingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const match = window.location.pathname.match(/\/sailing\/([^/]+)\/?$/);
    if (match) {
      setIsSailingRoute(true);
      setSailingId(match[1]);
    }
  }, [pathname]);

  if (isSailingRoute && sailingId) {
    return <SailingDetailClient />;
  }

  return <>{children}</>;
}
