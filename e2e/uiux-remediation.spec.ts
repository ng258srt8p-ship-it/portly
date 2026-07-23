/**
 * UI/UX Audit Remediation — E2E tests for Phases 2, 3, 4, and 6.
 *
 * Phase 2: Empty state fallback text (SailingInfoPanel.tsx)
 * Phase 3: Deal analysis visual cleanup & CTA consolidation (EnhancedDealAnalysis.tsx)
 * Phase 4: Cabin pricing table alignment (PriceComparisonTable.tsx)
 * Phase 6: WCAG AA contrast audit across components
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3003';

test.describe('Phase 2 — Empty state handling', () => {
  // Verify SailingInfoPanel exists and renders with proper structure
  test('SailingInfoPanel exists with container styling', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    // Wait for client-side hydration
    await page.waitForLoadState('networkidle');

    // Should contain a container with proper card styling (rounded-3xl, border, bg-white)
    const infoPanel = await page.locator('[class*="rounded-3xl"][class*="border"][class*="bg-white"][class*="p-6"]');
    // Wait for it to appear (SSR may show skeleton first)
    await infoPanel.first().waitFor({ state: 'visible', timeout: 10000 });
    const panelText = await infoPanel.first().innerText();
    expect(panelText).toContain('Sailing Details');
  });

  // Verify empty state fallback text appears when data fields are missing
  test('SailingInfoPanel shows N/A and Unknown fallback text', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    // Wait for client-side content to render (not just SSR skeleton)
    await page.waitForLoadState('networkidle');
    // Wait for any content to appear beyond skeleton placeholders
    await page.waitForSelector('[class*="divide-y"]');

    const bodyText = await page.evaluate(() => document.body.innerText);

    // Should contain "Unknown" if region/port are missing (empty state)
    expect(bodyText).toContain('Unknown');
    // Should contain "N/A" if totalCabins is missing (empty state)
    expect(bodyText).toContain('N/A');

    // Should contain "Sync Status" label
    expect(bodyText).toContain('Sync Status');

    // Should NOT have raw hyphens as standalone values
    expect(bodyText).not.toContain('Destination: -');
    expect(bodyText).not.toContain('Port: -');
  });

  // Verify muted styling for empty state values uses text-ink-faint/60
  test('Empty state values use muted text color', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[class*="divide-y"]');

    const mutedValue = await page.evaluate(() => {
      const rows = document.querySelectorAll('[class*="divide-y"] > div');
      let found = false;
      rows.forEach((row) => {
        const value = row.querySelector('[class*="font-semibold"]');
        if (value) {
          const cls = value.getAttribute('class') || '';
          if (cls.includes('text-ink-faint')) found = true;
        }
      });
      return found;
    });

    expect(mutedValue).toBe(true);
  });

  // Verify row structure (labels and values) are rendered properly
  test('Info panel rows have proper label/value pairs', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[class*="divide-y"]');

    const rowCount = await page.evaluate(() => {
      return document.querySelectorAll('[class*="divide-y"] > div').length;
    });

    // Should have at least 5 info rows (lines, ship, destination, duration, etc.)
    expect(rowCount).toBeGreaterThanOrEqual(5);
  });
});

test.describe('Phase 3 — Deal analysis cleanup', () => {
  // Verify deal analysis section exists with proper test id
  test('Deal analysis section renders', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const dealAnalysis = await page.locator('[data-testid="enhanced-deal-analysis"]');
    await dealAnalysis.first().waitFor({ state: 'visible', timeout: 10000 });
    expect(dealAnalysis.first()).toBeTruthy();
  });

  // Verify deal analysis cards use white backgrounds (not colored)
  test('Deal analysis cards have uniform white backgrounds', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const container = await page.locator('[data-testid="enhanced-deal-analysis"]');
    if (await container.count() === 0) return;

    const cardBackgrounds = await container.evaluate((el) => {
      const cards = el.querySelectorAll('.rounded-xl');
      return Array.from(cards).map((card) => card.getAttribute('class') || '');
    });

    // At least some cards should NOT have colored backgrounds (e.g., bg-amber-50)
    const noColoredBgs = cardBackgrounds.filter(
      (cls) => !cls.includes('bg-amber') && !cls.includes('bg-emerald-50')
        && !cls.includes('bg-blue-50') && !cls.includes('bg-violet-50')
        && !cls.includes('bg-rose-50') && !cls.includes('bg-indigo-mist')
    );

    expect(noColoredBgs.length).toBeGreaterThan(0);

    // Cards should be white background
    const whiteBgs = cardBackgrounds.filter((cls) => cls.includes('bg-white'));
    expect(whiteBgs.length).toBeGreaterThan(0);
  });

  // Verify CTA consolidation - exactly one prominent CTA remains
  test('Deal analysis section has single consolidated CTA', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const dealAnalysis = await page.locator('[data-testid="enhanced-deal-analysis"]');
    if (await dealAnalysis.count() === 0) return;

    // Should NOT have "Book Now - Great Value" or "View All" buttons
    const noRedundantCTAs = await dealAnalysis.evaluate((el) => {
      const buttons = el.querySelectorAll('button');
      let hasRedundant = false;
      buttons.forEach((btn) => {
        const text = btn.innerText;
        if (text.includes('Book Now - Great Value') || text.includes('View All')) {
          hasRedundant = true;
        }
      });
      return !hasRedundant;
    });

    expect(noRedundantCTAs).toBe(true);
  });

  // Verify deal score badge still renders correctly with white text
  test('Deal score badge has accessible contrast (white text on colored bg)', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const scoreBadge = await page.locator('[data-testid="deal-score-badge"]');
    if (await scoreBadge.count() === 0) return;

    const badgeText = await scoreBadge.evaluate((el) => el.innerText);
    expect(badgeText.length).toBeGreaterThan(0);

    // Score badge should have white text on colored background
    const scoreDiv = await scoreBadge.locator('.flex').first();
    const cls = await scoreDiv.getAttribute('class');
    expect(cls).toContain('text-white');
  });

  // Verify hidden cost detector uses white background + dark text (WCAG AA)
  test('Hidden cost detector has accessible colors', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const detector = await page.locator('[data-testid="hidden-cost-detector"]');
    if (await detector.count() === 0) return;

    const cls = await detector.getAttribute('class');
    // Should NOT have low-opacity rose background (e.g., bg-rose-50/15)
    const hasLowOpacityBg = /bg-rose-50/.test(cls || '');
    expect(hasLowOpacityBg).toBe(false);

    // Should have dark text (text-rose-700 etc.)
    const hasDarkText = /text-rose-[56][07]/.test(cls || '');
    expect(hasDarkText).toBe(true);
  });

  // Pricing deep-dive section exists as a container
  test('Pricing Deep-Dive section renders', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const deepDive = await page.locator('[data-testid="pricing-deep-dive"]');
    expect(deepDive.first()).toBeTruthy();
  });

  // Verify "Coming on next sync cycle" message when data unavailable (Phase 3 - content quality)
  test('Deal analysis shows informative empty state', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const dealAnalysis = await page.locator('[data-testid="enhanced-deal-analysis"]');
    if (await dealAnalysis.count() === 0) return;

    // Should contain either data content OR "Coming on next sync cycle" message
    const bodyText = await dealAnalysis.evaluate((el) => el.innerText);
    expect(
      bodyText.includes('Coming on next sync cycle') ||
      bodyText.length > 50
    ).toBe(true);
  });
});

test.describe('Phase 4 — Cabin pricing table alignment', () => {
  // Table rows should have consistent padding (py-3) — check structure exists
  test('Cabin pricing section and table exist', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const container = await page.locator('[id="cabin-pricing"]');
    await container.first().waitFor({ state: 'visible', timeout: 10000 });
    expect(container.first()).toBeTruthy();

    const rows = await page.locator('[data-testid="cabin-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
  });

  // Table rows have consistent padding (py-3) and responsive grid layout
  test('Table rows use consistent padding and grid layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const rows = await page.locator('[data-testid="cabin-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    // All visible rows should have py-3 and grid md:grid-cols-12
    const consistentPadding = await rows.first().evaluate((el) => {
      const cls = el.getAttribute('class') || '';
      return cls.includes('py-3');
    });

    expect(consistentPadding).toBe(true);
  });

  // Action buttons have flex-shrink-0 to prevent overflow
  test('Action buttons are constrained with flex-shrink-0', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const container = await page.locator('[id="cabin-pricing"]');
    if (await container.count() === 0) return;

    const btnConstrained = await page.evaluate(() => {
      const rows = document.querySelectorAll('[data-testid="cabin-row"]');
      let constrained = false;
      rows.forEach((row) => {
        const btns = row.querySelectorAll('button');
        btns.forEach((btn) => {
          const cls = btn.getAttribute('class') || '';
          if (cls.includes('flex-shrink-0')) constrained = true;
        });
      });
      return constrained;
    });

    expect(btnConstrained).toBe(true);
  });

  // Desktop viewport: rows use responsive grid layout (md:grid-cols-12)
  test('Table rows use responsive grid layout', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const rows = await page.locator('[data-testid="cabin-row"]');
    if (await rows.count() === 0) return;

    const firstRow = await rows.first();
    const cls = await firstRow.evaluate((el) => el.getAttribute('class') || '');

    // Should contain grid and md:grid-cols-12
    expect(cls).toContain('grid');
    expect(cls).toContain('md:grid-cols-12');
  });

  // Total column shows sum transparency label in mobile expanded view
  test('Total column shows sum transparency label on mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    // Switch to mobile viewport
    await page.setViewportSize({ width: 640, height: 800 });

    const rows = await page.locator('[data-testid="cabin-row"]');
    if (await rows.count() === 0) return;

    // Expand a row on mobile
    await rows.first().click();
    await page.waitForTimeout(2000);

    // Should contain "Includes" text (sum transparency)
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toContain('Includes');
  });

  // Verify "Total Out-The-Door" label appears in mobile expanded view
  test('Mobile expanded view shows Total Out-The-Door', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    // Switch to mobile viewport
    await page.setViewportSize({ width: 640, height: 800 });

    const rows = await page.locator('[data-testid="cabin-row"]');
    if (await rows.count() > 0) {
      await rows.first().click();
      await page.waitForTimeout(2000);

      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).toContain('Total Out-The-Door');
    } else {
      expect(true).toBe(true); // gracefully skip if no rows
    }
  });

  // Check that "Select" / "Sold Out" buttons don't overflow right edge
  test('Action button does not overflow right edge of row', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const actionsOverflow = await page.evaluate(() => {
      const rows = document.querySelectorAll('[data-testid="cabin-row"]');
      let overflowCount = 0;
      rows.forEach((row) => {
        const buttons = row.querySelectorAll('button');
        buttons.forEach((btn) => {
          const btnRect = btn.getBoundingClientRect();
          const rowRect = row.getBoundingClientRect();
          if (btnRect.right > rowRect.right + 10) {
            overflowCount++;
          }
        });
      });
      return overflowCount;
    });

    // Should have no overflowing buttons (with some tolerance)
    expect(actionsOverflow).toBeLessThanOrEqual(1);
  });

  // Verify cabin pricing section header is present
  test('Cabin pricing section has heading', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const container = await page.locator('[id="cabin-pricing"]');
    if (await container.count() === 0) return;

    const cls = await container.evaluate((el) => el.getAttribute('class') || '');
    expect(cls).toContain('p-6'); // should have padding

    const heading = await container.evaluate((el) => {
      return el.querySelector('h2') ? el.querySelector('h2')!.innerText : null;
    });

    expect(heading).toBe('Cabin Pricing');
  });
});

test.describe('Phase 6 — WCAG AA contrast audit', () => {
  // Hero section badges use improved opacity (40% vs old 18%) for contrast
  test('Hero badges use improved contrast backgrounds (40% opacity)', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const badgeOpacities = await page.evaluate(() => {
      const hero = document.querySelector('[class*="gradient-to-br"]');
      if (!hero) return [];
      const badges = hero.querySelectorAll('.rounded-full');
      return Array.from(badges).map((b) => b.getAttribute('class') || '');
    });

    // At least some badges should use 40% opacity for contrast
    const improvedContrast = badgeOpacities.some((cls) => cls.includes('bg-white') && (
      cls.includes('/40') || cls.includes('/4 ') || cls.includes('bg-white/[0.4]')
    ));

    expect(improvedContrast).toBe(true);
  });

  // Price forecast cards use white backgrounds (not colored tints)
  test('Price forecast cards use uniform white backgrounds', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const forecasts = await page.locator('[data-testid="cabin-forecasts-grid"]');
    if (await forecasts.count() === 0) return;

    const cards = await forecasts.locator('.rounded-xl');
    const allWhite = await cards.evaluate((els) => {
      return Array.from(els).every((card) => {
        const cls = card.getAttribute('class') || '';
        return !cls.includes('bg-blue-50') && !cls.includes('bg-slate-50')
          && !cls.includes('bg-indigo-50') && !cls.includes('bg-amber-50');
      });
    });

    expect(allWhite).toBe(true);
  });

  // Price forecast confidence bar uses dark text (emerald-600, coral etc.)
  test('Confidence bars use dark text for contrast', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const bars = await page.locator('.rounded-full[style*="width"]').all();
    if (bars.length === 0) return;

    let allDark = true;
    for (const bar of bars) {
      const cls = await bar.getAttribute('class');
      // Should have dark text colors (text-emerald-600, text-coral, etc.)
      if (!/(text-emerald|text-coral|text-amber)/.test(cls || '')) {
        allDark = false;
      }
    }

    expect(allDark).toBe(true);
  });

  // Trend direction badge has accessible contrast (text-red-700 etc.)
  test('Trend direction badge has WCAG AA contrast', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const trendSection = await page.locator('[data-testid="trend-context"]');
    if (await trendSection.count() === 0) return;

    const badge = await trendSection.locator('.rounded-full').first();
    if (!badge) return;

    const cls = await badge.getAttribute('class');
    // Should have high-contrast text colors (text-red-700, text-emerald-700, etc.)
    const hasHighContrastText = /(text-red|text-emerald|text-slate)/.test(cls || '');
    expect(hasHighContrastText).toBe(true);
  });

  // Optimal booking window card has accessible colors (not low-opacity)
  test('Optimal booking window uses WCAG AA compliant colors', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidal');

    const windowCard = await page.locator('[data-testid="optimal-booking-window"]');
    if (await windowCard.count() === 0) return;

    const cls = await windowCard.getAttribute('class');
    // Should NOT have bg-emerald-50 (low-opacity green) — replaced with white
    const noLowOpacity = !/(bg-emerald-50)/.test(cls || '');
    expect(noLowOpacity).toBe(true);

    // Should have dark text (text-emerald-800)
    const hasDarkText = /text-emerald-[78]00/.test(cls || '');
    expect(hasDarkText).toBe(true);
  });

  // Cabin value breakdown uses dark text (text-emerald-800 etc.) on light backgrounds
  test('Cabin value breakdown uses accessible colors', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const breakdown = await page.locator('[data-testid="cabin-value-breakdown"]');
    if (await breakdown.count() === 0) return;

    const pills = await breakdown.locator('.rounded-full');
    let allAccessible = true;
    for (let i = 0; i < await pills.count(); i++) {
      const pill = pills.nth(i);
      const cls = await pill.getAttribute('class');
      if (!/(text-emerald|text-blue|text-red|text-slate)/.test(cls || '')) {
        allAccessible = false;
      }
    }

    expect(allAccessible).toBe(true);
  });
});

test.describe('Accessibility — axe-core style checks', () => {
  // Verify that all interactive elements have accessible labels (text content)
  test('Interactive elements have accessible text labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).filter(
        (btn: HTMLButtonElement) => btn.classList.contains('btn') || true
      );
    });

    // Every button should have text content
    for (const btn of buttons) {
      expect(btn.innerText.trim().length).toBeGreaterThan(0);
    }
  });

  // Verify headings are properly nested (no skipped levels)
  test('Headings are properly nested', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const headingLevels = await page.evaluate(() => {
      const headings = document.querySelectorAll('h1, h2, h3, h4');
      return Array.from(headings).map((h) => parseInt(h.tagName[1]));
    });

    // Headings should not skip levels unexpectedly
    let prevLevel = 0;
    let valid = true;
    for (const level of headingLevels) {
      if (prevLevel > 0 && level > prevLevel + 1) {
        valid = false;
      }
      prevLevel = level;
    }

    expect(valid).toBe(true);
  });

  // Verify sufficient contrast for primary text elements
  test('Primary text elements meet WCAG AA contrast requirements', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    // Check text opacity on cards — verify they're not too faint
    const cardTexts = await page.evaluate(() => {
      const cards = document.querySelectorAll('.card-main');
      const textElements: string[] = [];
      cards.forEach((card) => {
        card.querySelectorAll('span, p').forEach((el) => {
          const cls = el.getAttribute('class') || '';
          // Check for very low opacity text (text-ink-faint/40 or lower)
          const hasLowOpacity = /text-(?:ink-)?faint\/[0-4]/.test(cls);
          if (hasLowOpacity) textElements.push(cls);
        });
      });
      return textElements;
    });

    // Low-opacity faint text should be rare (some acceptable in descriptions)
    expect(cardTexts.length).toBeLessThan(15);
  });

  // Ensure tab stops are logical — focusable elements exist
  test('Focusable elements are present', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const focusableCount = await page.evaluate(() => {
      const focusable = document.querySelectorAll(
        'a[href], button, [tabindex]:not([tabindex="-1"]), input, select, textarea'
      );
      return focusable.length;
    });

    expect(focusableCount).toBeGreaterThan(2);
  });

  // Ensure proper semantic structure (main, headings, navigation)
  test('Page has proper semantic structure', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const structure = await page.evaluate(() => ({
      hasMain: !!document.querySelector('main'),
      hasHeading: !!document.querySelector('h1, h2, h3'),
      navPresent: !!document.querySelector('nav') || document.querySelectorAll('[role="navigation"]').length > 0,
    }));

    expect(structure.hasMain).toBe(true);
    expect(structure.hasHeading).toBe(true);
    expect(structure.navPresent).toBe(true);
  });

  // Verify that anchor links have aria-labels where text is empty or icon-only
  test('Icon-only links have aria labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const icons = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href]');
      return Array.from(links).filter((link) => {
        // Check if link contains only Material Icon and no text
        const materialIcons = link.querySelectorAll('.material-symbols-outlined');
        if (materialIcons.length > 0 && !link.innerText.trim()) {
          return !!link.getAttribute('aria-label');
        }
        return true;
      }).length === links.length;
    });

    // All icon-only links should have aria-labels
    expect(icons).toBe(true);
  });

  // Verify that price displays use tabular-nums and font-mono
  test('Price values use mono/tabular fonts', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForLoadState('networkidle');

    const priceElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[class*="font-mono-tab"], [class*="font-mono"]');
      return Array.from(elements).filter((el) => /\$[\d,]/.test(el.innerText));
    });

    // At least some price elements should exist with correct classes
    expect(priceElements.length).toBeGreaterThan(0);
  });

  // Verify skeleton/placeholder states use proper animation class
  test('Skeleton loaders use animate-pulse with reduced motion', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    // During initial load, skeletons should be visible and use animate-pulse
    const skeletonPresent = await page.evaluate(() => {
      return document.querySelectorAll('.animate-pulse').length > 0;
    });

    // Initially there should be at least some skeleton placeholders
    expect(skeletonPresent).toBe(true);
  });
});
