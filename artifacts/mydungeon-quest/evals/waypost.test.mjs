// THE WAYPOST LAW, the table's side (Task 65 Phase 5 — Directive XX,
// Law VI) — replay is truth; the waypost is a proven shortcut. The
// engine twin proves the pure seats (fold parity, tamper courts, the
// hash laws); THIS court proves the house wears it honestly:
//   · both turn roads raise posts through ONE helper at stride 25,
//   · custody stays green with checkpoints aboard (journal, chronicle),
//   · every rewired reader is byte-identical with and without the post,
//   · the resumed road is GENUINELY engaged (a bent cover proves the
//     cursor answered, not a silent full walk),
//   · a strike behind the newest post falls back to the elder; a strike
//     behind both restores the full walk — silently, per the law,
//   · wayposts never enter the played record and never render,
//   · elder tales (born before the law) read exactly as they always did.
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { db, campaignJournal, saveCampaign } from '../src/lib/db.js';
import { appendEvent, exportChronicle, verifyJournal } from '../src/lib/seal.js';
import { verifyChronicle } from 'fatescript/desk';
import { walkFolds } from 'fatescript/waypost';
import { cardsForCampaign } from 'fatescript/cards';
import { packClock } from 'fatescript/clock';
import { chartOf } from 'fatescript/chart';
import { tellCourt } from '../src/lib/tells.js';
import { sealWaypostIfDue, hydrateWaypost, foldsAt, cardsAt, packClockAt, tellCourtAt, chartAt, WAYPOST_KIND, WAYPOST_STRIDE } from '../src/lib/waypost.js';
import { initCodex } from 'fatescript/story';
import { buildStorybook } from '../src/lib/storybook.js';

const J = (value) => JSON.stringify(value);
const hero = { name: 'Wren of the Vale', level: 3, hp: 14, maxHp: 14 };
const codex = initCodex('classic-epic');
const id = 'waypost-proof';
await db.campaigns.put({ id, title: 'The Long Road Proof', hero, codex, logs: [], turnNumber: 0, turnCount: 0, headHash: null, mediaTier: 'illuminated', signatureStatus: 'pending', forkOf: null, createdAt: Date.now(), updatedAt: Date.now() });

// --- 1. The walk: fifty-five turns through the very hook both roads call ---
const seal = (campaignId, type, payload) => appendEvent(campaignId, type, payload);
let logs = [];
let turnNumber = 0;
const posts = [];
for (let t = 1; t <= 55; t += 1) {
  const dm = {
    narration_blocks: [
      { speaker: 'DM', text: `Turn ${t}: the palisade gate held, and the ledger of the road grew a line.` },
      { speaker: hero.name, text: t % 4 === 0 ? `"The road holds, turn ${t}," Wren said. Her heart pounded against the quiet.` : `"The road holds, turn ${t}," Wren said, and counted the wagons.` }
    ],
    time_advance: { n: t % 3, unit: 'hours' }
  };
  const log = { id: crypto.randomUUID(), player: `I walk the road, turn ${t}.`, deed: null, sent: `I walk the road, turn ${t}.`, dm, ts: 1700000000000 + t * 1000, resolution: null, redacted: false, turn: t - 1, beatIndex: 0 };
  logs = [...logs, log];
  turnNumber += 1;
  await saveCampaign({ id, title: 'The Long Road Proof', hero, codex, logs, turnNumber });
  const record = await appendEvent(id, 'turn', { player: log.player, dm });
  log.recordHash = record.recordHash;
  const post = await sealWaypostIfDue({ id, hero, logs, turnNumber }, seal);
  if (post) posts.push(post);
}
assert.equal(posts.length, 2, 'two wayposts raised across fifty-five turns');
assert.equal(posts[0].rows, 25, 'the first post covers twenty-five rows');
assert.equal(posts[1].rows, 50, 'the second post covers fifty rows');
assert.equal(posts[0].turn, 24, 'the first post carries the covered record\u2019s own last turn stamp');
assert.equal(posts[1].turn, 49, 'the second post carries the covered record\u2019s own last turn stamp');

// --- 2. Custody stays green with checkpoints aboard ---
const journal = await campaignJournal(id);
assert.equal(journal.filter((row) => row.type === WAYPOST_KIND).length, 2, 'both posts seated in the journal chain');
const spoken = await verifyJournal(journal);
assert.ok(spoken.every((row) => row.ok), 'the chain verifies whole with wayposts aboard');
const exported = await exportChronicle(id);
const desk = await verifyChronicle(exported);
assert.equal(desk.ok, true, `the desk believes a chronicle carrying wayposts: ${desk.reason || ''}`);
assert.equal(exported.journal.filter((row) => row.type === WAYPOST_KIND).length, 2, 'the export carries the posts — they belong to the record');

// --- 3. The hydrate door seats the NEWEST standing post ---
const campaign = { id, title: 'The Long Road Proof', hero, codex, logs, turnNumber };
const seated = await hydrateWaypost(journal, campaign);
assert.ok(seated && seated.rows === 50, 'the newest post is chosen at the door');
assert.equal(J(seated), J(posts[1]), 'the journal round-trip returns the checkpoint byte for byte');
campaign.waypost = seated;

