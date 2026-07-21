// THE SAGA CHAIN GATE (Experience Directive XIX, Article II) — sealing a
// tale closes a volume, never a world. The manifest binds volumes in
// order and passes its court by name; every volume past the first cites
// its elder's head seal in its genesis — the FIRST word of its journal —
// and the desk walks the whole saga the way it walks a chain, refusing
// any break by name (which volume, which citation). The carryover is a
// pure fold: rows ride WHOLE (spread verbatim, stranger fields and all),
// cited, never rewritten. An old single-volume tale (a v1 packet) loads
// untouched. Keyless, pure.
import assert from 'node:assert/strict';
import { makeEnvelope, verifySaga } from 'fatescript/desk';
import { sagaManifestOf, validateSagaManifest, buildLegacyPacket, openNextTale } from 'fatescript/saga';
import { initCodex } from 'fatescript/story';

const HEX = (ch) => ch.repeat(64);

// --- helpers: lawful in-memory chronicles, chained the desk's own way ---
async function chainRows(seats) {
  const rows = []; let prev = null;
  for (const [type, payload] of seats) {
    const row = await makeEnvelope({ type, i: rows.length, prevHash: prev, payload, ts: 1700000000000 + rows.length });
    rows.push(row); prev = row.recordHash;
  }
  return rows;
}
const chronicleOf = (rows) => ({ header: { format: 'mydungeon.chronicle', headHash: rows.length ? rows[rows.length - 1].recordHash : null, signatureStatus: 'hash-only' }, journal: rows });

// --- 1. The manifest court, by name ---
const lawfulManifest = () => sagaManifestOf({ worldTitle: 'The Reach', covenant: 'hold the pass', volumes: [
  { index: 0, title: 'Vol I', headHash: HEX('a') }, { index: 1, title: 'Vol II', headHash: HEX('b') }
] });
assert.ok(validateSagaManifest(lawfulManifest()).ok, 'a lawful manifest passes its court');
assert.equal(validateSagaManifest(null).errors[0], 'a saga manifest must be an object');
assert.ok(validateSagaManifest({ ...lawfulManifest(), kind: 'chain' }).errors.some((e) => e.includes(`kind must be 'saga'`)), 'a stranger kind refused by name');
assert.ok(validateSagaManifest({ ...lawfulManifest(), version: 0 }).errors.some((e) => e.includes('positive integer')), 'a lawless version refused');
assert.ok(validateSagaManifest({ ...lawfulManifest(), worldTitle: '' }).errors.some((e) => e.includes('1–160')), 'a nameless world refused');
assert.ok(validateSagaManifest({ ...lawfulManifest(), covenant: 7 }).errors.some((e) => e.includes('covenant as a string')), 'a numeric covenant refused');
assert.ok(validateSagaManifest({ ...lawfulManifest(), volumes: [] }).errors.some((e) => e.includes('at least one volume')), 'an empty binding refused');
assert.ok(validateSagaManifest({ ...lawfulManifest(), extra: 1 }).errors.some((e) => e.includes('stranger key: extra')), 'a manifest stranger refused by name');
{
  const gapped = lawfulManifest(); gapped.volumes[1].index = 2;
  assert.ok(validateSagaManifest(gapped).errors.some((e) => e.includes('volume 2 is out of order — index 2 where 1 belongs')), 'a skipped index refused by name');
  const stranger = lawfulManifest(); stranger.volumes[0].note = 'x';
  assert.ok(validateSagaManifest(stranger).errors.some((e) => e.includes('volume 1 carries a stranger key: note')), 'a volume stranger refused by name');
  const untitled = lawfulManifest(); untitled.volumes[0].title = '';
  assert.ok(validateSagaManifest(untitled).errors.some((e) => e.includes('volume 1 names its title')), 'an untitled volume refused');
  const unhashed = lawfulManifest(); unhashed.volumes[1].headHash = 'xyz';
  assert.ok(validateSagaManifest(unhashed).errors.some((e) => e.includes('volume 2 carries no lawful head seal')), 'a lawless head seal refused');
  // Elder mercy: a saga bound mid-chain starts where its knowledge starts —
  // ascending and contiguous FROM ITS BASE, never from a lie.
  const elder = sagaManifestOf({ worldTitle: 'The Reach', covenant: 'hold the pass', volumes: [
    { index: 3, title: 'Vol IV', headHash: HEX('c') }, { index: 4, title: 'Vol V', headHash: HEX('d') }
  ] });
  assert.ok(validateSagaManifest(elder).ok, 'an elder saga binds from where its knowledge starts');
}

