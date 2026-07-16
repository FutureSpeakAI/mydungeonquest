import express from 'express';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDmTurn } from './dm.js';
import { adapters, providerChains } from './adapters/index.js';
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from './clerkProxy.js';
import { doorkeeper, doorOpen, namedOnly, whoami } from './patrons.js';
import { initMint, mintConfigured } from './mint.js';
import { innkeeper, debit, tollRoutes, tollWebhook } from './toll.js';
import { vaultRoutes } from './vault.js';
import { rateLimit, abuseCaps, requestLog, installAlarms, logLine, spendAllowed, recordSpend, ledgerHealthy, watchReport, testHerald, ownersBell } from './watchtower.js';
import { assetlinksFor } from './dowry.js';

// THE WATCHTOWER's tripwires: a crash is never silent.
installAlarms();

// Per-kind wall-clock budget for one provider attempt. A stalled upstream call
// must not block failover, so every real provider is bounded; on timeout the
// attempt is treated as a failure and the chain advances (ultimately to mock).
const PROVIDER_BUDGET_MS = {
  paint: Number(process.env.PAINT_TIMEOUT_MS || 120000),
  speak: Number(process.env.SPEAK_TIMEOUT_MS || 90000),
  music: Number(process.env.MUSIC_TIMEOUT_MS || 150000),
  sfx: Number(process.env.SFX_TIMEOUT_MS || 90000)
};
function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Walk a provider chain (preferred → … → mock), returning the first success.
// Each fall-through is logged so the console shows why a paid provider was
// skipped; mock is the guaranteed floor, needs no timeout, and never throws.
async function runChain(kind, body) {
  const chain = providerChains()[kind];
  const budget = PROVIDER_BUDGET_MS[kind] || 90000;
  let lastError;
  for (let i = 0; i < chain.length; i += 1) {
    const provider = chain[i];
    try {
      // THE WATCHTOWER's spend ceiling: a provider whose day is spent is
      // simply skipped — the chain degrades to the next artisan (ultimately
      // the mock floor) instead of draining the budget.
      if (provider.name !== 'mock' && !(await spendAllowed(provider.name))) { lastError = new Error(`${provider.name} daily ceiling reached`); continue; }
      const call = provider[kind](body);
      const result = provider.name === 'mock' ? await call : await withTimeout(call, budget, `${provider.name} ${kind} timed out after ${budget}ms`);
      if (provider.name !== 'mock') recordSpend(provider.name);
      return { ...result, degraded: i > 0 };
    } catch (error) {
      lastError = error;
      console.error(`[${kind}] provider ${provider.name} failed: ${error.message}`);
    }
  }
  throw lastError || new Error(`No ${kind} provider available`);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const app = express();
const port = Number(process.env.PORT || 3001);
const maxBody = process.env.MAX_REQUEST_BYTES || '25mb'; // references ride as base64
app.disable('x-powered-by');
// THE DOOR's production courier: Clerk Frontend API rides our own domain.
// Mounted before any body parser — the proxy streams raw bytes. Inert in
// dev and on a keyless fork (see clerkProxy.js).
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
// THE MINT's courier: Stripe webhooks arrive sealed, and the seal is checked
// against the RAW bytes — so this room is mounted before every parser and
// before the doorkeeper (a courier is not a patron). Dormant instances
// simply have no working mint behind it; the seal check refuses strangers.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), tollWebhook());
// A whole-quest audiobook ships every turn's narration as base64 in one body,
// which can exceed the default limit; give this route its own headroom BEFORE
// the global parser so the smaller limit doesn't reject a long chronicle.
app.use('/api/quest-audio', express.json({ limit: process.env.MAX_AUDIO_BYTES || '200mb' }));
// THE VAULT's blob door takes raw bytes, content-addressed — mounted before
// the JSON parser so an asset body is never mis-read as a document.
app.post('/api/vault/media/:hash', express.raw({ type: () => true, limit: process.env.MAX_VAULT_BLOB_BYTES || '25mb' }));
app.use(express.json({ limit: maxBody }));
app.use(express.text({ type: 'text/html', limit: process.env.MAX_PDF_HTML_BYTES || '100mb' }));

// THE DOORKEEPER stands at /api: patrons are read from the Clerk session and
// inscribed in the ledger as req.patron; guests pass unchallenged, and a
// keyless fork has no door at all. Every route below sees the same law.
app.use('/api', doorkeeper());
app.get('/api/whoami', whoami);
// THE TOLL-HOUSE's public rooms: standing, checkout, portal, refresh. All
// honest when dormant ({ live: false }) — the client then hides the counter.
app.use('/api', tollRoutes());
// THE VAULT: cloud backup and cross-device restore. Fail-closed rooms —
// named patrons only; dormant without the door and the ledger.
app.use('/api', vaultRoutes());

// Burst limits (now durable — see watchtower.js) key to the NAME when one
// was given at the door, else the address; the count survives a restart
// whenever the ledger stands. One structured line per /api request rides
// the same tower.
app.use('/api', requestLog());

// THE LOCKED DOOR (owner's directive, July 2026): every pouring room asks
// the patron's name before anything else — identity, not money, answered
// 401 before the innkeeper ever reads a ledger. The standing page
// (/api/toll), whoami, health, the courier, and the static halls stay open
// to the nameless; a keyless fork has no door and this line is a
// pass-through (the eval's table is untouched).
app.use(
  ['/api/dm', '/api/retell', '/api/paint', '/api/speak', '/api/music', '/api/sfx', '/api/quest-audio', '/api/bind-pdf', '/api/warden'],
  namedOnly(),
);

// THE WARDEN'S EYES (Directive VI, Phase 13): the key that paints can also
// see. Two lawful images and the locked brief go in; the verdict's words
// come out for the engine to parse and rule on. The floor answers honestly
// when the house has no eyes — keyless, a barred artisan, or a judge that
// stumbles all return floor:true, and the client attests the pass as
// unjudged. A real verdict is debited under the artisan's own daily
// ceiling — the image ceiling counts the warden's calls.
const WARDEN_IMAGE = /^data:image\/(?:png|jpe?g|webp|svg\+xml);base64,([A-Za-z0-9+/=]+)$/;
app.post('/api/warden', rateLimit(Number(process.env.RATE_LIMIT_MEDIA_MAX || 30)), abuseCaps('warden'), async (req, res) => {
  const { brief = '', anchor = '', render = '' } = req.body || {};
  const anchorMatch = WARDEN_IMAGE.exec(String(anchor));
  const renderMatch = WARDEN_IMAGE.exec(String(render));
  if (!anchorMatch || !renderMatch || typeof brief !== 'string' || brief.length > 4000) {
    return res.status(400).json({ error: 'The warden judges exactly two lawful images beside one brief.' });
  }
  const eyes = adapters().paint;
  if (typeof eyes.see !== 'function' || eyes.name === 'mock' || !(await spendAllowed(eyes.name))) {
    return res.json({ floor: true });
  }
  try {
    const part = (match) => ({ mime: match[0].slice(5, match[0].indexOf(';')), data: match[1] });
    const verdict = await eyes.see({ brief, anchor: part(anchorMatch), render: part(renderMatch) });
    debit(req, 'warden', verdict.provider);
    return res.json({ text: verdict.text, provider: verdict.provider, model: verdict.model });
  } catch (error) {
    console.error(`[warden] the judge stumbled: ${String(error?.message || error).slice(0, 200)}`);
    return res.json({ floor: true });
  }
});

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(self)');
  next();
});

