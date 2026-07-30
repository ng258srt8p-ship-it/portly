/**
 * Mobile subnav popover geometry audit.
 * Captures: outer pill container, details summary, expanded ul, viewport metrics.
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://0e005053.portly-1i0.pages.dev';

test('mobile subnav popover shape mismatch', async ({ page, request }) => {
  await page.setViewportSize({ width: 375, height: 812 });

  // Fetch a sailing ID directly
  const dealsResp = await request.get(`${BASE_URL}/api/deals?limit=1`);
  const deals = await dealsResp.json();
  const sailingId: string = deals[0]?.id ?? '';
  test.skip(!sailingId, 'no sailing ID available');

  await page.goto(`${BASE_URL}/sailing/${sailingId}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  // Force popover open
  const summary = page.locator('[data-sailing-subnav-popover] summary').first();
  await summary.click();
  await page.waitForTimeout(300);

  const measurementExpanded = await page.evaluate(() => {
    const wrap = document.querySelector('[data-testid="sailing-subnav"]') as HTMLElement | null;
    const inner = wrap?.querySelector(':scope > div.md\\:hidden') as HTMLElement | null;
    const innerCs = inner ? getComputedStyle(inner) : null;
    return {
      borderRadius: innerCs?.borderRadius,
      rect: inner?.getBoundingClientRect(),
    };
  });
  console.log('[EXPANDED]', JSON.stringify(measurementExpanded, null, 2));

  // Close it
  await summary.click();
  await page.waitForTimeout(300);

  const measurementCollapsed = await page.evaluate(() => {
    const wrap = document.querySelector('[data-testid="sailing-subnav"]') as HTMLElement | null;
    const inner = wrap?.querySelector(':scope > div.md\\:hidden') as HTMLElement | null;
    const innerCs = inner ? getComputedStyle(inner) : null;
    return {
      borderRadius: innerCs?.borderRadius,
      rect: inner?.getBoundingClientRect(),
    };
  });
  console.log('[COLLAPSED]', JSON.stringify(measurementCollapsed, null, 2));

  const measurement = await page.evaluate(() => {
    const wrap = document.querySelector('[data-testid="sailing-subnav"]') as HTMLElement | null;
    const inner = wrap?.querySelector(':scope > div.md\\:hidden') as HTMLElement | null;
    const summaryEl = inner?.querySelector('summary') as HTMLElement | null;
    const ulEl = inner?.querySelector('ul') as HTMLElement | null;
    const innerRect = inner?.getBoundingClientRect();
    const summaryRect = summaryEl?.getBoundingClientRect();
    const ulRect = ulEl?.getBoundingClientRect();
    const innerCs = inner ? getComputedStyle(inner) : null;

    return {
      inner: {
        outerHTML: inner?.outerHTML?.slice(0, 200),
        rect: innerRect,
        borderRadius: innerCs?.borderRadius,
        backgroundColor: innerCs?.backgroundColor,
        paddingTop: innerCs?.paddingTop,
        paddingBottom: innerCs?.paddingBottom,
        paddingLeft: innerCs?.paddingLeft,
        paddingRight: innerCs?.paddingRight,
        className: inner?.className,
      },
      summary: {
        rect: summaryRect,
        outerHTML: summaryEl?.outerHTML?.slice(0, 200),
      },
      ul: {
        rect: ulRect,
        outerHTML: ulEl?.outerHTML?.slice(0, 200),
        padding: ulEl ? getComputedStyle(ulEl).padding : null,
        gridTemplateColumns: ulEl ? getComputedStyle(ulEl).gridTemplateColumns : null,
        gap: ulEl ? getComputedStyle(ulEl).gap : null,
      },
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });

  console.log('[MOBILE POPOVER]', JSON.stringify(measurement, null, 2));

  // Take screenshot for visual
  await page.screenshot({ path: 'test-results/mobile-popover-expanded.png', fullPage: false });
});
