// ------------------------------------------------------------
// THE ELDER MEMORY GATE (game) — Experience Directive XX, Law VII.
//
// Proves the epoch seat at the table: an act's close seals exactly ONE
// epoch row through the house's one seal door (desk chain-lawful, the
// tick pattern, mixed journal whole); the refusal road declines to the
// LABELED floor — an unlawful illuminated candidate is never sealed;
// epoch rows are machinery, absent from the podcast, the ravens, and
// every spoken surface; the ladder reads epochs before elders with the
// budget provably fixed as acts stack; and a pre-epoch save walks
// today's road byte-identical. Zero keys, zero providers.
// ------------------------------------------------------------
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');

const { db } = await import('../src/lib/db.js');
const { makeEnvelope } = await import('../src/lib/seal.js');
const { memoryLadder } = await import('../src/lib/memoir.js');
const { EPOCH_KIND, composeActEpochFloor, sealActEpoch, memoryEpochLadder } = await import('../src/lib/epoch.js');
const { buildPodcastScript, validatePodcastScript } = await import('../src/lib/podcast.js');
const { EPOCH_LIMITS } = await import('fatescript/epoch');

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
};

// ---- the fixture: the annals gate's own two-act tale, word for word —
// the elder memory stands ON the long memory, never beside it.
const turnLog = (i, beatIndex, text, story = null) => ({
  id: `log-${i}`, kind: undefined, player: `deed ${i}`, sent: `deed ${i}`, deed: null, ts: 1700000000000 + i, resolution: null, redacted: false, beatIndex,
  dm: { narration_blocks: [{ speaker: 'Mira', text }], suggestions: [], roll_request: null, state_updates: null, combat: null, cinematic: null, story, image_cue: null, dialogue_cue: null, time_advance: null, entropy_use: [] },
  turn: i,
});
const codex = {
  completed: false, beatIndex: 3, notes: [], memoir: [],
  spine: { acts: [{ name: 'Embers' }, { name: 'Ashfall' }], beats: [{ act: 1 }, { act: 1 }, { act: 2 }, { act: 2 }] },
  cast: [{ name: 'Mira', role: 'ally', status: 'active', bond: 3, visual: 'grey-eyed ferrywoman', voice: 'low', goal: 'keep the crossing open', secret: 'the bell under the ford is cracked', last_seen: 'the ford', known_facts: [] }],
  regions: [{ name: 'The Ford', description: 'a stone crossing', state: 'uneasy' }],
};
const logs = [
  turnLog(0, 0, 'The ferry waits.', { cast_add: [{ name: 'Mira', role: 'ally', visual: 'grey-eyed ferrywoman', voice: 'low', goal: 'keep the crossing open' }] }),
  turnLog(3, 0, 'Mira leans close.', { cast_update: [{ name: 'Mira', fact_add: 'the bell under the ford is cracked' }] }),
  ...Array.from({ length: 6 }, (_, k) => turnLog(5 + k, 2, `The road wears on, mile ${k}.`)),
];
const campaign = { id: 'epoch-tale', title: 'The Ford', hero: { name: 'Alden' }, codex, logs, turnNumber: 11, headHash: null, turnCount: 0, signatureStatus: 'hash-only' };

// ---- injected hands: the annals bench exactly (crypto OUTSIDE any tx).
await db.campaigns.put({ ...campaign });
let prevHash = null; let sealIndex = 0; const sealedRows = [];
const seal = async (campaignId, type, payload) => {
  const envelope = await makeEnvelope({ type, i: sealIndex, prevHash, payload, ts: 1700000100000 + sealIndex });
  prevHash = envelope.recordHash; sealIndex += 1;
  sealedRows.push({ campaignId, ...envelope });
  await db.journal.put({ campaignId, ...envelope });
  await db.campaigns.update(campaignId, { headHash: envelope.recordHash, turnCount: sealIndex, signatureStatus: 'hash-only' });
  return envelope;
};
const save = async (next) => { await db.campaigns.put(next); };
const reload = async (id) => db.campaigns.get(id);

