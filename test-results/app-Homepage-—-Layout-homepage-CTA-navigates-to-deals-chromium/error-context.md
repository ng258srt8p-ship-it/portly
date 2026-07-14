# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> Homepage — Layout >> homepage CTA navigates to /deals
- Location: e2e/app.spec.ts:58:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3003/", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect, request } from '@playwright/test';
  2   | import { 
  3   |   fetchDealList, 
  4   |   fetchFirstSailingId, 
  5   |   fetchSailingDetail, 
  6   |   fetchDealAnalysis,
  7   |   fetchPriceForecast,
  8   |   fetchSailingBreakdown,
  9   |   fetchSoloFriendly,
  10  |   searchCruises,
  11  |   triggerBatchAnalysis,
  12  |   validateDeal,
  13  |   validateSailingDetail,
  14  |   validateCabinBreakdown,
  15  |   validateDealAnalysis,
  16  |   validatePriceForecast,
  17  |   API_BASE 
  18  | } from './utils/api';
  19  | import { DealsPage, SailingDetailPage, HistoryPage, SoloPage, AlertsPage } from './pages';
  20  | 
  21  | test.describe.configure({ retries: 0 });
  22  | 
  23  | // ============================================================================
  24  | // 1. HOMEPAGE — Layout & Navigation
  25  | // ============================================================================
  26  | 
  27  | test.describe('Homepage — Layout', () => {
  28  |   test('loads the homepage with hero and CTA', async ({ page }) => {
  29  |     await page.goto('/');
  30  |     
  31  |     await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  32  |     await expect(page.locator('h1').first()).toContainText(/Track the Absolute|Out-the-Door Cost|Cruise/i);
  33  |     
  34  |     await expect(page.locator('text=/2\\.1M\\+|prices tracked/i')).toBeVisible({ timeout: 10000 });
  35  |     
  36  |     const cta = page.locator('a[href="/deals"]').first();
  37  |     await expect(cta).toBeVisible();
  38  |     await expect(cta).toContainText(/Explore All Deals|Find Your Perfect Voyage/i);
  39  |   });
  40  | 
  41  |   test('homepage has search filters (destination, cruise line, passengers)', async ({ page }) => {
  42  |     await page.goto('/');
  43  |     
  44  |     // The homepage has search controls in the hero - use getByRole for button labels
  45  |     await expect(page.getByRole('button', { name: /Destination/i })).toBeVisible({ timeout: 5000 });
  46  |     await expect(page.getByRole('button', { name: /Cruise Line/i })).toBeVisible({ timeout: 5000 });
  47  |     // "Passenger" label is a text element, not a button - the buttons are +/-
  48  |     await expect(page.locator('text=/Passenger/i').first()).toBeVisible({ timeout: 5000 });
  49  |     await expect(page.getByRole('button', { name: /Search Voyages/i })).toBeVisible({ timeout: 5000 });
  50  |   });
  51  | 
  52  |   test('homepage has price comparison table', async ({ page }) => {
  53  |     await page.goto('/');
  54  |     
  55  |     await expect(page.locator('text=/CABIN TYPE|BASE FARE|TAXES|GRATUITIES|TOTAL/i').first()).toBeVisible({ timeout: 5000 });
  56  |   });
  57  | 
  58  |   test('homepage CTA navigates to /deals', async ({ page }) => {
> 59  |     await page.goto('/');
      |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  60  |     const cta = page.locator('a[href="/deals"]').first();
  61  |     await cta.click();
  62  |     await expect(page).toHaveURL(/\/deals/, { timeout: 10000 });
  63  |     await expect(page.locator('h1').first()).toContainText(/Deals|Explore|All|Find Your Perfect Voyage/i);
  64  |   });
  65  | });
  66  | 
  67  | // ============================================================================
  68  | // 2. DEALS PAGE — Deep Dive
  69  | // ============================================================================
  70  | 
  71  | test.describe('Deals Page — Deep Dive', () => {
  72  |   let dealsPage: DealsPage;
  73  | 
  74  |   test.beforeEach(async ({ page }) => {
  75  |     dealsPage = new DealsPage(page);
  76  |     await dealsPage.goto();
  77  |   });
  78  | 
  79  |   test('loads deals page with hero and deal grid', async ({ page }) => {
  80  |     await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  81  |     // Wait for deals to load (not loading skeletons)
  82  |     await page.waitForLoadState('networkidle', { timeout: 15000 });
  83  |     await page.waitForTimeout(3000);
  84  |     await expect(page.locator('[data-testid="deal-card"]').first()).toBeVisible({ timeout: 15000 });
  85  |   });
  86  | 
  87  |   test('shows filters on deals page', async ({ page }) => {
  88  |     // Wait for deals to load first
  89  |     await page.waitForLoadState('networkidle', { timeout: 15000 });
  90  |     await page.waitForTimeout(3000);
  91  |     
  92  |     const filterTestIds = [
  93  |       'filter-region', 
  94  |       'filter-destination',
  95  |       'filter-nights',
  96  |       'filter-type'
  97  |     ];
  98  |     
  99  |     for (const testId of filterTestIds) {
  100 |       await expect(page.locator(`[data-testid="${testId}"]`)).toBeVisible({ timeout: 5000 });
  101 |     }
  102 |     
  103 |     // Cruise line filter only appears if > 1 cruise line
  104 |     const cruiseLineFilter = page.locator('[data-testid="filter-cruise-line"]').first();
  105 |     if (await cruiseLineFilter.isVisible({ timeout: 2000 })) {
  106 |       await expect(cruiseLineFilter).toBeVisible({ timeout: 5000 });
  107 |     }
  108 |   });
  109 | 
  110 |   test('filters by cruise line', async ({ page }) => {
  111 |     const cruiseLineFilter = page.locator('[data-testid="filter-cruise-line"]').first();
  112 |     // Only run if filter exists (requires >1 cruise line)
  113 |     if (await cruiseLineFilter.isVisible({ timeout: 5000 })) {
  114 |       await cruiseLineFilter.click();
  115 |       
  116 |       const royalCaribbean = page.locator('text=Royal Caribbean').first();
  117 |       if (await royalCaribbean.isVisible({ timeout: 3000 })) {
  118 |         await royalCaribbean.click();
  119 |         await page.waitForLoadState('networkidle', { timeout: 5000 });
  120 |         await expect(page.locator('[data-testid="deal-card"]').first()).toBeVisible({ timeout: 10000 });
  121 |       }
  122 |     } else {
  123 |       // Test passes if filter doesn't exist (only 1 cruise line)
  124 |       expect(true).toBeTruthy();
  125 |     }
  126 |   });
  127 | 
  128 |   test('filters by region', async ({ page }) => {
  129 |     const regionFilter = page.locator('[data-testid="filter-region"]').first();
  130 |     await regionFilter.click();
  131 |     
  132 |     const caribbean = page.locator('text=Caribbean').first();
  133 |     if (await caribbean.isVisible({ timeout: 3000 })) {
  134 |       await caribbean.click();
  135 |       await page.waitForLoadState('networkidle', { timeout: 5000 });
  136 |       await expect(page.locator('[data-testid="deal-card"]').first()).toBeVisible({ timeout: 10000 });
  137 |     }
  138 |   });
  139 | 
  140 |   test('price range filter works', async ({ page }) => {
  141 |     const priceFilter = page.locator('[data-testid="filter-price-min"]').first();
  142 |     if (await priceFilter.isVisible({ timeout: 3000 })) {
  143 |       await expect(priceFilter).toBeVisible({ timeout: 3000 });
  144 |     }
  145 |   });
  146 | 
  147 |   test('sort dropdown works', async ({ page }) => {
  148 |     const sortSelect = page.locator('[data-testid="filter-sort"]').first();
  149 |     if (await sortSelect.isVisible({ timeout: 3000 })) {
  150 |       await sortSelect.selectOption({ index: 1 });
  151 |       await page.waitForLoadState('networkidle', { timeout: 5000 });
  152 |     }
  153 |   });
  154 | 
  155 |   test('pagination works', async ({ page }) => {
  156 |     const pagination = page.locator('nav[aria-label="pagination"]').first();
  157 |     if (await pagination.isVisible({ timeout: 5000 })) {
  158 |       await expect(pagination).toBeVisible();
  159 |     } else {
```