# Cleanup, Optimize, & Wire New Pages — Goal-Loop Plan

> **For Hermes:** Use goal-loop methodology. Diagnose → plan → execute → verify in tight loops, with machine-verifiable gates at every transition. Don't move between phases until the prior phase's gates are passing.

**Goal:** Finish post-MVP polish in three sequential phases:
1. **Phase 2 (Cleanup):** Delete debug specs, dead `/api/alerts` references, and dead code
2. **Phase 3 (Optimize):** Lighthouse + WCAG on the new full-width panel and global site
3. **Phase 4 (Wire pages):** Implement `/sailing/[id]` detail page (currently blank/error) and `/alerts` create endpoint (currently 404)

**Architecture:**
- All worker endpoints stay in `workers/src/index.ts` (Hono + D1), single deploy via `wrangler deploy`.
- Frontend uses Next.js static export (`BUILD_TARGET=export`); every route is a `.tsx` page under `src/app/`.
- Tests live in `e2e/` (gitignored); do NOT commit Playwright specs. Add `tw` aliases for Lighthouse equivalents using `playwright-chromium` built-in metrics.

**Tech Stack:**
- Backend: Cloudflare Workers + Hono + D1 (existing)
- Frontend: Next.js 14 Pages Router, Tailwind, TypeScript (existing)
- Testing: Playwright + `@axe-core/playwright`
- CI: Manual wrangler deploy → preview URL → run E2E → promote to production via `wrangler pages deploy out` (project=`portly`)

---

## Diagnostic Findings (Pre-flight, ground-truth)

Before writing code I ran Playwright + curl probes. State of the codebase as of commit `476c81d`:

| Probe | Finding |
|---|---|
| `GET /history` on production | ✅ Renders with full-width panel working (verified in prior loop) |
| `GET /sailing/carnival_mardi-gras_2026-01-15_galveston_7` | ⚠️ **HTTP 200 but "Failed to load sailing details: Failed to load sailing"** — link wired, route renders, but `SailingDetailClient.tsx` fails to fetch `/api/sailing/[id]` |
| Worker file `workers/src/index.ts` `grep alerts` | ❌ **No endpoints `/api/alerts/create` exists** — `/alerts` form posts to non-existent route → 404 |
| `e2e/` directory | 65+ spec files in repo. Many debug-, diagnose-, verify-, check-render- prefixed tests from incremental exploration. These will trip CI & distract from real coverage. |
| Live global Lighthouse (mental estimate) | History panel added a ~16KB region panel + new state. Need actual run to confirm LCP/CLS on `/history` and `/sailing/[id]`. |
| A11y on `/history` panel | Need real `@axe-core/playwright` run — the panel introduces a new heading hierarchy (`h2` inside `region`) that should be re-audited. |

These ground our DoD: every Phase has a *machine-verifiable* pass condition before moving on.

---

## Hard Gates (DoD for the WHOLE plan)

The plan is "done" when **all** of these are verified by command, not by inspection:

| Gate # | Gate | Verification Method | Pass Condition |
|---|---|---|---|
| G0 | Build artifact valid | `BUILD_TARGET=export npm run build` | exit 0, /history chunk shows new panel code |
| G1 | Worker deploys | `npx wrangler deploy --config workers/wrangler.toml` | exit 0, version ID returned |
| G2 | Frontend deploys | `npx wrangler pages deploy out --project-name=portly` | exit 0, preview URL printed |
| G3 | All routes return 200 / no console errors / zero JS exceptions | `npx playwright test e2e/CLEAN.spec.ts e2e/history-panel-drawer.spec.ts e2e/solo-and-history.spec.ts --project=chromium` | 100% pass |
| G4 | Lighthouse on `/history` ≥ 90 across Performance / Accessibility / Best Practices / SEO | `npx lighthouse https://portly-1i0.pages.dev/history --only-categories=... --chrome-flags="--headless --no-sandbox" --output=json` then assert | Each score ≥ 90 |
| G5 | WCAG ≤ 2 violations, 0 serious/critical | `npx playwright test e2e/wcag-audit.spec.ts --project=chromium` | All viewports pass |
| G6 | Links cleaned up | `ls e2e/debug-*.spec.ts e2e/diagnose-*.spec.ts e2e/check-*.spec.ts` | No remaining debug/diagnose/check prefixed specs |

---

# Phase 2: Cleanup