// The uptime surface: fast, honest, 200 while the table itself lives. A
// mislaid ledger is reported (`ledger:false`), never fatal — the tale does
// not die of it, so the monitor should not page as if it had.
// THE SHARED SKY — the house publishes the season feed; every world may
// see the same comet and read it by its own covenant. The file is the
// feed; the engine's fixture seasons stand when the house has not
// written one (or wrote one the parser refuses).
let seasonsCache = { at: 0, body: null };
app.get('/api/seasons', async (_req, res) => {
  try {
    if (!seasonsCache.body || Date.now() - seasonsCache.at > 60_000) {
      const { readFile } = await import('node:fs/promises');
      const { fileURLToPath } = await import('node:url');
      const pathMod = await import('node:path');
      const here = pathMod.dirname(fileURLToPath(import.meta.url));
      const list = JSON.parse(await readFile(pathMod.join(here, 'seasons', 'seasons.json'), 'utf8'));
      seasonsCache = { at: Date.now(), body: Array.isArray(list) && list.length ? list : null };
    }
  } catch { seasonsCache = { at: Date.now(), body: null }; }
  if (seasonsCache.body) return res.json(seasonsCache.body);
  const { FIXTURE_SEASONS } = await import('fatescript/sky');
  return res.json(FIXTURE_SEASONS);
});

app.get('/api/health', async (_req, res) => {
  const a = adapters();
  res.json({
    ok: true,
    node: process.version,
    door: doorOpen(),
    ledger: await ledgerHealthy(),
    watch: await watchReport(),
    providers: Object.fromEntries(['paint','speak','music','sfx'].map((kind) => [kind, { provider: a[kind].name, ...a[kind].capabilities }]))
  });
});

