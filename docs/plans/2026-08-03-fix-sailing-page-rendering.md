# Fix Sailing Page Rendering — Per-Sailing HTML Generation

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make `/sailing/<id>/` pages render real sailing content (ship name, cabin breakdown, price history graphs) instead of the homepage shell, on Cloudflare Pages static export.

**Architecture:** Next.js `output: 'export'` (v14.2.35) generates 520 "static pages" in the build summary but **silently skips writing per-sailing HTML files** — the `prerender-manifest.json` contains 17 routes with zero sailing routes. The workaround script `scripts/generate-sailing-pages.ts` creates 500 per-sailing directories by copying `out/index.html` (the homepage shell) with the RSC payload stripped, but the homepage's static HTML body (hero, search bar, feature cards, footer) remains inline in the file. When the client router boots with an empty `self.__next_f` queue and no initial route data, Next.js falls back to the `/` route, rendering the homepage. The fix: generate per-sailing HTML files that contain a minimal skeleton (just `<div id="__next">` + Next.js bootstrap scripts) so the client router resolves from `window.location.pathname` and fetches the sailing data via the existing `useLiveData` hook.

**Tech Stack:** Next.js 14.2.35 (output: export), Cloudflare Pages, Cloudflare Workers API, Playwright E2E

---

## Root Cause Investigation (Verified)

### Finding 1: Next.js export does NOT write per-sailing HTML files

```
$ rm -rf out .next && BUILD_TARGET=export npx next build
# Build summary says:
#   ✓ Generating static pages (520/520)
#   ● /sailing/[id]   22.7 kB   123 kB
#   ├ /sailing/carnival_horizon_2026-03-08_miami_6__big_31__v4m
#   ├ /sailing/carnival_horizon_2026-03-08_miami_6__big_3__v4m
#   ...

$ find out -name "*.html" | wc -l
  17   ← only 16 static pages + 404.html, ZERO sailing pages

$ find out -path "*sailing*" -not -path "*/_next/*"
  (empty)  ← no out/sailing/ directory at all

$ python3 -c "...prerender-manifest.json routes..."
  17 routes, 0 sailing routes  ← sailing routes NOT in manifest
```

### Finding 2: The postbuild script masks the bug by writing homepage shells

`scripts/generate-sailing-pages.ts` reads `out/index.html` (the homepage), strips the RSC `self.__next_f.push()` calls, and writes the result to `out/sailing/<id>/index.html` for 500 sailing IDs. But the **static HTML body** (homepage hero, search bar, feature cards, price comparison table, footer) remains inline in the file. The browser renders this static HTML immediately. Then Next.js hydrates with an empty route queue (`self.__next_f=[]`), falls back to the `/` route, and renders the homepage client component again on top.

### Finding 3: The API returns real sailing data

```
$ curl -s 'https://portly-api.vqh9mnrdbp.workers.dev/api/sailing/carnival_horizon_2026-03-08_miami_6__big_3__v4m'
  {"sailing":{"id":"carnival_horizon_2026-03-08_miami_6__big_3__v4m","sailing_id":"carnival_horizon_2026-03-08_miami_6__big_3__v4m","line":"Carnival","ship":"Carnival Horizon","days":3,"port":"Miami",...}}
  200 OK  ← real data with ship name, route, price history
```

The `SailingDetailClient.tsx` already has a `useLiveData` hook that fetches `/api/sailing/${sailingId}` on mount. The problem is it never mounts because the homepage client component renders first and the route never resolves to `/sailing/[id]`.

### Finding 4: The existing safeInitialData guard is correct but never reached

`SailingDetailClient.tsx:72-75` already guards against stale `initialData` from the homepage shell:
```typescript
const safeInitialData =
  initialData?.sailing?.sailing_id && initialData.sailing.sailing_id === sailingId
    ? initialData
    : undefined;
```
This guard works correctly — but it's inside `SailingDetailClient`, which never renders because the client router resolves to the `/` route (homepage), not `/sailing/[id]`.

---

## Gate Table

