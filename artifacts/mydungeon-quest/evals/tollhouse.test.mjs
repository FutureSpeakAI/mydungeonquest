// ---- THE TOLL-HOUSE (SaaS phase 2 — seats, quotas, the mint) ----
//
// The gateway is OPT-IN twice over: it stands only when BOTH the door
// (Clerk) and the mint (Stripe) are live. Judged headless, stub-benched:
//   0. The locked door: with keys standing, a nameless knock on a pouring
//      room is refused 401 BEFORE any ledger is read; named patrons pass;
//      a keyless bench passes everyone (the fork's free table).
//   1. Dormant house: no door, no mint → every room is a hallway. grantFor
//      answers unmetered, the innkeeper waves everyone through, buildToll
//      says live:false, debit writes nothing.
//   2. The innkeeper's law (gate stubbed open): guests are refused paid
//      pours in the house's own words; the taste is counted for LIFE (the
//      whole book, never the month's page) and closes with honest words —
//      no invented page-turn dates, renewsAt is null; a mislaid ledger
//      fails CLOSED for money and OPEN for the table.
//   3. The billing law: stand-ins (mock/fallback) are never debited; real
//      artisans are; house work debits as 'house'; a slipped debit is loud
//      but never claws back the response.
//   4. The seat flip, both directions: a live subscription raises the
//      patron's line, a lapsed one lowers it back to the taste; the
//      highest active seat wins (yearly over weekly); past_due keeps
//      grace; a RETIRED mark (illuminated, voiced) raises nothing;
//      strangers flip nothing.
//   5. The courier: unsigned parcels bounce, parsed bodies are refused as
//      misbound (the raw-mount law), a lawful parcel is synced then the
//      seat reconciled fire-and-forget, a refused seal flips nothing.
//   6. The standing page & the price board: the taste reads lifetime
//      tallies with no page-turn; only today's menu (weekly, yearly) is
//      chalked — retired marks and foreign products never listed.
//   7. Client, keyless build: the toll window renders nothing and asks the
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

