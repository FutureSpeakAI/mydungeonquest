// THE CARD GATE — cards are derived state: deterministic on replay, identity
// immutable after introduction, every chronicle line citing a real turn.
import assert from 'node:assert/strict';
import { buildCards } from '../src/lib/cards.js';

const hero = { name: 'Sera Vale', ancestry: 'Human', className: 'Knight', bearing: 'dented plate', presentation: 'feminine', mark: 'a white scar' };
const entries = [
  { turn: 1, dm: { story: { cast_add: [
    { name: 'Mirabel', role: 'her mother, the miller', visual: 'grey braid', voice: 'low', goal: 'keep the mill', secret: '', voice_card: { gender: 'feminine', age: 'elder', timbre: 'warm' } },
    { name: 'The Regent of Ash', role: 'villain', visual: 'a crown of cinders', voice: 'cold', goal: 'unmake the vale', secret: '' }
  ] } , narration_blocks: [ { speaker: 'Mirabel', text: 'Come home before the frost, Sera.' } ] } },
  { turn: 2, dm: { story: { cast_add: [ { name: 'Mirabel', role: 'an imposter role', visual: 'WRONG', voice: '', goal: '', secret: '' } ],
    cast_update: [ { name: 'Mirabel', bond_delta: 3, bond_reason: 'She forgave the leaving.' }, { name: 'Mirabel', fact_add: 'Knows the old road under the mill.' } ] },
    narration_blocks: [ { speaker: 'Mirabel', text: 'The road remembers you.' }, { speaker: 'Sera', text: 'Then let it lead.' } ] } },
  { turn: 3, dm: { story: { cast_update: [ { name: 'Mirabel', status: 'dead', last_seen: 'at the mill door' } ] },
    narration_blocks: [ { speaker: 'Mirabel', text: 'THE DEAD MUST NOT ACCRUE THIS' } ] } }
];

const one = buildCards({ hero, entries });
const two = buildCards({ hero, entries });
assert.deepEqual(one, two, 'replay is byte-identical');

const mira = one.cards['mirabel'];
assert.equal(mira.identity.role, 'her mother, the miller', 'a second cast_add cannot touch identity');
assert.equal(mira.identity.canon.visual, 'grey braid');
assert.equal(mira.identity.gender, 'feminine', 'voice_card rides the card');
assert.ok(mira.ties.some((t) => t.type === 'kin' && t.to === 'Sera Vale'), 'her station ties her to the hero as kin');
assert.equal(mira.state.bond, 3, 'updates move state');
assert.ok(mira.ties.some((t) => t.type === 'ally'), 'a proven bond becomes an ally tie');
assert.equal(mira.firstWords.text, 'Come home before the frost, Sera.');
assert.equal(mira.lastWords.text, 'The road remembers you.', 'the dead accrue no further words');
assert.ok(mira.chronicle.every((c) => [1, 2, 3].includes(c.turn)), 'every chronicle line cites a real turn');
assert.equal(mira.state.status, 'dead');

const regent = one.cards['the regent of ash'];
assert.ok(regent.ties.some((t) => t.type === 'enemy' && t.to === 'Sera Vale'), 'the villain is tied as enemy');
const seraCard = one.cards['sera vale'];
assert.equal(seraCard.identity.gender, 'feminine', 'the hero has a card too');
assert.ok(seraCard.ties.some((t) => t.type === 'met' && t.to === 'Mirabel'), 'copresence ties both ways');
console.log('PASS — the card gate: deterministic replay, locked identity, lawful state, cited chronicle, kin and enemy ties, the hero carded.');
