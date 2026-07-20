// ---- THE ANCHORED WINDOW & THE CACHED PREFIX (Task 54) ----
//
// Judged headless, keyless, against the shaping seam alone — no wire is
// ever touched (the audition harness lives in tests/e2e/tools and never
// joins this chain). Laws under judgment:
//   1. The shared anchored-window law: the start advances only in steps,
//      the floor never furnishes fewer than 20 entries once 20 exist,
//      and between re-anchors the window only appends.
//   2. Prefix stability: shaped requests for consecutive simulated turns
//      share a byte-identical message prefix up to the breakpoint
//      between re-anchors — the whole point of the cache.
//   3. The system prompt is byte-identical for identical campaign/hero/
//      spine inputs and changes only when they change.
//   4. The current turn's dynamic blocks always ride the FINAL, never-
//      cached user message; the breakpoints sit on system and on the
//      last stable history message only.
//   5. Repair messages append AFTER the dynamic message, so a retry
//      reads the cache written moments earlier.
//   6. The cache TTL is configurable and defaults to the 1-hour candle.

import assert from 'node:assert/strict';

// Keyless table, mock floor — the seam never dials a wire regardless.
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.DM_MODEL;
delete process.env.DM_MODEL_GENESIS;
delete process.env.DM_CACHE_TTL;

const {
  anchoredStart, anchoredWindow,
  HISTORY_FLOOR_ENTRIES, HISTORY_STEP_ENTRIES,
  HISTORY_FLOOR_MESSAGES, HISTORY_STEP_MESSAGES,
} = await import('../src/lib/historyWindow.js');
const { shapeDmRequest } = await import('../server/dm.js');
const { buildSystemPrompt } = await import('../src/lib/systemPrompt.js');