const { __resetDoorForEval, namedOnly } = await import('../server/patrons.js');
const {
  PLANS, PLAN_RANK, grantFor, innkeeper, debit, reconcileEntitlement,
  buildToll, tollWebhook, tollRoutes, __resetTollForEval,
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

// ---- 0. the locked door ----
{
  // Keyless: the lock does not exist — everyone passes (the fork's table).
  let walked = false;
  await new Promise((r) => { namedOnly()({ patron: null }, resSpy(), () => { walked = true; r(); }); });
  assert.equal(walked, true, 'a keyless house has no lock');
  // Keys standing: the nameless are refused 401 in the door\'s own words,
  // and the named pass. (Set/strike the env inside this block only.)
  process.env.CLERK_SECRET_KEY = 'sk_test_bench';
  process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_bench';
  try {
    const res = resSpy(); walked = false;
    await namedOnly()({ patron: null }, res, () => { walked = true; });
    assert.equal(walked, false, 'no name, no table');
    assert.equal(res.code, 401, 'identity is a 401, never a 402');
    assert.equal(res.body.door, true, 'the refusal names the door');
    assert.match(res.body.error, /six turns on the house/i, 'the door speaks the offer');
    let named = false;
    await new Promise((r) => { namedOnly()({ patron: { id: 'u-1' } }, resSpy(), () => { named = true; r(); }); });
    assert.equal(named, true, 'a named patron passes the lock');
  } finally {
    delete process.env.CLERK_SECRET_KEY;
    delete process.env.CLERK_PUBLISHABLE_KEY;
  }
}

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
  // Guests (the standing-page fallback; live pouring routes never reach
  // here nameless — the locked door is upstream): unmetered kinds pass
  // with the plan spoken; paid pours refused toward a named seat.
  fresh();
  const deps = { gate, query: bench() };
  const pass = resSpy(); let walked = false;
  await innkeeper('dm', deps)({ patron: null }, pass, () => { walked = true; });
  assert.equal(walked, true, 'a guest turn passes the innkeeper (the lock upstream is the gate)');
  assert.equal(pass.headers['X-Toll-Plan'], 'guest', 'and the plan rides the header');
  const res = resSpy(); walked = false;
  await innkeeper('paint', deps)({ patron: null }, res, () => { walked = true; });
  assert.equal(walked, false);
  assert.equal(res.code, 402);
  assert.equal(res.body.closed, true);
  assert.equal(res.body.reason, 'table');
  assert.equal(res.body.renewsAt, null, 'a kind not on the menu never renews — no invented dates');
  assert.match(res.body.error, /named patrons/i, 'refused in the house voice');
  assert.equal(res.body.upsell, 'free', 'the guest is pointed to a named seat');
}
{
  // The taste pours the FULL flavor — speak flows at the free table now.
  fresh();
  const q = bench({ 'SELECT plan': [{ plan: 'free', stripe_customer_id: null }] });
  let walked = false;
  await innkeeper('speak', { gate, query: q })({ patron: { id: 'u-free' } }, resSpy(), () => { walked = true; });
  assert.equal(walked, true, 'the taste pours voices too');
}
{
  // THE SIX-TURN WALL — the heart of the owner's directive. Counted for
  // life (the whole book, not the month's page), closed with the offer,
  // and honest: no page-turn date is ever invented for a taste.
  fresh();
  assert.equal(PLANS.free.quotas.dm, 6, 'the taste is six turns, chalked in the law');
  const spent = bench({
    'SELECT plan': [{ plan: 'free', stripe_customer_id: null }],
    'GROUP BY kind': [{ kind: 'dm', n: 6 }],
  });
  const res = resSpy();
  await innkeeper('dm', { gate, query: spent })({ patron: { id: 'u-free' } }, res, () => {});
  assert.equal(res.code, 402);
  assert.equal(res.body.reason, 'spent');
  assert.equal(res.body.used, 6);
  assert.equal(res.body.quota, 6);
  assert.equal(res.body.renewsAt, null, 'a lifetime taste has no page-turn date — never invented');
  assert.equal(res.body.upsell, 'weekly', 'the wall points to the cheapest seat');
  assert.match(res.body.error, /\$5 by the week/, 'the wall speaks the weekly price');
  assert.match(res.body.error, /\$129\.99 for the year/, 'and the yearly');
  const tally = spent.spoken.find((s) => s.text.includes('GROUP BY kind'));
  assert.ok(!tally.text.includes('date_trunc'), 'the taste is counted from the whole book, not the month');
  fresh();
  const oneLeft = bench({
    'SELECT plan': [{ plan: 'free', stripe_customer_id: null }],
    'GROUP BY kind': [{ kind: 'dm', n: 5 }],
  });
  let walked = false;
  await innkeeper('dm', { gate, query: oneLeft })({ patron: { id: 'u-free' } }, resSpy(), () => { walked = true; });
  assert.equal(walked, true, 'the sixth turn still pours');
}
{
  // A paid seat pours without measure — no quota, no ledger count at all.
  fresh();
  const q = bench({ 'SELECT plan': [{ plan: 'weekly', stripe_customer_id: 'cus_w' }] });
  let walked = false;
  const res = resSpy();
  await innkeeper('podcast', { gate, query: q })({ patron: { id: 'u-week' } }, res, () => { walked = true; });
  assert.equal(walked, true, 'a weekly patron pours');
  assert.equal(res.headers['X-Toll-Plan'], 'weekly');
  assert.ok(!q.spoken.some((s) => s.text.includes('GROUP BY kind')), 'an unmetered pour never counts the book');
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
    assert.equal(res.body.renewsAt, null, 'a mislaid ledger invents no dates');
    fresh();
    let walked = false;
    await innkeeper('dm', { gate, query: broken })({ patron: { id: 'u-x' } }, resSpy(), () => { walked = true; });
    assert.equal(walked, true, 'the table itself never dies');

    // A seated patron whose book cannot be COUNTED (the grant read fine,
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
    assert.equal(shape.body.renewsAt, null, 'and no invented dates');
  } finally { console.error = hush; }
}

