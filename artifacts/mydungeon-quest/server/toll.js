/**
 * THE TOLL-HOUSE — plans, grants, the ledger of use, and the innkeeper.
 *
 * The gateway stands only when BOTH the door (Clerk) and the mint (Stripe)
 * are open. Anything less and this file is a hallway: every request passes
 * unmetered, byte-for-byte as before. Laws of the house:
 *
 * - The ledger of use holds names and tallies, never tales: a patron id,
 *   a kind, a count. No prompt, no story text, no audio touches Postgres.
 * - Only real work is billed. A turn or asset served by a stand-in
 *   (`mock`, `fallback`) is never debited — never played as paid, never
 *   sold. House work (binding episodes, binding books) debits as 'house'.
 * - The clamp is the quota table. A client may ASK for any tier; the
 *   ledger decides what pours. Refusals are 402s with the innkeeper's own
 *   words, never a raw error.
 * - Fail closed for money, open for the table: when the ledger cannot be
 *   read, paid pours are refused (loudly) but the tale itself never dies.
 * - The free seat is a TASTE, counted for life, not by the month: six
 *   turns with every pour flowing, then the wall. Paid seats pour without
 *   measure — burst caps and the watchtower's ceilings still stand watch.
 *   Monthly page-turns apply only to numbered quotas (the taste has no
 *   page to turn; its tallies never reset).
 * - Owner's directive (July 2026): the house sells two seats — $5 by the
 *   week, auto-renewed, or $129.99 by the year in a single charge.
 */
import express from 'express';
import { doorOpen, ensureLedger, runQuery } from './patrons.js';
import { mintLive, getUncachableStripeClient, processTollWebhook } from './mint.js';
import { getClerkProxyHost } from './clerkProxy.js';

// ---------------------------------------------------------------- the plans
// Quota of `null` = unmetered (burst limits still stand watch); `0` = that
// pour is not on this table's menu. `lifetime: true` = tallies count from
// the first inscription and never reset — the taste is poured once.
// `guest` survives only as the innkeeper's fail-closed sentinel and for the
// standing page a signed-out visitor reads; with the door standing, no
// guest reaches a pouring route at all.
export const PLANS = Object.freeze({
  guest: {
    label: 'Guest at the fire',
    ceiling: 'parchment',
    quotas: { dm: null, retell: null, paint: 0, speak: 0, music: 0, sfx: 0, podcast: 0, pdf: 0 },
  },
  free: {
    label: 'The taste',
    ceiling: 'voiced', // the taste is the FULL flavor — plates, voices, all of it
    taste: true,
    lifetime: true,
    quotas: { dm: 6, retell: 2, paint: 12, speak: 40, music: 6, sfx: 18, podcast: 1, pdf: 1 },
  },
  weekly: {
    label: 'Patron by the week',
    ceiling: 'voiced',
    quotas: { dm: null, retell: null, paint: null, speak: null, music: null, sfx: null, podcast: null, pdf: null },
  },
  yearly: {
    label: 'Patron by the year',
    ceiling: 'voiced',
    quotas: { dm: null, retell: null, paint: null, speak: null, music: null, sfx: null, podcast: null, pdf: null },
  },
  // The owner's gift: a seat written into the ledger by hand, never sold and
  // never touched by the mint. Unmetered like the paid seats — burst caps and
  // the watchtower's ceilings still stand watch. `comp: true` is the law the
  // reconciler reads: Stripe neither grants nor revokes this chair, and no
  // price may bear its mark.
  house: {
    label: 'Friend of the house',
    ceiling: 'voiced',
    comp: true,
    quotas: { dm: null, retell: null, paint: null, speak: null, music: null, sfx: null, podcast: null, pdf: null },
  },
});
export const PLAN_RANK = { guest: 0, free: 1, weekly: 2, yearly: 3, house: 4 };
export const KINDS = ['dm', 'retell', 'paint', 'speak', 'music', 'sfx', 'podcast', 'pdf'];

// Kinds whose work is done by a paid artisan: billed only when the artisan
// was real. House kinds (podcast, pdf) are our own compute and bill as such.
const AI_KINDS = new Set(['dm', 'retell', 'paint', 'speak', 'music', 'sfx']);
const realWork = (provider) => Boolean(provider) && provider !== 'mock' && provider !== 'fallback';

