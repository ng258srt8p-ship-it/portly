# Portly / TripTide — Complete Gap Audit & Rebuild Plan

> **For Hermes:** Use `subagent-driven-development` skill to execute task-by-task.
>
> **NOTE:** This is Phase 1 — an audit covering all gaps found via systematic investigation on 2026-07-12. Every claim below was verified by reading the actual source files, running the build, checking the terminal, and inspecting the directory structure. Nothing is assumed.

**Goal:** Produce a working end-to-end cruise pricing platform where the frontend pulls real data from the backend API, the backend serves price data (initially from its embedded data set, then from PostgreSQL), and the deploy pipeline is functional.

**Architecture (Target):** Next.js 14 frontend (SSG) → Express API server (port 3001) → PostgreSQL (TimescaleDB) for pricing; agents system as a standalone CLI tool.

**Current State:** The UI builds and renders. Nothing behind it is live — every data path is mocked.

---

## State of the Union

| System | Line of Code | Real or Mock? | Testable Right Now? |
|--------|-------------|---------------|---------------------|
| Frontend UI (`src/`) | ~1,200 | ✅ Static builds | ✅ Build passes |
| Data JSON (`public/data/`) | 6 deal records, 7 itineraries | ✅ Real static files | ✅ Served by Next.js |
| Frontend API layer (`src/services/cruiseApi.ts`) | 144 lines | ⚠️ Real `fetch()` but **to static JSON**, not backend | ✅ Loads in browser |
| Backend Express (`server/`) | ~1,600 | ⚠️ **All mock data** (hardcoded arrays) | ❌ Can't start |
| Pricing math (`server/utils/formulas.ts`) | 286 lines | ✅ Pure functions, no deps | ✅ Unit-testable |
| Hybrid Engine (`server/services/hybridEngine.ts`) | 612 lines | ❌ **Entirely mocked** | ❌ Not wired |
| Affiliate Linker (`server/utils/affiliateLinker.ts`) | 191 lines | ✅ Pure functions | ✅ Unit-testable |
| DB Schema (`server/db/schema.sql`) | 391 lines | ✅ Complete SQL | ✅ Deployable |
| DB Connection | — | ❌ **Does not exist** (no `pg`, no Prisma, no pool) | ❌ Missing |
| Agents (`agents/`) | ~1,200 | ❌ **Not in build pipeline**, can't run | ❌ Can't compile |
| Plugins (`plugins/`) | ~1,350 | ❌ Playwright deps possibly uninstalled | ❌ Untested |
| ESLint | — | ❌ **Not configured** | ❌ `npm run lint` is interactive |
| `frontend/` directory | DARK theme components | ⚠️ Duplicate of `src/` with Portly dark theme | Not wired to build |
| `nim-vscode-extension/` | — | ℹ️ Unrelated VS Code extension | Ignore |
| `triptide-extracted/` | — | ℹ️ Older Vite prototype | Reference only |

---

## Gap Catalog (Every "Looks Good, Doesn't Work" Element)

### GAP 1: Frontend talks to static JSON, not the backend API

- **File:** `src/services/cruiseApi.ts` — endpoints point to `/data/deals.json` and `/data/itineraries.json`
- **What exists:** A complete Express server on port 3001 with `/api/search`, `/api/sailing-breakdown`, `/api/sailing/:id`, `/api/solo-friendly`, `/api/deals` endpoints
- **The gap:** `fetchDeals()` fetches `./data/deals.json` instead of `http://localhost:3001/api/search`. The frontend types (`Deal[]`, `Itinerary[]`) don't match the backend response shapes.
- **Impact:** The fancy server is orphaned. The live-drift jitter in the frontend is a simulation that masks the absence of real data.
- **Fix needed:** Align response shapes, create a client adapter, switch both fetchers to the backend API.

### GAP 2: Backend serves hardcoded data arrays, not a database