// THE OWNER'S BELL-PULL: re-test the chalked webhook on demand, no restart.
// Shared admin token (ADMIN_TOKEN) guards it; without one the room does not
// exist, so keyless/unconfigured forks are unchanged. A modest burst limit
// keeps the token from being guessed at speed.
app.post('/api/herald/test', rateLimit(10), ownersBell());

// A DM turn spends Anthropic (or its OpenAI understudy). Each artisan is
// judged against its OWN daily ceiling: a spent Anthropic day degrades to
// OpenAI, a spent OpenAI day leaves Anthropic alone, and only when every
// real voice is spent does the mock floor tell the turn — degraded, never
// dark, and a barred provider is never called.
async function dmBarred() {
  return { anthropic: !(await spendAllowed('anthropic')), openai: !(await spendAllowed('openai')) };
}

app.post('/api/dm', rateLimit(Number(process.env.RATE_LIMIT_DM_MAX || 20)), abuseCaps('dm'), innkeeper('dm'), async (req, res) => {
  const barred = await dmBarred();
  // Real streaming: narration text is forwarded to the player as it
  // forms inside the tool call; the validated turn arrives last.
  if (req.query.stream === '1') {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    let closed = false;
    // res 'close' fires on client disconnect; req 'close' fires as soon
    // as the request body finishes in modern Node, which is not abort.
    res.on('close', () => { closed = true; });
    const result = await getDmTurn(req.body || {}, {
      barred,
      onNarration: (text) => { if (!closed) res.write(`event: narration\ndata: ${JSON.stringify({ text })}\n\n`); },
      // The stage goes dark before a repair: outlaw prose already streamed
      // is retracted so the player never reads an unlawful telling.
      onRetract: () => { if (!closed) res.write('event: retract\ndata: {}\n\n'); }
    });
    if (!closed) { res.write(`event: turn\ndata: ${JSON.stringify(result)}\n\n`); res.end(); }
    // A turn told by a real voice is one line in the ledger of use;
    // stand-ins are never billed (debit itself keeps that law).
    debit(req, 'dm', result.provider);
    recordSpend(result.provider === 'anthropic' || result.provider === 'openai' ? result.provider : null);
    return;
  }
  const result = await getDmTurn(req.body || {}, { barred });
  debit(req, 'dm', result.provider);
  recordSpend(result.provider === 'anthropic' || result.provider === 'openai' ? result.provider : null);
  res.json(result);
});

// THE CHRONICLER — the second, smaller harness (§7): one forced tool call,
// the shared strict validator, one guided repair, and an honest keyless
// decline (the client binds the raw sealed text; mock prose is never sealed).
app.post('/api/retell', rateLimit(Number(process.env.RATE_LIMIT_DM_MAX || 20)), abuseCaps('retell'), innkeeper('retell'), async (req, res) => {
  const { getChroniclePassage } = await import('./retell.js');
  const result = await getChroniclePassage(req.body || {});
  // A decline is not a retelling — only a passage spoken by a real voice
  // is debited (`provider: 'exhausted'` declines carry no passage).
  if (!result.declined) { debit(req, 'retell', result.provider); recordSpend(result.provider === 'anthropic' ? result.provider : null); }
  res.json(result);
});

async function sendAsset(res, result) {
  res.setHeader('Content-Type', result.mime);
  res.setHeader('X-Media-Provider', result.provider);
  res.setHeader('X-Media-Model', result.model);
  res.setHeader('X-Asset-SHA256', createHash('sha256').update(result.bytes).digest('hex'));
  res.send(result.bytes);
}

for (const kind of ['paint','speak','music','sfx']) {
  app.post(`/api/${kind}`, rateLimit(Number(process.env.RATE_LIMIT_MEDIA_MAX || 30)), abuseCaps(kind), innkeeper(kind), async (req, res) => {
    try {
      const result = await runChain(kind, req.body || {});
      // Debit when real work was PRODUCED (our cost is already spent even if
      // the courier drops the parcel); the mock floor is never billed.
      debit(req, kind, result.provider);
      await sendAsset(res, result);
    }
    catch (error) { console.error(error); await sendAsset(res, await adapters().mock[kind](req.body || {})); }
  });
}