// ---- 3. the billing law ----
{
  fresh();
  const q = bench();
  const req = { grant: { metered: true, plan: 'weekly' }, patron: { id: 'u-9' } };
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
  assert.ok(PLAN_RANK.yearly > PLAN_RANK.weekly, 'the year outranks the week');
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
      { status: 'active', items: { data: [{ price: { metadata: { mdq_plan: 'weekly' } } }] } },
      { status: 'active', items: { data: [{ price: { metadata: { mdq_plan: 'yearly' } } }] } },
    ];
    assert.equal(await reconcileEntitlement({ customerId: 'cus_1' }, deps), 'yearly', 'the highest active seat wins');
    assert.equal(users.get('cus_1').plan, 'yearly');
    subs.data = [{ status: 'past_due', items: { data: [{ price: { metadata: { mdq_plan: 'weekly' } } }] } }];
    assert.equal(await reconcileEntitlement({ customerId: 'cus_1' }, deps), 'weekly', 'past_due keeps grace while the card retries');
    subs.data = [{ status: 'active', items: { data: [{ price: { metadata: { mdq_plan: 'voiced' } } }] } }];
    assert.equal(await reconcileEntitlement({ customerId: 'cus_1' }, deps), 'free', 'a RETIRED mark raises no seat — the menu is the law');
    subs.data = [{ status: 'canceled', items: { data: [{ price: { metadata: { mdq_plan: 'yearly' } } }] } }];
    assert.equal(await reconcileEntitlement({ customerId: 'cus_1' }, deps), 'free', 'a lapsed seat falls back to the taste');
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
    'GROUP BY kind': [{ kind: 'dm', n: 3 }],
    'FROM stripe.prices': [
      { id: 'price_w', unit_amount: '500', currency: 'usd', recurring: { interval: 'week' }, metadata: { mdq_plan: 'weekly' } },
      { id: 'price_y', unit_amount: '12999', currency: 'usd', recurring: '{"interval":"year"}', metadata: '{"mdq_plan":"yearly"}' },
      { id: 'price_old', unit_amount: '900', currency: 'usd', recurring: { interval: 'month' }, metadata: { mdq_plan: 'illuminated' } },
      { id: 'price_x', unit_amount: '99', currency: 'usd', recurring: null, metadata: {} },
    ],
  });
  const toll = await buildToll({ patron: { id: 'u-free' } }, { gate, query: q });
  assert.equal(toll.live, true);
  assert.equal(toll.plan, 'free');
  assert.equal(toll.taste, true, 'the free seat is the taste');
  assert.equal(toll.lifetime, true, 'and it is counted for life');
  assert.equal(toll.ceiling, 'voiced', 'the taste is the full flavor');
  assert.equal(toll.renewsAt, null, 'a lifetime taste shows no page-turn');
  assert.deepEqual(toll.quotas, PLANS.free.quotas);
  assert.equal(toll.used.dm, 3);
  const tallyText = q.spoken.find((s) => s.text.includes('GROUP BY kind')).text;
  assert.ok(!tallyText.includes('date_trunc'), 'the standing page reads the whole book for a taste');
  assert.equal(toll.portal, false, 'no coin yet, no portal');
  assert.deepEqual(toll.prices.map((p) => p.plan).sort(), ['weekly', 'yearly'],
    'only today\'s menu is chalked — retired marks and foreign products never listed, both metadata shapes read');
  assert.deepEqual(
    toll.prices.map((p) => `${p.plan}:${p.amount}/${p.interval}`).sort(),
    ['weekly:500/week', 'yearly:12999/year'],
    'the board speaks the owner\'s prices',
  );
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
assert.equal(toll.priceWords({ amount: 500, interval: 'week' }), '$5/week', 'whole dollars stay whole');
assert.equal(toll.priceWords({ amount: 12999, interval: 'year' }), '$129.99/year', 'split coins spoken in full');

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

