// THE PUBLISH RULES, judged (Directive XV §VI, gate 2 of 3) — the pure
// laws of the commons, on the bench: only a sealed tale may publish; the
// published record is the export envelope minus blobs and volatile URLs,
// and NOTHING else rides; strikes fell by HASH (tick-proof), never by
// ordinal; a struck scene's words appear NOWHERE in the page model; a
// revoked page is a refusal and only a refusal.
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';

const { publishable, publishRecordFrom, fellStruck, publicPageModel, displayCoherence } = await import('../src/lib/publish.js');

// ---------------------------------------------------------- the specimens
const STRUCK_SENTENCE = 'The cartographer\u2019s true name is Ilvane Moor';
const KEPT_SENTENCE = 'The lantern answers the dark with a steady gold';

// The specimen journal carries the SAME words its log roll displays — a
// real export's two copies agree, and the display-coherence court (§6)
// holds the bench to the same honesty it demands of the app.
const journal = [
  { type: 'turn', i: 0, prevHash: null, recordHash: 'H0', payload: { player: 'begin', dm: { narration_blocks: [{ speaker: null, text: KEPT_SENTENCE }] } }, ts: 1 },
  { type: 'turn', i: 1, prevHash: 'H0', recordHash: 'H1', payload: { player: 'climb', dm: { narration_blocks: [{ speaker: 'Edlyn', text: 'Take the cliff stair, singer.' }] } }, ts: 2 },
  { type: 'tick', i: 2, prevHash: 'H1', recordHash: 'H2', payload: {}, ts: 3 },
  { type: 'turn', i: 3, prevHash: 'H2', recordHash: 'H3', payload: { player: 'press him', dm: { narration_blocks: [{ speaker: 'Halm', text: STRUCK_SENTENCE }] } }, ts: 4 },
  { type: 'redaction', i: 4, prevHash: 'H3', recordHash: 'H4', payload: { targetRecordHash: 'H3', scope: 'active_canon' }, ts: 5 },
];
const sealedJournal = [...journal, { type: 'sealing', i: 5, prevHash: 'H4', recordHash: 'H5', payload: { turns: 3 }, ts: 6 }];

// The log roll interleaves a hashless tick row BETWEEN the turns — the
// ordinal trap. The strike names H3; index alignment would fell the tick.
const logs = [
  { id: 'a', turn: 0, recordHash: 'H0', sent: 'begin', dm: { narration_blocks: [{ speaker: null, text: KEPT_SENTENCE }] }, redacted: false, imageUrl: 'blob:volatile-0' },
  { id: 'b', turn: 1, recordHash: 'H1', sent: 'climb', dm: { narration_blocks: [{ speaker: 'Edlyn', text: 'Take the cliff stair, singer.' }] }, redacted: false },
  { id: 'tick', turn: 1, tick: true, divider: 'The night passes.' },
  { id: 'c', turn: 2, recordHash: 'H3', sent: 'press him', dm: { narration_blocks: [{ speaker: 'Halm', text: STRUCK_SENTENCE }] }, redacted: false },
];

// ------------------------------------------------ 1. the sealing predicate
assert.equal(publishable(journal), false, 'an unsealed journal must not be publishable');
assert.equal(publishable(sealedJournal), true, 'the sealing block licenses publishing');
assert.equal(publishable(null), false, 'no journal, no publishing');
console.log('ok — only the wax licenses the commons');

// -------------------------------------- 2. the record: envelope minus blobs
const chronicle = {
  header: { format: 'mydungeon.chronicle', version: 1, campaignId: 'bell-hollow', headHash: 'H5', publicKeyJwk: null, signatureStatus: 'hash-only' },
  campaign: { id: 'bell-hollow', title: 'The Lantern of Bell Hollow', logs, codex: { cast: [{ name: 'Edlyn', role: 'harbormistress' }] }, hero: { name: 'Wren' } },
  journal: sealedJournal,
  media: [
    { assetHash: 'f'.repeat(64), cacheKey: 'scene:1', kind: 'scene', mime: 'image/png', originTurnHash: 'H1', blob: 'data:image/png;base64,AAAA' },
    { cacheKey: 'no-name', kind: 'scene', blob: 'data:image/png;base64,BBBB' },
  ],
  reveals: [{ assetHash: 'f'.repeat(64), seenAt: 9 }],
};
const record = publishRecordFrom(chronicle);
assert.deepEqual(Object.keys(record).sort(), ['campaign', 'header', 'journal', 'media'], 'the record is the four-field envelope and NOTHING else — no reveal, no stray key, ever rides');
assert.equal(JSON.stringify(record).includes('reveals'), false, 'the seen ledger never rides to the commons');
assert.equal(record.media.length, 1, 'a nameless media row does not ride');
assert.equal(record.media[0].blob, undefined, 'blobs are lifted out — the shelf serves bytes, the record serves names');
assert.equal(record.media[0].assetHash, 'f'.repeat(64), 'the content address stays');
assert.equal(JSON.stringify(record).includes('blob:volatile-0'), false, 'volatile object URLs are scrubbed from the logs');
assert.equal(record.campaign.logs[0].sent, 'begin', 'log rows otherwise ride WHOLE (the harness-row law)');
assert.equal(record.journal, sealedJournal, 'the journal rides untouched — the desk must sit on the same bytes');
console.log('ok — the record is the envelope minus blobs, and the seen ledger stays home');

