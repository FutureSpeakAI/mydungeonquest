// ---- THE ONE LEDGER SEAM (Directive XX, Law XIII) ----
//
// The innkeeper reads STANDING, never storefront. The standing rows carry
// their source now (stripe today; appstore and play tomorrow — store
// receipts will write rows and touch nothing else), ONE pure predicate —
// entitledStanding, the single seat — folds a patron's rows into the seat
// they hold, and every door that decides a pour, a taste, or a seat asks
// that predicate and no other. Judged headless on a whole-verse bench:
// every verse this bench answers is bound WHOLE from birth (the ratified
// form after the fragment-green conviction) — normalized whitespace only,
// a stranger verse throws, drift reds by name.
//
//   1. THE ADDITIVE MIGRATION: a seeded LEGACY ledger — rows born before
//      the source column, one line even older than the toll — walks the
//      DDL and loses nothing: every existing row reads 'stripe' from the
//      DEFAULT alone, no UPDATE ever speaks, every TOLL_DDL verse wears
//      the additive posture (the every-spelling fail-closed tooth, as
//      ratified), and the source verse lands exactly once, pinned whole.
//   2. BYTE-FAITHFUL: the post-seam innkeeper answers the pre-seam GOLDEN
//      literals exactly — guest refusals, the taste counted for life with
//      honest walls, paid pours, the owner's gift, the grants, and the
//      standing page — captured against the untouched house, embedded
//      here as literals, never recomputed.
//   3. STOREFRONT-BLIND: rows differing ONLY in plan_source ('stripe',
//      'seed', 'appstore', 'play') seat identically at every door — all
//      eight pours, the grant, the standing page, and the checkout
//      counter's comp court; the predicate's own text names no
//      storefront field (blind by construction).
//   4. THE ONLY ROAD: the consultation counter proves the innkeeper, the
//      standing page, the checkout counter, and the reconciler all walk
//      through the ONE predicate; the predicate itself is pure and
//      fail-closed — no rows seat the taste, the highest seat wins,
//      malformed rows seat nothing beyond the taste, source never turns
//      the seat.
//   5. THE STRIPE WRITER: its write is grown by exactly the one stamped
//      source column — derived here from the golden pre-seam verse itself
//      and pinned WHOLE — and reconciliation behavior does not move: the
//      flip still answers 'weekly', the params are unchanged, and a comp
//      seat stays outside the mint's reach with zero writes.
//
// Planned reds recorded at birth: α grantFor bypassing the predicate
// (court 4's counter), β the DEFAULT dropped from the source verse
// (court 1's clothing + the literal pin), γ the stamp dropped from the
// writer (court 5's whole verse), δ the predicate bent to read source
// (court 3's identity + the text court).

import assert from 'node:assert/strict';

// The bench is keyless and mintless by decree — the gateway is stubbed
// open with `gate`, and no key may leak in from the workspace.
for (const key of [
  'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
  'CLERK_SECRET_KEY', 'CLERK_PUBLISHABLE_KEY',
  'REPLIT_CONNECTORS_HOSTNAME', 'REPL_IDENTITY', 'WEB_REPL_RENEWAL',
  'DATABASE_URL', 'TOLL_GRANT_TTL_MS', 'HOUSE_SEATS',
]) delete process.env[key];

const { __resetDoorForEval } = await import('../server/patrons.js');
const {
  KINDS, TOLL_DDL, innkeeper, grantFor, buildToll, tollRoutes,
  reconcileEntitlement, entitledStanding,
  __standingConsultsForEval, __resetTollForEval,
} = await import('../server/toll.js');

const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const fresh = () => { __resetDoorForEval(); __resetTollForEval(); };
const gate = () => true;
const noMint = async () => { throw new Error('the bench keeps no mint'); };
const resSpy = () => {
  const r = { code: 200, body: null, headers: {} };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  return r;
};