// Subscription statuses that keep a seat warm. `past_due` keeps grace while
// Stripe retries the card; a cancel or an unpaid lapse drops the seat.
const ENTITLED = new Set(['active', 'trialing', 'past_due']);

// ------------------------------------------------------- the ledger of use
const TOLL_DDL = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`,
  `CREATE TABLE IF NOT EXISTS usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    provider TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS usage_events_user_month ON usage_events (user_id, created_at)`,
];

// The ledger of use binds itself, after (and only after) the visitors' book.
let tollBound = null;
export function ensureToll(query = runQuery) {
  if (!tollBound) {
    tollBound = ensureLedger(query)
      .then(async () => {
        for (const ddl of TOLL_DDL) await query(ddl);
      })
      .catch((error) => {
        tollBound = null;
        console.error(`[toll] the ledger of use could not be bound: ${error.message}`);
        throw error;
      });
  }
  return tollBound;
}

// ------------------------------------------------------------------ grants
const gateway = (deps = {}) => (deps.gate || (() => doorOpen() && mintLive()))();

const nextMonthUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
};
const fmtDay = (date) =>
  new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date);

// Plan rows ride a short candle so a webhook flip lands within ~30s on every
// instance without a read per request being anything but cheap.
const grants = new Map(); // patron id → { at, row }
export const bustGrant = (patronId) => grants.delete(patronId);
async function planRow(patronId, deps = {}) {
  const query = deps.query || runQuery;
  const ttl = Number(process.env.TOLL_GRANT_TTL_MS || 30000);
  const hit = grants.get(patronId);
  if (hit && Date.now() - hit.at < ttl) return hit.row;
  await ensureToll(query);
  const { rows } = await query('SELECT plan, stripe_customer_id FROM users WHERE id = $1', [patronId]);
  const row = rows[0] || { plan: 'free', stripe_customer_id: null };
  if (grants.size > 2000) grants.clear(); // a modest book, rebound when full
  grants.set(patronId, { at: Date.now(), row });
  return row;
}

/** The patron's standing. Dormant gateway → an unmetered pass-through. */
export async function grantFor(req, deps = {}) {
  if (!gateway(deps)) return { metered: false, plan: 'unmetered', quotas: {} };
  if (!req.patron) return { metered: true, plan: 'guest', hasCustomer: false, ...PLANS.guest };
  const row = await planRow(req.patron.id, deps); // may throw → callers fail closed
  const plan = PLANS[row.plan] ? row.plan : 'free';
  return { metered: true, plan, hasCustomer: Boolean(row.stripe_customer_id), ...PLANS[plan] };
}

// The month's page for monthly quotas; the whole book for the lifetime taste.
async function usedByKind(userId, deps = {}, lifetime = false) {
  const query = deps.query || runQuery;
  await ensureToll(query);
  const { rows } = await query(
    `SELECT kind, count(*)::int AS n FROM usage_events
     WHERE user_id = $1 ${lifetime ? '' : `AND created_at >= date_trunc('month', now() AT TIME ZONE 'UTC')`}
     GROUP BY kind`,
    [userId],
  );
  return Object.fromEntries(rows.map((r) => [r.kind, r.n]));
}

// ------------------------------------------------------------ the innkeeper
const KIND_WORD = {
  dm: 'turns at the table',
  retell: 'retellings',
  paint: 'painted plates',
  speak: 'spoken tellings',
  music: 'musical phrases',
  sfx: 'stings',
  podcast: 'bound episodes',
  pdf: 'bound books',
};

function upsellFor(plan, kind) {
  if (plan === 'guest') return 'free';
  for (const cand of ['weekly', 'yearly']) {
    if (PLAN_RANK[cand] > PLAN_RANK[plan] && PLANS[cand].quotas[kind] !== 0) return cand;
  }
  return null;
}

const refusal = (res, body) => res.status(402).json({ closed: true, ...body });

// The tale itself: the kinds a mislaid ledger may never silence. Everything
// else is a paid pour and fails closed when the house cannot record it.
const TALE_KINDS = new Set(['dm', 'retell']);

// One consistent 402 shape even when the ledger is unreadable — the unknown
// tallies are honest nulls, never invented numbers or invented dates.
const mislaid = (kind, plan = 'unknown') => ({
  kind,
  plan,
  reason: 'mislaid',
  quota: null,
  used: null,
  renewsAt: null,
  upsell: null,
  error: 'The innkeeper has mislaid the ledger — the house pours nothing it cannot record. Try again shortly.',
});

/**
 * The innkeeper stands between the rate limiter and the room. He reads the
 * grant, counts the page — the month's for numbered tables, the whole book
 * for the lifetime taste — and either waves the patron through or closes
 * the ledger in his own words, never a raw error.
 */
export function innkeeper(kind, deps = {}) {
  return async (req, res, next) => {
    let grant;
    try {
      grant = await grantFor(req, deps);
    } catch (error) {
      // Fail closed for money, open for the table. (The guest table is the
      // test of what is money: any pour a guest is never served free.)
      console.error(`[toll] the ledger could not be read (${error.message})`);
      if (PLANS.guest.quotas[kind] === 0) {
        return refusal(res, mislaid(kind));
      }
      req.grant = { metered: false, plan: 'unknown', quotas: {} };
      return next();
    }
    req.grant = grant;
    if (!grant.metered) return next();
    res.setHeader('X-Toll-Plan', grant.plan);
    const quota = grant.quotas[kind];
    if (quota === null || quota === undefined) return next();
    const lifetime = Boolean(grant.lifetime);
    const pageTurn = lifetime ? null : nextMonthUtc();
    const renewsAt = pageTurn ? pageTurn.toISOString() : null;
    if (quota === 0) {
      const upsell = upsellFor(grant.plan, kind);
      const word = KIND_WORD[kind] || kind;
      return refusal(res, {
        kind,
        plan: grant.plan,
        reason: 'table',
        quota,
        used: 0,
        // A kind that is not on this table's menu never renews — the
        // honest-nulls law: no invented page-turn dates, ever.
        renewsAt: null,
        upsell,
        error:
          grant.plan === 'guest'
            ? `The house pours ${word} for named patrons. Give your name at the door.`
            : upsell
              ? `The ${KIND_WORD[kind]} pour at the ${PLANS[upsell].label} table — your seat can be raised in Settings.`
              : `The house does not pour ${word} at your table.`,
      });
    }
    let used;
    try {
      used = (await usedByKind(req.patron.id, deps, lifetime))[kind] || 0;
    } catch (error) {
      console.error(`[toll] the ledger's page could not be counted (${error.message})`);
      // The tale never dies of a mislaid ledger — only paid pours fail closed.
      if (TALE_KINDS.has(kind)) return next();
      return refusal(res, mislaid(kind, grant.plan));
    }
    if (used >= quota) {
      const upsell = upsellFor(grant.plan, kind);
      return refusal(res, {
        kind,
        plan: grant.plan,
        reason: 'spent',
        quota,
        used,
        renewsAt,
        upsell,
        error: lifetime
          ? `The taste is poured — ${quota} free ${KIND_WORD[kind] || kind}, told true. A seat at the table pours without measure: $5 by the week, or $129.99 for the year.`
          : `The innkeeper closes the ledger — this month's ${KIND_WORD[kind]} are spent. The page turns on ${fmtDay(pageTurn)}.`,
      });
    }
    return next();
  };
}

