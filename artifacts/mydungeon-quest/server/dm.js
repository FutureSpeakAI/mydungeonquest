import { buildSystemPrompt } from '../src/lib/systemPrompt.js';
import { mockDmTurn } from 'fatescript/mockDm';
import { safeFallbackTurn, validateDmTurn } from 'fatescript/protocol';
import { censusNote, unrecordedSouls } from 'fatescript/census';

// THE CENSUS AT THE DOOR — Directive VI, Phase 11. The validator rules the
// shape; the census rules the roll: an attributed speaker the record does
// not know is an unrecorded soul. Both courts read the same pre-turn
// snapshot, and their findings share the one-repair message — the model
// either declares the stranger (cast_add, voice_card and all) or unclaims
// the line. Exported for the bench; the door is the only live caller.
export function judgeTurn(turn, input) {
  // The ground courts (Directive VII) seat from the same briefing: regions
  // from the pack, the standing scene from [STORY].scene_state — null there
  // attests no scene stands, so genesis rides free. (The briefing's own
  // `scene` key is cast presence, a different beast — never read it here.)
  // THE PARTY AND THE ELSEWHERE (Directive VIII): the party, presence, and
  // fixture courts seat ONLY when the briefing carries their evidence — an
  // older sealed input without these arrays leaves the courts unseated
  // (bare-context law), never falsely attested empty.
  const context = { cast: input.story?.cast || [], threads: input.story?.threads_state || [], trove: input.story?.trove_state || [], purses: input.story?.purse_state || [], regions: input.story?.regions || [], scene: input.story?.scene_state ? { region: input.story.scene_state.region } : null, hero: input.hero?.name || null };
  if (Array.isArray(input.story?.party_state)) context.party = input.story.party_state.map((member) => member?.name).filter((memberName) => typeof memberName === 'string');
  if (Array.isArray(input.story?.presence_state)) context.presence = input.story.presence_state;
  if (Array.isArray(input.story?.fixture_state)) context.fixtures = input.story.fixture_state;
  const validation = validateDmTurn(turn, input.entropy, context);
  const errors = validation.ok ? [] : [...validation.errors];
  const strangers = unrecordedSouls(turn, input.story?.cast || [], { hero: input.hero || null });
  if (strangers.length) errors.push(censusNote(strangers));
  return { ok: errors.length === 0, errors };
}