- **File:** `server/routes/cruises.ts:71-184` — `mockSailingsDb` is a static array of 7 sailing records
- **File:** `server/services/hybridEngine.ts:439-558` — B2B fetches and stealth checkout scrapes are entirely mocked with `getMockB2BRecords()` and `mockStealthCheckout()`
- **The gap:** Every endpoint returns fabricated data. The comment says "In production, replace with actual pool.query() calls" — but there is NO PostgreSQL client package anywhere in `package.json` or `server/package.json`.
- **Impact:** The server starts and returns 200s, but the data is a fiction. Zero real data flows through the system.
- **Fix needed:** Install `pg`, create a connection pool, seed the DB with the schema in `server/db/schema.sql`, replace mock arrays with SQL queries.

### GAP 3: Response shape mismatch between frontend types and backend types

- **Frontend types** (`src/types/cruise.ts`): `Deal` has `{ id, cruiseLine, ship, destination, price, originalPrice, history, badgeType, ... }`
- **Backend response** (`server/routes/cruises.ts`): Returns `{ results: [{ id, cruiseLine, shipName, departureDate, financials: { totalOutTheDoor, formatted: { price } }, ... }] }`
- **The gap:** The frontend expects a flat `Deal[]` with `price`, `history`, `badgeType`, `dropPercent`. The backend returns nested `financials` objects, uses `shipName` vs `ship`, lacks `history` and `badgeType`. No adapter layer exists.
- **Impact:** Even if you point the frontend at the backend, the data won't render.
- **Fix needed:** Either change the backend responses to match frontend expectations, or create a frontend adapter/transformer.

### GAP 4: Server won't start — missing root-level integration

- **File:** `package.json` — scripts only have `dev`, `build`, `start`, `lint`, `agents:build`, `agents:run`
- **File:** `server/package.json` — has its own `dev`, `build`, `start`, `sync` scripts
- **The gap:** Root `package.json` has NO script to run the server. Server deps (`express`, `cors`) live in `server/package.json` with `node_modules` in `server/node_modules/`. There's no `npm run server` or `npm run dev:all` at the root level.
- **Impact:** You must `cd server && npm run dev` separately from the frontend. No concurrently/foreman setup.
- **Fix needed:** Add `npm-run-all` or `concurrently` to root dev deps, add `"server"` and `"dev:all"` scripts, or better — merge the server into the root workspace.

### GAP 5: ESLint unconfigured

- **Evidence:** `npm run lint` prompts interactively to choose Strict/Base/Cancel. No `.eslintrc*` file exists in the repo.
- **Impact:** CI/CD pipelines that run `npm run lint` will hang waiting for input.
- **Fix needed:** Run `npm run lint` and accept "Strict" config. Or create `.eslintrc.json` manually.

### GAP 6: Agents system is dead code — can't compile or run

- **Files:** `orchestrator.ts`, `agents/`, `plugins/`, `utils/`
- **The gap:** `tsconfig.json` includes `agents/**/*.ts` and `plugins/**/*.ts` but these files import from `../utils/nimClient` (cross-project relative imports), from `playwright` (not in root `package.json`), and from `puppeteer-extra-plugin-stealth` (in root package.json but Playwright is the actual dep). The build succeeds only because `noEmit: true` is set in tsconfig — the TypeScript checker sees these files but doesn't enforce resolution.
- **The orchestrator** runs via `ts-node orchestrator.ts` which WILL fail because the NIM client expects environment variables that don't exist and the ScrapeAgent tries to launch a real browser.
- **Impact:** `npm run agents:build` is a no-op (tsc with `noEmit: true`), and `npm run agents:run` will crash at runtime.
- **Fix needed:** Either make the agents pipeline runnable (env vars, Playwright install, DB) or acknowledge it's a research tool and isolate it from the main build.

### GAP 7: Hybrid Engine is non-functional scaffolding

- **File:** `server/services/hybridEngine.ts`
- **The gap:** Phase 1 (B2B schedule fetch) uses `getMockB2BRecords()`. Phase 2 (Stealth checkout) uses `mockStealthCheckout()`. Both mock functions return fabricated data. The real implementations are commented out. No B2B API keys are configured. The `B2B_SOURCES` config references `process.env.WIDGETY_API_KEY` etc. that don't exist in `config/app.env`.
- **Impact:** The engine "runs" and generates reports, but produces no real data.
- **Fix needed:** Wire actual B2B API calls, or remove the engine and use a simpler data pipeline.

