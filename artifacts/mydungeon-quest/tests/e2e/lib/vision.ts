import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// ------------------------------------------------------------
// THE VISION JUDGE (Task 52 §3). Direct POST to Anthropic with the
// letter-mandated model; temperature 0; strict JSON; one retry on
// malformed output; disk cache keyed by sha256(image bytes)+question id
// (a cache hit never calls the API); every verdict and its images kept
// as evidence named by criterion id. `critique` is an alias of `judge`.
// ------------------------------------------------------------

export const GAME_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const VISION_DIR = path.join(GAME_ROOT, 'test-results', 'vision');
const CACHE_DIR = path.join(VISION_DIR, 'cache');
const EVIDENCE_DIR = path.join(VISION_DIR, 'evidence');
const STATS_FILE = path.join(VISION_DIR, 'judge-stats.ndjson');
const YELLOW_FILE = path.join(GAME_ROOT, 'test-results', 'yellow.ndjson');

const MODEL = 'claude-sonnet-4-6';

for (const dir of [CACHE_DIR, EVIDENCE_DIR]) fs.mkdirSync(dir, { recursive: true });

function sniffMime(bytes: Buffer): string {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes.length > 12 && bytes.slice(0, 4).toString('ascii') === 'RIFF' && bytes.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  const head = bytes.slice(0, 256).toString('utf8').trimStart();
  if (head.startsWith('<') || head.includes('<svg')) {
    // The mock adapter paints SVG. If an SVG reaches the judge, live paint
    // silently downgraded somewhere — that is a hard environment failure,
    // never a judgeable image (Task 52 §0.5: no silent downgrades).
    throw new Error('vision.judge received an SVG image — live paint has silently downgraded to the mock adapter');
  }
  throw new Error(`vision.judge received bytes with an unknown image signature (${bytes.slice(0, 4).toString('hex')})`);
}