/**
 * One line in the ledger of use — AFTER real work is served. Stand-ins are
 * never billed (the law), guests are never debited (their paid pours were
 * refused at the door), and a slipped debit is loud but never claws back a
 * response already poured.
 */
export function debit(req, kind, provider, deps = {}) {
  if (!req.grant?.metered || !req.patron) return Promise.resolve('untolled');
  if (AI_KINDS.has(kind) && !realWork(provider)) return Promise.resolve('stand-in');
  const query = deps.query || runQuery;
  return query('INSERT INTO usage_events (user_id, kind, provider) VALUES ($1, $2, $3)', [
    req.patron.id,
    kind,
    provider || 'house',
  ])
    .then(() => 'tolled')
    .catch((error) => {
      console.error(`[toll] a debit slipped the ledger (${kind}): ${error.message}`);
      return 'slipped';
    });
}

// ------------------------------------------------- entitlements ⇄ Stripe
/**
 * Read the patron's true standing from Stripe and write it on their line in
 * the visitors' book. Called when a webhook lands and when a patron returns
 * from checkout or the portal — both directions flip here: a paid seat is
 * granted, a lapsed one is taken back.
 */
export async function reconcileEntitlement({ userId, customerId }, deps = {}) {
  const query = deps.query || runQuery;
  await ensureToll(query);
  const { rows } = await query(
    userId
      ? 'SELECT id, plan, stripe_customer_id FROM users WHERE id = $1'
      : 'SELECT id, plan, stripe_customer_id FROM users WHERE stripe_customer_id = $1',
    [userId || customerId],
  );
  const row = rows[0];
  if (!row) return null; // a customer we never seated — nothing to flip
  // An owner-gift is outside the mint's reach: Stripe neither granted the
  // chair nor may take it back. The line stands as written; the mint is not
  // even consulted.
  if (PLANS[row.plan]?.comp) {
    bustGrant(row.id);
    return row.plan;
  }
  let plan = 'free';
  if (row.stripe_customer_id) {
    const stripe = deps.stripe ? await deps.stripe() : await getUncachableStripeClient();
    const subs = await stripe.subscriptions.list({ customer: row.stripe_customer_id, status: 'all', limit: 20 });
    for (const sub of subs.data || []) {
      if (!ENTITLED.has(sub.status)) continue;
      for (const item of sub.items?.data || []) {
        const p = item.price?.metadata?.mdq_plan;
        // A comp mark chalked on a price is a lie — gifts are not for sale.
        if (p && PLANS[p] && !PLANS[p].comp && (PLAN_RANK[p] || 0) > (PLAN_RANK[plan] || 0)) plan = p;
      }
    }
  }
  if (plan !== row.plan) {
    await query('UPDATE users SET plan = $1, updated_at = now() WHERE id = $2', [plan, row.id]);
    console.log(`[toll] a seat changed hands: patron ${row.id} now sits ${PLANS[plan].label}.`);
  }
  bustGrant(row.id);
  return plan;
}

