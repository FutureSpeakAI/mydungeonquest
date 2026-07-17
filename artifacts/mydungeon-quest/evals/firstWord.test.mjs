// THE FIRST WORD GATE — Task 54C §3.1 (keyless, mock tier, no browser).
//
// The law (54C §1): at genesis the Dungeon Master's prologue request leaves
// the page BEFORE any paint request is made; genesis media kicks in parallel
// and takes as long as it takes; a plate that arrives after its narration
// slots into its lawful seat below the text without reordering, displacing,
// or interrupting a word.
//
// Two halves, both instrumented:
//   1. The sequencer itself (src/lib/genesis.js — the module beginCampaign
//      and openNext obey) is driven with an ordered request ledger under
//      adversarial, jittered timing: slow pre-fetch pour work, an eager
//      easel. The pour's request must lead the ledger in EVERY round —
//      deterministically, by construction, not by luck. Snagged pours,
//      silent pours, and fallen easels must starve nothing.
//   2. The late plate slots lawfully: LogEntry (the app's own turn group)
//      is rendered mid-paint and then handed its plate late; the DOM order
//      — player's line, words, Listen, plate BELOW — must hold unchanged
//      through the arrival (G14a within the group), the words byte-for-byte
//      untouched, and the arrival must add no entrance animation class (the
//      reduced-motion law is honored by never animating the swap at all).
//
// Headless — react-test-renderer + fake-indexeddb; fetch is a recording
// stub. No AI keys, no paint keys, no browser.

import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { createRequire, register } from 'node:module';

register('./jsxLoader.mjs', import.meta.url);

const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const { act } = TestRenderer;
const React = require('react');
const h = React.createElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// The smallest possible stage (the arrival gate's own prelude): a window
// that only remembers listeners, a document that can take a CSS custom
// property, a navigator that cannot vibrate, blob URLs keyed by MIME type,
// and a fetch that records every ask and answers mock.
const winListeners = {};
globalThis.window = {
  addEventListener: (type, fn) => { (winListeners[type] ??= new Set()).add(fn); },
  removeEventListener: (type, fn) => { winListeners[type]?.delete(fn); }
};
globalThis.document ??= { documentElement: { style: { setProperty() {} } }, activeElement: null, contains: () => false };
globalThis.navigator ??= {};
globalThis.URL.createObjectURL = (blob) => `blob:test/${blob?.type || 'unknown'}`;
globalThis.URL.revokeObjectURL = () => {};
const fetchLog = [];
globalThis.fetch = async (url) => {
  fetchLog.push(String(url));
  return { ok: true, blob: async () => new Blob(['mock'], { type: 'audio/mpeg' }), json: async () => ({}), headers: { get: (k) => (k === 'X-Media-Provider' ? 'mock' : null) } };
};

// Containment is part of the law: nothing in the genesis lanes may leak an
// unhandled rejection — a snagged pour is the caller's to see, a fallen
// easel is contained, a starved gate is a defect.
const leaks = [];
process.on('unhandledRejection', (reason) => { leaks.push(String(reason)); });

const { beginGenesis } = await import('../src/lib/genesis.js');
const { LogEntry } = await import('../src/App.jsx');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const textOf = (node) => node == null || typeof node === 'boolean' ? ''
  : (typeof node === 'string' || typeof node === 'number') ? String(node)
  : Array.isArray(node) ? node.map(textOf).join('')
  : textOf(node.children);
function collectByClass(node, token, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) collectByClass(child, token, out); return out; }
  const cls = String(node.props?.className || '');
  if (cls.split(/\s+/).includes(token)) out.push(node);
  if (node.children) collectByClass(node.children, token, out);
  return out;
}

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

