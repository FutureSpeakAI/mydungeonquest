// ------------------------------------------------------------
// THE SECOND CHAIR — Directive XX, Law XI (stage one: the chairs).
//
// The room's smaller seats may sit cheaper minds — but the chairs
// are built long before any verdict moves a default. Keyless and
// without a wire, five courts:
//   1. all three seat envs unset → every chair resolves to exactly
//      today's model, byte-identical to the room as it stands;
//   2. each env seats its own chair and ONLY its chair, while the
//      elder envs (DIRECTOR_MODEL, EDITOR_MODEL, the DM_MODEL
//      cascade) stand beneath, unmoved — and no chair env touches
//      the first telling's primary seat;
//   3. NO combination of the three envs — nor a seat forced into
//      the door's own hands — moves the genesis attempts' model,
//      walked explicitly on both lanes at the shaping seam, with
//      the shape byte-identical apart from the model's name;
//   4. an absent key seats the mock floor regardless of any seat
//      env — a seat env never conjures a key;
//   5. the room ledger attributes every call to its chair with the
//      seated model named, on fixture convenes, deterministically.
// Table-only by nature: the chairs ARE the table's provider seats
// and their envs behind the server door — the engine keeps none.
// Named twinless in BUILD_STATUS: the room is server law.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import { makeEntropy } from 'fatescript/protocol';

// The keyless floor this whole gate measures from: no keys, no
// provider envs, no elder model envs, no chair envs. Swept BEFORE
// the room is imported; restored never — the process is the court's.
const SWEPT = [
  'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'DM_PROVIDER', 'DM_FALLBACK',
  'DM_MODEL', 'DM_MODEL_GENESIS', 'DM_MODEL_OPENAI',
  'DIRECTOR_MODEL', 'DIRECTOR_MODEL_OPENAI',
  'EDITOR_MODEL', 'EDITOR_MODEL_OPENAI',
  'DM_MODEL_DIRECTOR', 'DM_MODEL_EDITOR', 'DM_MODEL_REDRAFT',
];
for (const key of SWEPT) delete process.env[key];

const { chairSeats, convene } = await import('../server/room.js');
const { dmSeats, dmSeatModels, shapeDmRequest, getDmTurn, dmPlan } = await import('../server/dm.js');

// Today's room, spoken once — the byte the unset chairs must answer.
const TODAY = Object.freeze({
  director: { anthropic: 'claude-sonnet-4-6', openai: 'gpt-4o' },
  editor: { anthropic: 'claude-haiku-4-5', openai: 'gpt-4o-mini' },
  redraft: { anthropic: 'claude-sonnet-5', openai: 'gpt-4o' },
});
const GENESIS_TODAY = 'claude-sonnet-5';

// A scoped env walk: seat the pairs, hold court, ALWAYS restore the
// swept floor — no court leaks its costume into the next.
async function withEnv(pairs, fn) {
  for (const [key, value] of Object.entries(pairs)) process.env[key] = value;
  try { return await fn(); } finally { for (const key of Object.keys(pairs)) delete process.env[key]; }
}

// The proven table fixture (the Art Director's own), turn-dialed.
const spine = { label: 'The Clean Walk', beats: [{ title: 'The Ordinary Flame', goal: 'Open the road', act: 1 }] };
const inputAt = (turn, extras = {}) => ({
  campaign: { title: 'Clean Walk', homeRegion: 'Larkspur Vale' },
  hero: { name: 'Wren', skills: ['Investigation'] },
  spine,
  story: { beat: { index: 0, title: 'The Ordinary Flame' }, regions: [{ name: 'Larkspur Vale' }], prior_suggestions: [], ...(extras.story || {}) },
  state: {}, memory: [], history: [],
  player: 'I press on.',
  entropy: makeEntropy(() => 0.42),
  resolution: extras.resolution ?? null,
  turn, genesis: turn === 0
});

// ------------------------------------------------------------
// COURT 1 — unset is today, to the byte. The seat-plan with no
// chair env answers exactly the room as it stands, and the first
// telling's shaped request keeps the primary seat.
// ------------------------------------------------------------
{
  assert.deepEqual(chairSeats(), TODAY, 'three envs unset — every chair is today\u2019s model');
  assert.equal(JSON.stringify(chairSeats()), JSON.stringify(TODAY), 'byte-identical, not merely equal');
  assert.deepEqual(dmSeats(), { anthropic: 'claude-sonnet-5', openai: 'gpt-4o' }, 'the primary door\u2019s two lane seats stand as today');
  assert.equal(shapeDmRequest(inputAt(3)).model, 'claude-sonnet-5', 'the first telling\u2019s shape names the primary seat');
}