// ---- 8. the receipt of refusal ----
// The React-free store carries the innkeeper's 402 from any lib module to
// the window; the TollNotice component itself stays dark on a keyless fork
// even if a stray report somehow fires.
const receipt = await import('../src/patron/tollNotice.js');
let heard = null;
const unsub = receipt.subscribeTollNotice((body) => { heard = body; });
receipt.reportTollRefusal({ error: 'not closed' });
assert.equal(heard, null, 'a body without closed:true is never a receipt');
const refusal402 = { closed: true, kind: 'paint', plan: 'free', reason: 'spent', quota: 30, used: 30, renewsAt: '2026-08-01T00:00:00.000Z', upsell: 'illuminated', error: 'The innkeeper closes the ledger.' };
receipt.reportTollRefusal(refusal402);
assert.equal(heard?.kind, 'paint', 'a true refusal reaches the subscriber');
assert.equal(heard?.upsell, 'illuminated');
receipt.dismissTollNotice();
assert.equal(heard, null, 'dismissal clears the receipt');
// tollRefusal reads only true 402s, and leaves the body drinkable via clone.
const fake402 = { status: 402, clone() { return { json: async () => refusal402 }; } };
assert.equal((await receipt.tollRefusal(fake402))?.reason, 'spent');
assert.equal(heard?.reason, 'spent', 'the parsed 402 is reported as it is returned');
receipt.dismissTollNotice();
assert.equal(await receipt.tollRefusal({ status: 500, clone() { return { json: async () => refusal402 }; } }), null, 'a 500 is never a receipt');
unsub();
let noticeKeyless;
await act(async () => { noticeKeyless = TestRenderer.create(h(toll.TollNotice)); });
receipt.reportTollRefusal(refusal402);
assert.equal(noticeKeyless.toJSON(), null, 'keyless: the receipt window never lights');
await act(async () => { noticeKeyless.unmount(); });
receipt.dismissTollNotice();

// ---- 8. the friend of the house (the owner's gift) ----
{
  fresh();
  assert.equal(PLANS.house?.comp, true, 'the gift seat bears the comp mark');
  assert.ok(Object.values(PLANS.house.quotas).every((q) => q === null), 'a friend of the house pours without measure');
  assert.ok(PLAN_RANK.house > PLAN_RANK.yearly, 'no sold seat outranks the owner’s gift');
  // The mint neither grants nor revokes a gift: reconciliation leaves the
  // chair exactly as the owner wrote it — Stripe is not even consulted.
  let asked = 0;
  const stripe = { subscriptions: { list: async () => { asked += 1; return { data: [] }; } } };
  const users = new Map([['cus_f', { id: 'u-f', plan: 'house', stripe_customer_id: 'cus_f' }]]);
  const q = bench({
    'FROM users WHERE stripe_customer_id': (params) => ({ rows: users.has(params[0]) ? [{ ...users.get(params[0]) }] : [] }),
    'UPDATE users SET plan': (params) => { users.get('cus_f').plan = params[0]; return { rows: [] }; },
  });
  assert.equal(
    await reconcileEntitlement({ customerId: 'cus_f' }, { query: q, stripe: async () => stripe, gate }),
    'house',
    'the gift stands though Stripe lists nothing',
  );
  assert.equal(users.get('cus_f').plan, 'house', 'the ledger line is untouched');
  assert.equal(asked, 0, 'the mint is not consulted about a gift');
  // And the reverse: a comp mark chalked on a Stripe price raises no seat —
  // gifts are not for sale, so the mark is a lie and the menu is the law.
  const users2 = new Map([['cus_2', { id: 'u-2', plan: 'free', stripe_customer_id: 'cus_2' }]]);
  const q2 = bench({
    'FROM users WHERE stripe_customer_id': (params) => ({ rows: users2.has(params[0]) ? [{ ...users2.get(params[0]) }] : [] }),
    'UPDATE users SET plan': (params) => { users2.get('cus_2').plan = params[0]; return { rows: [] }; },
  });
  const lyingStripe = {
    subscriptions: {
      list: async () => ({ data: [{ status: 'active', items: { data: [{ price: { metadata: { mdq_plan: 'house' } } }] } }] }),
    },
  };
  assert.equal(
    await reconcileEntitlement({ customerId: 'cus_2' }, { query: q2, stripe: async () => lyingStripe, gate }),
    'free',
    'a comp mark on a price raises no seat',
  );
  assert.equal(users2.get('cus_2').plan, 'free', 'the taste stands — the lie bought nothing');
}

