const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  await page.goto('http://localhost:3003/sailing/1049');
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'test-results/screenshot-deal-analysis.png', fullPage: true });
  console.log('Screenshot saved');
  
  const section = await page.$('[data-testid="enhanced-deal-analysis"]');
  if (section) {
    const text = await section.innerText();
    console.log('=== SECTION CONTENT (first 2000 chars) ===');
    console.log(text.substring(0, 2000));
    console.log('=== END ===');
    
    const hasScore = text.includes('Deal Score') || text.includes('74');
    const hasVerdict = text.includes('Strong buy') || text.includes('Buy Now') || text.includes('Verdict');
    const hasHiddenCost = text.includes('Gratuities') || text.includes('$1,460') || text.includes('Hidden Cost');
    const hasCabin = text.includes('Suite') || text.includes('Balcony') || text.includes('Cabin Value');
    const hasPricing = text.includes('Pricing Deep') || text.includes('pricing');
    const hasTips = text.includes('Insider Tips') || text.includes('Insider Tip');
    const hasJsonDump = text.includes('{{"') || text.includes('"justification":{"') || text.includes('"dealScore":');
    
    console.log('Score:', hasScore);
    console.log('Verdict:', hasVerdict);
    console.log('Hidden Costs:', hasHiddenCost);
    console.log('Cabin Value:', hasCabin);
    console.log('Pricing Deep:', hasPricing);
    console.log('Insider Tips:', hasTips);
    console.log('Raw JSON dump:', hasJsonDump);
    
    const lines = text.split('\n');
    console.log('Line count:', lines.length);
    
    const longStrings = text.match(/\S{80,}/g) || [];
    console.log('Long strings:', longStrings.length);
    if (longStrings.length > 0) console.log('Sample:', longStrings[0].substring(0, 200));
  } else {
    console.log('NO section found');
    const bodyText = await page.$eval('body', el => el.innerText);
    console.log('Body text (first 2000):');
    console.log(bodyText.substring(0, 2000));
  }
  
  await browser.close();
})();
