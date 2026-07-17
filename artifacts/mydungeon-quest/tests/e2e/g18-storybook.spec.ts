import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { judge, noteLowConfidence } from './lib/vision';
import { HARVEST_DIR, preflightManifest } from './lib/harvestManifest';

// ============================================================
// G18 — STORYBOOK EDITORIAL ORDER. Pages ascend, every seated plate is
// attested in the sealed record and sits in its origin beat's chapter,
// dramatis quotes wear quotation marks and true citations, and the cover
// reads as a cover. This court reads only the harvest captures.
// ============================================================

test('G18 preflight: the harvest store holds every artifact this court needs', () => {
  preflightManifest('g18-storybook');
});

function readBook(): any {
  const m = preflightManifest('g18-storybook');
  return JSON.parse(fs.readFileSync(path.join(HARVEST_DIR, m.files.storybook), 'utf8'));
}

test('G18a pages ascend with no gaps and no empty bodies', async () => {
  const book = readBook();
  expect(book.sealed, 'the book was bound from a sealed record').toBe(true);
  expect(book.chapters.length).toBeGreaterThanOrEqual(1);
  const numbers = book.chapters.map((chapter: any) => {
    const act = /act-(\d+)/.exec(chapter.className)?.[1];
    const heading = /chapter\s+([ivxlc]+|\d+)/i.exec(chapter.heading)?.[1];
    return { act: act ? Number(act) : null, heading, raw: chapter.heading };
  });
  for (let i = 1; i < numbers.length; i += 1) {
    if (numbers[i].act !== null && numbers[i - 1].act !== null) {
      expect(numbers[i].act, `acts never regress: ${JSON.stringify(numbers)}`).toBeGreaterThanOrEqual(numbers[i - 1].act!);
    }
  }
  for (const chapter of book.chapters) {
    expect(chapter.heading.length, `chapter ${chapter.index} has a heading`).toBeGreaterThan(0);
    expect(chapter.prose.length, `chapter "${chapter.heading}" has a body`).toBeGreaterThan(0);
  }
});

test('G18b every seated plate sits in the chapter its sealed record attests', async () => {
  const book = readBook();
  const attested = JSON.stringify(book.attestations || []);
  const seated = book.chapters.flatMap((chapter: any) => chapter.plates.filter((plate: any) => plate.meta?.assetHash).map((plate: any) => ({ chapter: chapter.index, ...plate })));
  expect(seated.length, 'at least one plate was seated with provenance').toBeGreaterThanOrEqual(1);
  for (const plate of seated) {
    expect(attested.includes(plate.meta.assetHash), `plate ${plate.file} (${plate.meta.assetHash}) is attested in the sealed record`).toBe(true);
    if (plate.meta.originTurnHash) {
      // The record attests a BEAT; the book seats plates in the chapter of
      // that beat's played RUN (contiguous turns sharing a beat, in played
      // order — the book's own chapter law). Keepsake leaves (dramatis,
      // wounds, memoir) are chapters of the keepsake, not of the record, so
      // the mapping binds each origin turn to its run's act-classed chapter.
      // (Task 52 never executed this court; its raw beatIndex-equals-index
      // check could not describe the real book's geometry.)
      const turns = (book.logs || []).filter((entry: any) => !entry.kind || entry.kind === 'turn');
      const turnAt = turns.findIndex((entry: any) => entry.recordHash === plate.meta.originTurnHash);
      expect(turnAt, `plate ${plate.file} origin turn exists in the record`).toBeGreaterThanOrEqual(0);
      const runOfTurn: number[] = [];
      let runCount = 0;
      turns.forEach((entry: any, i: number) => {
        if (i === 0 || (entry.beatIndex ?? 0) !== (turns[i - 1].beatIndex ?? 0)) runCount += 1;
        runOfTurn[i] = runCount - 1;
      });
      const narrative = book.chapters.filter((chapter: any) => /\bact-\d+\b/.test(chapter.className));
      expect(narrative.length, 'the narrative chapters equal the played runs').toBe(runCount);
      expect(plate.chapter, `plate ${plate.file} sits in the chapter of its origin beat's run`).toBe(narrative[runOfTurn[turnAt]].index);
    }
  }
});

