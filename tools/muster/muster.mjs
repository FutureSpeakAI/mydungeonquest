#!/usr/bin/env node
// ------------------------------------------------------------
// THE MUSTER — `pnpm run muster` — the feature roll call.
//
// The gates (`pnpm run check`) are the law courts: always green, and
// growing. The muster is the acceptance layer above them: every
// feature the game is supposed to have answers PRESENT, PENDING, or
// REGRESSED, and the muster exits red while anything is pending or
// regressed. It is the loop condition for wiring work: implement a
// phase, flip its probes honestly, promote its assertions into a
// permanent gate, and only then move on.
//
// `pnpm run muster -- --write-doc` regenerates docs/FEATURES.md from
// this same roll, so the document and the tests can never drift.
//
// LAW: probes may be added or strengthened, never weakened, loosened,
// or deleted to make a feature pass.
// ------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { FEATURES, CATEGORIES } from './features.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKIP = new Set(['node_modules', 'dist', '.git', 'corpus', 'attached_assets']);

function grepDir(dir, needle) {
  const stack = [path.join(ROOT, dir)];
  while (stack.length) {
    const here = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(here, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (SKIP.has(entry.name)) continue;
      const full = path.join(here, entry.name);
      if (entry.isDirectory()) { stack.push(full); continue; }
      if (!/\.(m?jsx?|html|json|md|css)$/.test(entry.name)) continue;
      try { if (fs.readFileSync(full, 'utf8').includes(needle)) return true; } catch {}
    }
  }
  return false;
}

async function runProbe(probe) {
  try {
    if (probe.file) return { ok: fs.existsSync(path.join(ROOT, probe.file)), label: `file ${probe.file}` };
    if (probe.src) {
      const label = `'${probe.needle}' in ${probe.src}`;
      const full = path.join(ROOT, probe.src);
      return { ok: fs.existsSync(full) && fs.readFileSync(full, 'utf8').includes(probe.needle), label };
    }
    if (probe.grep) return { ok: grepDir(probe.grep, probe.needle), label: `'${probe.needle}' under ${probe.grep}` };
    if (probe.mod) {
      const m = await import(pathToFileURL(path.join(ROOT, probe.mod)).href);
      return { ok: !!probe.check(m), label: `contract of ${probe.mod}` };
    }
  } catch (err) {
    return { ok: false, label: `${probe.mod || probe.src || probe.file || probe.grep} threw: ${String(err.message).slice(0, 60)}` };
  }
  return { ok: false, label: 'unknown probe kind' };
}

async function judge(feature) {
  if (feature.tier === 'charted') return { status: 'CHARTED', failed: [], pendingCount: 0, wiringTotal: 0 };
  const contract = feature.tier === 'wired' ? (feature.probes || []) : (feature.contract || []);
  const wiring = feature.tier === 'wired' ? [] : (feature.wiring || []);
  const failed = [];
  for (const probe of contract) {
    const result = await runProbe(probe);
    if (!result.ok) failed.push(result.label);
  }
  if (failed.length) return { status: 'REGRESSED', failed, pendingCount: 0, wiringTotal: wiring.length };
  let wiringPassed = 0;
  const pendingLabels = [];
  for (const probe of wiring) {
    const result = await runProbe(probe);
    result.ok ? wiringPassed += 1 : pendingLabels.push(result.label);
  }
  if (wiringPassed === wiring.length) return { status: 'PRESENT', failed: [], pendingCount: 0, wiringTotal: wiring.length };
  return { status: 'PENDING', failed: pendingLabels, pendingCount: wiring.length - wiringPassed, wiringTotal: wiring.length };
}

const SYMBOL = { PRESENT: '\u2713', PENDING: '\u25CC', REGRESSED: '\u2717', CHARTED: '\u00B7' };

const results = [];
for (const feature of FEATURES) results.push({ feature, ...(await judge(feature)) });

const writeDoc = process.argv.includes('--write-doc');
const counts = { PRESENT: 0, PENDING: 0, REGRESSED: 0, CHARTED: 0 };

console.log('\nTHE MUSTER — the feature roll call\n');
const triage = results.filter((row) => row.feature.triage && row.status !== 'PRESENT' && row.status !== 'CHARTED');
if (triage.length) {
  console.log('THE TRIAGE — from the last playtest; take these before roll order:');
  for (const row of triage) console.log(`  ${SYMBOL[row.status]} ${row.status.padEnd(9)} ${row.feature.name}`);
  console.log('');
}
CATEGORIES.forEach((label, index) => {
  console.log(label.toUpperCase());
  for (const row of results.filter((r) => r.feature.category === index)) {
    counts[row.status] += 1;
    const suffix = row.status === 'PENDING' ? ` (wiring ${row.wiringTotal - row.pendingCount}/${row.wiringTotal})`
      : row.status === 'REGRESSED' ? ` [${row.failed[0]}]` : '';
    console.log(`  ${SYMBOL[row.status]} ${row.status.padEnd(9)} ${row.feature.name}${suffix}`);
    if (row.status === 'REGRESSED') row.failed.slice(1).forEach((f) => console.log(`      \u21B3 ${f}`));
  }
  console.log('');
});
console.log(`present ${counts.PRESENT} \u00B7 pending ${counts.PENDING} \u00B7 regressed ${counts.REGRESSED} \u00B7 charted ${counts.CHARTED}`);
console.log(counts.PENDING + counts.REGRESSED === 0
  ? 'THE MUSTER IS FULL — every rollable feature answers present.'
  : 'The muster is short — pending features are the work order, in roll order.');

if (writeDoc) {
  const stamp = new Date().toISOString().slice(0, 10);
  let doc = `# THE FEATURES — the muster roll\n\n*Generated from \`tools/muster/features.mjs\` by \`pnpm run muster -- --write-doc\` (${stamp}). The document and the acceptance tests share one source; they cannot drift. Statuses below are live.*\n\n**Standing: ${counts.PRESENT} present \u00B7 ${counts.PENDING} pending wiring \u00B7 ${counts.REGRESSED} regressed \u00B7 ${counts.CHARTED} charted.** The law suite beneath all of this is \`pnpm run check\` — the gates, always green — and they only grow.\n`;
  const triageDoc = results.filter((row) => row.feature.triage && row.status !== 'PRESENT' && row.status !== 'CHARTED');
  if (triageDoc.length) doc += `\n**THE TRIAGE (wire first):** ${triageDoc.map((r) => r.feature.name).join(' \u00B7 ')}.\n`;
  CATEGORIES.forEach((label, index) => {
    doc += `\n## ${label}\n`;
    for (const row of results.filter((r) => r.feature.category === index)) {
      doc += `\n### ${row.feature.name} — ${row.status}${row.status === 'PENDING' ? ` (wiring ${row.wiringTotal - row.pendingCount}/${row.wiringTotal})` : ''}\n\n${row.feature.detail}\n`;
      if (row.status === 'PENDING') doc += `\n*Awaiting: ${row.failed.join('; ')}.*\n`;
      if (row.status === 'REGRESSED') doc += `\n*REGRESSION — failed: ${row.failed.join('; ')}.*\n`;
    }
  });
  fs.writeFileSync(path.join(ROOT, 'docs', 'FEATURES.md'), doc);
  console.log('\ndocs/FEATURES.md regenerated from the roll.');
}

process.exit(counts.PENDING + counts.REGRESSED === 0 ? 0 : 1);
