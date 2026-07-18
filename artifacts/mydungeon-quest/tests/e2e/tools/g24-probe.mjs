// ============================================================
// G24's PROBE (0.9.0) — THE PROSE COURT reads the harvest's own
// sealed session records (fixture + live) and judges the shipped
// prose with the SERVER'S OWN courts — echo, cliche, sameness, the
// caption court (fatescript's captionCourt, the very function the
// validator seats), and the measure of the house (p50 of folded
// page lengths). Redacted rows fall whole (the redaction law);
// player rows and narrationless rows are not pages. Prints ONE
// JSON object; a missing store prints { error } and exits 2 so
// the court refuses BY NAME.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { clicheCheck, echoCheck, foldProse, samenessCheck } from '../../../server/room.js';
import { captionCourt } from 'fatescript/protocol';

const HARVEST = path.join('test-results', 'harvest');
const readSession = (tag) => {
  const file = path.join(HARVEST, tag, 'session.json');
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
};

const fixture = readSession('fixture');
if (!fixture) {
  process.stdout.write(JSON.stringify({ error: 'the harvest store holds no fixture session — harvest first' }));
  process.exit(2);
}
const live = readSession('live');

// THE PROSE STORE (review round) — one mock walk sealed under the
// CURRENT writer's-room law, seeded by G24w whenever the law moves.
// REQUIRED: without it the court would judge only sessions frozen
// under whatever law painted the plate store — the stale-court hole
// the architect named. Refuse by name, never judge without it.
const proseFile = path.join('test-results', 'prose-store', 'session.json');
if (!fs.existsSync(proseFile)) {
  process.stdout.write(JSON.stringify({ error: 'the prose store holds no session — G24w seeds it before the court sits' }));
  process.exit(2);
}
let prose = null;
try { prose = JSON.parse(fs.readFileSync(proseFile, 'utf8')); } catch {
  process.stdout.write(JSON.stringify({ error: 'the prose store session cannot be read' }));
  process.exit(2);
}

// A page is an UNSTRUCK, narration-bearing row; its prose is the
// narrations joined the way the history carries sealed pages.
const walkOf = (session) => (Array.isArray(session?.logs) ? session.logs : [])
  .filter((row) => row && row.redacted !== true)
  .filter((row) => Array.isArray(row.narrations) && row.narrations.some((n) => n && n.text));
const pageOf = (row) => row.narrations.map((n) => String(n?.text || '')).join('\n\n');

const walks = [walkOf(prose), walkOf(fixture), ...(live ? [walkOf(live)] : [])].filter((walk) => walk.length);
let echoFlags = 0; let clicheFlags = 0; let samenessFlags = 0;
let cueRows = 0; let captionRows = 0;
const captionErrors = [];
const foldedLengths = [];

for (const walk of walks) {
  const pages = walk.map(pageOf);
  pages.forEach((page, i) => {
    // The echo court's window: the twenty pages before this one, this walk.
    if (echoCheck(page, pages.slice(Math.max(0, i - 20), i))) echoFlags += 1;
    if (clicheCheck(page).flagged) clicheFlags += 1;
    foldedLengths.push(foldProse(page).length);
  });
  walk.forEach((row, i) => {
    const roads = Array.isArray(row?.dm?.suggestions) ? row.dm.suggestions : [];
    const prior = i > 0 && Array.isArray(walk[i - 1]?.dm?.suggestions) ? walk[i - 1].dm.suggestions : [];
    if (samenessCheck(roads, prior)) samenessFlags += 1;
    const cue = row?.dm?.image_cue;
    if (cue && typeof cue === 'object') {
      cueRows += 1;
      if (cue.caption !== undefined && cue.caption !== null) {
        captionRows += 1;
        const faults = captionCourt(cue.caption, pageOf(row));
        if (faults.length) captionErrors.push({ turn: row.id ?? i, faults });
      }
    }
  });
}

foldedLengths.sort((a, b) => a - b);
const p50 = foldedLengths.length ? foldedLengths[Math.floor(foldedLengths.length / 2)] : 0;

process.stdout.write(JSON.stringify({
  pages: foldedLengths.length, walks: walks.length,
  echoFlags, clicheFlags, samenessFlags,
  cueRows, captionRows, captionErrors,
  p50, foldedLengths
}, null, 2));