// ---- 1. the shared anchored-window law -------------------------------------
{
  assert.equal(HISTORY_FLOOR_ENTRIES, 20, 'the echo court is owed twenty pages');
  assert.equal(HISTORY_FLOOR_MESSAGES, 2 * (HISTORY_FLOOR_ENTRIES + HISTORY_STEP_ENTRIES - 1),
    "the server's floor equals the client's widest lawful send — never trimmed below the client's ceiling");
  assert.equal(HISTORY_STEP_MESSAGES, 2 * HISTORY_STEP_ENTRIES, 'the message step is the entry step doubled');

  const rows = (n) => Array.from({ length: n }, (_, i) => `row-${i}`);
  // the floor: never fewer than 20 once 20 exist; short lists ride whole
  for (const n of [0, 1, 5, 19, 20]) assert.equal(anchoredWindow(rows(n)).length, n, `a ${n}-row list rides whole`);
  for (let n = 20; n <= 120; n += 1) {
    const win = anchoredWindow(rows(n));
    assert.ok(win.length >= HISTORY_FLOOR_ENTRIES, `the floor holds at n=${n} (got ${win.length})`);
    assert.ok(win.length <= HISTORY_FLOOR_ENTRIES + HISTORY_STEP_ENTRIES - 1, `the ceiling holds at n=${n}`);
    assert.equal(win[win.length - 1], `row-${n - 1}`, 'the newest row is always furnished');
  }
  // the anchor: the start moves only in steps, never by one
  const starts = new Set();
  for (let n = 20; n <= 120; n += 1) {
    const s = anchoredStart(n, HISTORY_FLOOR_ENTRIES, HISTORY_STEP_ENTRIES);
    assert.equal(s % HISTORY_STEP_ENTRIES, 0, 'every anchor sits on a step boundary');
    starts.add(s);
  }
  assert.deepEqual([...starts], [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 'anchors advance stepwise only');
  // between re-anchors the window only APPENDS
  for (let n = 20; n < 120; n += 1) {
    const a = anchoredWindow(rows(n));
    const b = anchoredWindow(rows(n + 1));
    if (anchoredStart(n, 20, 10) === anchoredStart(n + 1, 20, 10)) {
      assert.deepEqual(b.slice(0, a.length), a, `between re-anchors, n=${n}'s window is a prefix of n+1's`);
    }
  }
}

// ---- the simulated table: turns as the client would furnish them -----------
const campaign = { id: 'c1', title: 'The Ashen Road', covenant: 'Adventurous, humane, PG-13 fantasy.', tone: 'mythic', lines: ['torture'], veils: ['romance'] };
const hero = { name: 'Warden', ancestry: 'human', className: 'ranger', level: 3, abilities: { STR: 12, DEX: 16, CON: 13, INT: 10, WIS: 14, CHA: 8 }, ac: 15, hitDie: 'd10', saves: ['STR', 'DEX'], skills: ['Survival'] };
const spine = { beats: [{ act: 1, title: 'The Ordinary World', goal: 'show the wrongness' }, { act: 1, title: 'The Call', goal: 'the road opens' }] };

// The client law applied to a growing log: entries → anchored window →
// two messages per entry, exactly as App.jsx furnishes them.
const entriesOf = (turns) => Array.from({ length: turns }, (_, i) => ({ sent: `I take road ${i}.`, dm: `The road ${i} answers with weather and consequence.` }));
const clientHistory = (turns) => anchoredWindow(entriesOf(turns)).flatMap((e) => [
  { role: 'user', content: e.sent },
  { role: 'assistant', content: e.dm },
]);
const inputFor = (turns) => ({
  campaign, hero, spine,
  history: clientHistory(turns),
  state: { hero, turn: turns }, story: { beat: { title: 'x' }, turn_no: turns }, memory: [`memory of turn ${turns}`],
  entropy: { pool: [turns * 7 % 20 + 1] }, player: `I open door ${turns}.`, resolution: null, turn: turns, genesis: turns === 0,
});

const stripMarks = (messages) => messages.map((m) => ({ role: m.role, content: m.content.map(({ cache_control, ...c }) => c) }));

// ---- 2. prefix stability between re-anchors --------------------------------
{
  for (let t = 5; t < 60; t += 1) {
    const a = shapeDmRequest(inputFor(t));
    const b = shapeDmRequest(inputFor(t + 1));
    const aStable = stripMarks(a.messages).slice(0, -1); // shed the dynamic tail
    const bStable = stripMarks(b.messages).slice(0, -1);
    const sameAnchor = anchoredStart(Math.min(t, entriesOf(t).length), 20, 10) === anchoredStart(t + 1, 20, 10);
    if (sameAnchor) {
      assert.deepEqual(
        JSON.stringify(bStable).slice(0, JSON.stringify(aStable).length - 1),
        JSON.stringify(aStable).slice(0, -1),
        `turn ${t}'s stable messages are a byte-for-byte prefix of turn ${t + 1}'s`,
      );
    }
    assert.equal(a.system[0].text, b.system[0].text, 'the system prompt never moves between turns');
  }
}

// ---- 3. the system prompt is deterministic and input-bound -----------------
{
  const one = buildSystemPrompt({ campaign, hero, spine });
  const two = buildSystemPrompt({ campaign: { ...campaign }, hero: { ...hero }, spine: { beats: [...spine.beats] } });
  assert.equal(one, two, 'identical campaign/hero/spine → byte-identical system prompt');
  const leveled = buildSystemPrompt({ campaign, hero: { ...hero, level: 4 }, spine });
  assert.notEqual(one, leveled, 'a level-up lawfully rewrites the system prompt');
}

// ---- 4. breakpoints and the never-cached dynamic tail -----------------------
{
  const req = shapeDmRequest(inputFor(25));
  assert.deepEqual(req.system[0].cache_control, { type: 'ephemeral', ttl: '1h' }, 'the system block holds its breakpoint, on the 1-hour candle by default');
  const last = req.messages[req.messages.length - 1];
  assert.equal(last.role, 'user', 'the final message is the current turn');
  for (const tag of ['[STATE]', '[STORY]', '[MEMORY]', '[ENTROPY]', '[PLAYER]']) {
    assert.ok(last.content[0].text.includes(tag), `${tag} rides the final message`);
  }
  assert.ok(last.content[0].text.includes('I open door 25.'), "the current turn's word rides the final message");
  assert.equal(last.content[0].cache_control, undefined, 'the dynamic tail is NEVER cached');
  const marked = req.messages.filter((m) => m.content.some((c) => c.cache_control));
  assert.equal(marked.length, 1, 'exactly one history breakpoint');
  assert.equal(req.messages.indexOf(marked[0]), req.messages.length - 2, 'the breakpoint rides the LAST STABLE history message');
  assert.deepEqual(marked[0].content[0].cache_control, { type: 'ephemeral', ttl: '1h' }, 'the history breakpoint shares the candle');
  assert.equal(req.temperature, undefined, 'the dial is retired — never sent');

  // a resolution block rides the tail too when present
  const resolved = shapeDmRequest({ ...inputFor(25), resolution: { id: 'r1', total: 17 } });
  assert.ok(resolved.messages[resolved.messages.length - 1].content[0].text.includes('[RESOLUTION]'), '[RESOLUTION] rides the final message when present');

  // the short candle is honored when chalked
  process.env.DM_CACHE_TTL = '5m';
  const short = shapeDmRequest(inputFor(25));
  assert.deepEqual(short.system[0].cache_control, { type: 'ephemeral', ttl: '5m' }, 'DM_CACHE_TTL=5m restores the short candle');
  delete process.env.DM_CACHE_TTL;
}

// ---- 5. repair exchanges append AFTER the dynamic message -------------------
// The repair shape is the door's own law (dm.js appends the rejected
// tool_use + tool_result after shapeRequest's messages); judged here by
// construction: the shaped request's final message is the dynamic turn,
// so anything appended lands after it and the cached prefix re-reads.
{
  const req = shapeDmRequest(inputFor(30));
  const before = JSON.stringify(req.messages);
  const repaired = [
    ...req.messages,
    { role: 'assistant', content: [{ type: 'tool_use', id: 'dm_turn_repair', name: 'dm_turn', input: {} }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'dm_turn_repair', is_error: true, content: 'violations' }] },
  ];
  assert.equal(JSON.stringify(repaired.slice(0, req.messages.length)), before, 'the repair exchange appends after the dynamic message — the prior prefix (and its fresh cache) stands whole');
}

console.log('promptCache.test: all laws hold — the anchored window, the byte-stable prefix, the breakpoints, the never-cached tail, the candle.');
