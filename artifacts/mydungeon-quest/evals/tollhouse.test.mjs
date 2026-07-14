// ---- THE TOLL-HOUSE (SaaS phase 2 — seats, quotas, the mint) ----
//
// The gateway is OPT-IN twice over: it stands only when BOTH the door
// (Clerk) and the mint (Stripe) are live. Judged headless, stub-benched:
//   1. Dormant house: no door, no mint → every room is a hallway. grantFor
//      answers unmetered, the innkeeper waves everyone through, buildToll
//      says live:false, debit writes nothing.
//   2. The innkeeper's law (gate stubbed open): guests are refused paid
//      pours in the house's own words; the free seat's clamp holds (speak
//      pours only at the Voiced table); a spent month closes the ledger
//      with the page-turn date; a mislaid ledger fails CLOSED for money
//      and OPEN for the table.
//   3. The billing law: stand-ins (mock/fallback) are never debited; real
//      artisans are; house work debits as 'house'; a slipped debit is loud
//      but never claws back the response.
//   4. The seat flip, both directions: a live subscription raises the
//      patron's line, a lapsed one lowers it back to the hearth; the
//      highest active seat wins; past_due keeps grace; strangers flip
//      nothing.
//   5. The courier: unsigned parcels bounce, parsed bodies are refused as
//      misbound (the raw-mount law), a lawful parcel is synced then the
//      seat reconciled fire-and-forget, a refused seal flips nothing.
//   6. Client, keyless build: the toll window renders nothing and asks the
//      network for nothing — a keyless fork never learns money exists.

import assert from 'node:assert/strict';
import { createRequire, register } from 'node:module';

// Scrub before judging: this bench must sit at a keyless, mintless table.
delete process.env.CLERK_SECRET_KEY;
delete process.env.CLERK_PUBLISHABLE_KEY;
delete process.env.REPLIT_CONNECTORS_HOSTNAME;
delete process.env.REPL_IDENTITY;
delete process.env.WEB_REPL_RENEWAL;
delete process.env.DATABASE_URL;

const { __resetDoorForEval } = await import('../server/patrons.js');
const {
  PLANS, grantFor, innkeeper, debit, reconcileEntitlement,
  buildToll, tollWebhook, __resetTollForEval,
} = await import('../server/toll.js');
const { mintConfigured, mintLive } = await import('../server/mint.js');