// ---- the eval-local verse twins (LITERAL copies — never imported, never
// recomputed; if the house moves a verse, this court reds by name) ----
const V = {
  sourceLand: `ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_source TEXT NOT NULL DEFAULT 'stripe'`,
  standingRead: 'SELECT plan, plan_source, stripe_customer_id FROM users WHERE id = $1',
  reconcileById: 'SELECT id, plan, stripe_customer_id FROM users WHERE id = $1',
  reconcileByCust: 'SELECT id, plan, stripe_customer_id FROM users WHERE stripe_customer_id = $1',
  seatWrite: `UPDATE users SET plan = $1, plan_source = 'stripe', updated_at = now() WHERE id = $2`,
  tallyLife: 'SELECT kind, count(*)::int AS n FROM usage_events WHERE user_id = $1 GROUP BY kind',
  tallyMonth: `SELECT kind, count(*)::int AS n FROM usage_events WHERE user_id = $1 AND created_at >= date_trunc('month', now() AT TIME ZONE 'UTC') GROUP BY kind`,
  board: 'SELECT id, unit_amount, currency, recurring, metadata FROM stripe.prices WHERE active = true',
};

// Additive DDL is the ONLY dialect this bench speaks: table births, index
// births, and column adds. Any other spelling — an UPDATE, a DROP, a
// rewrite of any kind — throws, so a non-additive migration cannot even
// run here (the every-spelling fail-closed tooth).
const ADDITIVE = /^(CREATE TABLE IF NOT EXISTS |CREATE (UNIQUE )?INDEX IF NOT EXISTS |ALTER TABLE \w+ ADD COLUMN IF NOT EXISTS )/;

// ---- the whole-verse house bench ----
// A seeded shelf of user rows (legacy rows may LACK columns — the DDL walk
// clothes them from defaults, exactly as Postgres would) plus a book of
// usage events. Every verse is matched WHOLE after whitespace-normalizing;
// projections throw on columns the walk has not landed, and the only
// lawful write is the Stripe writer's own pinned verse.
function houseBench({ users = [], events = [] } = {}) {
  const shelf = new Map(users.map((u) => [u.id, { ...u }]));
  const spoken = [];
  const project = (row, cols) => {
    const out = {};
    for (const col of cols) {
      if (!(col in row)) throw new Error(`column ${col} does not exist — the walk has not landed on this bench`);
      out[col] = row[col];
    }
    return out;
  };
  const query = async (text, params) => {
    const t = norm(text);
    spoken.push({ t, params });
    if (ADDITIVE.test(t)) {
      if (t.startsWith('ALTER TABLE users ADD COLUMN IF NOT EXISTS ')) {
        const name = t.match(/ADD COLUMN IF NOT EXISTS (\w+)/)[1];
        const def = t.match(/DEFAULT '([^']*)'/);
        for (const row of shelf.values()) if (!(name in row)) row[name] = def ? def[1] : null;
      }
      return { rows: [] };
    }
    if (t === V.standingRead) {
      const row = shelf.get(params[0]);
      return { rows: row ? [project(row, ['plan', 'plan_source', 'stripe_customer_id'])] : [] };
    }
    if (t === V.reconcileById) {
      const row = shelf.get(params[0]);
      return { rows: row ? [project(row, ['id', 'plan', 'stripe_customer_id'])] : [] };
    }
    if (t === V.reconcileByCust) {
      const row = [...shelf.values()].find((r) => r.stripe_customer_id === params[0]);
      return { rows: row ? [project(row, ['id', 'plan', 'stripe_customer_id'])] : [] };
    }
    if (t === V.seatWrite) {
      const row = shelf.get(params[1]);
      if (!row) throw new Error('the writer flips no line the book does not hold');
      row.plan = params[0];
      row.plan_source = 'stripe';
      return { rows: [] };
    }
    if (t === V.tallyLife || t === V.tallyMonth) {
      return { rows: events.filter((e) => e.user_id === params[0]).map(({ kind, n }) => ({ kind, n })) };
    }
    if (t === V.board) return { rows: [] };
    if (/^(UPDATE|DELETE|DROP|TRUNCATE|ALTER)\b/i.test(t)) {
      throw new Error(`the seeded ledger is rewritten by no one: ${t.slice(0, 90)}`);
    }
    throw new Error(`the one-ledger bench knows no such verse: ${t.slice(0, 90)}`);
  };
  query.spoken = spoken;
  query.shelf = shelf;
  return query;
}

