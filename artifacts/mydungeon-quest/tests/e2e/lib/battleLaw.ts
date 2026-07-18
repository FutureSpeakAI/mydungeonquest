// THE BATTLE INSTRUMENT (Directive X, Task 57) — the species court's bench,
// cut from frameLaw's cloth: questions and canon live in
// fixtures/battle-questions.json, sealed by sha pin. The card the harvest
// mint briefs, the canon the doom fixture seals in its journal, the visual
// the court judges, and the crossed lie tooth 16 refuses are ONE source —
// amend the file, bump protocol b1, re-pin here, and tooth 16 re-proves
// perfect separation before G23e sits again. Forced binaries only; the
// confidence scalar is a logged diagnostic, never a verdict.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { GAME_ROOT, judge } from './vision';

export const BATTLE_QUESTIONS_PATH = path.join(GAME_ROOT, 'tests', 'e2e', 'fixtures', 'battle-questions.json');
const fixture = JSON.parse(fs.readFileSync(BATTLE_QUESTIONS_PATH, 'utf8'));
export const BATTLE_PROTOCOL: string = String(fixture.protocol);

// THE PIN (instrument law): any byte change to the fixture demands a new
// pin here and a fresh sitting of tooth 16 before the species court sits.
export const PINNED_BATTLE_QUESTIONS_SHA256 = '1835d5a7d81c0a294921d2eae1bea5b597eaf2802ce54fd01186fccde43f27c6';
export function battleQuestionsDigest(): string {
  return createHash('sha256').update(fs.readFileSync(BATTLE_QUESTIONS_PATH)).digest('hex');
}

/** The sealed species card — the same bytes the doom fixture seals via
 * creature_add and the harvest mint rides into the bestiary rider. */
export function battleCard(): { species: string; visual: string; nature: string; threat: number } {
  return fixture.card;
}

/** The crossed card — a species no battle ever sealed; tooth 16's lie. */
export function crossedCard(): { species: string; visual: string } {
  return fixture.crossed;
}

// The harness cue, restated as a constant: the battle plate binds no
// journal row (originTurnHash null), so the spec holds its own testimony.
export const BATTLE_CUE = 'The marsh howlers circle the salvage sledge at dusk, low over the reed-water.';

export async function speciesVerdict(args: { bytes: Buffer; visual: string; idSeed: string; criterion: string }): Promise<any> {
  return judge({
    id: args.idSeed,
    criterion: args.criterion,
    images: [args.bytes],
    question: String(fixture.questions.species).replace('{VISUAL}', args.visual),
    schema: { species_match: 'boolean', mismatch: 'string', confidence: 'number 0..1' },
    protocol: BATTLE_PROTOCOL,
  });
}