| Gate # | Gate | Verification Method | Pass Condition |
|--------|------|---------------------|----------------|
| G1 | Per-sailing HTML contains minimal skeleton, NOT homepage body | `grep -c "Track the Absolute" out/sailing/carnival_horizon_2026-03-08_miami_6__big_3__v4m/index.html` | Returns `0` |
| G2 | Per-sailing HTML contains Next.js bootstrap scripts | `grep -c "webpack-" out/sailing/carnival_horizon_2026-03-08_miami_6__big_3__v4m/index.html` | Returns `>= 1` |
| G3 | Per-sailing HTML contains the sailing page chunk (not homepage page chunk) | `grep -c "chunks/app/sailing" out/sailing/carnival_horizon_2026-03-08_miami_6__big_3__v4m/index.html` | Returns `>= 1` |
| G4 | Build passes | `BUILD_TARGET=export pnpm run build` | Exit code 0 |
| G5 | TypeScript compiles | `npx tsc --noEmit` | Exit code 0 |
| G6 | Preview deployed | `npx wrangler pages deploy out --project-name=portly --commit-dirty=true` | Output contains "Deployment complete" |
| G7 | Sailing page renders ship name (not homepage) | Playwright: `e2e/sailing-detail.spec.ts` test "previously-404 sailing ID returns 200 and renders content" | PASS — h1 text contains "horizon" |
| G8 | Deals page still works | Playwright: `_smoke.spec.ts` test "deals page loads" | PASS |
| G9 | Full Playwright suite | `cd /Users/georgetozer/Development/Portly && BASE_URL=<preview> npx playwright test e2e/sailing-detail.spec.ts e2e/cabin-graphs.spec.ts e2e/_smoke.spec.ts e2e/deals-count-fix.spec.ts --project=chromium` | ≥ 90% pass rate (was 212/212 on commit 8a489d6) |

---

## Phase 1: Rewrite generate-sailing-pages.ts to emit a proper SPA skeleton

**Objective:** Replace the homepage-shell-copy approach with a minimal Next.js SPA skeleton that lets the client router resolve `/sailing/<id>` from `window.location.pathname` and fetch data via the existing `useLiveData` hook.

**Key insight:** The per-sailing HTML file needs:
1. `<html lang="en"><head>` with CSS + font links (copy from homepage `<head>`)
2. `<body>` with just `<div id="__next"></div>` — no static homepage content
3. Next.js bootstrap scripts: `webpack-*.js`, `main-app-*.js`, and the sailing page chunk `app/sailing/[id]/page-*.js`
4. An empty RSC queue: `<script>self.__next_f=[]</script>`

The client router will see `window.location.pathname = "/sailing/<id>/"`, resolve the route, load the sailing page chunk, render `SailingDetailClient`, which calls `useLiveData` → `fetch("/api/sailing/<id>")`, and hydrate with real data.

### Task 1: Rewrite generate-sailing-pages.ts

**Files:**
- Modify: `scripts/generate-sailing-pages.ts` (complete rewrite)

**Step 1: Read the homepage HTML to extract `<head>` and script URLs**

```typescript
// Extract <head>...</head> from homepage — contains CSS links, font links, meta tags
const headMatch = html.match(/<head>([\s\S]*?)<\/head>/);
const headContent = headMatch ? headMatch[1] : '';

// Extract all script src URLs from the homepage (webpack, main-app, chunks)
const scriptSrcs = [...html.matchAll(/<script\s+src="([^"]+)"[^>]*><\/script>/g)]
  .map(m => m[1]);

// Extract the sailing page chunk specifically
// It's at out/_next/static/chunks/app/sailing/[id]/page-*.js
const sailingChunkFiles = fs.readdirSync(
  path.join(OUT_DIR, '_next', 'static', 'chunks', 'app', 'sailing', '[id]')
);
const sailingPageChunk = sailingChunkFiles.find(f => f.startsWith('page-'));
```

**Step 2: Build the per-sailing skeleton**

```typescript
function buildSailingShell(
  headContent: string,
  homepageScripts: string[],
  sailingPageScriptSrc: string
): string {
  // Filter out the homepage page chunk (app/page-*.js) — we want the sailing chunk instead
  const bootstrapScripts = homepageScripts
    .filter(src => !src.includes('app/page-'))  // exclude homepage page chunk
    .map(src => `<script src="${src}" async=""></script>`)
    .join('');

  return `<!DOCTYPE html><html lang="en"><head>${headContent}</head>
<body class="min-h-screen bg-canvas text-ink font-interface antialiased">
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-indigo focus:px-4 focus:py-2 focus:text-white focus:shadow-lg">Skip to main content</a>
<main id="main-content" class="scroll-mt-24">
<div id="__next"></div>
</main>
${bootstrapScripts}
<script src="/_next/static/chunks/app/sailing/[id]/page-${sailingPageScriptSrc}" async=""></script>
<script>self.__next_f=[]</script>
</body></html>`;
}
```

**Step 3: Write the shell for each sailing ID**

Same loop as before — fetch 500 IDs from API, write the skeleton to `out/sailing/<id>/index.html`.