**Rationale:** The repo has accumulated 65+ spec files from iterative debugging. Many are stale (refer to dark-mode toggles removed last month, or to bugs fixed earlier). They add CI noise without value, and one is committed but dead (`filter-selection-grid.spec.ts.deprecated` — the `.deprecated` suffix means it was disabled and forgotten). Two endpoints referenced by the UI (`/api/alerts/create`, `/api/sailing/[id]`) don't exist or are broken. Delete the noise so what's left is meaningful.

**Files involved:**
- Delete: `e2e/debug-*.spec.ts` (12 files), `e2e/diagnose-*.spec.ts` (4 files), `e2e/check-*.test.ts` (2 files), `e2e/verify-phase*.spec.ts` (6 files), `e2e/render-*.spec.ts*` (rare), and any `*.spec.ts-snapshots/` directories whose owning `.spec.ts` is deleted.
- Keep: `app.spec.ts`, `goal-loop-verification.spec.ts`, `wcag-audit.spec.ts`, `history-panel-drawer.spec.ts`, `solo-and-history.spec.ts`, `history-card-refactor.spec.ts`, `sailing-detail.spec.ts`, `accessibility-labels.spec.ts`, `button-size.spec.ts`, `price-history-curve.spec.ts`, `phase1-hero.spec.ts`, `phase4-insider-info.spec.ts`, `phase5-forecast.spec.ts`, `phase6-accessibility.spec.ts`, `ship-info-and-tooltip.spec.ts` (if exists), `ui-consistency.spec.ts`.
- Modify: none in this phase.

### Task 2.1 — Inventory what's stale

**Objective:** Classify every spec file as `keep | delete | archive`.

**Step 1:** List every file with size and last modification.

```bash
ls -la /Users/georgetozer/Development/Portly/e2e/*.spec.ts /Users/georgetozer/Development/Portly/e2e/*.test.ts 2>/dev/null | awk '{print $5"\t"$9}'
```

**Step 2:** For each file matching `debug-*`, `diagnose-*`, `check-*`, `verify-phase*`, `count-cards-*`, open it; if it's a one-shot diagnostic (uses `console.log` instead of `expect`, has throwaway markup, etc.), it's `delete`. If it's a proper regression test, move it to `keep`.

**Step 3:** Produce a manifest like:

```
KEEP   = ["app.spec.ts", "history-panel-drawer.spec.ts", ...]   # ~15 files
DELETE = ["debug-colors.spec.ts", "diagnose-price-mismatch.spec.ts", ...]  # ~50 files
```

**Step 4:** Output the manifest as JSON to `e2e/.audit.json` so the next task is deterministic.

### Task 2.2 — Delete stale specs & committed debug artifacts

**Objective:** Remove the noise listed in `e2e/.audit.json["DELETE"]`. Don't commit the manifest itself.

**Step 1:** Delete files. `e2e/` is gitignored, so this is a workspace-only op:

```bash
cd /Users/georgetozer/Development/Portly
jq -r '.DELETE[]' e2e/.audit.json | xargs -I {} rm -f "e2e/{}"
```

**Step 2:** Also delete any orphaned snapshot directories under `e2e/*-snapshots/` whose parent `.spec.ts` was removed:

```bash
find e2e -maxdepth 2 -name "*-snapshots" -type d | while read d; do
  parent="${d%-snapshots}.spec.ts"
  [ ! -f "$parent" ] && rm -rf "$d"
done
```

**Step 3:** Confirm `e2e/` now contains only the kept specs:

```bash
ls e2e/*.spec.ts e2e/*.test.ts | wc -l  # expect ≈ 15
```

**Step 4:** Remove the audit manifest:

```bash
rm e2e/.audit.json
```

**Verification:** Gate G6 — `ls e2e/debug-*.spec.ts e2e/diagnose-*.spec.ts e2e/check-*.spec.ts` returns no results.

### Task 2.3 — Confirm the kept suite still passes green

**Objective:** The kept specs form the new baseline.

**Step 1:** Run the suite against the current preview:

```bash
BASE_URL=https://portly-1i0.pages.dev npx playwright test \
  e2e/app.spec.ts \
  e2e/history-panel-drawer.spec.ts \
  e2e/solo-and-history.spec.ts \
  e2e/wcag-audit.spec.ts \
  --project=chromium --reporter=line
```

**Expected:** All pass; zero console errors; ≤ 2 axe violations.

