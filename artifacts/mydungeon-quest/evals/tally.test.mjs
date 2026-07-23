// ---- THE HONEST TALLY (Directive XX, Law III — Task 65, Phase 2) ----
//
// A page tallies once. A debit lands by its natural key — patron, kind,
// campaign, turn — and a second landing is a no-op, whether it comes from
// a closed wire's retry, a double click, or a receipt replay. A page never
// received is never the page that empties the taste. Judged headless on
// the toll's own dependency seams — keyless, network-free, no Postgres:
//   1. The insert's shape, pinned: the guarded line names the natural key
//      columns and the conflict clause verbatim; a debit whose door knows
//      no campaign or turn speaks TODAY'S insert byte-for-byte; half a
//      key is no key (never coerced, never invented); the door readers
//      pass only what the payloads truly hold.
//   2. The guard at work: against a stand-in ledger enforcing the partial
//      unique guard, the same (patron, dm, campaign, turn) lands once and
//      the taste falls exactly one — a different turn lands and it falls
//      two; the key is the FULL width (kind, campaign, patron split it).
//   3. The closed-wire script: debited, wire lost, identical turn retried
//      and debited again — one line, the taste down exactly one, and the
//      innkeeper still pours the sixth turn a replay never spent.
//   4. Legacy is byte-faithful: no key, same insert as ever, twice lands
//      twice, null-key rows never collide with the guard or each other.
//   5. The migration walks additive-only: adds and creates, never a drop,
//      delete, truncate, or update — and a seeded legacy ledger counts
//      identically before and after the walk.

import assert from 'node:assert/strict';

// Scrub before judging: this bench sits at a keyless, mintless table.
delete process.env.CLERK_SECRET_KEY;
delete process.env.CLERK_PUBLISHABLE_KEY;
delete process.env.REPLIT_CONNECTORS_HOSTNAME;
delete process.env.REPL_IDENTITY;
delete process.env.WEB_REPL_RENEWAL;
delete process.env.DATABASE_URL;

const { __resetDoorForEval } = await import('../server/patrons.js');
const {
  debit, dmDebitKey, retellDebitKey, ensureToll, buildToll, innkeeper, __resetTollForEval,
} = await import('../server/toll.js');

