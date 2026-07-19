import { spawn, type ChildProcess } from 'node:child_process';
import { GAME_ROOT } from './vision';

// THE COMMONS HOUSE (Directive XV §VI) — a private app server for the
// commons courts: door UNBUILT (Clerk scrubbed → the staging seam may
// stand), every AI provider scrubbed (mock DM, dormant easel — these
// courts seed their plates, they never pour), and the REAL ledger and
// plate shelf kept, because the mirror's whole law is real custody.
// Namespacing is the seam itself: every court names its own staged
// patron, so two houses never share a shelf even on one ledger.
//
// This raiser REFUSES to stand without its ledger — a commons court that
// silently skipped would be a mock door, and the Standing Law forbids it.
// (The keyed houses live in keyedServer.ts with their OWN env contract;
// two raisers, two laws, deliberately not one seat.)

export interface CommonsHouse {
  base: string;
  patron: string;
  douse: () => Promise<void>;
}

const SCRUB = [
  'ANTHROPIC_API_KEY', 'ELEVENLABS_API_KEY',
  'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY',
  'CLERK_SECRET_KEY', 'CLERK_PUBLISHABLE_KEY', 'VITE_CLERK_PUBLISHABLE_KEY',
  'PAINT_PROVIDER', 'SPEAK_PROVIDER', 'MUSIC_PROVIDER', 'SFX_PROVIDER', 'AUDIO_PROVIDER',
];

export async function raiseCommonsHouse({ port, apiPort, court, patron }: { port: number; apiPort: number; court: string; patron: string }): Promise<CommonsHouse> {
  if (!process.env.DATABASE_URL) {
    throw new Error(`${court}: the commons house needs DATABASE_URL — the mirror's law is real custody; there is no mock door and no skip.`);
  }
  if (!process.env.PRIVATE_OBJECT_DIR) {
    throw new Error(`${court}: the commons house needs PRIVATE_OBJECT_DIR — the plate shelf is real or the court does not sit.`);
  }

  const env: Record<string, string | undefined> = { ...process.env };
  for (const key of SCRUB) delete env[key];
  env.DM_PROVIDER = 'mock';
  env.PORT = String(port);
  env.INTERNAL_API_PORT = String(apiPort);
  env.VAULT_STAGE_PATRON = patron;
  env.RATE_LIMIT_MEDIA_MAX = '500';
  env.RATE_LIMIT_DM_MAX = '500';

  const proc: ChildProcess = spawn('node', ['scripts/dev.mjs'], {
    cwd: GAME_ROOT, env: env as NodeJS.ProcessEnv,
    stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  });
  proc.stdout?.on('data', (chunk) => process.stdout.write(`[${court} house] ${chunk}`));
  proc.stderr?.on('data', (chunk) => process.stderr.write(`[${court} house!] ${chunk}`));
  let fell: string | null = null;
  proc.on('exit', (code) => { fell = `the ${court} house fell (exit ${code})`; });

  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 120_000;
  // Ready = the page serves AND the vault answers live (seam + ledger) —
  // a court that started before the seam stood would red on a lie.
  for (;;) {
    if (fell) throw new Error(fell);
    if (Date.now() > deadline) throw new Error(`${court}: the commons house did not stand within 120s`);
    try {
      const front = await fetch(`${base}/`, { signal: AbortSignal.timeout(3_000) });
      if (front.ok) {
        const status = await (await fetch(`${base}/api/vault/status`, { signal: AbortSignal.timeout(3_000) })).json();
        if (status.live === true) break;
      }
    } catch { /* not yet standing */ }
    await new Promise((rest) => setTimeout(rest, 1_000));
  }

  const douse = async () => {
    if (proc.pid && fell === null) {
      try { process.kill(-proc.pid, 'SIGTERM'); } catch { try { proc.kill('SIGTERM'); } catch { /* already down */ } }
      await new Promise<void>((done) => {
        const hardStop = setTimeout(() => { try { if (proc.pid) process.kill(-proc.pid, 'SIGKILL'); } catch { /* gone */ } done(); }, 8_000);
        proc.once('exit', () => { clearTimeout(hardStop); done(); });
      });
    }
  };

  return { base, patron, douse };
}
