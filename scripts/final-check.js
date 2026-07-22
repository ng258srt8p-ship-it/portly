const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
  
  await page.goto('http://localhost:3003/sailing/1049');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'test-results/final-screenshot.png', fullPage: true });
  console.log('Screenshot saved to test-results/final-screenshot.png');
  
  // Also dump raw HTML of the section
  const html = await page.$eval('[data-testid="enhanced-deal-analysis"]', el => el.innerHTML);
  console.log('=== RAW HTML (first 2000 chars) ===');
  console.log(html.substring(0, 2000));
  
  await browser.close();
})();