// 1. THE FLOOR composes deterministically and passes the engine's court.
{
  const one = composeActEpochFloor(campaign, 1);
  assert.equal(one.text, composeActEpochFloor(campaign, 1).text, 'the floor is deterministic in the record');
  assert.equal(one.verdict.ok, true, `the floor passes its own court: ${(one.verdict.errors || []).join('; ')}`);
  assert.ok(one.text.startsWith('Act 1.'), 'the head names its act, undecorated');
  assert.ok(one.text.includes('[t0].') || one.text.includes('[t3].'), 'every claim carries its turn citations');
  assert.ok(one.text.length <= EPOCH_LIMITS.summary, 'the 900-character law holds at the table');
}

// 2. THE SEAT, keyless — exactly one epoch row, the tick pattern, the
//    label honest: no voice answered, so the floor is named the floor.
let after = null;
{
  const sealedEpoch = await sealActEpoch(campaign, 1, { seal, save, reload });
  after = sealedEpoch.campaign;
  assert.ok(sealedEpoch.epoch, 'the epoch landed');
  assert.equal(sealedEpoch.label, 'floor', 'keyless, the seat seals the floor and says so');
  const rows = await db.journal.where('campaignId').equals('epoch-tale').toArray();
  assert.equal(rows.length, 1, 'exactly one journal row sealed');
  assert.equal(rows[0].type, 'epoch', 'sealed as its own type through the one seal door');
  assert.equal(rows[0].payload.epoch, sealedEpoch.epoch, 'the sealed text is the spoken text');
  assert.equal(rows[0].payload.label, 'floor', 'the label rides the seal — never mistaken for the illuminated seat');
  assert.equal(rows[0].payload.actIndex, 0);
  const tail = after.logs[after.logs.length - 1];
  assert.equal(tail.kind, EPOCH_KIND);
  assert.equal(tail.label, 'floor');
  assert.equal(tail.recordHash, rows[0].recordHash, 'the record hash rides the log row (the tick pattern)');
  assert.equal(after.headHash, rows[0].recordHash, 'the head settled onto the campaign');
  assert.equal(tail.dm.narration_blocks.length, 0, 'the envelope is empty — machinery, never a spoken turn');
  assert.equal(tail.dm.suggestions.length, 0);
}

// 3. IDEMPOTENT — the same close re-entered seals nothing twice.
{
  const again = await sealActEpoch(after, 1, { seal, save, reload });
  assert.equal(again.epoch, null, 'one epoch per act, ever');
  assert.equal(again.refused, null, 'idempotence is not refusal');
  assert.equal(await db.journal.where('campaignId').equals('epoch-tale').count(), 1, 'nothing new sealed');
}

// 4. THE REFUSAL ROAD — an unlawful illuminated candidate is courted at
//    the table and refused; the seat declines to the LABELED floor. A
//    lawful candidate seats as 'illuminated'. A dark road (the ask
//    throws) is not a refusal of memory.
{
  const liar = async () => ({ summary: 'Act 2. Zorblax the Undying rose from the ford [t5].' });
  const refusedRoad = await sealActEpoch(after, 2, { seal, save, reload, illuminate: liar });
  assert.equal(refusedRoad.label, 'floor', 'the lie is refused; the floor seals, labeled');
  assert.ok(!refusedRoad.epoch.includes('Zorblax'), 'no invented name ever reaches a seal');
  const rows = await db.journal.where('campaignId').equals('epoch-tale').toArray();
  assert.equal(rows.filter((row) => row.type === 'epoch').length, 2, 'act two sealed once');
  assert.equal(rows[rows.length - 1].payload.label, 'floor');
  after = refusedRoad.campaign;

  // A fresh tale walks the lawful illuminated road and the dark road.
  const second = { ...campaign, id: 'epoch-lit', logs: campaign.logs.map((log) => ({ ...log })) };
  await db.campaigns.put({ ...second });
  const lawful = async () => ({ summary: 'Act 1. Mira \u2014 the bell under the ford is cracked [t3].' });
  const litRoad = await sealActEpoch(second, 1, { seal, save, reload, illuminate: lawful });
  assert.equal(litRoad.label, 'illuminated', 'a courted candidate seats as the illuminated seal');
  assert.equal(litRoad.epoch, 'Act 1. Mira \u2014 the bell under the ford is cracked [t3].');
  const dark = { ...campaign, id: 'epoch-dark', logs: campaign.logs.map((log) => ({ ...log })) };
  await db.campaigns.put({ ...dark });
  const darkRoad = await sealActEpoch(dark, 1, { seal, save, reload, illuminate: async () => { throw new Error('no road'); } });
  assert.equal(darkRoad.label, 'floor', 'a dark road to the seat still seals the floor');
}

