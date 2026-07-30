/**
 * Audit current state of /sailing/[id]:
 *  - Inspect Key Takeaways content (verdict pitch, badges)
 *  - Inspect cabin pricing cards ($0 issue)
 *  - Check raw API response
 */
import { test } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://b1a558ac.portly-1i0.pages.dev';

test('audit sailing page content depth and cabin pricing', async ({ page, request }) => {
  const dealsRes = await request.get(`${BASE_URL}/api/deals?limit=1`);
  const deals = await dealsRes.json();
  const sailingId: string = deals[0]?.id ?? '';
  test.skip(!sailingId, 'no sailing ID');

  // ── Raw API response
  const apiRes = await request.get(`https://portly-api.vqh9mnrdbp.workers.dev/api/sailing/${sailingId}`);
  const apiJson = await apiRes.json();
  console.log('\n[RAW API]');
  console.log('  Status:', apiRes.status());
  console.log('  Sailing keys:', Object.keys(apiJson.sailing || {}));
  console.log('  Sailing.aiScore:', apiJson.sailing?.aiScore);
  console.log('  Sailing.aiDealScoreNarrative:', apiJson.sailing?.aiDealScoreNarrative);
  console.log('  Sailing.aiInsiderSummary:', apiJson.sailing?.aiInsiderSummary);
  console.log('  Sailing.aiCabinStrategy:', apiJson.sailing?.aiCabinStrategy);
  console.log('  Sailing.aiExcursionStrategy:', apiJson.sailing?.aiExcursionStrategy);
  console.log('  Sailing.aiGeneratedAt:', apiJson.sailing?.aiGeneratedAt);
  console.log('  Cabin breakdown:', JSON.stringify(apiJson.cabinBreakdown, null, 2));

  // ── Frontend page
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE_URL}/sailing/${sailingId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const measurements = await page.evaluate(() => {
    // Key takeaways
    const takeaways = document.querySelector('[data-testid="sailing-key-takeaways"]') as HTMLElement | null;
    const verdict = document.querySelector('[data-testid="key-takeaway-verdict"]') as HTMLElement | null;
    const badges = document.querySelectorAll('[data-testid="key-takeaway-badges"] > span');
    const portIntelCards = document.querySelectorAll('[data-testid="key-takeaway-port-intel"] > div');

    // Cabin pricing — find buttons matching the class signature from the bug report
    const allCabinButtons = Array.from(document.querySelectorAll('button')).filter((b) =>
      b.className.includes('rounded-xl border p-3 text-left')
    );
    const cabinData: Array<{ label: string; price: string; subtitle: string; html: string }> = [];
    allCabinButtons.forEach((btn) => {
      cabinData.push({
        label: btn.querySelector('p:first-child')?.textContent?.trim() ?? '',
        price: btn.querySelector('p.font-mono-tab')?.textContent?.trim() ?? '',
        subtitle: btn.querySelector('p:last-child')?.textContent?.trim() ?? '',
        html: btn.outerHTML.slice(0, 400),
      });
    });

    // Sections count
    const sections = ['overview', 'itinerary', 'price-history', 'deal-analysis', 'cabins', 'forecast', 'ship-info'];
    const sectionPresence: Record<string, boolean> = {};
    sections.forEach((id) => {
      sectionPresence[id] = !!document.getElementById(id);
    });

    const verdictText = verdict?.textContent?.trim() ?? '';
    return {
      takeawaysPresent: !!takeaways,
      verdictText,
      verdictLength: verdictText.length,
      verdictWordCount: verdictText.split(/\s+/).filter(Boolean).length,
      verdictMentionsPorts: /(Cozumel|Nassau|Miami|Port Canaveral|Bahamas|Caribbean|Carnival|Royal|port|days|nights)/i.test(verdictText),
      badgeCount: badges.length,
      badgeLabels: Array.from(badges).map((b) => b.textContent?.trim() ?? ''),
      portIntelCount: portIntelCards.length,
      cabinButtons: cabinData,
      cabinZeroCount: cabinData.filter((c) => c.price === '$0' || c.price === '').length,
      sectionPresence,
      bodyTextLength: document.body.textContent?.length ?? 0,
    };
  });

  console.log('\n[FRONTEND]');
  console.log(JSON.stringify(measurements, null, 2));

  await page.screenshot({ path: 'test-results/sailing-audit-current.png', fullPage: true });
});
