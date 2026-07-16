// THE BEARING GATE — Bearing, Signature & Roster hold or this file
// turns the build red. The card IS the prompt: locked canon verbatim,
// signature while carried, wounds the record shows, age the clock has
// walked — and the dead outside time entirely.
import assert from 'node:assert/strict';
import { buildCards } from '../src/cards.js';
import { signatureOf, assertSignature, bearingFor, bearingBlock, paintRoster, ROSTER_CAP } from '../src/bearing.js';
import { fixtureEntries, HERO } from './fixtures.mjs';

// One extra sealed turn: the record marks Mira with a wound.
const entries = [
  ...fixtureEntries(),
  {
    id: 'e5', player: 'I bind her arm.', deed: 'Bind her arm', sent: true, redacted: false, resolution: null, ts: 5,
    dm: {
      narration_blocks: [{ text: 'The burn will scar, but the hand will hold.' }], suggestions: [], roll_request: null,
      state_updates: null, combat: null, cinematic: null,
      story: { cast_update: [{ name: 'Mira', fact_add: 'Bears a burn-scar across her forearm' }] },
      image_cue: null, dialogue_cue: null, time_advance: null, entropy_use: []
    }
  }
];
const { cards } = buildCards({ hero: HERO, entries });

// The locked visual travels verbatim — consistent terminology IS consistency.
const mira = bearingFor(cards.mira, { yearsSince: 0, carried: [{ item: 'rowan charm', qty: 1 }] });
assert.equal(mira.visual, 'A grey-eyed healer with rowan-stained hands');
assert.ok(bearingBlock(mira).includes('A grey-eyed healer with rowan-stained hands.'));

// Wounds are read from the record, and only the record.
assert.ok(mira.wounds.some((gloss) => gloss.includes('burn-scar')), 'the scar the record wrote is the scar the paint shows');

// The dead do not age: Edda's band froze the turn she fell.
const edda = bearingFor(cards.edda, { yearsSince: 40 });
assert.equal(edda.band, 'adult');
assert.equal(edda.dead, true);
assert.equal(edda.aged, false);
assert.ok(bearingBlock(edda).includes('at rest'));
assert.ok(!bearingBlock(edda).includes('Carries:'), 'the dead carry nothing forward');

// The living age by the ladder, and the block says so honestly.
const ansel = {
  identity: { name: 'Ansel', age_band: 'young', mark: 'a silver crescent locket', canon: { visual: 'A copper-haired courier in a patched blue coat' } },
  state: { status: 'active', bond: 2 }, chronicle: []
};
const aged = bearingFor(ansel, { yearsSince: 15, carried: [{ item: 'A Silver Crescent Locket', qty: 1 }, { item: 'road bread', qty: 2 }] });
assert.equal(aged.band, 'adult');
assert.equal(aged.aged, true);
assert.ok(bearingBlock(aged).includes('Signature: a silver crescent locket — always visible.'));
assert.ok(bearingBlock(aged).includes('the years show'));

// The signature follows the ledger: gifted away, the paint lets it go.
const gifted = bearingFor(ansel, { yearsSince: 0, carried: [{ item: 'road bread', qty: 2 }] });
assert.equal(gifted.signature, null);
assert.ok(bearingBlock(gifted).includes('no longer carries a silver crescent locket'));
// A silent ledger is not a gift: with no inventory known, the signature stands.
assert.equal(bearingFor(ansel, { yearsSince: 0 }).signature, 'a silver crescent locket');

// The Signature Law has a court.
assert.ok(assertSignature(ansel.identity).ok);
const bare = assertSignature({ name: 'Wren' });
assert.equal(bare.ok, false);
assert.ok(bare.errors[0].includes('Wren enters without a signature'));
assert.equal(signatureOf({}), null);

// The roster: at most three painted — speaker, then villain, then bond —
// the same three every time; everyone else is staged in prose.
const rosterCards = {
  mira: { identity: { role: 'healer' }, state: { bond: 3 } },
  tam: { identity: { role: 'scout' }, state: { bond: 1 } },
  brannoc: { identity: { role: 'villain' }, state: { bond: 0 } },
  edda: { identity: { role: 'lantern-bearer' }, state: { bond: 2 } }
};
const scene = { present: ['Mira', 'Tam', 'Brannoc', 'Edda'], speaker: 'Tam', cards: rosterCards };
const roster = paintRoster(scene);
assert.equal(ROSTER_CAP, 3);
assert.deepEqual(roster.painted, [{ name: 'Tam', slot: 1 }, { name: 'Brannoc', slot: 2 }, { name: 'Mira', slot: 3 }]);
assert.deepEqual(roster.staged, ['Edda']);
assert.equal(JSON.stringify(paintRoster(scene)), JSON.stringify(roster), 'the same scene casts the same roster');
assert.equal(paintRoster(scene, 2).painted.length, 2, 'the cap is the cap');

console.log('PASS \u2014 the bearing gate: the locked visual travels verbatim, wounds come from the record, the dead never age, the signature rides the ledger \u2014 gifted away, the paint lets go \u2014 and the roster holds at three, cast the same way every time.');
