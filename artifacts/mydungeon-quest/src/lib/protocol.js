const ALLOWED_KEYS = new Set(['narration_blocks','suggestions','roll_request','state_updates','combat','cinematic','story','image_cue','dialogue_cue','time_advance','entropy_use']);
const CINEMATIC_TYPES = new Set(['chapter','boss_reveal','discovery','ominous','level_up','death','victory']);
const ROLL_KINDS = new Set(['check','save','attack','damage','death_save']);
const ADVANTAGE = new Set(['normal','advantage','disadvantage']);
const ZONES = new Set(['engaged','near','far']);
const cleanText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;

function assert(condition, message, errors) { if (!condition) errors.push(message); }
function noUnknown(object, allowed, path, errors) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return;
  for (const key of Object.keys(object)) if (!allowed.has(key)) errors.push(`${path}.${key} is not allowed`);
}

export function validateDmTurn(payload, entropyPool = []) {
  const errors = [];
  assert(payload && typeof payload === 'object' && !Array.isArray(payload), 'payload must be an object', errors);
  if (!payload || typeof payload !== 'object') return { ok: false, errors };
  noUnknown(payload, ALLOWED_KEYS, 'dm_turn', errors);
  for (const key of ALLOWED_KEYS) assert(Object.hasOwn(payload, key), `${key} is required`, errors);

  assert(Array.isArray(payload.narration_blocks) && payload.narration_blocks.length >= 1 && payload.narration_blocks.length <= 8, 'narration_blocks must contain 1-8 blocks', errors);
  let words = 0;
  for (const [index, block] of (payload.narration_blocks || []).entries()) {
    noUnknown(block, new Set(['text','speaker']), `narration_blocks[${index}]`, errors);
    assert(cleanText(block.text, 1200), `narration_blocks[${index}].text invalid`, errors);
    assert(block.speaker === null || cleanText(block.speaker, 80), `narration_blocks[${index}].speaker invalid`, errors);
    words += String(block.text || '').trim().split(/\s+/).filter(Boolean).length;
  }
  assert(words >= 20 && words <= 180, `narration total must be 20-180 words (received ${words})`, errors);

  assert(Array.isArray(payload.suggestions) && payload.suggestions.length === 3, 'suggestions must contain exactly 3 entries', errors);
  const normalized = (payload.suggestions || []).map((s) => String(s).trim().toLowerCase());
  assert(new Set(normalized).size === normalized.length, 'suggestions must be distinct', errors);
  for (const suggestion of payload.suggestions || []) assert(cleanText(suggestion, 60) && suggestion.trim().split(/\s+/).length <= 6, 'each suggestion must be <=6 words', errors);

  if (payload.roll_request !== null) {
    const rr = payload.roll_request;
    noUnknown(rr, new Set(['id','label','kind','die','ability','skill','proficient','dc','advantage','extra_mod','action_id','actor_id','target_id']), 'roll_request', errors);
    assert(cleanText(rr?.id, 80), 'roll_request.id invalid', errors);
    assert(cleanText(rr?.label, 120), 'roll_request.label invalid', errors);
    assert(ROLL_KINDS.has(rr?.kind), 'roll_request.kind invalid', errors);
    assert(/^d(4|6|8|10|12|20|100)$/.test(rr?.die || ''), 'roll_request.die invalid', errors);
    assert(rr?.ability === null || ['STR','DEX','CON','INT','WIS','CHA'].includes(rr?.ability), 'roll_request.ability invalid', errors);
    assert(rr?.skill === null || cleanText(rr?.skill, 50), 'roll_request.skill invalid', errors);
    assert(typeof rr?.proficient === 'boolean', 'roll_request.proficient invalid', errors);
    assert(rr?.dc === null || Number.isInteger(rr?.dc) && rr.dc >= 5 && rr.dc <= 30, 'roll_request.dc invalid', errors);
    assert(ADVANTAGE.has(rr?.advantage), 'roll_request.advantage invalid', errors);
    assert(Number.isInteger(rr?.extra_mod) && rr.extra_mod >= -10 && rr.extra_mod <= 20, 'roll_request.extra_mod invalid', errors);
    assert(cleanText(rr?.actor_id, 80), 'roll_request.actor_id invalid', errors);
    assert(rr?.target_id === null || cleanText(rr?.target_id, 80), 'roll_request.target_id invalid', errors);
    if (['attack','damage'].includes(rr?.kind)) assert(cleanText(rr?.action_id, 80), 'attacks and damage require action_id', errors);
    if (payload.state_updates !== null) errors.push('state_updates must be null while a roll is unresolved');
  }

  if (payload.cinematic !== null) {
    const c = payload.cinematic;
    noUnknown(c, new Set(['type','title','subtitle','palette']), 'cinematic', errors);
    assert(CINEMATIC_TYPES.has(c?.type), 'cinematic.type invalid', errors);
    assert(cleanText(c?.title, 100), 'cinematic.title invalid', errors);
    assert(cleanText(c?.subtitle, 180), 'cinematic.subtitle invalid', errors);
    assert(Array.isArray(c?.palette) && c.palette.length === 3 && c.palette.every((hex) => /^#[0-9a-fA-F]{6}$/.test(hex)), 'cinematic.palette invalid', errors);
  }

  if (payload.combat !== null) {
    const combat = payload.combat;
    noUnknown(combat, new Set(['op','round_delta','enemy_add','enemy_update','enemy_remove','npc_actions']), 'combat', errors);
    assert(['start','update','end'].includes(combat?.op), 'combat.op invalid', errors);
    assert([0,1].includes(combat?.round_delta), 'combat.round_delta invalid', errors);
    assert(Array.isArray(combat?.enemy_add) && Array.isArray(combat?.enemy_update) && Array.isArray(combat?.enemy_remove) && Array.isArray(combat?.npc_actions), 'combat arrays required', errors);
    for (const enemy of combat?.enemy_add || []) {
      assert(cleanText(enemy.id, 80) && cleanText(enemy.name, 80), 'enemy identity invalid', errors);
      assert(Number.isInteger(enemy.hp) && enemy.hp > 0 && enemy.hp <= 999, 'enemy hp invalid', errors);
      assert(Number.isInteger(enemy.maxHp) && enemy.maxHp >= enemy.hp && enemy.maxHp <= 999, 'enemy maxHp invalid', errors);
      assert(Number.isInteger(enemy.ac) && enemy.ac >= 1 && enemy.ac <= 30, 'enemy ac invalid', errors);
      assert(ZONES.has(enemy.zone), 'enemy zone invalid', errors);
    }
  }

  assert(Array.isArray(payload.entropy_use), 'entropy_use must be an array', errors);
  const indices = (payload.entropy_use || []).map((entry) => entry.index);
  for (let i = 0; i < indices.length; i += 1) {
    assert(Number.isInteger(indices[i]) && indices[i] >= 0 && indices[i] < entropyPool.length, `entropy index ${indices[i]} invalid`, errors);
    assert(indices[i] === i, 'entropy indices must be contiguous and consumed in order', errors);
    assert(payload.entropy_use[i].die === entropyPool[i]?.die, 'entropy die must match supplied pool', errors);
  }

  if (payload.dialogue_cue !== null) {
    assert(cleanText(payload.dialogue_cue?.speaker, 80), 'dialogue_cue.speaker invalid', errors);
    assert(cleanText(payload.dialogue_cue?.line, 180) && payload.dialogue_cue.line.trim().split(/\s+/).length <= 18, 'dialogue line must be <=18 words', errors);
  }
  if (payload.image_cue !== null) {
    assert(['portrait','scene'].includes(payload.image_cue?.kind), 'image_cue.kind invalid', errors);
    assert(Array.isArray(payload.image_cue?.subjects), 'image_cue.subjects invalid', errors);
  }
  if (payload.time_advance !== null) {
    assert(['hours','days'].includes(payload.time_advance?.unit), 'time_advance.unit invalid', errors);
    assert(Number.isInteger(payload.time_advance?.n) && payload.time_advance.n >= 1 && payload.time_advance.n <= 30, 'time_advance.n invalid', errors);
  }
  return { ok: errors.length === 0, errors };
}

export function makeEntropy(seed = Math.random) {
  const dice = [20,20,20,6,6,8,12,100];
  return dice.map((sides, index) => ({ index, die: `d${sides}`, value: Math.floor(seed() * sides) + 1 }));
}

export function safeFallbackTurn(playerText = '', turn = 0) {
  return {
    narration_blocks: [{ text: `The world holds its breath around your choice. ${playerText ? 'Your intent is clear, but fate asks for a cleaner telling before it will move.' : 'A distant bell marks the beginning of an unwritten road.'} Nothing mechanical changes while the Dungeon Master gathers the thread again.`, speaker: null }],
    suggestions: ['Look for another path', 'Ask what changed', 'Wait and listen'],
    roll_request: null, state_updates: null, combat: null,
    cinematic: turn === 0 ? { type: 'chapter', title: 'The First Turning', subtitle: 'Every world begins with one impossible choice.', palette: ['#0d0b14','#6f3f2d','#d4a24e'] } : null,
    story: null, image_cue: null, dialogue_cue: null, time_advance: null, entropy_use: []
  };
}