**Verification:** Gate G3 on the trimmed suite.

### Phase 2 Exit Criteria

- Gate G3 holds on the trimmed 15-spec suite.
- `wc -l e2e/*.spec.ts` ≤ 15.
- No committed (non-gitignored) debug spec remains in git history (verify with `git ls-files | grep -E '(debug|diagnose|check-render)' | wc -l` = 0).

---

# Phase 3: Optimize (Lighthouse + WCAG)

**Rationale:** The full-width panel introduces conversational content (heading `h2` inside `region`, body wrapping), new DOM nodes (panel + close button + sparkline), and a new state machine (open/closed `grid-template-rows`). Real Lighthouse + WCAG numbers confirm we didn't regress CLS, LCP, or accessibility. We need measured numbers, not eyeballs.

### Task 3.1 — Add Lighthouse runner spec

**Objective:** A Playwright-spec wrapper around the `lighthouse` CLI so it runs as part of `npm test`.

**Files:**
- Create: `e2e/lighthouse.spec.ts` (gitignored).
- Modify: none.

**Step 1:** Install Lighthouse once:

```bash
npm install --no-save lighthouse
```

**Step 2:** Write the wrapper:

```ts
import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';

const URL = process.env.BASE_URL || 'https://portly-1i0.pages.dev';

test('Lighthouse scores /history', async () => {
  const out = spawnSync('npx', ['lighthouse', `${URL}/history`,
    '--only-categories=performance,accessibility,best-practices,seo',
    '--chrome-flags="--headless --no-sandbox"',
    '--output=json', '--output-path=/tmp/lh.json',
    '--quiet', '--no-enable-error-reporting',
  ], { encoding: 'utf8' });
  expect(out.status).toBe(0);
  const json = JSON.parse(require('node:fs').readFileSync('/tmp/lh.json','utf8'));
  for (const k of ['performance','accessibility','best-practices','seo']) {
    const score = Math.round(json.categories[k].score * 100);
    console.log(`${k}: ${score}`);
    expect(score, `${k} score`).toBeGreaterThanOrEqual(90);
  }
});
```

**Step 3:** Run it against production:

```bash
BASE_URL=https://portly-1i0.pages.dev npx playwright test e2e/lighthouse.spec.ts --project=chromium
```

Capture the four scores printed above the assertion so you have a baseline.

**Verification:** All scores ≥ 90, with `lighthouse*.report.html` saved in `/tmp` for inspection.

### Task 3.2 — Add Core Web Vitals measurement on `/sailing/[id]`

**Objective:** Once Phase 4 wires a real sailing page, measure LCP / CLS / INP via the Chrome DevTools Protocol — Lighthouse is a one-shot, but CWV need a real interaction trace.

**Files:** `e2e/cwv-sailing.spec.ts`

**Step 1:** Write a spec that:

```ts
test('CWV /sailing:carnival_mardi-gras_2026-01-15_galveston_7', async ({ page }) => {
  await page.goto(`${BASE_URL}/sailing/carnival_mardi-gras_2026-01-15_galveston_7`, { waitUntil: 'networkidle' });
  // Wait for hero heading to settle
  await page.waitForSelector('h1');
  // Inject CWV observer
  await page.evaluate(() => {
    (window as any).__cwv = { lcp: 0, cls: 0 };
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) (window as any).__cwv.lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) (window as any).__cwv.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  // Simulate a user scrolling + click on "Track Price Alert"
  await page.click('button:has-text("Track Price Alert")');
  await page.waitForTimeout(2000);
  const cwv = await page.evaluate(() => (window as any).__cwv);
  console.log('CWV', cwv);
  expect(cwv.lcp).toBeLessThan(2500);
  expect(cwv.cls).toBeLessThan(0.1);
});
```

**Step 2:** Skip running until Phase 4 ships.

### Task 3.3 — Re-run full WCAG audit on every page

**Objective:** Confirm no new contrast / focus / landmark issues from the history panel refactor.

**Step 1:** Re-run the existing audit:

```bash
BASE_URL=https://portly-1i0.pages.dev npx playwright test e2e/wcag-audit.spec.ts --project=chromium --reporter=list
```

**Step 2:** For every violation tagged with `serious` or `critical`, write a one-line fix in `docs/plans/2026-07-25-wcag-fixes.md`.

