import { getUncachableStripeClient } from './stripeClient';

/**
 * Chalk the toll-house price board: two paid seats, marked with our own
 * metadata (`mdq_plan`) on BOTH product and price — the server's catalog and
 * entitlement reconciler recognize seats by that mark alone, never by name.
 *
 * Idempotent: existing marked products/prices are left as they are, so the
 * script can run any number of times (and after a price re-chalking, old
 * prices should be archived in the Stripe dashboard, not deleted here).
 *
 * Run with: pnpm --filter @workspace/scripts exec tsx src/seed-toll.ts
 */
const SEATS = [
  {
    plan: 'illuminated',
    name: 'MyDungeon Illuminated',
    description:
      'The illuminated seat at MyDungeon.Quest — painted plates, stings, and musical phrases at the table.',
    amount: 900, // $9.00 / month
  },
  {
    plan: 'voiced',
    name: 'MyDungeon Voiced',
    description:
      'The voiced seat at MyDungeon.Quest — everything illuminated, plus narration, the Podcast Forge, and PDF book binding.',
    amount: 1900, // $19.00 / month
  },
] as const;

async function seed() {
  const stripe = await getUncachableStripeClient();
  for (const seat of SEATS) {
    const existing = await stripe.products.search({
      query: `metadata['mdq_plan']:'${seat.plan}' AND active:'true'`,
    });
    let product = existing.data[0];
    if (product) {
      console.log(`product already chalked: ${product.name} (${product.id})`);
    } else {
      product = await stripe.products.create({
        name: seat.name,
        description: seat.description,
        metadata: { mdq_plan: seat.plan },
      });
      console.log(`chalked product: ${product.name} (${product.id})`);
    }

    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
    let price = prices.data.find(
      (p) => p.metadata?.mdq_plan === seat.plan && p.recurring?.interval === 'month',
    );
    if (price) {
      console.log(`price already chalked: ${price.id} (${price.unit_amount} ${price.currency}/month)`);
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: seat.amount,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: { mdq_plan: seat.plan },
      });
      console.log(`chalked price: $${(seat.amount / 100).toFixed(2)}/month (${price.id})`);
    }
  }
  console.log('The board is chalked. Backfill/webhooks sync it into the stripe schema.');
}

seed().catch((error) => {
  console.error('seeding failed:', error?.message || error);
  process.exit(1);
});
