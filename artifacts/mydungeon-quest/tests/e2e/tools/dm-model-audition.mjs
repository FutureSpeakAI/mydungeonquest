// ------------------------------------------------------------
// THE DM MODEL AUDITION (Task 54 §5) — probe before verdict, out of
// band, logged. NEVER part of the keyless eval chain.
//
// Replays four representative briefings — genesis/Session Zero, an
// ordinary mid-story turn, a combat start, a crowded-cast turn —
// through the REAL Anthropic door (the exact shaped request the DM
// would send, via the exported shaping seam) and the exported turn
// court (judgeTurn), for a candidate list drawn from the live models
// endpoint. Measures first-pass validity, post-repair validity,
// fallback rate, latency, token usage, and cache-aware cost per turn.
// Never sends `temperature` (the family retired the dial).
//
// Exit 0 with a JSON verdict; exit 1 if the key is missing (a missing
// key is a hard stop, never a silent skip).
// ------------------------------------------------------------

const key = process.env.ANTHROPIC_API_KEY;
if (!key) {
  console.error('AUDITION FAILED — ANTHROPIC_API_KEY must be present; a missing key is a hard stop.');
  process.exit(1);
}

const { shapeDmRequest, judgeTurn: rawJudge } = await import('../../../server/dm.js');
// A malformed turn (narration_blocks not an array, etc.) must CONVICT,
// never crash the probe — the court itself assumes lawful shapes.
const judgeTurn = (turn, input) => {
  try { return rawJudge(turn, input); }
  catch (error) { return { ok: false, errors: [`court threw: ${String(error?.message || error).slice(0, 120)}`] }; }
};
const { makeEntropy } = await import('fatescript/protocol');
const { createHero } = await import('fatescript/rules');

// USD per MTok (input, output, cacheWrite, cacheRead) — mirror of the
// watchtower's display rates, cache-aware.
const rateFor = (m) => (/haiku/i.test(m) ? { i: 1, o: 5, w: 1.25, r: 0.1 }
  : /opus/i.test(m) ? { i: 15, o: 75, w: 18.75, r: 1.5 }
    : { i: 3, o: 15, w: 3.75, r: 0.3 });

// ---- the four briefings -----------------------------------------------------
const campaign = { title: 'The Ashen Road', covenant: 'Adventurous, humane, PG-13 fantasy.', tone: 'mythic', lines: ['torture'], veils: ['romance'], homeRegion: 'Larkspur Vale' };
const hero = createHero({ name: 'Warden' });
const spine = { label: 'The Ashen Road', beats: [
  { act: 1, title: 'The Ordinary World', goal: 'show one small wrongness in Larkspur Vale' },
  { act: 1, title: 'The Call', goal: 'the road opens and cannot be refused' },
  { act: 2, title: 'The Revelation', goal: 'the design is named' },
  { act: 3, title: 'The Reckoning', goal: 'the design is broken or kept' },
] };
const hist = (rows) => rows.flatMap(([u, a]) => [{ role: 'user', content: u }, { role: 'assistant', content: a }]);
const baseStory = { beat: { index: 1, title: 'The Call' }, regions: [{ name: 'Larkspur Vale' }], cast: [
  { name: 'Maren', role: 'mother', status: 'active' },
  { name: 'The Pale Factor', role: 'villain', status: 'active' },
], threads_state: [], trove_state: [], purse_state: [], scene_state: { region: 'Larkspur Vale' }, scene_ground: 'Larkspur Vale' };

const briefings = [
  {
    shape: 'genesis',
    input: { campaign, hero, spine, history: [], state: { hero }, story: { beat: spine.beats[0], regions: [] }, memory: [],
      entropy: makeEntropy(() => 0.42), player: 'Begin my tale.', resolution: null, turn: 0, genesis: true },
  },
  {
    shape: 'mid-story',
    input: { campaign, hero, spine, history: hist([
      ['I walk the vale road at dusk.', 'The vale road narrows under blackthorn; somewhere behind the hedges a dog will not stop barking. Maren waits at the gate with a lamp she has not lit.'],
      ['I ask Maren what troubles her.', '"The well went sour on Thursday," she says, not looking at you. "Thursday, and the factor came Friday." She finally lights the lamp.'],
    ]), state: { hero }, story: baseStory, memory: ['The well went sour before the factor came.'],
      entropy: makeEntropy(() => 0.6), player: 'I draw water from the sour well and smell it.', resolution: null, turn: 7, genesis: false },
  },
  {
    shape: 'combat-start',
    input: { campaign, hero, spine, history: hist([
      ['I follow the drag-marks off the road.', 'The marks end at a culvert mouth. Three shapes uncoil from it — wet hide, too many joints. The nearest hisses.'],
    ]), state: { hero, combat: null }, story: { ...baseStory, bestiary_state: [{ species: 'Culvert Howler', visual: 'wet grey hide, backward joints, lampless eyes', nature: 'pack ambusher', threat: 2 }] },
      memory: [], entropy: makeEntropy(() => 0.3), player: 'I draw my blade and stand my ground.', resolution: null, turn: 9, genesis: false },
  },
  {
    shape: 'crowded-cast',
    input: { campaign, hero, spine, history: hist([
      ['I enter the moot hall.', 'The moot hall is full past the rafters. Maren keeps to the door. Reeve Aldous holds the floor, and the factor\'s clerk Osric writes everything down.'],
    ]), state: { hero }, story: { ...baseStory, cast: [
      ...baseStory.cast,
      { name: 'Reeve Aldous', role: 'reeve', status: 'active' },
      { name: 'Osric', role: 'clerk', status: 'active' },
      { name: 'Widow Tamsin', role: 'petitioner', status: 'active' },
    ] }, memory: ['Osric writes everything down.'],
      entropy: makeEntropy(() => 0.8), player: 'I stand and speak against the factor before the whole moot.', resolution: null, turn: 12, genesis: false },
  },
];

