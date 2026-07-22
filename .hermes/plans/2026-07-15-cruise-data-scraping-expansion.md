# Goal Loop: Cruise Data Scraping Expansion

**Date:** 2026-07-15  
**Goal:** Expand cruise data scraping to populate database with more cruise lines, ships, and cabin types  
**Type:** Goal loop (plan → act → test → review → iterate)

---

## Definition of Done

The expansion is complete when **ALL** of the following are true:

### Data Coverage
- [ ] Scrape **≥10 cruise lines** (currently only Royal Caribbean)
- [ ] Cover **≥50 unique ships** (currently ~4 ships)
- [ ] Include **all 4 cabin types** (Inside, Oceanview, Balcony, Suite) for each sailing
- [ ] Cover **≥20 departure ports** across multiple regions (Caribbean, Alaska, Mediterranean, etc.)
- [ ] Include sailings for **≥12 months** into the future

### Scraping Infrastructure
- [ ] Modular scraper architecture (easy to add new cruise lines)
- [ ] Configurable URL lists per cruise line
- [ ] Rate limiting and error handling
- [ ] Database upsert logic (idempotent, handles duplicates)

### Quality & Reliability
- [ ] Scraping completes without crashes
- [ ] Parser handles multiple website formats
- [ ] Fallback strategies when primary source fails
- [ ] Logging and error reporting

### Testing
- [ ] Unit tests for parsers (jinaParser)
- [ ] Integration tests for scraper pipeline
- [ ] Validation tests for database writes

---

## Current State Analysis

### What We Have
- **JinaReader** — Free, unlimited web scraping via Jina AI Reader
- **jinaParser** — Markdown parser for cruise data extraction
- **jinaSync** — Main sync orchestration (currently scrapes 3 URLs)
- **Database schema** — Fully designed (sailings, pricing_snapshots, pricing_history)

### Current Limitations
- **1 cruise line** scraped (Royal Caribbean)
- **4 ships** in database (Icon, Symphony, Wonder, Utopia of the Seas)
- **No cabin type data** in API response (though database supports it)
- **Limited departure ports** (Miami, Port Canaveral)
- **Single destination** (Caribbean/Bahamas)

### URL List (Current)
```typescript
const CRUISE_URLS = [
  'https://www.royalcaribbean.com/cruises/icon-of-the-seas',
  'https://www.royalcaribbean.com/cruises/wonder-of-the-seas',
  'https://www.royalcaribbean.com/cruises/symphony-of-the-seas',
  'https://www.royalcaribbean.com/cruises/utopia-of-the-seas',
  'https://www.royalcaribbean.com/cruises/allure-of-the-seas',
  'https://www.carnival.com/cruises',
  'https://www.ncl.com/cruises',
];
```

---

## Target Expansion Plan

### Phase 1: Major Cruise Lines (High Priority)

| Cruise Line | Target Ships | Region Focus | URL Pattern |
|-------------|--------------|--------------|-------------|
| **Royal Caribbean** (current) | 10+ ships | Caribbean, Alaska | `royalcaribbean.com/cruises/{ship}` |
| **Carnival Cruise Line** | 15+ ships | Caribbean, Mexico | `carnival.com/cruises/{ship}` |
| **Norwegian Cruise Line** | 12+ ships | Caribbean, Mediterranean | `ncl.com/cruises/{ship}` |
| **MSC Cruises** | 8+ ships | Caribbean, Mediterranean | `msccruises.com/{ship}` |

### Phase 2: Premium & Specialty Lines

| Cruise Line | Target Ships | Region Focus | URL Pattern |
|-------------|--------------|--------------|-------------|
| **Celebrity Cruises** | 8+ ships | Caribbean, Europe | `celebrity.com/cruises/{ship}` |
| **Princess Cruises** | 10+ ships | Alaska, Caribbean | `princess.com/cruises/{ship}` |
| **Disney Cruise Line** | 4 ships | Caribbean, Bahamas | `disney.com/cruise/{ship}` |
| **Viking Ocean Cruises** | 10+ ships | Europe, World cruises | `viking.com/cruises/{ship}` |

### Phase 3: Boutique & Luxury