// Mirrors the constraints enforced by fatescript/protocol#validateDmTurn.
// The tool schema is what the model actually sees, so any enum/shape the
// validator checks for must be declared here or the model has no way to
// know the exact values the client will accept.
const rollRequestSchema = {
  anyOf: [
    { type: 'null' },
    {
      type: 'object', additionalProperties: false,
      required: ['id','label','kind','die','ability','skill','proficient','dc','advantage','extra_mod','action_id','actor_id','target_id'],
      properties: {
        id: { type: 'string', maxLength: 80 },
        label: { type: 'string', maxLength: 120 },
        kind: { type: 'string', enum: ['check','save','attack','damage','death_save'] },
        die: { type: 'string', enum: ['d4','d6','d8','d10','d12','d20','d100'] },
        ability: { anyOf: [{ type: 'null' }, { type: 'string', enum: ['STR','DEX','CON','INT','WIS','CHA'] }] },
        skill: { anyOf: [{ type: 'null' }, { type: 'string', maxLength: 50 }] },
        proficient: { type: 'boolean' },
        dc: { anyOf: [{ type: 'null' }, { type: 'integer', minimum: 5, maximum: 30 }] },
        advantage: { type: 'string', enum: ['normal','advantage','disadvantage'] },
        extra_mod: { type: 'integer', minimum: -10, maximum: 20 },
        action_id: { anyOf: [{ type: 'null' }, { type: 'string', maxLength: 80 }] },
        actor_id: { type: 'string', maxLength: 80 },
        target_id: { anyOf: [{ type: 'null' }, { type: 'string', maxLength: 80 }] }
      }
    }
  ]
};
const cinematicSchema = {
  anyOf: [
    { type: 'null' },
    {
      type: 'object', additionalProperties: false,
      required: ['type','title','subtitle','palette'],
      properties: {
        type: { type: 'string', enum: ['chapter','boss_reveal','discovery','ominous','level_up','death','victory'] },
        title: { type: 'string', maxLength: 100 },
        subtitle: { type: 'string', maxLength: 180 },
        palette: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string', description: 'Hex color like #d4a24e.' } }
      }
    }
  ]
};
const combatSchema = {
  anyOf: [
    { type: 'null' },
    {
      type: 'object', additionalProperties: false,
      required: ['op','round_delta','enemy_add','enemy_update','enemy_remove','npc_actions'],
      properties: {
        op: { type: 'string', enum: ['start','update','end'] },
        round_delta: { type: 'integer', enum: [0,1] },
        enemy_add: { type: 'array', items: { type: 'object', required: ['id','name','hp','maxHp','ac','zone'], properties: { id: { type: 'string' }, name: { type: 'string' }, hp: { type: 'integer', minimum: 1, maximum: 999 }, maxHp: { type: 'integer', minimum: 1, maximum: 999 }, ac: { type: 'integer', minimum: 1, maximum: 30 }, zone: { type: 'string', enum: ['engaged','near','far'] } } } },
        enemy_update: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, hp_delta: { type: 'integer' }, zone: { anyOf: [{ type: 'null' }, { type: 'string', enum: ['engaged','near','far'] }] } } } },
        enemy_remove: { type: 'array', items: { type: 'string' } },
        npc_actions: { type: 'array', items: { type: 'object' } }
      }
    }
  ]
};
const imageCueSchema = {
  anyOf: [
    { type: 'null' },
    { type: 'object', additionalProperties: false, required: ['kind','subjects'], properties: { kind: { type: 'string', enum: ['portrait','scene'] }, subjects: { type: 'array', items: { type: 'string' } } } }
  ]
};
const dialogueCueSchema = {
  anyOf: [
    { type: 'null' },
    { type: 'object', additionalProperties: false, required: ['speaker','line'], properties: { speaker: { type: 'string', maxLength: 80, description: 'Exact living cast name. THE DEAD DO NOT SPEAK — a dead soul may have spoken final words only in the very turn it died, never after.' }, line: { type: 'string', maxLength: 180 } } }
  ]
};
const timeAdvanceSchema = {
  anyOf: [
    { type: 'null' },
    { type: 'object', additionalProperties: false, required: ['unit','n'], properties: { unit: { type: 'string', enum: ['hours','days'] }, n: { type: 'integer', minimum: 1, maximum: 30 } } }
  ]
};
// THE POSSESSIONS CUT (Directive VI): the four item/coin operations are
// declared structurally because the strict validator enforces their enums
// and bounds — a schema the model cannot see is a trap. Established story
// keys keep their reducer-side guardianship, so the object stays open.
const storySchema = {
  anyOf: [
    { type: 'null' },
    {
      type: 'object',
      properties: {
        item_add: { type: 'array', maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['name','kind','holder','note'], properties: {
          name: { type: 'string', minLength: 3, maxLength: 60 },
          kind: { type: 'string', enum: ['weapon','tool','keepsake','treasure','document'] },
          holder: { type: 'string', maxLength: 60, description: 'Exact name of the soul now holding it.' },
          note: { anyOf: [{ type: 'null' }, { type: 'string', maxLength: 90 }] }
        } } },
        item_transfer: { type: 'array', maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['name','from','to'], properties: {
          name: { type: 'string', minLength: 3, maxLength: 60 },
          from: { type: 'string', maxLength: 60, description: 'The hand [STORY].trove_state currently shows holding it.' },
          to: { type: 'string', maxLength: 60 }
        } } },
        item_remove: { type: 'array', maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['name','holder','reason'], properties: {
          name: { type: 'string', minLength: 3, maxLength: 60 },
          holder: { type: 'string', maxLength: 60 },
          reason: { anyOf: [{ type: 'null' }, { type: 'string', maxLength: 90 }] }
        } } },
        purse: { type: 'array', maxItems: 2, items: { type: 'object', additionalProperties: false, required: ['holder','delta','reason'], properties: {
          holder: { type: 'string', maxLength: 60 },
          delta: { type: 'integer', minimum: -999, maximum: 999, description: 'Non-zero. Never spend below the [STORY].purse_state balance.' },
          reason: { type: 'string', minLength: 3, maxLength: 90 }
        } } },
        // THE PRESENCE CUT (Directive VII): declared because the strict
        // validator enforces the shape — a schema the model cannot see is
        // a trap. Exactly one key, and never an array.
        scene_set: { anyOf: [ { type: 'null' }, { type: 'object', additionalProperties: false, required: ['region'], properties: {
          region: { type: 'string', minLength: 3, maxLength: 100, description: 'The region the scene now stands in — one the record already holds, or one created by this same turn\'s world.region_add. A change of ground must ride with time_advance in the same turn.' }
        } } ] },
        // THE PARTY AND THE ELSEWHERE (Directive VIII): declared because
        // the strict validator enforces these exact shapes — a schema the
        // model cannot see is a trap. Each is a single object, never an
        // array.
        party_join: { anyOf: [ { type: 'null' }, { type: 'object', additionalProperties: false, required: ['name'], properties: {
          name: { type: 'string', minLength: 2, maxLength: 80, description: 'A living cast soul whose last lawful ground is the current scene, or one introduced by this same turn\'s cast_add. The party travels as one when the scene moves. The hero is never joined — the party is hers already.' }
        } } ] },
        party_leave: { anyOf: [ { type: 'null' }, { type: 'object', additionalProperties: false, required: ['name'], properties: {
          name: { type: 'string', minLength: 2, maxLength: 80, description: 'A current party member, released from the party. The hero is never left.' },
          remains_at: { anyOf: [ { type: 'null' }, { type: 'string', minLength: 3, maxLength: 100 } ], description: 'The region where the departing soul remains — one the record holds, or one created by this same turn\'s world.region_add. Omitted, the soul remains at the current scene.' }
        } } ] },
        fixture_add: { anyOf: [ { type: 'null' }, { type: 'object', additionalProperties: false, required: ['place','name','visual'], properties: {
          place: { type: 'string', minLength: 3, maxLength: 100, description: 'The region this fixture stands in — one the record holds, or one created by this same turn\'s world.region_add.' },
          name: { type: 'string', minLength: 3, maxLength: 60 },
          visual: { type: 'string', minLength: 8, maxLength: 160, description: 'The fixture\'s paintable visual truth. Fixture canon seals once — written once, never rewritten, and the painter reads it forever.' }
        } } ] }
      }
    }
  ]
};