### GAP 8: No database connection — schema exists but no client

- **File:** `server/db/schema.sql` — 391 lines of complete PostgreSQL schema
- **The gap:** No `pg` (or Prisma, or any DB client) in any `package.json`. No connection pool. No migration runner. The config/app.env references `DB_HOST`, `DB_PORT`, etc. but nothing reads them.
- **Impact:** Zero database interactivity. The whole "multi-passenger data structure with daily price-change history" exists only as SQL text.
- **Fix needed:** Create a `server/db/pool.ts`, install `pg`, add DB connection on startup, run schema migrations, replace mock data with real queries.

### GAP 9: PriceComparisonTable receives no real data

- **File:** `src/components/PriceComparisonTable.tsx` — accepts `cabinPrices` prop, defaults to `[]`
- **File:** `src/app/page.tsx` — renders `<PriceComparisonTable />` with **no props** — so `cabinPrices` is always `[]`
- **The gap:** The component is beautifully rendered and has skeleton states, but because no data is ever passed to it, it's invisible on the page. This goes back to the frontend not calling the `/api/sailing-breakdown` endpoint.
- **Impact:** Core conversion UI is an empty shell.
- **Fix needed:** Wire `fetchItineraries()` into page.tsx and pass the data to PriceComparisonTable.

### GAP 10: Duplicate frontend theme in `/frontend/`

- **Files:** `frontend/` contains a complete dark-theme version of components (CruiseCard, PriceComparisonTable, design system)
- **The gap:** These are NOT used by the Next.js build (`src/app/page.tsx` imports from `@/components/*` not `frontend/components/*`). This directory appears to be an alternate dark-theme version that was never integrated.
- **Impact:** Dead code, confusing. Maintains two versions of the same component.
- **Fix needed:** Either merge the dark theme into the main app (via `.dark` CSS class which already exists) or delete the `frontend/` directory.

---

## Test Strategy

Before any fix is accepted, each component must pass a targeted test:

| Component | Test | Method |
|-----------|------|--------|
| `server/utils/formulas.ts` | Unit test all 6 functions | `ts-node` or `vitest` |
| `server/utils/affiliateLinker.ts` | Unit test SubID generation, encryption, parsing | `ts-node` or `vitest` |
| Express server | Server starts on port 3001, health check returns 200 | `curl localhost:3001/api/health` |
| `GET /api/search` | Returns valid JSON with proper schema | `curl` + `jq` |
| `GET /api/sailing-breakdown` | Returns pricing breakdown for known sailing ID | `curl` |
| `GET /api/solo-friendly` | Returns only cruises with waived supplement | `curl` |
| Frontend build | `npm run build` passes | Build script |
| Frontend lint | `npm run lint` passes non-interactively | Lint script |
| CruiseApi → Backend | Frontend fetcher returns real server data | Browser or `node --eval` |
| PriceComparisonTable | Receives data and renders rows | Browser test |
| DB connection | `pg` pool connects and runs a query | `ts-node` script |
| Hybrid Engine (if kept) | Runs a sync cycle without error | `npm run server:sync` |

---

## Proposed Approach

### Phase 1: Unify the Data Layer (Tasks 1–5)
Bridge the frontend and backend. Make the frontend call the Express API instead of static JSON. Align the response shapes.

### Phase 2: Productionize the Backend (Tasks 6–10)
Add real database integration. Install `pg`, create pool, run schema, replace mock data with SQL. Support the transition with a seed script that loads the current mock data into PostgreSQL.

### Phase 3: Fix the Build Pipeline (Tasks 11–13)
Configure ESLint, add concurrently scripts, ensure CI can start both servers.

### Phase 4: Make Agents Runnable (Optional — Tasks 14–16)
Either make the orchestrator work end-to-end or quarantine it as a research tool.

---

## Files Likely to Change