**Step 4: Verify the shell has no homepage content**

```bash
grep -c "Track the Absolute" out/sailing/carnival_horizon_2026-03-08_miami_6__big_3__v4m/index.html
# Expected: 0
grep -c "Find Your Perfect Voyage" out/sailing/carnival_horizon_2026-03-08_miami_6__big_3__v4m/index.html
# Expected: 0
grep -c "webpack-" out/sailing/carnival_horizon_2026-03-08_miami_6__big_3__v4m/index.html
# Expected: >= 1
```

### Task 2: Fix _redirects for proper file serving

**Files:**
- Modify: `public/_redirects`

**Current (broken):**
```
/api/*  https://portly-api.vqh9mnrdbp.workers.dev/api/:splat  302
/sailing/*  /sailing/:splat/index.html  200
/*  /index.html  200
```

**Fixed:**
```
/api/*  https://portly-api.vqh9mnrdbp.workers.dev/api/:splat  302
/*  /index.html  200
```

**Rationale:** Cloudflare Pages serves static files from `out/` before checking `_redirects`. Since `out/sailing/<id>/index.html` exists as a real file, Pages will serve it directly. The `/sailing/*` rewrite rule is unnecessary and may interfere. The `/* /index.html 200` catch-all only fires when no matching file exists (e.g., client-side navigation to `/deals` from another page — but those have their own `out/deals/index.html`).

**Step 1: Write the fixed _redirects**
```bash
# Remove the /sailing/* rule — file serving handles it
echo '/api/*  https://portly-api.vqh9mnrdbp.workers.dev/api/:splat  302
/*  /index.html  200' > public/_redirects
```

**Step 2: Verify**
```bash
cat public/_redirects
# Expected:
# /api/*  https://portly-api.vqh9mnrdbp.workers.dev/api/:splat  302
# /*  /index.html  200
```

---

## Phase 2: Verify SailingDetailClient fetches data correctly

**Objective:** Confirm the `SailingDetailClient.tsx` correctly fetches data via `useLiveData` when `initialData` is undefined (which it will be, since the skeleton has no RSC data).

### Task 3: Verify the fetcher works without initialData

**Files:**
- Read: `src/app/sailing/[id]/SailingDetailClient.tsx:55-77`
- Read: `src/hooks/useLiveData.ts`

**Check:** The `useLiveData` hook starts with `loading: true` and calls `fetcher()` on mount. The fetcher calls `fetch("/api/sailing/<id>")`. But — critical issue — the fetcher uses `process.env.NEXT_PUBLIC_API_URL || ''` which under static export (no server) resolves to `''`, making the fetch URL just `/api/sailing/<id>` — a relative URL. On Cloudflare Pages, `/api/*` is proxied to the Worker via `_redirects`. So the fetch should work.

**Step 1: Verify the fetch URL resolves**

```bash
curl -s -o /dev/null -w "%{http_code}" 'https://<preview>.portly-1i0.pages.dev/api/sailing/carnival_horizon_2026-03-08_miami_6__big_3__v4m'
# Expected: 200 (proxied to Worker via _redirects)
```

**Step 2: If the relative URL fails, patch the fetcher to use absolute Worker URL**

If the `_redirects` 302 redirect doesn't work for `fetch()` (browsers may not follow 302 for `fetch` automatically), change the fallback from `''` to the Worker URL:

```typescript
// SailingDetailClient.tsx:61
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://portly-api.vqh9mnrdbp.workers.dev'}/api/sailing/${sailingId}`, { cache: 'no-store' });
```

This matches the pattern already used in `generateStaticParams` (line 17) and `getSailingData` (line 38) in `page.tsx`.

---

## Phase 3: Build, deploy, verify

### Task 4: Build and deploy

**Step 1: Clean build**
```bash
cd /Users/georgetozer/Development/Portly
rm -rf out .next
BUILD_TARGET=export pnpm run build
```
**Expected:** Exit 0, "Wrote 500 sailing pages to out/sailing"

**Step 2: Verify per-sailing HTML content**
```bash
# No homepage content
grep -c "Track the Absolute" out/sailing/carnival_horizon_2026-03-08_miami_6__big_3__v4m/index.html
# Expected: 0

# Has Next.js bootstrap
grep -c "webpack-" out/sailing/carnival_horizon_2026-03-08_miami_6__big_3__v4m/index.html
# Expected: >= 1

# Has sailing page chunk (not homepage page chunk)
grep -c "sailing" out/sailing/carnival_horizon_2026-03-08_miami_6__big_3__v4m/index.html
# Expected: >= 1