// --- 2. The chain at the desk — verified whole, refused by name ---
const rows1 = await chainRows([['turn', { n: 1 }], ['turn', { n: 2 }], ['legacy', { kind: 'legacy' }]]);
const head1 = rows1[rows1.length - 1].recordHash;
const chron1 = chronicleOf(rows1);
const rows2 = await chainRows([
  ['genesis', { kind: 'genesis', version: 1, priorVolume: { campaignId: 'vol-1', title: 'Vol I', index: 0, headHash: head1 } }],
  ['tick', { z: 1 }]
]);
const head2 = rows2[rows2.length - 1].recordHash;
const chron2 = chronicleOf(rows2);
const manifest = sagaManifestOf({ worldTitle: 'The Reach', covenant: 'hold the pass', volumes: [
  { index: 0, title: 'Vol I', headHash: head1 }, { index: 1, title: 'Vol II', headHash: head2 }
] });
{
  const walked = await verifySaga({ manifest, chronicles: [chron1, chron2] });
  assert.ok(walked.ok, `a lawful saga walks whole (${walked.reason})`);
  assert.equal(walked.volumes.length, 2, 'both volumes seated in the walk');
}
{ // a) a tampered record inside a volume — named through the chronicle court
  const bent = structuredClone(chron1); bent.journal[1].payload = { n: 999 };
  const walked = await verifySaga({ manifest, chronicles: [bent, chron2] });
  assert.ok(!walked.ok && walked.reason.startsWith('volume 1 (Vol I):') && walked.reason.includes('the seal is broken at record 1'), `a tampered volume refused by name (${walked.reason})`);
}
{ // b) a lawful chain whose citation lies — the planted break of the tooth
  const badRows = await chainRows([
    ['genesis', { kind: 'genesis', version: 1, priorVolume: { campaignId: 'vol-1', title: 'Vol I', index: 0, headHash: HEX('f') } }],
    ['tick', { z: 1 }]
  ]);
  const badChron = chronicleOf(badRows);
  const badManifest = sagaManifestOf({ worldTitle: 'The Reach', covenant: 'hold the pass', volumes: [
    { index: 0, title: 'Vol I', headHash: head1 }, { index: 1, title: 'Vol II', headHash: badRows[badRows.length - 1].recordHash }
  ] });
  const walked = await verifySaga({ manifest: badManifest, chronicles: [chron1, badChron] });
  assert.ok(!walked.ok && walked.reason.includes(`volume 2 (Vol II) does not cite volume 1's head seal`), `a lying citation refused by name (${walked.reason})`);
}
{ // c) no genesis at all — the chain cannot be walked
  const bare = chronicleOf(await chainRows([['tick', { z: 1 }]]));
  const m = sagaManifestOf({ worldTitle: 'The Reach', covenant: 'hold the pass', volumes: [
    { index: 0, title: 'Vol I', headHash: head1 }, { index: 1, title: 'Vol II', headHash: bare.header.headHash }
  ] });
  const walked = await verifySaga({ manifest: m, chronicles: [chron1, bare] });
  assert.ok(!walked.ok && walked.reason.includes('carries no genesis citation'), `a citeless volume refused (${walked.reason})`);
}
{ // d) a genesis that is not the volume's first word
  const lateRows = await chainRows([
    ['tick', { z: 1 }],
    ['genesis', { kind: 'genesis', version: 1, priorVolume: { campaignId: 'vol-1', title: 'Vol I', index: 0, headHash: head1 } }]
  ]);
  const late = chronicleOf(lateRows);
  const m = sagaManifestOf({ worldTitle: 'The Reach', covenant: 'hold the pass', volumes: [
    { index: 0, title: 'Vol I', headHash: head1 }, { index: 1, title: 'Vol II', headHash: late.header.headHash }
  ] });
  const walked = await verifySaga({ manifest: m, chronicles: [chron1, late] });
  assert.ok(!walked.ok && walked.reason.includes('not its first word'), `a late genesis refused (${walked.reason})`);
}
{ // e) the manifest binds a different telling
  const m = structuredClone(manifest); m.volumes[1].headHash = HEX('e');
  const walked = await verifySaga({ manifest: m, chronicles: [chron1, chron2] });
  assert.ok(!walked.ok && walked.reason.includes(`does not match the manifest's head seal`), `a mismatched head refused (${walked.reason})`);
}
{ // f) a root volume that carries a genesis — the saga begins earlier than the manifest tells
  const rootedRows = await chainRows([
    ['genesis', { kind: 'genesis', version: 1, priorVolume: { campaignId: 'older', title: 'Vol 0', index: 0, headHash: HEX('9') } }],
    ['turn', { n: 1 }]
  ]);
  const rooted = chronicleOf(rootedRows);
  const m = sagaManifestOf({ worldTitle: 'The Reach', covenant: 'hold the pass', volumes: [{ index: 0, title: 'Vol I', headHash: rooted.header.headHash }] });
  const walked = await verifySaga({ manifest: m, chronicles: [rooted] });
  assert.ok(!walked.ok && walked.reason.includes('begins earlier than the manifest tells'), `a pre-rooted manifest refused (${walked.reason})`);
  // …and the elder door stays open: bound mid-chain (base index > 0), the
  // same first-volume genesis is lawful, and the walk still audits the
  // citations BETWEEN the bound volumes.
  const contRows = await chainRows([
    ['genesis', { kind: 'genesis', version: 1, priorVolume: { campaignId: 'vol-3', title: 'Vol IV', index: 3, headHash: rooted.header.headHash } }],
    ['tick', { z: 2 }]
  ]);
  const cont = chronicleOf(contRows);
  const elderM = sagaManifestOf({ worldTitle: 'The Reach', covenant: 'hold the pass', volumes: [
    { index: 3, title: 'Vol IV', headHash: rooted.header.headHash }, { index: 4, title: 'Vol V', headHash: cont.header.headHash }
  ] });
  const elderWalk = await verifySaga({ manifest: elderM, chronicles: [rooted, cont] });
  assert.ok(elderWalk.ok, `an elder saga walks from its base (${elderWalk.reason})`);
}
{ // g) the count of chronicles must match the binding
  const walked = await verifySaga({ manifest, chronicles: [chron1] });
  assert.ok(!walked.ok && walked.reason.includes('binds 2 volume(s) but 1 chronicle(s)'), `a short desk refused by count (${walked.reason})`);
}
{ // h) a lawless manifest refuses before any chronicle is read
  const walked = await verifySaga({ manifest: { kind: 'nope' }, chronicles: [] });
  assert.ok(!walked.ok && walked.reason.includes(`kind must be 'saga'`), 'the manifest court sits first');
}