// ------------------------------------------------------------- the catalog
// The price board. Read from the mint's synced ledger (the `stripe` schema)
// when it is bound; fall back to asking Stripe directly; chalk it in memory
// for ten minutes either way. Only prices bearing our own mark
// (metadata.mdq_plan) for a seat above the taste are listed — a foreign
// product in the same account is not our menu, and a retired mark is not
// our board.
// A gift seat is never on the board: a comp mark is not for sale even if a
// price in the account claims otherwise.
const forSale = (plan) =>
  Boolean(PLANS[plan]) && !PLANS[plan].comp && (PLAN_RANK[plan] || 0) > PLAN_RANK.free;
let board = { at: 0, prices: [] };
async function catalog(deps = {}) {
  if (board.prices.length && Date.now() - board.at < 600000) return board.prices;
  const query = deps.query || runQuery;
  let prices = [];
  try {
    const { rows } = await query(
      `SELECT id, unit_amount, currency, recurring, metadata FROM stripe.prices WHERE active = true`,
    );
    prices = rows
      .map((r) => ({
        plan: (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata)?.mdq_plan,
        priceId: r.id,
        amount: Number(r.unit_amount),
        currency: r.currency,
        interval:
          (typeof r.recurring === 'string' ? JSON.parse(r.recurring) : r.recurring)?.interval || 'month',
      }))
      .filter((p) => forSale(p.plan));
  } catch {
    prices = [];
  }
  if (!prices.length) {
    try {
      const stripe = deps.stripe ? await deps.stripe() : await getUncachableStripeClient();
      const list = await stripe.prices.list({ active: true, limit: 100 });
      prices = (list.data || [])
        .filter((p) => forSale(p.metadata?.mdq_plan))
        .map((p) => ({
          plan: p.metadata.mdq_plan,
          priceId: p.id,
          amount: p.unit_amount,
          currency: p.currency,
          interval: p.recurring?.interval || 'month',
        }));
    } catch (error) {
      console.error(`[toll] the price board is blank: ${error.message}`);
    }
  }
  if (prices.length) board = { at: Date.now(), prices };
  return prices;
}