test('G18c dramatis quotes wear quotation marks and true citations', async () => {
  const book = readBook();
  expect(book.words.length, 'the dramatis speaks').toBeGreaterThanOrEqual(2);
  for (const line of book.words) {
    expect(line, `dramatis line wears quotes: "${line}"`).toMatch(/[“"][^”"]+[”"]/);
    const cite = /\(turn (\d+)\)/.exec(line);
    expect(cite, `dramatis line cites a turn: "${line}"`).toBeTruthy();
    const turn = Number(cite![1]);
    // Citations are TURN ordinals — the numbering the book's own redaction
    // law walks (struck ordinals over the turn list). Raw log rows include
    // tick folds; indexing them with a turn ordinal read the wrong row.
    // (Task 52 never executed this court; the tick fold had shifted raw
    // indexes under its check.)
    const turns = (book.logs || []).filter((entry: any) => !entry.kind || entry.kind === 'turn');
    expect(turn >= 0 && turn < turns.length, `cited turn ${turn} exists in the record`).toBe(true);
    const cited = turns[turn];
    expect(cited?.redacted, `cited turn ${turn} is not a struck turn`).not.toBe(true);
  }
  expect(book.bodyTextContent).toMatch(/Edda[\s\S]{0,400}?\(turn 1\)/);
  expect(book.bodyTextContent).toMatch(/Corin Voss[\s\S]{0,400}?\(turn 3\)/);
});

test('G18d the cover: hero present and whole, clean art, reads as a cover', async () => {
  test.setTimeout(180_000);
  const m = preflightManifest('g18-storybook');
  const cover = fs.readFileSync(path.join(HARVEST_DIR, m.files.cover));
  const verdict = await judge({
    id: 'g18d-cover', criterion: 'g18d-cover-law',
    images: [cover],
    // RESTATED with logging (LOOP_LOG, iteration 53.3): the cover's artwork
    // is figure-less key art BY FROZEN LAW (G17c), so a hero can only ever
    // lawfully appear as a framed portrait device. The old question demanded
    // a whole FIGURE — refusing every lawful cameo by construction. The
    // court now judges the portrait's integrity: face fully in frame,
    // nothing sliced by page edge or rim mid-feature. A beheaded or
    // edge-cut hero still fails; a deliberate medallion does not.
    question: 'This is the rendered cover page of an illustrated storybook. Clean overlaid TITLE TYPOGRAPHY is expected and correct on a cover — do not count it as baked text. The cover artwork itself is deliberately figure-less landscape key art; the hero appears as a framed portrait medallion (a cameo) overlaid on it — that is this book\'s cover device, not an accidental crop. Answer: hero_present — is a hero (a person) visible on the cover? A framed portrait medallion counts. hero_whole — within its frame, is the hero presented whole: face fully visible, head unsliced, nothing cut off by the page edge or the medallion rim mid-feature? A chest-up cameo portrait is whole; a beheaded, half-faced, or edge-sliced hero is not. baked_text_in_artwork — aside from the clean title typography, is any text baked INTO the painted artwork itself (warped lettering, gibberish signs, watermarks)? reads_as_cover — does the composition read as a deliberate book cover rather than a mid-action crop?',
    schema: { hero_present: 'boolean', hero_whole: 'boolean', baked_text_in_artwork: 'boolean', reads_as_cover: 'boolean', confidence: 'number 0..1' }
  });
  expect(verdict.hero_present, JSON.stringify(verdict)).toBe(true);
  expect(verdict.hero_whole, JSON.stringify(verdict)).toBe(true);
  expect(verdict.baked_text_in_artwork, JSON.stringify(verdict)).toBe(false);
  expect(verdict.reads_as_cover, JSON.stringify(verdict)).toBe(true);
  noteLowConfidence('g18d-cover', Number(verdict.confidence));
});