// ---- the GOLDEN literals — the pre-seam innkeeper's answers, captured
// against the untouched house and embedded verbatim. The post-seam house
// must answer these BYTE-FOR-BYTE; nothing here is recomputed. ----
const GOLDEN = {
  guestPaint: { walked: false, code: 402, body: { closed: true, kind: 'paint', plan: 'guest', reason: 'table', quota: 0, used: 0, renewsAt: null, upsell: 'free', error: 'The house pours painted plates for named patrons. Give your name at the door.' }, headers: { 'X-Toll-Plan': 'guest' }, tallySpoken: false },
  guestDm: { walked: true, code: 200, body: null, headers: { 'X-Toll-Plan': 'guest' }, tallySpoken: false },
  tasteDm3: { walked: true, code: 200, body: null, headers: { 'X-Toll-Plan': 'free' }, tallySpoken: true },
  tasteWall: { walked: false, code: 402, body: { closed: true, kind: 'dm', plan: 'free', reason: 'spent', quota: 6, used: 6, renewsAt: null, upsell: 'weekly', error: 'The taste is poured — 6 free turns at the table, told true. A seat at the table pours without measure: $5 by the week, or $129.99 for the year.' }, headers: { 'X-Toll-Plan': 'free' }, tallySpoken: true },
  tasteSpeak: { walked: true, code: 200, body: null, headers: { 'X-Toll-Plan': 'free' }, tallySpoken: true },
  weeklyPodcast: { walked: true, code: 200, body: null, headers: { 'X-Toll-Plan': 'weekly' }, tallySpoken: false },
  housePaint: { walked: true, code: 200, body: null, headers: { 'X-Toll-Plan': 'house' }, tallySpoken: false },
  grantFree: { metered: true, plan: 'free', hasCustomer: false, label: 'The taste', ceiling: 'voiced', taste: true, lifetime: true, quotas: { dm: 6, retell: 2, paint: 12, speak: 40, music: 6, sfx: 18, podcast: 1, pdf: 1 } },
  tollFree: { live: true, plan: 'free', label: 'The taste', ceiling: 'voiced', taste: true, lifetime: true, quotas: { dm: 6, retell: 2, paint: 12, speak: 40, music: 6, sfx: 18, podcast: 1, pdf: 1 }, used: { dm: 3 }, renewsAt: null, portal: false, prices: [] },
  grantWeekly: { metered: true, plan: 'weekly', hasCustomer: true, label: 'Patron by the week', ceiling: 'voiced', quotas: { dm: null, retell: null, paint: null, speak: null, music: null, sfx: null, podcast: null, pdf: null } },
  tollWeekly: { live: true, plan: 'weekly', label: 'Patron by the week', ceiling: 'voiced', taste: false, lifetime: false, quotas: { dm: null, retell: null, paint: null, speak: null, music: null, sfx: null, podcast: null, pdf: null }, used: { dm: 9 }, renewsAt: null, portal: true, prices: [] },
  tollWeeklyTallyMonthly: true,
  reconcileWeekly: 'weekly',
  reconcileWrite: [{ text: 'UPDATE users SET plan = $1, updated_at = now() WHERE id = $2', params: ['weekly', 'u-1'] }],
};

const hushErr = console.error;
console.error = () => {};

// A door walk in the capture's own shape: fresh candles, one bench, one
// knock; the tally flag reads the spoken verses, never the answer.
const walkDoor = async (kind, patron, q) => {
  fresh();
  const res = resSpy();
  let walked = false;
  await innkeeper(kind, { gate, query: q })({ patron }, res, () => { walked = true; });
  return { walked, code: res.code, body: res.body, headers: res.headers, tallySpoken: q.spoken.some((s) => s.t.includes('FROM usage_events')) };
};
const stripeBench = (plan, cus, events = []) => houseBench({
  users: [{ id: 'u-1', plan, plan_source: 'stripe', stripe_customer_id: cus }],
  events: events.map((e) => ({ user_id: 'u-1', ...e })),
});

