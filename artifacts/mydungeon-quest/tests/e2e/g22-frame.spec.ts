import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { HARVEST_DIR, preflightManifest, rolePlate, topBytes } from './lib/harvestManifest';
import {
  DUCHY_PAIR_SUBJECTS, FRAME_PROTOCOL, PINNED_FRAME_QUESTIONS_SHA256,
  closureVerdict, duchyFixture, frameQuestionsDigest, heroClause, heroFirstSubjects, pairVerdict, principalLook,
} from './lib/frameLaw';
// The door itself — the same engine gate every serving of the game walks.
import { validateDmTurn, safeFallbackTurn } from 'fatescript/protocol';

// ============================================================
// G22 — THE HONEST FRAME (EXPERIENCE-DIRECTIVE-IX, Task 56C).
// The image cue is a CLAIM about who stands in the painting, and this
// court makes the claim testable end to end: the door refuses cues that
// paint the dead, the elsewhere, or the unrecorded (Law I); the easel
// closes every frame to its named souls unless the cue grants a crowd
// (Law II); the cue's first subject is the composition's principal
// figure (Law III); and a sealed fixture stands constant across two
// independent paints of the same ground (Law IV). Deterministic seats
// ride the fixture store — the Duchy pair and the hero-first plate are
// minted by the harness from byte-stable cues — and live-store plates
// join opportunistically under seat guards. This court sits only after
// teeth 13-15 have proven the three instruments on sealed known-good
// and known-bad materials; the ladder enforces the order.
// ============================================================

test('G22 preflight: the harvest store holds every artifact this court needs', () => {
  preflightManifest('g22-frame');
});

test('G22a the frame is closed: every cued scene plate holds exactly its named souls', async () => {
  test.setTimeout(600_000);
  const m = preflightManifest('g22-frame');
  // Seats: the three harness plates under their spec-held cues, plus every
  // live plate whose cue the record carries with 1..3 subjects — a cue the
  // roster could paint whole. Oversize and subjectless cues never rode the
  // closure clause, so the court does not pretend they did.
  const seats: Array<{ file: string; bytes: Buffer; subjects: string[]; allowance: 'none' | 'background'; seed: string }> = [];
  const pair1 = rolePlate(m, 'duchy-pair-1');
  const pair2 = rolePlate(m, 'duchy-pair-2');
  const heroFirstPlate = rolePlate(m, 'hero-first-scene');
  seats.push({ file: pair1.file, bytes: topBytes(pair1), subjects: DUCHY_PAIR_SUBJECTS, allowance: 'none', seed: `harness-${String(pair1.sha256).slice(0, 12)}` });
  seats.push({ file: pair2.file, bytes: topBytes(pair2), subjects: DUCHY_PAIR_SUBJECTS, allowance: 'none', seed: `harness-${String(pair2.sha256).slice(0, 12)}` });
  seats.push({ file: heroFirstPlate.file, bytes: topBytes(heroFirstPlate), subjects: heroFirstSubjects(m.hero.name), allowance: 'none', seed: `harness-${String(heroFirstPlate.sha256).slice(0, 12)}` });
  for (const plate of m.plates) {
    if (plate.role !== 'scene' || !plate.cueSubjects) continue;
    if (plate.cueSubjects.length < 1 || plate.cueSubjects.length > 3) continue;
    seats.push({
      file: plate.file, bytes: topBytes(plate), subjects: plate.cueSubjects,
      allowance: plate.crowd === 'background' ? 'background' : 'none',
      seed: `live-${String(plate.sha256).slice(0, 12)}`,
    });
  }
  expect(seats.length, 'the closure court is never starved: three harness seats stand by construction').toBeGreaterThanOrEqual(3);
  const misses: any[] = [];
  for (const seat of seats) {
    const verdict = await closureVerdict({
      bytes: seat.bytes, subjects: seat.subjects, allowance: seat.allowance,
      idSeed: `g22a-closure-${seat.seed}`, criterion: 'g22a-frame-closure',
    });
    if (verdict.figures_match !== true) misses.push({ plate: seat.file, subjects: seat.subjects, allowance: seat.allowance, verdict });
  }
  expect(misses, `every cued frame holds exactly its named souls:\n${JSON.stringify(misses, null, 2)}`).toEqual([]);
});

test('G22b the principal seat: the cue\'s first subject is the foremost figure', async () => {
  test.setTimeout(600_000);
  const m = preflightManifest('g22-frame');
  const clause = heroClause(m.hero);
  // The guaranteed seat: the harness hero-first plate. Live plates join
  // when their cue names the hero FIRST — the only principal whose identity
  // clause the manifest can attest.
  const seats: Array<{ file: string; bytes: Buffer; seed: string }> = [];
  const heroFirstPlate = rolePlate(m, 'hero-first-scene');
  seats.push({ file: heroFirstPlate.file, bytes: topBytes(heroFirstPlate), seed: `harness-${String(heroFirstPlate.sha256).slice(0, 12)}` });
  for (const plate of m.plates) {
    if (plate.role !== 'scene' || !plate.heroFirst || !plate.heroBearing) continue;
    if (!plate.cueSubjects || plate.cueSubjects.length < 1 || plate.cueSubjects.length > 3) continue;
    seats.push({ file: plate.file, bytes: topBytes(plate), seed: `live-${String(plate.sha256).slice(0, 12)}` });
  }
  const misses: any[] = [];
  for (const seat of seats) {
    const look = await principalLook({
      bytes: seat.bytes, clause,
      idSeed: `g22b-principal-${seat.seed}`, criterion: 'g22b-frame-principal',
    });
    // Fail-closed: a boxless look is a miss — a court that cannot find a
    // foremost figure cannot call the principal honest.
    if (!look.found || !look.matches) misses.push({ plate: seat.file, found: look.found, verdict: look.verdict });
  }
  expect(misses, `the first-named subject is the foremost figure of every seat:\n${JSON.stringify(misses, null, 2)}`).toEqual([]);
});