// ------------------------------------------------------------
// COURT 2 — each env seats its own chair and ONLY its chair; the
// elder envs stand beneath, unmoved; the primary DM door never
// follows a chair env anywhere.
// ------------------------------------------------------------
{
  const base = chairSeats();

  await withEnv({ DM_MODEL_DIRECTOR: 'claude-haiku-4-5' }, () => {
    const plan = chairSeats();
    assert.equal(plan.director.anthropic, 'claude-haiku-4-5', 'DM_MODEL_DIRECTOR seats the Director');
    assert.deepEqual({ ...plan, director: base.director }, base, 'and moves NOTHING else');
    assert.equal(plan.director.openai, base.director.openai, 'the understudy lane never follows an Anthropic seat');
  });

  await withEnv({ DM_MODEL_EDITOR: 'claude-haiku-4-5-dated' }, () => {
    const plan = chairSeats();
    assert.equal(plan.editor.anthropic, 'claude-haiku-4-5-dated', 'DM_MODEL_EDITOR seats the Editor');
    assert.deepEqual({ ...plan, editor: base.editor }, base, 'and moves NOTHING else');
  });

  await withEnv({ DM_MODEL_REDRAFT: 'claude-haiku-4-5' }, () => {
    const plan = chairSeats();
    assert.equal(plan.redraft.anthropic, 'claude-haiku-4-5', 'DM_MODEL_REDRAFT seats the redraft');
    assert.deepEqual({ ...plan, redraft: base.redraft }, base, 'and moves NOTHING else');
    assert.equal(shapeDmRequest(inputAt(3)).model, 'claude-sonnet-5',
      'the redraft ENV alone moves no request — only a seat passed by the convene does');
  });

  await withEnv({ DM_MODEL_DIRECTOR: 'seat-d', DM_MODEL_EDITOR: 'seat-e', DM_MODEL_REDRAFT: 'seat-r' }, () => {
    const plan = chairSeats();
    assert.equal(plan.director.anthropic, 'seat-d');
    assert.equal(plan.editor.anthropic, 'seat-e');
    assert.equal(plan.redraft.anthropic, 'seat-r');
    assert.equal(shapeDmRequest(inputAt(3)).model, 'claude-sonnet-5',
      'all three chairs seated — the first telling\u2019s primary seat stands untouched');
  });

  // The elder envs stand beneath — honored when the chair env is silent,
  // outranked when the Second Chair speaks.
  await withEnv({ DIRECTOR_MODEL: 'elder-director' }, () => {
    assert.equal(chairSeats().director.anthropic, 'elder-director', 'the elder DIRECTOR_MODEL still rules when the chair env is silent');
  });
  await withEnv({ DIRECTOR_MODEL: 'elder-director', DM_MODEL_DIRECTOR: 'second-chair' }, () => {
    assert.equal(chairSeats().director.anthropic, 'second-chair', 'the Second Chair env outranks the elder');
  });
  await withEnv({ EDITOR_MODEL: 'elder-editor' }, () => {
    assert.equal(chairSeats().editor.anthropic, 'elder-editor', 'the elder EDITOR_MODEL still rules when the chair env is silent');
  });
  await withEnv({ DM_MODEL: 'cascade-x' }, () => {
    const plan = chairSeats();
    assert.equal(plan.director.anthropic, 'cascade-x', 'the DM_MODEL cascade reaches the Director exactly as today');
    assert.equal(plan.redraft.anthropic, 'cascade-x', 'and the redraft, whose default IS the primary seat');
    assert.equal(plan.editor.anthropic, TODAY.editor.anthropic, 'and never the Editor — exactly as today');
  });
}

