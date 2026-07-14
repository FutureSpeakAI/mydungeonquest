/**
 * CHALK THE BOARD — bring Stripe's price board in line with the house menu.
 *
 * Idempotent, and honest about foreign chalk:
 *  - ensures one active price per seat the house sells (metadata.mdq_plan),
 *    at the exact owner-directed amount and interval;
 *  - retires (deactivates) any active price bearing our mark that is NOT on
 *    today's menu — a renamed seat, a stale amount, a retired plan;
 *  - never touches a price without our mark: a foreign product sharing the
 *    Stripe account is not our board and not our business.
 *
 * Run: node scripts/chalk-board.mjs   (needs the Stripe connector)
 * Safe to re-run any time the owner re-chalks the menu in server/toll.js.
 */
import { getUncachableStripeClient } from '../server/mint.js';

// The owner's menu (July 2026): two seats, nothing else.
const MENU = [
  { plan: 'weekly', product: 'MyDungeon.Quest — Patron by the Week', amount: 500, interval: 'week' },
  { plan: 'yearly', product: 'MyDungeon.Quest — Patron by the Year', amount: 12999, interval: 'year' },
];

const stripe = await getUncachableStripeClient();
const active = [];
for await (const price of stripe.prices.list({ active: true, limit: 100 })) active.push(price);

const fits = (price, want) =>
  price.metadata?.mdq_plan === want.plan &&
  price.unit_amount === want.amount &&
  price.currency === 'usd' &&
  price.recurring?.interval === want.interval &&
  price.recurring?.interval_count === 1;

// 1. retire every marked price that is not today's menu, exactly as chalked.
for (const price of active) {
  const mark = price.metadata?.mdq_plan;
  if (!mark) continue; // foreign chalk — not ours to wipe
  const want = MENU.find((m) => m.plan === mark);
  if (want && fits(price, want)) continue;
  await stripe.prices.update(price.id, { active: false });
  console.log(`retired: ${price.id} (mdq_plan=${mark}, ${price.unit_amount}¢/${price.recurring?.interval})`);
  try {
    const product = await stripe.products.retrieve(
      typeof price.product === 'string' ? price.product : price.product.id,
    );
    if (product.active && product.metadata?.mdq_plan === mark) {
      const others = await stripe.prices.list({ product: product.id, active: true, limit: 1 });
      if (!others.data.length) {
        await stripe.products.update(product.id, { active: false });
        console.log(`retired product: ${product.id} (${product.name})`);
      }
    }
  } catch (error) {
    console.error(`  (product retirement skipped: ${error.message})`);
  }
}

// 2. chalk any missing seat.
for (const want of MENU) {
  const have = active.find((p) => fits(p, want));
  if (have) {
    console.log(`kept: ${want.plan} → ${have.id} (${want.amount}¢/${want.interval})`);
    continue;
  }
  const product = await stripe.products.create({
    name: want.product,
    metadata: { mdq_plan: want.plan },
  });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: want.amount,
    currency: 'usd',
    recurring: { interval: want.interval },
    metadata: { mdq_plan: want.plan },
  });
  console.log(`chalked: ${want.plan} → ${price.id} (${want.amount}¢/${want.interval})`);
}

console.log('\nTHE BOARD IS CHALKED — the menu and the mint agree.');
