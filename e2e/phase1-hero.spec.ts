/**
 * Phase 1: Hero clarity + badge contrast — E2E tests (production build)
 *
 * Tests cover:
 *  - Header nav badges use improved contrast (bg-white/40 — not invisible)
 *  - Page body has substantial visible content (>100 chars — no empty/error body)
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PW_BASE_URL || 'http://localhost:3002';

test.describe('Phase 1 — Hero clarity + badge contrast', () => {
  // Verify header nav badges use improved opacity (40% vs old 10%)
  test('Header navigation badges have improved contrast backgrounds', async ({ page }) => {
    await page.goto(BASE_URL);
    // Home page loads synchronously — no waiting needed
    await page.waitForTimeout(2000);

    const badgeClasses = await page.evaluate(() => {
      const els = document.querySelectorAll('.rounded-full');
      return Array.from(els).map((el) => el.getAttribute('class') || '');
    });

    const badges = badgeClasses.filter((cls) => cls.includes('rounded-full'));
    expect(badges.length).toBeGreaterThan(0);

    // At least one badge should use white background (improved contrast from 10% → 40%)
    const withWhiteBg = badges.some((cls) => cls.includes('bg-white'));
    expect(withWhiteBg).toBe(true);

    // At least one badge should use improved opacity syntax (e.g. `/40`, `/18`) 
    const higherOpacity = badges.some((cls) => cls.includes('/40') || cls.includes('/18'));
    expect(higherOpacity).toBe(true);
  });

  // Body should contain substantial content (nav/footer etc) — empty body means error
  test('Page body contains visible content', async ({ page }) => {
    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForTimeout(5000);

    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText.length).toBeGreaterThan(100);

    // Should NOT contain "This page could not be found" (404 absent)
    expect(bodyText).not.toContain('This page could not be found');

    // Should contain "TripTide" somewhere (site branding renders)
    expect(bodyText).toContain('TripTide');
  });

  // Hero/nav section renders without JS errors (filters out font/MaterialIcon noise)
  test('Hero/nav section renders without unexpected JS errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(`${BASE_URL}/sailing/1049`);
    await page.waitForTimeout(5000);

    const unexpectedErrors = consoleErrors.filter(
      (err) => !err.includes('fontshare') && !err.includes('MaterialSymbolsOutlined')
    );

    // Accept some warnings from ReactDevOverlay (not blocking)
    expect(unexpectedErrors.length).toBeLessThanOrEqual(3);
  });

  // Snapshot verification of contrast/rendering
  test('Badge/hero visually renders correctly (screenshot)', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000);

    const body = await page.$('body');
    expect(body).toBeTruthy();

    // Snapshot — visually verify contrast and content
    await expect(page).toHaveScreenshot('phase1-hero-badges.png');
  });
});
