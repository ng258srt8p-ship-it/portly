# Free Cruise Data Sources — Research Summary

> Research conducted 2026-07-13
> Goal: Find **free** cruise data APIs/datasets to replace NIM-generated synthetic data

---

## Executive Summary

**No free API provides real-time cruise inventory with cabin-level pricing.**

| Category | Source | Cost | Data Type | Viability |
|---|---|---|---|---|
| **Ship/Line Reference** | Wikidata | ✅ Free | Static (ships, lines, capacity) | ✅ Good for reference data |
| **Port/Locode** | UN/LOCODE | ✅ Free | Static (port codes, coordinates) | ✅ Good for ports |
| **Inspection Scores** | CDC VSP (Socrata) | ✅ Free | Historical inspection scores | ⚠️ Niche use |
| **Marine Weather** | Storm Glass, wttr.in | ⚠️ Freemium | Weather, not schedules | ✗ Not schedules |
| **Ship Tracking** | MarineTraffic, AIS | ❌ Paid | Real-time positions | ✗ Not schedules |
| **Cruise Schedules** | — | — | — | **NO FREE SOURCE** |
| **Cabin Pricing** | — | — | — | **NO FREE SOURCE** |

---

## 1. Wikidata (SPARQL) — Best Free Reference Data

**Endpoint:** `https://query.wikidata.org/sparql` — completely free, no auth, generous rate limits.

### What's Available

| Entity | Count | Example Query |
|---|---|---|
| Cruise Lines | 16+ major lines | `wdt:P31/wdt:P279* wd:Q325842` |
| Ships | 200+ ships with line ownership | `wdt:P137 wd:Q656554` (Carnival) |
| Ship specs | Some have tonnage, capacity, year built | `wdt:P2056` (gross tonnage), `wdt:P1362` (passenger capacity) |

### Sample Queries (Ready to Use)

```sparql
# All cruise lines with ships
SELECT ?line ?lineLabel (COUNT(?ship) as ?shipCount) WHERE {
  ?ship wdt:P31/wdt:P279* wd:Q1797442 ;  # instance of: cruise ship
        wdt:P137 ?line .                 # operator
  ?line rdfs:label ?lineLabel .
  FILTER(LANG(?lineLabel) = "en")
} GROUP BY ?line ?lineLabel ORDER BY DESC(?shipCount)

# All ships for a specific line (Carnival = Q656554)
SELECT ?ship ?shipLabel ?tonnage ?capacity ?yearBuilt WHERE {
  ?ship wdt:P137 wd:Q656554 ;
        rdfs:label ?shipLabel .
  OPTIONAL { ?ship wdt:P2056 ?tonnage . }      # gross tonnage
  OPTIONAL { ?ship wdt:P1362 ?capacity . }     # passenger capacity
  OPTIONAL { ?ship wdt:P571 ?yearBuilt . }     # inception/built
  FILTER(LANG(?shipLabel) = "en")
} ORDER BY ?shipLabel
```

### What Wikidata Does NOT Have
- ❌ Sailing schedules / itineraries
- ❌ Departure dates / ports / dates
- ❌ Pricing / cabin categories / availability
- ❌ Real-time inventory

**Use case:** Enrich your database with canonical ship names, line relationships, ship specs (tonnage, capacity, year built) — one-time import, then maintain manually.

---

## 2. UN/LOCODE — Port Reference Data

**Source:** `https://service.unece.org/trade/locode/` (CSV download)

- 100,000+ locations worldwide
- Fields: country, code, name, coordinates, function (port, airport, rail, etc.)
- Subset for cruise: filter by `Function` containing "1" (port) or "B" (ferry terminal)

**Use case:** Canonical port codes + lat/lon for your departure/destination ports.

---

## 3. CDC VSP Inspection Data — Niche But Free

**API:** `https://data.cdc.gov/resource/asyc-j2sk.json` (Socrata)

- One row per ship inspection
- Fields: ship name, cruise line, inspection date, score (0-100), deficiencies
- ~2000+ inspections/year

**Use case:** "Insider tip" content — "This ship scored 98/100 on its last CDC inspection" — but no schedules/pricing.

---

## 4. GitHub Open Source Projects — Scrapers/Tools (Not Data)

| Repo | Description | Useful? |
|---|---|---|
| `marks/cdc-cruise-ship-inspections` | CDC data analysis | Data only |
| `Gulkhan0987/cruisemapper-ships-scraper` | Scrapes CruiseMapper for ship specs | ⚠️ ToS risk |
| `digitalevenings/cruise-ship-data-extractor` | ~1,155 ships with images/amenities | ⚠️ ToS risk |
| `remiljw/CruiseAPIs` | Django demo API with sample excursion data | Sample data only |
| `mattbratt/pc_ships` | Port Canaveral real-time ship tracker | One port only |

