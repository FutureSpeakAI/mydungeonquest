// ---- THE DOORKEEPER (SaaS phase 1 — accounts & guest custody) ----
//
// The door is OPT-IN, and a doorless house is unchanged. Judged headless:
//   1. Server, door closed (keys scrubbed): doorkeeper() is a pass-through
//      that marks every caller a guest; whoami answers honestly for guests
//      and patrons alike.
//   2. Server, door open, judged with stubs (no live Clerk, no live DB —
//      the bench stays keyless-portable): the ledger binds itself before
//      the first signature, failed bindings are struck and retried, the
//      visitors' book caches one inscription per patron, and every stumble
//      fails OPEN to guest without barring the next knock.
//   3. Client, keyless build: the harness pins VITE_CLERK_PUBLISHABLE_KEY
//      to '' exactly as a keyless build would — PatronDoor renders nothing,
//      and PatronShell hands its children back untouched (no router, no
//      provider, no new code paths). Signed-out play is the old game,
//      byte for byte.

import assert from 'node:assert/strict';
import { createRequire, register } from 'node:module';

// ---- 1. the server stance, door closed ----
// Scrub before judging: the workspace itself may carry real Clerk keys, but
// this eval must sit at a keyless table (same law as the DM's mock assert).
delete process.env.CLERK_SECRET_KEY;
delete process.env.CLERK_PUBLISHABLE_KEY;

const {
  doorOpen, doorkeeper, whoami, inscribe, attachPatronWith, __resetDoorForEval,
} = await import('../server/patrons.js');
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

// ---- 2. the open door, judged with stubs ----
// The bench may not summon live Clerk or Postgres (keyless forks must stay
// green), so the inscription path is judged through its injection seams.
{
  __resetDoorForEval();
  const spoken = [];
  const query = async (text, params) => {
    spoken.push({ text, params });
    return { rows: [{ id: 'l-1', clerk_user_id: params?.[0] ?? null, display_name: params?.[1] ?? null, created_at: 'bound' }] };
  };
  const row = await inscribe('user_stub', { fetchName: async () => 'Stub of Renown', query });
  assert.ok(spoken[0].text.includes('CREATE TABLE IF NOT EXISTS users'), 'the book is bound before anyone signs it');
  assert.ok(spoken[1].text.includes('INSERT INTO users'), 'then the patron signs');
  assert.equal(row.display_name, 'Stub of Renown', 'the fetched name lands on the ledger line');
  const shy = await inscribe('user_shy', { fetchName: async () => { throw new Error('no name given'); }, query });
  assert.equal(shy.display_name, null, 'a failed name fetch still inscribes, nameless');
}
{
  // A failed binding is struck, and the next knock retries the shelf.
  __resetDoorForEval();
  const hush = console.error; console.error = () => {};
  try {
    let binds = 0;
    const lockedThenOpen = async (text, params) => {
      if (text.includes('CREATE TABLE')) {
        binds += 1;
        if (binds === 1) throw new Error('the shelf was locked');
      }
      return { rows: [{ id: 'l-2', clerk_user_id: params?.[0] ?? null, display_name: null, created_at: 'bound' }] };
    };
    await assert.rejects(
      () => inscribe('user_locked', { fetchName: async () => null, query: lockedThenOpen }),
      /locked/,
      'an unbound ledger refuses the signature'
    );
    const row = await inscribe('user_locked', { fetchName: async () => null, query: lockedThenOpen });
    assert.equal(binds, 2, 'the failed binding was struck and retried');
    assert.equal(row.id, 'l-2', 'and the second knock signs cleanly');
  } finally { console.error = hush; }
}
{
  // The visitors' book: one inscription per patron per process.
  __resetDoorForEval();
  let inscriptions = 0;
  const at = attachPatronWith({
    auth: (req) => req.sub,
    inscribe: async (id) => { inscriptions += 1; return { id: 'l-3', clerk_user_id: id, display_name: 'Alatar', created_at: 'bound' }; },
  });
  const req1 = { sub: 'user_regular' };
  await new Promise((resolve) => at(req1, {}, resolve));
  assert.equal(req1.patron?.display_name, 'Alatar', 'the patron rides the request');
  const req2 = { sub: 'user_regular' };
  await new Promise((resolve) => at(req2, {}, resolve));
  assert.equal(inscriptions, 1, 'the book remembers — no second inscription');

  const anon = { sub: null };
  await new Promise((resolve) => at(anon, {}, resolve));
  assert.equal(anon.patron, null, 'no name given, no ledger touched — a guest');
}
{
  // The stumble law: failures pass as guest, loudly, and never bar the retry.
  __resetDoorForEval();
  const hush = console.error; console.error = () => {};
  try {
    let mood = 'stormy';
    const flaky = attachPatronWith({
      auth: () => 'user_flaky',
      inscribe: async (id) => {
        if (mood === 'stormy') throw new Error('ink spilled');
        return { id: 'l-4', clerk_user_id: id, display_name: null, created_at: 'bound' };
      },
    });
    const r1 = {};
    await new Promise((resolve) => flaky(r1, {}, resolve));
    assert.equal(r1.patron, null, 'a stumble at the door never bars the table');
    mood = 'calm';
    const r2 = {};
    await new Promise((resolve) => flaky(r2, {}, resolve));
    assert.equal(r2.patron?.id, 'l-4', 'the strike is honest — the next knock succeeds');
  } finally { console.error = hush; }
}

// ---- 3. the client stance ----
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

console.log('doorkeeper eval — the door is lawful: closed house unchanged, the ledger binds itself, stumbles pass as guests, whoami honest.');