| Cruise Line | Target Ships | Region Focus | URL Pattern |
|-------------|--------------|--------------|-------------|
| **Azamara** | 2 ships | World cruises | `azamara.com/cruises/{ship}` |
| **Oceania Cruises** | 4 ships | World cruises | `oceania.com/cruises/{ship}` |
| **Seabourn** | 5 ships | World cruises | `seabourn.com/cruises/{ship}` |

---

## Architecture Design

### Current Architecture
```
jinaSync.ts (orchestrator)
  → JinaReader.scrape(url)
    → jinaParser.parseJinaMarkdown(markdown, url)
      → upsertSailings(sailings)
```

### Proposed Architecture (Modular)
```
cruiseDataEngine.ts (orchestrator)
  ├── cruiseLineConfig.ts (configuration per cruise line)
  ├── scrapers/
  │   ├── royalCaribbeanScraper.ts
  │   ├── carnivalScraper.ts
  │   ├── nclScraper.ts
  │   └── genericJinaScraper.ts (fallback)
  ├── parsers/
  │   ├── jinaParser.ts (existing)
  │   ├── carnivalParser.ts
  │   ├── nclParser.ts
  │   └── genericMarkdownParser.ts
  └── db/
      └── upsertSailings.ts (enhanced)
```

### Key Design Principles
1. **Per-cruise-line configuration** — Each line has its own URL patterns, selectors, and parsing logic
2. **Fallback to generic parser** — If specific parser fails, use generic Jina parser
3. **Configurable rate limiting** — Different lines may have different rate limits
4. **Error resilience** — One line failing doesn't stop the entire sync

---

## Implementation Phases

### Phase 1: Royal Caribbean Expansion (Week 1)
- [ ] Add 10+ Royal Caribbean ship URLs to config
- [ ] Test parsing for different ship pages
- [ ] Validate cabin type extraction (Inside, Oceanview, Balcony, Suite)
- [ ] Test multiple departure ports and destinations

### Phase 2: Carnival & NCL Integration (Week 2)
- [ ] Create Carnival URL config and test parsing
- [ ] Create NCL URL config and test parsing
- [ ] Handle different website layouts (Carnival vs NCL)
- [ ] Test cabin type extraction for these lines

### Phase 3: MSC & Celebrity (Week 3)
- [ ] Create MSC Cruises URL config
- [ ] Create Celebrity Cruises URL config
- [ ] Test parsing for European/Mediterranean routes

### Phase 4: Premium Lines (Week 4)
- [ ] Add Princess, Disney, Viking configs
- [ ] Test boutique line parsing
- [ ] Validate luxury cruise data extraction

### Phase 5: Infrastructure & Testing (Week 5)
- [ ] Refactor to modular architecture
- [ ] Add unit tests for parsers
- [ ] Add integration tests for sync pipeline
- [ ] Add validation tests for database writes

---

## URL Collection Strategy

### Royal Caribbean (Primary Source)
```
https://www.royalcaribbean.com/cruises/icon-of-the-seas
https://www.royalcaribbean.com/cruises/wonder-of-the-seas
https://www.royalcaribbean.com/cruises/symphony-of-the-seas
https://www.royalcaribbean.com/cruises/utopia-of-the-seas
https://www.royalcaribbean.com/cruises/allure-of-the-seas
https://www.royalcaribbean.com/cruises/odyssey-of-the-seas
https://www.royalcaribbean.com/cruises/harmony-of-the-seas
https://www.royalcaribbean.com/cruises/totality-of-the-seas
```

### Carnival Cruise Line
```
https://www.carnival.com/cruises/breeze
https://www.carnival.com/cruises/ships/mardi-gras
https://www.carnival.com/cruises/ships/ Carnival Horizon
https://www.carnival.com/cruises/ships/Carnival Splendor
```

### Norwegian Cruise Line
```
https://www.ncl.com/cruises/norwegian-escape
https://www.ncl.com/cruises/norwegian-getaway
https://www.ncl.com/cruises/norwegian-gem
```

### MSC Cruises
```
https://www.msccruises.com/en/msc-bellevue-sailing-dates
https://www.msccruises.com/en/msc-world-mediterraneo-sailing-dates
```