// ---- 9. the point of sale reads fresh truth ----
{
  fresh();
  // Prime the grant candle with an OLD standing (free), then flip the line
  // to the owner's gift behind the candle's back. The checkout counter must
  // read the book itself — never sell on a stale flame, never mint a
  // customer for a friend of the house.
  const row = { id: 'u-g', plan: 'free', stripe_customer_id: null };
  const q = bench({
    'SELECT plan, stripe_customer_id FROM users WHERE id': () => ({
      rows: [{ plan: row.plan, stripe_customer_id: row.stripe_customer_id }],
    }),
  });
  let minted = 0;
  const stripe = {
    customers: { create: async () => { minted += 1; return { id: 'cus_fresh' }; } },
    checkout: { sessions: { create: async () => ({ url: 'https://never.example' }) } },
    billingPortal: { sessions: { create: async () => ({ url: 'https://never.example' }) } },
  };
  const deps = { query: q, stripe: async () => stripe, gate };
  const reqFor = () => ({ patron: { id: 'u-g', display_name: 'S' }, body: { plan: 'weekly' }, headers: {}, protocol: 'https' });
  await grantFor(reqFor(), deps); // the candle now holds 'free'
  row.plan = 'house'; // the owner's hand writes the gift
  const layer = tollRoutes(deps).stack.find((l) => l.route?.path === '/toll/checkout');
  const res = resSpy();
  await layer.route.stack[0].handle(reqFor(), res);
  assert.equal(res.code, 200, 'the counter answers, never errors');
  assert.match(res.body?.note || '', /nothing to buy/i, 'the gift is met with a note');
  assert.equal(res.body?.url, undefined, 'no room to redirect to');
  assert.equal(minted, 0, 'no customer minted for a friend of the house');
}

// --- The owner's gift is written at the door, from the environment ---
{
  const { houseSeatMatch } = await import('../server/patrons.js');
  assert.equal(houseSeatMatch('stephen@example.com', { clerkUserId: 'user_x', email: 'Stephen@Example.COM' }), true, 'an email on the list seats its patron, case blind');
  assert.equal(houseSeatMatch('user_abc, other@x.y', { clerkUserId: 'user_abc', email: null }), true, 'a door name on the list seats its patron without an email');
  assert.equal(houseSeatMatch('a@b.c  user_q', { clerkUserId: 'user_z', email: 'z@z.z' }), false, 'a stranger is never gifted');
  assert.equal(houseSeatMatch('', { clerkUserId: 'user_z', email: 'z@z.z' }), false, 'an empty list gifts no one');
  assert.equal(houseSeatMatch(undefined, { clerkUserId: 'user_z', email: 'z@z.z' }), false, 'an absent list gifts no one');
  assert.equal(houseSeatMatch('z@z.z', {}), false, 'a nameless knock is never gifted');
}

console.log('toll-house eval — the gateway is lawful: the door is locked (keyed) and absent (keyless), the taste is six turns counted for life with honest nulls for dates, paid seats pour unmeasured, stand-ins are never billed, the refusal receipt reaches the window (and stays dark keyless), seats flip both ways and retired marks raise nothing, the owner’s gift stands outside the mint’s reach — and can be written at the door from the environment, lifting only a free chair — the courier honors the seal, and a keyless fork never learns money exists.');
