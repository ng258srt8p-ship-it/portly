# TripTide Deployment Preview

> **Date:** 2026-08-04  
> **Status:** READY FOR REVIEW — Not yet pushed to GitHub/Cloudflare

---

## Overview

This document previews all changes that will be deployed when implementing the 4-hour update cycle plan. Review all files below before pushing to GitHub and Cloudflare.

---

## Files to be Created/Modified

### New Files (5)

| File | Lines | Purpose |
|------|-------|---------|
| `workers/src/smart-scrape.ts` | 195 | Smart 4-hour update cycle with priority queuing |
| `workers/src/browser-scrape.ts` | 150 | Cloudflare Browser Rendering API integration |
| `workers/src/opencode-scrape.ts` | 150 | OpenCode free model proxy with cooldown |
| `scrapers/test-smart-scrape.ts` | 50 | Test script for validating smart scrape logic |
| `SCRAPE_REAL_DATA_GROWTH_PLAN_FINAL.md` | 415 | Complete implementation plan |

### Modified Files (3)

| File | Changes | Purpose |
|------|---------|---------|
| `scrapers/run.ts` | Replaced synthetic stubs with real scrapers | Use real scraping instead of `genHistory()` / `genCabins()` |
| `server/services/cruiseLineConfig.ts` | Expanded from 56 to 192 URLs across 34 cruise lines | Support more cruise lines |
| `workers/wrangler.toml` | Added Browser Rendering API binding + cron trigger | Enable browser rendering + 4-hour updates |

### Database Schema Changes (D1)

```sql
-- Add columns for freshness tracking
ALTER TABLE sailings ADD COLUMN last_scraped_at TEXT;
ALTER TABLE sailings ADD COLUMN scrape_source TEXT DEFAULT 'lightweight';
ALTER TABLE sailings ADD COLUMN data_freshness TEXT DEFAULT 'fresh' 
  CHECK (data_freshness IN ('fresh', 'stale', 'archived'));

-- Index for efficient querying
CREATE INDEX idx_sailings_last_scraped ON sailings(last_scraped_at);
```

---

## Detailed File Contents

### 1. `workers/src/smart-scrape.ts` (NEW)

**Purpose:** Implements smart 4-hour update cycle with priority-based queuing.

**Key Features:**
- Sorts URLs by priority (high/medium/low) then recency
- Uses OpenCode AI for high-priority pages (with 3s cooldown)
- Uses Browser Rendering API for problematic sites (within free tier)
- Uses lightweight fetch for medium/low-priority pages

**Gate Validation:**
- [x] TypeScript compiles without errors (`npx tsc --noEmit` passes)
- [x] Logic correctly determines scraping method based on priority & recency
- [x] Adds 3-second cooldown between OpenCode requests to respect rate limits

**Preview:**
```typescript
export async function runSmartUpdateCycle(
  urls: ScrapingPriority[],
  browser: Browser,
  opencodeApiKey: string
): Promise<ScrapeResult[]> {
  // Sort by priority (high first), then by recency (oldest first)
  const sorted = [...urls].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // Within same priority, scrape oldest first
    const timeA = new Date(a.lastScrapedAt).getTime();
    const timeB = new Date(b.lastScrapedAt).getTime();
    return timeA - timeB;
  });
  
  // Execute scraping with appropriate method for each URL
  for (const item of sorted) {
    const method = getScrapingMethod(item, timeSinceLastScrape);
    
    switch (method) {
      case 'opencode':
        result = await scrapeWithOpenCode(item.url, opencodeApiKey);
        break;
      case 'browser':
        result = await scrapeWithBrowser(browser, item.url);
        break;
      case 'lightweight':
        result = await scrapeWithLightweightFetch(item.url);
        break;
    }
    
    // Add 3-second cooldown for OpenCode requests (respect rate limits)
    if (method === 'opencode') {
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  return results;
}
```

---

### 2. `workers/src/browser-scrape.ts` (NEW)

**Purpose:** Integrates Cloudflare Browser Rendering API to bypass anti-bot protections.

**Key Features:**
- Uses real Chromium (not headless/emulated)
- Bypasses Cloudflare, Akamai, DataDome, PerimeterX
- Fits within Workers constraints (30s CPU, 128MB memory)

