import express from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDmTurn } from './dm.js';
import { adapters } from './adapters/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const app = express();
const port = Number(process.env.PORT || 3001);
const maxBody = process.env.MAX_REQUEST_BYTES || '25mb'; // references ride as base64
app.disable('x-powered-by');
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
  res.json({ ok: true, node: process.version, providers: Object.fromEntries(['paint','video','speak','music','sfx'].map((kind) => [kind, { provider: a[kind].name, ...a[kind].capabilities }])) });
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
    try { await sendAsset(res, await adapters()[kind][kind](req.body || {})); }
    catch (error) { console.error(error); await sendAsset(res, await adapters().mock[kind](req.body || {})); }
  });
}

const videoJobs = new Map();
app.post('/api/video', rateLimit(Number(process.env.RATE_LIMIT_MEDIA_MAX || 30)), async (req, res) => {
  const id = randomUUID();
  videoJobs.set(id, { status: 'queued', created: Date.now(), body: req.body || {} });
  queueMicrotask(async () => {
    const job = videoJobs.get(id);
    try { job.result = await adapters().video.video(job.body); job.status = 'ready'; }
    catch (error) { job.result = await adapters().mock.video(job.body); job.status = 'ready'; job.degraded = true; }
  });
  res.status(202).json({ id, status: 'queued' });
});
app.get('/api/video/:id', (req, res) => {
  const job = videoJobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Unknown job' });
  res.json({ id: req.params.id, status: job.status, degraded: Boolean(job.degraded), mime: job.result?.mime || null });
});
app.get('/api/video/:id/asset', async (req, res) => {
  const job = videoJobs.get(req.params.id);
  if (!job || job.status !== 'ready') return res.status(409).json({ error: 'Asset not ready' });
  await sendAsset(res, job.result);
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