const fresh = () => { __resetDoorForEval(); __resetTollForEval(); };
const resSpy = () => {
  const res = { code: 200, body: null, headers: {} };
  res.status = (c) => { res.code = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  return res;
};
// A stub bench: answers by fragment of the SQL text, records everything.
const bench = (answers = {}) => {
  const spoken = [];
  const query = async (text, params) => {
    spoken.push({ text, params });
    for (const [frag, rows] of Object.entries(answers)) {
      if (text.includes(frag)) return typeof rows === 'function' ? rows(params) : { rows };
    }
    return { rows: [] };
  };
  query.spoken = spoken;
  return query;
};

// ---- 1. the dormant house ----
assert.equal(mintConfigured(), false, 'scrubbed env reads as no mint');
assert.equal(mintLive(), false, 'the mint never stood up on this bench');
{
  fresh();
  const grant = await grantFor({ patron: { id: 'u-1' } });
  assert.deepEqual(grant, { metered: false, plan: 'unmetered', quotas: {} }, 'dormant → unmetered pass');
  const q = bench();
  const res = resSpy(); let walked = false;
  await innkeeper('paint', { query: q })({ patron: { id: 'u-1' } }, res, () => { walked = true; });
  assert.equal(walked, true, 'the innkeeper waves everyone through a dormant house');
  assert.equal(q.spoken.length, 0, 'and reads no ledger');
  assert.equal(res.headers['X-Toll-Plan'], undefined, 'no toll headers in a dormant house');
  const toll = await buildToll({ patron: null });
  assert.deepEqual(toll, { live: false }, 'the standing page says only: not live');
  const wrote = await debit({ grant: { metered: false }, patron: { id: 'u-1' } }, 'paint', 'gemini', { query: q });
  assert.equal(wrote, 'untolled');
  assert.equal(q.spoken.length, 0, 'no line is written in a dormant house');
}

// ---- 2. the innkeeper's law (gate stubbed open) ----
const gate = () => true;
{
  // Guests: unmetered kinds pass with the plan spoken; paid pours refused.
  fresh();
  const deps = { gate, query: bench() };
  const pass = resSpy(); let walked = false;
  await innkeeper('dm', deps)({ patron: null }, pass, () => { walked = true; });
  assert.equal(walked, true, 'a guest turn passes');
  assert.equal(pass.headers['X-Toll-Plan'], 'guest', 'and the plan rides the header');
  const res = resSpy(); walked = false;
  await innkeeper('paint', deps)({ patron: null }, res, () => { walked = true; });
  assert.equal(walked, false);
  assert.equal(res.code, 402);
  assert.equal(res.body.closed, true);
  assert.equal(res.body.reason, 'table');
  assert.match(res.body.error, /named patrons/i, 'refused in the house voice');
  assert.equal(res.body.upsell, 'free', 'the guest is pointed to a named seat');
}
{
  // The free seat's clamp: speak pours only at the Voiced table.
  fresh();
  const q = bench({ 'SELECT plan': [{ plan: 'free', stripe_customer_id: null }] });
  const res = resSpy();
  await innkeeper('speak', { gate, query: q })({ patron: { id: 'u-free' } }, res, () => {});
  assert.equal(res.code, 402);
  assert.equal(res.body.reason, 'table');
  assert.equal(res.body.upsell, 'voiced');
  assert.match(res.body.error, /Voiced/, 'the clamp names the table where it pours');
}
{
  // A spent month closes the ledger; a coin left passes.
  fresh();
  const q = bench({
    'SELECT plan': [{ plan: 'free', stripe_customer_id: null }],
    'GROUP BY kind': [{ kind: 'paint', n: 30 }],
  });
  const res = resSpy();
  await innkeeper('paint', { gate, query: q })({ patron: { id: 'u-free' } }, res, () => {});
  assert.equal(res.code, 402);
  assert.equal(res.body.reason, 'spent');
  assert.equal(res.body.used, 30);
  assert.equal(res.body.quota, 30);
  assert.ok(res.body.renewsAt && !Number.isNaN(Date.parse(res.body.renewsAt)), 'the page-turn date rides along');
  assert.match(res.body.error, /spent/i);
  fresh();
  const q2 = bench({
    'SELECT plan': [{ plan: 'free', stripe_customer_id: null }],
    'GROUP BY kind': [{ kind: 'paint', n: 29 }],
  });
  let walked = false;
  await innkeeper('paint', { gate, query: q2 })({ patron: { id: 'u-free' } }, resSpy(), () => { walked = true; });
  assert.equal(walked, true, 'a coin left in the month passes');
}
{
  // The mislaid ledger: closed for money, open for the table — loudly.
  fresh();
  const hush = console.error; console.error = () => {};
  try {
    const broken = async () => { throw new Error('ink everywhere'); };
    const res = resSpy();
    await innkeeper('paint', { gate, query: broken })({ patron: { id: 'u-x' } }, res, () => {});
    assert.equal(res.code, 402);
    assert.equal(res.body.reason, 'mislaid', 'money fails closed');
    fresh();
    let walked = false;
    await innkeeper('dm', { gate, query: broken })({ patron: { id: 'u-x' } }, resSpy(), () => { walked = true; });
    assert.equal(walked, true, 'the table itself never dies');

    // A seated patron whose month cannot be COUNTED (the grant read fine,
    // the tally tore): the tale flows on, the paid pours close — and the
    // refusal carries the full shape, unknown tallies as honest nulls.
    const countBroken = async (text) => {
      if (text.includes('GROUP BY kind')) throw new Error('the page tore');
      if (text.includes('SELECT plan')) return { rows: [{ plan: 'free', stripe_customer_id: null }] };
      return { rows: [] };
    };
    fresh();
    let told = false;
    await innkeeper('dm', { gate, query: countBroken })({ patron: { id: 'u-free' } }, resSpy(), () => { told = true; });
    assert.equal(told, true, 'a torn tally never silences the tale');
    fresh();
    let retold = false;
    await innkeeper('retell', { gate, query: countBroken })({ patron: { id: 'u-free' } }, resSpy(), () => { retold = true; });
    assert.equal(retold, true, 'nor the retelling');
    fresh();
    const shape = resSpy();
    await innkeeper('paint', { gate, query: countBroken })({ patron: { id: 'u-free' } }, shape, () => {});
    assert.equal(shape.code, 402);
    assert.equal(shape.body.reason, 'mislaid', 'paid pours still fail closed');
    assert.equal(shape.body.plan, 'free', 'the plan is named when it is known');
    assert.equal(shape.body.quota, null, 'unknown tallies are honest nulls, never invented numbers');
    assert.equal(shape.body.used, null);
    assert.equal(shape.body.upsell, null);
    assert.ok(shape.body.renewsAt && !Number.isNaN(Date.parse(shape.body.renewsAt)), 'the page-turn date still rides');
  } finally { console.error = hush; }
}

// ---- 3. the billing law ----
{
  fresh();
  const q = bench();
  const req = { grant: { metered: true, plan: 'illuminated' }, patron: { id: 'u-9' } };
  assert.equal(await debit(req, 'paint', 'mock', { query: q }), 'stand-in', 'mock work is never billed');
  assert.equal(await debit(req, 'paint', 'fallback', { query: q }), 'stand-in', 'fallback work is never billed');
  assert.equal(q.spoken.length, 0, 'no ledger line for stand-ins');
  assert.equal(await debit(req, 'paint', 'gemini', { query: q }), 'tolled', 'a real artisan is billed');
  assert.deepEqual(q.spoken[0].params, ['u-9', 'paint', 'gemini']);
  assert.equal(await debit(req, 'podcast', null, { query: q }), 'tolled', 'house work is billed as house');
  assert.deepEqual(q.spoken[1].params, ['u-9', 'podcast', 'house']);
  assert.equal(await debit({ grant: { metered: true }, patron: null }, 'paint', 'gemini', { query: q }), 'untolled', 'no name, no line');
  const hush = console.error; console.error = () => {};
  try {
    const slipped = await debit(req, 'paint', 'gemini', { query: async () => { throw new Error('quill snapped'); } });
    assert.equal(slipped, 'slipped', 'a slipped debit is spoken, never thrown');
  } finally { console.error = hush; }
}

// ---- 4. the seat flip, both directions ----
{
  fresh();
  const subs = { data: [] };
  const stripe = { subscriptions: { list: async () => subs } };
  const users = new Map([['cus_1', { id: 'u-1', plan: 'free', stripe_customer_id: 'cus_1' }]]);
  const q = bench({
    'FROM users WHERE stripe_customer_id': (params) => ({ rows: users.has(params[0]) ? [{ ...users.get(params[0]) }] : [] }),
    'UPDATE users SET plan': (params) => { users.get('cus_1').plan = params[0]; return { rows: [] }; },
  });
  const deps = { query: q, stripe: async () => stripe, gate };
  const hushLog = console.log; console.log = () => {};
  try {
    subs.data = [
      { status: 'active', items: { data: [{ price: { metadata: { mdq_plan: 'illuminated' } } }] } },
      { status: 'active', items: { data: [{ price: { metadata: { mdq_plan: 'voiced' } } }] } },
    ];
    assert.equal(await reconcileEntitlement({ customerId: 'cus_1' }, deps), 'voiced', 'the highest active seat wins');
    assert.equal(users.get('cus_1').plan, 'voiced');
    subs.data = [{ status: 'past_due', items: { data: [{ price: { metadata: { mdq_plan: 'illuminated' } } }] } }];
    assert.equal(await reconcileEntitlement({ customerId: 'cus_1' }, deps), 'illuminated', 'past_due keeps grace while the card retries');
    subs.data = [{ status: 'canceled', items: { data: [{ price: { metadata: { mdq_plan: 'voiced' } } }] } }];
    assert.equal(await reconcileEntitlement({ customerId: 'cus_1' }, deps), 'free', 'a lapsed seat falls back to the hearth');
    assert.equal(users.get('cus_1').plan, 'free');
    assert.equal(await reconcileEntitlement({ customerId: 'cus_stranger' }, deps), null, 'strangers flip nothing');
  } finally { console.log = hushLog; }
}

// ---- 5. the courier ----
{
  fresh();
  let synced = 0; const flips = [];
  const hook = tollWebhook({
    processWebhook: async () => { synced += 1; },
    reconcile: async (who) => { flips.push(who); },
  });
  // Unsigned parcels bounce.
  let res = resSpy();
  await hook({ headers: {}, body: Buffer.from('{}') }, res);
  assert.equal(res.code, 400);
  assert.equal(synced, 0);
  // A parsed body is misbound — the raw-mount law.
  const hush = console.error; console.error = () => {};
  try {
    res = resSpy();
    await hook({ headers: { 'stripe-signature': 'sig' }, body: { already: 'parsed' } }, res);
    assert.equal(res.code, 500);
    assert.equal(res.body.error, 'misbound');
    assert.equal(synced, 0, 'a misbound parcel is never synced');
  } finally { console.error = hush; }
  // A lawful parcel: synced, answered, and the seat reconciled after.
  res = resSpy();
  const parcel = Buffer.from(JSON.stringify({ type: 'customer.subscription.updated', data: { object: { customer: 'cus_9' } } }));
  await hook({ headers: { 'stripe-signature': 'sig' }, body: parcel }, res);
  assert.equal(res.code, 200);
  assert.equal(synced, 1);
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(flips, [{ customerId: 'cus_9' }], 'the flip follows the parcel');
  // A refused seal is a 400, and no flip follows.
  {
    const angry = tollWebhook({
      processWebhook: async () => { throw new Error('bad seal'); },
      reconcile: async () => { flips.push('never'); },
    });
    const res2 = resSpy();
    const hush2 = console.error; console.error = () => {};
    try { await angry({ headers: { 'stripe-signature': 'sig' }, body: parcel }, res2); } finally { console.error = hush2; }
    assert.equal(res2.code, 400);
    assert.equal(res2.body.error, 'refused');
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(flips.length, 1, 'no flip follows a refused seal');
  }
  // A parcel about someone else's business flips nothing.
  {
    const other = Buffer.from(JSON.stringify({ type: 'product.updated', data: { object: { customer: 'cus_9' } } }));
    const res3 = resSpy();
    await hook({ headers: { 'stripe-signature': 'sig' }, body: other }, res3);
    assert.equal(res3.code, 200);
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(flips.length, 1, 'only subscription-shaped news flips a seat');
  }
}

// ---- 6. the standing page & the price board ----
{
  fresh();
  const q = bench({
    'SELECT plan': [{ plan: 'free', stripe_customer_id: null }],
    'GROUP BY kind': [{ kind: 'paint', n: 3 }],
    'FROM stripe.prices': [
      { id: 'price_a', unit_amount: '900', currency: 'usd', recurring: { interval: 'month' }, metadata: { mdq_plan: 'illuminated' } },
      { id: 'price_b', unit_amount: '1900', currency: 'usd', recurring: '{"interval":"month"}', metadata: '{"mdq_plan":"voiced"}' },
      { id: 'price_x', unit_amount: '99', currency: 'usd', recurring: null, metadata: {} },
    ],
  });
  const toll = await buildToll({ patron: { id: 'u-free' } }, { gate, query: q });
  assert.equal(toll.live, true);
  assert.equal(toll.plan, 'free');
  assert.equal(toll.taste, true, 'the hearth seat tastes illumination');
  assert.equal(toll.ceiling, 'illuminated');
  assert.deepEqual(toll.quotas, PLANS.free.quotas);
  assert.equal(toll.used.paint, 3);
  assert.equal(toll.portal, false, 'no coin yet, no portal');
  assert.deepEqual(toll.prices.map((p) => p.plan).sort(), ['illuminated', 'voiced'], 'only the house marks are chalked, both metadata shapes read');
  const guest = await buildToll({ patron: null }, { gate, query: q });
  assert.equal(guest.live, true);
  assert.equal(guest.plan, 'guest');
}

// ---- 7. the client, keyless ----
register('./jsxLoader.mjs', import.meta.url);
const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const { act } = TestRenderer;
const React = require('react');
const h = React.createElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let asked = 0;
globalThis.fetch = async () => { asked += 1; return { ok: false }; };
const toll = await import('../src/patron/toll.jsx');
assert.equal(toll.tollAllows('paint'), true, 'an unknown standing never blocks the table');

function Probe() { const t = toll.useToll(); return t ? h('b', null, 'lit') : null; }
let probe;
await act(async () => { probe = TestRenderer.create(h(Probe)); });
assert.equal(probe.toJSON(), null, 'keyless: no standing ever forms');
assert.equal(asked, 0, 'and the network is never asked about money');
await act(async () => { probe.unmount(); });

let section;
await act(async () => { section = TestRenderer.create(h(toll.TollSection, { toll: null })); });
assert.equal(section.toJSON(), null, 'the toll window renders nothing keyless');
await act(async () => { section.unmount(); });

console.log('toll-house eval — the gateway is lawful: dormant house unchanged, the innkeeper speaks for the ledger, stand-ins are never billed, seats flip both ways, the courier honors the seal, and a keyless fork never learns money exists.');
