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
import { doorkeeper, whoami } from './patrons.js';

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
      const call = provider[kind](body);
      const result = provider.name === 'mock' ? await call : await withTimeout(call, budget, `${provider.name} ${kind} timed out after ${budget}ms`);
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
// A whole-quest audiobook ships every turn's narration as base64 in one body,
// which can exceed the default limit; give this route its own headroom BEFORE
// the global parser so the smaller limit doesn't reject a long chronicle.
app.use('/api/quest-audio', express.json({ limit: process.env.MAX_AUDIO_BYTES || '200mb' }));
app.use(express.json({ limit: maxBody }));
app.use(express.text({ type: 'text/html', limit: process.env.MAX_PDF_HTML_BYTES || '100mb' }));

// THE DOORKEEPER stands at /api: patrons are read from the Clerk session and
// inscribed in the ledger as req.patron; guests pass unchallenged, and a
// keyless fork has no door at all. Every route below sees the same law.
app.use('/api', doorkeeper());
app.get('/api/whoami', whoami);

const windows = new Map();
function rateLimit(max) {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const item = windows.get(key) || { start: now, count: 0 };
    if (now - item.start > windowMs) { item.start = now; item.count = 0; }
    item.count += 1; windows.set(key, item);
    if (item.count > max) return res.status(429).json({ error: 'The foundry needs a breath. Try again shortly.' });
    next();
  };
}

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(self)');
  next();
});

app.get('/api/health', (_req, res) => {
  const a = adapters();
  res.json({ ok: true, node: process.version, providers: Object.fromEntries(['paint','speak','music','sfx'].map((kind) => [kind, { provider: a[kind].name, ...a[kind].capabilities }])) });
});

app.post('/api/dm', rateLimit(Number(process.env.RATE_LIMIT_DM_MAX || 20)), async (req, res) => {
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
      onNarration: (text) => { if (!closed) res.write(`event: narration\ndata: ${JSON.stringify({ text })}\n\n`); },
      // The stage goes dark before a repair: outlaw prose already streamed
      // is retracted so the player never reads an unlawful telling.
      onRetract: () => { if (!closed) res.write('event: retract\ndata: {}\n\n'); }
    });
    if (!closed) { res.write(`event: turn\ndata: ${JSON.stringify(result)}\n\n`); res.end(); }
    return;
  }
  res.json(await getDmTurn(req.body || {}));
});

// THE CHRONICLER — the second, smaller harness (§7): one forced tool call,
// the shared strict validator, one guided repair, and an honest keyless
// decline (the client binds the raw sealed text; mock prose is never sealed).
app.post('/api/retell', rateLimit(Number(process.env.RATE_LIMIT_DM_MAX || 20)), async (req, res) => {
  const { getChroniclePassage } = await import('./retell.js');
  res.json(await getChroniclePassage(req.body || {}));
});

async function sendAsset(res, result) {
  res.setHeader('Content-Type', result.mime);
  res.setHeader('X-Media-Provider', result.provider);
  res.setHeader('X-Media-Model', result.model);
  res.setHeader('X-Asset-SHA256', createHash('sha256').update(result.bytes).digest('hex'));
  res.send(result.bytes);
}

for (const kind of ['paint','speak','music','sfx']) {
  app.post(`/api/${kind}`, rateLimit(Number(process.env.RATE_LIMIT_MEDIA_MAX || 30)), async (req, res) => {
    try { await sendAsset(res, await runChain(kind, req.body || {})); }
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

app.post('/api/quest-audio', rateLimit(Number(process.env.RATE_LIMIT_MEDIA_MAX || 30)), async (req, res) => {
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'The episode could not be sequenced.' });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

app.post('/api/bind-pdf', async (req, res) => {
  if (typeof req.body !== 'string' || !req.body.includes('<!doctype html')) return res.status(400).json({ error: 'Expected a self-contained HTML book.' });
  if (/\b(?:src|href)=["']https?:/i.test(req.body)) return res.status(400).json({ error: 'External URLs are forbidden in bound books.' });
  let browser;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {}) });
    const page = await browser.newPage();
    await page.route('**/*', (route) => route.request().url().startsWith('data:') ? route.continue() : route.abort());
    await page.setContent(req.body, { waitUntil: 'load', timeout: 60000 });
    const pdf = await page.pdf({ format: 'Letter', printBackground: true, preferCSSPageSize: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="mydungeon.storybook.pdf"');
    res.send(pdf);
  } catch (error) {
    console.error(error);
    res.status(503).json({ error: 'PDF binding requires the Playwright Chromium browser. Run: npx playwright install chromium' });
  } finally { await browser?.close(); }
});

const dist = join(root, 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h' }));
  app.use((_req, res) => res.sendFile(join(dist, 'index.html')));
}

app.listen(port, '0.0.0.0', () => console.log(`MyDungeon.Quest listening on 0.0.0.0:${port}`));