### Celebrity Cruises
```
https://www.celebrity.com/cruises/celebrity-eclipse/southern-caribbean
https://www.celebrity.com/cruises/celebrity-edge/mexico-from-los-angeles
```

---

## Parser Enhancement Requirements

### Current Parser Capabilities
- ✅ Extracts ship name
- ✅ Extracts sail date
- ✅ Extracts prices (basic)
- ⚠️ Itinerary parsing (basic)
- ❌ Cabin type pricing (Inside, Oceanview, Balcony, Suite)

### Enhanced Parser Requirements
- [ ] Extract **cabin type pricing** for all 4 categories
- [ ] Handle **multiple departure dates** per ship
- [ ] Parse **itinerary details** (port-by-port)
- [ ] Extract **solo supplement** information
- [ ] Handle **different website layouts** per cruise line

---

## Database Schema Validation

### Current Schema (from `schema.sql`)
```sql
CREATE TABLE sailings (
    id SERIAL PRIMARY KEY,
    cruise_line VARCHAR(100) NOT NULL,
    ship_name VARCHAR(100) NOT NULL,
    departure_date DATE NOT NULL,
    duration_days INT NOT NULL,
    departure_port VARCHAR(100) NOT NULL,
    destination_region VARCHAR(100),
    itinerary TEXT[],
    cabin_categories cabin_tier[],  -- ✅ Supports Inside, Oceanview, Balcony, Suite, Solo
    ...
);

CREATE TABLE pricing_snapshots (
    id SERIAL PRIMARY KEY,
    sailing_id INT NOT NULL,
    cabin_type cabin_tier NOT NULL,  -- ✅ Supports all cabin types
    base_fare_usd NUMERIC(10, 2),
    ...
);
```

### Schema Validation Checklist
- [x] `cabin_tier` enum includes: Inside, Oceanview, Balcony, Suite, Solo
- [x] `sailings` table supports multiple cruise lines
- [x] `pricing_snapshots` stores per-cabin-type pricing
- [ ] Add indexing for `cruise_line` and `cabin_type` queries
- [ ] Add partial index for active sailings (next 12 months)

---

## Testing Strategy

### Unit Tests
- [ ] Test each cruise line parser independently
- [ ] Test URL pattern matching
- [ ] Test cabin type extraction

### Integration Tests
- [ ] Test full sync pipeline for 5 cruise lines
- [ ] Test database upsert with 100+ sailings
- [ ] Test error handling (failed scrapes, network errors)

### Validation Tests
- [ ] Validate parsed data matches expected format
- [ ] Check for missing cabin types
- [ ] Verify pricing ranges are reasonable

---

## Success Metrics

### Quantitative
- **Cruise lines scraped:** ≥10 (from 1)
- **Unique ships in DB:** ≥50 (from 4)
- **Cabin types covered:** 100% (Inside, Oceanview, Balcony, Suite)
- **Departure ports:** ≥20 (from 2)
- **Sailings in DB:** ≥500 (from ~20)

### Qualitative
- **Data freshness:** ≤24 hours old
- **Parser accuracy:** ≥90% successful parses
- **Sync reliability:** ≥95% success rate

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Website blocks scraping | Medium | High | Use Jina Reader (bypasses most blocks), rotate User-Agents |
| Parser fails for new cruise line | High | Medium | Fallback to generic parser, manual config update |
| Rate limiting from Jina | Low | Medium | Implement exponential backoff, queue system |
| Inconsistent website layouts | High | Medium | Per-cruise-line parsers with fallback |
| Database schema limitations | Low | Low | Schema already supports all needed fields |

---

## Command to Execute Goal Loop

```bash
/goal "Execute the plan at .hermes/plans/2026-07-15-cruise-data-scraping-expansion.md"
```

---

## Execution Log

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Royal Caribbean Expansion | ⏳ Pending | Add 10+ ship URLs, test parsing |
| Phase 2: Carnival & NCL | ⏳ Pending | Create configs, test parsing |
| Phase 3: MSC & Celebrity | ⏳ Pending | European routes |
| Phase 4: Premium Lines | ⏳ Pending | Disney, Viking, etc. |
| Phase 5: Infrastructure & Testing | ⏳ Pending | Refactor, add tests |
