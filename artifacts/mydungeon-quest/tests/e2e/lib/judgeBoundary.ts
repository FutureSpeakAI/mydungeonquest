import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { expect } from '@playwright/test';
import { BINARY_PROTOCOL } from './binaryVerdict';
import { HARVEST_DIR } from './harvestManifest';

// ============================================================
// THE JUDGE BOUNDARY LEDGER (58.7–58.11 + review round, LOOP_LOG)
// — the ONE seat of a law two rooms consult: the calibration bench
// (which may not SEAT a control the instrument is proven blind to)
// and the G16 courts (which must not CONVICT the app on the same
// blindness).
//
// An entry is earned, never granted: two fresh rolls crossing
// byte-identically on the same binaries, plus human inspection
// proving the material lawful — the two-sitting law. Keys carry the
// WHOLE pairing, `<kind>:<sha256(bytes)>:<sha256(prose)>`: the
// 58.10 red proved stores alias bytes across pairings (caption-0
// wears the ch1 page plate's very bytes, sealed green under the
// caption binaries), and the review round closed the second half —
// the question the judge answers EMBEDS the prose, and mock paints
// can reproduce identical bytes under moved prose, so bytes alone
// must never carry an attestation to a pairing it did not earn.
// Blindness is a property of kind × pixels × words.
//
// The bench remains the ledger's custodian: its stale-entry gate
// fails loudly when an entry matches no standing candidate, so
// entries die with the store (or the prose) that earned them.
// Courts consulting this ledger RECUSE loudly — every recusal logs
// its attestation, and a court standing down WHOLE must prove
// custody through assertBoundaryCustody below. Silence is never
// tolerance.
// ============================================================

export const JUDGE_BOUNDARY: Record<string, string> = {
  // ch1 page plate beside its page's first 200 characters: the
  // waystation bell hangs dark-on-dark against the gnarled tree frame;
  // the judge answered element_present=false twice, byte-stable at
  // 0.62, while NAMING the bell — yet reads the same pixels fine under
  // the moment binaries. 58.7/58.8 evidence pinned.
  'page:0835536e7df9633f4c589a23cfeb9266c0c7061f117d860ef8ab90d7284c3b21:3a9e4d06770e2ded1ffab78b263c14d8ce39ef0f2bae7f0ccb2b28a29285812e': 'page binaries: judge stably blind to the dark bell (58.7/58.8)',
  // caption-1 beside its own sealed text: a truncated, act-heavy
  // caption over a night plate — the judge SAW the bag yet demanded the
  // weighing act, and refused the blue-shadowed vale as its own
  // meadows. Two fresh rolls crossed (0.72 then 0.55) and inspection
  // seats both claims in the pixels. 58.9 evidence pinned; the G16c
  // court roll landed the same read.
  'caption:164b17217f1aab9f1896fa99d40fff76b132a7831f63aca57353770fbdfd5327:6e91a0cbe3062445b0872c687f2f83a0fba323954b34c1506464b507396a2b1f': 'caption binaries: night plate + truncated act-caption sits at the judge boundary (58.9)',
};

/** The whole-pairing key: `<kind>:<sha256(bytes)>:<sha256(prose)>`. */
export function boundaryKey(kind: string, bytes: Buffer, prose: string): string {
  const byteSha = createHash('sha256').update(bytes).digest('hex');
  const proseSha = createHash('sha256').update(Buffer.from(prose, 'utf8')).digest('hex');
  return `${kind}:${byteSha}:${proseSha}`;
}

/** The attestation if this whole pairing sits at the judge's proven boundary, else null. */
export function boundaryRecusal(kind: string, bytes: Buffer, prose: string): string | null {
  return JUDGE_BOUNDARY[boundaryKey(kind, bytes, prose)] || null;
}

/**
 * THE CUSTODY LAW (review round, LOOP_LOG): a court stands down WHOLE
 * only under a bench that proved the instrument on THIS store — the
 * calibration table must stand beside the harvest, carry the standing
 * protocol, and show perfect separation. A naked pass on zero judged
 * rows would be a skip wearing a robe.
 */
export function assertBoundaryCustody(court: string, recusedCount: number): void {
  const calibrationFile = path.resolve(HARVEST_DIR, '..', 'calibration.json');
  expect(fs.existsSync(calibrationFile), `${court} whole-recusal demands the bench sat this store — no calibration table stands`).toBe(true);
  const bench = JSON.parse(fs.readFileSync(calibrationFile, 'utf8'));
  expect(bench.protocol, `${court} whole-recusal demands the standing protocol`).toBe(BINARY_PROTOCOL);
  expect(Array.isArray(bench.table), `${court} whole-recusal demands the bench's separation table`).toBe(true);
  expect(bench.table.filter((row: any) => row.set === 'good' && !row.pass), `${court} whole-recusal stands only under perfect separation`).toEqual([]);
  expect(bench.table.filter((row: any) => row.set === 'bad' && row.pass), `${court} whole-recusal stands only under perfect separation`).toEqual([]);
  console.log(`[${court}] WHOLE-RECUSAL under custody: all ${recusedCount} row(s) at the proven boundary; the bench's perfect separation stands (protocol ${bench.protocol})`);
}
