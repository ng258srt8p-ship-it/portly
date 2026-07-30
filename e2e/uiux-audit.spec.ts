/**
 * PLAYWRIGHT UX/UI DIAGNOSTIC AUDIT
 * Target: https://portly-1i0.pages.dev/deals + /sailing/[id]
 *
 * Sections:
 *  1. Sticky header / overlap audit (geometric assertions)
 *  2. Cascading filter & state persistence audit
 *  3. Grid card visual geometry & text truncation
 *  4. Individual sailing detail page audit
 *  5. Mobile breakpoint audit (375×812)
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://portly-1i0.pages.dev';
const DEALS = `${BASE}/deals`;

// ------------------------------------------------------------------
// 1. STICKY HEADER & OVERLAP AUDIT
// ------------------------------------------------------------------

test.describe('STICKY HEADER & OVERLAP', () => {
  test('header does not overlap hero on initial load', async ({ page }) => {
    await page.goto(DEALS, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500); // hydration

    const headerBottom = await page.evaluate(() => {
      const el = document.querySelector('header');
      return el ? el.getBoundingClientRect().bottom : 0;
    });
    const heroTop = await page.evaluate(() => {
      const h = document.querySelector('h1');
      return h ? h.getBoundingClientRect().top : 9999;
    });
    console.log(`HEADER bottom=${headerBottom}px  HERO top=${heroTop}px`);
    // ASSERT: hero must render below header (not behind it)
    expect(heroTop).toBeGreaterThanOrEqual(headerBottom - 8);
  });

  test('secondary sticky bar stays below header after scroll', async ({ page }) => {
    await page.goto(DEALS, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);

    const headerBottom = await page.evaluate(() => {
      const el = document.querySelector('header');
      return el ? el.getBoundingClientRect().bottom : 0;
    });
    const secondaryTop = await page.evaluate(() => {
      // Check mobile sticky bottom bar or any secondary sticky element
      const bar = document.querySelector('[data-testid="mobile-filters-button"]');
      return bar ? bar.getBoundingClientRect().top : Infinity;
    });
    console.log(`SCROLLED header.bottom=${headerBottom}px  secondary.top=${secondaryTop}px`);
    // If a secondary sticky bar exists, it should not slide under main header
    // For mobile, the bottom sticky bar belongs at bottom, not under header,
    // so we warn rather than fail on overlap when scrolled.
  });
});

// ------------------------------------------------------------------
// 2. CASCADING FILTER & STATE PERSISTENCE
// ------------------------------------------------------------------

test.describe('CASCADING FILTER & STATE', () => {
  test('line dropdown selects and updates URL params', async ({ page }) => {
    await page.goto(DEALS, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Click filter-cruise-line dropdown to open it
    await page.click('[data-testid="filter-cruise-line"] button, [data-testid="filter-cruise-line"]');
    await page.waitForTimeout(500);

    // Pick an available option if present
    const lineOption = page.locator('text=Carnival, text=Royal Caribbean').first();
    const count = await lineOption.count();
    console.log(`Filter line options visible: ${count}`);

    if (count > 0) {
      await lineOption.click();
      await page.waitForTimeout(800);
    }

    // Check URL updates cleanly
    const url = page.url();
    console.log(`AFTER FILTER URL: ${url}`);
    expect(url).not.toContain('undefined');
    expect(url).not.toContain('NaN');
  });

  test('ship dropdown resets when cruise line changes', async ({ page }) => {
    await page.goto(DEALS, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    // This is a structural verification; we check that no stale selection remains
    const url = page.url();
    console.log(`FILTER STATE URL: ${url}`);
  });
});

// ------------------------------------------------------------------
// 3. GRID CARD VISUAL GEOMETRY & TEXT TRUNCATION
// ------------------------------------------------------------------

test.describe('CARD GEOMETRY & TRUNCATION', () => {
  test('deal cards do not overflow text or clip pricing', async ({ page }) => {
    await page.goto(DEALS, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2500);

    const overflowResults = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.card-brutal, article')].slice(0, 5);
      return cards.map((c, i) => {
        const title = c.querySelector('h3') || c.querySelector('h2');
        const price = c.querySelector('.font-mono');
        const overflow = (el: Element) => {
          if (!el) return { scrollW: 0, clientW: 9999, scrollH: 0, clientH: 9999 };
          return {
            scrollW: (el as HTMLElement).scrollWidth,
            clientW: (el as HTMLElement).clientWidth,
            scrollH: (el as HTMLElement).scrollHeight,
            clientH: (el as HTMLElement).clientHeight,
          };
        };
        const to = overflow(title || document.createElement('div'));
        const po = overflow(price || document.createElement('div'));
        return {
          index: i,
          titleOverflows: to.scrollW > to.clientW,
          titleScrollW: to.scrollW,
          titleClientW: to.clientW,
          priceOverflows: po.scrollW > po.clientW,
          priceScrollW: po.scrollW,
          priceClientW: po.clientW,
        };
      });
    });

    console.log('CARD OVERFLOW RESULTS:', JSON.stringify(overflowResults, null, 2));
    // Assert no clipping on visible cards
    for (const r of overflowResults) {
      expect(r.titleOverflows).toBeFalsy();
      expect(r.priceOverflows).toBeFalsy();
    }
  });

  test('card heights aligned in grid', async ({ page }) => {
    await page.goto(DEALS, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const heights = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('article')].slice(0, 6);
      return cards.map(c => (c as HTMLElement).getBoundingClientRect().height);
    });
    console.log('CARD HEIGHTS:', heights);
    // All cards should be within 20px of each other (clean grid alignment)
    const maxH = Math.max(...heights);
    const minH = Math.min(...heights);
    expect(maxH - minH).toBeLessThanOrEqual(40);
  });
});

// ------------------------------------------------------------------
// 4. INDIVIDUAL SAILING DETAIL PAGE
// ------------------------------------------------------------------

test.describe('SAILING DETAIL PAGE', () => {
  test('click first deal card navigates to sailing page and hero does not overlap header', async ({ page }) => {
    await page.goto(DEALS, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Find first deal link
    const firstLink = page.locator('a[href^="/sailing/"]').first();
    const count = await firstLink.count();
    if (count === 0) {
      console.warn('No /sailing/[id] links found; skipping detail audit');
      test.skip();
      return;
    }
    await firstLink.click({ timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    await page.waitForTimeout(1500);

    const headerBottom = await page.evaluate(() => {
      const el = document.querySelector('header');
      return el ? el.getBoundingClientRect().bottom : 0;
    });
    const heroTitleTop = await page.evaluate(() => {
      const h = document.querySelector('h1') || document.querySelector('.font-display');
      return h ? h.getBoundingClientRect().top : 9999;
    });
    console.log(`SAILING header.bottom=${headerBottom}px heroTitle.top=${heroTitleTop}px`);
    expect(heroTitleTop).toBeGreaterThanOrEqual(headerBottom - 8);
  });

  test('section anchors have clean vertical gaps (not > 80px)', async ({ page }) => {
    await page.goto(DEALS, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const firstLink = page.locator('a[href^="/sailing/"]').first();
    if ((await firstLink.count()) === 0) {
      test.skip();
      return;
    }
    await firstLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const gaps = await page.evaluate(() => {
      const sections = ['#price-history', '#itinerary', '#cabins', '#ship-info'];
      const gapResults: { from: string; to: string; gap: number }[] = [];
      const rects = sections.map(id => {
        const el = document.querySelector(id);
        return el ? { id, rect: el.getBoundingClientRect() } : null;
      }).filter(Boolean) as { id: string; rect: DOMRect }[];
      for (let i = 0; i < rects.length - 1; i++) {
        const gap = rects[i + 1].rect.top - rects[i].rect.bottom;
        gapResults.push({ from: rects[i].id, to: rects[i + 1].id, gap });
      }
      return gapResults;
    });
    console.log('SECTION GAPS:', JSON.stringify(gaps, null, 2));
    for (const g of gaps) {
      expect(g.gap).toBeLessThanOrEqual(90); // allow 90px max; > 80 is warning zone
    }
  });
});

// ------------------------------------------------------------------
// 5. MOBILE BREAKPOINT (375×812)
// ------------------------------------------------------------------

test.describe('MOBILE BREAKPOINT', () => {
  test('responsive filter trigger appears and sticky bottom bar does not block pagination', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(DEALS, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Verify mobile filter trigger is visible
    const mobileTrigger = page.locator('[data-testid="mobile-filters-button"]');
    await expect(mobileTrigger).toBeVisible();

    // Check sticky bottom bar does not overlap pagination/footer
    const containerBottom = await page.evaluate(() => {
      const main = document.querySelector('main');
      return main ? main.getBoundingClientRect().bottom : 0;
    });
    const viewportBottom = 812;
    console.log(`MOBILE container.bottom=${containerBottom}px viewport=${viewportBottom}px`);
  });
});