// --- 3. The carryover fold — pure, whole, cited ---
const codex = initCodex('classic-epic', { keepsake: { name: 'a warm river-stone', holder: 'Aster' } });
codex.cast = [{ id: 'mira', name: 'Mira Vex', role: 'ally', visual: 'A weathered scout with rope-burned hands and a patient stare.', voice: 'Low and unhurried, like a ferry bell.', status: 'active', bond: 2, last_seen: 'the pass', known_facts: ['Knows the pass'], bond_arc: [], introduced_turn: 3, memorial: true }];
codex.threads = [
  { label: 'Pay the ferryman', kind: 'debt', holder: 'Aster', status: 'open', outcome: null, futureBlock: 'carried-whole' },
  { label: 'Find the sluice key', kind: 'mystery', holder: null, status: 'resolved', outcome: 'resolved' }
];
codex.trove.push({ name: 'the sluice key', kind: 'key', holder: 'Mira Vex', note: 'cold iron', status: 'held', since: 4, moved: 4, futureBlock: 'carried-whole' });
codex.purses = [{ holder: 'Aster', amount: 12, futureBlock: 'carried-whole' }];
codex.standings = [{ faction: 'The Ferry Guild', score: -1, note: 'the unpaid crossing' }];
codex.clocks = [{ label: 'The river rises', segments: 6, filled: 2, status: 'open' }, { label: 'Old bell', segments: 4, filled: 4, status: 'resolved' }];
codex.ambitions = [{ text: 'Own the mill', status: 'open' }, { text: 'Old oath', status: 'kept' }];
const before = JSON.stringify(codex);
const packet = buildLegacyPacket({ codex, worldTitle: 'The Reach', covenant: 'hold the pass', taleIndex: 0 });
assert.equal(JSON.stringify(codex), before, 'the packet is a PURE fold — the codex does not move');
assert.equal(packet.version, 2, 'the packet speaks version 2');
assert.equal(packet.openThreads.length, 1, 'only open threads ride');
assert.equal(packet.openThreads[0].futureBlock, 'carried-whole', 'thread rows ride WHOLE — stranger blocks and all');
assert.ok(packet.trove.some((row) => row.futureBlock === 'carried-whole'), 'trove rows ride whole');
assert.equal(packet.purses[0].futureBlock, 'carried-whole', 'purse rows ride whole');
assert.equal(packet.standings.length, 1, 'standings ride the contract seat');
assert.deepEqual(packet.openClocks.map((clock) => clock.label), ['The river rises'], 'only open clocks ride');
assert.deepEqual(packet.openAmbitions.map((ambition) => ambition.text), ['Own the mill'], 'only open ambitions ride');
assert.equal(packet.souls[0].memorial, true, 'a memorial keeps its stone across the packet');
{
  const { codex: nextVol } = openNextTale({ packet, spineId: 'classic-epic', seed: { keepsake: { name: 'a warm river-stone', holder: 'Aster' } } });
  assert.equal(nextVol.trove.length, packet.trove.length, 'the packet trove outranks the keepsake seed — no duplicate rows');
  assert.ok(nextVol.trove.some((row) => row.futureBlock === 'carried-whole'), 'carried trove rows seat whole');
  assert.deepEqual(nextVol.threads.map((thread) => thread.carried), [{ fromVolume: 1 }], 'carried threads are annotated with their origin volume');
  assert.equal(nextVol.threads[0].futureBlock, 'carried-whole', 'annotation never rebuilds the row');
  assert.equal(nextVol.purses[0].amount, 12, 'purses continue as written');
  assert.equal(nextVol.standings[0].faction, 'The Ferry Guild', 'standings continue');
  assert.deepEqual(nextVol.clocks.map((clock) => clock.label), ['The river rises'], 'open clocks continue');
  assert.deepEqual(nextVol.ambitions.map((ambition) => ambition.text), ['Own the mill'], 'open ambitions continue');
  assert.equal(nextVol.cast[0].memorial, true, 'the memorial crosses into the next cast');
}

