#!/usr/bin/env node
// THE VERDICT (Task 54 §6.2) — an iteration is GREEN only when the whole
// ladder ran and nothing slid by: exit 0, zero unexpected, zero skipped,
// zero flaky, every project sat, and the named courts EXECUTED (G16b,
// G17b, G17c, G18a–d never ran in 35 prior iterations — execution is now
// part of the verdict, not an assumption). Anything else is RED. The
// verdict is written beside the run log so the loop's ledger is auditable.
import fs from 'node:fs';
import path from 'node:path';

const iter = process.argv[2] || 'adhoc';
const exitCode = Number(process.argv[3] ?? '1');
const root = process.cwd();
const reportPath = path.join(root, 'test-results', 'report.json');

const REQUIRED_PROJECTS = [
  'check', 'preflight', 'harvest', 'dom',
  'g09-character', 'g10-environment', 'g11-style',
  'g16-captions', 'g17-framing', 'g18-storybook', 'teeth',
];
// Test-title needles that must appear among EXECUTED (non-skipped) tests.
const REQUIRED_EXECUTED = [
  // (iteration 54.4's discovery) 'G9a' matched NOTHING: the a-court titles
  // are spelled "G9 a1" / "G9 a2" / "G9 a3/a4" — the needle made every
  // verdict false-negative on that court and the loop unwinnable from
  // birth. All three a-courts are now demanded BY NAME — stricter than
  // the broken needle ever intended, weaker than nothing it ever was.
  'G13', 'G9 a1', 'G9 a2', 'G9 a3/a4', 'G9b', 'G9c', 'G16a', 'G16b', 'G16c',
  'G17a', 'G17b', 'G17c', 'G18a', 'G18b', 'G18c', 'G18d',
  // (Review round) Colon-anchored so 'tooth 8' can never be satisfied by
  // 'tooth 8b' alone — each tooth is demanded by its own exact name.
  'tooth 8:', 'tooth 8b:', 'tooth 9:',
];

let verdict;
if (!fs.existsSync(reportPath)) {
  verdict = { iter, green: false, exitCode, reason: 'test-results/report.json missing — the run never reported' };
} else {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const tests = [];
  const walk = (suite) => {
    for (const child of suite.suites || []) walk(child);
    for (const spec of suite.specs || []) {
      for (const t of spec.tests || []) {
        tests.push({ title: spec.title, project: t.projectName || '?', status: t.status });
      }
    }
  };
  for (const suite of report.suites || []) walk(suite);
  const skipped = tests.filter((t) => t.status === 'skipped');
  const unexpected = tests.filter((t) => t.status === 'unexpected');
  const flaky = tests.filter((t) => t.status === 'flaky');
  const projectsSeen = [...new Set(tests.map((t) => t.project))].sort();
  const missingProjects = REQUIRED_PROJECTS.filter((p) => !projectsSeen.includes(p));
  const executedTitles = tests.filter((t) => t.status !== 'skipped').map((t) => t.title);
  const missingExecuted = REQUIRED_EXECUTED.filter((needle) => !executedTitles.some((title) => title.includes(needle)));
  const green = exitCode === 0
    && tests.length > 0
    && unexpected.length === 0
    && skipped.length === 0
    && flaky.length === 0
    && missingProjects.length === 0
    && missingExecuted.length === 0;
  verdict = {
    iter, green, exitCode,
    totals: { tests: tests.length, unexpected: unexpected.length, skipped: skipped.length, flaky: flaky.length },
    projectsSeen, missingProjects, missingExecuted,
    unexpectedTitles: unexpected.map((t) => `${t.project}: ${t.title}`),
    skippedTitles: skipped.map((t) => `${t.project}: ${t.title}`),
  };
}
fs.writeFileSync(path.join(root, 'test-results', `run-iter${iter}.verdict.json`), JSON.stringify(verdict, null, 2));
const why = verdict.green ? '' : ` — ${verdict.reason || `exit=${verdict.exitCode} unexpected=${verdict.totals?.unexpected} skipped=${verdict.totals?.skipped} flaky=${verdict.totals?.flaky} missingProjects=[${(verdict.missingProjects || []).join(',')}] missingExecuted=[${(verdict.missingExecuted || []).join(',')}]`}`;
console.log(`[verdict] iter=${iter} green=${verdict.green}${why}`);
