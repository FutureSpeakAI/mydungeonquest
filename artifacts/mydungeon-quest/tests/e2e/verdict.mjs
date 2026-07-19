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
  // (54B §2/§7) the calibration probe licenses G16 and G9 — it must sit.
  'calibration',
  'g09-character', 'g10-environment', 'g11-style',
  'g16-captions', 'g17-framing', 'g18-storybook', 'g22-frame', 'g23-battle', 'teeth',
  // (0.9.0) the prose court sits every run.
  'g24-prose',
  // (0.9.1, Directive XIII) the two-hands court sits every run.
  'g27-forge',
  // (0.9.2, Directive XIV) the open-book court sits every run.
  'g28-book',
  // (0.10.0, Directive XII §VII.3) the two live courts sit every run.
  'g25-wonder', 'g26-return',
  // (60B §4) THE BETA CUT — the sheet court, the quiet table, and the
  // atelier & threshold court sit every run.
  'g31-sheet', 'g32-quiet', 'g33-atelier',
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
  // (54B §7) the two new teeth are demanded by name like every other.
  'tooth 11:', 'tooth 12:',
  // (56C) THE HONEST FRAME — four courts and three teeth, by name.
  'G22a', 'G22b', 'G22c', 'G22d', 'tooth 13:', 'tooth 14:', 'tooth 15:',
  // (Directive X) G23 THE BATTLE CUT — five courts and the species tooth.
  'G23a', 'G23b', 'G23c', 'G23d', 'G23e', 'tooth 16:',
  // (Directive VI) G19 THE TROVE — both courts demanded by name.
  'G19a', 'G19b',
  // (Directive VII) G20 THE GROUND — both courts demanded by name, and the
  // round-trip rider that keeps every future court's instruments honest.
  'G20a', 'G20b', 'G00-RT',
  // (Directive VIII) G21 THE PARTY — both courts demanded by name.
  'G21a', 'G21b',
  // (0.9.0) THE WRITER'S ROOM — the prose court's six criteria and its
  // two instrument teeth, each demanded by its own exact name.
  'G24w', 'G24a', 'G24b', 'G24c', 'G24d', 'G24e', 'G24f', 'tooth 10:', 'tooth 19:',
  // (0.9.1, Directive XIII) THE TWO HANDS — four courts demanded by name,
  // the live-smith round-trip among them so it can never silently skip.
  'G27a', 'G27b', 'G27c', 'G27d',
  // (0.9.2, Directive XIV) THE OPEN BOOK — four courts demanded by name.
  'G28a', 'G28b', 'G28c', 'G28d',
  // (0.10.0, Directive XII §VI.1/§VI.4) the wonder clock and the return
  // law, demanded by name so a live court can never silently skip.
  'G25:', 'G26a', 'G26b',
  // (60B §4) THE BETA CUT — the sheet court, the quiet table, the
  // atelier & threshold court, and the two new teeth, each demanded by
  // its own exact name; the teeth colon-anchored like every other.
  'G31a', 'G31b', 'G31c', 'G31d', 'G31e', 'G31f',
  'G32a', 'G32b',
  'G33a', 'G33b', 'G33c', 'G33d', 'G33e',
  'tooth 20:', 'tooth 21:',
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
// (54B §4/§9) REPLAY vs FRESH per criterion, read from this iteration's own
// run log — the judge announces every look it takes or replays.
try {
  const logPath = path.join(root, 'test-results', `run-iter${iter}.log`);
  const counts = {};
  if (fs.existsSync(logPath)) {
    for (const line of fs.readFileSync(logPath, 'utf8').split('\n')) {
      const m = line.match(/\[judge\] (REPLAY|FRESH) ([^/\s]+)\//);
      if (!m) continue;
      counts[m[2]] = counts[m[2]] || { replay: 0, fresh: 0 };
      counts[m[2]][m[1] === 'REPLAY' ? 'replay' : 'fresh'] += 1;
    }
  }
  verdict.judgeCalls = counts;
} catch { verdict.judgeCalls = null; }
fs.writeFileSync(path.join(root, 'test-results', `run-iter${iter}.verdict.json`), JSON.stringify(verdict, null, 2));
const why = verdict.green ? '' : ` — ${verdict.reason || `exit=${verdict.exitCode} unexpected=${verdict.totals?.unexpected} skipped=${verdict.totals?.skipped} flaky=${verdict.totals?.flaky} missingProjects=[${(verdict.missingProjects || []).join(',')}] missingExecuted=[${(verdict.missingExecuted || []).join(',')}]`}`;
console.log(`[verdict] iter=${iter} green=${verdict.green}${why}`);
