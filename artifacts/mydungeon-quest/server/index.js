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
// A whole-quest audiobook ships every turn's narration as base64 in one body,
// which can exceed the default limit; give this route its own headroom BEFORE
// the global parser so the smaller limit doesn't reject a long chronicle.
app.use('/api/quest-audio', express.json({ limit: process.env.MAX_AUDIO_BYTES || '200mb' }));
app.use(express.json({ limit: maxBody }));
app.use(express.text({ type: 'text/html', limit: process.env.MAX_PDF_HTML_BYTES || '100mb' }));

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
      onNarration: (text) => { if (!closed) res.write(`event: narration\ndata: ${JSON.stringify({ text })}\n\n`); }
    });
    if (!closed) { res.write(`event: turn\ndata: ${JSON.stringify(result)}\n\n`); res.end(); }
    return;
  }
  res.json(await getDmTurn(req.body || {}));
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

// THE BOUND AUDIOBOOK — mix an ordered set of narration segments into one MP3,
// ducking an optional looped music bed underneath. Segments arrive base64 (they
// live on the player's device); ffmpeg normalizes each to a common format before
// concat so mixed mock-WAV + real-MP3 clips stitch cleanly.
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
  const { segments = [], bed = null, title = 'chronicle' } = req.body || {};
  if (!Array.isArray(segments) || !segments.length) return res.status(400).json({ error: 'No narration segments were provided.' });
  const dir = await mkdtemp(join(tmpdir(), 'quest-audio-'));
  try {
    const inputs = [];
    for (let i = 0; i < segments.length; i += 1) {
      const ext = String(segments[i].mime || '').includes('wav') ? 'wav' : 'mp3';
      const file = join(dir, `seg${i}.${ext}`);
      await writeFile(file, Buffer.from(String(segments[i].audio || ''), 'base64'));
      inputs.push(file);
    }
    let bedFile = null;
    if (bed?.audio) {
      const ext = String(bed.mime || '').includes('wav') ? 'wav' : 'mp3';
      bedFile = join(dir, `bed.${ext}`);
      await writeFile(bedFile, Buffer.from(String(bed.audio), 'base64'));
    }

    const out = join(dir, 'chronicle.mp3');
    const args = ['-y'];
    for (const file of inputs) args.push('-i', file);
    if (bedFile) args.push('-stream_loop', '-1', '-i', bedFile);

    const norm = 'aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo';
    const prep = inputs.map((_, i) => `[${i}:a]${norm}[a${i}]`).join(';');
    const chain = inputs.map((_, i) => `[a${i}]`).join('');
    let filter = `${prep};${chain}concat=n=${inputs.length}:v=0:a=1[voice]`;
    let mapLabel = '[voice]';
    if (bedFile) {
      filter += `;[${inputs.length}:a]${norm},volume=0.16[bed];[voice][bed]amix=inputs=2:duration=first:dropout_transition=0[mix]`;
      mapLabel = '[mix]';
    }
    args.push('-filter_complex', filter, '-map', mapLabel, '-ac', '2', '-ar', '44100', '-b:a', '160k', out);
    await runFfmpeg(args);

    const data = await readFile(out);
    const slug = String(title).replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'chronicle';
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.quest.mp3"`);
    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'The chronicle audio could not be mixed.' });
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
