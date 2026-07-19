// THE DESK GATE (Task 60 §2) — a rich reference tale verifies whole,
// and one flipped byte anywhere is refused. The desk's defense runs in
// depth: tamper a record and the chain law names it; re-hash the
// tampered record and the break only moves to the next link; re-hash
// the tail and the head seal refuses; re-write the head seal and the
// signature court refuses the seal no forger can mint. The desk's own
// pen proves round-trip pure: mint a key, seal a chain, verify it,
// flip a byte, be refused — no database, no keys from the house, no
// network. The table's export door is judged at its own desk gate.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeEnvelope, verifyJournal, verifySignatures, verifyChronicle } from '../src/desk.js';

const tale = JSON.parse(readFileSync(new URL('./fixtures/tales/crown-intrigue.chronicle.json', import.meta.url), 'utf8'));

// --- 1. The reference tale verifies whole ---
assert.equal(tale.header.signatureStatus, 'signed', 'the reference tale claims a signature — the hardest desk');
const whole = await verifyChronicle(tale);
assert.equal(whole.ok, true, `the desk believes the untouched tale: ${whole.reason || ''}`);
assert.equal(whole.verdicts.length, tale.journal.length, 'every record was weighed');
assert.ok(whole.verdicts.every((verdict) => verdict.ok), 'every record holds');

// --- 2. One flipped byte in a sealed field: the chain law names the record ---
const flipped = structuredClone(tale);
flipped.journal[10].ts += 1;
let verdict = await verifyChronicle(flipped);
assert.equal(verdict.ok, false);
assert.equal(verdict.reason, 'the seal is broken at record 10 — this chronicle has been altered', 'the refusal speaks the door\u2019s own words and names the seat');

// --- 3. Re-hash the tampered record: the break moves to the next link ---
const rehashed = structuredClone(tale);
rehashed.journal[10].ts += 1;
const forged = await makeEnvelope({ type: rehashed.journal[10].type, i: rehashed.journal[10].i, prevHash: rehashed.journal[10].prevHash, payload: rehashed.journal[10].payload, ts: rehashed.journal[10].ts });
rehashed.journal[10].recordHash = forged.recordHash;
verdict = await verifyChronicle(rehashed);
assert.equal(verdict.ok, false);
assert.match(verdict.reason, /broken at record 11/, 'the forger only moved the break down the chain');

// --- 4. Re-hash the tail: the head seal refuses; re-write the head: the signature court refuses ---
const tailForged = structuredClone(tale);
const last = tailForged.journal.length - 1;
tailForged.journal[last].ts += 1;
const tailEnvelope = await makeEnvelope({ type: tailForged.journal[last].type, i: tailForged.journal[last].i, prevHash: tailForged.journal[last].prevHash, payload: tailForged.journal[last].payload, ts: tailForged.journal[last].ts });
tailForged.journal[last].recordHash = tailEnvelope.recordHash;
verdict = await verifyChronicle(tailForged);
assert.equal(verdict.ok, false);
assert.equal(verdict.reason, 'the head seal does not match the journal — this chronicle has been altered');
tailForged.header.headHash = tailEnvelope.recordHash;
verdict = await verifyChronicle(tailForged);
assert.equal(verdict.ok, false);
assert.match(verdict.reason, /the signature does not hold at record \d+ — this chronicle has been altered/, 'the last stand: a seal no forger can mint');

// --- 4b. The forger's last move — claim the tale was never signed — meets the downgrade door ---
tailForged.header.signatureStatus = 'hash-only';
verdict = await verifyChronicle(tailForged);
assert.equal(verdict.ok, false);
assert.equal(verdict.reason, 'the chronicle carries signature evidence but claims none — a downgraded seal is refused', 'the laundering path is named and shut');
tailForged.header.publicKeyJwk = null;
verdict = await verifyChronicle(tailForged);
assert.equal(verdict.ok, false, 'burning the header key is not enough while any record carries ink');

// --- 5. A truncated journal loses the head ---
const truncated = structuredClone(tale);
truncated.journal.pop();
verdict = await verifyChronicle(truncated);
assert.equal(verdict.ok, false);
assert.equal(verdict.reason, 'the head seal does not match the journal — this chronicle has been altered');

// --- 6. The desk's own pen, round-trip pure: mint, seal, verify, flip, refuse ---
const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const signer = { signed: true, privateKey: pair.privateKey };
const publicKeyJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
const chain = [];
let prevHash = null;
const seals = [
  { type: 'turn', payload: { player: 'I cross the ford at dusk.', dm: { narration_blocks: [{ text: 'The ford remembers your name.' }] } } },
  { type: 'tick', payload: { ops: [{ name: 'Mirabel', fact_add: 'Offscreen — presses on toward the mill\u2019s debt.' }] } },
  { type: 'redaction', payload: { target: 0, reason: 'the player struck the line' } }
];
for (let i = 0; i < seals.length; i += 1) {
  const record = await makeEnvelope({ type: seals[i].type, i, prevHash, payload: seals[i].payload, ts: 1784000000000 + i, signer });
  chain.push(record);
  prevHash = record.recordHash;
}
const fresh = await verifyJournal(chain);
assert.ok(fresh.every((row) => row.ok), 'the desk believes its own pen');
assert.deepEqual(Object.keys(fresh[0]).sort(), ['actual', 'expected', 'i', 'ok'], 'verdicts keep the door\u2019s shape');
assert.equal((await verifySignatures(chain, publicKeyJwk)).ok, true, 'the signatures hold against the exported key');
const bent = structuredClone(chain);
bent[1].payload.ops[0].fact_add = 'Offscreen — presses on toward the mill\u2019s debt!';
assert.equal((await verifyJournal(bent))[1].ok, false, 'one flipped byte in the prose and the record falls');
const wrongPen = await verifySignatures(chain.map((row) => ({ ...row, signature: chain[0].signature })), publicKeyJwk);
assert.equal(wrongPen.ok, false, 'a borrowed signature does not hold');

// --- 6b. The honest unsigned tale still walks: no claim, no evidence, chain true ---
const plainChain = [];
let plainPrev = null;
for (let i = 0; i < 2; i += 1) {
  const record = await makeEnvelope({ type: 'turn', i, prevHash: plainPrev, payload: { player: 'a step', dm: { narration_blocks: [{ text: 'a step taken' }] } }, ts: 1784000100000 + i });
  plainChain.push(record);
  plainPrev = record.recordHash;
}
const plainTale = { header: { format: 'mydungeon.chronicle', version: 1, headHash: plainPrev, signatureStatus: 'hash-only', publicKeyJwk: null }, journal: plainChain };
assert.equal((await verifyChronicle(plainTale)).ok, true, 'a born-unsigned tale is refused nothing');

// --- 7. The fail-closed door: malformed envelopes prove nothing ---
for (const junk of [null, 42, {}, { header: { format: 'somebody-else' }, journal: [] }, { header: { format: 'mydungeon.chronicle' }, journal: 'not-a-list' }]) {
  const refused = await verifyChronicle(junk);
  assert.equal(refused.ok, false, 'the desk reads only chronicle envelopes');
}
assert.deepEqual(await verifyJournal('not-a-list'), [], 'a journal that is not a list proves nothing');

console.log('PASS — the desk gate: the rich reference tale verifies whole (every record weighed, signatures and all), one flipped byte is refused with the door\u2019s own words, a re-hashing forger only moves the break until the head seal and then the signature court stop him cold, the downgrade door shuts the laundering path while any evidence rides, the born-unsigned tale still walks, the desk\u2019s own pen round-trips pure, and malformed envelopes prove nothing.');
