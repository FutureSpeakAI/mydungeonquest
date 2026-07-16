// THE SITTING GATE — the Likeness Law's first half holds or this file
// turns the build red. A face is accepted, not assigned: three
// candidates from one identity, one blessing, and no sheet before it.
import assert from 'node:assert/strict';
import { openSitting, blessCandidate, sheetBrief, requiresSitting, CANDIDATE_COUNT } from '../src/sitting.js';

const identity = 'Aldric — adult. A rowan-branded warden in grey. Signature: a rowan brand — always visible.';

// Three chairs, one person: the identity travels verbatim into every
// brief; only the staging differs.
const sitting = openSitting({ subject: 'Aldric', kind: 'soul', bearingText: identity, turn: 3 });
assert.equal(sitting.status, 'unblessed');
assert.equal(sitting.candidates.length, CANDIDATE_COUNT);
assert.equal(new Set(sitting.candidates.map((c) => c.id)).size, CANDIDATE_COUNT, 'three distinct chairs');
assert.ok(sitting.candidates.every((c) => c.brief.includes(identity)), 'the person never varies');
assert.ok(sitting.candidates.every((c) => c.brief.includes('neutral ground')), 'a soul sits on neutral ground — identity isolated');
assert.equal(JSON.stringify(openSitting({ subject: 'Aldric', kind: 'soul', bearingText: identity, turn: 3 })), JSON.stringify(sitting), 'the same soul is offered the same chairs');

// No sheet before the blessing — the refusal is honest and by name.
const early = sheetBrief(sitting, { bearingText: identity });
assert.equal(early.ok, false);
assert.ok(early.reason.includes('no sheet before the blessing'));

// A stranger cannot be blessed; the chosen face locks; a second
// blessing is refused — the face is not renegotiated.
assert.equal(blessCandidate(sitting, 'nonesuch', { turn: 4 }).ok, false);
const blessed = blessCandidate(sitting, 'dawn', { turn: 4 });
assert.ok(blessed.ok);
assert.equal(blessed.sitting.status, 'blessed');
assert.equal(blessed.sitting.blessed.id, 'dawn');
const again = blessCandidate(blessed.sitting, 'candle', { turn: 5 });
assert.equal(again.ok, false);
assert.ok(again.reason.includes('a face is accepted once'));

// After the blessing, the sheet: six views, every one anchored on the
// accepted face, every one on neutral ground.
const sheet = sheetBrief(blessed.sitting, { bearingText: identity });
assert.ok(sheet.ok);
assert.equal(sheet.sheet.views.length, 6);
assert.equal(sheet.sheet.anchor.candidateId, 'dawn');
assert.ok(sheet.sheet.views.every((v) => v.prompt.includes('blessed portrait')), 'the anchor IS the seed');
assert.ok(sheet.sheet.views.every((v) => v.prompt.includes(identity)));
assert.ok(sheet.sheet.views.every((v) => v.prompt.includes('neutral ground')));
assert.deepEqual(sheet.sheet.law, { background: 'neutral', anchored: true, count: 6 });

// Places sit differently: context kept, because the model rebuilds new
// angles from environmental clues — five views, none of them neutral.
const fordIdentity = 'Harrow Ford — a river crossing of black stones.';
const fordSitting = blessCandidate(openSitting({ subject: 'Harrow Ford', kind: 'region', bearingText: fordIdentity, turn: 6 }), 'hearthlight', { turn: 6 }).sitting;
const fordSheet = sheetBrief(fordSitting, { bearingText: fordIdentity });
assert.ok(fordSheet.ok);
assert.equal(fordSheet.sheet.views.length, 5);
assert.ok(fordSheet.sheet.views.some((v) => v.id === 'establishing'));
assert.ok(fordSheet.sheet.views.every((v) => !v.prompt.includes('neutral ground')), 'a place keeps its context');
assert.equal(fordSheet.sheet.law.background, 'context');

// The Floor is exempt: parchment paints procedurally and owes no sitting.
assert.equal(requiresSitting('illuminated'), true);
assert.equal(requiresSitting('parchment'), false);
assert.throws(() => openSitting({}), /needs a subject/);

console.log('PASS \u2014 the sitting gate: three candidates of one unvarying identity, a blessing that locks once and refuses twice, no sheet before the face is accepted, six anchored views on neutral ground for souls and five in context for places \u2014 and the Floor exempt, as the Floor must be.');
