/**
 * THE TOLL ROAD, walked — a one-off proof against Stripe TEST MODE.
 *
 * Walks the real patron road end to end against the live database and the
 * live Stripe test account, with the dev server's registered webhook doing
 * the entitlement flip:
 *
 *   1. seat a named patron in the visitors' book
 *   2. POST /toll/checkout → a real Stripe Checkout session opens
 *   3. pay the toll (test card 4242… via pm_card_visa) — a real test-mode
 *      subscription on the same customer, exactly what checkout completion
 *      would create
 *   4. wait for Stripe's courier: the webhook lands at the running server
 *      and users.plan flips to illuminated
 *   5. POST /toll/refresh (the ?toll=paid return) → standing + quotas open
 *   6. POST /toll/checkout again → refused a second sale, handed the portal
 *   7. POST /toll/portal → the ledger opens (Stripe billing portal URL)
 *   8. cancel the seat (the portal's trade, done by API) → webhook lands →
 *      the seat lowers back to Parchment
 *   9. sweep the road: cancel subs, delete the test customer and the row
 *
 * Run: node scripts/toll-road.mjs   (needs DATABASE_URL + Stripe connector)
 */
import express from 'express';
import { tollRoutes, ensureToll, PLANS } from '../server/toll.js';
import { runQuery } from '../server/patrons.js';
import { getUncachableStripeClient } from '../server/mint.js';

const CLERK_ID = 'toll_road_walk_test';
const HOST = process.env.REPLIT_DOMAINS?.split(',')[0];
if (!HOST) throw new Error('REPLIT_DOMAINS missing');

const say = (s) => console.log(`\n== ${s}`);
const die = (s) => { console.error(`\nFAILED: ${s}`); process.exit(1); };

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

// -- 2. checkout opens -------------------------------------------------------
say('2. POST /toll/checkout {plan: illuminated}');
const co = await hop('/toll/checkout', { plan: 'illuminated' });
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
const priceId = sess.line_items?.data?.[0]?.price?.id ||
  (await stripe.checkout.sessions.listLineItems(sessId)).data[0].price.id;
const sub = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  metadata: { mdq_user: patron.id, mdq_plan: 'illuminated', toll_road_walk: '1' },
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
  if (plan === 'illuminated') break;
  await new Promise((r) => setTimeout(r, 2000));
}
console.log('users.plan =', plan);
const webhookFlipped = plan === 'illuminated';
if (!webhookFlipped) console.error('!! webhook did not flip the plan within 60s — refresh must catch it');

// -- 5. the ?toll=paid return ------------------------------------------------
say('5. POST /toll/refresh (the ?toll=paid return)');
const rf = await hop('/toll/refresh');
console.log(`standing: plan=${rf.body.plan} portal=${rf.body.portal} paint quota=${rf.body.quotas?.paint}`);
if (rf.body.plan !== 'illuminated') die(`refresh did not show the seat: ${JSON.stringify(rf.body)}`);
if (rf.body.quotas.paint !== PLANS.illuminated.quotas.paint) die('quotas did not open');
if (!rf.body.portal) die('portal flag not set');
if (!webhookFlipped && (await readPlan()) !== 'illuminated') die('plan still not written');

// -- 6. never sell the same chair twice ---------------------------------------
say('6. POST /toll/checkout again (same seat) — expect the portal, not a sale');
const again = await hop('/toll/checkout', { plan: 'illuminated' });
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
  const rf2 = await hop('/toll/refresh');
  console.log('refresh says:', rf2.body.plan);
  if (rf2.body.plan !== 'free') die('the seat did not lower');
  console.error('!! cancel webhook did not lower the seat within 60s — refresh caught it');
} else {
  const rf2 = await hop('/toll/refresh');
  if (rf2.body.plan !== 'free') die('refresh disagrees after cancel');
}

// -- 9. sweep the road ----------------------------------------------------------
say('9. sweeping the road');
await stripe.customers.del(customerId);
await runQuery('DELETE FROM users WHERE id = $1', [patron.id]);
console.log('test customer and patron removed.');

server.close();
console.log('\nTHE ROAD HOLDS — checkout opened, the toll was paid, the seat lit and lowered.');
process.exit(0);