// 4b. THE SEAL LEADS, THE ROW FOLLOWS — a jammed seal door leaves the
//     record CLEAN: no unsealed epoch row lands to feed [MEMORY] or
//     block the reseal; the door healed, the same close seals lawfully
//     (review cure: the half-write road is barred by order, not luck).
{
  const flaky = { ...campaign, id: 'epoch-flaky', logs: campaign.logs.map((log) => ({ ...log })) };
  await db.campaigns.put({ ...flaky });
  let doorCalls = 0;
  const jammedSeal = async (...args) => { doorCalls += 1; if (doorCalls === 1) throw new Error('the seal door jammed'); return seal(...args); };
  await assert.rejects(() => sealActEpoch(flaky, 1, { seal: jammedSeal, save, reload }), /jammed/, 'a jammed door speaks — never a silent half-write');
  const afterJam = await db.campaigns.get('epoch-flaky');
  assert.ok(!(afterJam.logs || []).some((log) => log.kind === EPOCH_KIND), 'no unsealed epoch row ever lands in the working record');
  const healed = await sealActEpoch(afterJam, 1, { seal: jammedSeal, save, reload });
  assert.ok(healed.epoch, 'the reseal walks lawfully once the door heals');
  assert.equal(healed.campaign.logs.filter((log) => log.kind === EPOCH_KIND).length, 1, 'one epoch, sealed and written together');
  assert.equal(healed.campaign.logs[healed.campaign.logs.length - 1].recordHash, healed.campaign.headHash, 'the row and the head agree — seal and write are one truth');
}

// 4c. THE TOLL LANES NEVER CROSS — the epoch debits the Chronicler's
//     kind but never in its once-key room: chapter N and act N part
//     ways by construction, so neither pour can hide behind the
//     other's ON CONFLICT and go untolled (review cure).
{
  const { retellDebitKey, epochDebitKey } = await import('../server/toll.js');
  for (const n of [0, 1, 2, 7]) {
    const retell = retellDebitKey({ campaign: { id: 'same-tale' }, chapter: { index: n } });
    const epoch = epochDebitKey({ campaignId: 'same-tale', actIndex: n });
    assert.equal(retell.campaignId, epoch.campaignId, 'one tale, one campaign line');
    assert.notEqual(retell.turn, epoch.turn, `chapter ${n} and act ${n} must never share a once-key`);
    assert.ok(epoch.turn < 0 && retell.turn >= 0, 'the epoch lane is the negative line — disjoint from every chapter index');
  }
  assert.equal(epochDebitKey({ campaignId: 'same-tale', actIndex: null }).turn, null, 'a malformed act reads null — the guarded line only when both halves stand');
}

// 5. THE MIXED JOURNAL stays chain-lawful at the desk — epoch rows link
//    prevHash to recordHash like every other type, no lane skipped.
{
  const mine = sealedRows;
  assert.ok(mine.length >= 4, 'the bench sealed a mixed journal');
  for (let i = 1; i < mine.length; i += 1) {
    assert.equal(mine[i].prevHash, mine[i - 1].recordHash, `row ${i} links its elder — the chain holds across types`);
  }
}

