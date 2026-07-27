import SailingDetailClient from './SailingDetailClient';

// Fetch all sailing IDs from the API at build time so every cruise gets
// a pre-rendered static HTML page via Next.js SSG export.
export async function generateStaticParams() {
  // Fallback list of known sailing IDs (used if API is unreachable during build)
  const fallbackIds = [
    'carnival_mardi-gras_2026-01-15_galveston_7',
    'carnival_vista_2026-02-10_miami_5',
    'carnival_panorama_2026-03-20_long-beach_7',
    'carnival_jubilee_2026-04-05_galveston_7',
    'princess_discovery_2026-03-05_los-angeles_10',
    'princess_regal_2026-01-20_fort-lauderdale_7',
    'princess_sapphire_2026-05-09_seattle_7',
  ];

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://portly-api.vqh9mnrdbp.workers.dev';

  try {
    // limit=0 falls back to the worker default (20). Use limit=500 so we get
    // every current sailing ID and the static export matches the live catalog.
    const res = await fetch(`${apiUrl}/api/deals?limit=500`);
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const deals = await res.json() as Array<{ id: string }>;
    if (!Array.isArray(deals) || deals.length === 0) throw new Error('No deals returned');
    console.log(`[generateStaticParams] Fetched ${deals.length} sailing IDs from API`);
    return deals.map((d) => ({ id: d.id }));
  } catch (err) {
    console.warn(`[generateStaticParams] API fetch failed (${err}), using fallback list`);
    return fallbackIds.map((id) => ({ id }));
  }
}

export default function Page() {
  return <SailingDetailClient />;
}
