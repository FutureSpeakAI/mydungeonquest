// THE BACK-COMPAT GATE — a pre-0.7 campaign loads untouched.
// Older FateScript saves carry none of the newer blocks: no threads
// ledger, no trove or purses, no scene, no party or fixtures, no
// bestiary, not even a version mark. The law of this gate: every
// reader walks such a save WITHOUT writing a byte into it (the whole
// save is deep-frozen — in strict ESM any hidden write throws), the
// briefing answers with honest empties (never inventions, never a
// crash), the reducers upgrade ON WRITE ONLY (the returned codex may
// grow lawful blocks; the input never does), and the mock DM plays a
// full lawful turn on the old save as if the years had not passed.
import assert from 'node:assert/strict';
import {
  initCodex, applyStoryUpdates, storyBlock, chapterInfo, actInfo
} from '../src/story.js';
import { orderFeed, recapFor, renderKindOf } from '../src/sequencing.js';
import { clockOf, clockWords } from '../src/clock.js';
import { troveOf, purseOf, heldBy } from '../src/trove.js';
import { presenceOf, partyOf, elsewhereOf } from '../src/presence.js';
import { threadNames } from '../src/room.js';
import { validateDmTurn, makeEntropy } from '../src/protocol.js';
import { mockDmTurn } from '../src/mockDm.js';
import { createHero } from '../src/rules.js';
import { fixtureEntries, HERO } from './fixtures.mjs';

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
};

// --- 1. The old save: a modern genesis, stripped of every post-0.6 block ---
const modern = initCodex('classic-epic', {
  arc: { title: 'The Ashen Vale', evil_plot: 'The Pale King drinks the valley dry', stakes: 'Every hearth in the vale', style_bible: 'Iron and candlelight' }
});
const { threads, trove, purses, scene, party, fixtures, bestiary, version, ...oldCodex } = modern;
oldCodex.cast = [
  { id: 's-mira', name: 'Mira', role: 'healer', visual: 'A grey-eyed healer', voice: 'A warm elder voice', goal: 'restore the well', secret: '', status: 'active', bond: 3, last_seen: 'Harrow Ford', known_facts: [], bond_arc: [], introduced_turn: 1 },
  { id: 's-brannoc', name: 'Brannoc', role: 'villain', visual: 'The Pale King', voice: 'A cold voice', goal: 'drain the vale', secret: '', status: 'active', bond: 0, last_seen: 'the drowned keep', known_facts: [], bond_arc: [], introduced_turn: 1 }
];
oldCodex.regions = [{ name: 'Harrow Ford', description: 'A river crossing of black stones', state: 'poisoned' }];
oldCodex.memoir = ['The well turned black on the third night.'];
oldCodex.blight = 2;
assert.ok(!('threads' in oldCodex) && !('trove' in oldCodex) && !('version' in oldCodex), 'the old save truly lacks the newer blocks');

// Old logs in the old shape: no kind field, no ticks, no newer ops.
const oldLogs = fixtureEntries();
const campaign = { id: 'old-tale', title: 'The Unwritten Road', hero: { name: HERO.name }, codex: oldCodex, logs: oldLogs, completed: false };
deepFreeze(oldCodex); deepFreeze(oldLogs); deepFreeze(campaign);

// --- 2. The briefing answers with honest empties, never a crash ---
const block = storyBlock(oldCodex);
assert.equal(block.beat.index, 0, 'the standing beat still seats');
assert.deepEqual(block.open_threads, [], 'no thread ledger: an honest empty, not an invention');
assert.deepEqual(block.trove_state, [], 'no trove: honest empty');
assert.deepEqual(block.purse_state, [], 'no purses: honest empty');
assert.equal(block.scene_state, null, 'no scene: honest null');
assert.deepEqual(block.party_state, [], 'no party: honest empty');
assert.deepEqual(block.fixture_state, [], 'no fixtures: honest empty');
assert.deepEqual(block.bestiary_state, [], 'no bestiary: honest empty');
assert.equal(block.evil_design, '[GATED UNTIL REVELATION]', 'the revelation gate still holds on an old save');
assert.ok(chapterInfo(oldCodex) && actInfo(oldCodex), 'chapter and act still name themselves');

// --- 3. The feed and the recap still walk the old record ---
const seats = orderFeed(oldLogs, [], []);
assert.equal(seats.length, oldLogs.length, 'every old row seats');
assert.ok(seats.every((seat) => seat.kind === 'turn'), 'kindless rows are turns, never mistaken for ticks');
assert.equal(renderKindOf(oldLogs[0]), 'turn');
const recap = recapFor({ ...campaign, logs: oldLogs });
assert.equal(recap.kind, 'mast', 'no pages: the mast alone orients, generated from nothing');

// --- 4. The clock, the purse, the trove, the scene: honest absences ---
assert.ok(Number.isFinite(clockOf(oldLogs).day), 'the clock still reads a record with no time marks');
assert.equal(typeof clockWords(oldLogs), 'string');
assert.deepEqual(troveOf(campaign), [], 'no item ops: an empty trove, never a crash');
assert.equal(purseOf(campaign, HERO.name).coin, 0, 'no purse ops: zero coin, honestly');
assert.deepEqual(heldBy(campaign, HERO.name), [], 'nothing held');
assert.doesNotThrow(() => { presenceOf(campaign); partyOf(campaign); elsewhereOf(campaign); }, 'the scene and party courts sit without evidence and convict nobody');
assert.deepEqual(threadNames(block), [], 'the room reads the old briefing: an empty ledger, in session');

// --- 5. Upgrade on write only: the reducer grows the COPY, never the save ---
const next = applyStoryUpdates(oldCodex, {
  cast_update: [{ name: 'Mira', fact_add: 'Named the Pale King as the poisoner' }],
  memoir_add: 'The ford remembers.'
}, { turn: 5 });
assert.ok(next !== oldCodex, 'the reducer returns a new codex');
assert.ok(next.cast.find((soul) => soul.name === 'Mira').known_facts.length >= 1, 'the change lands on the copy');
assert.equal(oldCodex.cast.find((soul) => soul.name === 'Mira').known_facts.length, 0, 'the old save is untouched');
assert.ok(!('trove' in oldCodex), 'no block was invented onto the old save');

// --- 6. The mock DM plays the old save whole ---
const hero = createHero({ name: HERO.name, className: HERO.className });
const entropy = makeEntropy(() => 0.5);
const dm = mockDmTurn({ campaign: { ...campaign, codex: oldCodex }, hero, story: block, player: 'I cross the ford at dusk.', entropy, resolution: null, turn: 1 });
const verdict = validateDmTurn(dm, entropy, { cast: oldCodex.cast });
assert.equal(verdict.ok, true, `an old save plays a lawful turn: ${(verdict.errors || []).join('; ')}`);

console.log('PASS — the back-compat gate: a pre-0.7 save walks every reader deep-frozen (loading writes nothing), the briefing answers with honest empties behind the standing revelation gate, the feed and recap still walk the old record, absent blocks read as absences (never crashes, never inventions), reducers upgrade only the copy, and the mock DM plays the old tale whole.');