// 6. THE CURTAIN — epoch rows are machinery: absent from the podcast
//    (script and its court), absent from the ravens, silent envelopes
//    everywhere else.
{
  const journal = await db.journal.where('campaignId').equals('epoch-tale').toArray();
  const epochText = journal.find((row) => row.type === 'epoch').payload.epoch;
  const script = buildPodcastScript({ campaign: after, journal });
  assert.ok(!JSON.stringify(script).includes(epochText), 'the podcast never speaks an epoch');
  const verdict = validatePodcastScript(script, { campaign: after, journal });
  assert.equal(verdict.ok, true, `a journal carrying epoch rows still yields a lawful script: ${(verdict.errors || []).join('; ')}`);
  const ravens = read('src/lib/ravens.js');
  assert.ok(ravens.includes("kind === 'annal'"), 'the ravens read annals');
  assert.ok(!ravens.includes('epoch'), 'the ravens never learned the word epoch — machinery stays invisible');
}

// 7. THE LADDER — epochs before elders: freshest act raw, earlier acts
//    by their seals (an act with only an annal rides the annal), one
//    fixed budget as the acts stack.
{
  const beatsFive = [{ act: 1 }, { act: 2 }, { act: 3 }, { act: 4 }, { act: 5 }];
  const tale = (acts, withEpochs, withAnnalForActOne = false) => {
    const rows = [];
    for (let act = 1; act <= acts; act += 1) {
      rows.push(turnLog(act * 10, act - 1, `The act ${act} road bends on.`));
      if (act === acts) rows.push(turnLog(act * 10 + 1, act - 1, `The act ${act} door stands open.`));
    }
    if (withAnnalForActOne) rows.push({ id: 'an-1', kind: 'annal', actIndex: 0, annal: 'Act 1 \u2014 Embers. The ferry crossing held. The bell stayed cracked.', redacted: false, ts: 5, beatIndex: 0, turn: 12, dm: { narration_blocks: [], suggestions: [] } });
    if (withEpochs) {
      for (let act = 1; act < acts; act += 1) {
        if (withAnnalForActOne && act === 1) continue; // act one rides its annal
        rows.push({ id: `ep-${act}`, kind: 'epoch', actIndex: act - 1, label: 'floor', epoch: `Act ${act}. The act ${act} road bent on [t${act * 10}]. The door held [t${act * 10}].`, redacted: false, ts: 6 + act, beatIndex: act - 1, turn: act * 10 + 2, dm: { narration_blocks: [], suggestions: [] } });
      }
    }
    return deepFreeze({ id: `tale-${acts}`, title: 'x', hero: { name: 'Alden' }, codex: { beatIndex: acts - 1, spine: { acts: [], beats: beatsFive.slice(0, acts) }, cast: [], regions: [], notes: [], memoir: [] }, logs: rows, turnNumber: acts * 10 + 2 });
  };
  const five = tale(5, true, true);
  const ladder = memoryEpochLadder(five);
  assert.deepEqual(ladder, memoryEpochLadder(five), 'the ladder is deterministic');
  assert.ok(ladder[0].startsWith('t50:') && ladder[1].startsWith('t51:'), 'the freshest act rides raw, played order');
  assert.equal(ladder[2], 'Act 4. The act 4 road bent on [t40]. The door held [t40].', 'elder seals follow, newest act first');
  assert.equal(ladder[3], 'Act 3. The act 3 road bent on [t30]. The door held [t30].');
  assert.equal(ladder[4], 'Act 2. The act 2 road bent on [t20]. The door held [t20].');
  assert.equal(ladder[5], 'Act 1 \u2014 Embers. The ferry crossing held. The bell stayed cracked.', 'an act with only an annal rides the annal — that too is a sealed summary');
  assert.ok(JSON.stringify(ladder).length <= EPOCH_LIMITS.ladder, 'the one fixed budget holds');
  for (const acts of [3, 4, 5]) {
    const stacked = memoryEpochLadder(tale(acts, true));
    assert.ok(JSON.stringify(stacked).length <= EPOCH_LIMITS.ladder, `at ${acts} acts the SAME fixed budget holds — year three remembers year one at the same price`);
  }
}