// ---------------------------------------------------------------------------
// 5. The late plate slots lawfully — LogEntry, mid-paint and after arrival.
// ---------------------------------------------------------------------------
{
  const campaign = { id: 'c-54c-first-word', hero: { name: 'Maren' } };
  const baseLog = {
    id: 'log-genesis', player: 'Begin the chronicle.', deed: null, redacted: false,
    imageUrl: null, imageAssetHash: null, videoPosterUrl: null, resolution: null,
    dm: {
      narration_blocks: [{ text: 'The first word arrives before any paint is asked for.' }, { text: 'The road waits, and the candle holds.' }],
      image_cue: { mood: 'a candlelit gate at the world\u2019s edge' }, cinematic: null
    }
  };
  const seats = (tree) => tree.children
    .filter((child) => child && typeof child === 'object')
    .map((child) => String(child.props?.className || child.type || '').split(/\s+/)[0]);
  const seatOf = (list, token) => list.indexOf(token);

  let root;
  await act(async () => { root = TestRenderer.create(h(LogEntry, { log: baseLog, campaign, painting: true, plateNumeral: 'I' })); });
  let tree = root.toJSON();
  const before = seats(tree);
  assert.ok(seatOf(before, 'player-line') === 0, `the player's line leads the group — saw [${before.join(', ')}]`);
  assert.ok(seatOf(before, 'narration') > seatOf(before, 'player-line'), 'the words follow the player');
  assert.ok(seatOf(before, 'narrate-button') > seatOf(before, 'narration'), 'Listen is at hand, directly under the words');
  assert.ok(seatOf(before, 'illustration-panel') > seatOf(before, 'narrate-button'), 'the plate seat is BELOW the text, even while painting');
  const wordsBefore = textOf(collectByClass(tree, 'narration')[0]);
  const figureBefore = collectByClass(tree, 'illustration-panel')[0];
  assert.ok(String(figureBefore.props.className).split(/\s+/).includes('painting'), 'mid-paint, the shimmer class rides the panel');
  assert.ok(textOf(figureBefore).includes('painting…'), 'the folio says so honestly');
  assert.ok(textOf(figureBefore).includes('Plate I'), 'the folio numbers its plate');

  // The plate lands late — same group, new still, nothing else may move.
  await act(async () => {
    root.update(h(LogEntry, { log: { ...baseLog, imageUrl: 'data:image/png;base64,AAAA', imageAssetHash: 'sha-plate-54c' }, campaign, painting: false, plateNumeral: 'I' }));
  });
  tree = root.toJSON();
  const after = seats(tree);
  assert.deepEqual(after, before, `the arrival reorders nothing — [${before.join(', ')}] must survive as [${after.join(', ')}]`);
  assert.equal(textOf(collectByClass(tree, 'narration')[0]), wordsBefore, 'the words are byte-for-byte untouched by the arrival');
  const figureAfter = collectByClass(tree, 'illustration-panel')[0];
  const figureClasses = String(figureAfter.props.className).split(/\s+/).filter(Boolean);
  assert.deepEqual(figureClasses.sort(), ['full-bleed', 'illustration-panel'], `the landed plate wears no shimmer and NO entrance animation class — reduced motion is honored by never animating the swap — saw [${figureClasses.join(' ')}]`);
  assert.ok(textOf(figureAfter).includes('illuminated'), 'the folio now reads illuminated');
  const img = collectByClass(tree, 'plate-zoom')[0]?.children?.find?.((child) => child?.type === 'img');
  assert.equal(img?.props?.src, 'data:image/png;base64,AAAA', 'the landed still is the one shown');
  await act(async () => { root.unmount(); });
}

assert.deepEqual(leaks, [], `no genesis lane leaks an unhandled rejection: [${leaks.join(' | ')}]`);

console.log('PASS — the first word gate: the prologue pour leaves the page before any paint request in every jittered round, snagged and silent pours never starve the easel, a fallen easel never starves the bench, the anchors gate the turn\u2019s own media, and a plate that lands late slots below its text — words untouched, order unchanged, no entrance animation.');
