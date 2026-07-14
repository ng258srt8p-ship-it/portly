import { Page, Locator, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly heroTitle: Locator;
  readonly ctaButton: Locator;
  readonly trustStrip: Locator;
  readonly priceComparisonTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroTitle = page.locator('h1').first();
    this.ctaButton = page.locator('a[href="/deals"]').first();
    this.trustStrip = page.locator('text=/\\d+\\.?\\d*M\\+|prices tracked/i').first();
    this.priceComparisonTable = page.locator('text=/Price Comparison|Cabin Type/i').first();
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await expect(this.heroTitle).toBeVisible({ timeout: 10000 });
    await expect(this.ctaButton).toBeVisible({ timeout: 5000 });
  }

  async clickExploreDeals() {
    await this.ctaButton.click();
    await this.page.waitForURL(/\/deals/);
  }

  async getPriceComparisonCabinTypes(): Promise<string[]> {
    const types = await this.page.locator('text=/Inside|Oceanview|Balcony|Suite/i').allTextContents();
    return types;
  }
}

export class DealsPage {
  readonly page: Page;
  readonly heroTitle: Locator;
  readonly dealCards: Locator;
  readonly cruiseLineFilter: Locator;
  readonly regionFilter: Locator;
  readonly durationFilter: Locator;
  readonly typeFilter: Locator;
  readonly sortSelect: Locator;
  readonly refreshButton: Locator;
  readonly pagination: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroTitle = page.locator('h1').first();
    this.dealCards = page.locator('[data-testid="deal-card"]');
    this.cruiseLineFilter = page.locator('button:has-text("Cruise Line"), button:has-text("Line")').first();
    this.regionFilter = page.locator('button:has-text("Region"), button:has-text("Destination")').first();
    this.durationFilter = page.locator('button:has-text("Duration")').first();
    this.typeFilter = page.locator('button:has-text("Type")').first();
    this.sortSelect = page.locator('select').first();
    this.refreshButton = page.locator('button:has-text("Refresh"), button:has-text("Live"), button:has-text("Sync")').first();
    this.pagination = page.locator('nav[aria-label="pagination"], [role="navigation"]').first();
  }

  async goto() {
    await this.page.goto('/deals');
    await this.page.waitForLoadState('networkidle', { timeout: 15000 });
  }

  async expectLoaded() {
    await expect(this.heroTitle).toBeVisible({ timeout: 10000 });
    await expect(this.dealCards.first()).toBeVisible({ timeout: 15000 });
  }

  async getFirstDealCard() {
    return this.dealCards.first();
  }

  async getDealCardCount() {
    return await this.dealCards.count();
  }

  async filterByCruiseLine(line: string) {
    await this.cruiseLineFilter.click();
    await this.page.waitForTimeout(300);
    const option = this.page.locator(`text=/${line}/i`).first();
    if (await option.isVisible({ timeout: 2000 })) {
      await option.click();
      await this.page.waitForLoadState('networkidle');
      return true;
    }
    return false;
  }

  async sortBy(optionLabel: string) {
    if (await this.sortSelect.isVisible({ timeout: 2000 })) {
      await this.sortSelect.selectOption({ label: optionLabel });
      await this.page.waitForLoadState('networkidle');
    }
  }

  async clickRefresh() {
    if (await this.refreshButton.isVisible({ timeout: 2000 })) {
      await this.refreshButton.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async clickNextPage() {
    const nextBtn = this.pagination.locator('button:has-text("Next"), button[aria-label="Next"]').first();
    if (await nextBtn.isEnabled({ timeout: 2000 })) {
      await nextBtn.click();
      await this.page.waitForLoadState('networkidle');
    }
  }
}

export class SailingDetailPage {
  readonly page: Page;
  readonly sailingTitle: Locator;
  readonly cabinBreakdown: Locator;
  readonly dealAnalysis: Locator;
  readonly priceForecast: Locator;
  readonly bookingButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sailingTitle = page.locator('h1').first();
    this.cabinBreakdown = page.locator('text=/Cabin Breakdown|Price Comparison/i').first();
    this.dealAnalysis = page.locator('text=/Deal Analysis|Deal Score|Pricing Deep-Dive/i').first();
    this.priceForecast = page.locator('text=/Price Forecast|Price Trend/i').first();
    this.bookingButton = page.locator('a[href*="vacationstogo"], a[href*="booking"], button:has-text("Book"), button:has-text("View Deal")').first();
  }

  async goto(sailingId: string) {
    await this.page.goto(`/sailing/${sailingId}`);
    await this.page.waitForLoadState('networkidle', { timeout: 10000 });
  }

  async expectLoaded() {
    await expect(this.sailingTitle).toBeVisible({ timeout: 10000 });
  }

  async getCabinBreakdown() {
    // Look for rows with Select buttons in the cabin pricing table
    const rows = await this.page.locator('table tbody tr, [data-testid="cabin-row"]').all();
    return rows;
  }

  async getDealAnalysisText(): Promise<string | null> {
    if (await this.dealAnalysis.isVisible({ timeout: 2000 })) {
      return await this.dealAnalysis.textContent();
    }
    return null;
  }

  async clickBookingLink() {
    if (await this.bookingButton.isVisible({ timeout: 2000 })) {
      await this.bookingButton.click();
    }
  }
}

export class HistoryPage {
  readonly page: Page;
  readonly heroTitle: Locator;
  readonly lineCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroTitle = page.locator('h1').first();
    this.lineCards = page.locator('text=/Royal Caribbean|Carnival|MSC|Norwegian|Disney|Virgin|Princess|Celebrity/i');
  }

  async goto() {
    await this.page.goto('/history');
    await this.page.waitForLoadState('networkidle', { timeout: 10000 });
  }

  async expectLoaded() {
    await expect(this.heroTitle).toBeVisible({ timeout: 10000 });
  }
}

export class SoloPage {
  readonly page: Page;
  readonly heroTitle: Locator;
  readonly tabs: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroTitle = page.locator('h1').first();
    this.tabs = page.locator('button[role="tab"], button:has-text("All"), button:has-text("Waived"), button:has-text("Low Supplement")');
  }

  async goto() {
    await this.page.goto('/solo');
    await this.page.waitForLoadState('networkidle', { timeout: 10000 });
  }

  async expectLoaded() {
    await expect(this.heroTitle).toBeVisible({ timeout: 10000 });
  }

  async clickTab(tabName: 'All' | 'Waived' | 'Low Supplement') {
    const tab = this.page.locator(`button:has-text("${tabName}")`).first();
    if (await tab.isVisible({ timeout: 2000 })) {
      await tab.click();
      await this.page.waitForLoadState('networkidle');
    }
  }
}

export class AlertsPage {
  readonly page: Page;
  readonly heroTitle: Locator;
  readonly emailInput: Locator;
  readonly sailingIdInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroTitle = page.locator('h1').first();
    this.emailInput = page.locator('input[type="email"], input[name="email"]').first();
    this.sailingIdInput = page.locator('input[name="sailingId"], input[placeholder*="sailing" i]').first();
    this.submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Set Alert")').first();
  }

  async goto() {
    await this.page.goto('/alerts');
    await this.page.waitForLoadState('networkidle', { timeout: 10000 });
  }

  async expectLoaded() {
    await expect(this.heroTitle).toBeVisible({ timeout: 10000 });
  }
}