// --- 4. Every rewired reader: byte-identical with the post, without it, and against the direct it shadows ---
const bare = { ...campaign, waypost: null };
assert.ok(campaign.waypost.rows < campaign.logs.length, 'the resumed road has a genuine tail to fold');
assert.equal(J(foldsAt(campaign)), J(walkFolds({ hero, entries: logs })), 'the whole fold cursor: resumed byte-identical to the full walk');
assert.equal(J(cardsAt(campaign)), J(cardsAt(bare)), 'cards: post and no post agree');
assert.equal(J(cardsAt(campaign)), J(cardsForCampaign(campaign)), 'cards: the reader matches the direct it replaced, whole finish for whole finish');
assert.equal(J(packClockAt(campaign)), J(packClockAt(bare)), 'pack clock: post and no post agree');
assert.equal(J(packClockAt(campaign)), J(packClock(logs)), 'pack clock: the reader matches the direct it replaced');
assert.equal(J(tellCourtAt(campaign)), J(tellCourtAt(bare)), 'tell court: post and no post agree');
assert.equal(J(tellCourtAt(campaign)), J(tellCourt(campaign)), 'tell court: the reader matches the direct it replaced');
assert.ok(tellCourtAt(campaign).report.offenders.length > 0, 'the court convicts through the resumed road too');
assert.equal(J(chartAt(campaign)), J(chartAt(bare)), 'chart: post and no post agree');
assert.equal(J(chartAt(campaign)), J(chartOf(campaign)), 'chart: the reader matches the direct it replaced');

// --- 5. The resumed road is GENUINELY engaged: bend a covered line and the two roads split ---
// The record court pins the cover's LAST row and the struck set — not every
// covered byte (the sealed cursor answers for those). So a bent covered line
// leaves the post standing: the resumed road speaks from the sealed cursor,
// the full walk speaks from the bent record, and they DIFFER — proof the
// shortcut answered. Custody is the desk's law, not the waypost's: the same
// bend is refused outright by verifyChronicle above.
const bent = { ...campaign, logs: campaign.logs.map((row) => ({ ...row, dm: structuredClone(row.dm) })) };
bent.logs[3].dm.narration_blocks[1].text = 'A plain line, with no tell at all.';
assert.notEqual(J(tellCourtAt(bent)), J(tellCourtAt({ ...bent, waypost: null })), 'the resumed road answered from the sealed cursor — it did not silently walk the full record');

// --- 6. A strike behind the newest post un-seats it; the elder stands in ---
logs = logs.map((row, i) => (i === 29 ? { ...row, redacted: true } : row));
await appendEvent(id, 'redaction', { target: 29, reason: 'the player struck the line' });
await saveCampaign({ id, title: 'The Long Road Proof', hero, codex, logs, turnNumber });
const struckOnce = { id, title: 'The Long Road Proof', hero, codex, logs, turnNumber };
const elder = await hydrateWaypost(await campaignJournal(id), struckOnce);
assert.ok(elder && elder.rows === 25, 'the newest post falls to the strike behind it; the elder still stands');
struckOnce.waypost = elder;
assert.equal(J(foldsAt(struckOnce)), J(walkFolds({ hero, entries: logs })), 'resumed from the elder: still byte-identical to the full walk over the struck record');

// --- 7. A strike behind BOTH posts restores the full walk — silently ---
logs = logs.map((row, i) => (i === 3 ? { ...row, redacted: true } : row));
await appendEvent(id, 'redaction', { target: 3, reason: 'the player struck the line' });
await saveCampaign({ id, title: 'The Long Road Proof', hero, codex, logs, turnNumber });
const struckTwice = { id, title: 'The Long Road Proof', hero, codex, logs, turnNumber };
assert.equal(await hydrateWaypost(await campaignJournal(id), struckTwice), null, 'no post stands — the door seats nothing');
struckTwice.waypost = posts[1];
assert.equal(J(foldsAt(struckTwice)), J(walkFolds({ hero, entries: logs })), 'a stale post handed straight to the reader is refused by the record court — the full walk stands in, byte for byte');

// --- 7b. The snapshot door: the seat itself never persists ---
// A forged checkpoint wearing REAL pins (rows, cover, canon, struck set)
// would pass the sync record court by design — proof lives at the hydrate
// door and the seal seat only. So the table's write door must make such a
// seat unreachable: every campaigns write (save, import, fork, restore)
// strips the field, and a reloaded snapshot re-proves from the chain.
const forged = { ...posts[1], folds: structuredClone(posts[1].folds) };
forged.folds.__forgedMark = 'bent bytes wearing real pins';
await db.campaigns.put({ ...(await db.campaigns.get(id)), waypost: forged });
let reloaded = await db.campaigns.get(id);
assert.ok(reloaded && !('waypost' in reloaded), 'a put snapshot cannot carry the seat — stripped at the one table door');
await db.campaigns.update(id, { waypost: forged });
reloaded = await db.campaigns.get(id);
assert.ok(reloaded && !('waypost' in reloaded), 'an update cannot smuggle the seat either');
await saveCampaign({ ...struckTwice, waypost: forged });
reloaded = await db.campaigns.get(id);
assert.ok(reloaded && !('waypost' in reloaded), 'saveCampaign never persists the seat');
assert.equal(await hydrateWaypost(await campaignJournal(id), reloaded), null, 'the reloaded snapshot re-proves from the chain — the forged folds never seat (no post stands over the struck record)');