const toolSchema = {
  type: 'object', additionalProperties: false,
  required: ['narration_blocks','suggestions','roll_request','state_updates','combat','cinematic','story','image_cue','dialogue_cue','time_advance','entropy_use'],
  properties: {
    narration_blocks: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'object', additionalProperties: false, required: ['text','speaker'], properties: { text: { type: 'string', maxLength: 1200 }, speaker: { anyOf: [{ type: 'string', maxLength: 80 }, { type: 'null' }], description: 'Exact cast name for a dialogue block; null for description. THE DEAD DO NOT SPEAK — never attribute dialogue to a cast member whose status is dead.' } } } },
    suggestions: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string', maxLength: 60, description: 'At most 6 words.' } },
    roll_request: rollRequestSchema, state_updates: { anyOf: [{ type: 'null' }, { type: 'object' }] },
    combat: combatSchema, cinematic: cinematicSchema,
    story: storySchema, image_cue: imageCueSchema,
    dialogue_cue: dialogueCueSchema, time_advance: timeAdvanceSchema,
    entropy_use: { type: 'array', items: { type: 'object', required: ['index','die','purpose'], properties: { index: { type: 'integer' }, die: { type: 'string' }, purpose: { type: 'string' } } } }
  }
};

// ---- v2 turn engine: memory, cache, and a real stream ---------
// The system prompt is static per campaign (cache_control holds).
// The conversation history carries the DM's own prior narration,
// with a cache breakpoint on the last stable message so the
// prefix caches incrementally. Only the final user message
// changes per turn.

const MODEL = () => process.env.DM_MODEL || 'claude-sonnet-4-6';
const GENESIS_MODEL = () => process.env.DM_MODEL_GENESIS || MODEL();

function dynamicBlocks(input) {
  return `[STATE]\n${JSON.stringify(input.state)}\n[STORY]\n${JSON.stringify(input.story)}\n[MEMORY]\n${JSON.stringify(input.memory || [])}\n[ENTROPY]\n${JSON.stringify(input.entropy)}\n${input.resolution ? `[RESOLUTION]\n${JSON.stringify(input.resolution)}\n` : ''}[PLAYER]\n${input.player}`;
}

function shapeMessages(input) {
  const history = (Array.isArray(input.history) ? input.history : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-30)
    .map((m) => ({ role: m.role, content: [{ type: 'text', text: m.content.slice(0, 6000) }] }));
  if (history.length) history[history.length - 1].content[0].cache_control = { type: 'ephemeral' };
  return [...history, { role: 'user', content: [{ type: 'text', text: dynamicBlocks(input) }] }];
}

function shapeRequest(input, stream) {
  return {
    model: input.genesis ? GENESIS_MODEL() : MODEL(),
    max_tokens: 2200,
    system: [{ type: 'text', text: buildSystemPrompt(input), cache_control: { type: 'ephemeral' } }],
    messages: shapeMessages(input),
    tools: [{ name: 'dm_turn', description: 'The only valid Dungeon Master response.', input_schema: toolSchema }],
    tool_choice: { type: 'tool', name: 'dm_turn' },
    ...(stream ? { stream: true } : {})
  };
}

