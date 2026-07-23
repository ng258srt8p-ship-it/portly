/**
 * Script to run the UiGapAuditAgent and output results
 */
import { UiGapAuditAgent } from '../agents/UiGapAuditAgent';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Starting Portly UI Gap Audit');
  console.log('═══════════════════════════════════════════════════════\n');

  const auditor = new UiGapAuditAgent({
    srcDir: './src',
    outputDir: './output/ui_audit',
    headless: true,
    includePlaywright: true,
    includeDesignTokens: true,
  });

  const report = await auditor.runFullAudit();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Audit Complete!');
  console.log(`  Total pages audited: ${report.totalPages}`);
  console.log(`  Total components audited: ${report.totalComponents}`);
  console.log(`  Total findings: ${report.totalFindings}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Print top findings
  const allFindings = report.pages.flatMap(p => p.findings);
  const critical = allFindings.filter(f => f.severity === 'critical');
  const high = allFindings.filter(f => f.severity === 'high');

  if (critical.length > 0) {
    console.log('\n🔴 CRITICAL FINDINGS:');
    for (const f of critical.slice(0, 5)) {
      console.log(`   - [${f.component}] ${f.description}`);
    }
  }

  if (high.length > 0) {
    console.log('\n🟠 HIGH SEVERITY FINDINGS:');
    for (const f of high.slice(0, 5)) {
      console.log(`   - [${f.component}] ${f.description}`);
    }
  }

  if (critical.length === 0 && high.length === 0) {
    console.log('\n✅ No critical or high-severity findings!');
  }

  console.log(`\n📄 Full report: ./output/ui_audit/ui_gap_audit_report.json`);
  console.log(`📝 Markdown report: ./output/ui_audit/ui_gap_audit.md`);
  console.log('\n');
}

main().catch(console.error);