const fresh = () => { __resetDoorForEval(); __resetTollForEval(); };
const gate = () => true;
// The mint, stubbed silent: buildToll chalks its board through this seam.
const stripe = async () => ({ prices: { list: async () => ({ data: [] }) } });
const resSpy = () => {
  const res = { code: 200, body: null, headers: {} };
  res.status = (c) => { res.code = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  return res;
};

// The two insert shapes, pinned byte-for-byte: LEGACY is today's line
// exactly; GUARDED adds the natural key columns and the conflict clause
// against the partial unique guard — nothing else.
const LEGACY_INSERT = 'INSERT INTO usage_events (user_id, kind, provider) VALUES ($1, $2, $3)';
const GUARDED_INSERT =
  'INSERT INTO usage_events (user_id, kind, provider, campaign_id, turn) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id, kind, campaign_id, turn) WHERE campaign_id IS NOT NULL AND turn IS NOT NULL DO NOTHING';

// A recording bench: answers by fragment of the SQL text, mutates nothing.
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

// A stand-in LEDGER that enforces the partial unique guard the way
// Postgres will: a guarded insert whose four-part key already stands
// lands nothing (rowCount 0); everything else appends. Only INSERT
// mutates — DDL and SELECT walk through and touch no row.
const ledgerStandIn = (seed = []) => {
  const rows = [...seed];
  const spoken = [];
  const query = async (text, params) => {
    spoken.push({ text, params });
    if (text.startsWith('INSERT INTO usage_events')) {
      const [user_id, kind, provider, campaign_id = null, turn = null] = params;
      if (text.includes('ON CONFLICT')) {
        const dup = rows.some((r) =>
          r.user_id === user_id && r.kind === kind &&
          r.campaign_id !== null && r.turn !== null &&
          r.campaign_id === campaign_id && r.turn === turn);
        if (dup) return { rows: [], rowCount: 0 };
      }
      rows.push({ user_id, kind, provider, campaign_id, turn });
      return { rows: [], rowCount: 1 };
    }
    if (text.includes('GROUP BY kind')) {
      const tally = {};
      for (const r of rows) if (r.user_id === params[0]) tally[r.kind] = (tally[r.kind] || 0) + 1;
      return { rows: Object.entries(tally).map(([kind, n]) => ({ kind, n })) };
    }
    if (text.includes('SELECT plan')) return { rows: [{ plan: 'free', stripe_customer_id: null }] };
    return { rows: [] };
  };
  query.rows = rows;
  query.spoken = spoken;
  return query;
};

const patron = (id) => ({ grant: { metered: true, plan: 'free' }, patron: { id } });
// The taste, read the house's own way — through buildToll's usedByKind.
const tasteOf = async (q, id) =>
  (await buildToll({ patron: { id } }, { gate, query: q, stripe })).used;

// ---- 1. the insert's shape, pinned ----
{
  fresh();
  const q = bench();
  const req = patron('u-pin');
  assert.equal(await debit(req, 'dm', 'anthropic', { query: q, key: { campaignId: 'c-1', turn: 4 } }), 'tolled');
  assert.equal(q.spoken[0].text, GUARDED_INSERT, 'the guarded line is pinned verbatim — key columns and conflict clause');
  assert.deepEqual(q.spoken[0].params, ['u-pin', 'dm', 'anthropic', 'c-1', 4]);
  assert.equal(await debit(req, 'dm', 'anthropic', { query: q }), 'tolled');
  assert.equal(q.spoken[1].text, LEGACY_INSERT, "no key → today's insert, byte-for-byte");
  assert.deepEqual(q.spoken[1].params, ['u-pin', 'dm', 'anthropic']);
  // Half a key is no key — and never coerced into one.
  for (const key of [
    { campaignId: 'c-1', turn: null }, { campaignId: null, turn: 2 }, { campaignId: '', turn: 2 },
    { campaignId: 'c-1', turn: '4' }, { campaignId: 'c-1', turn: 4.5 }, {},
  ]) {
    const qq = bench();
    await debit(req, 'dm', 'anthropic', { query: qq, key });
    assert.equal(qq.spoken[0].text, LEGACY_INSERT, `an incomplete key (${JSON.stringify(key)}) lands unguarded`);
    assert.equal(qq.spoken[0].params.length, 3);
  }
  // The doors read, never invent: the DM payload holds both halves; the
  // Chronicler's payload holds its chapter index and NO campaign identity
  // today — passed as held, landing unguarded, honestly.
  assert.deepEqual(dmDebitKey({ campaign: { id: 'c-9', title: 'T' }, turn: 12 }), { campaignId: 'c-9', turn: 12 });
  assert.deepEqual(dmDebitKey({ campaign: { title: 'T' }, turn: 0 }), { campaignId: null, turn: 0 });
  assert.deepEqual(dmDebitKey({}), { campaignId: null, turn: null });
  assert.deepEqual(dmDebitKey({ campaign: { id: 42 }, turn: '3' }), { campaignId: null, turn: null }, 'malformed halves read null, never coerced');
  assert.deepEqual(retellDebitKey({ campaign: { title: 'T', tone: 'grim' }, chapter: { index: 3 } }), { campaignId: null, turn: 3 }, "today's retell wire carries no campaign id — none is invented");
  assert.deepEqual(retellDebitKey({ campaign: { id: 'c-2' }, chapter: { index: 0 } }), { campaignId: 'c-2', turn: 0 }, 'a wire that one day carries identity is honored');
  assert.deepEqual(retellDebitKey({}), { campaignId: null, turn: null });
  // The standing laws are untouched by the key: stand-ins unbilled, the
  // nameless untolled — with or without a key in hand.
  const silent = bench();
  assert.equal(await debit(req, 'dm', 'mock', { query: silent, key: { campaignId: 'c', turn: 1 } }), 'stand-in');
  assert.equal(await debit({ grant: { metered: true }, patron: null }, 'dm', 'anthropic', { query: silent, key: { campaignId: 'c', turn: 1 } }), 'untolled');
  assert.equal(silent.spoken.length, 0);
}

// ---- 2. the guard at work: one page, one tally ----
{
  fresh();
  const q = ledgerStandIn();
  const req = patron('u-guard');
  assert.equal(await debit(req, 'dm', 'anthropic', { query: q, key: { campaignId: 'c-1', turn: 3 } }), 'tolled', 'the first landing tolls');
  assert.equal(await debit(req, 'dm', 'anthropic', { query: q, key: { campaignId: 'c-1', turn: 3 } }), 'once', 'the second landing is a no-op with its own honest word');
  assert.equal(q.rows.length, 1, 'one line, not two');
  assert.equal((await tasteOf(q, 'u-guard')).dm, 1, "the taste falls exactly one — counted by the house's own book");
  assert.equal(await debit(req, 'dm', 'anthropic', { query: q, key: { campaignId: 'c-1', turn: 4 } }), 'tolled', 'a different turn is a different page');
  assert.equal((await tasteOf(q, 'u-guard')).dm, 2, 'and the taste falls two');
  // The key is the FULL width: kind, campaign, and patron each split it.
  assert.equal(await debit(req, 'retell', 'anthropic', { query: q, key: { campaignId: 'c-1', turn: 3 } }), 'tolled', 'another kind under the same campaign and turn is its own page');
  assert.equal(await debit(req, 'dm', 'anthropic', { query: q, key: { campaignId: 'c-2', turn: 3 } }), 'tolled', 'another campaign is its own page');
  assert.equal(await debit(patron('u-other'), 'dm', 'anthropic', { query: q, key: { campaignId: 'c-1', turn: 3 } }), 'tolled', 'another patron is their own page');
  assert.deepEqual(await tasteOf(q, 'u-guard'), { dm: 3, retell: 1 });
}

// ---- 3. the closed-wire script ----
{
  fresh();
  const q = ledgerStandIn();
  const req = patron('u-wire');
  // The turn pours; the sealed event is written to the wire — and the wire
  // is already gone. The debit lands regardless (the pour was real).
  assert.equal(await debit(req, 'dm', 'anthropic', { query: q, key: { campaignId: 'c-w', turn: 7 } }), 'tolled');
  // The client never received the page and plays the identical turn again;
  // the room pours again and the door debits again — the retry is FREE.
  assert.equal(await debit(req, 'dm', 'anthropic', { query: q, key: { campaignId: 'c-w', turn: 7 } }), 'once');
  // A double click makes it a third landing; the page still tallies once.
  assert.equal(await debit(req, 'dm', 'anthropic', { query: q, key: { campaignId: 'c-w', turn: 7 } }), 'once');
  assert.equal((await tasteOf(q, 'u-wire')).dm, 1, 'the taste is down exactly one');
  // The innkeeper's arithmetic agrees: five distinct pages plus a replay
  // leave the sixth turn still pouring — a page never received is never
  // the page that empties the taste.
  for (const turn of [8, 9, 10, 11]) {
    await debit(req, 'dm', 'anthropic', { query: q, key: { campaignId: 'c-w', turn } });
  }
  assert.equal(await debit(req, 'dm', 'anthropic', { query: q, key: { campaignId: 'c-w', turn: 9 } }), 'once', 'the replayed ninth page lands nothing');
  assert.equal((await tasteOf(q, 'u-wire')).dm, 5);
  let poured = false;
  await innkeeper('dm', { gate, query: q })(patron('u-wire'), resSpy(), () => { poured = true; });
  assert.equal(poured, true, 'the sixth turn still pours');
}

// ---- 4. legacy is byte-faithful ----
{
  fresh();
  const q = ledgerStandIn();
  const req = patron('u-old');
  assert.equal(await debit(req, 'dm', 'anthropic', { query: q }), 'tolled');
  assert.equal(await debit(req, 'dm', 'anthropic', { query: q }), 'tolled', 'no key → twice lands twice, exactly as today');
  assert.equal(q.rows.length, 2);
  assert.ok(
    q.spoken.filter((s) => s.text.startsWith('INSERT')).every((s) => s.text === LEGACY_INSERT),
    "both landings spoke today's insert byte-for-byte",
  );
  assert.ok(q.rows.every((r) => r.campaign_id === null && r.turn === null), 'null halves — outside the guard');
  assert.equal((await tasteOf(q, 'u-old')).dm, 2, 'legacy arithmetic unchanged');
  // Null-key lines never collide with a guarded line either — the guard
  // is partial, so a keyed page and the old blind pages stand together.
  assert.equal(await debit(req, 'dm', 'anthropic', { query: q, key: { campaignId: 'c-x', turn: 0 } }), 'tolled');
  assert.equal((await tasteOf(q, 'u-old')).dm, 3);
}

// ---- 5. the migration walks additive-only ----
{
  fresh();
  const legacy = [
    { user_id: 'u-leg', kind: 'dm', provider: 'anthropic', campaign_id: null, turn: null },
    { user_id: 'u-leg', kind: 'dm', provider: 'openai', campaign_id: null, turn: null },
    { user_id: 'u-leg', kind: 'paint', provider: 'gemini', campaign_id: null, turn: null },
  ];
  const q = ledgerStandIn(legacy);
  const before = { dm: 2, paint: 1 };
  await ensureToll(q); // THE WALK — every statement it speaks is recorded
  const texts = q.spoken.map((s) => s.text);
  assert.ok(texts.some((t) => t.includes('ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS campaign_id TEXT')), 'the campaign column is added, nullable');
  assert.ok(texts.some((t) => t.includes('ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS turn INTEGER')), 'the turn column is added, nullable');
  const guard = texts.find((t) => t.includes('CREATE UNIQUE INDEX IF NOT EXISTS usage_events_once'));
  assert.ok(guard, 'the guard is created by the same bootstrap hand');
  assert.ok(guard.includes('ON usage_events (user_id, kind, campaign_id, turn)'), 'over the natural key');
  assert.ok(guard.includes('WHERE campaign_id IS NOT NULL AND turn IS NOT NULL'), 'and PARTIAL — legacy and keyless rows never meet it');
  for (const text of texts) {
    assert.ok(!/^\s*(drop|delete|truncate|update)\b/i.test(text), `no mutating statement rides the walk: ${text.slice(0, 60)}`);
    assert.ok(!/\bdrop\b/i.test(text), `no drop rides even mid-statement: ${text.slice(0, 60)}`);
    assert.ok(!/\btruncate\b/i.test(text), 'no truncate rides at all');
    assert.ok(!/\bupdate\b/i.test(text), 'no update rides at all');
    for (const hit of text.matchAll(/\bdelete\b/gi)) {
      assert.equal(text.slice(Math.max(0, hit.index - 3), hit.index).toUpperCase(), 'ON ', 'DELETE appears only as the ON DELETE cascade clause');
    }
  }
  assert.equal(q.rows.length, 3, 'not a row was touched');
  assert.deepEqual(await tasteOf(q, 'u-leg'), before, 'a seeded legacy ledger counts identically after the walk');
}

console.log("PASS — the honest tally: a page tallies once — the debit lands by its natural key (patron, kind, campaign, turn) under a partial unique guard added by a purely additive walk, a second landing (closed wire, double click, replay) is a no-op that answers 'once' and never empties the taste, the doors carry only the keys their payloads truly hold (the DM both halves, the Chronicler its chapter index and never an invented identity), and a keyless or legacy debit inserts byte-for-byte as it always has.");
