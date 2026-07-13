import { buildSystemPrompt } from '../src/lib/systemPrompt.js';
import { mockDmTurn } from '../src/lib/mockDm.js';
import { safeFallbackTurn, validateDmTurn } from '../src/lib/protocol.js';

const toolSchema = {
  type: 'object', additionalProperties: false,
  required: ['narration_blocks','suggestions','roll_request','state_updates','combat','cinematic','story','image_cue','dialogue_cue','time_advance','entropy_use'],
  properties: {
    narration_blocks: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'object', additionalProperties: false, required: ['text','speaker'], properties: { text: { type: 'string' }, speaker: { anyOf: [{ type: 'string' }, { type: 'null' }] } } } },
    suggestions: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
    roll_request: { anyOf: [{ type: 'null' }, { type: 'object' }] }, state_updates: { anyOf: [{ type: 'null' }, { type: 'object' }] },
    combat: { anyOf: [{ type: 'null' }, { type: 'object' }] }, cinematic: { anyOf: [{ type: 'null' }, { type: 'object' }] },
    story: { anyOf: [{ type: 'null' }, { type: 'object' }] }, image_cue: { anyOf: [{ type: 'null' }, { type: 'object' }] },
    dialogue_cue: { anyOf: [{ type: 'null' }, { type: 'object' }] }, time_advance: { anyOf: [{ type: 'null' }, { type: 'object' }] },
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
