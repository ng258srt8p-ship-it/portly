const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  
  await page.goto('http://localhost:3003/sailing/1049');
  await page.waitForTimeout(3000);
  
  // Screenshot
  await page.screenshot({ path: 'test-results/screenshot-deal-analysis.png', fullPage: true });
  console.log('Screenshot saved');
  
  // Check for enhanced analysis section
  const section = await page.$('[data-testid="enhanced-deal-analysis"]');
  if (section) {
    const text = await section.innerText();
    console.log('=== SECTION CONTENT ===');
    console.log(text.substring(0, 1500));
    console.log('======================');
    
    const hasScore = text.includes('Deal Score') || text.includes('74');
    const hasVerdict = text.includes('Strong buy') || text.includes('Buy Now') || text.includes('Verdict');
    const hasHiddenCost = text.includes('Gratuities') || text.includes('$1,460') || text.includes('Hidden Cost');
    const hasCabin = text.includes('Suite') || text.includes('Balcony') || text.includes('Cabin Value');
    const hasPricing = text.includes('Pricing Deep') || text.includes('pricing');
    const hasTips = text.includes('Insider Tips') || text.includes('Insider Tip') || text.includes('tips');
    
    console.log('Has Deal Score:', hasScore);
    console.log('Has Verdict:', hasVerdict);
    console.log('Has Hidden Costs:', hasHiddenCost);
    console.log('Has Cabin Value:', hasCabin);
    console.log('Has Pricing Deep Dive:', hasPricing);
    console.log('Has Insider Tips:', hasTips);
    
    // Check if JSON dump (raw)
    const hasJsonDump = text.includes('{{"') || text.includes('"justification":{"') || text.includes('"dealScore":');
    console.log('Contains raw JSON dump:', hasJsonDump);
    
    // Check for unformatted text (long unbroken string)
    const longStrings = text.match(/\S{100,}/g) || [];
    console.log('Long strings (>100 chars):', longStrings.length);
    if (longStrings.length > 0) {
      console.log('Sample long string:', longStrings[0].substring(0, 200));
    }
  } else {
    console.log('NO ENHANCED DEAL ANALYSIS SECTION FOUND');
    
    // Check what IS on the page
    const all = await page.$$('div, section, article');
    console.log(`Found ${all.length} elements`);
    
    // Check enhanced text anywhere
    const bodyText = await page.$eval('body', el => el.innerText);
    console.log('=== BODY TEXT (first 1500) ===');
    console.log(bodyText.substring(0, 1500));
    console.log('======================');
  }
  
  await browser.close();
})();