// ---- 1. the additive migration — legacy rows clothed by defaults alone ----
{
  fresh();
  // Rows born before the seam: none carries plan_source; the eldest line
  // predates the toll itself and carries no plan either.
  const q = houseBench({ users: [
    { id: 'u-old', plan: 'weekly', stripe_customer_id: 'cus_old' },
    { id: 'u-elder' },
    { id: 'u-gift', plan: 'house', stripe_customer_id: null },
  ] });
  const grant = await grantFor({ patron: { id: 'u-old' } }, { gate, query: q });
  assert.equal(grant.plan, 'weekly', 'the walk loses no seat');
  for (const [id, row] of q.shelf) assert.equal(row.plan_source, 'stripe', `after the walk every existing row reads stripe by decree (${id})`);
  assert.equal(q.shelf.get('u-elder').plan, 'free', 'the elder line is clothed by defaults alone');
  assert.ok(!q.spoken.some((s) => /^UPDATE\b/i.test(s.t)), 'not one row rewritten by any UPDATE — the default does all the work');
  const elder = await grantFor({ patron: { id: 'u-elder' } }, { gate, query: q });
  assert.equal(elder.plan, 'free', 'the clothed elder seats the taste');
  const gift = await grantFor({ patron: { id: 'u-gift' } }, { gate, query: q });
  assert.equal(gift.plan, 'house', 'the owner\'s gift survives the walk untouched');
  // The posture court reads the DDL itself: every spelling additive, the
  // source verse pinned whole, and exactly one such landing.
  for (const verse of TOLL_DDL) {
    assert.match(norm(verse), ADDITIVE, `additive only — no drop, no delete, no rewrite: ${norm(verse).slice(0, 60)}`);
  }
  assert.ok(TOLL_DDL.some((verse) => norm(verse) === V.sourceLand), 'the source column lands with its default, pinned whole');
  assert.equal(TOLL_DDL.filter((verse) => /plan_source/.test(verse)).length, 1, 'exactly one landing for the source column');
}

// ---- 2. byte-faithful — the golden answers, door by door ----
{
  assert.deepEqual(await walkDoor('paint', null, houseBench()), GOLDEN.guestPaint, 'the guest paint refusal does not move');
  assert.deepEqual(await walkDoor('dm', null, houseBench()), GOLDEN.guestDm, 'the guest turn does not move');
  assert.deepEqual(await walkDoor('dm', { id: 'u-1' }, stripeBench('free', null, [{ kind: 'dm', n: 3 }])), GOLDEN.tasteDm3, 'the taste mid-pour does not move');
  assert.deepEqual(await walkDoor('dm', { id: 'u-1' }, stripeBench('free', null, [{ kind: 'dm', n: 6 }])), GOLDEN.tasteWall, 'the taste\'s honest wall does not move');
  assert.deepEqual(await walkDoor('speak', { id: 'u-1' }, stripeBench('free', null, [])), GOLDEN.tasteSpeak, 'the taste\'s spoken pour does not move');
  assert.deepEqual(await walkDoor('podcast', { id: 'u-1' }, stripeBench('weekly', 'cus_x', [])), GOLDEN.weeklyPodcast, 'the paid pour does not move');
  assert.deepEqual(await walkDoor('paint', { id: 'u-1' }, stripeBench('house', 'cus_x', [])), GOLDEN.housePaint, 'the gift\'s pour does not move');

  fresh();
  {
    const q = stripeBench('free', null, [{ kind: 'dm', n: 3 }]);
    assert.deepEqual(await grantFor({ patron: { id: 'u-1' } }, { gate, query: q }), GOLDEN.grantFree, 'the taste\'s grant does not move');
    assert.deepEqual(await buildToll({ patron: { id: 'u-1' } }, { gate, query: q, stripe: noMint }), GOLDEN.tollFree, 'the taste\'s standing page does not move');
    assert.ok(q.spoken.some((s) => s.t === V.tallyLife), 'the taste is counted for LIFE — the whole book, bound whole');
  }
  fresh();
  {
    const q = stripeBench('weekly', 'cus_x', [{ kind: 'dm', n: 9 }]);
    assert.deepEqual(await grantFor({ patron: { id: 'u-1' } }, { gate, query: q }), GOLDEN.grantWeekly, 'the paid grant does not move');
    assert.deepEqual(await buildToll({ patron: { id: 'u-1' } }, { gate, query: q, stripe: noMint }), GOLDEN.tollWeekly, 'the paid standing page does not move');
    assert.equal(q.spoken.some((s) => s.t === V.tallyMonth), GOLDEN.tollWeeklyTallyMonthly, 'the month\'s page for the paid seat, bound whole');
  }
}

