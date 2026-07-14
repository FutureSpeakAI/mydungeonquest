// ---- The card yields the stage exactly once ----
//
// Phase 2 chains real state transitions through the Cinematic's onClose:
// DM card → act interstitial → staged narration. A close tap that ALSO
// bubbles into the fullscreen container's tap-to-skip handler fires onClose
// twice — the first call stages the act card, the second clears it and jumps
// straight to the voice, skipping the act turn cold. This test locks the
// severed bubble: the close control stops propagation and closes once.
// Headless — no AI keys, no browser — via react-test-renderer.

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

globalThis.URL.createObjectURL = (blob) => `blob:test/${blob?.type || 'unknown'}`;
globalThis.URL.revokeObjectURL = () => {};

const Cinematic = (await import('../src/components/Cinematic.jsx')).default;

function collect(node, type, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) collect(child, type, out); return out; }
  if (node.type === type) out.push(node);
  if (node.children) collect(node.children, type, out);
  return out;
}

const campaign = { id: 'close-law', codex: { beatIndex: 0 } };
// The synthesized act interstitial payload — the exact card the chain protects.
const card = { type: 'act', title: 'Act II', subtitle: 'The world unravelling.', palette: ['#0d0b14', '#4c465e', '#b8541f'] };

let closes = 0;
let renderer;
await act(async () => {
  renderer = TestRenderer.create(h(Cinematic, {
    cinematic: card, dialogue: null, campaign, reduceMotion: false,
    turnRecordHash: null, beatIndex: 0, onClose: () => { closes += 1; }
  }));
});

const closeButtons = collect(renderer.toJSON(), 'button')
  .filter((node) => String(node.props.className || '').includes('cinematic-close'));
assert.equal(closeButtons.length, 1, 'the card has exactly one close control');

let stopped = 0;
await act(async () => {
  closeButtons[0].props.onClick({ stopPropagation: () => { stopped += 1; } });
});
assert.equal(stopped, 1, 'the close tap severs the bubble to the container');
assert.equal(closes, 1, 'one tap, one close');

await act(async () => { renderer.unmount(); });

console.log('PASS — the cinematic close fires once: the bubble is severed, and the chain (DM card → act card → voice) cannot be skipped.');