// --- 4. An old single-volume tale loads untouched (a v1 packet owes none of this) ---
{
  const elderPacket = {
    kind: 'legacy', version: 1, worldTitle: 'The Old Reach', covenant: 'as it was', taleIndex: 0,
    blight: 1, hero: null,
    souls: [{ id: 'old', name: 'Old Man Weir', role: 'elder', visual: 'Bent as a fishhook, twice as sharp where it counts.', voice: 'Dry gravel.', status: 'active', bond: 1, last_seen: 'the weir', known_facts: [], introduced_turn: 1, gender: null, age_band: null, timbre: null, voiceId: null }],
    regions: [{ id: 'weir', name: 'The Weir', visual: 'Black pilings against a slow brown river.', state: 'stable' }],
    worldFacts: ['The river never forgets.']
  };
  const { codex: elderVol } = openNextTale({ packet: elderPacket, spineId: 'classic-epic', seed: { keepsake: { name: 'a bent hook', holder: 'Aster' } } });
  assert.equal(elderVol.blight, 1, 'an elder packet still sets the blight');
  assert.equal(elderVol.cast[0].name, 'Old Man Weir', 'elder souls arrive as written');
  assert.ok(elderVol.trove.some((row) => row.name === 'a bent hook'), 'the keepsake seed stands where no trove rode the packet');
  assert.ok(!(elderVol.threads || []).length, 'no threads are invented for an elder packet');
  assert.ok(!elderVol.standings && !elderVol.clocks && !elderVol.ambitions || (!(elderVol.standings || []).length && !(elderVol.clocks || []).length && !(elderVol.ambitions || []).length), 'no ledgers are invented for an elder packet');
}

console.log('PASS: the saga chain holds — the manifest binds in order, every genesis cites its elder by hash, the desk refuses every planted break by name, and the carryover folds pure with rows whole.');