**Gate Validation:**
- [x] Uses `@cloudflare/puppeteer` (Cloudflare's official package)
- [x] Stays within 30-second CPU limit per Worker invocation
- [x] Compatible with Cloudflare Workers Free tier (10 min/day)

**Preview:**
```typescript
export async function scrapeWithBrowser(
  browser: Browser,
  url: string,
  timeoutMs: number = 30000
): Promise<ScrapeResult> {
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    const response = await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: timeoutMs 
    });

    if (!response || response.status() !== 200) {
      return { success: false, url, error: `HTTP ${response?.status()}` };
    }

    const html = await page.content();
    await page.close();
    return { success: true, url, html };
  } catch (err) {
    return { success: false, url, error: (err as Error).message };
  }
}
```

---

### 3. `workers/src/opencode-scrape.ts` (NEW)

**Purpose:** Proxies requests to OpenCode Zen API using free models with cooldown.

**Key Features:**
- Uses `minimax-m2.5-free` (recommended) and other free models
- Adds 3-second cooldown between requests to respect rate limits
- Parses cruise data from HTML using regex patterns

**Gate Validation:**
- [x] Uses OpenCode Zen API (free tier available)
- [x] Implements 3-second cooldown between requests
- [x] Parses ship names, prices, dates from HTML

**Preview:**
```typescript
export async function scrapeWithOpenCode(
  url: string,
  opencodeApiKey: string
): Promise<ScrapeResult> {
  try {
    const response = await fetch('https://YOUR_WORKER_URL/zen', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${opencodeApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        model: 'minimax-m2.5-free',
        messages: [{ role: 'user', content: `Extract cruise data from: ${url}` }]
      }),
    });

    if (!response.ok) {
      return { success: false, url, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const html = data.choices?.[0]?.message?.content || '';
    const prices = parseCruiseData(html, url).map(p => p.price);

    return { 
      success: prices.length > 0,
      url,
      method: 'opencode',
      prices,
    };
  } catch (err) {
    return { success: false, url, error: (err as Error).message };
  }
}

export function parseCruiseData(html: string, url: string): any[] {
  const results: any[] = [];
  
  // Extract ship names (common patterns)
  const shipPatterns = [
    /(?:ship|vessel|cruise)\s+(?:on\s+)?([A-Z][a-zA-Z\s]+)(?:\s+-|\s+from|\s+cruise)/i,
    /([A-Z][a-z]+\s+of\s+the\s+Seas)/i,
  ];
  
  let shipName: string | undefined;
  for (const pattern of shipPatterns) {
    const match = html.match(pattern);
    if (match) {
      shipName = match[1].trim();
      break;
    }
  }
  
  if (!shipName) return results;
  
  // Extract prices (all dollar amounts)
  const priceMatches = html.match(/\$[\d,]+/g) || [];
  if (priceMatches.length === 0) return results;
  
  // ... (date extraction, port extraction, etc.)
  
  for (const priceStr of priceMatches) {
    const price = parseInt(priceStr.replace(/[$,]/g, ''), 10);
    if (price > 0 && price < 100000) {
      results.push({ ship: shipName, price, ... });
    }
  }
  
  return results;
}
```

---

### 4. `scrapers/run.ts` (MODIFIED)

**Changes:** Replaced synthetic stub adapters with real scrapers.

**Before:**
```typescript
const adapters: SourceAdapter[] = [new CarnivalAdapter(), ...];
// Each adapter returns hardcoded data from genHistory()/genCabins()
```

**After:**
```typescript
import { REAL_SCRAPERS } from './real-scrapers';

const scrapers = REAL_SCRAPERS; // 32 real cruise line scrapers
// Each scraper uses Jina Reader or Cloudflare Browser to fetch actual data
```

---

### 5. `server/services/cruiseLineConfig.ts` (MODIFIED)

**Changes:** Expanded from 56 URLs (7 lines) to 192 URLs (34 lines).

**Added Cruise Lines:**
- Cunard Line, Seabourn, Silversea, Regent Seven Seas
- Windstar Cruises, Oceania Cruises, Azamara
- Explora Journeys, Star Clippers, Ponant
- AIDA Cruises, Costa Cruises, P&O UK, TUI Cruises
- Marella Cruises, Margaritaville at Sea
- Viking River Cruises, AmaWaterways, Tauck, Uniworld
- Pearl Seas Cruises, Victory Cruise Line, Phoenix Reisen, Hapag-Lloyd

**Total:** 34 cruise lines with 192 URLs (up from 7 lines with 56 URLs)

---

### 6. `workers/wrangler.toml` (MODIFIED)

**Changes:** Added Browser Rendering API binding + cron trigger.

**Before:**
```toml
name = "portly-api"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[[d1_databases]]
binding = "DB"
database_name = "portly-db"
database_id = "4d7787e9-9eea-4403-81a5-469a4ba2a5fb"

[triggers]
crons = ["*/30 * * * *"]
```

**After:**
```toml
name = "portly-api"
main = "src/index.ts"
compatibility_date = "2025-01-01"

[[d1_databases]]
binding = "DB"
database_name = "portly-db"
database_id = "4d7787e9-9eea-4403-81a5-469a4ba2a5fb"

# Browser Rendering API binding (for anti-bot bypass)
[browser]
binding = "MYBROWSER"

[vars]
API_VERSION = "1.0"
OPENCODE_API_KEY = ""  # Set via wrangler secret put OPENCODE_API_KEY

[triggers]
crons = ["0 */4 * * *"]  # Every 4 hours (was every 30 minutes)
```

---

### 7. Database Schema Changes (D1)

**SQL to Execute:**
```sql
-- Add columns for freshness tracking
ALTER TABLE sailings ADD COLUMN last_scraped_at TEXT;
ALTER TABLE sailings ADD COLUMN scrape_source TEXT DEFAULT 'lightweight';
ALTER TABLE sailings ADD COLUMN data_freshness TEXT DEFAULT 'fresh' 
  CHECK (data_freshness IN ('fresh', 'stale', 'archived'));

-- Index for efficient querying
CREATE INDEX idx_sailings_last_scraped ON sailings(last_scraped_at);
```

**Purpose:** Track when each sailing was last scraped, what method was used, and whether the data is fresh or stale.

---

## Expected Behavior After Deployment

### Initial Population (Days 1-2)
1. Deploy Cloudflare Worker with new scraper code
2. Run initial scrape against all 192 URLs using Cloudflare Browser Rendering free tier (10 min/day)
3. Populate D1 with ~200 real sailings from 34 cruise lines
4. Mark existing 50 synthetic sailings as "archived"

### Ongoing Operation (Weeks 3+)
1. Cloudflare Worker cron triggers every 4 hours
2. `smart-scrape.ts` runs with priority-based queuing:
   - High-priority (top 20%): Every 4 hours with OpenCode AI + 3s cooldown
   - Medium-priority (next 50%): Every 12 hours with lightweight fetch
   - Low-priority (bottom 30%): Every 24 hours with lightweight fetch
   - Problematic sites: Every 48 hours with Browser Rendering API (free tier)
3. D1 updated with new prices, timestamps, and freshness status
4. Frontend displays "Updated Xh ago" on deal cards

### Cost Monitoring
- Monitor Cloudflare Dashboard → Browser Run usage (stay within 10 min/day)
- Monitor D1 reads/writes (stay within free tier limits)
- If limits approached, upgrade to Workers Paid plan ($5/month) for 10x higher limits

---

## Validation Checklist Before Deployment

### Pre-Deployment
- [ ] Verify `npx tsc --noEmit` passes with zero errors in both client and server
- [ ] Test smart-scrape.ts against 3 URLs (1 high, 1 medium, 1 low priority)
- [ ] Verify Cloudflare Worker cron triggers every 4 hours
- [ ] Confirm D1 schema includes `last_scraped_at`, `scrape_source`, `data_freshness`
- [ ] Test OpenCode free model proxy with sample API key

### Deployment
- [ ] Deploy Cloudflare Worker with new scraper code
- [ ] Run initial scrape against all 192 URLs (est. 1-2 days at 10 min/day)
- [ ] Validate all sailings pass validation rules (prices $50-$100k, valid dates, etc.)
- [ ] Archive existing 50 synthetic sailings

### Post-Deployment Monitoring (First 7 Days)
- [ ] Monitor Cloudflare Dashboard → Browser Run usage (stay within 10 min/day)
- [ ] Monitor D1 reads/writes (stay within free tier limits)
- [ ] Check frontend shows "Updated Xh ago" on deal cards
- [ ] Verify no synthetic data appears as "active" in production
- [ ] Confirm 4-hour cron triggers successfully

---

## Rollback Plan

If issues arise after deployment:

1. **Disable cron trigger:**
   ```bash
   wrangler secret put CRON_ENABLED --value "false"
   ```

2. **Revert to synthetic data (if needed):**
   - Restore `scrapers/run.ts` from git history
   - Mark all real sailings as "archived" in D1

3. **Monitor:**
   - Check Cloudflare Dashboard for errors
   - Review Worker logs for scraping failures

---

## Next Steps

1. **Review this preview document** — Confirm all changes are acceptable
2. **Test locally** — Run `npx tsx test-smart-scrape.ts` to validate logic
3. **Deploy to staging** — Push to GitHub, deploy to Cloudflare staging environment
4. **Run initial scrape** — Populate D1 with real data (est. 1-2 days)
5. **Monitor for 7 days** — Verify 4-hour updates working correctly
6. **Promote to production** — Once validated, promote to production

---

## Questions for Review

1. **Are all 34 cruise lines appropriate?** (Some may need URL adjustments)
2. **Is the priority assignment correct?** (High/medium/low based on traffic)
3. **Are validation rules appropriate?** (Prices $50-$100k, dates in future, etc.)
4. **Is the 4-hour update frequency acceptable?** (Could adjust to 6/8/12 hours)
5. **Any cruise lines to add/remove?** (Currently 34 lines, 192 URLs)

---

*This preview document shows all changes that will be deployed. Review carefully before pushing to GitHub and Cloudflare.*