// --- 7c. The session court: the reader refuses foreign seats (the import road) ---
// The table door guards the STORE; this guards the LIVING session. A
// restore hands its own parsed object straight to live state — so a seat
// wearing REAL pins (the elder's cover still stands over this struck
// record) but carrying another cut's folds, never proven by this
// session's hydrate court or seal seat, must be refused by the reader
// itself: seats are proven by road, not by shape.
const foreign = { ...struckOnce, waypost: { ...posts[0], folds: structuredClone(posts[1].folds) } };
assert.equal(J(foldsAt(foreign)), J(walkFolds({ hero, entries: foreign.logs })), 'a foreign seat with real pins and lying folds is refused by the session court — the full walk stands, byte for byte');

// --- 8. The curtain: wayposts are machinery, never story ---
assert.ok(campaign.logs.every((row) => row.type !== WAYPOST_KIND && row?.dm?.kind !== WAYPOST_KIND), 'no waypost ever enters the played record the feed and book read');
assert.ok(J(cardsAt(campaign)).includes('waypost') === false && J(chartAt(campaign)).includes('waypost') === false, 'no reader speaks the word — the shortcut leaves no mark on the story');
// The storybook is one file with two natures: rendered pages (story) and
// the embedded verifier-format proof (custody). The chain CANNOT verify
// with rows missing, so the proof block must carry the posts whole — and
// the rendered pages must never speak the word. Cut along the proof's own
// unique format marker and hold each nature to its own law.
const bookHtml = buildStorybook({ campaign, journal, media: [], reveals: [] });
const proofMark = bookHtml.indexOf('mydungeon.chronicle');
assert.ok(proofMark > -1, 'the keepsake carries its own evidence');
const proofOpen = bookHtml.lastIndexOf('<script', proofMark);
const proofClose = bookHtml.indexOf('</script>', proofMark);
const renderedPages = bookHtml.slice(0, proofOpen) + bookHtml.slice(proofClose + '</script>'.length);
assert.ok(!renderedPages.toLowerCase().includes(WAYPOST_KIND), 'the rendered pages never speak the word — machinery is not story');
assert.ok(bookHtml.slice(proofOpen, proofClose).includes(`"type":"${WAYPOST_KIND}"`), 'the embedded proof carries the posts whole — the chain cannot verify with rows missing');

// --- 9. An elder tale, born before the law, reads exactly as it always did ---
const elderId = 'waypost-elder';
await db.campaigns.put({ id: elderId, title: 'The Elder Tale', hero, logs: [], turnNumber: 0, turnCount: 0, headHash: null, mediaTier: 'illuminated', signatureStatus: 'pending', forkOf: null, createdAt: Date.now(), updatedAt: Date.now() });
let elderLogs = [];
for (let t = 1; t <= 10; t += 1) {
  const dm = { narration_blocks: [{ speaker: 'DM', text: `Elder turn ${t}.` }], time_advance: { n: 1, unit: 'hours' } };
  const log = { id: crypto.randomUUID(), player: `elder deed ${t}`, dm, ts: 1700000000000 + t * 1000, resolution: null, redacted: false, turn: t - 1, beatIndex: 0 };
  elderLogs = [...elderLogs, log];
  const record = await appendEvent(elderId, 'turn', { player: log.player, dm });
  log.recordHash = record.recordHash;
  const post = await sealWaypostIfDue({ id: elderId, hero, logs: elderLogs, turnNumber: t }, seal);
  assert.equal(post, null, 'no post below the stride — the elder tale is untouched');
}
const elderJournal = await campaignJournal(elderId);
assert.equal(elderJournal.filter((row) => row.type === WAYPOST_KIND).length, 0, 'an elder tale carries no posts');
assert.equal(await hydrateWaypost(elderJournal, { id: elderId, hero, logs: elderLogs }), null, 'the door seats nothing for an elder tale');
const elderTale = { id: elderId, hero, logs: elderLogs, waypost: null };
assert.equal(J(cardsAt(elderTale)), J(cardsForCampaign(elderTale)), 'the elder tale reads exactly as it always did');

console.log(`PASS — the waypost law (the table\u2019s side): stride ${WAYPOST_STRIDE} raised posts at turns 25 and 50 through the ONE helper both roads share, custody green with checkpoints aboard (journal and chronicle alike), every rewired reader (folds, cards, pack clock, tell court, chart) byte-identical with and without the post and against the direct it replaced, the resumed road genuinely engaged (a bent cover split the roads), a strike behind the newest post fell back to the elder and a strike behind both restored the full walk in silence, a stale post was refused by the record court, no waypost ever touches the played record, and an elder tale born before the law reads untouched.`);