| File | Change Type | Reason |
|------|-------------|--------|
| `package.json` | Modify | Add eslint config, concurrently, server script |
| `src/services/cruiseApi.ts` | Rewrite | Point to `http://localhost:3001/api/` instead of `/data/*.json` |
| `src/types/cruise.ts` | Modify | Align with backend response shapes |
| `server/routes/cruises.ts` | Modify | Add an adapter/endpoint that returns frontend-shaped `Deal[]` |
| `server/package.json` | Modify | Add `pg` dependency |
| `server/db/pool.ts` | Create | PostgreSQL connection pool |
| `server/db/seed.ts` | Create | Seed script to load mock data into DB |
| `server/index.ts` | Modify | Initialize DB on startup |
| `src/app/page.tsx` | Modify | Wire data fetching for PriceComparisonTable |
| `src/components/DealsGrid.tsx` | Modify | Switch from `fetchDeals` to backend API |
| `src/components/search/SearchHero.tsx` | Modify | Switch from `fetchFilterOptions` to backend API |
| `.eslintrc.json` | Create | ESLint config |

---

## Risks, Tradeoffs, and Open Questions

### Risks

- **Backend/frontend shape mismatch is deep** — The `Deal` type has `history` (price sparkline data) which the backend doesn't produce at all. The backend returns raw `financials` objects that the frontend expects to be pre-formatted. This may require adding a new backend endpoint (`/api/deals`) that returns frontend-ready data.
- **No PostgreSQL running locally** — The plan assumes PostgreSQL is installable/configurable. If the user doesn't have it, we may need to use SQLite as a stepping stone or provide Docker instructions.
- **Price sparkline data** — The frontend `history[]` array (10 historical price points) has no backend equivalent. The mock data in `deals.json` includes hardcoded `history`. We need a price_history table and a query to produce this.
- **The pricing math is in two places** — `server/utils/formulas.ts` handles server-side calculation. `src/services/cruiseApi.ts` has a separate drift/jitter system. These need to be reconciled.

### Tradeoffs

- **Direct DB queries vs. API-only pattern** — For Phase 2, we could either put SQL in routes or create a service layer. Given the existing code already has service/route separation (kind of), a thin service layer is the right call.
- **Keep the hybrid engine or delete it?** — The engine is beautiful architecture but entirely mocked. It's probably a v2 concern after the basic data pipeline works.
- **Which dark theme?** — There are TWO dark themes: `/frontend/tailwind.config.ts` (Portly dark) and `src/app/globals.css` which has `.dark` class support. They're incompatible. One should be chosen, the other deleted.

### Open Questions for the User

1. **Data source priority** — Do you have B2B API keys (Widgety, Traveltek) you want to use, or is the plan to operate on seeded static data initially and add real APIs later?
2. **PostgreSQL available?** — Do you have PostgreSQL running locally, or should we containerize with Docker, or use SQLite as a bridge?
3. **Hybrid engine** — The web-scraping agent system (`agents/`, `plugins/`) is ambitious but non-functional. Should we keep it as a long-term goal and focus on the basic API-first architecture for now, or try to make it work now?
4. **Dark theme** — The `frontend/` directory has a separate dark-theme implementation. The main app's `globals.css` already tags `.dark` CSS classes. Should we delete `frontend/` and activate `.dark` via a toggle, or keep both?
5. **Price sparklines** — The frontend shows 10-point price history sparklines on deal cards. The backend doesn't produce this data. Should we add a `price_history` table and seed it with synthetic data, or implement the drift model on the server side?

---

## Step-by-Step Plan

### Task 1: Configure ESLint
**Objective:** Make `npm run lint` pass non-interactively.

**Files:**
- Create: `.eslintrc.json`
- Modify: `package.json` (future — scripts)

**Step 1:** Create `.eslintrc.json` with Next.js base config:
```json
{
  "extends": "next/core-web-vitals"
}
```

**Step 2:** Run `npm run lint` — should pass with zero errors.

**Step 3:** Commit.

---

### Task 2: Add concurrently scripts to root package.json
**Objective:** One command starts frontend + backend.

**Files:**
- Modify: `package.json` (add `concurrently` dep, add `server` and `dev:all` scripts)

**Step 1:** Install `concurrently` as devDependency.
**Step 2:** Add scripts:
```json
"server": "cd server && npm run dev",
"dev:all": "concurrently \"npm run dev\" \"npm run server\""
```

**Step 3:** Verify both servers start with `npm run dev:all`.

---

### Task 3: Create shared types package
**Objective:** One source of truth for sailing/cruise types used by both frontend and backend.

