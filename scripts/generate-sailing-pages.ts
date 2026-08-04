/**
 * Post-build script: generates per-sailing HTML files for static export.
 *
 * Next.js 14 App Router with output: 'export' generates SSG chunks
 * but does NOT emit per-route HTML files for dynamic segments like
 * /sailing/[id]. This script generates out/sailing/<id>/index.html
 * for every sailing ID so Cloudflare Pages serves the correct RSC
 * flight data instead of falling through to the homepage shell.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'out');
const SAILING_DIR = path.join(OUT_DIR, 'sailing');
const INDEX_HTML = path.join(OUT_DIR, 'index.html');
const ROOT_INDEX = path.join(OUT_DIR, 'index.html');

 async function main() {
  // Read the built index.html (homepage shell) as template
  const shellHTML = fs.readFileSync(INDEX_HTML, 'utf-8');

  let ids: string[] = [];
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://portly-api.vqh9mnrdbp.workers.dev';
    const res = await fetch(`${apiUrl}/api/deals?limit=500`);
    if (!res.ok) throw new Error(`API ${res.status}`);
    const json = await res.json();
    const arr = Array.isArray(json) ? json : (json?.data ?? json?.results ?? []);
    ids = arr.map((d: any) => d.id ?? d.sailing_id).filter(Boolean);
  } catch (err) {
    console.warn(`API fetch failed (${err}), using hardcoded fallback ids`);
    ids = [
      'carnival_splendor_2026-09-01_long-beach_7',
      'carnival_horizon_2026-03-08_miami_6__big_31__v4m',
      'disney_wish_2026-06-15_orlando_4',
      'ncl_breakaway_2026-07-01_new-york_7',
      'royal_caribbean_icon_2026-08-10_miami_5',
    ];
  }

  let generated = 0;
  for (const id of ids) {
    const dir = path.join(SAILING_DIR, id);
    fs.mkdirSync(dir, { recursive: true });

    // For each sailing page, we create an index.html that serves the SPA shell.
    // The client-side router in Next.js will detect the URL and load the sailing
    // page chunk (page-<hash>.js) which will then fetch /api/sailing/<id> from
    // the API. The key difference from just serving the homepage shell is that
    // the browser's URL is /sailing/<id>/ which Next.js client router uses to
    // determine which route to render.
    //
    // This works because:
    // 1. CF Pages serves /sailing/<id>/index.html directly (no _redirects needed)
    // 2. Next.js client-side router reads window.location.pathname
    // 3. It matches /sailing/<id>/ to the [id] route
    // 4. The SailingDetailClient fetches data from /api/sailing/<id>

    // Copy the SPA shell to the per-sailing directory
    fs.writeFileSync(path.join(dir, 'index.html'), shellHTML);
    generated++;
  }

  console.log(`Generated ${generated} sailing page HTML files in ${SAILING_DIR}`);

  // Remove index.html from SAILING_DIR root (it would match /sailing/
  // and interfere with the actual sailing routes)
  const sailingRootIndex = path.join(SAILING_DIR, 'index.html');
  if (fs.existsSync(sailingRootIndex)) {
    fs.unlinkSync(sailingRootIndex);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});