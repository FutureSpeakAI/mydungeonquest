// ---- THE DOORKEEPER (SaaS phase 1 — accounts & guest custody) ----
//
// The door is OPT-IN, and a doorless house is unchanged. Judged headless:
//   1. Server, door closed (keys scrubbed): doorkeeper() is a pass-through
//      that marks every caller a guest; whoami answers honestly for guests
//      and patrons alike.
//   2. Client, keyless build: the harness pins VITE_CLERK_PUBLISHABLE_KEY
//      to '' exactly as a keyless build would — PatronDoor renders nothing,
//      and PatronShell hands its children back untouched (no router, no
//      provider, no new code paths). Signed-out play is the old game,
//      byte for byte.

import assert from 'node:assert/strict';
import { createRequire, register } from 'node:module';

// ---- 1. the server stance ----
// Scrub before judging: the workspace itself may carry real Clerk keys, but
// this eval must sit at a keyless table (same law as the DM's mock assert).
delete process.env.CLERK_SECRET_KEY;
delete process.env.CLERK_PUBLISHABLE_KEY;

const { doorOpen, doorkeeper, whoami } = await import('../server/patrons.js');
assert.equal(doorOpen(), false, 'scrubbed keys must read as a closed door');

const pass = doorkeeper();
assert.equal(typeof pass, 'function', 'a closed door is one pass-through function');
{
  const req = {};
  let walked = false;
  pass(req, {}, () => { walked = true; });
  assert.equal(walked, true, 'guests walk through a closed door');
  assert.equal(req.patron, null, 'and are marked as guests, explicitly');
}
{
  let sent;
  whoami({ patron: null }, { json: (body) => { sent = body; } });
  assert.deepEqual(sent, { patron: null }, 'whoami answers a guest honestly');
}
{
  let sent;
  whoami(
    { patron: { id: 'u-1', clerk_user_id: 'user_x', display_name: 'Alatar', created_at: '2026-07-14' } },
    { json: (body) => { sent = body; } }
  );
  assert.deepEqual(
    sent,
    { patron: { id: 'u-1', displayName: 'Alatar', since: '2026-07-14' } },
    'whoami speaks the ledger line, and only the ledger line'
  );
}

// ---- 2. the client stance ----
register('./jsxLoader.mjs', import.meta.url);
const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const { act } = TestRenderer;
const React = require('react');
const h = React.createElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// No window stage at all — the doorless paths must never reach for one.
const door = await import('../src/patron/door.jsx');
assert.equal(door.doorBuilt, false, 'a keyless build has no door');

let footer;
await act(async () => { footer = TestRenderer.create(h(door.PatronDoor)); });
assert.equal(footer.toJSON(), null, 'the title footer shows no door line keyless');
await act(async () => { footer.unmount(); });

let shell;
await act(async () => {
  shell = TestRenderer.create(h(door.PatronShell, null, h('p', { className: 'game' }, 'the game')));
});
const json = shell.toJSON();
assert.equal(json.type, 'p', 'PatronShell hands back its children untouched');
assert.equal(json.props.className, 'game');
assert.deepEqual(json.children, ['the game']);
await act(async () => { shell.unmount(); });

console.log('doorkeeper eval — the door is lawful: closed house unchanged, guests pass, whoami honest.');