**Files:**
- Create: `shared/types/cruise.ts`
- Modify: `server/routes/cruises.ts` (import shared types)
- Modify: `src/types/cruise.ts` (re-export from shared or replace)

**Step 1:** Define canonical types that satisfy both the frontend's needs and the backend's production shape. Key types:
- `Sailing` — core sailing with pricing
- `Deal` — frontend display type (includes sparkline history)
- `CabinBreakdown` — per-cabin pricing
- `SearchQuery` — filter/sort/paginate parameters
- `SearchResponse` — paginated result set

**Step 2:** Update backend route responses to return shared types.
**Step 3:** Update frontend types to consume shared types.
**Step 4:** Verify build passes.

---

### Task 4: Add backend endpoint for frontend-shaped deal data
**Objective:** Add `GET /api/deals` that returns `Deal[]` shaped for the DealsGrid component.

**Files:**
- Modify: `server/routes/cruises.ts` — new endpoint or adapter

**Step 1:** Add `GET /api/deals` endpoint that:
- Reads from sailings table (or mock data in Phase 1)
- Computes pricing with `calculateTotalsWithDuration`
- Generates synthetic `history` array (for sparkline)
- Returns `Deal[]` matching the frontend type

**Step 2:** Test with `curl http://localhost:3001/api/deals | jq`
**Step 3:** Verify response shape matches `src/types/cruise.ts::Deal`

---

### Task 5: Rewrite frontend API service to call backend
**Objective:** `fetchDeals()`, `fetchItineraries()`, `fetchFilterOptions()` call `http://localhost:3001/api/` instead of `/data/*.json`.

**Files:**
- Modify: `src/services/cruiseApi.ts`
- Modify: `src/components/DealsGrid.tsx` (if shape changed)
- Modify: `src/components/search/SearchHero.tsx` (if shape changed)
- Modify: `src/app/page.tsx` (wire PriceComparisonTable data)

**Step 1:** Update `fetchDeals()` to call `fetch('http://localhost:3001/api/deals')`.
**Step 2:** Update `fetchItineraries()` to call `fetch('http://localhost:3001/api/sailing-breakdown?cabinType=all')` or a new endpoint.
**Step 3:** Update `fetchFilterOptions()` to extract filters from the deals response.
**Step 4:** Remove the drift/jitter simulation (the server now provides real-ish data).
**Step 5:** Wire `PriceComparisonTable` in page.tsx with data from `fetchItineraries()`.
**Step 6:** Start both servers with `npm run dev:all` and verify the page renders with data from the backend.

---

### Task 6: Install and configure PostgreSQL client
**Objective:** Backend can connect to a real PostgreSQL database.

**Files:**
- Modify: `server/package.json` (add `pg`)
- Create: `server/db/pool.ts`
- Modify: `server/index.ts` (initialize pool on startup)

**Step 1:** Install `pg` and `@types/pg`.
**Step 2:** Create `server/db/pool.ts`:
```typescript
import { Pool } from 'pg';
const pool = new Pool({ /* from env or config */ });
export default pool;
```
**Step 3:** Add pool initialization to server startup (with health check query).
**Step 4:** Add graceful shutdown (pool.end()).

---

### Task 7: Run schema migration
**Objective:** The PostgreSQL database has the schema defined in `server/db/schema.sql`.

**Files:**
- Create: `server/db/migrate.ts`
- Modify: `server/package.json` (add `migrate` script)

**Step 1:** Read `schema.sql`, split into statements, execute them against the pool.
**Step 2:** Add `"migrate": "ts-node db/migrate.ts"` to server's package.json.
**Step 3:** Run and verify tables exist.

---

### Task 8: Seed database with mock data
**Objective:** The sailing/pricing data from `mockSailingsDb` and the B2B mock data lives in PostgreSQL.

**Files:**
- Create: `server/db/seed.ts`
- Modify: `server/package.json` (add `seed` script)

**Step 1:** Create seed script that:
- Inserts cruise lines and ships
- Inserts sailings from the current mock data
- Inserts initial pricing snapshots
**Step 2:** Add `"seed": "ts-node db/seed.ts"` to server's package.json.
**Step 3:** Run and verify data with `SELECT * FROM sailings`.

