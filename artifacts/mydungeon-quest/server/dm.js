import { buildSystemPrompt } from '../src/lib/systemPrompt.js';
import { mockDmTurn } from '../src/lib/mockDm.js';
import { safeFallbackTurn, validateDmTurn } from '../src/lib/protocol.js';

// Mirrors the constraints enforced by src/lib/protocol.js#validateDmTurn.
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
    { type: 'object', additionalProperties: false, required: ['speaker','line'], properties: { speaker: { type: 'string', maxLength: 80 }, line: { type: 'string', maxLength: 180 } } }
  ]
};
const timeAdvanceSchema = {
  anyOf: [
    { type: 'null' },
    { type: 'object', additionalProperties: false, required: ['unit','n'], properties: { unit: { type: 'string', enum: ['hours','days'] }, n: { type: 'integer', minimum: 1, maximum: 30 } } }
  ]
};

const toolSchema = {
  type: 'object', additionalProperties: false,
  required: ['narration_blocks','suggestions','roll_request','state_updates','combat','cinematic','story','image_cue','dialogue_cue','time_advance','entropy_use'],
  properties: {
    narration_blocks: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'object', additionalProperties: false, required: ['text','speaker'], properties: { text: { type: 'string', maxLength: 1200 }, speaker: { anyOf: [{ type: 'string', maxLength: 80 }, { type: 'null' }] } } } },
    suggestions: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string', maxLength: 60, description: 'At most 6 words.' } },
    roll_request: rollRequestSchema, state_updates: { anyOf: [{ type: 'null' }, { type: 'object' }] },
    combat: combatSchema, cinematic: cinematicSchema,
    story: { anyOf: [{ type: 'null' }, { type: 'object' }] }, image_cue: imageCueSchema,
    dialogue_cue: dialogueCueSchema, time_advance: timeAdvanceSchema,
    entropy_use: { type: 'array', items: { type: 'object', required: ['index','die','purpose'], properties: { index: { type: 'integer' }, die: { type: 'string' }, purpose: { type: 'string' } } } }
  }
};

async function anthropicTurn(input) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: input.genesis ? process.env.DM_MODEL_GENESIS || process.env.DM_MODEL : process.env.DM_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 2200,
      system: [{ type: 'text', text: buildSystemPrompt(input), cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `[STATE]\n${JSON.stringify(input.state)}\n[STORY]\n${JSON.stringify(input.story)}\n[MEMORY]\n${JSON.stringify(input.memory || [])}\n[ENTROPY]\n${JSON.stringify(input.entropy)}\n${input.resolution ? `[RESOLUTION]\n${JSON.stringify(input.resolution)}\n` : ''}[PLAYER]\n${input.player}` }],
      tools: [{ name: 'dm_turn', description: 'The only valid Dungeon Master response.', input_schema: toolSchema }],
      tool_choice: { type: 'tool', name: 'dm_turn' }
    })
  });
  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${await response.text()}`);
  const json = await response.json();
  return json.content?.find((item) => item.type === 'tool_use' && item.name === 'dm_turn')?.input;
}

export async function getDmTurn(input) {
  const useMock = !process.env.ANTHROPIC_API_KEY || process.env.DM_PROVIDER === 'mock';
  let turn;
  try {
    turn = useMock ? mockDmTurn(input) : await anthropicTurn(input);
    const validation = validateDmTurn(turn, input.entropy);
    if (!validation.ok) throw new Error(`Invalid DM turn: ${validation.errors.join('; ')}`);
    return { turn, provider: useMock ? 'mock' : 'anthropic' };
  } catch (error) {
    console.error(error);
    return { turn: safeFallbackTurn(input.player, input.turn), provider: 'fallback', error: error.message };
  }
}
