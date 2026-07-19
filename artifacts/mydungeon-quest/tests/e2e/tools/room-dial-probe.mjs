// ------------------------------------------------------------
// THE ROOM'S DIAL PROBE (Task 59, Directive XII §VIII.1) — probe
// before cure, out of band, logged.
//
// The room's four sittings still claim `temperature: 0`. The smith
// learned in July 2026 that new Anthropic families 400 any request
// carrying the dial; the room may hold the same latent case. This
// probe asks each sitting's OWN model twice at the live door — once
// with the dial, once bare — and prints both answers, so the cure
// touches exactly the sittings whose family retired the dial and no
// other. Minimal tokens; no secret is ever printed.
//
// Exit 0 with a JSON verdict; exit 1 if a key the probe needs is
// missing (missing keys are a hard stop, never a silent skip).
// ------------------------------------------------------------

const anthropicKey = process.env.ANTHROPIC_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
if (!anthropicKey || !openaiKey) {
  console.error('DIAL-PROBE FAILED — the probe needs ANTHROPIC_API_KEY and OPENAI_API_KEY present; a missing key is a hard stop.');
  process.exit(1);
}

const PROMPT = 'Answer with the one word YES.';

async function askAnthropic(model, withDial) {
  const body = {
    model, max_tokens: 8,
    messages: [{ role: 'user', content: PROMPT }],
    ...(withDial ? { temperature: 0 } : {}),
  };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let note = '';
  if (!res.ok) { try { note = JSON.parse(text)?.error?.message?.slice(0, 160) || ''; } catch { note = text.slice(0, 160); } }
  return { status: res.status, note };
}

async function askOpenai(model, withDial) {
  const body = {
    model, max_tokens: 8,
    messages: [{ role: 'user', content: PROMPT }],
    ...(withDial ? { temperature: 0 } : {}),
  };
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${openaiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let note = '';
  if (!res.ok) { try { note = JSON.parse(text)?.error?.message?.slice(0, 160) || ''; } catch { note = text.slice(0, 160); } }
  return { status: res.status, note };
}

// The four sittings' own models, as room.js seats them (director
// anthropic/openai, editor anthropic/openai), env overrides honored so
// the probe weighs whatever the room would actually call.
const SITTINGS = [
  { sitting: 'director-anthropic', family: 'anthropic', model: process.env.DIRECTOR_MODEL || process.env.DM_MODEL || 'claude-sonnet-4-6' },
  { sitting: 'editor-anthropic', family: 'anthropic', model: process.env.EDITOR_MODEL || 'claude-haiku-4-5' },
  { sitting: 'director-openai', family: 'openai', model: process.env.DIRECTOR_MODEL_OPENAI || process.env.DM_MODEL_OPENAI || 'gpt-4o' },
  { sitting: 'editor-openai', family: 'openai', model: process.env.EDITOR_MODEL_OPENAI || 'gpt-4o-mini' },
];

const probes = [];
for (const { sitting, family, model } of SITTINGS) {
  const ask = family === 'anthropic' ? askAnthropic : askOpenai;
  const withDial = await ask(model, true);
  const bare = await ask(model, false);
  probes.push({
    sitting, model,
    withDial, bare,
    verdict: withDial.status === 200 && bare.status === 200 ? 'DIAL HONORED — keep it'
      : withDial.status !== 200 && bare.status === 200 ? 'DIAL RETIRED — drop it, record honest-null'
        : 'PROBE UNCLEAR — both asks troubled; cure nothing on this evidence',
  });
}

console.log(JSON.stringify({ probes }, null, 2));