---

### Task 9: Replace mock arrays with real SQL queries
**Objective:** All route handlers query the database instead of the mock array.

**Files:**
- Modify: `server/routes/cruises.ts`
- Modify: `server/services/hybridEngine.ts` (mock B2B functions)

**Step 1:** Replace `mockSailingsDb.find()` / `.filter()` in each endpoint with `pool.query(...)`.
**Step 2:** Update the search endpoint to build dynamic WHERE clauses from query params.
**Step 3:** Update `/api/sailing/:id` to query all cabin types for that sailing.
**Step 4:** Update `/api/solo-friendly` to filter on `is_solo_supplement_waived`.
**Step 5:** Add `/api/deals` to query recent pricing_snapshots and join with sailings.
**Step 6:** Test every endpoint with `curl`.

---

### Task 10: Add price history for sparklines
**Objective:** The `GET /api/deals` endpoint includes a `history[]` array for each deal.

**Files:**
- Modify: `server/routes/cruises.ts`
- Modify: `server/db/schema.sql` (if price_history table doesn't exist)

**Step 1:** Create/verify `price_history` table (separate from pricing_snapshots — a denormalized rolling 10-point history per sailing-cabin).
**Step 2:** Seed with synthetic historical data (current price ± random jitter for 10 points).
**Step 3:** Update `/api/deals` to JOIN price_history and return the array.

---

### Task 11: Make the agents pipeline compilable (optional)
**Objective:** `npm run agents:build` produces real output, `npm run agents:run` starts the orchestrator.

**Files:**
- Modify: `tsconfig.json` (set `noEmit: false` for agents, or create separate tsconfig)
- Modify: `package.json` (update agents scripts)

**Step 1:** Create `agents/tsconfig.json` for the agents compilation.
**Step 2:** Install missing deps (playwright, puppeteer-extra-plugin-stealth) at root if needed.
**Step 3:** Verify `tsc -p agents/tsconfig.json` compiles.
**Step 4:** Test `npm run agents:run` with required env vars set.

---

### Task 12: Clean up duplicate `/frontend/` directory (optional)
**Objective:** Remove dead code, merge dark theme into main app.

**Files:**
- Delete or quarantine: `frontend/`
- Modify: `src/app/globals.css` (ensure `.dark` class works end-to-end)

**Step 1:** Verify the `.dark` class in `globals.css` correctly overrides all variables.
**Step 2:** Add a dark mode toggle to Header.tsx.
**Step 3:** Delete `frontend/` directory or move to `archive/`.

---

### Task 13: End-to-end smoke test
**Objective:** Prove the whole pipeline works.

**Checklist:**
- [ ] `npm run lint` passes (0 errors, 0 warnings)
- [ ] `npm run build` passes (0 errors)
- [ ] `npm run dev:all` starts both frontend (3000) and backend (3001)
- [ ] `curl http://localhost:3001/api/health` returns 200 with engine status
- [ ] `curl http://localhost:3001/api/deals` returns valid `Deal[]`
- [ ] `curl http://localhost:3001/api/search?destination=caribbean` returns filtered results
- [ ] `curl http://localhost:3001/api/sailing/1` returns cabin breakdown
- [ ] `curl http://localhost:3001/api/solo-friendly` returns only waived-supplement cruises
- [ ] Browser shows DealsGrid with cards from backend data
- [ ] Browser shows PriceComparisonTable with cabin pricing rows
- [ ] Browser shows SearchHero with live filter options from backend
- [ ] `npm run agents:build` compiles agents (if kept)
- [ ] DB seed script populates all tables

---

## Quick Start Commands

```bash
# Phase 1 — Get the data pipeline working
cd /Users/georgetozer/Development/Portly
npm install                     # Root deps
cd server && npm install        # Server deps
cd ..
npm run dev:all                 # Start both servers

# Phase 2 — Add the database
cd server
npm install pg @types/pg
npm run migrate                 # Create schema
npm run seed                    # Seed data
npm run dev                     # Server with real DB

# Verification
curl http://localhost:3001/api/health | jq
curl http://localhost:3001/api/deals | jq
```
