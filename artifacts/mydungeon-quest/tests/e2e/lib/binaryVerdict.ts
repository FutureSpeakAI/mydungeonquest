import fs from 'node:fs';
import path from 'node:path';
import { GAME_ROOT, judge, noteLowConfidence } from './vision';

// ============================================================
// THE BINARY VERDICT (TASK 54B §1). A self-reported confidence scalar
// is the judge's mannerism, not a measurement — the 0.62 hedge stamped
// on six unrelated plates proved it. Coherence courts now rest on three
// FORCED BINARIES, each true or false with no middle ground:
//   element_present  — the judge NAMES one element the text states and
//                      the image shows (the echo check below proves the
//                      named element really came from the text — an
//                      element the text never stated is a non-answer);
//   action_matches   — what happens in the image is what the text says
//                      happens (texts with no action can only be failed
//                      by a clearly different staged act);
//   no_contradiction — nothing visible contradicts the text.
// The verdict is the CONJUNCTION. A miss names the false binary. The
// scalar is still requested and logged to the yellow ledger as a
// diagnostic — it DECIDES NOTHING.
//
// The question texts live in fixtures/binary-questions.json, pinned
// byte-stable: tooth 11 (the calibration probe) hashes that file and
// re-proves perfect separation on the sealed probe set whenever a text
// changes. Amending a text bumps `protocol` — one lawful re-judge (§4).
// ============================================================

export const BINARY_QUESTIONS_PATH = path.join(GAME_ROOT, 'tests', 'e2e', 'fixtures', 'binary-questions.json');

const fixture = JSON.parse(fs.readFileSync(BINARY_QUESTIONS_PATH, 'utf8'));

export const BINARY_PROTOCOL: string = String(fixture.protocol);

export type BinaryKind = 'moment' | 'page' | 'caption';

export interface BinaryOutcome {
  pass: boolean;
  falseBinaries: string[];
  verdict: any;
}

export function binaryQuestion(kind: BinaryKind, prose: string): string {
  const template = fixture.questions[kind];
  if (typeof template !== 'string' || !template.includes('{PROSE}')) {
    throw new Error(`binary-questions.json holds no lawful "${kind}" template`);
  }
  return template.replace('{PROSE}', prose);
}

export async function binaryVerdict(args: {
  kind: BinaryKind;
  prose: string;
  bytes: Buffer;
  idSeed: string;
  criterion: string;
}): Promise<BinaryOutcome> {
  const { kind, prose, bytes, idSeed, criterion } = args;
  const verdict = await judge({
    id: idSeed,
    protocol: BINARY_PROTOCOL,
    criterion,
    images: [bytes],
    question: binaryQuestion(kind, prose),
    schema: {
      element_present: 'boolean',
      action_matches: 'boolean',
      no_contradiction: 'boolean',
      element: 'string',
      confidence: 'number 0..1',
    },
  });
  const echoed = String(verdict.element || '').toLowerCase().split(/[^a-z]+/)
    .some((word) => word.length >= 4 && prose.toLowerCase().includes(word));
  const falseBinaries: string[] = [];
  if (verdict.element_present !== true) falseBinaries.push('element_present');
  else if (!echoed) falseBinaries.push('element_present (named element not from the text)');
  if (verdict.action_matches !== true) falseBinaries.push('action_matches');
  if (verdict.no_contradiction !== true) falseBinaries.push('no_contradiction');
  // The scalar goes to the yellow ledger as a diagnostic — nothing more.
  noteLowConfidence(`${criterion}:${idSeed}`, Number(verdict.confidence));
  return { pass: falseBinaries.length === 0, falseBinaries, verdict };
}
