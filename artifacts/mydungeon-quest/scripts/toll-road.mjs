/**
 * THE TOLL ROAD, walked — a one-off proof against Stripe TEST MODE.
 *
 * Walks the real patron road end to end against the live database and the
 * live Stripe test account, with the dev server's registered webhook doing
 * the entitlement flip:
 *
 *   0.5 preflight: the dev server must answer /api/health, else abort —
 *      the registered webhook has nowhere to land without it
 *   1. seat a named patron in the visitors' book
 *   2. POST /toll/checkout {plan: weekly} → a real Stripe Checkout session
 *      opens, priced exactly as the owner chalked it ($5/week)
 *   3. pay the toll (test card 4242… via pm_card_visa) — a real test-mode
 *      subscription on the same customer, exactly what checkout completion
 *      would create
 *   4. wait for Stripe's courier: the webhook lands at the running server
 *      and users.plan flips to weekly
 *   5. POST /toll/refresh (the ?toll=paid return) → standing shows the
 *      seat, and the pours are UNMEASURED (quotas null — the paid law)
 *   6. POST /toll/checkout again → refused a second sale, handed the portal
 *      (a seated patron is never sold a second chair)
 *   7. POST /toll/portal → the ledger opens (Stripe billing portal URL)
 *   8. cancel the seat (the portal's trade, done by API) → webhook lands →
 *      the seat lowers back to the taste
 *   9. sweep the road: cancel subs, delete the test customer and the row
 *
 * Run: npm run toll-road   (needs DATABASE_URL + Stripe connector, TEST mode)
 */
import express from 'express';
import { tollRoutes, ensureToll, PLANS } from '../server/toll.js';
import { runQuery } from '../server/patrons.js';
import { getUncachableStripeClient, assertStripeTestMode } from '../server/mint.js';

const CLERK_ID = 'toll_road_walk_test';
const HOST = process.env.REPLIT_DOMAINS?.split(',')[0];
if (!HOST) throw new Error('REPLIT_DOMAINS missing');

const say = (s) => console.log(`\n== ${s}`);
const die = (s) => { console.error(`\nFAILED: ${s}`); process.exit(1); };

// -- 0. the live-money gate: refuse anything but a test-mode key -------------
say('0. checking the gate — test-mode keys only');
await assertStripeTestMode();
console.log('Stripe key is test-mode. The road may be walked.');

// -- 1. seat the patron ------------------------------------------------------
say('1. seating the test patron');
await ensureToll();
const { rows } = await runQuery(
  `INSERT INTO users (clerk_user_id, display_name) VALUES ($1, 'Road Walker')
   ON CONFLICT (clerk_user_id) DO UPDATE SET updated_at = now()
   RETURNING id, clerk_user_id, display_name`,
  [CLERK_ID],
);
const patron = rows[0];
console.log('patron:', patron.id, patron.display_name);

// A local mount of the REAL routes, with the gateway forced live and the
// patron pre-attached (Clerk's door is proven elsewhere; this walk proves
// the toll road itself).
const deps = { gate: () => true };
const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.patron = patron; next(); });
app.use('/api', tollRoutes(deps));
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api`;
const hop = (path, body) =>
  fetch(base + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': HOST,
    },
    body: JSON.stringify(body || {}),
  }).then(async (r) => ({ status: r.status, body: await r.json() }));

const stripe = await getUncachableStripeClient();

// -- 1.5 preflight: the courier's door must be open ---------------------------
// The webhook flips are done by the RUNNING dev server's registered webhook
// (https://<host>/api/stripe/webhook). If that server is down, the flips can
// only be caught by the /toll/refresh fallback — which would let a broken
// webhook road pass silently. Refuse to walk unless the door answers.
say('preflight: pinging the running dev server (the webhook courier\'s door)');
try {
  const ping = await fetch(`https://${HOST}/api/health`, { signal: AbortSignal.timeout(10_000) });
  if (!ping.ok) die(`dev server answered /api/health with ${ping.status} — start the dev server first (the registered webhook must land there)`);
  console.log(`dev server is up at https://${HOST} — the courier has a door.`);
} catch (e) {
  die(`dev server unreachable at https://${HOST}/api/health (${e.message}) — start the dev server first (the registered webhook must land there)`);
}

// -- 2. checkout opens -------------------------------------------------------
say('2. POST /toll/checkout {plan: weekly}');
const co = await hop('/toll/checkout', { plan: 'weekly' });
if (co.status !== 200 || !co.body.url) die(`checkout: ${co.status} ${JSON.stringify(co.body)}`);
console.log('checkout URL:', co.body.url.slice(0, 60) + '…');
const sessId = co.body.url.match(/\/pay\/(cs_\w+)/)?.[1];
const sess = sessId ? await stripe.checkout.sessions.retrieve(sessId) : null;
if (!sess) die('could not read the session back from Stripe');
console.log(`session: mode=${sess.mode} status=${sess.status} success=${sess.success_url}`);
if (sess.mode !== 'subscription' || !sess.success_url.includes('toll=paid')) die('session shape wrong');
if (!sess.success_url.startsWith(`https://${HOST}/`)) die(`success_url origin wrong: ${sess.success_url}`);
const customerId = sess.customer;
console.log('customer:', customerId);

