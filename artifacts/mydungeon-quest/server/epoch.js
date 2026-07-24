import { buildEpochPrompt, validateEpochSummary, EPOCH_LIMITS } from 'fatescript/epoch';
import { withClock, dmBudgetMs } from './clock.js';

// ------------------------------------------------------------
// /api/epoch — THE ELDER MEMORY's illuminated seat (Experience
// Directive XX, Law VII), built exactly like the Chronicler's retell
// harness: one forced tool call, the engine's own citation and quote
// courts as the validator, one guided repair per provider, the Pen's
// Clock on every provider call, and an honest keyless decline. Mock
// prose is NEVER minted here — a placeholder summary sealed into a
// journal would be a forgery, so the keyless answer is a decline and
// the client seals its own deterministic floor, labeled as the floor.
// ------------------------------------------------------------

// The tool schema is what the model actually sees: every bound the court
// enforces that a schema can carry must be declared here, and the rest
// ride the description in the court's own words — or the model emits
// valid-but-rejected summaries and the harness burns its repair.
export const epochToolSchema = {
  type: 'object', additionalProperties: false, required: ['summary'],
  properties: {
    summary: {
      type: 'string', maxLength: EPOCH_LIMITS.summary,
      description: `The sealed epoch summary of ONE closed act. Begins exactly "Act N." for the act under charge — no decoration. Every claim ends with the turn citations that prove it, e.g. "Mira fell [t7]." (a claim may cite several turns: "[t3][t7]."). Cite ONLY turns shown in the charge's transcript. Every proper name in a claim must appear in the turns THAT CLAIM cites. Quoted words must be verbatim from the cited turns, or absent. At most ${EPOCH_LIMITS.summary} characters.`
    }
  }
};

const MODEL = () => process.env.CHRONICLER_MODEL || process.env.DM_MODEL || 'claude-sonnet-4-6';

// The act's spoken rows, rendered as the charge's transcript.
function corpusOf(record, actIndex) {
  const beats = record?.codex?.spine?.beats || [];
  const actOf = (log) => beats[log?.beatIndex ?? 0]?.act || 1;
  return (Array.isArray(record?.entries) ? record.entries : [])
    .filter((log) => log && !log.redacted && !log.kind && log.dm && actOf(log) === actIndex + 1)
    .map((log) => {
      const texts = [];
      if (log.player) texts.push(`player: ${log.player}`);
      for (const block of log.dm?.narration_blocks || []) {
        if (block?.text) texts.push(block.speaker ? `${block.speaker}: ${block.text}` : String(block.text));
      }
      const su = log.dm?.story;
      for (const op of [...(su?.cast_add || []), ...(su?.cast_update || [])]) {
        if (op?.name) texts.push(`[cast] ${op.name}${op.status ? ` — status: ${op.status}` : ''}${op.fact_add ? ` — ${op.fact_add}` : ''}`);
      }
      if (log.dm?.dialogue_cue?.line) texts.push(`${log.dm.dialogue_cue.speaker || 'voice'}: ${log.dm.dialogue_cue.line}`);
      return { turn: log.turn, texts };
    });
}