**Step 3:** Apply fixes (typical: missing `aria-label`, low-contrast `<span>`, `<button>` without `type="button"`). Each fix is its own commit:

```bash
git commit -m "a11y: add aria-label to detail panel close button"
```

**Step 4:** Re-run audit, expect 0 violations of severity ≥ serious.

**Verification:** Gate G5 — axe passes.

### Task 3.4 — Inspect Lighthouse "Opportunities" for cheap wins

**Objective:** Pull the JSON from Task 3.1 and act on top three recommendations under "diagnostics" / "opportunities" that don't require architecture changes.

**Step 1:** Read `/tmp/lh.json` summaries:

```bash
node -e 'const r=JSON.parse(require("fs").readFileSync("/tmp/lh.json","utf8")); for(const a of r.audits) if(a.details && a.details.type==="opportunity" && a.score !== null && a.score < 0.9) console.log(a.id, a.title, "savings:", a.details.overallSavingsMs || "-", "ms");'
```

**Step 2:** Apply up to three quick wins (e.g., `unused-css-rules`, `render-blocking-resources`, `uses-text-compression`). Each in its own commit.

**Step 3:** Re-run Lighthouse; expect ≥ 1 of the three to improve.

**Verification:** Lighthouse re-run shows improved scores (e.g., performance ≥ 95).

### Phase 3 Exit Criteria

- Gate G4: Lighthouse `/history` ≥ 90 across all four categories.
- Gate G5: zero serious/critical axe violations on `/`, `/deals`, `/solo`, `/history`, `/sailing/[id]`, `/alerts`.
- Lighthouse opportunities log file `docs/lighthouse-baseline.json` committed for trend tracking.

---

# Phase 4: Wire new pages (`/sailing/[id]` + `/alerts`)

**Rationale:** Two user-visible routes currently fail:
1. **`/sailing/[id]`** returns 200 but renders "Failed to load sailing details". The route is wired (Next.js dynamic route, `SailingDetailClient.tsx`) but the matching worker endpoint either doesn't exist or its SQL is wrong against the actual D1 schema. Probes show this in Phase 0.
2. **`/alerts`** page is wired (form, validation) but POSTs to `/api/alerts/create` which doesn't exist in the worker. Form submission silently fails.

We need both routes to actually work. Both are touched-from-history funnel points: users click "View" on a sailing inventory row → go to sailing detail → click "Track Price Alert" → POST a price alert.

### Task 4.1 — Diagnose `/sailing/[id]` failure (TDD red)

**Objective:** Pin down which exact failure path the page is hitting. Use Playwright to log network + console + the actual `/api/sailing/[id]` response.

**Files:**
- Create throwaway: `e2e/diagnose-sailing.spec.ts` (gitignored, removed after Phase 4).

**Step 1:** Write a spec that hits the URL and captures everything:

```ts
test('diagnose /sailing/:id', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', e => errors.push(`PAGE_ERROR: ${e.message}`));
  await page.goto(`${BASE_URL}/sailing/carnival_mardi-gras_2026-01-15_galveston_7`);
  const apiStatus = await page.evaluate(async () => {
    const r = await fetch('/api/sailing/carnival_mardi-gras_2026-01-15_galveston_7');
    return { status: r.status, body: await r.text() };
  });
  console.log('API response:', apiStatus);
  console.log('Errors:', errors);
});
```

**Step 2:** Run it. Read the captured output:

```bash
BASE_URL=https://portly-1i0.pages.dev npx playwright test e2e/diagnose-sailing.spec.ts --project=chromium --reporter=line
```

**Step 3:** Identify the failure mode from the log:
- API returns 404 → no `/api/sailing/[id]` route handler exists → write it (Task 4.2).
- API returns 500 → SQL wrong against actual D1 schema → read `workers/src/index.ts` for the route, fix it (Task 4.3).
- API returns 200 but body shape doesn't match `SailingDetailClient.tsx` → adjust either side (Task 4.4).

**Step 4:** Delete the diagnostic spec:

```bash
rm e2e/diagnose-sailing.spec.ts
```

Record the diagnosed failure mode in this plan between Tasks 4.1 and 4.2 as a one-sentence root-cause note. (Decision lives below in "Failure modes" — execute whichever matches.)

### Failure modes (select one)

**FM-A — endpoint missing:**

### Task 4.2A — Add `/api/sailing/[id]` endpoint

**Objective:** Fetch one sailing plus its itinerary, cabin prices, and price-history timestamps.