const anthropicHeaders = () => ({ 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' });

// When a previous attempt was schema-valid per Anthropic but rejected by the
// stricter client validator, `repair` carries that turn plus the exact
// violations so the model can correct itself instead of falling back to
// generic narration. This tightens reliability without loosening the validator.
async function anthropicTurn(input, repair = null) {
  const request = shapeRequest(input, false);
  if (repair) {
    request.messages = [
      ...request.messages,
      { role: 'assistant', content: [{ type: 'tool_use', id: 'dm_turn_repair', name: 'dm_turn', input: repair.turn }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'dm_turn_repair', is_error: true, content: `The rules client REJECTED that dm_turn. Every field is still required; keep everything that was correct and fix ONLY these violations, then resend the complete corrected dm_turn:\n- ${repair.errors.join('\n- ')}` }] }
    ];
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: anthropicHeaders(), body: JSON.stringify(request)
  });
  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${await response.text()}`);
  const json = await response.json();
  return json.content?.find((item) => item.type === 'tool_use' && item.name === 'dm_turn')?.input;
}

// Walks a PARTIAL dm_turn JSON string and returns the narration
// text seen so far — completed blocks plus the in-flight string —
// so the client can render prose while the turn is still forming.
export function extractNarration(partial) {
  const key = '"narration_blocks"';
  const at = partial.indexOf(key);
  if (at < 0) return '';
  let i = partial.indexOf('[', at + key.length);
  if (i < 0) return '';
  let depth = 0, out = [], cur = null, inStr = false, esc = false, capture = false;
  for (; i < partial.length; i++) {
    const c = partial[i];
    if (inStr) {
      if (esc) { if (capture) cur += ({ n: '\n', t: '\t', '"': '"', '\\': '\\', '/': '/' }[c] ?? c); esc = false; }
      else if (c === '\\') esc = true;
      else if (c === '"') { inStr = false; if (capture) { out.push(cur); cur = null; capture = false; } }
      else if (capture) cur += c;
      continue;
    }
    if (c === '"') {
      inStr = true; esc = false;
      capture = /"text"\s*:\s*$/.test(partial.slice(Math.max(0, i - 12), i));
      if (capture) cur = '';
      continue;
    }
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') { depth--; if (depth <= 0) break; }
  }
  if (cur != null) out.push(cur);
  return out.join('\n\n');
}

async function anthropicTurnStream(input, onNarration) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: anthropicHeaders(), body: JSON.stringify(shapeRequest(input, true))
  });
  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${await response.text()}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', json = '', lastPaint = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim(); buffer = buffer.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      let event; try { event = JSON.parse(payload); } catch { continue; }
      if (event.type === 'content_block_delta' && event.delta?.type === 'input_json_delta' && typeof event.delta.partial_json === 'string') {
        json += event.delta.partial_json;
        const now = Date.now();
        if (now - lastPaint > 90) { lastPaint = now; const text = extractNarration(json); if (text) onNarration?.(text); }
      } else if (event.type === 'error') {
        throw new Error(event.error?.message || 'stream error');
      }
    }
  }
  if (!json) throw new Error('empty stream');
  try { return JSON.parse(json); }
  catch { const a = json.indexOf('{'), b = json.lastIndexOf('}'); return JSON.parse(json.slice(a, b + 1)); }
}

// OpenAI fallback for the DM: same tool schema, system prompt, and strict
// client validator as Anthropic, so a fallback turn is held to the identical
// contract. Used only when Anthropic errors/fails validation twice. Anthropic
// message blocks are flattened to plain strings for the chat API.
async function openaiTurn(input, repair = null) {
  const messages = [
    { role: 'system', content: buildSystemPrompt(input) },
    ...shapeMessages(input).map((m) => ({ role: m.role, content: m.content.map((c) => c.text).join('\n') }))
  ];
  if (repair) {
    messages.push({ role: 'assistant', content: `Previous dm_turn attempt:\n${JSON.stringify(repair.turn)}` });
    messages.push({ role: 'user', content: `The rules client REJECTED that dm_turn. Keep everything that was correct and fix ONLY these violations, then resend the COMPLETE corrected dm_turn via the dm_turn tool:\n- ${repair.errors.join('\n- ')}` });
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.DM_MODEL_OPENAI || 'gpt-4o',
      max_tokens: 2400,
      messages,
      tools: [{ type: 'function', function: { name: 'dm_turn', description: 'The only valid Dungeon Master response.', parameters: toolSchema } }],
      tool_choice: { type: 'function', function: { name: 'dm_turn' } }
    })
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  const json = await response.json();
  const call = json.choices?.[0]?.message?.tool_calls?.find((t) => t.function?.name === 'dm_turn');
  if (!call) throw new Error('OpenAI returned no dm_turn tool call');
  return JSON.parse(call.function.arguments);
}

// Mock mode paints the same experience: the canned narration
// arrives in growing slices so the streaming UI is exercised
// keylessly, end to end.
async function mockWithNarration(input, onNarration) {
  const turn = mockDmTurn(input);
  if (onNarration) {
    const full = (turn.narration_blocks || []).map((b) => b.text).join('\n\n');
    const step = Math.max(24, Math.ceil(full.length / 9));
    for (let end = step; end < full.length; end += step) {
      onNarration(full.slice(0, end));
      await new Promise((resolve) => setTimeout(resolve, 90));
    }
    onNarration(full);
  }
  return turn;
}

/**
 * The DM's provider plan: which artisans may tell this turn, in order, with
 * mock as the guaranteed floor. `barred` is the watchtower's word — a
 * provider whose daily spend ceiling is reached is struck from the plan
 * INDIVIDUALLY, so a spent Anthropic day degrades to OpenAI (if configured
 * and unspent) before the floor, and a spent provider is never called.
 */
export function dmPlan(barred = {}) {
  if (process.env.DM_PROVIDER === 'mock') return ['mock'];
  const plan = [];
  if (process.env.ANTHROPIC_API_KEY && !barred.anthropic) plan.push('anthropic');
  if (process.env.OPENAI_API_KEY && process.env.DM_FALLBACK !== 'off' && !barred.openai) plan.push('openai');
  plan.push('mock');
  return plan;
}

export async function getDmTurn(input, { onNarration = null, onRetract = null, barred = {} } = {}) {
  const plan = dmPlan(barred);
  const useMock = plan[0] === 'mock';

  if (useMock) {
    try {
      const turn = await mockWithNarration(input, onNarration);
      const validation = judgeTurn(turn, input);
      if (!validation.ok) throw new Error(`Invalid DM turn: ${validation.errors.join('; ')}`);
      return { turn, provider: 'mock' };
    } catch (error) {
      console.error(error);
      if (onNarration) onRetract?.();
      return { turn: safeFallbackTurn(input.player, input.turn), provider: 'fallback', error: error.message };
    }
  }

  // Up to two attempts: the second is a self-repair guided by the exact
  // validator errors from the first. The first attempt streams narration to
  // the client when requested; the repair pass is a plain (non-streamed) call.
  // Network/API errors get a plain retry.
  let lastError = new Error('no DM provider was allowed to speak');
  let repair = null;
  let streamed = false;
  for (let attempt = 0; plan.includes('anthropic') && attempt < 2; attempt += 1) {
    try {
      const streamingNarration = attempt === 0 && onNarration
        ? (text) => { streamed = true; onNarration(text); }
        : null;
      const turn = streamingNarration
        ? await anthropicTurnStream(input, streamingNarration).catch(() => anthropicTurn(input))
        : await anthropicTurn(input, repair);
      const validation = judgeTurn(turn, input);
      if (validation.ok) return { turn, provider: 'anthropic', repaired: attempt > 0 };
      lastError = new Error(`Invalid DM turn: ${validation.errors.join('; ')}`);
      repair = { turn, errors: validation.errors };
    } catch (error) {
      lastError = error;
      repair = null;
    }
    // The stage goes dark before the repair: if unlawful (or interrupted)
    // prose already streamed to the player, retract it so the weaving text
    // never leaves outlaw words standing while the turn is remade.
    if (streamed) { onRetract?.(); streamed = false; }
  }

  // Anthropic spent, barred, or exhausted — try OpenAI before the floor.
  if (plan.includes('openai')) {
    let repairO = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const turn = await openaiTurn(input, repairO);
        const validation = judgeTurn(turn, input);
        if (validation.ok) return { turn, provider: 'openai', repaired: attempt > 0, fellBackFrom: 'anthropic' };
        lastError = new Error(`Invalid DM turn (openai): ${validation.errors.join('; ')}`);
        repairO = { turn, errors: validation.errors };
      } catch (error) {
        lastError = error;
        repairO = null;
      }
    }
  }

  console.error(lastError);
  return { turn: safeFallbackTurn(input.player, input.turn), provider: 'fallback', error: lastError.message };
}