// --------------------------------------------------------------- the rooms
/** The patron-facing shape: standing, tallies, the board, the page-turn. */
export async function buildToll(req, deps = {}) {
  let grant;
  try {
    grant = await grantFor(req, deps);
  } catch {
    grant = { metered: true, plan: 'guest', hasCustomer: false, ...PLANS.guest };
  }
  if (!grant.metered) return { live: false };
  const payload = {
    live: true,
    plan: grant.plan,
    label: grant.label,
    ceiling: grant.ceiling,
    taste: Boolean(grant.taste),
    lifetime: Boolean(grant.lifetime),
    quotas: grant.quotas,
    used: {},
    // The honest-nulls law: a page-turn date is only spoken where a real
    // monthly meter turns. The lifetime taste, the unmetered seats, and the
    // zeroed guest all have no page to turn — null, never an invented date.
    renewsAt:
      !grant.lifetime && Object.values(grant.quotas || {}).some((q) => typeof q === 'number' && q > 0)
        ? nextMonthUtc().toISOString()
        : null,
    portal: Boolean(grant.hasCustomer),
    prices: [],
  };
  if (req.patron) payload.used = await usedByKind(req.patron.id, deps, Boolean(grant.lifetime)).catch(() => ({}));
  payload.prices = await catalog(deps);
  return payload;
}

const requestOrigin = (req) =>
  `${String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || req.protocol || 'https'}://${getClerkProxyHost(req)}`;