# Has empty RSC queue
grep -c 'self.__next_f=\[\]' out/sailing/carnival_horizon_2026-03-08_miami_6__big_3__v4m/index.html
# Expected: 1
```

**Step 3: Deploy to preview**
```bash
npx wrangler pages deploy out --project-name=portly --commit-dirty=true
```
**Expected:** "Deployment complete! Take a peek over at https://<hash>.portly-1i0.pages.dev"

### Task 5: Run Playwright verification

**Step 1: Run sailing-detail tests**
```bash
BASE_URL=https://<preview>.portly-1i0.pages.dev npx playwright test e2e/sailing-detail.spec.ts --project=chromium --reporter=list
```
**Expected:** 3 passed — including "previously-404 sailing ID returns 200 and renders content" with h1 containing "horizon"

**Step 2: Run cabin-graphs tests**
```bash
BASE_URL=https://<preview>.portly-1i0.pages.dev npx playwright test e2e/cabin-graphs.spec.ts --project=chromium --reporter=list
```
**Expected:** All pass (8 tests that were failing should now pass with real sailing content)

**Step 3: Run smoke + deals tests**
```bash
BASE_URL=https://<preview>.portly-1i0.pages.dev npx playwright test e2e/_smoke.spec.ts e2e/deals-count-fix.spec.ts --project=chromium --reporter=list
```
**Expected:** All pass (deals page already confirmed working)

### Task 6: Commit and push

```bash
cd /Users/georgetozer/Development/Portly
git add scripts/generate-sailing-pages.ts public/_redirects src/app/sailing/\[id\]/SailingDetailClient.tsx
git commit -m "fix(sailing): generate minimal SPA skeleton for per-sailing HTML

Next.js output:'export' silently skips writing per-sailing HTML files
(prerender-manifest.json has 0 sailing routes despite build summary
showing 520 pages). The postbuild script was copying the homepage shell
into out/sailing/<id>/index.html, causing every sailing page to render
the homepage instead of sailing details.

Fix: generate a minimal <div id=\"__next\"></div> skeleton with the
sailing page chunk loaded, so the client router resolves /sailing/[id]
from window.location and fetches data via useLiveData.

Also fix SailingDetailClient fetcher to use absolute Worker URL when
NEXT_PUBLIC_API_URL is unset (relative URL fails on CF Pages static)."

git push origin main
```

---

## Rollback Plan

If the fix doesn't work (sailing pages still show homepage or break):

```bash
# Revert generate-sailing-pages.ts to last working commit
git checkout 8a489d6 -- scripts/generate-sailing-pages.ts public/_redirects
rm -rf out && BUILD_TARGET=export pnpm run build
npx wrangler pages deploy out --project-name=portly --commit-dirty=true
```

**Alternative fallback:** If the minimal skeleton approach doesn't work either (Next.js client router may not resolve the route from just the URL without RSC data), consider switching to `output: 'standalone'` with a Cloudflare Worker adapter (e.g., `@opennextjs/cloudflare`) which supports SSR for dynamic routes. This is a larger change but eliminates the static export limitation entirely.

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Next.js client router doesn't resolve `/sailing/[id]` from URL alone (needs RSC data) | Medium | The `self.__next_f=[]` empty queue forces the router to fetch the route data from the client. If this fails, the fallback is to fetch the RSC payload from `/_next/data/...` which may not exist in export mode. Test early in Phase 3. |
| Cloudflare Pages `_redirects` catch-all `/* /index.html 200` overrides file serving for `/sailing/*` | Low | CF Pages serves existing files before checking `_redirects`. Verified that `out/deals/index.html` is served directly despite the catch-all. |
| The `fetch()` in `useLiveData` fails because the 302 redirect from `_redirects` isn't followed | Medium | Fall back to absolute Worker URL (`https://portly-api.vqh9mnrdbp.workers.dev/api/sailing/<id>`) in the fetcher. Already used in `page.tsx`. |
| Build fails because the sailing page chunk path has square brackets (`[id]`) | Low | The chunk exists at `out/_next/static/chunks/app/sailing/[id]/page-*.js`. `fs.readdirSync` handles bracket paths on macOS. The `<script src>` will need URL encoding: `/_next/static/chunks/app/sailing/%5Bid%5D/page-*.js`. |
| 500 sailing pages × 500 API calls during build is slow | Low | Already happening — `generateStaticParams` fetches `/api/deals?limit=500` once. The postbuild script also fetches the same endpoint. No additional API calls. |
