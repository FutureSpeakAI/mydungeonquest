/**
 * THE MINT — Stripe plumbing for the toll-house.
 *
 * Credentials come from Replit's Stripe connection (never pasted keys),
 * fetched fresh on every call because rotated tokens must be picked up.
 * Opt-in like every door in this house: no connection → the mint stays
 * dark, the gateway stays dormant, and a keyless fork behaves exactly as
 * it always has (`npm run check` scrubs the connector env itself).
 *
 * stripe-replit-sync owns the `stripe` schema in Postgres: products,
 * prices, customers, subscriptions arrive there by webhook + backfill.
 * We READ that schema for the catalog; we never write to it. If it lives
 * in Stripe, Stripe is the source of truth.
 */

import Stripe from 'stripe';
import { StripeSync, runMigrations } from 'stripe-replit-sync';

let live = false; // true only after initMint stands the mint up
let initPromise = null;

/** True when the Replit Stripe connection COULD be reached (env present). */
export function mintConfigured() {
  return Boolean(
    process.env.REPLIT_CONNECTORS_HOSTNAME &&
      (process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL) &&
      process.env.DATABASE_URL,
  );
}

/** True once initMint has stood the mint up in this process. */
export function mintLive() {
  return live;
}

/**
 * Fetch Stripe credentials from the Replit connection API.
 * Never cached — tokens rotate, so fetch fresh each time.
 */
async function getStripeCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error('Stripe connection unreachable — the mint is dark.');
  }

  // NOTE: the `connector_names` query filter returns zero items on this API
  // (verified empirically) — fetch all connections and pick stripe ourselves.
  const resp = await fetch(`https://${hostname}/api/v2/connection?include_secrets=true`, {
    headers: { Accept: 'application/json', X_REPLIT_TOKEN: xReplitToken },
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) {
    throw new Error(`Stripe credential fetch failed: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  const item = (data.items || []).find(
    (it) => (it.connector_name || '').toLowerCase() === 'stripe',
  );
  const settings = item?.settings;
  // The live connector payload names the key `secret` (older shapes said
  // `secret_key`) — honor both, prefer the one actually observed.
  const secretKey = settings?.secret || settings?.secret_key;
  if (!secretKey) {
    throw new Error('Stripe connection has no secret key — connect Stripe via Integrations.');
  }
  return { secretKey, webhookSecret: settings.webhook_secret };
}

/**
 * Hard gate for test rigs: throws unless the connected Stripe key is a
 * TEST-mode key. Call this before any rig that creates/cancels/deletes
 * Stripe objects — it must never run against live money.
 */
export async function assertStripeTestMode() {
  const { secretKey } = await getStripeCredentials();
  if (!/^(sk|rk)_test_/.test(secretKey)) {
    throw new Error(
      `REFUSED: the connected Stripe key (${secretKey.slice(0, 7)}…) is not a test-mode key — ` +
        'the toll-road walk only runs against Stripe TEST mode.',
    );
  }
}

/** A fresh authenticated Stripe client (never cache — keys rotate). */
export async function getUncachableStripeClient() {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}

/** A fresh StripeSync for webhook processing and data sync. */
export async function getStripeSync() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required for the mint.');
  const { secretKey, webhookSecret } = await getStripeCredentials();
  return new StripeSync({
    poolConfig: { connectionString: databaseUrl },
    stripeSecretKey: secretKey,
    stripeWebhookSecret: webhookSecret ?? '',
  });
}

/**
 * Stand the mint up: stripe-schema migrations, the managed webhook aimed
 * at /api/stripe/webhook, and a background backfill. Never throws — a
 * failed mint logs loudly and leaves the gateway dormant (fail closed for
 * money; the table plays on unmetered only when the mint was never built).
 */
export async function initMint() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (!mintConfigured()) {
      console.log('[mint] dark — no Stripe connection; the toll-house sleeps.');
      return false;
    }
    try {
      await runMigrations({ databaseUrl: process.env.DATABASE_URL, schema: 'stripe' });
      const sync = await getStripeSync();
      const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
      if (domain) {
        await sync.findOrCreateManagedWebhook(`https://${domain}/api/stripe/webhook`);
      } else {
        console.error('[mint] REPLIT_DOMAINS missing — webhook not registered; entitlements will lag.');
      }
      sync
        .syncBackfill({ object: 'all' })
        .then(() => console.log('[mint] backfill done — the stripe ledger is current.'))
        .catch((err) => console.error('[mint] backfill failed:', err?.message || err));
      live = true;
      console.log('[mint] open — the toll-house stands and real work is metered.');
      return true;
    } catch (err) {
      console.error('[mint] failed to stand up — gateway stays dormant:', err?.message || err);
      return false;
    }
  })();
  return initPromise;
}

/** Webhook relay: signature-checked, then synced into the stripe schema. */
export async function processTollWebhook(rawBody, signature) {
  const sync = await getStripeSync();
  await sync.processWebhook(rawBody, signature);
}

/** Evals only. */
export function __resetMintForEval() {
  live = false;
  initPromise = null;
}
