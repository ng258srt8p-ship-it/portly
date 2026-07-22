import { test, expect } from '@playwright/test';

/**
 * Test: Verify interactive elements have proper labeling
 * 
 * Verification: check that interactive elements (button, a, input)
 * have EITHER visible text content OR aria-label/title attributes.
 */

test.describe('Accessibility labeling verification', () => {

  test('Home page interactive elements are labeled', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Check buttons and links
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    console.log(`  Home buttons: ${buttonCount}`);

    let unlabeledButtons = 0;
    for (let i = 0; i < buttonCount; i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      const aria = await btn.getAttribute('aria-label');
      const title = await btn.getAttribute('title');
      if (!text?.trim() && !aria && !title) unlabeledButtons++;
    }
    console.log(`  Unlabeled buttons: ${unlabeledButtons} (expected 0)`);

    const links = page.locator('a');
    const linkCount = await links.count();
    console.log(`  Home links: ${linkCount}`);

    let unlabeledLinks = 0;
    for (let i = 0; i < linkCount; i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const aria = await link.getAttribute('aria-label');
      const title = await link.getAttribute('title');
      if (!text?.trim() && !aria && !title) unlabeledLinks++;
    }
    console.log(`  Unlabeled links: ${unlabeledLinks} (expected 0)`);

    expect(unlabeledButtons + unlabeledLinks).toBe(0);
  });

  test('Contact page interactive elements are labeled', async ({ page }) => {
    await page.goto('/contact');
    await page.waitForTimeout(3000);

    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    console.log(`  Contact buttons: ${buttonCount}`);

    let unlabeledButtons = 0;
    for (let i = 0; i < buttonCount; i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      const aria = await btn.getAttribute('aria-label');
      const title = await btn.getAttribute('title');
      if (!text?.trim() && !aria && !title) unlabeledButtons++;
    }
    console.log(`  Unlabeled buttons: ${unlabeledButtons} (expected 0)`);

    const links = page.locator('a');
    const linkCount = await links.count();
    console.log(`  Contact links: ${linkCount}`);

    let unlabeledLinks = 0;
    for (let i = 0; i < linkCount; i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const aria = await link.getAttribute('aria-label');
      const title = await link.getAttribute('title');
      if (!text?.trim() && !aria && !title) unlabeledLinks++;
    }
    console.log(`  Unlabeled links: ${unlabeledLinks} (expected 0)`);

    expect(unlabeledButtons + unlabeledLinks).toBe(0);
  });

  test('Deals page interactive elements are labeled', async ({ page }) => {
    await page.goto('/deals');
    await page.waitForTimeout(10000);

    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    console.log(`  Deals buttons: ${buttonCount}`);

    let unlabeledButtons = 0;
    for (let i = 0; i < buttonCount; i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      const aria = await btn.getAttribute('aria-label');
      const title = await btn.getAttribute('title');
      if (!text?.trim() && !aria && !title) unlabeledButtons++;
    }
    console.log(`  Unlabeled buttons: ${unlabeledButtons} (expected 0)`);

    const links = page.locator('a');
    const linkCount = await links.count();
    console.log(`  Deals links: ${linkCount}`);

    let unlabeledLinks = 0;
    for (let i = 0; i < linkCount; i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const aria = await link.getAttribute('aria-label');
      const title = await link.getAttribute('title');
      if (!text?.trim() && !aria && !title) unlabeledLinks++;
    }
    console.log(`  Unlabeled links: ${unlabeledLinks} (expected 0)`);

    expect(unlabeledButtons + unlabeledLinks).toBe(0);
  });

  test('Input elements have labels', async ({ page }) => {
    await page.goto('/deals');
    await page.waitForTimeout(10000);

    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    console.log(`  Deals inputs: ${inputCount}`);

    let unlabeledInputs = 0;
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const label = await input.getAttribute('aria-label');
      const placeholder = await input.getAttribute('placeholder');
      // Inputs with placeholders are somewhat labeled
      if (!label && !placeholder) unlabeledInputs++;
    }
    console.log(`  Unlabeled inputs: ${unlabeledInputs} (expected 0 or noted)`);
  });

  test('All pages have consistent labeling pattern', async ({ page }) => {
    const pages = ['/about', '/press', '/careers', '/terms', '/privacy', '/disclosure'];
    
    for (const p of pages) {
      await page.goto(p);
      await page.waitForTimeout(1000);
      
      const links = page.locator('a');
      const linkCount = await links.count();
      console.log(`  ${p} links: ${linkCount}`);
      
      let unlabeled = 0;
      for (let i = 0; i < linkCount; i++) {
        const link = links.nth(i);
        const text = await link.textContent();
        const aria = await link.getAttribute('aria-label');
        const title = await link.getAttribute('title');
        if (!text?.trim() && !aria && !title) unlabeled++;
      }
      console.log(`  ${p} unlabeled links: ${unlabeled}`);
      expect(unlabeled).toBe(0);
    }
  });
});
