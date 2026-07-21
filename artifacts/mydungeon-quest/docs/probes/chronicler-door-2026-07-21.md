# PROBE — the chronicler door × the newer storyteller family

**Date:** 2026-07-21 · **Occasion:** Directive XIX, THE SEATED STORYTELLER
ITEM (queue item #55, recorded at 1.2.0's close) · **Law:** probe-before-cure;
a bench must never be recalibrated over a known-sick voice.

## The accusation

Queue item #55 believed a latent `temperature` case sat in the
retellings/episodes door of the game server: newer Anthropic families
reject any request carrying the dial (HTTP 400), and the provider
chain's silent degrade would eat the error — patrons served fallback
output with nothing in any log.

## The bytes (static sweep)

- `git log -S 'temperature' -- server/retell.js` → **empty**: the
  chronicler's seat has never carried the dial in its history.
- Unfiltered `grep -rn "temperature" server/` → the only live request
  parameters are the **OpenAI understudies'** lawful zeros (room.js
  director + editor understudy seats; that family still honors the
  dial). The smith's `temperature: null` lines are honest-null
  **attestation fields in responses**, never request parameters. The
  room's two Anthropic seats carry the "no temperature — the family
  retired the dial" law in their own comments (cured at the July 18
  sitting, before this item was recorded).

## The probe (live, keyed, out-of-band — three seats)

Mirrors `server/retell.js` `anthropicPassage` **parameter shape**
exactly — `model`, `max_tokens`, `messages` (one user text block),
forced `tools`/`tool_choice`, **no temperature** — with `max_tokens`
reduced 1200 → 16 (generation size, not door shape) and a stand-in
tool schema of the same structural class (the door judges parameters,
not schema content).

| Seat | Body | Verdict |
| --- | --- | --- |
| A | lawful shape × `claude-sonnet-5` (the newer family) | **HTTP 200**, `stop_reason=max_tokens` |
| B | lawful shape × `claude-sonnet-4-6` (elder control) | **HTTP 200**, `stop_reason=max_tokens` |
| C | the OLD defect planted: `temperature: 0` × `claude-sonnet-5` | **HTTP 400** — `` `temperature` is deprecated for this model`` |

Seat C is the Control Law's tooth: the probe demonstrates it WOULD
catch the regression before its greens are believed.

## Verdict

**NO LIVE DEFECT.** The named case does not stand in today's bytes and
the door stands open to the newer family. The honest-trace demand
already holds — the chronicler's provider chain logs each fallen voice
by name (`[retell] anthropic failed: …`) and its exhausted envelope
carries the last error's words. The remaining ask in #55 (a keyless
request-shape pin) is that item's own scope should the house accept it;
under Directive XIX a cure is owed only for a live defect. Stage
Three's prose-court recalibration may lawfully seat.

## Probe script

Preserved verbatim below; runs with `ANTHROPIC_API_KEY` in the
environment and prints one line per seat plus the verdict.

```js
const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.log('NO KEY — probe cannot sit'); process.exit(2); }
const schema = { type: 'object', additionalProperties: false, required: ['passage'], properties: { passage: { type: 'string', maxLength: 200 } } };
async function seat(label, model, extra = {}) {
  const body = { model, max_tokens: 16,
    messages: [{ role: 'user', content: [{ type: 'text', text: 'Probe: one word.' }] }],
    tools: [{ name: 'chronicle_passage', description: 'The only valid Chronicler response.', input_schema: schema }],
    tool_choice: { type: 'tool', name: 'chronicle_passage' }, ...extra };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(body) });
  const text = await r.text();
  let note = '';
  if (!r.ok) { try { note = JSON.parse(text)?.error?.message?.slice(0, 120) || ''; } catch { note = text.slice(0, 120); } }
  else { try { const j = JSON.parse(text); note = `stop_reason=${j.stop_reason}`; } catch {} }
  console.log(`[${label}] model=${model} extra=${JSON.stringify(extra)} → HTTP ${r.status} ${note}`);
  return r.status;
}
const a = await seat('A lawful shape × newer family', 'claude-sonnet-5');
const b = await seat('B lawful shape × elder family (control)', 'claude-sonnet-4-6');
const c = await seat('C planted dial × newer family (control-law tooth)', 'claude-sonnet-5', { temperature: 0 });
const verdict = a === 200 && b === 200 && c === 400 ? 'DOOR STANDS — no live defect; probe teeth proven' : 'ATTENTION — unexpected seat, read above';
console.log('VERDICT:', verdict);
```
