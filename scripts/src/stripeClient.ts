import Stripe from 'stripe';

/**
 * Fetches Stripe credentials from the Replit connection API.
 * Not cached -- tokens can rotate, so fetch fresh each time.
 */
async function getStripeCredentials(): Promise<{ secretKey: string; webhookSecret?: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error(
      'Missing Replit environment variables. ' +
        'Ensure the Stripe integration is connected via the Integrations tab.',
    );
  }

  // NOTE: the `connector_names` query filter returns zero items on this API
  // (verified empirically) — fetch all connections and pick stripe ourselves.
  const resp = await fetch(`https://${hostname}/api/v2/connection?include_secrets=true`, {
    headers: { Accept: 'application/json', X_REPLIT_TOKEN: xReplitToken },
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch Stripe credentials: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  const item = (data.items || []).find(
    (it: { connector_name?: string }) => (it.connector_name || '').toLowerCase() === 'stripe',
  );
  const settings = item?.settings;
  // The live connector payload names the key `secret` (older shapes said
  // `secret_key`) — honor both, prefer the one actually observed.
  const secretKey = settings?.secret || settings?.secret_key;

  if (!secretKey) {
    throw new Error(
      'Stripe integration not connected or missing secret key. ' +
        'Connect Stripe via the Integrations tab first.',
    );
  }

  return { secretKey, webhookSecret: settings.webhook_secret };
}

/**
 * Returns a fresh authenticated Stripe client.
 * Not cached -- fetches credentials on every call so rotated keys are picked up.
 */
export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}