// ---- 3. storefront-blind — sources seat identically at every door ----
{
  const seatWalk = async (source) => {
    const mkQ = () => houseBench({
      users: [{ id: 'u-s', plan: 'weekly', plan_source: source, stripe_customer_id: 'cus_s' }],
      events: [{ user_id: 'u-s', kind: 'dm', n: 9 }],
    });
    const answers = {};
    for (const kind of KINDS) answers[kind] = await walkDoor(kind, { id: 'u-s' }, mkQ());
    fresh();
    answers.grant = await grantFor({ patron: { id: 'u-s' } }, { gate, query: mkQ() });
    fresh();
    answers.toll = await buildToll({ patron: { id: 'u-s' } }, { gate, query: mkQ(), stripe: noMint });
    return answers;
  };
  const stripeSeat = await seatWalk('stripe');
  for (const source of ['seed', 'appstore', 'play']) {
    assert.deepEqual(await seatWalk(source), stripeSeat, `a '${source}' row seats identically to a stripe row at every door`);
  }
  assert.ok(
    !/plan_source|stripe|customer|source/i.test(entitledStanding.toString()),
    'blind by construction — the predicate\'s own text names no storefront field',
  );

  // The checkout counter's comp court, source-blind and through the ONE
  // seat: a gift wearing a store source is still the owner's gift.
  for (const source of ['stripe', 'appstore']) {
    fresh();
    const q = houseBench({ users: [{ id: 'u-h', plan: 'house', plan_source: source, stripe_customer_id: null }] });
    let minted = 0;
    const stripe = {
      customers: { create: async () => { minted += 1; return { id: 'cus_no' }; } },
      checkout: { sessions: { create: async () => ({ url: 'https://never.example' }) } },
      billingPortal: { sessions: { create: async () => ({ url: 'https://never.example' }) } },
    };
    const deps = { query: q, stripe: async () => stripe, gate };
    const layer = tollRoutes(deps).stack.find((l) => l.route?.path === '/toll/checkout');
    const res = resSpy();
    const before = __standingConsultsForEval();
    await layer.route.stack[0].handle({ patron: { id: 'u-h', display_name: 'H' }, body: { plan: 'weekly' }, headers: {}, protocol: 'https' }, res);
    assert.equal(res.code, 200, `the counter answers the ${source} gift, never errors`);
    assert.match(res.body?.note || '', /nothing to buy/i, `the ${source} gift is met with the house's note`);
    assert.equal(minted, 0, `no customer minted for a friend of the house (${source})`);
    assert.ok(__standingConsultsForEval() > before, 'the counter asks the one seat');
  }
}

