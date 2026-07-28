const { test } = require('@playwright/test');

test('debug buttons', async ({ page }) => {
  await page.goto('/deals');
  await page.waitForTimeout(5000);
  const buttons = page.locator('button');
  const count = await buttons.count();
  console.log(`Total buttons: ${count}`);
  for (let i = 0; i < count; i++) {
    const btn = buttons.nth(i);
    const text = await btn.textContent();
    console.log(`Button ${i}: '${text}'`);
  }
});