// THE PODCAST FORGE — sequence voices, gaps, and stings into one MP3 episode.
// THE SOUND LAW holds at this boundary: the old music BED IS RETIRED (a bed
// request is refused by name), mock provenance is refused at the door, and the
// plan is re-judged here — the graph the sequencer builds is one concat chain
// that cannot overlap two sounds. Chapter markers and cover art ride along.
function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    proc.stderr.on('data', (chunk) => { err += chunk.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${err.slice(-600)}`))));
  });
}

app.post('/api/quest-audio', rateLimit(Number(process.env.RATE_LIMIT_MEDIA_MAX || 30)), innkeeper('podcast'), async (req, res) => {
  const { segments = [], stings = [], plan = null, cover = null, bed = null, title = 'chronicle' } = req.body || {};
  if (bed) return res.status(400).json({ error: 'The bed is retired. Music is punctuation between voices — never underneath them.' });
  if (!Array.isArray(segments) || !segments.length) return res.status(400).json({ error: 'The forge needs voices. A keyless table keeps the book.' });
  if ([...segments, ...(Array.isArray(stings) ? stings : [])].some((clip) => clip?.provider === 'mock')) {
    return res.status(422).json({ error: 'The forge binds real voices only — placeholder audio is refused at the door.' });
  }
  const { assertLawfulPlan } = await import('../src/lib/podcast.js');
  const { LAWFUL_REF, buildSequencerArgs, buildChapterMetadata, probeDurationMs } = await import('./sequencer.js');

  // The forge's measure — hard caps before any work is done. A plan is an
  // episode, not a denial of service: bounded clips, bounded items, bounded
  // breath. (The body cap and rate limit stand watch outside this door.)
  const stingList = Array.isArray(stings) ? stings : [];
  const planItems = Array.isArray(plan?.items) ? plan.items : [];
  const planChapters = Array.isArray(plan?.chapters) ? plan.chapters : [];
  if (segments.length > 200 || stingList.length > 8) return res.status(400).json({ error: 'The forge refuses a payload that large.' });
  if (planItems.length > 400 || planChapters.length > 40) return res.status(400).json({ error: 'The forge refuses a plan that large.' });
  if (planItems.filter((item) => item?.type === 'voice' || item?.type === 'sting').length > 250) return res.status(400).json({ error: 'The forge refuses a plan that large.' });
  if (planItems.some((item) => item?.type === 'gap' && !(Number(item.ms) > 0 && Number(item.ms) <= 15000))) return res.status(400).json({ error: 'A gap must breathe — longer than nothing, shorter than fifteen seconds.' });

  // THE REF LAW — refs become file names in the binder's room, so they pass
  // one strict gate: lowercase letter first, then letters/digits/hyphens, no
  // duplicates. Nothing a ref can say will ever climb out of the temp dir.
  const clips = [
    ...segments.map((clip, i) => ({ ...clip, ref: clip?.ref || `v${i}` })),
    ...stingList.map((clip, i) => ({ ...clip, ref: clip?.ref || `s${i}` }))
  ];
  const seenRefs = new Set();
  for (const clip of clips) {
    if (!LAWFUL_REF.test(clip.ref) || seenRefs.has(clip.ref)) {
      return res.status(400).json({ error: 'Unlawful or duplicate clip ref — the binder\'s room has one strict door.' });
    }
    seenRefs.add(clip.ref);
  }

  const dir = await mkdtemp(join(tmpdir(), 'quest-audio-'));
  try {
    const files = {};
    for (const clip of clips) {
      const ext = String(clip.mime || '').includes('wav') ? 'wav' : 'mp3';
      const file = join(dir, `${clip.ref}.${ext}`);
      await writeFile(file, Buffer.from(String(clip.audio || ''), 'base64'));
      files[clip.ref] = file;
    }

    // Legacy callers send a bare voice list — synthesize the lawful sequence
    // (a breath before the first word, breathing gaps between voices).
    let items = planItems;
    let chapters = planChapters;
    if (!items.length) {
      items = [];
      segments.forEach((segment, i) => {
        items.push({ type: 'gap', ms: i ? 650 : 400 });
        items.push({ type: 'voice', ref: segment?.ref || `v${i}` });
      });
      chapters = [];
    }
    // The plan is re-judged at this door, whoever built it — and it may only
    // cite clips that actually walked in with it.
    const lawful = assertLawfulPlan({ items });
    if (!lawful.ok) return res.status(400).json({ error: `Unlawful sequence: ${lawful.errors[0]}` });
    for (const item of items) {
      if (item.type !== 'gap' && !files[item.ref]) return res.status(400).json({ error: 'The plan cites a clip that never arrived.' });
    }

    // Cover art through the strict door only: plain base64 png/jpeg data URI.
    let coverFile = null;
    const coverMatch = typeof cover === 'string' && /^data:image\/(?:png|jpe?g);base64,([A-Za-z0-9+/=]+)$/.exec(cover);
    if (coverMatch) { coverFile = join(dir, 'cover.img'); await writeFile(coverFile, Buffer.from(coverMatch[1], 'base64')); }

    // Chapter markers need true durations; markers are garnish — a failed
    // probe skips the markers, never the episode.
    let metaFile = null;
    if (chapters.length) {
      try {
        const durations = [];
        for (const item of items) durations.push(item.type === 'gap' ? Math.max(1, item.ms | 0) : await probeDurationMs(files[item.ref]));
        metaFile = join(dir, 'chapters.txt');
        await writeFile(metaFile, buildChapterMetadata(chapters, durations));
      } catch { metaFile = null; }
    }

    const out = join(dir, 'episode.mp3');
    const { args } = buildSequencerArgs({ items, files, out, coverFile, metaFile });
    await runFfmpeg(args);

    const data = await readFile(out);
    const slug = String(title).replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'chronicle';
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.podcast.mp3"`);
    res.send(data);
    // One bound episode, one line — house work, billed as 'house'.
    debit(req, 'podcast', 'house');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'The episode could not be sequenced.' });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// The binder's press: prefer an explicitly named Chromium, then the system