// ---- candidates from the live models endpoint --------------------------------
const headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
const live = await fetch('https://api.anthropic.com/v1/models?limit=100', { headers }).then((r) => r.json());
const liveIds = (live.data || []).map((m) => m.id);
const candidates = [...new Set([
  'claude-sonnet-4-6', // baseline
  'claude-haiku-4-5',
  // any current cheaper/newer sonnet/haiku ids the live shelf offers
  ...liveIds.filter((id) => /haiku|sonnet/i.test(id) && !/claude-3/.test(id)),
])].filter((id) => liveIds.includes(id) || ['claude-sonnet-4-6', 'claude-haiku-4-5'].includes(id))
  .filter((id) => !process.env.AUDITION_MODELS || process.env.AUDITION_MODELS.split(',').includes(id))
  .slice(0, 6);
console.error(`live shelf: ${liveIds.join(', ')}`);
console.error(`auditioning: ${candidates.join(', ')}`);

// A wire that stalls past the deadline is a FALLBACK TURN in production
// (the player would be staring at a spinner) — the probe counts it as one
// rather than hanging the whole audition on a single dead socket.
const CALL_DEADLINE_MS = Number(process.env.AUDITION_DEADLINE_MS || 120000);
async function call(request) {
  const t0 = Date.now();
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { ...headers, 'anthropic-beta': 'extended-cache-ttl-2025-04-11' }, body: JSON.stringify(request),
      signal: AbortSignal.timeout(CALL_DEADLINE_MS),
    });
    const ms = Date.now() - t0;
    if (!res.ok) return { error: `${res.status}: ${(await res.text()).slice(0, 200)}`, ms };
    const json = await res.json();
    return { ms, usage: json.usage || {}, turn: json.content?.find((c) => c.type === 'tool_use' && c.name === 'dm_turn')?.input };
  } catch (error) {
    return { error: `deadline/${String(error?.name || error).slice(0, 60)}`, ms: Date.now() - t0 };
  }
}

const results = [];
for (const model of candidates) {
  for (const { shape, input } of briefings) {
    const request = { ...shapeDmRequest(input), model };
    delete request.temperature; // never send the retired dial
    const row = { model, shape, firstPassValid: false, postRepairValid: false, fallback: false, latencyMs: 0, usd: 0, tokens: {} };
    const first = await call(request);
    row.latencyMs = first.ms;
    const bill = (u, m) => { const r = rateFor(m); return ((u.input_tokens || 0) * r.i + (u.output_tokens || 0) * r.o + (u.cache_creation_input_tokens || 0) * r.w + (u.cache_read_input_tokens || 0) * r.r) / 1e6; };
    if (first.error || !first.turn) {
      row.error = first.error || 'no dm_turn tool_use';
      row.fallback = true;
    } else {
      row.usd += bill(first.usage, model);
      row.tokens = first.usage;
      const court = judgeTurn(first.turn, input);
      row.firstPassValid = court.ok;
      row.postRepairValid = court.ok;
      if (!court.ok) {
        row.firstPassErrors = court.errors.slice(0, 4);
        const repair = { ...request, messages: [
          ...request.messages,
          { role: 'assistant', content: [{ type: 'tool_use', id: 'dm_turn_repair', name: 'dm_turn', input: first.turn }] },
          { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'dm_turn_repair', is_error: true, content: `The rules client REJECTED that dm_turn. Every field is still required; keep everything that was correct and fix ONLY these violations, then resend the complete corrected dm_turn:\n- ${court.errors.join('\n- ')}` }] },
        ] };
        const second = await call(repair);
        row.latencyMs += second.ms;
        if (second.error || !second.turn) { row.fallback = true; row.repairError = second.error || 'no dm_turn tool_use'; }
        else {
          row.usd += bill(second.usage, model);
          const recourt = judgeTurn(second.turn, input);
          row.postRepairValid = recourt.ok;
          row.fallback = !recourt.ok;
          if (!recourt.ok) row.repairErrors = recourt.errors.slice(0, 4);
        }
      }
    }
    row.usd = Math.round(row.usd * 1e6) / 1e6;
    results.push(row);
    // Rows land incrementally (JSONL) so a killed run still leaves evidence.
    if (process.env.AUDITION_OUT) (await import('node:fs')).appendFileSync(process.env.AUDITION_OUT, JSON.stringify(row) + '\n');
    console.error(`${model} ${shape}: first=${row.firstPassValid} repaired=${row.postRepairValid} fallback=${row.fallback} ${row.latencyMs}ms ${row.usd}${row.error ? ` [${row.error}]` : ''}`);
  }
}

const byModel = {};
for (const r of results) {
  const m = byModel[r.model] || (byModel[r.model] = { turns: 0, firstPass: 0, postRepair: 0, fallbacks: 0, latencyMs: 0, usd: 0 });
  m.turns += 1; m.firstPass += r.firstPassValid ? 1 : 0; m.postRepair += r.postRepairValid ? 1 : 0;
  m.fallbacks += r.fallback ? 1 : 0; m.latencyMs += r.latencyMs; m.usd += r.usd;
}
for (const m of Object.values(byModel)) { m.meanLatencyMs = Math.round(m.latencyMs / m.turns); m.meanUsdPerTurn = Math.round((m.usd / m.turns) * 1e6) / 1e6; delete m.latencyMs; m.usd = Math.round(m.usd * 1e6) / 1e6; }

console.log(JSON.stringify({ auditionedAt: new Date().toISOString(), candidates, summary: byModel, turns: results }, null, 2));
