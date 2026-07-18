// ============================================================
// LAW X — THE PLATE'S CAPTION (0.9.0). One PASS line walking
// every band of the caption court in the ONE dm_turn validator:
// length (40–220), the capital opening, the terminal close, the
// sentence ceiling (two), the truncation ban, and the quote
// court — a caption that is a whitespace-folded substring of
// the folded narration merely quotes the page and is refused
// (the legacy sliced captions live on replay-only). The moment
// answers for shape: present means 1–480 characters of prose.
// ============================================================
import assert from 'node:assert/strict';
import { mockDmTurn } from 'fatescript/mockDm';
import { makeEntropy, validateDmTurn } from 'fatescript/protocol';
import { artDirectorSits } from '../server/artDirector.js';

const entropy = makeEntropy(() => 0.5);
const raw = mockDmTurn({
  campaign: { title: 'Caption Court', homeRegion: 'Larkspur Vale' },
  hero: { name: 'Wren', skills: ['Investigation'] },
  story: { beat: { index: 0, title: 'The Ordinary Flame' }, regions: [{ name: 'Larkspur Vale' }] },
  player: 'I press on.',
  entropy,
  resolution: { outcome: 'success — the die spoke', total: 15 },
  turn: 2
});
const sealed = artDirectorSits(raw);
assert.ok(sealed.image_cue?.caption, 'the scaffold carries a composed caption');

const judge = (mutate) => {
  const turn = JSON.parse(JSON.stringify(sealed));
  mutate(turn.image_cue);
  return validateDmTurn(turn, entropy, {});
};
const refused = (verdict, needle) =>
  !verdict.ok && verdict.errors.some((line) => line.includes(needle));

// The composed caption passes the whole court.
assert.ok(judge(() => {}).ok, 'the Art Director\'s own composition is lawful');

// THE QUOTE COURT — the regression tooth: a whole narration sentence,
// capital and terminal and single, is refused for quoting the page.
const firstSentence = `${sealed.narration_blocks[0].text.split('.')[0]}.`;
assert.ok(firstSentence.length >= 40, 'the scaffold sentence is long enough to test the quote court alone');
assert.ok(refused(judge((cue) => { cue.caption = firstSentence; }), 'merely quotes the page'),
  'a sliced-from-the-page caption is refused by the quote court');

// LENGTH — under, over, and both fences exact.
assert.ok(refused(judge((cue) => { cue.caption = 'Too short a line to caption anything.'; }), '40-220'), 'thirty-nine characters and under are refused');
assert.ok(refused(judge((cue) => { cue.caption = `A${'a'.repeat(219)}.`; }), '40-220'), 'two hundred twenty-one characters are refused');
assert.ok(judge((cue) => { cue.caption = `A${'a'.repeat(218)}.`; }).ok, 'two hundred twenty exact passes');

// THE OPENING AND THE CLOSE.
assert.ok(refused(judge((cue) => { cue.caption = 'a quiet study of the marked threshold, held in amber light.'; }), 'open on a capital'));
assert.ok(refused(judge((cue) => { cue.caption = 'A quiet study of the marked threshold, held in amber light'; }), 'terminal punctuation'));

// THE TRUNCATION BAN — both the ellipsis character and the three-dot run.
assert.ok(refused(judge((cue) => { cue.caption = 'A quiet study\u2026 of the marked threshold, held in amber light.'; }), 'truncation mark'));
assert.ok(refused(judge((cue) => { cue.caption = 'A quiet study... of the marked threshold, held in amber.'; }), 'truncation mark'));

// THE SENTENCE CEILING — two stand, three fall.
assert.ok(judge((cue) => { cue.caption = 'Amber light holds the stone threshold fast. Wren studies the mark alone.'; }).ok, 'two sentences stand');
assert.ok(refused(judge((cue) => { cue.caption = 'The first stands tall here. The second waits below. The third breaks the law.'; }), 'one or two sentences'));

// MACHINERY IS NOT PROSE.
assert.ok(refused(judge((cue) => { cue.caption = 42; }), 'prose, not machinery'));

// THE MOMENT'S SHAPE — present means 1-480 of the page's own prose.
assert.ok(refused(judge((cue) => { cue.moment = ''; }), 'image_cue.moment'), 'a present-but-empty moment is refused');
assert.ok(refused(judge((cue) => { cue.moment = 'x'.repeat(481); }), 'image_cue.moment'), 'past the brief\'s cap is refused');
assert.ok(judge((cue) => { cue.moment = 'x'.repeat(480); }).ok, 'the cap exact passes');

// LEGACY RIDES FREE — a replayed page sealed before the chair opened
// carries neither caption nor moment, and the court stays out of session.
assert.ok(judge((cue) => { delete cue.caption; delete cue.moment; }).ok, 'a caption-less cue is judged only on its old laws');

console.log('PASS — Law X holds every band: the quote court, both length fences, the opening, the close, the sentence ceiling, the truncation ban; the moment answers for shape and legacy rides free.');
