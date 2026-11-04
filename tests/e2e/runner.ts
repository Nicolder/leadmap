/**
 * LeadMap Master E2E Test Suite Runner
 * Executes opaque-box requirement-driven tests across Tiers 1-4.
 *
 * Usage:
 *   npx tsx tests/e2e/runner.ts
 *   npx tsx tests/e2e/runner.ts --tier=1
 *   npx tsx tests/e2e/runner.ts --tier=2
 *   npx tsx tests/e2e/runner.ts --tier=3
 *   npx tsx tests/e2e/runner.ts --tier=4
 */

import { registry, SuiteSummary } from './test-utils';
import { registerTier1Tests } from './tier1-features.test';
import { registerTier2Tests } from './tier2-boundaries.test';
import { registerTier3Tests } from './tier3-combinations.test';
import { registerTier4Tests } from './tier4-applications.test';
import { db } from '@/lib/db';

async function main() {
  const args = process.argv.slice(2);
  const tierArg = args.find((a) => a.startsWith('--tier='));
  const selectedTier = tierArg ? tierArg.split('=')[1] : null;

  console.log(`\n============================================================`);
  console.log(`  LEADMAP E2E TEST SUITE RUNNER`);
  console.log(`  Target: Opaque-box E2E Verification (Tiers 1-4)`);
  console.log(`  Timestamp: ${new Date().toISOString()}`);
  console.log(`============================================================\n`);

  const summaries: SuiteSummary[] = [];

  const runTier = async (name: string, registerFn: () => void) => {
    registry.clear();
    registerFn();
    const summary = await registry.run(name);
    summaries.push(summary);
  };

  if (!selectedTier || selectedTier === '1') {
    await runTier('Tier 1: Feature Coverage (PROJECT.md Inventory)', registerTier1Tests);
  }

  if (!selectedTier || selectedTier === '2') {
    await runTier('Tier 2: Boundary & Corner Cases', registerTier2Tests);
  }

  if (!selectedTier || selectedTier === '3') {
    await runTier('Tier 3: Cross-Feature Combinations', registerTier3Tests);
  }

  if (!selectedTier || selectedTier === '4') {
    await runTier('Tier 4: Real-World Application Scenarios', registerTier4Tests);
  }

  // Print Consolidated Summary Table
  console.log(`\n============================================================`);
  console.log(`  E2E TEST EXECUTION SUMMARY REPORT`);
  console.log(`============================================================`);
  console.log(
    `  ${'Suite / Tier'.padEnd(42)} | ${'Total'.padStart(5)} | ${'Pass'.padStart(5)} | ${'Fail'.padStart(5)} | ${'Time'.padStart(7)}`
  );
  console.log(`  ${'-'.repeat(42)}-+-${'-'.repeat(5)}-+-${'-'.repeat(5)}-+-${'-'.repeat(5)}-+-${'-'.repeat(7)}`);

  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;
  let grandDuration = 0;

  for (const s of summaries) {
    grandTotal += s.total;
    grandPassed += s.passed;
    grandFailed += s.failed;
    grandDuration += s.durationMs;

    const passColor = s.passed > 0 ? '\x1b[32m' : '\x1b[0m';
    const failColor = s.failed > 0 ? '\x1b[31m' : '\x1b[0m';
    const reset = '\x1b[0m';

    console.log(
      `  ${s.name.padEnd(42)} | ${String(s.total).padStart(5)} | ${passColor}${String(s.passed).padStart(5)}${reset} | ${failColor}${String(s.failed).padStart(5)}${reset} | ${(s.durationMs / 1000).toFixed(2).padStart(6)}s`
    );
  }

  console.log(`  ${'-'.repeat(42)}-+-${'-'.repeat(5)}-+-${'-'.repeat(5)}-+-${'-'.repeat(5)}-+-${'-'.repeat(7)}`);
  const finalStatus = grandFailed === 0 ? '\x1b[32mALL TESTS PASSED\x1b[0m' : '\x1b[31mTEST FAILURES DETECTED\x1b[0m';
  console.log(
    `  ${'TOTAL'.padEnd(42)} | ${String(grandTotal).padStart(5)} | \x1b[32m${String(grandPassed).padStart(5)}\x1b[0m | \x1b[31m${String(grandFailed).padStart(5)}\x1b[0m | ${(grandDuration / 1000).toFixed(2).padStart(6)}s`
  );
  console.log(`\n  Final Verdict: ${finalStatus}`);
  console.log(`============================================================\n`);

  await db.$disconnect();
  process.exit(grandFailed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error during test runner execution:', err);
  process.exit(1);
});
