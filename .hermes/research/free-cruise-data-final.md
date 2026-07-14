# Free Cruise Data Sources — Final Research Summary

> Research completed 2026-07-13
> Goal: Find **completely free** cruise data to replace NIM-generated synthetic data

---

## 🎯 Bottom Line

**No free source provides cruise schedules + cabin pricing.** This data is the core commercial product of the cruise industry — sold via B2B APIs ($$$) or displayed on consumer sites (ad-supported, bot-protected).

| Data Type | Free Source? | Best Free Option |
|---|---|---|
| Ship reference (name, line, specs) | ✅ **Yes** | Wikidata (SPARQL) |
| Port reference (code, lat/lon) | ✅ **Yes** | UN/LOCODE |
| CDC inspection scores | ✅ **Yes** | CDC VSP (Socrata) |
| Sailing schedules | ❌ **No** | — |
| Cabin-level pricing | ❌ **No** | — |
| Real-time availability | ❌ **No** | — |

---

## ✅ What You Can Get Free (Static Reference Data)

### 1. Wikidata — 380+ Cruise Ships, 60+ Lines
**Endpoint:** `https://query.wikidata.org/sparql` — no auth, generous limits

```sparql
# All cruise ships with operator
SELECT ?ship ?shipLabel ?operator ?operatorLabel WHERE {
  ?ship wdt:P31 wd:Q39804 ;  # instance of: cruise ship
        wdt:P137 ?operator .
  ?ship rdfs:label ?shipLabel .
  ?operator rdfs:label ?operatorLabel .
  FILTER(LANG(?shipLabel) = "en" && LANG(?operatorLabel) = "en")
}
```

**Coverage:** ~380 ships across 60+ lines (major + niche)
**Fields:** Ship name, line, (spotty) tonnage/capacity/year-built
**Update freq:** Community-maintained, ~monthly

### 2. UN/LOCODE — 100,000+ Ports
**Download:** `https://service.unece.org/trade/locode/locode_2024-1.csv`
**Filter:** Function code "1" (port) or "B" (ferry terminal)

### 3. CDC Vessel Sanitation Program — Inspection Scores
**API:** `https://data.cdc.gov/resource/asyc-j2sk.json?$limit=1000`
**Fields:** Ship, line, inspection date, score (0-100), deficiency details
**Use case:** "Insider tip" content — "Celebrity Edge scored 100/100 on its last CDC inspection"

---

## ❌ What Does NOT Exist Free

| Source | Why Not Free |
|---|---|
| Cruise line direct APIs | Require travel agency IATA/CLIA credentials + contract |
| GDS (Sabre/Amadeus/Travelport) | Cruise modules are paid enterprise products |
| Aggregators (Traveltek, BookLogic, CruiseBase) | B2B SaaS, $10k-100k+/year |
| RapidAPI cruise APIs | Either scrapers (ToS risk) or excursion-only |
| CruiseCritic, VacationsToGo | Bot-protected SPAs, no public API |
| MarineTraffic / AIS | Ship positions only, not schedules/pricing |

---

## 💡 Recommended Zero-Cost Strategy

Since you **already have NIM generating schedules + pricing** (and you fixed the caching so it's not burning API keys on page loads), the pragmatic path:

### 1. Enrich NIM Output with Free Reference Data (One-time)
```python
# Run once at startup or via cron monthly
- Import Wikidata ships → canonical names, line mapping, specs
- Import UN/LOCODE ports → canonical codes, lat/lon  
- Import CDC scores → "insider tip" content
```
**Cost:** $0 | **Effort:** ~2 hours | **Value:** Cleaner data, richer analysis

### 2. Keep NIM for Schedules + Pricing (Current)
Your caching migration means:
- 1 NIM call per sailing per 4-hour sync (not per page view)
- 358 sailings × 3 phases = ~1,100 calls/sync cycle
- 6 keys × 40 RPM = 240 RPM capacity → finishes in ~5 minutes
- **Total daily NIM cost:** effectively $0 (your existing keys)

### 3. Add Manual Price Anchors (Quarterly, 30 min)
```python
# Once per quarter, manually fetch "from $X" lead prices for:
- 10-15 flagship sailings per major line
- Store as pricing_snapshots with source='manual_anchor'
```
Use these to calibrate NIM's pricing prompts ("generate realistic pricing around these anchors").

### 4. Pursue One Affiliate Feed (6-12 month horizon)
Apply to **Carnival Corp** or **Royal Caribbean** affiliate programs:
- Requires: Business entity, travel seller registration, volume commitments
- Delivers: Real inventory feed (XML/JSON) for their brands only
- Replaces NIM for those lines only

---

## 📁 Files Created

| File | Contents |
|---|---|
| `.hermes/research/cruise-apis.md` | Full findings with query examples |
| `/tmp/wikidata_ships.json` | 380 ships × 25 lines (from Wikidata) |
| `/tmp/wikidata_operators.json` | 65 cruise lines with ship counts |
| `scripts/fetch_wikidata_ships.py` | Ready-to-run Wikidata importer |
| `scripts/fetch_unlocode_ports.py` | Ready-to-run UN/LOCODE importer |

---

## 🔧 Quick Start: Wikidata Import Script

```python
# server/services/wikidata_import.py
import urllib.request, json, time, urllib.parse

WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"

SHIP_QUERY = """
SELECT ?ship ?shipLabel ?operator ?operatorLabel ?tonnage ?capacity ?yearBuilt WHERE {
  ?ship wdt:P31 wd:Q39804 ; wdt:P137 ?operator ; rdfs:label ?shipLabel .
  ?operator rdfs:label ?operatorLabel .
  OPTIONAL { ?ship wdt:P2056 ?tonnage . }
  OPTIONAL { ?ship wdt:P1362 ?capacity . }
  OPTIONAL { ?ship wdt:P571 ?yearBuilt . }
  FILTER(LANG(?shipLabel) = "en" && LANG(?operatorLabel) = "en")
}
"""

def fetch_wikidata_ships():
    url = f"{WIKIDATA_SPARQL}?format=json&query={urllib.parse.quote(SHIP_QUERY)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Portly/1.0'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)
    
    ships = []
    for b in data['results']['bindings']:
        ships.append({
            'wikidata_id': b['ship']['value'].split('/')[-1],
            'name': b['shipLabel']['value'],
            'line_wikidata_id': b['operator']['value'].split('/')[-1],
            'line_name': b['operatorLabel']['value'],
            'tonnage': int(b['tonnage']['value']) if 'tonnage' in b else None,
            'capacity': int(b['capacity']['value']) if 'capacity' in b else None,
            'year_built': int(b['yearBuilt']['value'][:4]) if 'yearBuilt' in b else None,
        })
    return ships

if __name__ == '__main__':
    ships = fetch_wikidata_ships()
    print(f"Fetched {len(ships)} ships")
    # Upsert into your `ships` table...
```

---

## Final Verdict

**Don't replace NIM with free APIs — they don't exist for this data tier.**

Your current architecture (NIM → DB cache → page load) is the correct free-tier approach. The research confirms:

1. **NIM is your "free API"** for schedules + pricing (you own the keys)
2. **Free reference data** (Wikidata, UN/LOCODE, CDC) enriches quality
3. **Real inventory APIs** require B2B relationships, not API keys

**Next step:** Run the Wikidata import script once, merge into your `ships` table, and you'll have canonical ship/line/port data improving every downstream feature.