async function anthropicEpoch(input, repair = null) {
  const messages = [{ role: 'user', content: [{ type: 'text', text: buildEpochPrompt(input) }] }];
  if (repair) {
    messages.push({ role: 'assistant', content: [{ type: 'tool_use', id: 'epoch_repair', name: 'epoch_summary', input: repair.summary }] });
    messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: 'epoch_repair', is_error: true, content: `The rules client REJECTED that epoch_summary. Keep everything lawful and fix ONLY these violations, then resend the complete corrected summary:\n- ${repair.errors.join('\n- ')}` }] });
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL(), max_tokens: 1200, messages,
      tools: [{ name: 'epoch_summary', description: 'The only valid epoch response.', input_schema: epochToolSchema }],
      tool_choice: { type: 'tool', name: 'epoch_summary' }
    })
  });
  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${await response.text()}`);
  const json = await response.json();
  const summary = json.content?.find((item) => item.type === 'tool_use' && item.name === 'epoch_summary')?.input;
  if (!summary) throw new Error('Anthropic returned no epoch_summary tool call');
  return summary;
}

async function openaiEpoch(input, repair = null) {
  const messages = [{ role: 'user', content: buildEpochPrompt(input) }];
  if (repair) {
    messages.push({ role: 'assistant', content: `Previous epoch_summary attempt:\n${JSON.stringify(repair.summary)}` });
    messages.push({ role: 'user', content: `The rules client REJECTED that epoch_summary. Keep everything lawful and fix ONLY these violations, then resend the COMPLETE corrected summary via the epoch_summary tool:\n- ${repair.errors.join('\n- ')}` });
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.CHRONICLER_MODEL_OPENAI || process.env.DM_MODEL_OPENAI || 'gpt-4o', max_tokens: 1400, messages,
      tools: [{ type: 'function', function: { name: 'epoch_summary', description: 'The only valid epoch response.', parameters: epochToolSchema } }],
      tool_choice: { type: 'function', function: { name: 'epoch_summary' } }
    })
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  const json = await response.json();
  const call = json.choices?.[0]?.message?.tool_calls?.find((tool) => tool.function?.name === 'epoch_summary');
  if (!call) throw new Error('OpenAI returned no epoch_summary tool call');
  return JSON.parse(call.function.arguments);
}

// One guided repair per provider, every provider call under the Pen's
// Clock, the engine's courts as the one validator.
async function attempt(call, input, record, actIndex, providerName) {
  let repair = null;
  let lastError;
  for (let round = 0; round < 2; round += 1) {
    try {
      const answer = await withClock(call(input, repair), dmBudgetMs(false), `the epoch summary outwaited the pen's clock (${providerName})`);
      const text = String(answer?.summary || '').trim();
      const validation = validateEpochSummary(text, record, actIndex);
      if (validation.ok) return { summary: text, provider: providerName, repaired: round > 0 };
      lastError = new Error(`Unlawful epoch (${providerName}): ${validation.errors.join('; ')}`);
      repair = { summary: answer, errors: validation.errors };
    } catch (error) {
      lastError = error;
      repair = null;
    }
  }
  throw lastError;
}

export async function getEpochSummary(body = {}) {
  const actIndex = Number.isInteger(body.actIndex) ? body.actIndex : -1;
  const record = body.record && typeof body.record === 'object' ? body.record : null;
  if (actIndex < 0 || !record || !Array.isArray(record.entries) || !record.entries.length) {
    return { declined: true, provider: 'none', reason: 'There is no closed act to distill.' };
  }
  const corpus = corpusOf(record, actIndex);
  if (!corpus.length) {
    return { declined: true, provider: 'none', reason: 'The act holds no spoken turns.' };
  }
  const keyless = (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY)
    || process.env.CHRONICLER_PROVIDER === 'mock' || process.env.DM_PROVIDER === 'mock';
  if (keyless) {
    return { declined: true, provider: 'mock', reason: 'The Chronicler needs a real voice. The table\u2019s own floor will serve, labeled as the floor.' };
  }
  const input = { actIndex, corpus };
  let lastError;
  if (process.env.ANTHROPIC_API_KEY) {
    try { return await attempt(anthropicEpoch, input, record, actIndex, 'anthropic'); }
    catch (error) { lastError = error; console.error(`[epoch] anthropic failed: ${error.message}`); }
  }
  if (process.env.OPENAI_API_KEY) {
    try { return { ...await attempt(openaiEpoch, input, record, actIndex, 'openai'), fellBackFrom: lastError ? 'anthropic' : undefined }; }
    catch (error) { lastError = error; console.error(`[epoch] openai failed: ${error.message}`); }
  }
  return { declined: true, provider: 'exhausted', reason: 'The Chronicler could not distill the act lawfully.', error: lastError?.message };
}
