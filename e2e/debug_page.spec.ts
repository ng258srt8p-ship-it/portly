import { test, expect } from '@playwright/test';

test.describe('DEBUG - Page Structure Check', () => {
  test('inspect deals page structure', async ({ page }) => {
    await page.goto('/deals');
    await page.waitForTimeout(5000);

    const info = await page.evaluate(() => {
      const pulse = document.querySelectorAll('.animate-pulse');
      const bgWhitePulse = Array.from(pulse).filter(el => el.className.includes('bg-white'));
      
      // Check skeleton card containers (div with rounded-3xl + bg-white)
      const cardContainers = document.querySelectorAll('[class*="rounded-3xl"][class*="bg-white"]');
      const cardClass = cardContainers.length > 0 ? cardContainers[0].className : 'none';
      
      // Check mobile nav button
      const navBtn = document.querySelector('button[aria-label="Toggle navigation"]');
      const navInfo = navBtn ? { found: true, expanded: navBtn.getAttribute('aria-expanded') } : { found: false };
      
      // Check menu structure when clicked
      const menu = document.querySelector('[class*="flex flex-col"][class*="rounded-3xl"]');
      const menuInfo = menu ? { found: true, class: menu.className } : { found: false };
      
      return { 
        pulseCount: pulse.length,
        bgWhitePulseCount: bgWhitePulse.length,
        cardContainerClass: cardClass,
        navButton: JSON.stringify(navInfo),
        menuStructure: JSON.stringify(menuInfo)
      };
    });
    
    console.log(JSON.stringify(info, null, 2));
    expect(true).toBe(true); // just inspect
  });

  test('inspect mobile nav interaction', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(2000);

    // Click hamburger
    const btn = page.locator('button[aria-label="Toggle navigation"]');
    await btn.click();
    await page.waitForTimeout(1000);

    const afterClick = await page.evaluate(() => {
      const navBtn = document.querySelector('button[aria-label="Toggle navigation"]');
      const expanded = navBtn?.getAttribute('aria-expanded');
      
      // Check what's in mobile menu divs
      const menus = document.querySelectorAll('[class*="flex flex-col"]');
      const menuContent = Array.from(menus).filter(m => m.offsetWidth > 0).map(m => ({
        text: m.textContent?.slice(0,100),
        class: m.className.slice(0,80)
      }));
      
      return { expanded, menuCount: menuContent.length, menus: menuContent };
    });
    
    console.log('After click:', JSON.stringify(afterClick, null, 2));
    expect(true).toBe(true);
  });

  test('inspect escape key', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(2000);

    const btn = page.locator('button[aria-label="Toggle navigation"]');
    await btn.click();
    await page.waitForTimeout(1000);

    const expanded = await btn.getAttribute('aria-expanded');
    console.log(`Menu opened: aria-expanded = ${expanded}`);
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const afterEscape = await btn.getAttribute('aria-expanded');
    console.log(`After Escape: aria-expanded = ${afterEscape}`);
    
    expect(true).toBe(true); // just inspect
  });
});