// -- 3. pay the toll (test card 4242…) ---------------------------------------
say('3. paying with the 4242 test card (pm_card_visa)');
const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: customerId });
await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: pm.id } });
const line = (await stripe.checkout.sessions.listLineItems(sessId)).data[0];
const price = line.price;
console.log(`price: ${price.id} ${price.unit_amount}¢/${price.recurring?.interval}`);
if (price.unit_amount !== 500 || price.recurring?.interval !== 'week') {
  die(`the board is mis-chalked: expected 500¢/week, got ${price.unit_amount}¢/${price.recurring?.interval}`);
}
const sub = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: price.id }],
  metadata: { mdq_user: patron.id, mdq_plan: 'weekly', toll_road_walk: '1' },
});
console.log(`subscription: ${sub.id} status=${sub.status}`);
if (sub.status !== 'active') die(`subscription not active: ${sub.status}`);

// -- 4. the webhook flips the plan -------------------------------------------
say('4. waiting for the courier (webhook → users.plan)');
const readPlan = async () =>
  (await runQuery('SELECT plan FROM users WHERE id = $1', [patron.id])).rows[0].plan;
let plan = null;
for (let i = 0; i < 30; i++) {
  plan = await readPlan();
  if (plan === 'weekly') break;
  await new Promise((r) => setTimeout(r, 2000));
}
console.log('users.plan =', plan);
if (plan !== 'weekly') {
  die('webhook did not flip the plan within 60s — the dev server was up (preflight passed), so the webhook road itself is broken. The /toll/refresh fallback is a fallback, not a pass condition.');
}

// -- 5. the ?toll=paid return ------------------------------------------------
say('5. POST /toll/refresh (the ?toll=paid return)');
const rf = await hop('/toll/refresh');
console.log(`standing: plan=${rf.body.plan} portal=${rf.body.portal} dm quota=${JSON.stringify(rf.body.quotas?.dm)}`);
if (rf.body.plan !== 'weekly') die(`refresh did not show the seat: ${JSON.stringify(rf.body)}`);
if (rf.body.quotas.dm !== null || rf.body.quotas.podcast !== null) die('a paid seat must pour without measure (quotas null)');
if (JSON.stringify(rf.body.quotas) !== JSON.stringify(PLANS.weekly.quotas)) die('quotas do not match the law');
if (!rf.body.portal) die('portal flag not set');

// -- 6. never sell a seated patron a second chair -----------------------------
say('6. POST /toll/checkout again (yearly this time) — expect the portal, not a sale');
const again = await hop('/toll/checkout', { plan: 'yearly' });
if (!again.body.note || !again.body.url?.includes('billing.stripe.com')) {
  die(`second sale not refused: ${JSON.stringify(again.body)}`);
}
console.log('refused with note:', again.body.note);

// -- 7. the portal opens -------------------------------------------------------
say('7. POST /toll/portal');
const portal = await hop('/toll/portal');
if (portal.status !== 200 || !portal.body.url) die(`portal: ${JSON.stringify(portal.body)}`);
console.log('portal URL:', portal.body.url.slice(0, 60) + '…');

// -- 8. leave the seat ---------------------------------------------------------
say('8. cancelling the seat (the portal\'s trade, done by API)');
await stripe.subscriptions.cancel(sub.id);
let lowered = null;
for (let i = 0; i < 30; i++) {
  lowered = await readPlan();
  if (lowered === 'free') break;
  await new Promise((r) => setTimeout(r, 2000));
}
console.log('users.plan after cancel =', lowered);
if (lowered !== 'free') {
  die('cancel webhook did not lower the seat within 60s — the dev server was up (preflight passed), so the webhook road itself is broken. The /toll/refresh fallback is a fallback, not a pass condition.');
}
const rf2 = await hop('/toll/refresh');
if (rf2.body.plan !== 'free') die('refresh disagrees after cancel');

// -- 9. sweep the road ----------------------------------------------------------
say('9. sweeping the road');
await stripe.customers.del(customerId);
await runQuery('DELETE FROM users WHERE id = $1', [patron.id]);
console.log('test customer and patron removed.');

server.close();
console.log('\nTHE ROAD HOLDS — checkout opened at $5/week, the toll was paid, the seat lit, poured without measure, and lowered.');
process.exit(0);