export function tollRoutes(deps = {}) {
  const router = express.Router();

  // The standing page — safe for guests, honest when dormant.
  router.get('/toll', async (req, res) => {
    res.json(await buildToll(req, deps));
  });

  // Returning from checkout or the portal: re-read the truth, then answer.
  router.post('/toll/refresh', async (req, res) => {
    if (gateway(deps) && req.patron) {
      try {
        await reconcileEntitlement({ userId: req.patron.id }, deps);
      } catch (error) {
        console.error(`[toll] refresh stumbled: ${error.message}`);
      }
    }
    res.json(await buildToll(req, deps));
  });

  // A seat at a paid table — Stripe Checkout, the house never touches a card.
  router.post('/toll/checkout', async (req, res) => {
    try {
      if (!gateway(deps)) return res.status(409).json({ error: 'The toll-house was never built here.' });
      if (!req.patron) return res.status(401).json({ error: 'The ledger needs a name — give yours at the door first.' });
      const want = String(req.body?.plan || '');
      if (want !== 'weekly' && want !== 'yearly') {
        return res.status(400).json({ error: 'The house sells two seats: by the week and by the year.' });
      }
      const query = deps.query || runQuery;
      await ensureToll(query);
      // The point of sale reads FRESH truth, never the grant candle: a seat
      // flipped moments ago (an owner-gift written by hand, a webhook still
      // on the road) must be seen before any customer is minted or sold to.
      bustGrant(req.patron.id);
      const current = await planRow(req.patron.id, deps);
      // A friend of the house already holds the owner's gift — the house
      // sells nothing to a seated friend, and mints no customer for one.
      if (PLANS[current.plan]?.comp) {
        return res.json({ note: 'The house already pours without measure at your table — there is nothing to buy.' });
      }
      const stripe = deps.stripe ? await deps.stripe() : await getUncachableStripeClient();
      let customerId = current.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          name: req.patron.display_name || undefined,
          metadata: { mdq_user: req.patron.id, clerk_user_id: req.patron.clerk_user_id || '' },
        });
        customerId = customer.id;
        await query('UPDATE users SET stripe_customer_id = $1, updated_at = now() WHERE id = $2', [
          customerId,
          req.patron.id,
        ]);
        bustGrant(req.patron.id);
      }
      // Already seated at ANY paid table? Changing seats — weekly to yearly,
      // yearly to weekly, or leaving — is the portal's trade: the house never
      // sells a second chair to a seated patron (that would bill twice). The
      // guard reads LIVE truth: a seat bought seconds ago (its webhook still
      // on the road) must not be sold again, so an existing customer's line
      // is reconciled against Stripe itself before any sale.
      let standing = current.plan;
      if (current.stripe_customer_id) {
        try {
          standing = (await reconcileEntitlement({ userId: req.patron.id }, deps)) || standing;
        } catch (error) {
          console.error(`[toll] pre-sale reconciliation stumbled (${error.message}) — selling on the book's word`);
        }
      }
      if ((PLAN_RANK[standing] || 0) > PLAN_RANK.free) {
        const portal = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${requestOrigin(req)}/?toll=seen`,
        });
        return res.json({ url: portal.url, note: 'You already hold a seat — the portal handles changes.' });
      }
      const prices = await catalog(deps);
      const price = prices.find((p) => p.plan === want);
      if (!price) {
        return res.status(503).json({ error: 'The price board is still being chalked. Try again shortly.' });
      }
      const origin = requestOrigin(req);
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: price.priceId, quantity: 1 }],
        success_url: `${origin}/?toll=paid`,
        cancel_url: `${origin}/?toll=kept`,
        allow_promotion_codes: true,
        metadata: { mdq_user: req.patron.id, mdq_plan: want },
      });
      res.json({ url: session.url });
    } catch (error) {
      console.error(`[toll] checkout failed: ${error.message}`);
      res.status(502).json({ error: 'The mint did not answer. No coin moved — try again shortly.' });
    }
  });

  // The customer portal — upgrades, downgrades, cancels, receipts. Stripe's
  // room, our door.
  router.post('/toll/portal', async (req, res) => {
    try {
      if (!gateway(deps)) return res.status(409).json({ error: 'The toll-house was never built here.' });
      if (!req.patron) return res.status(401).json({ error: 'The ledger needs a name — give yours at the door first.' });
      const current = await planRow(req.patron.id, deps);
      if (!current.stripe_customer_id) {
        return res.status(400).json({ error: 'No coin has changed hands at this table yet.' });
      }
      const stripe = deps.stripe ? await deps.stripe() : await getUncachableStripeClient();
      const session = await stripe.billingPortal.sessions.create({
        customer: current.stripe_customer_id,
        return_url: `${requestOrigin(req)}/?toll=seen`,
      });
      res.json({ url: session.url });
    } catch (error) {
      console.error(`[toll] portal failed: ${error.message}`);
      res.status(502).json({ error: 'The mint did not answer. Try again shortly.' });
    }
  });

  return router;
}

// -------------------------------------------------------------- the webhook
/**
 * Stripe's courier. The seal (signature) is checked and the parcel synced
 * into the `stripe` schema by the mint; then — response already sent — the
 * named customer's entitlement is flipped to match the truth. Mounted on a
 * RAW body, before any parser, or the seal cannot be honored.
 */
export function tollWebhook(deps = {}) {
  return async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) return res.status(400).json({ error: 'unsigned' });
    if (!Buffer.isBuffer(req.body)) {
      console.error('[toll] webhook body arrived parsed — the raw mount must precede every parser');
      return res.status(500).json({ error: 'misbound' });
    }
    try {
      await (deps.processWebhook || processTollWebhook)(
        req.body,
        Array.isArray(signature) ? signature[0] : signature,
      );
    } catch (error) {
      console.error(`[toll] webhook refused: ${error.message}`);
      return res.status(400).json({ error: 'refused' });
    }
    res.status(200).json({ received: true });
    try {
      const event = JSON.parse(req.body.toString('utf8'));
      const customer = event?.data?.object?.customer;
      if (
        typeof customer === 'string' &&
        /^(customer\.subscription\.|checkout\.session\.completed|invoice\.)/.test(event?.type || '')
      ) {
        (deps.reconcile || reconcileEntitlement)({ customerId: customer }, deps).catch((error) =>
          console.error(`[toll] entitlement flip failed: ${error.message}`),
        );
      }
    } catch {
      /* the sync already recorded it; a later refresh reconciles */
    }
  };
}

// Eval-only seam: strike the process memory so stubbed scenarios start clean.
export function __resetTollForEval() {
  tollBound = null;
  grants.clear();
  board = { at: 0, prices: [] };
}
