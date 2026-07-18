// ------------------------------------------------------------
// THE CURTAIN TRADE'S SCALE (Task 58, Directive XI §1.3).
//
// Measures first-word latency at the /api/dm door itself, mock tier,
// keyless — the same door the client pours through, without client
// render costs. Two timestamps per round:
//   firstWordMs — request dispatch → the first word a player may see.
//                 BEFORE the curtain this was the first `narration`
//                 SSE byte (pre-seal streamed prose, retractable);
//                 AFTER the curtain it IS the sealed arrival, by law.
//   sealedMs    — request dispatch → the `turn` SSE event
//                 (the validated, sealed turn).
// The AFTER semantics are now in force: the door may speak heartbeat
// comments while the room deliberates, but a `narration` event at this
// door is a curtain breach and the scale throws on it.
// The BEFORE medians were taken on the prior bytes and stand in the
// directive's ledger; the G5 bound is re-pinned on the AFTER sequencing.
//
// Fail-closed: any non-mock provider, refused turn, missing narration,
// leaked pre-seal event, or unparseable sitting throws — a scale that
// guesses is no scale.
// ------------------------------------------------------------
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { makeEntropy } from 'fatescript/protocol';
import { createHero } from 'fatescript/rules';

const PORT = Number(process.env.MEASURE_PORT || 5397);
const ROUNDS = Number(process.env.MEASURE_ROUNDS || 15);
const BASE = `http://127.0.0.1:${PORT}`;

// The keyless fork, forced: no provider keys, mock sovereign, doorless.
const childEnv = { ...process.env, PORT: String(PORT), DM_PROVIDER: 'mock' };
for (const key of [
  'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY',
  'ELEVENLABS_API_KEY', 'CLERK_SECRET_KEY', 'VITE_CLERK_PUBLISHABLE_KEY', 'CLERK_PUBLISHABLE_KEY',
]) delete childEnv[key];

const server = spawn('node', ['server/index.js'], { env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = '';
server.stdout.on('data', (b) => { serverLog += b; });
server.stderr.on('data', (b) => { serverLog += b; });
const die = (msg) => { server.kill('SIGTERM'); console.error(msg); console.error('--- server log tail ---\n' + serverLog.slice(-2000)); process.exit(1); };

// Wait for the door to open.
let up = false;
for (let i = 0; i < 60 && !up; i++) {
  await delay(250);
  try { await fetch(`${BASE}/api/seasons`); up = true; } catch { /* not yet */ }
}
if (!up) die('MEASURE-FAILED — the server never opened its door.');

function genesisPayload(round) {
  return {
    campaign: { title: `Measure Trial ${round}`, homeRegion: 'Larkspur Vale' },
    hero: createHero({ name: 'Measurer' }),
    story: { beat: { title: 'The Ordinary Flame' }, regions: [] },
    state: {}, memory: [], history: [],
    entropy: makeEntropy(), player: 'Begin.', resolution: null, turn: 0, genesis: true,
  };
}

async function measureRound(round) {
  const t0 = performance.now();
  const response = await fetch(`${BASE}/api/dm?stream=1`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(genesisPayload(round)),
  });
  if (!response.ok) throw new Error(`round ${round}: door answered ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', eventName = '', firstWordMs = null, sealedMs = null, turn = null, provider = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim(); buffer = buffer.slice(nl + 1);
      if (line.startsWith('event:')) eventName = line.slice(6).trim();
      else if (line.startsWith('data:')) {
        const data = JSON.parse(line.slice(5));
        if (eventName === 'narration') {
          throw new Error(`round ${round}: a pre-seal narration event leaked past the curtain — the door must speak only sealed turns`);
        } else if (eventName === 'turn') {
          sealedMs = performance.now() - t0;
          firstWordMs = sealedMs; // after the curtain, the first word IS the sealed arrival
          turn = data.turn; provider = data.provider;
        }
      }
    }
  }
  if (sealedMs === null || !turn) throw new Error(`round ${round}: the stream ended before the sealed turn`);
  if (provider !== 'mock') throw new Error(`round ${round}: provider was '${provider}' — the scale weighs the mock tier ONLY`);
  if (!Array.isArray(turn.narration_blocks) || !turn.narration_blocks.length) throw new Error(`round ${round}: sealed turn carries no narration`);
  return { firstWordMs, sealedMs };
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

try {
  const rounds = [];
  for (let i = 1; i <= ROUNDS; i++) rounds.push(await measureRound(i));
  const result = {
    rounds: ROUNDS,
    firstWordMedianMs: Math.round(median(rounds.map((r) => r.firstWordMs))),
    sealedTurnMedianMs: Math.round(median(rounds.map((r) => r.sealedMs))),
    firstWordMaxMs: Math.round(Math.max(...rounds.map((r) => r.firstWordMs))),
    sealedTurnMaxMs: Math.round(Math.max(...rounds.map((r) => r.sealedMs))),
    tier: 'mock-keyless',
  };
  console.log('MEASURE ' + JSON.stringify(result));
  server.kill('SIGTERM');
  process.exit(0);
} catch (error) {
  die(`MEASURE-FAILED — ${error?.message || error}`);
}
