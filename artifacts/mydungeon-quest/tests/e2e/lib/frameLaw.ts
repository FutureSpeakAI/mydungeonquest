// THE FRAME INSTRUMENTS (Directive IX, Task 56C) — the shared bench of the
// frame courts (G22) and their teeth (13-15). The questions live in
// fixtures/frame-questions.json, sealed by sha pin: amend the file, re-pin,
// and the teeth re-prove perfect separation before any court sits. Forced
// binaries only; the confidence scalar is a logged diagnostic, never a
// verdict. The bench writes the hero's identity clause with its OWN noun
// map rather than importing the easel's pen — the court must not borrow
// the defendant's instrument to judge the defendant's work.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { GAME_ROOT, judge } from './vision';
// The same engine door the magnifier walks (stage-one box law).
import { validateBox, clampBox } from 'fatescript/magnifier';

export const FRAME_QUESTIONS_PATH = path.join(GAME_ROOT, 'tests', 'e2e', 'fixtures', 'frame-questions.json');
const fixture = JSON.parse(fs.readFileSync(FRAME_QUESTIONS_PATH, 'utf8'));
export const FRAME_PROTOCOL: string = String(fixture.protocol);

// THE PIN (instrument law): the frame questions are sealed law. Any byte
// change to the fixture demands a new pin here and a fresh sitting of
// teeth 13-15 before the frame courts may sit again.
export const PINNED_FRAME_QUESTIONS_SHA256 = '61708114eb2869a168bb96bf6c762aa9da37c811346991f7ad4dee0fd491280c';
export function frameQuestionsDigest(): string {
  return createHash('sha256').update(fs.readFileSync(FRAME_QUESTIONS_PATH)).digest('hex');
}

// The harness cues, restated as constants: the spec must hold its own
// testimony because harness plates bind to no journal row (originTurnHash
// null), so the top manifest carries no cue for them.
export const DUCHY_PAIR_SUBJECTS = ['Corin Voss', 'Edda'];
export function heroFirstSubjects(heroName: string): string[] { return [heroName, 'Edda']; }

/** The court's own noun map — deliberately NOT the easel's identityClause. */
export function heroClause(hero: { name: string; mark: string; presentation: string }): string {
  const noun = hero.presentation === 'feminine' ? 'a woman' : hero.presentation === 'masculine' ? 'a man' : 'a person';
  return `${hero.name} — ${noun}; marked by ${hero.mark}`;
}

export function closureQuestion(subjects: string[], allowance: 'none' | 'background'): string {
  return String(fixture.questions.closure)
    .replace('{SUBJECTS}', subjects.map((name, index) => `${index + 1}. ${name}`).join('  '))
    .replace('{ALLOWANCE}', String(allowance === 'background' ? fixture.questions.allowance_background : fixture.questions.allowance_none));
}

export async function closureVerdict(args: { bytes: Buffer; subjects: string[]; allowance: 'none' | 'background'; idSeed: string; criterion: string }): Promise<any> {
  return judge({
    id: args.idSeed,
    criterion: args.criterion,
    images: [args.bytes],
    question: closureQuestion(args.subjects, args.allowance),
    schema: { figures_match: 'boolean', counted: 'integer', unaccounted: 'string', confidence: 'number 0..1' },
    protocol: FRAME_PROTOCOL,
  });
}

/** Two-stage principal look: box the foremost figure, magnify, judge the
 * crop against the clause. Boxless is fail-closed — a court that cannot
 * find a principal figure cannot call the principal honest. */
export async function principalLook(args: { bytes: Buffer; clause: string; idSeed: string; criterion: string }): Promise<{ found: boolean; matches: boolean; box: any; verdict: any }> {
  const boxVerdict = await judge({
    id: `${args.idSeed}-box`,
    criterion: args.criterion,
    images: [args.bytes],
    question: String(fixture.questions.principal_box),
    schema: { found: 'boolean', x: 'number 0..1', y: 'number 0..1', w: 'number 0..1', h: 'number 0..1' },
    protocol: FRAME_PROTOCOL,
  });
  const box = validateBox(boxVerdict);
  if (!box) return { found: false, matches: false, box: null, verdict: boxVerdict };
  const meta = await sharp(args.bytes).metadata();
  const rect = clampBox({ box, width: meta.width || 1, height: meta.height || 1 });
  const crop = await sharp(args.bytes).extract(rect).png().toBuffer();
  const identity = await judge({
    id: `${args.idSeed}-identity`,
    criterion: args.criterion,
    images: [crop],
    question: String(fixture.questions.principal_identity).replace('{CLAUSE}', args.clause),
    schema: { figure_matches: 'boolean', mismatch: 'string', confidence: 'number 0..1' },
    protocol: FRAME_PROTOCOL,
  });
  return { found: true, matches: identity.figure_matches === true, box: rect, verdict: identity };
}

export async function pairVerdict(args: { aBytes: Buffer; bBytes: Buffer; visual: string; idSeed: string; criterion: string }): Promise<any> {
  return judge({
    id: args.idSeed,
    criterion: args.criterion,
    images: [args.aBytes, args.bBytes],
    question: String(fixture.questions.fixture_pair).replace('{VISUAL}', args.visual),
    schema: { fixture_present_in_both: 'boolean', inconsistency: 'string', confidence: 'number 0..1' },
    protocol: FRAME_PROTOCOL,
  });
}

/** The sealed Duchy fixture, read from the fixture session's own journal —
 * the courts take the canon from the record, never from a spec constant. */
export function duchyFixture(sessionFixturePath: string): { place: string; name: string; visual: string } {
  const session = JSON.parse(fs.readFileSync(sessionFixturePath, 'utf8'));
  const row = (session.logs || []).map((log: any) => log?.dm?.story?.fixture_add).find((add: any) => add && add.place === 'The Duchy');
  if (!row) throw new Error('the fixture session holds no Duchy fixture seal — the frame courts cannot sit');
  return row;
}
