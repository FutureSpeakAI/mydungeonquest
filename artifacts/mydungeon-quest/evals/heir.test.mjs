// THE HEIR GATE (Experience Directive XIX, Article III) — when a hero
// dies or retires, a new hero rises in the same world through the
// standing forge. The succession fold is pure: the world's record
// continues untouched, the fallen keep their memorials (permanent under
// the cast law's own resurrection block), their marks, and their unpaid
// debts — open threads remain open as the heir's INHERITED WEATHER,
// annotated and cited to the fall, first citation forever. The forge
// path is lawful mid-saga: the memorial and the weather cross volumes
// whole. Keyless, pure.
import assert from 'node:assert/strict';
import { foldSuccession, buildLegacyPacket, openNextTale } from 'fatescript/saga';
import { applyStoryUpdates, initCodex } from 'fatescript/story';

function tale() {
  const codex = initCodex('classic-epic', { keepsake: { name: 'a warm river-stone', holder: 'Aster' } });
  codex.cast = [{ id: 'mira', name: 'Mira Vex', role: 'ally', visual: 'A weathered scout with rope-burned hands and a patient stare.', voice: 'Low and unhurried, like a ferry bell.', status: 'active', bond: 2, last_seen: 'the pass', known_facts: ['Knows the pass'], bond_arc: [], introduced_turn: 3 }];
  codex.threads = [
    { label: 'Pay the ferryman', kind: 'debt', holder: 'Aster', status: 'open', outcome: null, futureBlock: 'carried-whole' },
    { label: 'Guard the mill', kind: 'promise', holder: 'Mira Vex', status: 'open', outcome: null },
    { label: 'Find the sluice key', kind: 'mystery', holder: null, status: 'resolved', outcome: 'resolved' }
  ];
  codex.purses = [{ holder: 'Aster', amount: 12 }];
  return codex;
}

// --- 1. The inheritance fold — the world record whole, the weather cited ---
const codex = tale();
const before = JSON.stringify(codex);
const after = foldSuccession(codex, { fallen: { name: 'Aster Vale', className: 'Ranger', voiceId: 'v-aster' }, heir: { name: 'Brindle Osk' }, turn: 12, reason: 'fell' });
assert.equal(JSON.stringify(codex), before, 'the fold is PURE — the input codex does not move');
for (const field of ['regions', 'blight', 'memoir', 'trove', 'purses']) {
  assert.equal(JSON.stringify(after[field]), JSON.stringify(codex[field]), `the world record continues untouched: ${field}`);
}
const stone = after.cast.find((soul) => soul.name === 'Aster Vale');
assert.ok(stone, 'the fallen seat in the cast');
assert.equal(stone.status, 'dead', 'a fall seats a grave');
assert.equal(stone.role, 'hero of this tale', 'the memorial names its office');
assert.ok(stone.visual.includes('Ranger'), 'the memorial keeps the calling');
assert.deepEqual(stone.known_facts, ['Fell on turn 12; Brindle Osk rose as heir.'], 'the memorial is cited to the fall and to the heir');
assert.equal(stone.memorial, true, 'the stone is marked');
assert.equal(stone.voiceId, 'v-aster', 'the exact voice rests with the fallen (Cast Law)');
assert.equal(JSON.stringify(after.cast.find((soul) => soul.name === 'Mira Vex')), JSON.stringify(codex.cast[0]), 'the living cast does not move');
for (const label of ['Pay the ferryman', 'Guard the mill']) {
  const thread = after.threads.find((row) => row.label === label);
  assert.equal(thread.status, 'open', `inherited weather stays OPEN: ${label}`);
  assert.deepEqual(thread.inherited, { from: 'Aster Vale', turn: 12, reason: 'fell' }, `inherited weather is cited to the fall: ${label}`);
}
assert.equal(after.threads.find((row) => row.label === 'Pay the ferryman').futureBlock, 'carried-whole', 'annotation never rebuilds the row');
assert.ok(!after.threads.find((row) => row.label === 'Find the sluice key').inherited, 'a resolved thread owes no weather');
assert.ok(after.notes.some((note) => note.includes('Aster Vale falls on turn 12') && note.includes('Brindle Osk rises as heir')), 'the Book hears the chapter break through the notes lane');