// ------------------------------------------------------------
// COURT 3 — genesis immunity, walked explicitly. No combination
// of the three envs, and no seat forced into the door's own
// hands, moves the genesis attempts' model on EITHER lane; the
// elder DM_MODEL_GENESIS alone rules Session Zero. And apart from
// the model's name, a seated shape is byte-identical.
// ------------------------------------------------------------
{
  const combos = [
    { DM_MODEL_DIRECTOR: 'cheap-d' },
    { DM_MODEL_EDITOR: 'cheap-e' },
    { DM_MODEL_REDRAFT: 'cheap-r' },
    { DM_MODEL_DIRECTOR: 'cheap-d', DM_MODEL_EDITOR: 'cheap-e' },
    { DM_MODEL_DIRECTOR: 'cheap-d', DM_MODEL_REDRAFT: 'cheap-r' },
    { DM_MODEL_EDITOR: 'cheap-e', DM_MODEL_REDRAFT: 'cheap-r' },
    { DM_MODEL_DIRECTOR: 'cheap-d', DM_MODEL_EDITOR: 'cheap-e', DM_MODEL_REDRAFT: 'cheap-r' },
  ];
  for (const combo of combos) {
    await withEnv(combo, () => {
      const names = Object.keys(combo).join('+');
      assert.equal(shapeDmRequest(inputAt(0)).model, GENESIS_TODAY, `genesis never follows ${names} down`);
      assert.equal(shapeDmRequest(inputAt(0), { anthropic: 'cheap-usurper', openai: 'cheap-o' }).model, GENESIS_TODAY,
        'a seat forced into the door\u2019s hands cannot move genesis either');
      assert.deepEqual(dmSeatModels(inputAt(0), { anthropic: 'cheap-usurper', openai: 'cheap-o' }),
        { anthropic: GENESIS_TODAY, openai: 'gpt-4o' },
        'BOTH lanes hold at genesis — the understudy included');
    });
  }

  // The elder genesis env alone rules Session Zero, chair envs be damned.
  await withEnv({ DM_MODEL_GENESIS: 'genesis-pinned', DM_MODEL_DIRECTOR: 'x', DM_MODEL_EDITOR: 'y', DM_MODEL_REDRAFT: 'z' }, () => {
    assert.equal(shapeDmRequest(inputAt(0)).model, 'genesis-pinned', 'DM_MODEL_GENESIS stands alone over Session Zero');
  });

  // An ORDINARY attempt lawfully takes the seat — the immunity is
  // genesis's, not a dead switch.
  assert.deepEqual(dmSeatModels(inputAt(3), { anthropic: 'cheap-redraft', openai: 'cheap-o' }),
    { anthropic: 'cheap-redraft', openai: 'cheap-o' }, 'the seat lands on ordinary attempts, both lanes');
  assert.deepEqual(dmSeatModels(inputAt(3)), { anthropic: 'claude-sonnet-5', openai: 'gpt-4o' },
    'and an absent seat resolves to the primary seats exactly as today');

  // The seated shape differs by the model's NAME and nothing else —
  // the anchored cache posture stands whole (promptCache witnesses
  // the unseated shape untouched; this court pins the seated one).
  const one = inputAt(6);
  const unseated = shapeDmRequest(one);
  const seated = shapeDmRequest(one, { anthropic: 'cheap-usurper' });
  assert.equal(seated.model, 'cheap-usurper', 'the seat names the model');
  assert.equal(JSON.stringify({ ...seated, model: unseated.model }), JSON.stringify(unseated),
    'and every other byte of the shape is identical — blocks, cache marks, tools, all of it');
}

// ------------------------------------------------------------
// COURT 4 — the mock floor stands regardless of seat envs. A seat
// env never conjures a key: keyless, the plan is the floor alone,
// and the door answers mock BY NAME even with a redraft seat in
// its hands.
// ------------------------------------------------------------
await withEnv({ DM_MODEL_DIRECTOR: 'claude-haiku-4-5', DM_MODEL_EDITOR: 'claude-haiku-4-5', DM_MODEL_REDRAFT: 'claude-haiku-4-5' }, async () => {
  assert.deepEqual(dmPlan(), ['mock'], 'no key, no provider — the plan is the floor alone, seat envs be damned');
  assert.equal(chairSeats().redraft.anthropic, 'claude-haiku-4-5', 'the chair is seated…');
  const door = await getDmTurn(inputAt(2), { seat: chairSeats().redraft });
  assert.equal(door.provider, 'mock', '…but the keyless door still answers mock');
  assert.equal(door.model, 'mock', 'and the floor is NAMED honestly — no seat env conjured a key');
  assert.ok(Array.isArray(door.turn?.narration_blocks) && door.turn.narration_blocks.length >= 1, 'the floor still tells a lawful turn');
});