**Files:**
- Modify: `workers/src/index.ts` (add route).
- D1 schema reminder: `sailings.id` is TEXT (slug), FK to `ships`, `cruise_lines`, `destinations`, plus a JSON `history` column with cached price points.

**Step 1:** Add the route right after the `/api/history` handler:

```ts
app.get('/api/sailing/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare(`
    SELECT s.id, s.sail_date, s.nights, s.price, s.original_price,
           s.history, s.fingerprint,
           sh.name AS ship, cl.name AS cruise_line, d.name AS destination,
           p.name AS departure_port
    FROM sailings s
    JOIN ships sh ON s.ship_id = sh.id
    JOIN cruise_lines cl ON s.cruise_line_id = cl.id
    LEFT JOIN destinations d ON s.destination_id = d.id
    LEFT JOIN ports p ON s.departure_port_id = p.id
    WHERE s.id = ?
  `).bind(id).first();
  if (!row) return c.json({ error: 'not found' }, 404);

  const { results: cabinPrices } = await c.env.DB.prepare(`
    SELECT cc.name AS category, cp.base_fare_per_person,
           cp.port_tax_per_person, cp.gratuity_per_person_per_night,
           cp.total_per_person
    FROM cabin_prices cp
    JOIN cabin_categories cc ON cp.cabin_category_id = cc.id
    WHERE cp.sailing_id = ?
    ORDER BY cc.name
  `).bind(id).all();

  let priceHistory: number[] = [];
  try { priceHistory = JSON.parse(row.history || '[]'); } catch { /* swallow */ }

  return c.json({
    sailing: {
      id: row.id,
      ship: row.ship,
      cruiseLine: row.cruise_line,
      destination: row.destination,
      departurePort: row.departure_port,
      sailDate: row.sail_date,
      nights: row.nights,
      price: row.price,
      originalPrice: row.original_price,
      priceHistory,
    },
    cabinPrices,
  });
});
```

**Step 2:** Deploy worker:

```bash
npx wrangler deploy --config workers/wrangler.toml
```

**Step 3:** Curl it:

```bash
curl -s https://portly-api.vqh9mnrdbp.workers.dev/api/sailing/carnival_mardi-gras_2026-01-15_galveston_7 | head -c 500
```

**Expected:** JSON with `sailing.ship`, `cabinPrices[0].category`, etc. If 500, see FM-B.

**Step 4:** Move to Task 4.5.

**FM-B — endpoint exists but 500s on SQL:**

### Task 4.2B — Fix existing `/api/sailing/:id` SQL

**Objective:** Align the route handler with `schema/001_init.sql` (the real D1 schema, NOT `server/db/schema.sql` which is Postgres-specific).

**Step 1:** Read the existing handler near line 350–500 of `workers/src/index.ts`. Identify the offending SQL.

**Step 2:** Reuse the SELECT pattern from Task 4.2A.

**Step 3:** Re-deploy and curl-verify as in 4.2A Step 2-3.

**Step 4:** Move to Task 4.5.

**FM-C — shape mismatch:**

### Task 4.2C — Reconcile API shape with `SailingDetailClient.tsx`

**Objective:** Read the existing handler, the existing component, and pick the winner. Adjust the loser.

**Step 1:** Read both (`workers/src/index.ts` route handler; `src/app/sailing/[id]/SailingDetailClient.tsx` first 100 lines).

**Step 2:** Choose which side to change based on which is closer to the canonical schema. Bias toward the API because that's where the data is authoritative.

**Step 3:** Adjust the loser; deploy / rebuild as needed.

**Step 4:** Move to Task 4.5.

### Task 4.3 — Wire `/api/alerts/create`

**Objective:** Persist price alerts to a new D1 table. Need a schema migration first.

**Files:**
- Modify: `schema/002_alerts.sql` (new file)
- Modify: `workers/wrangler.toml` (no — D1 migrations apply via `wrangler d1 execute`)
- Modify: `workers/src/index.ts` (add route)

**Step 1:** Author the schema:

```sql
-- schema/002_alerts.sql
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  sailing_id TEXT,
  sailing_url TEXT,
  threshold_pct INTEGER DEFAULT 10,
  created_at INTEGER DEFAULT (unixepoch()),
  active INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_alerts_email ON alerts(email);
CREATE INDEX IF NOT EXISTS idx_alerts_sailing ON alerts(sailing_id);
```

