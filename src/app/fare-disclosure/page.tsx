'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FareDisclosureRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/disclosure');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas text-ink">
      <p className="font-interface text-lg text-ink-soft">Redirecting...</p>
    </div>
  );
}
