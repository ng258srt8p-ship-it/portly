/**
 * Focused audit: Sailing page subnav / hero overlap diagnostic.
 * Loads a real sailing detail page directly, measures positions,
 * detects sticky overlap, scrolls, captures evidence.
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://portly-1i0.pages.dev';
const SAILING_ID = process.env.SAILING_ID || 'carnival_horizon_2026-03-08_miami_6__big_31__v4m';

test.describe('SAILING PAGE — SUBNAV / HERO OVERLAP', () => {
  test('measures actual subnav vs hero geometry on /sailing/[id]', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const url = `${BASE}/sailing/${SAILING_ID}`;
    console.log(`\n\n[SAILING-AUDIT] Loading: ${url}\n`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2500);

    // Scroll to top first to take initial baseline
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    const initialMeasurement = await page.evaluate(() => {
      const header = document.querySelector('header') as HTMLElement | null;
      const subnav = document.querySelector('[data-testid="sailing-subnav"]') as HTMLElement | null;
      const hero = document.querySelector('section#overview') as HTMLElement | null;
      const main = document.querySelector('main') as HTMLElement | null;

      const headerRect = header?.getBoundingClientRect();
      const subnavRect = subnav?.getBoundingClientRect();
      const heroRect = hero?.getBoundingClientRect();
      const mainRect = main?.getBoundingClientRect();

      // CSS variable values for stacking context
      const root = document.documentElement;
      const cssVars = {
        headerHeight: getComputedStyle(root).getPropertyValue('--header-height').trim(),
        subnavHeight: getComputedStyle(root).getPropertyValue('--subnav-height').trim(),
      };

      return {
        header: headerRect ? { top: headerRect.top, bottom: headerRect.bottom, height: headerRect.height, zIndex: getComputedStyle(header).zIndex, position: getComputedStyle(header).position } : null,
        subnav: subnavRect ? { top: subnavRect.top, bottom: subnavRect.bottom, height: subnavRect.height, zIndex: getComputedStyle(subnav).zIndex, position: getComputedStyle(subnav).position, marginBottom: getComputedStyle(subnav).marginBottom } : null,
        hero: heroRect ? { top: heroRect.top, bottom: heroRect.bottom, height: heroRect.height, scrollMarginTop: getComputedStyle(hero).scrollMarginTop } : null,
        main: mainRect ? { top: mainRect.top, bottom: mainRect.bottom, paddingTop: getComputedStyle(main).paddingTop } : null,
        cssVars,
      };
    });

    console.log('\n[INITIAL — scrollY=0]');
    console.log(JSON.stringify(initialMeasurement, null, 2));

    // Calculate gap
    if (initialMeasurement.header && initialMeasurement.hero) {
      const gap = initialMeasurement.hero.top - initialMeasurement.header.bottom;
      console.log(`\n[INITIAL GAP] header.bottom=${initialMeasurement.header.bottom.toFixed(1)} hero.top=${initialMeasurement.hero.top.toFixed(1)} gap=${gap.toFixed(1)}px`);
    }

    // Now scroll down 800px — subnav should stick at top-[var(--header-height)]
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(700);

    const scrolledMeasurement = await page.evaluate(() => {
      const header = document.querySelector('header') as HTMLElement | null;
      const subnav = document.querySelector('[data-testid="sailing-subnav"]') as HTMLElement | null;
      const hero = document.querySelector('section#overview') as HTMLElement | null;
      const heroInner = document.querySelector('section#overview > div') as HTMLElement | null;

      const headerRect = header?.getBoundingClientRect();
      const subnavRect = subnav?.getBoundingClientRect();
      const heroRect = hero?.getBoundingClientRect();
      const heroInnerRect = heroInner?.getBoundingClientRect();

      return {
        scrollY: window.scrollY,
        header: headerRect ? { top: headerRect.top, bottom: headerRect.bottom, height: headerRect.height } : null,
        subnav: subnavRect ? { top: subnavRect.top, bottom: subnavRect.bottom, height: subnavRect.height } : null,
        hero: heroRect ? { top: heroRect.top, bottom: heroRect.bottom, height: heroRect.height } : null,
        heroInner: heroInnerRect ? { top: heroInnerRect.top, bottom: heroInnerRect.bottom, height: heroInnerRect.height } : null,
      };
    });

    console.log('\n[SCROLLED — scrollY=800]');
    console.log(JSON.stringify(scrolledMeasurement, null, 2));

    // Diagnostic — does the sticky subnav visually OVERLAP the hero when scrolled?
    if (scrolledMeasurement.subnav && scrolledMeasurement.heroInner) {
      const subnavBottom = scrolledMeasurement.subnav.bottom;
      const heroInnerTop = scrolledMeasurement.heroInner.top;
      const overlap = subnavBottom - heroInnerTop;
      console.log(`\n[OVERLAP CHECK] subnav.bottom=${subnavBottom.toFixed(1)}px heroInner.top=${heroInnerTop.toFixed(1)}px overlap=${overlap.toFixed(1)}px`);
      if (overlap > 0) {
        console.log(`\n[!!!] BUG CONFIRMED: subnav overlaps heroInner by ${overlap.toFixed(1)}px after scroll\n`);
      } else {
        console.log(`\n[OK] subnav sits above heroInner with ${(-overlap).toFixed(1)}px clearance\n`);
      }
    }

    // Screenshot evidence
    await page.screenshot({ path: 'test-results/sailing-subnav-overlap.png', fullPage: false });
    console.log(`\n[SCREENSHOT] test-results/sailing-subnav-overlap.png\n`);

    // Assertions: on initial load, hero.top must be >= header.bottom (no overlap)
    expect(initialMeasurement.hero).not.toBeNull();
    if (initialMeasurement.header && initialMeasurement.hero) {
      expect(initialMeasurement.hero.top).toBeGreaterThanOrEqual(initialMeasurement.header.bottom - 4);
    }
  });
});
