# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> Deals Page — Deep Dive >> loads deals page with hero and deal grid
- Location: e2e/app.spec.ts:79:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3003/deals", waiting until "load"

```

# Test source

```ts
  1   | import { Page, Locator, expect } from '@playwright/test';
  2   | 
  3   | export class HomePage {
  4   |   readonly page: Page;
  5   |   readonly heroTitle: Locator;
  6   |   readonly ctaButton: Locator;
  7   |   readonly trustStrip: Locator;
  8   |   readonly priceComparisonTable: Locator;
  9   | 
  10  |   constructor(page: Page) {
  11  |     this.page = page;
  12  |     this.heroTitle = page.locator('h1').first();
  13  |     this.ctaButton = page.locator('a[href="/deals"]').first();
  14  |     this.trustStrip = page.locator('text=/\\d+\\.?\\d*M\\+|prices tracked/i').first();
  15  |     this.priceComparisonTable = page.locator('text=/Price Comparison|Cabin Type/i').first();
  16  |   }
  17  | 
  18  |   async goto() {
  19  |     await this.page.goto('/');
  20  |     await this.page.waitForLoadState('networkidle');
  21  |   }
  22  | 
  23  |   async expectLoaded() {
  24  |     await expect(this.heroTitle).toBeVisible({ timeout: 10000 });
  25  |     await expect(this.ctaButton).toBeVisible({ timeout: 5000 });
  26  |   }
  27  | 
  28  |   async clickExploreDeals() {
  29  |     await this.ctaButton.click();
  30  |     await this.page.waitForURL(/\/deals/);
  31  |   }
  32  | 
  33  |   async getPriceComparisonCabinTypes(): Promise<string[]> {
  34  |     const types = await this.page.locator('text=/Inside|Oceanview|Balcony|Suite/i').allTextContents();
  35  |     return types;
  36  |   }
  37  | }
  38  | 
  39  | export class DealsPage {
  40  |   readonly page: Page;
  41  |   readonly heroTitle: Locator;
  42  |   readonly dealCards: Locator;
  43  |   readonly cruiseLineFilter: Locator;
  44  |   readonly regionFilter: Locator;
  45  |   readonly durationFilter: Locator;
  46  |   readonly typeFilter: Locator;
  47  |   readonly sortSelect: Locator;
  48  |   readonly refreshButton: Locator;
  49  |   readonly pagination: Locator;
  50  | 
  51  |   constructor(page: Page) {
  52  |     this.page = page;
  53  |     this.heroTitle = page.locator('h1').first();
  54  |     this.dealCards = page.locator('[data-testid="deal-card"]');
  55  |     this.cruiseLineFilter = page.locator('button:has-text("Cruise Line"), button:has-text("Line")').first();
  56  |     this.regionFilter = page.locator('button:has-text("Region"), button:has-text("Destination")').first();
  57  |     this.durationFilter = page.locator('button:has-text("Duration")').first();
  58  |     this.typeFilter = page.locator('button:has-text("Type")').first();
  59  |     this.sortSelect = page.locator('select').first();
  60  |     this.refreshButton = page.locator('button:has-text("Refresh"), button:has-text("Live"), button:has-text("Sync")').first();
  61  |     this.pagination = page.locator('nav[aria-label="pagination"], [role="navigation"]').first();
  62  |   }
  63  | 
  64  |   async goto() {
> 65  |     await this.page.goto('/deals');
      |                     ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  66  |     await this.page.waitForLoadState('networkidle', { timeout: 15000 });
  67  |   }
  68  | 
  69  |   async expectLoaded() {
  70  |     await expect(this.heroTitle).toBeVisible({ timeout: 10000 });
  71  |     await expect(this.dealCards.first()).toBeVisible({ timeout: 15000 });
  72  |   }
  73  | 
  74  |   async getFirstDealCard() {
  75  |     return this.dealCards.first();
  76  |   }
  77  | 
  78  |   async getDealCardCount() {
  79  |     return await this.dealCards.count();
  80  |   }
  81  | 
  82  |   async filterByCruiseLine(line: string) {
  83  |     await this.cruiseLineFilter.click();
  84  |     await this.page.waitForTimeout(300);
  85  |     const option = this.page.locator(`text=/${line}/i`).first();
  86  |     if (await option.isVisible({ timeout: 2000 })) {
  87  |       await option.click();
  88  |       await this.page.waitForLoadState('networkidle');
  89  |       return true;
  90  |     }
  91  |     return false;
  92  |   }
  93  | 
  94  |   async sortBy(optionLabel: string) {
  95  |     if (await this.sortSelect.isVisible({ timeout: 2000 })) {
  96  |       await this.sortSelect.selectOption({ label: optionLabel });
  97  |       await this.page.waitForLoadState('networkidle');
  98  |     }
  99  |   }
  100 | 
  101 |   async clickRefresh() {
  102 |     if (await this.refreshButton.isVisible({ timeout: 2000 })) {
  103 |       await this.refreshButton.click();
  104 |       await this.page.waitForLoadState('networkidle');
  105 |     }
  106 |   }
  107 | 
  108 |   async clickNextPage() {
  109 |     const nextBtn = this.pagination.locator('button:has-text("Next"), button[aria-label="Next"]').first();
  110 |     if (await nextBtn.isEnabled({ timeout: 2000 })) {
  111 |       await nextBtn.click();
  112 |       await this.page.waitForLoadState('networkidle');
  113 |     }
  114 |   }
  115 | }
  116 | 
  117 | export class SailingDetailPage {
  118 |   readonly page: Page;
  119 |   readonly sailingTitle: Locator;
  120 |   readonly cabinBreakdown: Locator;
  121 |   readonly dealAnalysis: Locator;
  122 |   readonly priceForecast: Locator;
  123 |   readonly bookingButton: Locator;
  124 | 
  125 |   constructor(page: Page) {
  126 |     this.page = page;
  127 |     this.sailingTitle = page.locator('h1').first();
  128 |     this.cabinBreakdown = page.locator('text=/Cabin Breakdown|Price Comparison/i').first();
  129 |     this.dealAnalysis = page.locator('text=/Deal Analysis|Deal Score|Pricing Deep-Dive/i').first();
  130 |     this.priceForecast = page.locator('text=/Price Forecast|Price Trend/i').first();
  131 |     this.bookingButton = page.locator('a[href*="vacationstogo"], a[href*="booking"], button:has-text("Book"), button:has-text("View Deal")').first();
  132 |   }
  133 | 
  134 |   async goto(sailingId: string) {
  135 |     await this.page.goto(`/sailing/${sailingId}`);
  136 |     await this.page.waitForLoadState('networkidle', { timeout: 10000 });
  137 |   }
  138 | 
  139 |   async expectLoaded() {
  140 |     await expect(this.sailingTitle).toBeVisible({ timeout: 10000 });
  141 |   }
  142 | 
  143 |   async getCabinBreakdown() {
  144 |     // Look for rows with Select buttons in the cabin pricing table
  145 |     const rows = await this.page.locator('table tbody tr, [data-testid="cabin-row"]').all();
  146 |     return rows;
  147 |   }
  148 | 
  149 |   async getDealAnalysisText(): Promise<string | null> {
  150 |     if (await this.dealAnalysis.isVisible({ timeout: 2000 })) {
  151 |       return await this.dealAnalysis.textContent();
  152 |     }
  153 |     return null;
  154 |   }
  155 | 
  156 |   async clickBookingLink() {
  157 |     if (await this.bookingButton.isVisible({ timeout: 2000 })) {
  158 |       await this.bookingButton.click();
  159 |     }
  160 |   }
  161 | }
  162 | 
  163 | export class HistoryPage {
  164 |   readonly page: Page;
  165 |   readonly heroTitle: Locator;
```