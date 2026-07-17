// ------------------------------------------------------------
// THE OUT-OF-BAND PROBE (TASK 54B §5) — one POST to /api/dm?stream=1
// beside the suite, measuring the SSE transport with no browser, no
// React, and no sampling loop in the way. Evidence ONLY: this script
// never fails a run — G5's split assertion does the deciding. It
// prints one JSON object to stdout:
//   { at, status, contentType, firstByteMs, firstNarrationMs,
//     events, narrationChars, provider, durationMs, error }
// A healthy mock pour shows narration events within ~2s and one final
// turn event; a transport stall shows firstByteMs null — the same
// silence G5 sees, now attributable to the wire, not the page.
// The payload mirrors the table's own genesis pour (App.jsx), sized
// to the mock narrator the proving webserver pins (DM_PROVIDER=mock).
// ------------------------------------------------------------
const BASE = process.env.PROBE_BASE || 'http://localhost:5199';

const hero = { name: 'Probe Hero', presentation: 'feminine', mark: 'a key-shaped burn scar', skills: [], hp: 10, maxHp: 10 };
const payload = {
  campaign: { id: 'c-probe', title: 'The Probe Road', covenant: null, tone: 'classic', lines: [], veils: [], styleBible: '', homeRegion: 'Larkspur Vale' },
  spine: { label: 'probe-spine', beats: [{ title: 'The First Step' }] },
  history: [],
  hero,
  state: { hero, combat: null },
  story: { beat: { title: 'The First Step' }, regions: [], directives: [] },
  memory: {}, entropy: {}, player: 'Begin.', resolution: null, turn: 0, genesis: true,
};

const out = {
  at: new Date().toISOString(), base: BASE, status: null, contentType: null,
  firstByteMs: null, firstNarrationMs: null,
  events: { narration: 0, retract: 0, turn: 0, other: 0 },
  narrationChars: 0, provider: null, durationMs: null, error: null,
};
const t0 = Date.now();
try {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  const response = await fetch(`${BASE}/api/dm?stream=1`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal: controller.signal,
  });
  out.status = response.status;
  out.contentType = response.headers.get('content-type');
  if (!response.body) throw new Error('no response body');
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of response.body) {
    if (out.firstByteMs === null) out.firstByteMs = Date.now() - t0;
    buffer += decoder.decode(chunk, { stream: true });
    let index;
    while ((index = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, index); buffer = buffer.slice(index + 2);
      const eventMatch = frame.match(/^event: (.+)$/m);
      const dataMatch = frame.match(/^data: (.*)$/m);
      const name = eventMatch ? eventMatch[1].trim() : 'message';
      if (name === 'narration') {
        out.events.narration += 1;
        if (out.firstNarrationMs === null) out.firstNarrationMs = Date.now() - t0;
        try {
          const data = JSON.parse(dataMatch?.[1] ?? '""');
          out.narrationChars = String(typeof data === 'string' ? data : data.text ?? '').length;
        } catch { /* length is evidence, not law */ }
      } else if (name === 'retract') out.events.retract += 1;
      else if (name === 'turn') {
        out.events.turn += 1;
        try { out.provider = JSON.parse(dataMatch?.[1] ?? '{}').provider ?? null; } catch { /* evidence only */ }
      } else out.events.other += 1;
    }
  }
  clearTimeout(timer);
} catch (error) {
  out.error = String((error && error.message) || error);
}
out.durationMs = Date.now() - t0;
console.log(JSON.stringify(out, null, 2));