// one (the Nix-installed browser on PATH included), then Playwright's own
// download. Resolved once — the press does not move mid-night.
let chromiumPath;
function chromiumExecutable() {
  if (chromiumPath !== undefined) return chromiumPath;
  chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : null);
  if (!chromiumPath) {
    for (const dir of String(process.env.PATH || '').split(':')) {
      if (dir && (existsSync(join(dir, 'chromium')) || existsSync(join(dir, 'chromium-browser')))) {
        chromiumPath = join(dir, existsSync(join(dir, 'chromium')) ? 'chromium' : 'chromium-browser');
        break;
      }
    }
  }
  return chromiumPath;
}

app.post('/api/bind-pdf', rateLimit(Number(process.env.RATE_LIMIT_MEDIA_MAX || 30)), innkeeper('pdf'), async (req, res) => {
  if (typeof req.body !== 'string' || !req.body.includes('<!doctype html')) return res.status(400).json({ error: 'Expected a self-contained HTML book.' });
  if (/\b(?:src|href)=["']https?:/i.test(req.body)) return res.status(400).json({ error: 'External URLs are forbidden in bound books.' });
  let browser;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true, ...(chromiumExecutable() ? { executablePath: chromiumExecutable() } : {}) });
    const page = await browser.newPage();
    await page.route('**/*', (route) => route.request().url().startsWith('data:') ? route.continue() : route.abort());
    await page.setContent(req.body, { waitUntil: 'load', timeout: 60000 });
    const pdf = await page.pdf({ format: 'Letter', printBackground: true, preferCSSPageSize: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="mydungeon.storybook.pdf"');
    res.send(pdf);
    // One bound book, one line — house work, billed as 'house'.
    debit(req, 'pdf', 'house');
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: 'PDF binding requires the Playwright Chromium browser. Run: npx playwright install chromium' });
  } finally { await browser?.close(); }
});

// THE STORE DOWRY (Directive III, Phase 7 groundwork): the Digital Asset
// Links statement that lets a trusted Android wrap own this domain. It is
// env-chalked — with no signing fingerprint set, the door answers an honest
// empty list, which verifies nothing and breaks nothing. Several
// fingerprints may ride comma-separated (Play's app-signing key beside an
// upload key).
app.get('/.well-known/assetlinks.json', (_req, res) => {
  res.json(assetlinksFor(process.env));
});

const dist = join(root, 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h' }));
  app.use((_req, res) => res.sendFile(join(dist, 'index.html')));
}

app.listen(port, '0.0.0.0', () => {
  console.log(`MyDungeon.Quest listening on 0.0.0.0:${port}`);
  // THE MINT stands up after the table is serving (migrations, managed
  // webhook, backfill — none of it blocks a turn). A mint with no door is a
  // folly: billing needs names, so without Clerk the gateway stays dormant.
  if (doorOpen()) initMint();
  else if (mintConfigured()) console.error('[toll] a mint with no door is a folly — open the door (sign-in keys) or the gateway stays dormant.');
  // THE HERALD's self-check: when a webhook is chalked, one test ping rides
  // out at boot so the owner learns a mislaid URL now, not during an
  // incident. Opt-out with HERALD_BOOT_PING=0; the outcome lands on
  // /api/health as watch.herald. Unconfigured forks stay mute, unchanged.
  if (process.env.ALERT_WEBHOOK_URL && process.env.HERALD_BOOT_PING !== '0') {
    testHerald().then((status) => logLine(status === 'sent' ? 'info' : 'error', 'herald_boot_ping', { status }));
  }
});
