import { buildChroniclerPrompt, validateChroniclePassage, CHRONICLE_LIMITS } from 'fatescript/chronicler';

// ------------------------------------------------------------
// /api/retell — the Chronicler's harness, built like the DM's
// but smaller: one forced tool call, the shared strict validator,
// one guided repair per provider, and an honest decline at the
// floor. No streaming (pages are short), no mock prose EVER —
// placeholder words must never be sealed into a journal, so the
// keyless answer is a decline and the client binds the raw
// sealed text instead.
// ------------------------------------------------------------

// The tool schema is what the model actually sees: every enum, bound, and
// required key the validator enforces must be declared here, or the model
// emits valid-but-rejected passages and the harness burns its repair.
export const chronicleToolSchema = {
  type: 'object', additionalProperties: false,
  required: ['title', 'passage', 'cites', 'mentions', 'quotes', 'dice_moments'],
  properties: {
    title: { type: 'string', maxLength: CHRONICLE_LIMITS.title, description: 'The chapter-close page title, e.g. "The tale so far — Chapter III".' },
    passage: { type: 'string', maxLength: CHRONICLE_LIMITS.passage, description: `${CHRONICLE_LIMITS.words_min}-${CHRONICLE_LIMITS.words_max} words retelling ONLY the sealed turns. Every capitalized proper name must be a codex name. No digits in the prose — numbers live in dice_moments. Any quoted speech must also be declared in quotes, verbatim.` },
    cites: {
      type: 'object', additionalProperties: false, required: ['from_turn', 'to_turn'],
      properties: { from_turn: { type: 'integer' }, to_turn: { type: 'integer' } },
      description: 'The sealed turn range this passage retells. Required — an uncited retelling is an invention.'
    },
    mentions: { type: 'array', maxItems: CHRONICLE_LIMITS.mentions, items: { type: 'string', maxLength: CHRONICLE_LIMITS.mention }, description: 'Every cast/region/hero name used in the passage. Names not in the codex are refused.' },
    quotes: {
      type: 'array', maxItems: CHRONICLE_LIMITS.quotes,
      items: {
        type: 'object', additionalProperties: false, required: ['speaker', 'line', 'turn'],
        properties: { speaker: { type: 'string', maxLength: CHRONICLE_LIMITS.mention }, line: { type: 'string', maxLength: CHRONICLE_LIMITS.quote_line, description: 'VERBATIM from the sealed transcript — a whole sealed line or a contiguous fragment of one, never extended.' }, turn: { type: 'integer' } }
      }
    },
    dice_moments: {
      type: 'array', maxItems: CHRONICLE_LIMITS.dice,
      items: {
        type: 'object', additionalProperties: false, required: ['turn', 'total', 'label'],
        properties: { turn: { type: 'integer' }, total: { type: 'integer', description: 'The exact sealed total.' }, label: { type: 'string', maxLength: CHRONICLE_LIMITS.dice_label } }
      },
      description: 'Margin marginalia: "Here the die showed nineteen." Only dice the sealed record shows.'
    }
  }
};

const MODEL = () => process.env.CHRONICLER_MODEL || process.env.DM_MODEL || 'claude-sonnet-4-6';

function contextOf(input) {
  return { range: input.range, names: input.names, corpus: input.corpus, deaths: input.deaths, totals: input.totals };
}

async function anthropicPassage(input, repair = null) {
  const messages = [{ role: 'user', content: [{ type: 'text', text: buildChroniclerPrompt(input) }] }];
  if (repair) {
    messages.push({ role: 'assistant', content: [{ type: 'tool_use', id: 'chronicle_repair', name: 'chronicle_passage', input: repair.passage }] });
    messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: 'chronicle_repair', is_error: true, content: `The rules client REJECTED that chronicle_passage. Every field is still required; keep everything lawful and fix ONLY these violations, then resend the complete corrected passage:\n- ${repair.errors.join('\n- ')}` }] });
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL(), max_tokens: 1200, messages,
      tools: [{ name: 'chronicle_passage', description: 'The only valid Chronicler response.', input_schema: chronicleToolSchema }],
      tool_choice: { type: 'tool', name: 'chronicle_passage' }
    })
  });
  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${await response.text()}`);
  const json = await response.json();
  const passage = json.content?.find((item) => item.type === 'tool_use' && item.name === 'chronicle_passage')?.input;
  if (!passage) throw new Error('Anthropic returned no chronicle_passage tool call');
  return passage;
}

async function openaiPassage(input, repair = null) {
  const messages = [{ role: 'user', content: buildChroniclerPrompt(input) }];
  if (repair) {
    messages.push({ role: 'assistant', content: `Previous chronicle_passage attempt:\n${JSON.stringify(repair.passage)}` });
    messages.push({ role: 'user', content: `The rules client REJECTED that chronicle_passage. Keep everything lawful and fix ONLY these violations, then resend the COMPLETE corrected passage via the chronicle_passage tool:\n- ${repair.errors.join('\n- ')}` });
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.CHRONICLER_MODEL_OPENAI || process.env.DM_MODEL_OPENAI || 'gpt-4o', max_tokens: 1400, messages,
      tools: [{ type: 'function', function: { name: 'chronicle_passage', description: 'The only valid Chronicler response.', parameters: chronicleToolSchema } }],
      tool_choice: { type: 'function', function: { name: 'chronicle_passage' } }
    })
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  const json = await response.json();
  const call = json.choices?.[0]?.message?.tool_calls?.find((tool) => tool.function?.name === 'chronicle_passage');
  if (!call) throw new Error('OpenAI returned no chronicle_passage tool call');
  return JSON.parse(call.function.arguments);
}

async function attempt(call, input, context, providerName) {
  let repair = null;
  let lastError;
  for (let round = 0; round < 2; round += 1) {
    try {
      const passage = await call(input, repair);
      const validation = validateChroniclePassage(passage, context);
      if (validation.ok) return { passage, provider: providerName, repaired: round > 0 };
      lastError = new Error(`Unlawful passage (${providerName}): ${validation.errors.join('; ')}`);
      repair = { passage, errors: validation.errors };
    } catch (error) {
      lastError = error;
      repair = null;
    }
  }
  throw lastError;
}

export async function getChroniclePassage(input = {}) {
  const context = contextOf(input);
  if (!Array.isArray(input.corpus) || !input.corpus.length) {
    return { declined: true, provider: 'none', reason: 'There are no sealed turns to retell.' };
  }
  // The keyless floor is an honest decline — the sealed text itself will
  // serve. Mock prose is NEVER minted here: a placeholder retelling sealed
  // into a journal would be a forgery with a wax stamp on it.
  const keyless = (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY)
    || process.env.CHRONICLER_PROVIDER === 'mock' || process.env.DM_PROVIDER === 'mock';
  if (keyless) {
    return { declined: true, provider: 'mock', reason: 'The Chronicler needs a real voice. The sealed text itself will serve.' };
  }
  let lastError;
  if (process.env.ANTHROPIC_API_KEY) {
    try { return await attempt(anthropicPassage, input, context, 'anthropic'); }
    catch (error) { lastError = error; console.error(`[retell] anthropic failed: ${error.message}`); }
  }
  if (process.env.OPENAI_API_KEY) {
    try { return { ...await attempt(openaiPassage, input, context, 'openai'), fellBackFrom: lastError ? 'anthropic' : undefined }; }
    catch (error) { lastError = error; console.error(`[retell] openai failed: ${error.message}`); }
  }
  return { declined: true, provider: 'exhausted', reason: 'The Chronicler could not speak lawfully.', error: lastError?.message };
}