// ------------------------------------------------------------
// COURT 5 — the ledger names every chair. Fixture convenes, all
// mock: the fresh beat spends Director + first telling; a carried
// intent spends no Director; a sampled turn seats the Editor; a
// planted sameness walks the redraft — and every row carries its
// chair, its provider, and the seated model, deterministically.
// ------------------------------------------------------------
{
  // (a) Fresh beat, unsampled, clean: the Director's floor and the
  // first telling — two rows, in the order the room spent them.
  const clean = await convene(inputAt(2), {});
  assert.equal(clean.provider, 'mock', 'the sitting must be the mock voice — a fallback proves nothing');
  assert.deepEqual(clean.room_ledger.chair_calls, [
    { chair: 'director', provider: 'mock', model: 'mock' },
    { chair: 'dm', provider: 'mock', model: 'mock' },
  ], 'fresh keyless beat: Director then first telling, each named');
  assert.deepEqual(Object.keys(clean.room_ledger.chair_calls[0]).sort(), ['chair', 'model', 'provider'],
    'a chair row carries exactly chair, provider, model');
  assert.equal(clean.room_ledger.director_calls, 1, 'the elder counter walks beside the rows, unmoved');

  // (b) A carried intent spends no Director call — and invents no row.
  const carried = await convene(inputAt(2, { story: { beat_intent: clean.beat_intent } }), {});
  assert.equal(carried.room_ledger.director_calls, 0, 'the cache hit spends nothing');
  assert.deepEqual(carried.room_ledger.chair_calls, [
    { chair: 'dm', provider: 'mock', model: 'mock' },
  ], 'no call, no row — the ledger never invents');

  // (c) The sampled turn seats the Editor; a clean page ships; the
  // redraft chair never sits.
  const sampled = await convene(inputAt(14), {});
  assert.equal(sampled.room_ledger.editor_verdict, 'ship', 'clean sampled page ships');
  assert.deepEqual(sampled.room_ledger.chair_calls, [
    { chair: 'director', provider: 'mock', model: 'mock' },
    { chair: 'dm', provider: 'mock', model: 'mock' },
    { chair: 'editor', provider: 'mock', model: 'mock' },
  ], 'sampled turn: Director, first telling, Editor — and no redraft row on a shipped page');

  // (d) The planted sameness: learn the draft's own roads, hand them
  // back as prior_suggestions, and the Editor must revise — the
  // redraft chair sits, its seat named (mock, keyless, honestly).
  const probe = await convene(inputAt(5), {});
  const roads = probe.turn.suggestions;
  assert.ok(Array.isArray(roads) && roads.length >= 1, 'the probe learned the draft\u2019s roads');
  const planted = await convene(inputAt(5, { story: { prior_suggestions: roads } }), {});
  assert.ok(planted.room_ledger.flags.includes('sameness'), 'the plant tripped the sameness court');
  assert.equal(planted.room_ledger.editor_verdict, 'revise', 'the judged pass demands the redraft');
  assert.equal(planted.room_ledger.revisions, 1, 'one redraft walked');
  assert.deepEqual(planted.room_ledger.chair_calls, [
    { chair: 'director', provider: 'mock', model: 'mock' },
    { chair: 'dm', provider: 'mock', model: 'mock' },
    { chair: 'editor', provider: 'mock', model: 'mock' },
    { chair: 'redraft', provider: 'mock', model: 'mock' },
  ], 'the revise road: Director, first telling, Editor, redraft — every chair named as it was spent');

  // (e) Deterministic to the byte — the same walk twice, one ledger.
  const again = await convene(inputAt(5, { story: { prior_suggestions: roads } }), {});
  assert.equal(JSON.stringify(again.room_ledger.chair_calls), JSON.stringify(planted.room_ledger.chair_calls),
    'the chair rows are deterministic');
  assert.equal(JSON.stringify(again.room_ledger), JSON.stringify(planted.room_ledger),
    'the whole ledger is deterministic');
}

console.log('PASS \u2014 the second chair: unset chairs are today\u2019s room to the byte, each env seats its own chair alone, genesis never follows a cheaper seat down, a keyless table still floors to mock by name, and the ledger attributes every call to its chair with the seated model named.');
