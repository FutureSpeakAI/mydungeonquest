import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

// ------------------------------------------------------------
// THE KEYED HOUSE (Directive XII §VII.3) — ONE seat that raises a live
// court's own server. The rig's app server stays keyless as ever; a
// live court (G25 THE WONDER COURT, G26 THE RETURN COURT) raises THIS
// house on its own port and puts it out when it rests.
//
// The keyed fork, forced: ANTHROPIC present (a missing key is a HARD
// STOP — a named refusal, never a skip), every other provider and the
// door keys stripped, DM_PROVIDER cleared so the server's own key-led
// choice seats anthropic. Paint and voice fall away so the courts
// weigh narration, not ornament. The door is then PREFLIGHTED by its
// own name: one sealed genesis ask must answer 'anthropic' — a live
// court seated on any other tier would judge a lie.
//
// Both live specs import this seat (the mirrors-one-seat law): the
// raising, the preflight, and the dousing are written once.
// ------------------------------------------------------------

export interface KeyedServer {
  base: string;
  provider: string;
  close(): Promise<void>;
}

export async function raiseKeyedServer({ port, apiPort, court }: { port: number; apiPort: number; court: string }): Promise<KeyedServer> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(`${court} REFUSED — ANTHROPIC_API_KEY is not present. The live courts run on live keys only; a missing key is a hard stop, never a mock walk and never a skip.`);
  }

  // Free the court's own ports if a dead run left them held. These are
  // the live courts' ports, never the rig's (5199/5198) and never the
  // preview's.
  spawnSync('bash', ['-c', `fuser -k ${port}/tcp ${apiPort}/tcp 2>/dev/null; true`]);
  await delay(500);

  const env: Record<string, string | undefined> = {
    ...process.env,
    PORT: String(port),
    INTERNAL_API_PORT: String(apiPort),
    NODE_ENV: 'development',
    // Generous valves: a court pours several genesis turns in one
    // sitting; the abuse limits are meant for strangers, not the rig.
    RATE_LIMIT_DM_MAX: '500',
    RATE_LIMIT_MEDIA_MAX: '500',
  };
  for (const key of [
    'DM_PROVIDER', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY',
    'ELEVENLABS_API_KEY', 'CLERK_SECRET_KEY', 'VITE_CLERK_PUBLISHABLE_KEY', 'CLERK_PUBLISHABLE_KEY',
    'PAINT_PROVIDER', 'SPEAK_PROVIDER', 'MUSIC_PROVIDER', 'SFX_PROVIDER',
  ]) delete env[key];

  const child: ChildProcess = spawn('node', ['scripts/dev.mjs'], { env: env as NodeJS.ProcessEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  child.stdout?.on('data', (b) => { log += b; });
  child.stderr?.on('data', (b) => { log += b; });

  const base = `http://127.0.0.1:${port}`;
  const douse = async () => {
    child.kill('SIGTERM');
    await delay(2000);
    try { if (child.pid) { process.kill(child.pid, 0); child.kill('SIGKILL'); } } catch { /* already out */ }
  };

  // Wait for vite AND the api door behind its proxy.
  let up = false;
  for (let i = 0; i < 120 && !up; i++) {
    await delay(500);
    try {
      const pageAnswer = await fetch(base + '/');
      const apiAnswer = await fetch(base + '/api/seasons');
      up = pageAnswer.ok && apiAnswer.ok;
    } catch { /* not yet */ }
  }
  if (!up) {
    await douse();
    throw new Error(`${court} FAILED — the keyed house never opened its doors on :${port}.\n--- server log tail ---\n${log.slice(-2000)}`);
  }

  // Preflight: the door must be LIVE anthropic — proven by the door
  // itself, not inferred. A sealed genesis ask names its provider and
  // doubles as the warmup that pays the cold-path costs before round 1.
  // THE LADDER (59.3's lesson): right after a sibling court's pour burst
  // the provider may throttle ONE ask and the door honestly degrades —
  // a single ask is a bad witness of "this house can seat anthropic."
  // Three asks, a cool-down apart; the court refuses only when every
  // ask seats another tier, and the refusal carries the door's own log.
  const { makeEntropy } = await import('fatescript/protocol');
  const { createHero } = await import('fatescript/rules');
  const askOnce = async (): Promise<string | null> => {
    const response = await fetch(base + '/api/dm?stream=1', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign: { title: `${court} Preflight`, homeRegion: 'Larkspur Vale' },
        hero: createHero({ name: 'Warden of the Clock' }),
        story: { beat: { title: 'The Ordinary Flame' }, regions: [] },
        state: {}, memory: [], history: [],
        entropy: makeEntropy(), player: 'Begin.', resolution: null, turn: 0, genesis: true,
      }),
    });
    if (!response.ok) throw new Error(`the preflight ask answered ${response.status}`);
    const reader = (response.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let buffer = '', eventName = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return null;
      buffer += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim(); buffer = buffer.slice(nl + 1);
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:') && eventName === 'turn') {
          return JSON.parse(line.slice(5))?.provider || null;
        }
      }
    }
  };
  let provider: string | null = null;
  let lastFault = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      provider = await askOnce();
      lastFault = '';
    } catch (error: any) {
      lastFault = String(error?.message || error);
      provider = null;
    }
    if (provider === 'anthropic') break;
    if (attempt < 3) await delay(30_000);
  }
  if (provider !== 'anthropic') {
    await douse();
    throw new Error(`${court} REFUSED — after three asks a cool-down apart the door last seated '${provider ?? 'no turn at all'}', never a live anthropic sitting. A live court judged on any other tier is a lie.${lastFault ? `\nlast transport fault: ${lastFault}` : ''}\n--- server log tail ---\n${log.slice(-2000)}`);
  }

  return { base, provider, close: douse };
}