// --- 2. Memorial permanence — first citation forever, dead stays dead ---
{
  const again = foldSuccession(after, { fallen: { name: 'Brindle Osk', className: 'Warden' }, heir: { name: 'Cael Dun' }, turn: 20, reason: 'fell' });
  assert.deepEqual(again.threads.find((row) => row.label === 'Pay the ferryman').inherited, { from: 'Aster Vale', turn: 12, reason: 'fell' }, 'the FIRST citation stands forever');
  assert.equal(again.cast.filter((soul) => soul.memorial).length, 2, 'each fall leaves its own stone');
  // The cast law's own permanence: no update may raise the dead.
  const raised = applyStoryUpdates(again, { cast_update: [{ name: 'Aster Vale', status: 'active' }] }, { turn: 21 });
  assert.equal(raised.cast.find((soul) => soul.name === 'Aster Vale').status, 'dead', 'the resurrection block guards the memorial');
}
{ // a retirement leaves the road open behind them
  const rested = foldSuccession(tale(), { fallen: { name: 'Aster Vale', className: 'Ranger' }, heir: { name: 'Brindle Osk' }, turn: 30, reason: 'retired' });
  const stoneR = rested.cast.find((soul) => soul.name === 'Aster Vale');
  assert.equal(stoneR.status, 'missing', 'a retirement seats as missing, never a grave');
  assert.deepEqual(stoneR.known_facts, ['Retired on turn 30; Brindle Osk rose as heir.'], 'the retirement is cited');
  assert.ok(rested.notes.some((note) => note.includes('lays down the road')), 'the Book hears the retirement in its own words');
}
{ // the belt: a fallen name already seated at the table marks the standing row
  const seated = tale();
  seated.cast.push({ id: 'aster', name: 'Aster Vale', role: 'wanderer', visual: 'A rangy silhouette on the ridgeline at dusk, bow unstrung.', voice: 'Quiet.', status: 'active', bond: 4, last_seen: 'the ridge', known_facts: ['Walked in from the east'], bond_arc: [], introduced_turn: 2 });
  const folded = foldSuccession(seated, { fallen: { name: 'Aster Vale', className: 'Ranger' }, heir: { name: 'Brindle Osk' }, turn: 14, reason: 'fell' });
  const row = folded.cast.find((soul) => soul.name === 'Aster Vale');
  assert.equal(row.status, 'dead', 'the standing row takes the grave');
  assert.equal(row.role, 'wanderer', 'the standing row is marked, never rewritten');
  assert.ok(row.known_facts.includes('Fell on turn 14; Brindle Osk rose as heir.'), 'the memorial fact joins the standing ledger');
}

// --- 3. Refusals, by name ---
assert.throws(() => foldSuccession(codex, { fallen: { name: 'Aster Vale' }, heir: {} }), /names the fallen and the heir/, 'a nameless heir refused');
assert.throws(() => foldSuccession(codex, { fallen: {}, heir: { name: 'Brindle Osk' } }), /names the fallen and the heir/, 'a nameless fallen refused');
assert.throws(() => foldSuccession(codex, { fallen: { name: 'A' }, heir: { name: 'B' }, reason: 'vanished' }), /'fell' or 'retired'/, 'a stranger reason refused');
assert.throws(() => foldSuccession(null, { fallen: { name: 'A' }, heir: { name: 'B' } }), /folds over a codex/, 'a codexless fold refused');

// --- 4. The forge path lawful MID-SAGA — the stone and the weather cross volumes ---
{
  const vol2Fallen = foldSuccession(tale(), { fallen: { name: 'Aster Vale', className: 'Ranger', voiceId: 'v-aster' }, heir: { name: 'Brindle Osk' }, turn: 12, reason: 'fell' });
  const packet = buildLegacyPacket({ codex: vol2Fallen, worldTitle: 'The Reach', covenant: 'hold the pass', taleIndex: 1 });
  const soul = packet.souls.find((row) => row.name === 'Aster Vale');
  assert.equal(soul.status, 'dead', 'the fallen ride the packet dead — the validator will refuse their voice');
  assert.equal(soul.memorial, true, 'the stone rides the packet');
  assert.ok(soul.known_facts.includes('Fell on turn 12; Brindle Osk rose as heir.'), 'the citation rides the packet');
  assert.deepEqual(packet.openThreads.find((row) => row.label === 'Pay the ferryman').inherited, { from: 'Aster Vale', turn: 12, reason: 'fell' }, 'the weather rides the packet whole');
  const { codex: vol3 } = openNextTale({ packet, spineId: 'classic-epic' });
  assert.equal(vol3.cast.find((soul2) => soul2.name === 'Aster Vale').status, 'dead', 'the dead arrive dead in the next volume');
  assert.equal(vol3.cast.find((soul2) => soul2.name === 'Aster Vale').memorial, true, 'the stone stands in the next volume');
  const carried = vol3.threads.find((row) => row.label === 'Pay the ferryman');
  assert.deepEqual(carried.inherited, { from: 'Aster Vale', turn: 12, reason: 'fell' }, 'the inherited citation crosses volumes untouched');
  assert.deepEqual(carried.carried, { fromVolume: 2 }, 'the carry annotation names its volume');
}

console.log('PASS: the heir law holds — the world record continues untouched, the fallen keep their stones and their marks forever, and every unpaid debt crosses to the heir cited to the fall.');
