// THE FIRST WORD GATE — Task 54C §3.1 (engine twin, pure fraction).
//
// The law (54C §1): at genesis the Dungeon Master's prologue request leaves
// the page BEFORE any paint request is made; genesis media kicks in parallel
// and takes as long as it takes. This gate proves the sequencer itself
// (fatescript/genesis — the module beginCampaign and openNext obey, reached
// at the table through the compat seat src/lib/genesis.js): driven with an
// ordered request ledger under adversarial, jittered timing, the pour's
// request must lead the ledger in EVERY round — deterministically, by
// construction, not by luck. Snagged pours (async and at-the-door), silent
// pours, and fallen easels (rejecting and synchronously-throwing) must
// starve nothing, and no lane may leak an unhandled rejection.
//
// STRIPPED (judged at the table's own gate): the late-plate DOM law —
// LogEntry (the app's own turn group) rendered mid-paint then handed its
// plate late, the DOM order holding (player's line, words, Listen, plate
// BELOW), the words untouched, no entrance animation — is React over the
// DOM and rides src/App.jsx; the engine has no window to render. That
// half also carried the headless prelude (react-test-renderer,
// fake-indexeddb, the window/document/navigator/fetch stage), all stripped
// with it — the engine sequencer needs none of it.
import assert from 'node:assert/strict';
import { beginGenesis } from '../src/genesis.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Containment is part of the law: nothing in the genesis lanes may leak an
// unhandled rejection — a snagged pour is the caller's to see, a fallen
// easel is contained, a starved gate is a defect.
const leaks = [];
process.on('unhandledRejection', (reason) => { leaks.push(String(reason)); });

// ---------------------------------------------------------------------------
// 1. The request ledger — the first word leads in every jittered round.
// ---------------------------------------------------------------------------
{
  for (let round = 0; round < 25; round += 1) {
    const ledger = [];
    // Deterministic jitter spread (no dice in a court): 0–40ms of pre-fetch
    // work — the memory ladder, the recalled scenes, the briefing — the very
    // work an eager easel would race past if the sequencer let it.
    const jitter = (round * 7919) % 41;
    let sealedSeen = null;
    const pour = async ({ onPourDispatched, mediaGate }) => {
      await sleep(jitter);
      ledger.push('dm-request');
      onPourDispatched();
      mediaGate.then(() => ledger.push('turn-media'));
      await sleep(5); // the stream drains
      return 'sealed';
    };
    const paint = async () => { ledger.push('paint-request'); await sleep(15); return 'minted'; };
    sealedSeen = await beginGenesis({ pour, paint });
    assert.equal(sealedSeen, 'sealed', `round ${round}: the caller receives the pour's own outcome`);
    await sleep(45); // the easel settles, the gate opens
    assert.equal(ledger[0], 'dm-request', `round ${round} (jitter ${jitter}ms): the first word leads the ledger — saw [${ledger.join(' → ')}]`);
    assert.ok(ledger.includes('paint-request'), `round ${round}: the easel was kicked`);
    assert.ok(ledger.indexOf('paint-request') > ledger.indexOf('dm-request'), `round ${round}: no paint precedes the pour — [${ledger.join(' → ')}]`);
    assert.ok(ledger.indexOf('turn-media') > ledger.indexOf('paint-request'), `round ${round}: the bench holds for the anchors — the turn's own media waits for the easel to settle — [${ledger.join(' → ')}]`);
  }
  console.log('THE LEDGER HOLDS — 25 jittered rounds, the first word led every one.');
}

// ---------------------------------------------------------------------------
// 2. A snagged pour (thrown before the wire) never starves the easel — and
//    the caller still sees the pour's own outcome.
// ---------------------------------------------------------------------------
{
  const ledger = [];
  const pour = async () => { await sleep(8); ledger.push('pour-snagged'); throw new Error('the road snagged before the wire'); };
  const paint = async () => { ledger.push('paint-request'); return 'minted'; };
  await assert.rejects(() => beginGenesis({ pour, paint }), /snagged before the wire/, 'the genesis promise is the pour\u2019s own');
  await sleep(30);
  assert.deepEqual(ledger, ['pour-snagged', 'paint-request'], `a snagged pour still leaves a painted table — paint fires once, after the settle — [${ledger.join(' → ')}]`);
}

// ---------------------------------------------------------------------------
// 2b. A pour that throws AT THE DOOR (synchronously, before any promise
//     exists) is contained the same way: the race still starts, paint still
//     fires once, and the caller receives the throw as the genesis's own
//     rejection.
// ---------------------------------------------------------------------------
{
  const ledger = [];
  const pour = () => { ledger.push('pour-threw-at-the-door'); throw new Error('snagged at the very door'); };
  const paint = async () => { ledger.push('paint-request'); return 'minted'; };
  await assert.rejects(() => beginGenesis({ pour, paint }), /at the very door/, 'a synchronous throw is still the pour\u2019s own outcome');
  await sleep(30);
  assert.deepEqual(ledger, ['pour-threw-at-the-door', 'paint-request'], `a pour that throws at the door still leaves a painted table — [${ledger.join(' → ')}]`);
}

// ---------------------------------------------------------------------------
// 3. A silent pour (resolves without ever signaling) never starves the easel.
// ---------------------------------------------------------------------------
{
  const ledger = [];
  const pour = async () => { await sleep(6); ledger.push('pour-silent'); return 'base'; };
  const paint = async () => { ledger.push('paint-request'); return 'minted'; };
  const outcome = await beginGenesis({ pour, paint });
  assert.equal(outcome, 'base');
  await sleep(30);
  assert.deepEqual(ledger, ['pour-silent', 'paint-request'], `a pour that never signals still opens the easel after it settles — [${ledger.join(' → ')}]`);
}

// ---------------------------------------------------------------------------
// 4. A fallen easel (paint rejects — or throws synchronously) still opens
//    the media gate: the turn's own plates are never starved.
// ---------------------------------------------------------------------------
{
  for (const [name, paint] of [
    ['rejecting easel', async () => { throw new Error('the easel fell'); }],
    ['synchronously-throwing easel', () => { throw new Error('the easel fell at once'); }]
  ]) {
    let gateOpened = false;
    const pour = async ({ onPourDispatched, mediaGate }) => {
      onPourDispatched();
      mediaGate.then(() => { gateOpened = true; });
      return 'sealed';
    };
    assert.equal(await beginGenesis({ pour, paint }), 'sealed');
    await sleep(20);
    assert.ok(gateOpened, `${name}: the gate opens on settle either way — gated turn media is never starved`);
  }
}

assert.deepEqual(leaks, [], `no genesis lane leaks an unhandled rejection: [${leaks.join(' | ')}]`);

console.log('PASS — the firstWord gate (engine twin, pure fraction): the prologue pour leaves the page before any paint request in every jittered round, snagged (async and at-the-door) and silent pours never starve the easel, a fallen easel never starves the bench, the anchors gate the turn\u2019s own media, and no lane leaks; the late-plate DOM law is judged at the table\u2019s own gate.');
