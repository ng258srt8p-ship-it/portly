/**
 * UiGapAuditAgent — UI Gap & Inconsistency Auditor
 * 
 * Systematically scans every page component and UI component for gaps,
 * inconsistencies, and missing states. Produces a structured audit report
 * covering:
 *   - Missing UI states (loading, error, empty)
 *   - Design token inconsistency (colors, spacing, typography)
 *   - Responsive breakpoint gaps
 *   - Accessibility gaps (a11y)
 *   - Component pattern inconsistencies
 *   - Incomplete feature implementations
 *   - Unstyled or unhandled edge cases
 * 
 * Usage:
 *   const auditor = new UiGapAuditAgent({ outputDir: './output/ui_audit' });
 *   const report = await auditor.auditAllPages();
 *   console.log(report.findings); // Array<{severity, page, component, description, fix}>
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// ============================================================
// Types
// ============================================================

/** Severity of a finding */
export type GapSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** Category of gap found */
export type GapCategory = 
  | 'missing-state'        // Loading/error/empty states
  | 'inconsistent-styling'  // Design token mismatch
  | 'responsive-gap'        // Missing responsive behavior
  | 'accessibility'         // WCAG a11y gap
  | 'pattern-inconsistency' // UI pattern mismatch
  | 'feature-gap'           // Feature partially implemented
  | 'edge-case'            // Unhandled edge case
  | 'unimplemented'        // Stub / TODO remains
  | 'layout-issue';        // Layout/positioning issue

export interface GapFinding {
  id: string;
  severity: GapSeverity;
  category: GapCategory;
  page: string;
  component: string;
  description: string;
  fix: string;
  wcag?: string;  // WCAG criterion if a11y related
}

export interface PageAuditResult {
  page: string;
  component: string;
  path: string;
  findings: GapFinding[];
  totalElements: number;
  coveredElements: number;
}

export interface UiGapAuditReport {
  timestamp: string;
  totalPages: number;
  totalComponents: number;
  totalFindings: number;
  findingsBySeverity: Record<GapSeverity, number>;
  findingsByCategory: Record<GapCategory, number>;
  pages: PageAuditResult[];
  recommendations: string[];
}

export interface AuditConfig {
  srcDir: string;
  outputDir: string;
  headless: boolean;
  includePlaywright: boolean;  // also audit E2E tests
  includeDesignTokens: boolean;  // check against design tokens
}

// ============================================================
// Design Token Definitions (from the codebase)
// ============================================================

const DESIGN_TOKENS = {
  colors: {
    primary: ['indigo', 'indigo-dark'],
    secondary: ['teal', 'teal-dark', 'cyan'],
    accent: ['amber'],
    success: ['green'],
    warning: ['yellow'],
    danger: ['red'],
    neutral: ['ink', 'ink-light', 'ink-soft', 'white', 'gray'],
  },
  spacing: {
    xs: ['px-1', 'px-2'],
    sm: ['px-3', 'px-4'],
    md: ['px-6', 'px-8'],
    lg: ['px-10', 'px-12'],
    xl: ['px-16', 'px-20'],
  },
  breakpoints: ['sm', 'md', 'lg', 'xl', '2xl'],
  fontFamily: ['font-sans'],
};

// Common UI patterns to check
const COMMON_PATTERNS = {
  CTAs: ['text-white', 'rounded-full', 'rounded-lg', 'rounded-md', 'shadow'],
  cards: ['rounded-lg', 'shadow', 'border'],
  badges: ['rounded-full', 'px-2', 'py-1', 'text-xs'],
  inputs: ['rounded', 'border', 'focus:ring', 'focus:outline'],
  buttons: ['inline-flex', 'items-center', 'justify-center', 'px-4', 'py-2'],
  tables: ['min-w-full', 'divide-y', 'border'],
};

// ============================================================
// Regex Helpers
// ============================================================

const REGEX = {
  // Class patterns
  tailwindClass: /class(?:Name|="([^"]*)")/g,
  componentImport: /from\s+['"]@\/components\/([^'"]+)['"]/g,
  loadingState: /loading|isLoading|spin|skeleton|shimmer/gi,
  errorState: /error|err|failed|unable|failure/gi,
  emptyState: /empty|noData|noResults|noDataFound|noCruisesFound/gi,
  a11y: /aria-|role=|tabIndex|aria-labelledby|aria-label|aria-describedby/gi,
  designToken: new RegExp(`(${Object.values(DESIGN_TOKENS.colors).flat().join('|')})`, 'gi'),
};

