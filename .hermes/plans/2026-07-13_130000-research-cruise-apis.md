# Plan: Research Cruise Data APIs to Replace NIM

## Goal

Research real-world cruise APIs and data sources that other booking sites (VacationsToGo, CruiseCritic, Expedia Cruises, etc.) use to populate their sailing inventory, pricing, and availability. Evaluate whether any of these can replace or supplement the current Nvidia NIM-generated data.

The current approach:
- Phase 1: NIM generates 600 sailing records (cruise line, ship, dates, itinerary)
- Phase 2: NIM generates pricing for each sailing
- Phase 3: NIM generates deal analysis for each sailing

This is slow (~13 min sync), rate-limited (32 concurrent / 40 RPM per key), and generates synthetic data that may not match real inventory.

---

## Task 1: Identify Public Cruise APIs

Research available APIs across categories:

### 1a. Direct Cruise Line APIs
Each major line may have a B2B/API partner program:

| Cruise Line | Booking API | Notes |
|---|---|---|
| Royal Caribbean Group (Royal, Celebrity, Silversea) | Royal API / Celebrity API | B2B partner portals |
| Carnival Corp (Carnival, Princess, Holland America, Seabourn, Cunard) | Carnival API | B2B booking systems |
| Norwegian Cruise Line | NCL API | Partner integration |
| MSC Cruises | MSC API | B2B portal |
| Disney Cruise Line | Disney Cruise API | Limited partner access |
| Virgin Voyages | Virgin API | Newer — may be open |

**Search queries:**
- "cruise line API partner program B2B"
- "RCCL travel agent API documentation"
- "Carnival cruise API integration"
- "cruise booking API availability pricing"

### 1b. Aggregator APIs
Companies that aggregate cruise inventory across multiple lines:

| Platform | Endpoint | Notes |
|---|---|---|
| CruiseConnect (Carnival Corp B2B) | cruiseconnect.carnival.com | Carnival brands |
| Royal Caribbean B2B | partner.royalcaribbean.com | Royal/Celebrity/Silversea |
| Traveltek | traveltek.net | Cruise booking engine |
| BookLogic | booklogic.net | Cruise-specific |
| CruiseBase | cruisebase.com | Inventory/availability |
| iCruise.com | icruise.com | Consumer site API? |
| CruiseCompete | cruisecompete.com | Quote aggregation |
| Expedia Cruises | Expedia Partner Solutions | Wide inventory |

**Search queries:**
- "cruise API inventory aggregation"
- "Traveltek cruise API documentation"
- "BookLogic cruise API"
- "Expedia cruises API partner"
- "cruise wholesale API pricing"

### 1c. GDS / Distribution APIs
Global Distribution Systems that carry cruise inventory:

| GDS | Cruise Module | Notes |
|---|---|---|
| Sabre | Sabre Cruise | Cruise booking via Sabre |
| Amadeus | Amadeus Cruise | Cruise content |
| Travelport | Travelport Cruise | Limited cruise support |

**Search queries:**
- "Sabre cruise API developer"
- "Amadeus cruise content API"
- "cruise distribution API GDS"

---

## Task 2: Evaluate Each Source

For each viable API found, answer:

- **Inventory scope:** How many cruise lines? Real-time availability?
- **Pricing data:** Base fare, port fees, taxes, gratuities? Cabin-level breakdown?
- **Integration method:** REST/GraphQL/SOAP? API key or OAuth?
- **Cost model:** Free, commission-based, subscription, revenue share?
- **Documentation quality:** Public docs or NDA required?
- **Rate limits:** Requests per minute/day?
- **Data freshness:** Real-time pricing or batch updates?

---

## Task 3: Compare Against Current NIM Approach

| Dimension | Current (NIM-generated) | Real API |
|---|---|---|
| **Data accuracy** | Synthetic — may not match real inventory | Real — actual availability & pricing |
| **Sync speed** | ~13 min, rate-limited to 32 concurrent | Depends on API limits |
| **Coverage** | 600 sailings per sync cycle | Full live inventory |
| **Pricing** | Generated per-cabin-type | Real cabin breakdown |
| **Deal analysis** | NIM generated (works well) | Can still use NIM for commentary on real data |
| **Cost** | NIM API calls (6 keys, 40 RPM each) | Per-call or subscription cost |
| **Maintenance** | Fragile — rate limits, token drift, prompt changes | Vendor maintains |

---

## Task 4: Recommend Replacements

Based on findings, recommend:

1. **Best single source** (if one API covers all needs)
2. **Best mix** (e.g., API for inventory + NIM for analysis only)
3. **Fallback strategy** (keep NIM for lines not covered by an API)

Prioritize sources that:
- Cover the most cruise lines in a single integration
- Provide real cabin-level pricing (base fare + fees)
- Have public/accessible developer documentation
- Don't require revenue-sharing exclusivity

---

## Task 5: Prototype One Integration

Pick the highest-potential API and:

1. Register for access / get API key
2. Make a test call to verify endpoint works
3. Map response shape to existing `SailingRecord` / `CheckoutResult` interfaces
4. Estimate integration effort (files to change, new service to write)
5. Document required env vars and config

---

## Deliverable

A markdown file at `.hermes/research/cruise-apis.md` with:

- **Summary table** of all APIs found + viability score (✗ / ⚠ / ✓)
- **Top 3 recommendations** with rationale
- **Integration notes** for the winning option (endpoints, auth, response schema)
- **Migration path** from NIM-only → hybrid → API-primary