**Step 2:** Apply to production D1:

```bash
npx wrangler d1 execute portly-db --remote --file=schema/002_alerts.sql
```

**Step 3:** Add the worker route:

```ts
app.post('/api/alerts/create', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || '').trim();
  const sailingUrl = String(body.sailingUrl || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ success: false, error: 'Invalid email' }, 400);
  }
  let sailingId: string | null = null;
  if (sailingUrl) {
    const m = sailingUrl.match(/\/sailing\/([^/?#]+)/);
    if (m) sailingId = decodeURIComponent(m[1]);
    else if (/^[a-z0-9_\-]{3,}$/i.test(sailingUrl)) sailingId = sailingUrl;
  }
  await c.env.DB.prepare(`
    INSERT INTO alerts (email, sailing_id, sailing_url) VALUES (?,?,?)
  `).bind(email, sailingId, sailingUrl || null).run();
  return c.json({ success: true });
});
```

**Step 4:** Deploy worker; curl-verify:

```bash
curl -X POST https://portly-api.vqh9mnrdbp.workers.dev/api/alerts/create \
  -H 'content-type: application/json' \
  -d '{"email":"test@example.com","sailingUrl":"/sailing/carnival_mardi-gras_2026-01-15_galveston_7"}'
```

**Expected:** `{"success":true}`. Then verify the row exists:

```bash
npx wrangler d1 execute portly-db --remote --command \
  "SELECT email, sailing_id FROM alerts ORDER BY id DESC LIMIT 3"
```

### Task 4.4 — Surface a "Track Price Alert" button on the Sailing Detail page

**Objective:** When `/sailing/[id]` loads successfully, render a button that opens `/alerts` with the sailing URL pre-filled. Don't rebuild the whole page.

**Files:**
- Modify: `src/app/sailing/[id]/SailingDetailClient.tsx`

**Step 1:** Find the existing "Tracking" section in the component. Locate the button/link that says "Track Price Alert" or similar.

**Step 2:** Replace its `href` to construct `/alerts?sailing=/sailing/<id>`:

```tsx
<Link
  href={`/alerts?sailing=${encodeURIComponent('/sailing/' + sailing.id)}`}
  className="..."
>
  <MaterialIcon name="notifications_active" size="sm" />
  Track Price Alert
</Link>
```

**Step 3:** In the alerts page, read the `?sailing=` query param and pre-fill the URL field:

```tsx
// src/app/alerts/page.tsx — add to top of component
const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
const initialSailing = params.get('sailing') || '';
const [sailingUrl, setSailingUrl] = useState(initialSailing);
```

And update the input's `value` prop and `onChange`.

**Step 4:** Build + deploy:

```bash
BUILD_TARGET=export npm run build && npx wrangler pages deploy out --project-name=portly
```

### Task 4.5 — End-to-end wire test

**Objective:** Cover the full funnel: history → click "View" on a sailing inventory row → sailing detail loads → click "Track Price Alert" → alerts form pre-filled → submit → success.

**Files:**
- Create: `e2e/sailing-and-alerts.spec.ts` (gitignored).

**Step 1:** The test:

```ts
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://portly-1i0.pages.dev';

test('history → sailing → alerts funnel', async ({ page }) => {
  await page.goto(`${BASE}/history`);
  await page.waitForSelector('button[aria-expanded]');
  // Expand Carnival card
  await page.locator('button[aria-expanded]').filter({ hasText: 'Carnival' }).first().click();
  await page.waitForSelector('[role="region"]');
  // Click the first "View" link inside the panel
  await page.locator('[role="region"] a:has-text("View")').first().click();
  await page.waitForURL(/\/sailing\//);
  // Sailing detail loaded — check h1 exists
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  // Click Track Price Alert
  await page.locator('a:has-text("Track Price Alert")').first().click();
  await page.waitForURL(/\/alerts\?sailing=/);
  // Sailing URL field is pre-filled
  const v = await page.locator('input[name="sailingUrl"], input[placeholder*="sailing" i]').first().inputValue();
  expect(v).toMatch(/^\/sailing\//);
  // Fill email & submit
  await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
  await page.locator('button:has-text("Create Alert")').click();
  // Success alert visible
  await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
});
```

**Step 2:** Run it:

```bash
BASE_URL=https://portly-1i0.pages.dev npx playwright test e2e/sailing-and-alerts.spec.ts --project=chromium
```