// --------------------------------------------- 3. strikes fell by hash law
const felled = fellStruck(logs, sealedJournal);
assert.equal(felled[3].redacted, true, 'the strike fells the row whose recordHash the journal names');
assert.equal(JSON.stringify(felled[3]).includes('Ilvane'), false, 'a felled row keeps NOTHING but its seat and stamp');
assert.equal(felled[2].tick, true, 'the hashless tick row rides untouched — the ordinal trap does not spring');
assert.equal(felled[2].divider, 'The night passes.', 'tick prose survives the felling');
assert.equal(felled[0].dm.narration_blocks[0].text, KEPT_SENTENCE, 'unstruck rows keep their words');
const wornMark = fellStruck([{ id: 'z', turn: 9, redacted: true, dm: { narration_blocks: [{ text: 'already struck words' }] } }], []);
assert.equal(JSON.stringify(wornMark).includes('already struck'), false, 'a row already wearing the mark falls too — the union never resurrects');
console.log('ok — strikes fell by hash, tick rows cannot be mistaken for turns');

// ------------------------------------------------- 4. the page model's law
const model = publicPageModel(record);
const modelBytes = JSON.stringify(model);
assert.equal(model.refused, false, 'a living record renders');
assert.equal(modelBytes.includes('Ilvane'), false, 'the struck sentence appears NOWHERE in the page model');
assert.equal(modelBytes.includes(KEPT_SENTENCE), true, 'the kept sentence rides to the page');
assert.equal(model.struckCount, 1, 'the page counts its strikes honestly');
assert.equal(model.episodes.length, 2, 'episodes seat only unstruck turns with a DM answer');
assert.equal(model.cast[0].name, 'Edlyn', 'the dramatis personae ride from the codex');
assert.equal(model.headHash, 'H5', 'the page model carries the head it will be judged by');
console.log('ok — the page model fells struck words entirely');

// ------------------------------------------------ 5. revocation is refusal
const gone = publicPageModel(record, { revokedAt: '2026-07-19T00:00:00Z' });
assert.equal(gone.refused, true, 'a revoked page refuses');
const goneBytes = JSON.stringify(gone);
for (const leak of ['Lantern', 'Wren', 'Edlyn', 'Ilvane', KEPT_SENTENCE]) {
  assert.equal(goneBytes.includes(leak), false, `a tombstone carries no tale content (leaked: ${leak})`);
}
assert.equal(publicPageModel(null).refused, true, 'an unreadable record refuses rather than crashes');
console.log('ok — the tombstone is a refusal and only a refusal');

// ---------------------- 6. the display-coherence court (§III.4, amended)
// The chain court vouches for the journal; the page shows the campaign's
// display copy. The badge must answer for BOTH — tooth 17's laundering
// sitting proved a forged display copy rides green past the chain court
// alone, so the pure court here is the second lock on the same door.
assert.equal(displayCoherence(record).coherent, true, 'a lawful record is coherent — the page shows the chain\u2019s own words');
{
  const forgedDisplay = JSON.parse(JSON.stringify(record));
  const shown = forgedDisplay.campaign.logs.find((log) => log && !log.redacted && log.dm);
  shown.dm.narration_blocks[0].text = shown.dm.narration_blocks[0].text.replace('steady gold', 'steady goId');
  const felledVerdict = displayCoherence(forgedDisplay);
  assert.equal(felledVerdict.coherent, false, 'ONE forged display byte fells coherence');
  assert.equal(typeof felledVerdict.reason, 'string', 'the refusal speaks its reason');

  const forgedDeed = JSON.parse(JSON.stringify(record));
  forgedDeed.campaign.logs.find((log) => log && !log.redacted && log.dm).sent = 'a deed the player never spoke';
  assert.equal(displayCoherence(forgedDeed).coherent, false, 'a forged spoken deed fells coherence too');

  const citeless = JSON.parse(JSON.stringify(record));
  delete citeless.campaign.logs.find((log) => log && !log.redacted && log.dm).recordHash;
  assert.equal(displayCoherence(citeless).coherent, false, 'a citeless displayed page fells the badge — citeless pages are never used');

  const strangeCite = JSON.parse(JSON.stringify(record));
  strangeCite.campaign.logs.find((log) => log && !log.redacted && log.dm).recordHash = 'f'.repeat(64);
  assert.equal(displayCoherence(strangeCite).coherent, false, 'a cite the chain does not hold fells the badge');

  assert.equal(displayCoherence(null).coherent, false, 'an unreadable record is incoherent — fail closed');
}
console.log('ok — the display copy must be the chain\u2019s own words, or the badge falls');

console.log('PASS publishRules.test.mjs — the commons\u2019 pure laws hold: sealed-only, envelope-only, hash-felled strikes, refusal tombstones');
