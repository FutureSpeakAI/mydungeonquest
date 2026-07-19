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
import { verifyChronicle } from 'fatescript/desk';
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

// --- 5. The untouched export still opens the door ---
const restored = await importChronicle(structuredClone(exported));
assert.ok(restored.readOnly, 'a restored tale is read-only');
assert.equal(restored.headHash, exported.header.headHash, 'the restored spine carries the true head');

console.log('PASS — the desk gate (the table\u2019s side): a tale sealed through the table\u2019s own door verifies whole at the engine\u2019s desk, the re-spoken eye keeps its old shape for the table\u2019s courts, one flipped byte is refused by both mouths with one voice, a bent head seal falls at desk and door alike, and the untouched export still opens the door read-only.');
