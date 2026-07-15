// THE WIKI GATE — cards speak story, cite the record, and link both ways.
import assert from 'node:assert/strict';
import { voiceLineOf, wordsLine, tieLine } from '../src/lib/wikiText.js';
import { buildCards } from '../src/lib/cards.js';

assert.equal(voiceLineOf({ gender: 'feminine', age_band: 'elder', timbre: 'warm' }), "A warm elder woman's voice");
assert.equal(voiceLineOf({ gender: 'masculine', timbre: 'gravel' }), "A gravel man's voice");
assert.equal(voiceLineOf({ presentation: 'feminine' }), "A woman's voice", 'the hero speaks through presentation');
assert.equal(voiceLineOf({}), '', 'a wordless card claims nothing');
assert.ok(!/gender|bin|register|fem\b|masc\b/i.test(voiceLineOf({ gender: 'feminine', age_band: 'elder', timbre: 'warm' })), 'no machinery words on player surfaces');

const hero = { name: 'Sera Vale', presentation: 'feminine' };
const entries = [
  { turn: 1, dm: { story: { cast_add: [{ name: 'Mirabel', role: 'her mother', visual: 'grey braid', voice: '', goal: '', secret: '' }] }, narration_blocks: [{ speaker: 'Mirabel', text: 'Come home.' }] } },
  { turn: 4, dm: { story: null, narration_blocks: [{ speaker: 'Mirabel', text: 'The road remembers.' }, { speaker: 'Sera', text: 'Then let it lead.' }] } }
];
const { cards } = buildCards({ hero, entries });
const mira = cards['mirabel'];
assert.equal(wordsLine(mira), 'First words — “Come home.” (turn 1) · Last — “The road remembers.” (turn 4)', 'words are cited to their turns');
const kin = mira.ties.find((t) => t.type === 'kin');
assert.equal(tieLine(kin), 'mother of Sera Vale');
const met = cards['sera vale'].ties.find((t) => t.type === 'met' && t.to === 'Mirabel');
const back = mira.ties.find((t) => t.type === 'met' && t.to === 'Sera Vale');
assert.ok(met && back, 'links resolve both directions');
console.log('PASS — the wiki gate: story-worded voices, cited words, backlinks both ways, no machinery on the page.');
