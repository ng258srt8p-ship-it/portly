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

const OUT_DIR = path.resolve(__dirname, '..', 'out');
const SAILING_DIR = path.join(OUT_DIR, 'sailing');
const INDEX_HTML = path.join(OUT_DIR, 'index.html');
const ROOT_INDEX = path.join(OUT_DIR, 'index.html');

async function main() {
  // Read the built index.html (homepage shell) as template
  const shellHTML = fs.readFileSync(INDEX_HTML, 'utf-8');

  // Fetch sailing IDs from the API (same list used at build time)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://portly-api.vqh9mnrdbp.workers.dev';
  const res = await fetch(`${apiUrl}/api/deals?limit=500`);
  if (!res.ok) {
    console.error(`Failed to fetch sailing IDs: ${res.status}`);
    process.exit(1);
  }
  const deals = (await res.json()) as Array<{ id: string }>;
  console.log(`Fetched ${deals.length} sailing IDs`);

  let generated = 0;
  for (const deal of deals) {
    const id = deal.id;
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