test('G22c fixture constancy: the sealed Duchy fixture stands in both independent paints', async () => {
  test.setTimeout(600_000);
  const m = preflightManifest('g22-frame');
  const sealed = duchyFixture(path.join(HARVEST_DIR, 'fixture', 'session.json'));
  const pair1 = rolePlate(m, 'duchy-pair-1');
  const pair2 = rolePlate(m, 'duchy-pair-2');
  const verdict = await pairVerdict({
    aBytes: topBytes(pair1), bBytes: topBytes(pair2), visual: sealed.visual,
    idSeed: `g22c-pair-${String(pair1.sha256).slice(0, 12)}-${String(pair2.sha256).slice(0, 12)}`,
    criterion: 'g22c-fixture-constancy',
  });
  expect(verdict.fixture_present_in_both,
    `the sealed fixture (${sealed.name}) stands in both paints of ${sealed.place}: ${JSON.stringify(verdict)}`).toBe(true);
});

test('G22d the painted briefs carry the frame law, and the door refuses unlawful cues by name', () => {
  const m = preflightManifest('g22-frame');
  // The instrument seal first — this court sits under pinned questions.
  expect(frameQuestionsDigest(), 'the frame questions are sealed by their pin').toBe(PINNED_FRAME_QUESTIONS_SHA256);
  expect(FRAME_PROTOCOL, 'the frame protocol tag').toBe('f2');

  // The briefs the fixture store actually painted, read from the session
  // record: the pair is ONE brief minted twice, the fixture rider stands in
  // both, the closure clause ends them, and the principal clause crowns the
  // first-named subject.
  const session = JSON.parse(fs.readFileSync(path.join(HARVEST_DIR, 'fixture', 'session.json'), 'utf8'));
  const prompts = session.prompts || {};
  const sealed = duchyFixture(path.join(HARVEST_DIR, 'fixture', 'session.json'));
  expect(typeof prompts['duchy-pair-1'], 'the pair brief is recorded').toBe('string');
  expect(prompts['duchy-pair-1'], 'the pair is one brief minted twice — independence lives in the cache keys, not the words').toBe(prompts['duchy-pair-2']);
  expect(prompts['duchy-pair-1']).toContain(`Standing fixtures of ${sealed.place}`);
  expect(prompts['duchy-pair-1']).toContain(sealed.name);
  expect(prompts['duchy-pair-1']).toContain('Principal presence: Corin Voss');
  expect(prompts['duchy-pair-1']).toContain('The frame is closed:');
  expect(typeof prompts['hero-first-scene'], 'the hero-first brief is recorded').toBe('string');
  expect(prompts['hero-first-scene']).toContain(`Principal presence: ${m.hero.name}`);
  expect(prompts['hero-first-scene']).toContain(m.hero.mark);
  expect(prompts['hero-first-scene']).toContain('The frame is closed:');

  // The door, walked by the court itself — the same seated-court law the
  // keyless gate proves, exercised through the engine the app ships.
  const base = safeFallbackTurn('', 1);
  const doorErrors = (cue: any, context: any, story: any = null) =>
    validateDmTurn({ ...base, image_cue: cue, story }, [], context).errors.filter((line: string) => line.includes('image_cue'));
  const groundContext = {
    hero: m.hero.name,
    cast: [{ name: 'Corin Voss', status: 'alive' }],
    party: [],
    presence: [{ name: 'Corin Voss', ground: 'The Duchy' }],
    scene: { region: 'Larkspur Vale' },
  };
  expect(doorErrors({ kind: 'scene', subjects: ['Corin Voss'] }, { cast: [{ name: 'Corin Voss', status: 'dead' }] }).join('\n')).toContain('paints the dead');
  expect(doorErrors({ kind: 'scene', subjects: ['Corin Voss'] }, groundContext).join('\n')).toContain('paints the elsewhere');
  expect(doorErrors({ kind: 'scene', subjects: ['Nobody Such'] }, { hero: m.hero.name, cast: [{ name: 'Corin Voss', status: 'alive' }] }).join('\n')).toContain('names a soul the record does not hold');
  expect(doorErrors({ kind: 'scene', subjects: ['Corin Voss'], crowd: 'mob' }, {}).join('\n')).toContain('holds a word the law does not know');
  expect(doorErrors({ kind: 'scene', subjects: ['Corin Voss'] }, { ...groundContext, party: ['Corin Voss'] })).toEqual([]);
  expect(doorErrors({ kind: 'scene', subjects: ['Corin Voss'] }, { ...groundContext, scene: null })).toEqual([]);
});
