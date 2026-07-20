#!/usr/bin/env node
// THE WHOLE RITUAL LAW's teeth (minted 2026-07-20, the reconciliation
// before Task 63; GAME_NOTES' non-negotiable laws hold the canonical
// text): the closing sentence may not be spoken and the closing commit
// may not land until every step of the ritual has its artifact in the
// ledger. Mechanically: every closed version heading in CHANGELOG.md at
// or after 1.0.1 must carry exactly ONE `RITUAL COMPLETE <version>:`
// line in LOOP_LOG.md whose body names its greens, its sitting, and its
// sentence. A version still "(in progress)" owes nothing yet — and may
// carry no line (the sentence may not precede the close). Versions
// before 1.0.1 are pinned pre-law: their rituals are ledgered in prose,
// and re-ledgering them is refused. Orphan lines naming no closed
// version are refused the same way. This gate is keyless and prints no
// counted PASS word — the G13 pin does not move for it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
const looplog = fs.readFileSync(path.join(root, 'LOOP_LOG.md'), 'utf8');

const preLaw = (v) => {
  const [maj, min, pat] = v.split('.').map(Number);
  return maj < 1 || (maj === 1 && min === 0 && pat === 0);
};
const fail = (msg) => {
  console.error(`wholeRitual.test: REFUSED — ${msg}`);
  process.exit(1);
};

// 1) Version headings from the changelog.
const headings = [...changelog.matchAll(/^## (\d+\.\d+\.\d+)([^\n]*)$/gm)].map(
  (m) => ({ version: m[1], rest: m[2] })
);
if (headings.length === 0) fail('no version headings found in CHANGELOG.md');
const closed = headings.filter((h) => !/\(in progress\)/i.test(h.rest)).map((h) => h.version);
const inProgress = headings.filter((h) => /\(in progress\)/i.test(h.rest)).map((h) => h.version);
const owed = closed.filter((v) => !preLaw(v));

// 2) RITUAL COMPLETE lines from the ledger — fixed grammar, three fields.
const lines = [...looplog.matchAll(/^RITUAL COMPLETE (\d+\.\d+\.\d+): ([^\n]*)$/gm)].map(
  (m) => ({ version: m[1], body: m[2] })
);
for (const l of lines) {
  if (!/greens .+; sitting .+; sentence .+/.test(l.body)) {
    fail(
      `RITUAL COMPLETE ${l.version} is missing a field — the grammar is "greens ...; sitting ...; sentence ..."`
    );
  }
}
const lineVersions = lines.map((l) => l.version);

// 3) Balance both ways.
for (const v of owed) {
  const n = lineVersions.filter((x) => x === v).length;
  if (n === 0)
    fail(
      `closed version ${v} has no RITUAL COMPLETE line in LOOP_LOG.md — a step of its ritual has no artifact, the sentence may not stand`
    );
  if (n > 1) fail(`closed version ${v} has ${n} RITUAL COMPLETE lines — the ledger must carry exactly one`);
}
for (const v of lineVersions) {
  if (inProgress.includes(v))
    fail(`version ${v} is "(in progress)" yet carries a RITUAL COMPLETE line — the sentence spoken before the close`);
  if (!closed.includes(v)) fail(`RITUAL COMPLETE ${v} names no closed CHANGELOG version — orphan lines are refused`);
  if (preLaw(v)) fail(`RITUAL COMPLETE ${v} claims a pre-law version — pre-law closes are pinned, not re-ledgered`);
}

console.log(
  `wholeRitual.test: the ritual ledger balances — ${owed.length} closed version(s) at law (${owed.join(
    ', '
  )}), each carrying greens, sitting, and sentence; ${
    headings.length - owed.length - inProgress.length
  } pre-law close(s) pinned; ${inProgress.length} in progress owing nothing yet.`
);