// ---- 4. the only road — every door consults the one predicate ----
{
  fresh();
  const q = stripeBench('free', null, [{ kind: 'dm', n: 3 }]);
  let before = __standingConsultsForEval();
  await innkeeper('dm', { gate, query: q })({ patron: { id: 'u-1' } }, resSpy(), () => {});
  assert.ok(__standingConsultsForEval() > before, 'the innkeeper asks the one seat');
  fresh();
  before = __standingConsultsForEval();
  await buildToll({ patron: { id: 'u-1' } }, { gate, query: stripeBench('free', null, []), stripe: noMint });
  assert.ok(__standingConsultsForEval() > before, 'the standing page asks the one seat');

  // The predicate itself: pure, fail-closed, source-deaf.
  assert.equal(entitledStanding([]), 'free', 'no rows seat the taste');
  assert.equal(entitledStanding(undefined), 'free', 'no book at all seats the taste');
  assert.equal(entitledStanding([{ plan: 'weekly', plan_source: 'stripe' }, { plan: 'yearly', plan_source: 'seed' }]), 'yearly', 'the highest seat among the rows wins, blind to source');
  assert.equal(entitledStanding([null, 'weekly', { plan: 42 }, { plan: 'voiced' }]), 'free', 'malformed rows seat nothing beyond the taste — fail closed');
  assert.equal(entitledStanding([{ plan: 'house', plan_source: 'play' }]), 'house', 'a store-sourced gift is still the gift');
  assert.equal(
    entitledStanding([{ plan: 'weekly', plan_source: 'appstore' }]),
    entitledStanding([{ plan: 'weekly', plan_source: 'stripe' }]),
    'source never turns the seat',
  );
}

// ---- 5. the Stripe writer — grown by exactly the one stamped column ----
{
  fresh();
  const q = houseBench({ users: [{ id: 'u-1', plan: 'free', plan_source: 'stripe', stripe_customer_id: 'cus_1' }] });
  const hushLog = console.log;
  console.log = () => {};
  let flipped;
  try {
    flipped = await reconcileEntitlement({ customerId: 'cus_1' }, {
      query: q, gate,
      stripe: async () => ({ subscriptions: { list: async () => ({ data: [{ status: 'active', items: { data: [{ price: { metadata: { mdq_plan: 'weekly' } } }] } }] }) } }),
    });
  } finally {
    console.log = hushLog;
  }
  assert.equal(flipped, GOLDEN.reconcileWeekly, 'the flip still answers weekly — behavior does not move');
  const writes = q.spoken.filter((s) => s.t.startsWith('UPDATE'));
  assert.equal(writes.length, 1, 'one write, no more');
  assert.equal(writes[0].t, V.seatWrite, 'the grown verse, pinned whole');
  assert.deepEqual(writes[0].params, GOLDEN.reconcileWrite[0].params, 'the params do not move — no parameter smuggles a source');
  assert.equal(
    norm(GOLDEN.reconcileWrite[0].text).replace('SET plan = $1,', `SET plan = $1, plan_source = 'stripe',`),
    V.seatWrite,
    'grown by exactly the one stamped column — derived from the pre-seam verse itself',
  );
  assert.equal(q.shelf.get('u-1').plan, 'weekly', 'the seat is flipped in the book');
  assert.equal(q.shelf.get('u-1').plan_source, 'stripe', 'the writer stamps its own name');

  // A comp seat — even one wearing a store source — stays outside the
  // mint's reach: the ONE seat is asked, the mint is not, nothing writes.
  fresh();
  const qh = houseBench({ users: [{ id: 'u-h', plan: 'house', plan_source: 'appstore', stripe_customer_id: 'cus_h' }] });
  const before = __standingConsultsForEval();
  const hushLog2 = console.log;
  console.log = () => {};
  let kept;
  try {
    kept = await reconcileEntitlement({ userId: 'u-h' }, {
      query: qh, gate,
      stripe: async () => { throw new Error('the mint is not consulted for a gift'); },
    });
  } finally {
    console.log = hushLog2;
  }
  assert.equal(kept, 'house', 'the gift stands as written, whatever its source says');
  assert.ok(__standingConsultsForEval() > before, 'the reconciler asks the one seat');
  assert.equal(qh.spoken.filter((s) => s.t.startsWith('UPDATE')).length, 0, 'zero writes for a comp seat');
}

console.error = hushErr;
console.log('PASS oneLedger — the one ledger seam holds: the source column lands additively (legacy rows clothed by the default alone, no UPDATE spoken, every DDL spelling additive), the post-seam innkeeper answers the pre-seam golden literals byte-for-byte, rows differing only in source seat identically at every door with the predicate blind by construction, the consultation counter proves innkeeper, standing page, checkout counter, and reconciler all walk the ONE seat, and the Stripe writer\'s verse is grown by exactly its one stamped column — pinned whole, params unmoved, comp seats untouched by the mint.');
