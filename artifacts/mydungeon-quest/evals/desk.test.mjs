// THE DESK GATE, the table's side (Task 60 §2) — the table exports a
// tale through its own seal door, and the ENGINE's desk verifies it:
// the parity law made flesh. One flipped byte and both mouths refuse
// with one voice — the desk's verdict and the import door's throw.
// The engine's own desk gate proves the pure ladder (re-hash forgers,
// head seals, signature courts); this gate proves the two halves meet:
// database custody on this side, pure verification on that side, one
// seat for the law between them.
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { verifyChronicle, makeEnvelope } from 'fatescript/desk';
import { db } from '../src/lib/db.js';
import { appendEvent, exportChronicle, importChronicle, verifyJournal } from '../src/lib/seal.js';

const campaignId = 'desk-proof';
await db.campaigns.put({ id: campaignId, title: 'The Desk Proof', turnCount: 0, headHash: null, mediaTier: 'illuminated', signatureStatus: 'pending', forkOf: null, createdAt: Date.now(), updatedAt: Date.now() });

// --- 1. The table seals a tale through its own door ---
await appendEvent(campaignId, 'turn', { player: 'I cross the ford at dusk.', dm: { narration_blocks: [{ text: 'The ford remembers your name.' }] } });
await appendEvent(campaignId, 'turn', { player: 'I ask the miller about the debt.', dm: { narration_blocks: [{ text: 'He will not meet your eyes.' }] } });
await appendEvent(campaignId, 'tick', { ops: [{ name: 'Mirabel', fact_add: 'Offscreen — presses on toward the mill\u2019s debt.' }] });
await appendEvent(campaignId, 'redaction', { target: 1, reason: 'the player struck the line' });
await appendEvent(campaignId, 'reconciliation', { note: 'the lanes agreed' });

// --- 2. The export crosses the bridge and the engine's desk believes it ---
const exported = await exportChronicle(campaignId);
assert.equal(exported.journal.length, 5, 'five records sealed');
const verdict = await verifyChronicle(exported);
assert.equal(verdict.ok, true, `the engine desk believes the table\u2019s export: ${verdict.reason || ''}`);
assert.equal(verdict.verdicts.length, 5, 'every record weighed');
const spoken = await verifyJournal(exported.journal);
assert.ok(spoken.every((row) => row.ok) && 'i' in spoken[0] && 'expected' in spoken[0], 'the table\u2019s re-spoken verifyJournal keeps the old shape for its own courts');

// --- 3. One flipped byte: both mouths refuse with one voice ---
const bent = structuredClone(exported);
bent.journal[0].payload.dm.narration_blocks[0].text = 'The ford forgets your name.';
const refused = await verifyChronicle(bent);
assert.equal(refused.ok, false);
assert.equal(refused.reason, 'the seal is broken at record 0 — this chronicle has been altered', 'the desk names the seat in the door\u2019s own words');
await assert.rejects(() => importChronicle(structuredClone(bent)), /the seal is broken at record 0/, 'the import door refuses the same byte with the same words');

// --- 4. A bent head seal: refused at the desk, refused at the door ---
const crowned = structuredClone(exported);
crowned.header.headHash = crowned.journal[0].recordHash;
assert.equal((await verifyChronicle(crowned)).reason, 'the head seal does not match the journal — this chronicle has been altered');
await assert.rejects(() => importChronicle(structuredClone(crowned)), /head seal does not match/, 'one law, two mouths');

// --- 4b. The laundering path end to end: tamper, re-hash, re-crown, then claim unsigned — both mouths refuse ---
const laundered = structuredClone(exported);
const lastSeat = laundered.journal.length - 1;
laundered.journal[lastSeat].payload.note = 'a quieter ending';
const forgedTail = await makeEnvelope({ type: laundered.journal[lastSeat].type, i: laundered.journal[lastSeat].i, prevHash: laundered.journal[lastSeat].prevHash, payload: laundered.journal[lastSeat].payload, ts: laundered.journal[lastSeat].ts });
laundered.journal[lastSeat] = { ...laundered.journal[lastSeat], ...forgedTail };
laundered.header.headHash = forgedTail.recordHash;
laundered.header.signatureStatus = 'hash-only';
const launderedVerdict = await verifyChronicle(laundered);
assert.equal(launderedVerdict.ok, false);
assert.match(launderedVerdict.reason, /a downgraded seal is refused/, 'the desk names the laundering');
await assert.rejects(() => importChronicle(structuredClone(laundered)), /a downgraded seal is refused/, 'the import door refuses the laundering with the desk\u2019s own words');

// --- 4c. The total burn imports — but seated as unsigned, never as signed ---
// A wholesale re-authored unsigned tale is indistinguishable from a
// born-unsigned one; that residual belongs to the format, and provenance
// beyond the envelope is the keeper's law (the manifest pins its heads).
// What the door guarantees: the signed CLAIM cannot be laundered — the
// forger's prize visibly says unsigned.
const burned = structuredClone(laundered);
burned.header.publicKeyJwk = null;
for (const row of burned.journal) row.signature = null;
assert.equal((await verifyChronicle(burned)).ok, true, 'no claim, no evidence — the unsigned door stays open');
const burnedIn = await importChronicle(structuredClone(burned));
assert.equal(burnedIn.signatureStatus, 'hash-only', 'the forger\u2019s prize says unsigned to every eye');

// --- 5. The untouched export still opens the door ---
const restored = await importChronicle(structuredClone(exported));
assert.ok(restored.readOnly, 'a restored tale is read-only');
assert.equal(restored.headHash, exported.header.headHash, 'the restored spine carries the true head');

// --- 6. The restored spine keeps its provenance: a re-export verifies whole at the desk ---
const reExported = await exportChronicle(restored.id);
assert.equal(reExported.header.signatureStatus, 'signed', 'the restored spine still claims what was proven');
assert.ok(reExported.header.publicKeyJwk, 'the public key rode forward with the restore');
const reVerdict = await verifyChronicle(reExported);
assert.equal(reVerdict.ok, true, `the re-export verifies whole at the desk: ${reVerdict.reason || ''}`);

console.log('PASS — the desk gate (the table\u2019s side): a tale sealed through the table\u2019s own door verifies whole at the engine\u2019s desk, the re-spoken eye keeps its old shape for the table\u2019s courts, one flipped byte is refused by both mouths with one voice, the laundering path (tamper, re-hash, re-crown, claim unsigned) is refused by desk and door alike while the total burn seats visibly as unsigned, the restored spine\u2019s provenance rides its re-export, and the untouched export still opens read-only.');