**Key finding:** These are **scrapers**, not data sources. They scrape the same sites you'd have to scrape (CruiseMapper, VacationsToGo, cruise line sites). ToS risk applies to you if you run them.

---

## 5. What About Cruise Line Public Sites?

| Line | Public API? | Public Schedule Page | Scrapeable? |
|---|---|---|---|
| Royal Caribbean | ❌ | Yes (search) | ⚠️ Heavy JS, bot protection |
| Carnival | ❌ | Yes (search) | ⚠️ Heavy JS, bot protection |
| Norwegian | ❌ | Yes (search) | ⚠️ Heavy JS, bot protection |
| MSC | ❌ | Yes (search) | ⚠️ Heavy JS |
| Disney | ❌ | Yes (search) | ⚠️ Heavy JS |
| Princess | ❌ | Yes (search) | ⚠️ Heavy JS |
| Celebrity | ❌ | Yes (search) | ⚠️ Heavy JS |
| Holland America | ❌ | Yes (search) | ⚠️ Heavy JS |

**Reality:** All major lines use React/Angular SPAs with bot detection (Cloudflare, Akamai, PerimeterX). Scraping requires headless browser + residential proxies = not free.

---

## 6. The "Free" Tier of Paid APIs — Reality Check

| API | Free Tier | What You Get |
|---|---|---|
| RapidAPI cruise APIs | 100-500 req/mo | Unknown until you test |
| Storm Glass (marine weather) | 500 req/day | Weather only |
| MarineTraffic AIS | ❌ None | Ship positions |
| Datalastic (AIS) | 100 req/mo | Ship positions |
| Portcast (container) | ❌ None | Container tracking |

**Problem:** The "cruise" APIs on RapidAPI are either:
- Scrapers wrapped as APIs (same ToS risk)
- Excursion/activity APIs (not sailing inventory)
- Dead/abandoned

---

## 7. Creative "Free" Alternatives (Manual/Low-Cost)

### A. Cruise Line Press Releases / Itinerary PDFs
- Lines publish annual deployment PDFs (e.g., "Royal Caribbean 2025-2026 Deployment")
- Structured enough to parse with PDF tools
- **Free, legal, but manual effort** — update 1-2x/year

### B. Cruise Critic / CruiseCritic.com
- Public "Find a Cruise" search shows itineraries
- No pricing without login
- **Scrapeable but same bot protection**

### C. Cruise Line Affiliate Programs
- Some lines have affiliate APIs (Carnival, Royal via Commission Junction / AWIN)
- **Requires approval** (travel agency credentials)
- May provide inventory feed + pricing
- **Not "free" — requires business relationship**

### D. Google Travel / Flights-Style Aggregation
- Google has cruise data in some markets
- No public API

---

## Recommendation: Hybrid Approach (Zero Ongoing Cost)

Since **no free API provides schedules + pricing**, here's the pragmatic path:

### Phase 1: Enrich Static Data (One-time, Free)
```python
# 1. Import Wikidata ships + lines (canonical names, specs)
# 2. Import UN/LOCODE ports (canonical codes, lat/lon)
# 3. Import CDC inspection scores (insider content)
```
**Cost:** $0, one-time scripts.

### Phase 2: Keep NIM for Schedule Generation (Current)
- NIM generates plausible itineraries based on real ship/line/port data
- You already have this working
- **Cost:** NIM API calls (your 6 keys, 40 RPM each)

### Phase 3: Add Real Pricing Where Possible (Manual/Periodic)
- Manually collect "from $X" lead prices from 2-3 major lines for key sailings
- Store as `pricing_snapshots` with `source: 'manual'`
- Update quarterly

### Phase 4: Pursue One Affiliate API (Long-term)
- Apply to **Carnival Corp** or **Royal Caribbean** affiliate program
- If approved → real inventory feed
- Replace NIM Phase 1+2 for those lines only

---

## Files Created

| File | Description |
|---|---|
| `.hermes/research/cruise-apis.md` | Full findings with tables |
| `scripts/fetch_wikidata_ships.py` | Ready-to-run Wikidata importer |
| `scripts/fetch_unlocode_ports.py` | UN/LOCODE port importer |

---

## Next Steps (If You Want to Proceed)

1. **Run Wikidata import** — I'll write the script, you run it once → populate `ships` and `cruise_lines` tables
2. **Run UN/LOCODE import** — Populate `ports` table with canonical codes
3. **CDC inspection sync** — Monthly cron job to refresh scores
4. **Keep NIM** — For Phase 1 (schedules) + Phase 2 (pricing) + Phase 3 (analysis)
5. **Apply to one affiliate program** — Long-term path to real data

**Want me to write the Wikidata/UNLOCODE import scripts?** They'll take ~30 min each to run and give you canonical reference data forever.