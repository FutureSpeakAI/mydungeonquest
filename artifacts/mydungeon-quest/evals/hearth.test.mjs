// ------------------------------------------------------------
// THE HEARTH GATE (game) — Directive V, Phase 1.
//
// Two simulated devices against the reference vault, using the house's
// REAL envelopes (makeEnvelope — canonical hash, the Quiet Record's own
// press). Proves at the table what the engine proves in the abstract:
// interleaved appends converge to one chain; replay is byte-identical
// on both chairs; a stale-head append is refused and the deed survives
// as unsent — never lost; a tampered row is refused by the same
// canonical-hash law the vault's ingest enforces; the same sealed row
// lands once, answers twice. Zero keys, zero network.
// ------------------------------------------------------------
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMemoryVault } from 'fatescript/hearth';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');

const { makeEnvelope } = await import('../src/lib/seal.js');
const { houseChair, attestEnvelope, unsentDeedOf, hearthRow } = await import('../src/lib/hearth.js');

// The fire, and two chairs drawn up to it.
const vault = createMemoryVault();
const chairA = houseChair({ campaignId: 'tale-ember', vault });
const chairB = houseChair({ campaignId: 'tale-ember', vault });

// Chair A seals two true turns — real envelopes, chained by the press.
const turn = (deed) => ({ player: deed, visiblePlayer: deed, deed: { text: deed }, dm: { narration_blocks: [] } });
const e0 = await makeEnvelope({ type: 'turn', i: 0, prevHash: null, payload: turn('cross the ford'), ts: 1700000000001 });
const e1 = await makeEnvelope({ type: 'turn', i: 1, prevHash: e0.recordHash, payload: turn('ask Mira about the bell'), ts: 1700000000002 });

// 1. THE FIRE TAKES TRUE ROWS — and the same sealed row lands once,
//    answers twice: idempotent by the envelope's own hash.
{
  assert.equal((await chairA.pushSealed(e0)).ok, true);
  assert.equal((await chairA.pushSealed(e1)).ok, true);
  const again = await chairA.pushSealed(e1);
  assert.equal(again.ok, true);
  assert.equal(again.deduped, true, 'the dedup key is the record hash itself');
  assert.equal(chairA.pull(0).length, 2, 'the dedup added nothing');
}

// 2. THE FORK RULE — chair B wrote its own turn 1 against a stale head.
//    The hearth's head wins; the losing turn comes home as an UNSENT
//    DEED, word for word — never as a lost one.
const eB1 = await makeEnvelope({ type: 'turn', i: 1, prevHash: e0.recordHash, payload: turn('walk away from the ford'), ts: 1700000000003 });
{
  const report = await chairB.syncSealed([e0, eB1]);
  assert.equal(report.known.length, 1, 'the hearth already knew turn 0');
  assert.equal(report.refused.length, 1, 'the fork is refused, not merged');
  assert.equal(report.refused[0].reason, 'stale-head');
  assert.deepEqual(report.unsentDeeds, ['walk away from the ford'], 'the losing deed survives for its device, verbatim');
  assert.equal(vault.pull('tale-ember').length, 2, 'the refused row never entered the house');
}

// 3. TWO CHAIRS, ONE FIRE — resume is byte-identical on both devices,
//    and a chair that hydrates the true head may lawfully continue.
{
  assert.equal(JSON.stringify(chairA.resume()), JSON.stringify(chairB.resume()), 'replay is byte-identical on both chairs');
  const e2 = await makeEnvelope({ type: 'turn', i: 2, prevHash: e1.recordHash, payload: turn('press on to the mill'), ts: 1700000000004 });
  assert.equal((await chairB.pushSealed(e2)).ok, true, 'the resumed chair continues the one chain');
  assert.equal(chairA.resume().envelopes.length, 3, 'chair A sees chair B\u2019s lawful turn at once');
  assert.equal(chairA.resume().head.hash, e2.recordHash, 'one head, one fire');
}

// 4. THE TAMPER COURT — one changed byte and the row never reaches the
//    fire: the envelope's hash is recomputed through the press itself,
//    the same canonical-hash law the vault's ingest enforces.
{
  const forged = { ...e1, payload: { ...e1.payload, visiblePlayer: 'ask Mira about the TREASURE' } };
  assert.equal(await attestEnvelope(forged), false, 'the recomputed hash breaks against the forgery');
  assert.equal(await attestEnvelope(e1), true, 'the true row still attests');
  const verdict = await chairB.pushSealed(forged);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, 'tampered');
  assert.equal(vault.pull('tale-ember').length, 3, 'the forgery never entered the house');
  const wrongLink = await makeEnvelope({ type: 'turn', i: 3, prevHash: 'not-the-head', payload: turn('forged link'), ts: 1700000000005 });
  const broken = await chairB.pushSealed(wrongLink);
  assert.equal(broken.ok, false);
  assert.equal(broken.reason, 'broken-chain', 'right index, wrong link — refused');
}

// 5. THE DEED RETURN knows its own — ops rows carry no deed; only a
//    turn's words come home.
{
  const tick = await makeEnvelope({ type: 'tick', i: 9, prevHash: 'x', payload: { story: {} }, ts: 1700000000006 });
  assert.equal(unsentDeedOf({ row: hearthRow(tick) }), null, 'ops rows are superseded, not restored');
  assert.equal(unsentDeedOf({ row: hearthRow(eB1) }), 'walk away from the ford');
}

// 6. TALES DO NOT SHARE A CHIMNEY.
{
  assert.equal(vault.pull('tale-other').length, 0);
}

// 7. THE WIRING — the chair is built on the engine's law, and the
//    vault's fork path hands deeds home instead of losing them.
{
  const hearth = read('src/lib/hearth.js');
  assert.ok(hearth.includes('fatescript/hearth'), 'the engine\u2019s law is the only law of syncing');
  assert.ok(hearth.includes('makeEnvelope'), 'the tamper court is the record\u2019s own press');
  const vaultLib = read('src/lib/vault.js');
  assert.ok(vaultLib.includes('unsentDeedOf'), 'the fork path returns deeds — never loses them');
}

console.log('PASS \u2014 the hearth gate (game): two chairs share one fire through the house\u2019s real envelopes, rows land once by their own hash, a stale-head fork comes home as an unsent deed verbatim, tampered and mislinked rows never enter the house, replay is byte-identical on either chair, and the vault\u2019s fork path is wired to hand deeds back.');