function appendLine(file: string, record: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(record)}\n`);
}

/** Yellow-flag ledger (Section 7): assertions passing within 10% of their
 * threshold and vision verdicts with confidence under 0.8. */
export function noteNear(label: string, value: number, threshold: number, kind: 'min' | 'max' = 'min') {
  const margin = Math.abs(threshold) * 0.1;
  const near = kind === 'min' ? value >= threshold && value <= threshold + margin
    : value <= threshold && value >= threshold - margin;
  if (near) appendLine(YELLOW_FILE, { label, value, threshold, kind, at: Date.now() });
}
export function noteLowConfidence(label: string, confidence: number) {
  if (typeof confidence === 'number' && confidence < 0.8) {
    appendLine(YELLOW_FILE, { label, confidence, note: 'vision confidence under 0.8', at: Date.now() });
  }
}

function extractJson(text: string): any {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error(`no JSON object in judge reply: ${trimmed.slice(0, 200)}`);
  return JSON.parse(trimmed.slice(start, end + 1));
}

async function callAnthropic(images: Buffer[], question: string, schema: object, strict: boolean): Promise<any> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is missing from the test process — the vision judge cannot sit (Task 52 §0.5)');
  const content: any[] = images.map((bytes) => ({
    type: 'image',
    source: { type: 'base64', media_type: sniffMime(bytes), data: bytes.toString('base64') },
  }));
  content.push({
    type: 'text',
    text: `${question}\n\nAnswer ONLY with a single JSON object matching this schema (no prose, no markdown):\n${JSON.stringify(schema)}${strict ? '\n\nYour previous answer was not valid JSON. Emit exactly one JSON object and nothing else.' : ''}`,
  });
  // (TASK 54 logged test edit) Transport backoff at the shared judge door:
  // four workers now sit courts in parallel, so rate-limit and overload
  // answers (429/5xx/529) get three retries with growing backoff before
  // the loud failure. Assertions are untouched — only transport patience.
  let response: Response | null = null;
  let failureNote = '';
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 400,
          temperature: 0,
          system: 'You are a strict visual judge for an automated test suite. You answer ONLY with a single JSON object matching the schema you are given. Never include prose, preambles, or markdown fences.',
          messages: [{ role: 'user', content }],
        }),
      });
    } catch (error: any) {
      response = null;
      failureNote = `network failure calling the judge (model ${MODEL}): ${error?.message || error}`;
    }
    if (response?.ok) break;
    if (response) {
      const retryable = [429, 500, 502, 503, 504, 529].includes(response.status);
      failureNote = `Anthropic ${response.status} for model ${MODEL}: ${(await response.text()).slice(0, 300)}`;
      if (!retryable) break;
      response = null; // body consumed — never reuse a spent response
    }
    if (attempt < 4) await new Promise((tick) => setTimeout(tick, attempt * 2_000));
  }
  if (!response?.ok) {
    throw new Error(failureNote || `the judge door never answered (model ${MODEL})`);
  }
  const data: any = await response.json();
  const text = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n');
  return extractJson(text);
}

export interface JudgeArgs {
  /** Stable question id — cache key ingredient. Same images + same id = cached. */
  id: string;
  /** Criterion id (g09a, g16b, sabotage-1…) — names the evidence folder. */
  criterion: string;
  images: Buffer[];
  question: string;
  schema: object;
  /** (TASK 54B §4) Question-protocol version — a cache-key ingredient.
   * Amending a question's text bumps its protocol: ONE lawful re-judge of
   * the affected plates; unchanged questions replay their sealed verdicts
   * (reported as REPLAY in the run log). Default 'p1' = pre-54B texts. */
  protocol?: string;
}

/** Schema-typed coercion at the transport seam: models sometimes hand back
 * "true"/"false" or numeric strings inside otherwise-valid JSON. Coerce ONLY
 * exact lexical matches toward the schema-declared type — a "false" becomes
 * false (still a refusal), junk stays junk, and no threshold or criterion
 * moves. Applied to fresh AND cached verdicts so a poisoned cache heals. */
function coerceBySchema(verdict: any, schema: any): any {
  if (!verdict || typeof verdict !== 'object' || !schema || typeof schema !== 'object') return verdict;
  const out: any = { ...verdict };
  for (const [key, kind] of Object.entries(schema)) {
    const value = out[key];
    if (typeof kind === 'string' && kind.startsWith('boolean')) {
      if (value === 'true') out[key] = true;
      else if (value === 'false') out[key] = false;
    } else if (typeof kind === 'string' && kind.startsWith('number')) {
      if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) out[key] = Number(value);
    }
  }
  return out;
}

export async function judge({ id, criterion, images, question, schema, protocol = 'p1' }: JudgeArgs): Promise<any> {
  if (!images.length) throw new Error(`judge(${id}) called with no images`);
  images.forEach(sniffMime); // SVG/mock tripwire fires even on cache hits
  const cacheKey = createHash('sha256')
    .update(Buffer.concat(images)).update('\u0000').update(id)
    .update('\u0000').update(protocol)
    .digest('hex');
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
  const evidenceDir = path.join(EVIDENCE_DIR, criterion, id.replace(/[^a-zA-Z0-9_-]+/g, '_'));
  fs.mkdirSync(evidenceDir, { recursive: true });
  images.forEach((bytes, index) => {
    const ext = sniffMime(bytes).split('/')[1].replace('jpeg', 'jpg');
    const file = path.join(evidenceDir, `image-${index + 1}.${ext}`);
    if (!fs.existsSync(file)) fs.writeFileSync(file, bytes);
  });

  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    // (54B §4) A replayed verdict says so in the run log — never mistaken
    // for a fresh look.
    console.log(`[judge] REPLAY ${criterion}/${id}@${protocol}`);
    appendLine(STATS_FILE, { id, criterion, protocol, hit: true, at: Date.now() });
    fs.writeFileSync(path.join(evidenceDir, 'verdict.json'), JSON.stringify({ question, verdict: cached.verdict, cached: true }, null, 2));
    return coerceBySchema(cached.verdict, schema);
  }

  let verdict: any;
  try {
    verdict = await callAnthropic(images, question, schema, false);
  } catch (error: any) {
    if (/no JSON object|Unexpected token|JSON/.test(String(error?.message))) {
      verdict = await callAnthropic(images, question, schema, true); // one retry on malformed JSON, then fail
    } else throw error;
  }
  verdict = coerceBySchema(verdict, schema);
  fs.writeFileSync(cachePath, JSON.stringify({ id, criterion, question, verdict, at: Date.now() }, null, 2));
  fs.writeFileSync(path.join(evidenceDir, 'verdict.json'), JSON.stringify({ question, verdict, cached: false }, null, 2));
  console.log(`[judge] FRESH ${criterion}/${id}@${protocol}`);
  appendLine(STATS_FILE, { id, criterion, protocol, hit: false, at: Date.now() });
  if (typeof verdict?.confidence === 'number') noteLowConfidence(`${criterion}/${id}`, verdict.confidence);
  return verdict;
}

/** Presentation-critique alias — same judge, same cache, same evidence store. */
export const critique = judge;

/** 64-bin per-channel RGB histograms; normalized L1 distance in [0,1]
 * (mean over channels of the total-variation distance). */
export async function histogramDelta(a: Buffer, b: Buffer): Promise<number> {
  async function hist(bytes: Buffer): Promise<number[][]> {
    const { data, info } = await sharp(bytes).removeAlpha().resize(256, 256, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
    const bins: number[][] = [new Array(64).fill(0), new Array(64).fill(0), new Array(64).fill(0)];
    for (let i = 0; i < data.length; i += info.channels) {
      for (let c = 0; c < 3; c += 1) bins[c][data[i + c] >> 2] += 1;
    }
    const total = 256 * 256;
    return bins.map((channel) => channel.map((count) => count / total));
  }
  const [ha, hb] = await Promise.all([hist(a), hist(b)]);
  let delta = 0;
  for (let c = 0; c < 3; c += 1) {
    let channelDelta = 0;
    for (let bin = 0; bin < 64; bin += 1) channelDelta += Math.abs(ha[c][bin] - hb[c][bin]);
    delta += channelDelta / 2; // total variation per channel ∈ [0,1]
  }
  return delta / 3;
}

/** Preflight probe: proves the mandated model answers before any criterion runs. */
export async function probeJudge(): Promise<void> {
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: { r: 128, g: 128, b: 128 } } }).png().toBuffer();
  const verdict = await judge({
    id: 'preflight-probe', criterion: 'g00',
    images: [png],
    question: 'This is a connectivity probe. Report the dominant color of this image.',
    schema: { color: 'string' },
  });
  if (typeof verdict?.color !== 'string') throw new Error('vision judge probe returned no color field');
}

/** Section 7 accounting: total calls vs cache hits across the whole run set. */
export function judgeStats(): { calls: number; apiCalls: number; hits: number; hitRate: number } {
  if (!fs.existsSync(STATS_FILE)) return { calls: 0, apiCalls: 0, hits: 0, hitRate: 0 };
  const lines = fs.readFileSync(STATS_FILE, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const hits = lines.filter((line) => line.hit).length;
  return { calls: lines.length, apiCalls: lines.length - hits, hits, hitRate: lines.length ? hits / lines.length : 0 };
}