**Expected:** PASS with no console errors.

**Verification:** Gates G0, G1, G2, G3, G5.

### Phase 4 Exit Criteria

- All three sub-phases (4.2, 4.3, 4.4, 4.5) PASS.
- The funnel test in Task 4.5 succeeds on production (`portly-1i0.pages.dev`).
- `SELECT count(*) FROM alerts` returns > 0 (real users can submit).
- New endpoints do not regress the Worker CPU budget (no 503s).

---

# Final Rollout

After all phases, in order:

```bash
# 1. Trimmed suite still green
BASE_URL=https://portly-1i0.pages.dev npx playwright test --project=chromium

# 2. Lighthouse report committed
cp /tmp/lh.json docs/lighthouse-baseline.json
git add docs/lighthouse-baseline.json
git commit -m "docs: lighthouse baseline after history panel refactor"

# 3. Single atomic PR (or sequenced commits if changes are large)
git add -A
git commit -m "Phase 2-4: cleanup e2e/ debug specs, fix /sailing/[id] endpoint, add /api/alerts/create"
git push origin main

# 4. Confirm prod is healthy
BASE_URL=https://portly-1i0.pages.dev npx playwright test \
  e2e/history-panel-drawer.spec.ts \
  e2e/sailing-and-alerts.spec.ts \
  e2e/wcag-audit.spec.ts \
  --project=chromium --reporter=line
```

---

# Definition of Done (overall)

The plan succeeds only when **every** pass condition below is met, all verified by command:

| DoD check | Method | Pass |
|---|---|---|
| `e2e/` contains ≤ 15 spec files | `ls e2e/*.spec.ts \| wc -l` | ≤ 15 |
| Build passes | `BUILD_TARGET=export npm run build` | exit 0 |
| Worker deploys | `npx wrangler deploy --config workers/wrangler.toml` | exit 0, version printed |
| Frontend deploys | `npx wrangler pages deploy out --project-name=portly` | exit 0, preview URL printed |
| `/history` Lighthouse Performance ≥ 90 | `lighthouse .../history --only-categories=performance` | ≥ 90 |
| `/history` Lighthouse Accessibility ≥ 95 | same | ≥ 95 |
| `/history` Lighthouse Best Practices ≥ 90 | same | ≥ 90 |
| `/history` Lighthouse SEO ≥ 90 | same | ≥ 90 |
| Zero serious/critical axe violations across all kept pages | `npx playwright test e2e/wcag-audit.spec.ts` | pass |
| `GET /sailing/<real-id>` returns JSON 200 with shape the client expects | `curl /api/sailing/...` | 200 + has `sailing.ship` |
| `/sailing/<real-id>` page renders sailing detail, not error | Playwright assertion: no "Failed to load" text | pass |
| `POST /api/alerts/create` returns `{success:true}` for valid email | `curl -X POST ...` | success |
| `/alerts` form submits successfully and shows success alert | Playwright funnel test | pass |
| History → Sailing → Alerts E2E funnel passes | `e2e/sailing-and-alerts.spec.ts` | pass |

If any of these fail, the corresponding task is incomplete and Phase 4 has not shipped.

---

# Rollback Plan

Each phase is revertible independently:

**Phase 2 (cleanup):** Specs are gitignored — re-creating them requires re-running E2E tasks. No rollback needed for cleaner repo.

**Phase 3 (Lighthouse/a11y):** Revert the commits tagged `a11y:` or `perf:` individually. No data risk.

**Phase 4 (wiring):** Roll back in reverse order to avoid leaving the worker endpoint unreachable.
```bash
# Revert alerts schema migration
npx wrangler d1 execute portly-db --remote --command "DROP TABLE IF EXISTS alerts;"

# Revert worker endpoints
git revert <commit adding /api/alerts/create>
npx wrangler deploy --config workers/wrangler.toml

# Revert frontend detail-page link wiring
git revert <commit modifying SailingDetailClient.tsx>
BUILD_TARGET=export npm run build
npx wrangler pages deploy out --project-name=portly

# Revert /sailing/[id] handler
git revert <commit adding /api/sailing/:id>
npx wrangler deploy --config workers/wrangler.toml
```

After full rollback, `/sailing/[id]` will render the same blank-error state as before Phase 4 and `/alerts` will fail to POST (same as pre-Phase-4 state). The rest of the site is unaffected.