// ============================================================
// Finding ID generator (instance-level to reset per audit run)
// ============================================================

export class UiGapAuditAgent {
  private config: AuditConfig;
  private _findingIdCounter = 0;

  constructor(config?: Partial<AuditConfig>) {
    this.config = {
      srcDir: config?.srcDir || './src',
      outputDir: config?.outputDir || './output/ui_audit',
      headless: config?.headless ?? true,
      includePlaywright: config?.includePlaywright ?? false,
      includeDesignTokens: config?.includeDesignTokens ?? true,
    };
    fs.mkdirSync(this.config.outputDir, { recursive: true });
  }

  /** Generate next finding ID for this audit run */
  private nextFindingId(): string {
    return `FINDING-${++this._findingIdCounter}`;
  }

  /**
   * Scan all pages and components for UI gaps
   */
  async auditAllPages(): Promise<UiGapAuditReport> {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  PORTLY UI GAP AUDIT — SYSTEMATIC SCAN          ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    // Discover all .tsx files in src/app and src/components
    const pageFiles = await glob(`${this.config.srcDir}/app/**/*.tsx`);
    const componentFiles = await glob(`${this.config.srcDir}/components/**/*.tsx`);
    
    // Optionally include playwright tests
    if (this.config.includePlaywright) {
      const testFiles = await glob(`${this.config.srcDir}/e2e/**/*.spec.ts`);
      componentFiles.push(...testFiles);
    }

    const allFiles = [...pageFiles, ...componentFiles];
    const pageAudits: PageAuditResult[] = [];
    const allFindings: GapFinding[] = [];

    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const fileName = path.basename(file);
      const relativePath = path.relative(this.config.srcDir, file);
      const pageName = relativePath.includes('/app/') ? relativePath.split('/app/')[1]?.replace('.tsx', '') || fileName : fileName;
      const componentPath = fileName.includes('/app/') ? fileName : `components/${fileName}`;

      const results = this.auditFile(content, relativePath, pageName, componentPath);
      
      if (results.findings.length > 0 || results.totalElements > 0) {
        pageAudits.push(results);
        allFindings.push(...results.findings);
      }
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(allFindings);

    const report: UiGapAuditReport = {
      timestamp: new Date().toISOString(),
      totalPages: pageFiles.length,
      totalComponents: componentFiles.length,
      totalFindings: allFindings.length,
      findingsBySeverity: this.countBySeverity(allFindings),
      findingsByCategory: this.countByCategory(allFindings),
      pages: pageAudits,
      recommendations,
    };

    // Save report
    const reportPath = path.join(this.config.outputDir, 'ui_gap_audit_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n[UiGapAuditAgent] Report saved: ${reportPath}`);

    return report;
  }

  /**
   * Audit a single file for UI gaps
   */
  private auditFile(content: string, filePath: string, page: string, component: string): PageAuditResult {
    const findings: GapFinding[] = [];
    const lines = content.split('\n');
    let totalElements = 0;

    // Count UI elements
    totalElements += (content.match(/<div/g) || []).length;
    totalElements += (content.match(/<button/g) || []).length;
    totalElements += (content.match(/<a /g) || []).length;
    totalElements += (content.match(/<input/g) || []).length;
    totalElements += (content.match(/<select/g) || []).length;
    totalElements += (content.match(/<table/g) || []).length;
    totalElements += (content.match(/<img/g) || []).length;

    // Pass 1: Check for missing states
    const hasLoadingState = REGEX.loadingState.test(content);
    const hasErrorState = REGEX.errorState.test(content);
    const hasEmptyState = REGEX.emptyState.test(content);
    const hasCtas = content.match(/<button|<Link/g)?.length || 0;

    // Determine if states should exist
    const needsLoading = hasCtas > 0 && content.includes('fetch') && !hasLoadingState;
    const needsError = hasCtas > 0 && content.includes('fetch') && !hasErrorState;
    const needsEmpty = hasCtas > 0 && content.includes('filter|search|get') && !hasEmptyState;

    if (needsLoading && !hasLoadingState) {
      findings.push({
        id: this.nextFindingId(),
        severity: 'high',
        category: 'missing-state',
        page,
        component,
        description: `Page/component likely fetches data but lacks a loading state (skeleton/shimmer/spinner)`,
        fix: `Add a loading state with skeleton loaders for card grids, table rows, or form fields`,
      });
    }

    if (needsError && !hasErrorState) {
      findings.push({
        id: this.nextFindingId(),
        severity: 'high',
        category: 'missing-state',
        page,
        component,
        description: `Data-fetching page/component lacks an error state or error boundary`,
        fix: `Add error handling with retry option: show user-friendly error message and retry button`,
      });
    }

    if (needsEmpty && !hasEmptyState) {
      findings.push({
        id: this.nextFindingId(),
        severity: 'medium',
        category: 'missing-state',
        page,
        component,
        description: `Page/component with filtering/search lacks an empty state`,
        fix: `Add empty state: "No results found. Try adjusting your filters.", with actions to reset filters`,
      });
    }

    // Pass 2: Check for accessible patterns
    const hasAria = REGEX.a11y?.test(content);
    const hasRole = content.match(/role=\s*["']([^"']+)["']/g)?.length || 0;
    const hasAlt = (content.match(/<img[^>]*alt=/g) || []).length;
    const totalImgs = (content.match(/<img/g) || []).length;

    if (totalImgs > 0 && hasAlt === 0) {
      findings.push({
        id: this.nextFindingId(),
        severity: 'medium',
        category: 'accessibility',
        page,
        component,
        description: `Images found but none have alt attributes (WCAG 1.1.1)`,
        fix: `Add descriptive alt text to all <img> elements, or alt="" for decorative images`,
        wcag: '1.1.1',
      });
    }

    if (hasCtas > 0 && !hasAria) {
      findings.push({
        id: this.nextFindingId(),
        severity: 'low',
        category: 'accessibility',
        page,
        component,
        description: `Interactive elements lack ARIA labels/roles`,
        fix: `Add aria-label, aria-describedby, or role attributes to interactive elements`,
        wcag: '4.1.2',
      });
    }

    // Pass 3: Check design token consistency
    const classNames = content.match(/class(?:Name|="[^"]*")/g) || [];
    let inconsistentColors = 0;
    let inconsistentSpacing = 0;

    for (const cls of classNames) {
      const classes = cls.replace(/className|="([^"]*)"/g, '$1').split(/\s+/);
      const colorClasses = classes.filter(c => c.match(/^(bg-|text-|border-|fill-)/));
      const spacingClasses = classes.filter(c => c.match(/^(m-|p-|gap-)/));

      if (colorClasses.length > 1) {
        const colorSet = new Set(colorClasses.map(c => c.replace(/^(bg-|text-|border-|fill-)/, '')));
        if (colorSet.size > 3) inconsistentColors++;
      }

      if (spacingClasses.length > 2) {
        const spacingSet = new Set(spacingClasses.map(c => c.replace(/^(m[tprl]?-|p[tprl]?-|gap-)/, '')));
        if (spacingSet.size > 2) inconsistentSpacing++;
      }
    }

    if (inconsistentColors > 3) {
      findings.push({
        id: this.nextFindingId(),
        severity: 'medium',
        category: 'inconsistent-styling',
        page,
        component,
        description: `Uses ${inconsistentColors} color tokens — may violate design system consistency`,
        fix: `Consolidate to primary palette (${DESIGN_TOKENS.colors.primary.join(', ')})`,
      });
    }

    if (inconsistentSpacing > 3) {
      findings.push({
        id: this.nextFindingId(),
        severity: 'medium',
        category: 'inconsistent-styling',
        page,
        component,
        description: `Uses ${inconsistentSpacing} spacing variants — may indicate inconsistent spacing tokens`,
        fix: `Align to spacing scale: ${Object.values(DESIGN_TOKENS.spacing).flat().join(', ')}`,
      });
    }

    // Pass 4: Check responsive patterns
    const hasBreakpoints = content.match(/(sm:|md:|lg:|xl:|2xl:)/g);
    if (hasBreakpoints?.length && hasBreakpoints.length < 2) {
      findings.push({
        id: this.nextFindingId(),
        severity: 'low',
        category: 'responsive-gap',
        page,
        component,
        description: `Has ${hasBreakpoints.length} responsive breakpoint(s) — may be missing mobile/tablet/desktop coverage`,
        fix: `Add breakpoints for all device sizes: sm:, md:, lg:, xl:, 2xl:`,
      });
    }

    // Pass 5: Check component patterns
    const hasCtaPattern = classNames.some(c => c.includes('rounded-full') && c.includes('shadow'));
    const hasCardPattern = classNames.some(c => c.includes('rounded-lg') && c.includes('shadow'));

    // Pass 6: Check for TODOs, FIXMEs, UNSOLVED
    const stubs = content.match(/(TODO|FIXME|HACK|UNIMPLEMENTED|WIP)/g)?.length || 0;
    if (stubs > 0) {
      findings.push({
        id: this.nextFindingId(),
        severity: stubs > 3 ? 'high' : 'medium',
        category: 'feature-gap',
        page,
        component,
        description: `${stubs} stub(s) remain: TODO/FIXME/HACK/UNIMPLEMENTED`,
        fix: `Address remaining stubs — these are known gaps`,
      });
    }

    // Pass 7: Check for unstyled interactive elements
    const interactiveElements = content.match(/<(button|a|div|span|input|select|textarea|tablerow|td|th)/g) || [];
    const interactiveWithNoClass = interactiveElements.filter(el => {
      const className = content.match(new RegExp(`${el}[^>]*class(?:Name|="([^"]*)")`, 'g'));
      return !className || className.length === 0;
    }).length;

    if (interactiveWithNoClass > 0) {
      findings.push({
        id: this.nextFindingId(),
        severity: 'medium',
        category: 'edge-case',
        page,
        component,
        description: `${interactiveWithNoClass} interactive elements without classes`,
        fix: `Add classes for visual styling, hover/focus states, and accessibility`,
      });
    }

    // Pass 8: Layout issues - overlapping or fixed positioning
    const fixedPosition = content.match(/position: ['"]fixed/gi);
    const absolutePosition = content.match(/position: ['"]absolute/gi);
    if ((fixedPosition?.length || 0) + (absolutePosition?.length || 0) > 3) {
      findings.push({
        id: this.nextFindingId(),
        severity: 'medium',
        category: 'layout-issue',
        page,
        component,
        description: `Uses ${fixedPosition?.length || 0} fixed + ${absolutePosition?.length || 0} absolute positioning — check overlap risk`,
        fix: `Add z-index tracking and overlap boundary checks`,
      });
    }

    return {
      page,
      component,
      path: filePath,
      findings,
      totalElements: Math.max(totalElements, 1),
      coveredElements: Math.max(totalElements - findings.length, 0),
    };
  }

  /**
   * Generate recommendations based on findings
   */
  private generateRecommendations(findings: GapFinding[]): string[] {
    const recs: string[] = [];

    const critical = findings.filter(f => f.severity === 'critical');
    const high = findings.filter(f => f.severity === 'high');
    const medium = findings.filter(f => f.severity === 'medium');

    if (critical.length > 0) {
      recs.push(`🔴 CRITICAL: Address ${critical.length} critical findings immediately — these break core UX`);
    }
    if (high.length > 0) {
      recs.push(`🟠 HIGH: Resolve ${high.length} high-severity issues for consistent UX`);
    }

    // Category recommendations
    const categoryCounts = this.countByCategory(findings);
    if (categoryCounts['missing-state'] > 5) {
      recs.push(`📦 STATES: Add loading/error/empty states to all data-fetching components`);
    }
    if (categoryCounts['inconsistent-styling'] > 5) {
      recs.push(`🎨 STYLING: Align to design tokens — use Tailwind utility classes consistently`);
    }
    if (categoryCounts['accessibility'] > 3) {
      recs.push(`♿ A11Y: Improve WCAG compliance — add aria-labels, roles, alt text, keyboard nav`);
    }
    if (categoryCounts['responsive-gap'] > 3) {
      recs.push(`📱 RESPONSIVE: Add responsive breakpoints (sm/md/lg/xl/2xl) for mobile/tablet/desktop`);
    }
    if (categoryCounts['feature-gap'] > 5) {
      recs.push(`🛠️ STUBS: Address TODO/FIXME items — these are known gaps awaiting implementation`);
    }

    return recs;
  }

  /**
   * Count findings by severity
   */
  private countBySeverity(findings: GapFinding[]): Record<GapSeverity, number> {
    const counts: Record<string, number> = {};
    for (const f of findings) {
      counts[f.severity] = (counts[f.severity] || 0) + 1;
    }
    return counts as Record<GapSeverity, number>;
  }

  /**
   * Count findings by category
   */
  private countByCategory(findings: GapFinding[]): Record<GapCategory, number> {
    const counts: Record<string, number> = {};
    for (const f of findings) {
      counts[f.category] = (counts[f.category] || 0) + 1;
    }
    return counts as Record<GapCategory, number>;
  }

  /**
   * Print a summary to console
   */
  printSummary(report: UiGapAuditReport): void {
    console.log('\n');
    console.log('═'.repeat(60));
    console.log(`  AUDIT SUMMARY — ${report.totalPages} pages, ${report.totalComponents} components`);
    console.log('═'.repeat(60));
    console.log(`  Total Findings: ${report.totalFindings}`);
    console.log(`  Critical: ${report.findingsBySeverity['critical'] || 0}`);
    console.log(`  High: ${report.findingsBySeverity['high'] || 0}`);
    console.log(`  Medium: ${report.findingsBySeverity['medium'] || 0}`);
    console.log(`  Low: ${report.findingsBySeverity['low'] || 0}`);
    console.log(`  Info: ${report.findingsBySeverity['info'] || 0}`);
    console.log('');
    console.log('─'.repeat(60));
    console.log('  By Category:');
    for (const [cat, count] of Object.entries(report.findingsByCategory)) {
      if (count > 0) console.log(`    ${cat}: ${count}`);
    }
    console.log('');
    console.log('─'.repeat(60));
    console.log('  Recommendations:');
    for (const rec of report.recommendations) {
      console.log(`    ${rec}`);
    }
    console.log('═'.repeat(60));
    console.log('');
  }

  /**
   * Save detailed findings as markdown
   */
  saveMarkdown(report: UiGapAuditReport): void {
    const md = [
      '# Portly UI Gap Audit Report',
      `\n**Generated:** ${new Date(report.timestamp).toLocaleString()}\n`,
      `**Pages Audited:** ${report.totalPages} | **Components Audited:** ${report.totalComponents} | **Total Findings:** ${report.totalFindings}\n`,
      `## Summary by Severity`,
      `| Severity | Count |`,
      `|----------|-------|`,
      `| Critical | ${report.findingsBySeverity['critical'] || 0} |`,
      `| High | ${report.findingsBySeverity['high'] || 0} |`,
      `| Medium | ${report.findingsBySeverity['medium'] || 0} |`,
      `| Low | ${report.findingsBySeverity['low'] || 0} |`,
      `| Info | ${report.findingsBySeverity['info'] || 0} |`,
      '',
      `## Detailed Findings`,
      '',
    ].join('\n');

    let mdContent = md;
    for (const page of report.pages) {
      if (page.findings.length === 0) continue;
      
      mdContent += `\n### Page: \`${page.page}\`\n`;
      mdContent += `**Path:** \`${page.path}\`\n`;
      mdContent += `**Elements:** ${page.totalElements} | **Findings:** ${page.findings.length}\n`;
      mdContent += `\n| # | Severity | Category | Description | Fix |\n`;
      mdContent += `|-----|----------|----------|-------------|-----|\n`;
      
      for (const finding of page.findings) {
        mdContent += `| ${finding.id} | ${finding.severity} | ${finding.category} | ${finding.description} | ${finding.fix} |\n`;
      }
      mdContent += '\n';
    }

    // Add recommendations
    if (report.recommendations.length > 0) {
      mdContent += `\n## Recommendations\n`;
      for (const rec of report.recommendations) {
        mdContent += `- ${rec}\n`;
      }
    }

    const mdPath = path.join(this.config.outputDir, 'ui_gap_audit.md');
    fs.writeFileSync(mdPath, mdContent);
    console.log(`[UiGapAuditAgent] Markdown report saved: ${mdPath}`);
  }

  /**
   * Run a full audit with summary and markdown export
   */
  async runFullAudit(): Promise<UiGapAuditReport> {
    const report = await this.auditAllPages();
    this.printSummary(report);
    this.saveMarkdown(report);
    return report;
  }
}

/**
 * Factory function for convenience
 */
export function createUiGapAuditAgent(): UiGapAuditAgent {
  return new UiGapAuditAgent({
    outputDir: './output/ui_audit',
    headless: true,
    includePlaywright: true,
    includeDesignTokens: true,
  });
}

export default UiGapAuditAgent;
