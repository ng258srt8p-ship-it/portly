# Portly — $0 Cruise Deal Aggregation Architecture

## Stack
- **Database:** Cloudflare D1 (SQLite at edge)
- **Cache:** Cloudflare KV
- **API:** Cloudflare Workers (Hono)
- **Frontend:** Next.js on Cloudflare Pages
- **Scrapers:** GitHub Actions (Playwright) every 4 hours
- **Cost:** $0 (all free tiers)

## Schema
`schema/001_init.sql` — 6 reference tables + 3 data tables + deals_view

## Top 20 Cruise Lines
**Carnival Corp (7):** Carnival, Princess, Holland America, Cunard, Costa, AIDA, P&O
**Royal Caribbean Group (3):** Royal Caribbean, Celebrity, Silversea
**TUI Group (2):** TUI Cruises, Marella
**Standalone (8):** MSC, Disney, NCL, Virgin, Viking, Fred. Olsen, Saga, Celestyal

## Phases

### Loop 1: Foundation (Week 1-2)
- D1 + KV provisioned ✅
- Schema migrated ✅
- Worker API deployed ✅
- Carnival Corp adapter (7 lines)
- GitHub Actions workflow
- 200+ sailings

### Loop 2: First Scrape (Week 3)
- Carnival adapter real data
- Dedup pipeline
- First manual scrape

### Loop 3: All 20 Adapters (Week 4-5)
- Remaining 13 cruise line adapters
- Affiliate feed parsers
- Full dedup pipeline

### Loop 4: Search + Polish (Week 5-6)
- FTS5 on D1
- Frontend connected to Worker API
- Price drop badges

### Loop 5: Alerts + Launch (Week 6-7)
- Email alerts
- User subscriptions
- Monitoring

## GitHub Secrets Required
- `CLOUDFLARE_ACCOUNT_ID` — from Cloudflare dashboard
- `CLOUDFLARE_API_TOKEN` — with D1 + Workers permissions
