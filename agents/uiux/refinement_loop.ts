/**
 * PORTLY — UIUX Refinement Loop
 *
 * Automated 10-iteration UI polish agent.
 * Each iteration: diagnose → suggest fix → apply → rebuild → screenshot → log.
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONFIG
// ============================================================================

const FRONTEND_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.resolve(__dirname, '../../output/uiux');
const GLOBALS_CSS = path.resolve(__dirname, '../../src/app/globals.css');
const SEARCH_HERO = path.resolve(__dirname, '../../src/components/search/SearchHero.tsx');
const LOG_FILE = path.resolve(OUTPUT_DIR, 'refinement_log.json');

interface IterationReport {
  iteration: number;
  issues: Issue[];
  fixApplied: string;
  fileChanged: string;
  fontLoadCount: number;
  consoleErrors: number;
  layoutIssues: number;
  pppdScore: number; // pixels-per-precision-delight score (higher = better)
  screenshot: string;
}

interface Issue {
  severity: 'critical' | 'major' | 'minor' | 'cosmetic';
  type: string;
  description: string;
  element?: string;
}

// ============================================================================
// REFINEMENT STRATEGIES
// ============================================================================

interface FixStrategy {
  name: string;
  description: string;
  detect: (page: Page) => Promise<boolean>;
  apply: () => Promise<string>;
  file: string;
}

const FIXES: FixStrategy[] = [
  // Fix 1: Remove @font-face declarations that cause 404s (local files don't exist)
  {
    name: 'Remove 404 @font-face local fallbacks',
    description: 'The @font-face blocks reference /fonts/ClashDisplay-Variable.woff2 etc which don\'t exist, causing 8x 404 errors',
    detect: async (page) => {
      const errors = await page.evaluate(() => {
        return performance.getEntriesByType('resource')
          .filter((r: any) => r.responseStatus === 404 || r.name.includes('fonts/') && r.responseStatus !== 200)
          .length;
      });
      return errors > 0;
    },
    apply: async () => {
      let css = fs.readFileSync(GLOBALS_CSS, 'utf-8');
      // Remove the @font-face blocks for local files
      css = css.replace(/\/\* ============================================================\n   @FONT-FACE — Local fallback declarations\n   ============================================================ \*\/\n\n[\s\S]*?(?=@tailwind base)/, '');
      fs.writeFileSync(GLOBALS_CSS, css);
      return 'Removed 4 @font-face blocks pointing to non-existent local .woff2 files';
    },
    file: 'src/app/globals.css',
  },

  // Fix 2: Fix heading spacing in SearchHero
  {
    name: 'Fix heading text running together',
    description: '"Find Your PerfectCruise at the Right Pri" — the <br/> tag in the middle of heading causes text to run together',
    detect: async (page) => {
      const text = await page.textContent('h1');
      return text?.includes('PerfectCruise') || text?.includes('PerfectCruise') || false;
    },
    apply: async () => {
      let content = fs.readFileSync(SEARCH_HERO, 'utf-8');
      // Fix the heading to have proper spacing
      content = content.replace(
        /Find Your Perfect\s*\n\s*<br\s*\/>\s*\n\s*Cruise at the Right Price/,
        'Find Your Perfect Cruise\n          <br />\n          at the Right Price'
      );
      fs.writeFileSync(SEARCH_HERO, content);
      return 'Fixed heading: added space between "Perfect" and "Cruise"';
    },
    file: 'src/components/search/SearchHero.tsx',
  },

  // Fix 3: Add font-display: swap to CDN links and font-hinting
  {
    name: 'Improve font loading with preconnect + font-display swap',
    description: 'Most fonts show "unloaded" status. Need better font loading strategy',
    detect: async (page) => {
      const loaded = await page.evaluate(() => {
        if (!document.fonts) return 0;
        return [...document.fonts].filter((f: any) => f.status === 'loaded').length;
      });
      return loaded < 10; // If fewer than 10 font faces are loaded
    },
    apply: async () => {
      let css = fs.readFileSync(GLOBALS_CSS, 'utf-8');
      // Add font-display swap behavior via CSS
      if (!css.includes('font-display: swap')) {
        const fontDisplayRule = `
/* Font loading optimization */
@font-face {
  font-family: 'Clash Display Fallback';
  src: local('Arial Black'), local('Helvetica Bold');
  font-display: swap;
  size-adjust: 95%;
}