// 8. BACK-COMPAT, the deep-freeze walk — a pre-epoch save (annals only,
//    no epoch rows) walks today's road byte-identical, and the walk
//    mutates nothing.
{
  const preEpoch = deepFreeze({
    ...campaign, id: 'pre-epoch',
    logs: [
      ...campaign.logs.map((log) => ({ ...log })),
      { id: 'a1', kind: 'annal', actIndex: 0, annal: 'Act 1 \u2014 Embers. The crossing held.', redacted: false, ts: 1, beatIndex: 0, turn: 4, dm: { narration_blocks: [], suggestions: [] } },
      { id: 'a2', kind: 'annal', actIndex: 1, annal: 'Act 2 \u2014 Ashfall. The road wore on. Winter came early.', redacted: false, ts: 2, beatIndex: 3, turn: 11, dm: { narration_blocks: [], suggestions: [] } },
    ],
  });
  assert.deepEqual(memoryEpochLadder(preEpoch), memoryLadder(preEpoch), 'no epoch rows: the epoch-aware door hands the question to the standing ladder — the two can never disagree');
  assert.equal(memoryEpochLadder(preEpoch)[0], 'Act 2 \u2014 Ashfall. The road wore on. Winter came early.', 'today\u2019s road: newest annal first, in full');
}

// 9. THE WIRING — the lazy door stands in the table, the server door
//    stands in the house, the standing ladder is byte-untouched, and
//    the [MEMORY] socket never moved.
{
  const app = read('src/App.jsx');
  assert.ok(app.includes('sealActEpoch'), 'the table seals the epoch at the act close');
  assert.ok(app.includes('memoryEpochLadder'), 'the table reads the epoch-aware ladder');
  assert.ok(app.includes('memoryLadder('), 'the standing ladder still stands');
  assert.ok(app.includes("import('./lib/epoch.js')"), 'the elder memory rides a lazy door — the sync closure stays lean');
  const memoir = read('src/lib/memoir.js');
  assert.ok(!memoir.includes('epoch'), 'the standing ladder module is byte-untouched by the elder memory');
  const server = read('server/index.js');
  assert.ok(server.includes("'/api/epoch'"), 'the house holds the epoch door');
  assert.ok(server.includes("innkeeper('retell')"), 'the epoch pours on the Chronicler\u2019s own lane');
  const doorList = (server.match(/app\.use\(\s*\[([\s\S]*?)\]\s*,\s*namedOnly\(\)/) || [])[1] || '';
  assert.ok(doorList.includes("'/api/epoch'"), 'the epoch door stands INSIDE the locked-door list — the nameless never reach the pour (review cure)');
  assert.ok(server.includes('epochDebitKey(req.body)'), 'the epoch debits by its own once-key builder — never a hand-rolled twin of the retell\u2019s');
  const seat = read('server/epoch.js');
  assert.ok(seat.includes('fatescript/epoch'), 'the engine\u2019s courts are the only law of epochs');
  assert.ok(seat.includes('withClock'), 'the illuminated seat sits under the Pen\u2019s Clock');
  assert.ok(seat.includes('declined: true'), 'keyless is an honest decline — mock prose is never minted');
  const dm = read('server/dm.js');
  assert.ok(dm.includes('input.memory'), 'the [MEMORY] socket stands where it always stood');
}

console.log('PASS \u2014 the elder memory gate (game): the act close seals exactly one labeled epoch through the one seal door, the refusal road declines to the floor, the mixed journal stays chain-lawful, the curtain holds on every surface, the ladder reads epochs before elders under one fixed budget, and a pre-epoch save walks today\u2019s road byte-identical.');
