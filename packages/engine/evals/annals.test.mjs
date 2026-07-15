// THE LONG MEMORY GATE — the Long Memory Law holds or this file turns the build red.
import assert from 'node:assert/strict';
import { composeAnnal, assertAnnalLawful, annalEntry } from '../src/memoir.js';
import { fixtureCodex, fixtureEntries, HERO } from './fixtures.mjs';

const entries = fixtureEntries();
const codex = fixtureCodex();
const record = { entries, codex, hero: HERO };
const opts = { entries, codex, hero: HERO, actIndex: 0, actName: 'The Ford' };

// The template is deterministic and speaks in the record's own words.
const annal = composeAnnal(opts);
assert.equal(annal, composeAnnal(opts), 'the same record composes the same annal');
assert.ok(annal.startsWith('Act 1 \u2014 The Ford.'));
assert.ok(annal.includes('Edda fell'), 'the fallen are remembered');
assert.ok(annal.includes('Mira'), 'the living are carried forward');

// The court passes what the record holds…
const verdict = assertAnnalLawful(annal, record);
assert.ok(verdict.ok, `the template must pass its own court: ${verdict.errors.join('; ')}`);

// …passes a verbatim quote…
const quoted = `${annal} \u201cCarry it the last mile.\u201d`;
assert.ok(assertAnnalLawful(quoted, record).ok, 'a verbatim quote is lawful');

// …and refuses invention: a smuggled name and a forged quote both fall.
const forged = `${annal} Zanthor rode east. \u201cThe vale forgives no one.\u201d`;
const refused = assertAnnalLawful(forged, record);
assert.equal(refused.ok, false);
assert.ok(refused.errors.some((e) => e.includes('Zanthor')), 'the smuggled name is named');
assert.ok(refused.errors.some((e) => e.startsWith('quote not in the record')), 'the forged quote is named');

// The sealed row is silent to the table: no narration, no story, no spend.
const rowE = annalEntry(annal, { turn: 9, actIndex: 0, beatIndex: 1 });
assert.equal(rowE.kind, 'annal');
assert.equal(rowE.annal, annal);
assert.equal(rowE.dm.story, null);
assert.equal(rowE.dm.state_updates, null);
assert.equal(rowE.dm.narration_blocks.length, 0);
assert.equal(rowE.dm.entropy_use.length, 0);
assert.equal(rowE.player, null);

// An empty record composes an honest, headline-only annal — and it is lawful.
const bare = composeAnnal({ entries: [], codex: fixtureCodex(), hero: HERO, actIndex: 2 });
assert.ok(bare.startsWith('Act 3.'));
assert.ok(assertAnnalLawful(bare, { entries: [], codex: fixtureCodex(), hero: HERO }).ok);

console.log('PASS \u2014 the long memory gate: annals are deterministic, spoken in the record\u2019s own words, quotes are verbatim or contraband, invention is refused by name, and the sealed row stays silent at the table.');