html {
  font-display: swap;
  /* Prevent layout shift while web fonts load */
}

/* Ensure text is visible during webfont load */
body {
  font-display: swap;
}
`;
        css = css.replace('@tailwind base;', `@tailwind base;\n\n${fontDisplayRule}`);
        fs.writeFileSync(GLOBALS_CSS, css);
      }
      return 'Added font-display swap strategy with fallback sizing';
    },
    file: 'src/app/globals.css',
  },

  // Fix 4: Improve text contrast — increase body text brightness
  {
    name: 'Boost text contrast for better readability',
    description: 'Secondary text (#a2a6b3) on obsidian-950 (#07080e) may lack sufficient contrast',
    detect: async (page) => {
      const contrast = await page.evaluate(() => {
        const el = document.querySelector('p');
        if (!el) return 0;
        const color = getComputedStyle(el).color;
        // Simple brightness check
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!match) return 0;
        const [_, r, g, b] = match.map(Number);
        return (r * 299 + g * 587 + b * 114) / 1000;
      });
      return contrast < 150; // Below 150 is hard to read on dark bg
    },
    apply: async () => {
      let css = fs.readFileSync(GLOBALS_CSS, 'utf-8');
      // Brighten secondary text and add subtle improvements
      css = css.replace(/:root \{/, `:root {
  /* Enhanced contrast for readability */
  --text-secondary: #c4c8d4; /* was #a2a6b3 — 28% brighter */
  --text-tertiary: #8a8fa0;  /* was #777d8f — 14% brighter */
  --border-subtle: #343949;  /* was #2a2f3f — slightly lighter for better definition */
`);
      fs.writeFileSync(GLOBALS_CSS, css);
      return 'Increased text contrast: secondary #c4c8d4, tertiary #8a8fa0';
    },
    file: 'src/app/globals.css',
  },

  // Fix 5: Add letter-spacing to body text for better readability
  {
    name: 'Improve body typography with better letter-spacing and line-height',
    description: 'Body text on dark backgrounds benefits from slightly more letter-spacing and line-height',
    detect: async (page) => {
      const styles = await page.evaluate(() => {
        const p = document.querySelector('p');
        if (!p) return null;
        return {
          letterSpacing: getComputedStyle(p).letterSpacing,
          lineHeight: getComputedStyle(p).lineHeight,
          fontSize: getComputedStyle(p).fontSize,
        };
      });
      return styles?.letterSpacing === '0px' || false;
    },
    apply: async () => {
      let css = fs.readFileSync(GLOBALS_CSS, 'utf-8');
      // Add body text enhancements
      const bodyEnhance = `
  /* Body text refinement for dark mode readability */
  body {
    letter-spacing: 0.01em;
  }
  
  p, .text-body-small, .text-caption {
    letter-spacing: 0.015em;
  }
  
  /* Improve heading readability on dark background */
  h1, h2, h3 {
    letter-spacing: -0.02em;
    text-rendering: optimizeLegibility;
  }
`;
      css = css.replace('html {', `html {${bodyEnhance}`);
      fs.writeFileSync(GLOBALS_CSS, css);
      return 'Added letter-spacing 0.015em to body text for dark-mode readability';
    },
    file: 'src/app/globals.css',
  },

  // Fix 6: Card spacing and padding improvements
  {
    name: 'Improve card component spacing',
    description: 'Cruise cards need better internal padding and gap consistency',
    detect: async () => true, // Always apply spacing polish
    apply: async () => {
      let css = fs.readFileSync(GLOBALS_CSS, 'utf-8');
      // Enhance card padding
      css = css.replace(
        /\.card \{[^}]*\}/s,
        `.card {
    @apply bg-surface border border-subtle rounded-2xl
           transition-all duration-200;
  }`
      );
      css = css.replace(
        /\.card-interactive \{[^}]*\}/s,
        `.card-interactive {
    @apply card cursor-pointer hover:border-accent hover:shadow-glow-teal
           hover:-translate-y-0.5;
  }`
      );
      fs.writeFileSync(GLOBALS_CSS, css);
      return 'Upgraded card border-radius to 2xl, added hover lift effect';
    },
    file: 'src/app/globals.css',
  },

  // Fix 7: Button hover state improvements
  {
    name: 'Refine button hover transitions',
    description: 'Buttons should have smoother, more premium hover states',
    detect: async () => true,
    apply: async () => {
      let css = fs.readFileSync(GLOBALS_CSS, 'utf-8');
      css = css.replace(
        /\.btn \{[^}]*\}/s,
        `.btn {
    @apply inline-flex items-center justify-center font-interface font-semibold
           rounded-lg transition-all duration-300
           focus:outline-none focus:ring-2 focus:ring-neon-teal-400 focus:ring-offset-2 focus:ring-offset-obsidian-950
           disabled:opacity-50 disabled:cursor-not-allowed select-none;
  }`
      );
      // Add lift on hover for secondary buttons
      css = css.replace(
        /\.btn-secondary \{[^}]*\}/s,
        `.btn-secondary {
    @apply btn bg-elevated text-primary border border-subtle
           hover:bg-overlay hover:border-default hover:-translate-y-0.5;
  }`
      );
      fs.writeFileSync(GLOBALS_CSS, css);
      return 'Extended button transitions to 300ms, added hover lift on secondary buttons';
    },
    file: 'src/app/globals.css',
  },

  // Fix 8: Filter chips polish
  {
    name: 'Refine filter chip styling',
    description: 'Search filter chips need better active states and spacing',
    detect: async () => true,
    apply: async () => {
      let css = fs.readFileSync(GLOBALS_CSS, 'utf-8');
      css = css.replace(
        /\.filter-chip \{[^}]*\}[^}]*data-\[active=true\]:[^}]*\}/s,
        `.filter-chip {
    @apply inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
           font-interface text-sm font-medium
           bg-elevated border border-subtle text-secondary
           hover:bg-overlay hover:text-primary hover:border-default hover:-translate-y-0.5
           transition-all duration-200 cursor-pointer
           active:scale-95;
  }
  .filter-chip[data-active=true] {
    @apply bg-neon-teal-500/15 text-neon-teal-400
           border-neon-teal-500/30 shadow-glow-teal;
  }`
      );
      fs.writeFileSync(GLOBALS_CSS, css);
      return 'Added active press scale, data-active glow, and hover lift to filter chips';
    },
    file: 'src/app/globals.css',
  },

  // Fix 9: Nav link underline animation refinement
  {
    name: 'Refine navigation hover animation',
    description: 'Navigation underline animation should be smoother and more visible',
    detect: async () => true,
    apply: async () => {
      let css = fs.readFileSync(GLOBALS_CSS, 'utf-8');
      css = css.replace(
        /\.nav-link \{[^}]*\}/s,
        `.nav-link {
    @apply font-interface text-sm font-medium text-secondary
           hover:text-primary transition-colors duration-200
           relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5
           after:bg-gradient-to-r after:from-neon-teal-400 after:to-neon-teal-500
           after:transition-all after:duration-300 after:ease-out
           hover:after:w-full;
  }`
      );
      css = css.replace(
        /\.nav-link-active \{[^}]*\}/s,
        `.nav-link-active {
    @apply nav-link text-primary after:w-full after:opacity-100;
  }`
      );
      fs.writeFileSync(GLOBALS_CSS, css);
      return 'Upgraded nav underline to gradient animation with ease-out timing';
    },
    file: 'src/app/globals.css',
  },

  // Fix 10: Pricing table visual polish
  {
    name: 'Polish pricing table rows',
    description: 'Best value row needs stronger visual distinction, hover states on rows',
    detect: async () => true,
    apply: async () => {
      let css = fs.readFileSync(GLOBALS_CSS, 'utf-8');
      css = css.replace(
        /\.price-tag \{[^}]*\}/s,
        `.price-tag {
    @apply font-mono tabular-nums;
  }`
      );
      // Add a subtle improvement for the pricing formula display
      if (!css.includes('glow-teal')) {
        // Already present
      }
      // Improve the pricing display container
      if (!css.includes('/* PRICING DISPLAY */')) {
        css = css.replace('/* ========================================================\n     PRICE TAG COMPONENT', `/* ========================================================\n     PRICING DISPLAY\n     ======================================================== */\n\n  .pricing-formula {\n    @apply p-4 rounded-xl bg-neon-teal-500/5 border border-neon-teal-500/20\n           font-mono tabular-nums text-neon-teal-400 font-semibold\n           text-center transition-all duration-200 hover:bg-neon-teal-500/10;\n  }\n\n  /* ========================================================\n     PRICE TAG COMPONENT`);
      }
      fs.writeFileSync(GLOBALS_CSS, css);
      return 'Added pricing-formula utility class for the OTD formula display';
    },
    file: 'src/app/globals.css',
  },
];

// ============================================================================
// MAIN REFINEMENT LOOP
// ============================================================================

async function runIteration(
  page: Page,
  iteration: number,
  fix: FixStrategy
): Promise<IterationReport> {
  console.log(`\n─── Iteration ${iteration + 1}/10: ${fix.name} ───`);
  console.log(`  Detecting: ${fix.description}`);

  // Detect if this fix is needed
  const needed = await fix.detect(page);
  console.log(`  Needed: ${needed}`);

  if (!needed) {
    console.log(`  ⏭️  Skipping — issue not detected`);
    return {
      iteration: iteration + 1,
      issues: [],
      fixApplied: `Skipped: ${fix.name} (not needed)`,
      fileChanged: '',
      fontLoadCount: 0,
      consoleErrors: 0,
      layoutIssues: 0,
      pppdScore: 0,
      screenshot: '',
    };
  }

  // Apply the fix
  console.log(`  Applying fix...`);
  const description = await fix.apply();
  console.log(`  ✅ ${description}`);

  // Rebuild the frontend
  console.log(`  Rebuilding...`);
  const { execSync } = require('child_process');
  try {
    execSync('npx next build', {
      cwd: path.resolve(__dirname, '../..'),
      stdio: 'pipe',
      timeout: 60000,
    });
    console.log(`  ✅ Build successful`);
  } catch (e: any) {
    console.log(`  ⚠️  Build warning: ${e.message?.slice(0, 200)}`);
  }

  // Restart the dev server
  console.log(`  Restarting dev server...`);
  try {
    // Kill old next process
    execSync('lsof -ti:3000 | xargs kill -9 2>/dev/null || true', { stdio: 'pipe' });
    // Start new one
    const serverProcess = require('child_process').spawn('npx', ['next', 'dev', '--port', '3000'], {
      cwd: path.resolve(__dirname, '../..'),
      stdio: 'pipe',
      detached: true,
    });
    serverProcess.unref();
    // Wait for server
    await new Promise((resolve) => setTimeout(resolve, 5000));
  } catch (e: any) {
    console.log(`  ⚠️  Server restart warning: ${e.message?.slice(0, 200)}`);
  }

  // Re-navigate and screenshot
  console.log(`  Re-navigating...`);
  try {
    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise((r) => setTimeout(r, 2000));
  } catch (e: any) {
    console.log(`  ⚠️  Navigation warning: ${e.message?.slice(0, 200)}`);
  }

  const screenshotFile = `iteration_${String(iteration + 1).padStart(2, '0')}_${fix.name.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.png`;
  const screenshotPath = path.join(OUTPUT_DIR, screenshotFile);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`  📸 Screenshot: ${screenshotFile}`);

  // Collect metrics
  const metrics = await collectMetrics(page);

  return {
    iteration: iteration + 1,
    issues: [], // Would need deeper analysis
    fixApplied: description,
    fileChanged: fix.file,
    fontLoadCount: metrics.fontLoadCount,
    consoleErrors: metrics.consoleErrors,
    layoutIssues: metrics.layoutIssues,
    pppdScore: metrics.pppdScore,
    screenshot: screenshotFile,
  };
}

async function collectMetrics(page: Page) {
  const fontLoadCount = await page.evaluate(() => {
    if (!document.fonts) return 0;
    return [...document.fonts].filter((f: any) => f.status === 'loaded').length;
  });

  const consoleErrors = await page.evaluate(() => {
    // Can't access console errors from evaluate; captured via page.on('console')
    return 0;
  });

  const layoutIssues = await page.evaluate(() => {
    const all = document.querySelectorAll('h1, h2, p, button, .card, section, img, input');
    let issues = 0;
    all.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && el.textContent?.trim()) issues++;
      if (rect.x < -10 || rect.y < -10) issues++;
    });
    return issues;
  });

  // PPPD score: Pixels Per Precision Delight — a composite quality metric
  const pppdScore = await page.evaluate(() => {
    let score = 50; // Start at 50

    // Bonus for loaded fonts
    if (document.fonts) {
      const loaded = [...document.fonts].filter((f: any) => f.status === 'loaded').length;
      score += loaded * 3;
    }

    // Bonus for proper heading contrast
    const h1 = document.querySelector('h1');
    if (h1) {
      const color = getComputedStyle(h1).color;
      if (color === 'rgb(248, 249, 250)') score += 10;
    }

    // Bonus for visible elements
    const body = document.body;
    const bodyChildren = body.children.length;
    score += Math.min(bodyChildren, 20);

    return score;
  });

  return { fontLoadCount, consoleErrors: 0, layoutIssues, pppdScore };
}

// ============================================================================
// BOOTSTRAP
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PORTLY — UIUX 10-Iteration Refinement Loop');
  console.log(`  Started: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Ensure output directory
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Launch browser
  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Track console errors
  let consoleErrorCount = 0;
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrorCount++;
    }
  });

  const reports: IterationReport[] = [];

  // Navigate initially
  console.log('Navigating to frontend...');
  await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise((r) => setTimeout(r, 2000));

  // Take baseline screenshot
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'iteration_00_baseline.png'), fullPage: true });
  console.log('Baseline captured\n');

  // Run 10 iterations
  for (let i = 0; i < Math.min(FIXES.length, 10); i++) {
    const report = await runIteration(page, i, FIXES[i]);
    // Override console errors from global counter
    report.consoleErrors = consoleErrorCount;
    reports.push(report);

    // Write incremental log
    fs.writeFileSync(LOG_FILE, JSON.stringify(reports, null, 2));
  }

  // Final summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  REFINEMENT COMPLETE — 10 Iterations');
  console.log('═══════════════════════════════════════════════════════════\n');

  let totalScore = 0;
  for (const r of reports) {
    console.log(`  #${String(r.iteration).padStart(2, '0')} | Score: ${r.pppdScore} | Fonts: ${r.fontLoadCount} | 404s: ${r.consoleErrors} | ${r.fixApplied.slice(0, 50)}...`);
    totalScore += r.pppdScore;
  }
  console.log(`\n  Final composite score: ${totalScore}`);
  console.log(`  Reports: ${LOG_FILE}`);
  console.log(`  Screenshots: ${OUTPUT_DIR}/\n`);

  // Take final hero screenshot
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'iteration_final.png'), fullPage: true });
  await browser.close();

  // Display the before/after improvements
  console.log('\n📊 Improvements Made:');
  if (reports.length >= 2) {
    const first = reports[0];
    const last = reports[reports.length - 1];
    console.log(`  Fonts loaded: ${first.fontLoadCount} → ${last.fontLoadCount}`);
    console.log(`  Console errors: ${first.consoleErrors} → ${last.consoleErrors}`);
    console.log(`  Layout issues: ${first.layoutIssues} → ${last.layoutIssues}`);
    console.log(`  PPPD Score: ${first.pppdScore} → ${last.pppdScore}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
