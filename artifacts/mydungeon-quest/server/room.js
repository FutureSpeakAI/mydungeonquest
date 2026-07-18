// ------------------------------------------------------------
// THE WRITER'S ROOM — Directive XI.
//
// The orchestrator behind the one door. The Director sits once per
// beat and hands down `beat_intent` (intent, secrets, threads,
// forbidden repeats, and the measure); the Voice tells the turn under
// that word; the sealed result leaves whole — the curtain (Law I)
// guarantees no seat's deliberation is ever seen from the table.
//
// THE INHERITANCE: every seat reads the world through the briefing
// the request already carries. No new context plumbing exists here —
// the Director's word itself rides [STORY].beat_intent, so the Voice
// reads it through the same one block as everything else.
//
// THE CACHE: the sealed intent rides the turn out and the client
// returns it inside the briefing; the Director sits only when the
// standing beat index has no carried intent. A cache hit costs
// nothing and counts nothing (room_ledger.director_calls stays 0).
// ------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { plateDue } from './artDirector.js';
import { getDmTurn, dmPlan } from './dm.js';
import { buildSystemPrompt } from '../src/lib/systemPrompt.js';

const MEASURES = ['lean', 'standard', 'rich'];
// LAW V — the bands, in numbers. A paragraph is one narration block.
export const MEASURE_BANDS = { lean: [1, 2], standard: [3, 5], rich: [6, 8] };

// The thread ledger as the briefing carries it — rows with names, or
// bare strings. No rows at all leaves the thread court out of session.
export function threadNames(story) {
  const rows = Array.isArray(story?.open_threads) ? story.open_threads
    : Array.isArray(story?.threads) ? story.threads : null;
  if (!rows) return null;
  return rows
    .map((row) => (typeof row === 'string' ? row : (row && typeof row.name === 'string' ? row.name : null)))
    .filter((name) => typeof name === 'string' && name.length);
}

// The Director's word faces its own strict court — exactly these keys,
// these lengths, this measure. A live seat that cannot speak lawfully
// is replaced by the deterministic floor, never argued with.
export function validateBeatIntent(intent, { threads = null } = {}) {
  if (!intent || typeof intent !== 'object' || Array.isArray(intent)) {
    return { ok: false, errors: ['beat_intent must be a single object'] };
  }
  const errors = [];
  const lawful = ['beat_index', 'forbidden_repeats', 'intent', 'measure', 'secrets_held', 'threads_to_touch'];
  for (const key of Object.keys(intent)) {
    if (!lawful.includes(key)) errors.push(`unlawful key: ${key}`);
  }
  if (typeof intent.intent !== 'string' || intent.intent.length < 12 || intent.intent.length > 200) {
    errors.push('intent must be one sentence of 12-200 characters');
  }
  const arrays = [['secrets_held', 4], ['threads_to_touch', 3], ['forbidden_repeats', 5]];
  for (const [key, cap] of arrays) {
    const rows = intent[key];
    if (!Array.isArray(rows) || rows.length > cap || rows.some((row) => typeof row !== 'string' || !row.length || row.length > 120)) {
      errors.push(`${key} must be an array of at most ${cap} short strings`);
    }
  }
  if (!MEASURES.includes(intent.measure)) errors.push('measure must be lean, standard, or rich');
  if (!Number.isInteger(intent.beat_index) || intent.beat_index < 0) errors.push('beat_index must seat the intent');
  // Threads named must be threads the ledger holds — judged only when
  // the briefing actually carries a ledger (absent evidence, out of session).
  if (Array.isArray(threads) && Array.isArray(intent.threads_to_touch)) {
    const held = new Set(threads);
    for (const name of intent.threads_to_touch) {
      if (typeof name === 'string' && !held.has(name)) errors.push(`threads_to_touch names no ledger thread: ${name}`);
    }
  }
  return { ok: !errors.length, errors };
}

// LAW IV/V — the measure mapping, stated as one deterministic law:
// arrivals (beat 0), act turns, and the final revelation run rich; the
// quiet connective stride runs lean; most beats run standard. Rhythm
// follows by construction: two rich beats may only touch across an
// act turn — the named exception.
export function measureForBeat(beats, index) {
  const rows = Array.isArray(beats) ? beats : [];
  if (!rows.length) return 'standard';
  const at = Math.min(Math.max(index, 0), rows.length - 1);
  const actTurnAt = (i) => i > 0 && (rows[i]?.act || 1) !== (rows[i - 1]?.act || 1);
  const richAt = (i) => i === 0 || i === rows.length - 1 || actTurnAt(i);
  if (richAt(at)) {
    // THE RHYTHM (Law V): two rich pages may touch only across an act
    // turn — a rich seat whose neighbor ran rich without one steps down.
    if (at > 0 && richAt(at - 1) && !actTurnAt(at)) return 'standard';
    return 'rich';
  }
  if (at % 3 === 2) return 'lean';
  return 'standard';
}

// The deterministic Director — the mock tier's seat, and the floor the
// live seat degrades to. Seeded entirely by the briefing: beat index,
// spine, and the thread ledger. Byte-stable across sittings.
export function mockDirector(input, beatIndex) {
  const beats = input?.spine?.beats || [];
  const at = Number.isInteger(beatIndex) ? beatIndex : 0;
  const beat = beats[at] || beats[beats.length - 1] || {};
  const title = typeof beat.title === 'string' && beat.title ? beat.title : 'the road ahead';
  const goal = typeof beat.goal === 'string' && beat.goal ? beat.goal : 'carry the tale forward';
  let line = `Advance "${title}" toward its goal: ${goal}`;
  if (line.length > 200) line = `${line.slice(0, 199)}…`.slice(0, 200);
  if (line.length < 12) line = 'Advance the standing chapter toward its goal.';
  const threads = threadNames(input?.story) || [];
  return {
    intent: line,
    secrets_held: [],
    threads_to_touch: threads.slice(0, 2),
    forbidden_repeats: [],
    measure: measureForBeat(beats, at),
    beat_index: at
  };
}

// The live Director: one temperature-zero strict-JSON sitting through
// the standing provider plan. Any refusal, error, or unlawful word
// falls to the deterministic floor — the table is never stalled and
// never darkened by its planner.
const intentToolSchema = {
  type: 'object', additionalProperties: false,
  required: ['intent', 'secrets_held', 'threads_to_touch', 'forbidden_repeats', 'measure'],
  properties: {
    intent: { type: 'string', minLength: 12, maxLength: 200, description: 'One sentence: what this beat must accomplish this turn.' },
    secrets_held: { type: 'array', maxItems: 4, items: { type: 'string', maxLength: 120 }, description: 'Truths the narration may know but must not say.' },
    threads_to_touch: { type: 'array', maxItems: 3, items: { type: 'string', maxLength: 120 }, description: 'EXACT names of open threads from the briefing that are overdue for payoff.' },
    forbidden_repeats: { type: 'array', maxItems: 5, items: { type: 'string', maxLength: 120 }, description: 'Motifs recently overused; the Voice must refuse them.' },
    measure: { type: 'string', enum: MEASURES, description: 'lean: quiet connective. standard: most beats. rich: arrivals, revelations, act turns.' }
  }
};

const directorBrief = (input, beatIndex) =>
  `[SPINE]\n${JSON.stringify(input.spine || null)}\n[BEAT_INDEX]\n${beatIndex}\n[STORY]\n${JSON.stringify(input.story || null)}\n[DIRECTION]\nSit as the Director of this campaign. Hand down beat_intent for the standing beat — one intent sentence, secrets to hold, open threads (exact ledger names only) overdue for motion, motifs to forbid, and the measure by its law: lean for quiet connective beats, standard for most, rich for arrivals, revelations, and act turns.`;

async function anthropicIntent(input, beatIndex) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.DIRECTOR_MODEL || process.env.DM_MODEL || 'claude-sonnet-4-6',
      max_tokens: 400, temperature: 0,
      system: [{ type: 'text', text: buildSystemPrompt(input) }],
      messages: [{ role: 'user', content: [{ type: 'text', text: directorBrief(input, beatIndex) }] }],
      tools: [{ name: 'beat_intent', description: "The Director's only valid word.", input_schema: intentToolSchema }],
      tool_choice: { type: 'tool', name: 'beat_intent' }
    })
  });
  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${await response.text()}`);
  const json = await response.json();
  return json.content?.find((item) => item.type === 'tool_use' && item.name === 'beat_intent')?.input;
}

async function openaiIntent(input, beatIndex) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.DIRECTOR_MODEL_OPENAI || process.env.DM_MODEL_OPENAI || 'gpt-4o',
      max_tokens: 400, temperature: 0,
      messages: [
        { role: 'system', content: buildSystemPrompt(input) },
        { role: 'user', content: directorBrief(input, beatIndex) }
      ],
      tools: [{ type: 'function', function: { name: 'beat_intent', description: "The Director's only valid word.", parameters: intentToolSchema } }],
      tool_choice: { type: 'function', function: { name: 'beat_intent' } }
    })
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  const json = await response.json();
  const call = json.choices?.[0]?.message?.tool_calls?.find((t) => t.function?.name === 'beat_intent');
  if (!call) throw new Error('OpenAI returned no beat_intent tool call');
  return JSON.parse(call.function.arguments);
}

async function directorSits(input, beatIndex, { barred = {} } = {}) {
  const plan = dmPlan(barred);
  if (plan[0] === 'mock') return mockDirector(input, beatIndex);
  const threads = threadNames(input?.story);
  for (const provider of plan) {
    if (provider === 'mock') break;
    try {
      const raw = provider === 'anthropic' ? await anthropicIntent(input, beatIndex) : await openaiIntent(input, beatIndex);
      const seated = { ...raw, beat_index: Number.isInteger(beatIndex) ? beatIndex : 0 };
      if (validateBeatIntent(seated, { threads }).ok) return seated;
    } catch (error) {
      console.error('The Director lost its voice:', error?.message || error);
    }
  }
  return mockDirector(input, beatIndex);
}

// The standing beat index as the briefing carries it. Absent evidence
// yields null: the Director sits fresh (honestly counted) and the
// cache never falsely matches.
export function beatIndexOf(input) {
  const at = input?.story?.beat?.index;
  return Number.isInteger(at) && at >= 0 ? at : null;
}

// ------------------------------------------------------------
// THE EDITOR — Directive XI, Laws VI–VIII. The second seat.
// A deterministic pre-pass judges every draft for free; the judged
// pass sits only on a flag or at the sampling law; one revision
// maximum; a twice-refused draft SHIPS, attested. All of it behind
// the curtain — the player never witnesses the room arguing.
// ------------------------------------------------------------

// Fold for the Editor's ear: case down, punctuation and hyphens to
// spaces, one space between words — "fen-light" and "fen light" are
// one sound in this court.
export function foldProse(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const narrationOf = (turn) => (Array.isArray(turn?.narration_blocks)
  ? turn.narration_blocks.map((block) => (block && typeof block.text === 'string' ? block.text : '')).join(' ')
  : '');

// LAW VI — THE ECHO CHECK. Any 8-word folded run shared verbatim with
// the narration of the last 20 sealed pages flags. ONE shared run is
// the pinned threshold.
export function echoCheck(draftText, priorPages = []) {
  const words = foldProse(draftText).split(' ').filter(Boolean);
  if (words.length < 8) return false;
  const seen = new Set();
  for (const page of (Array.isArray(priorPages) ? priorPages : []).slice(-20)) {
    const prior = foldProse(page).split(' ').filter(Boolean);
    for (let i = 0; i + 8 <= prior.length; i += 1) seen.add(prior.slice(i, i + 8).join(' '));
  }
  if (!seen.size) return false;
  for (let i = 0; i + 8 <= words.length; i += 1) {
    if (seen.has(words.slice(i, i + 8).join(' '))) return true;
  }
  return false;
}

// LAW VI — THE CLICHE CHECK. The lexicon is pinned fixture data
// (instrument matter, not prompt law — LISTLESS LEGISLATION stands).
// More than 2 hits per 1,000 narration characters flags. Matches are
// whole-word runs in the folded prose.
const CLICHE_LEXICON = Object.freeze(
  JSON.parse(readFileSync(new URL('./cliche-lexicon.json', import.meta.url), 'utf8'))
    .phrases.map((phrase) => foldProse(phrase)).filter(Boolean)
);
export function clicheCheck(draftText, lexicon = CLICHE_LEXICON) {
  const chars = String(draftText || '').length;
  if (!chars) return { flagged: false, hits: 0 };
  const bed = ` ${foldProse(draftText)} `;
  let hits = 0;
  for (const phrase of lexicon) {
    const needle = ` ${phrase} `;
    let at = bed.indexOf(needle);
    while (at !== -1) { hits += 1; at = bed.indexOf(needle, at + phrase.length + 1); }
  }
  return { flagged: hits > (chars / 1000) * 2, hits };
}

// LAW VI — THE SUGGESTION-SAMENESS CHECK. Token-set Jaccard ≥ 0.80
// between any two roads of the draft, or between any draft road and
// any road of the prior turn, flags.
export function jaccard(a, b) {
  const setA = new Set(foldProse(a).split(' ').filter(Boolean));
  const setB = new Set(foldProse(b).split(' ').filter(Boolean));
  if (!setA.size && !setB.size) return 1;
  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared += 1;
  return shared / (setA.size + setB.size - shared);
}
export function samenessCheck(suggestions = [], priorSuggestions = []) {
  const rows = (Array.isArray(suggestions) ? suggestions : []).filter((s) => typeof s === 'string' && s.trim());
  const prior = (Array.isArray(priorSuggestions) ? priorSuggestions : []).filter((s) => typeof s === 'string' && s.trim());
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) if (jaccard(rows[i], rows[j]) >= 0.8) return true;
    for (const old of prior) if (jaccard(rows[i], old) >= 0.8) return true;
  }
  return false;
}

// LAW VI — THE MEASURE CHECK. Outside the assigned band flags
// `measure`; below a rich band it is named `under-measure`.
export function measureCheck(blockCount, measure) {
  const band = MEASURE_BANDS[measure];
  if (!band) return null;
  const [floor, ceiling] = band;
  if (blockCount >= floor && blockCount <= ceiling) return null;
  if (measure === 'rich' && blockCount < floor) return 'under-measure';
  return 'measure';
}

// The docket — evidence drawn from what the briefing already carries:
// assistant history rows ARE the prior sealed narration; the prior
// turn's roads ride story.prior_suggestions additively (older clients
// simply leave that court out of session).
export function editorEvidence(input) {
  const priorPages = (Array.isArray(input?.history) ? input.history : [])
    .filter((m) => m && m.role === 'assistant' && typeof m.content === 'string' && m.content.trim())
    .slice(-20)
    .map((m) => m.content);
  const rows = input?.story?.prior_suggestions;
  const priorSuggestions = Array.isArray(rows) ? rows.filter((s) => typeof s === 'string') : [];
  return { priorPages, priorSuggestions };
}

// LAW VI — the pre-pass whole: deterministic, free, every draft.
// Flag order is pinned: echo, cliche, sameness, measure.
export function editorPrePass(turn, { intent = null, priorPages = [], priorSuggestions = [], lexicon = CLICHE_LEXICON } = {}) {
  const flags = [];
  const prose = narrationOf(turn);
  if (echoCheck(prose, priorPages)) flags.push('echo');
  if (clicheCheck(prose, lexicon).flagged) flags.push('cliche');
  if (samenessCheck(turn?.suggestions, priorSuggestions)) flags.push('sameness');
  const measured = intent && MEASURES.includes(intent.measure)
    ? measureCheck(Array.isArray(turn?.narration_blocks) ? turn.narration_blocks.length : 0, intent.measure)
    : null;
  if (measured) flags.push(measured);
  return flags;
}

// LAW VII — the rubric, pinned byte-stable. The proving loop's
// calibration probe judges THIS text; it may not drift.
export const EDITOR_RUBRIC = 'You are the Editor of a living campaign. Judge the drafted page against the room: voice held steady per the cards; stakes true to the beat_intent; freshness against the recent pages and roads; fullness against the assigned measure. Verdict ship only when all four hold. Verdict revise otherwise, naming each failure as one reason with quoted evidence.';

const verdictToolSchema = {
  type: 'object', additionalProperties: false, required: ['verdict', 'reasons'],
  properties: {
    verdict: { type: 'string', enum: ['ship', 'revise'], description: 'ship when the page holds; revise when it must be redrafted.' },
    reasons: { type: 'array', maxItems: 4, items: { type: 'string', maxLength: 200 }, description: 'One reason per failure, each quoting two words of evidence.' }
  }
};

const REASON_LINES = {
  echo: 'echo: an eight-word run repeats a recent page verbatim',
  cliche: 'cliche: stock phrasing crowds the page past the pinned density',
  sameness: 'sameness: two roads offered are nearly the same road',
  measure: 'measure: the page lands outside its assigned band',
  'under-measure': 'under-measure: thin prose on a beat assigned rich'
};

// The deterministic Editor — the mock tier's judge and the floor the
// live judge degrades to. Flags in, verdict out, byte-stable.
export function mockEditor(flags = []) {
  if (!flags.length) return { verdict: 'ship', reasons: [] };
  return { verdict: 'revise', reasons: flags.map((flag) => REASON_LINES[flag] || `flagged: ${flag}`) };
}

const editorBrief = (draft, context) =>
  `[DRAFT]\n${JSON.stringify({ narration_blocks: draft.narration_blocks, suggestions: draft.suggestions })}\n[BEAT_INTENT]\n${JSON.stringify(context.intent || null)}\n[FLAGS]\n${JSON.stringify(context.flags)}\n[RECENT_PAGES]\n${JSON.stringify((context.priorPages || []).slice(-5))}\n[PRIOR_ROADS]\n${JSON.stringify(context.priorSuggestions || [])}\n[DIRECTION]\nJudge the draft and return your verdict.`;

async function anthropicVerdict(draft, context) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.EDITOR_MODEL || 'claude-haiku-4-5',
      max_tokens: 300, temperature: 0,
      system: [{ type: 'text', text: EDITOR_RUBRIC }],
      messages: [{ role: 'user', content: [{ type: 'text', text: editorBrief(draft, context) }] }],
      tools: [{ name: 'editor_verdict', description: "The Editor's only valid word.", input_schema: verdictToolSchema }],
      tool_choice: { type: 'tool', name: 'editor_verdict' }
    })
  });
  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${await response.text()}`);
  const json = await response.json();
  return json.content?.find((item) => item.type === 'tool_use' && item.name === 'editor_verdict')?.input;
}

async function openaiVerdict(draft, context) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.EDITOR_MODEL_OPENAI || 'gpt-4o-mini',
      max_tokens: 300, temperature: 0,
      messages: [
        { role: 'system', content: EDITOR_RUBRIC },
        { role: 'user', content: editorBrief(draft, context) }
      ],
      tools: [{ type: 'function', function: { name: 'editor_verdict', description: "The Editor's only valid word.", parameters: verdictToolSchema } }],
      tool_choice: { type: 'function', function: { name: 'editor_verdict' } }
    })
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  const json = await response.json();
  const call = json.choices?.[0]?.message?.tool_calls?.find((t) => t.function?.name === 'editor_verdict');
  if (!call) throw new Error('OpenAI returned no editor_verdict tool call');
  return JSON.parse(call.function.arguments);
}

// LAW VII — the judged pass. One temperature-zero sitting; a cheaper
// model is sanctioned; any refusal or unlawful word falls to the
// deterministic floor. The table is never stalled by its Editor.
async function editorJudges(draft, context, { barred = {} } = {}) {
  const plan = dmPlan(barred);
  if (plan[0] === 'mock') return mockEditor(context.flags);
  for (const provider of plan) {
    if (provider === 'mock') break;
    try {
      const raw = provider === 'anthropic' ? await anthropicVerdict(draft, context) : await openaiVerdict(draft, context);
      if (raw && (raw.verdict === 'ship' || raw.verdict === 'revise') && Array.isArray(raw.reasons)) {
        return { verdict: raw.verdict, reasons: raw.reasons.filter((row) => typeof row === 'string').slice(0, 4) };
      }
    } catch (error) {
      console.error('The Editor lost its voice:', error?.message || error);
    }
  }
  return mockEditor(context.flags);
}

// THE ROOM CONVENES — one door in, one sealed turn out.
export async function convene(input, { barred = {} } = {}) {
  const beatIndex = beatIndexOf(input);
  const carried = input?.story?.beat_intent;
  const threads = threadNames(input?.story);
  let intent = null;
  let directorCalls = 0;
  if (carried && Number.isInteger(beatIndex) && carried.beat_index === beatIndex && validateBeatIntent(carried, { threads }).ok) {
    intent = carried;
  } else {
    directorCalls = 1;
    intent = await directorSits(input, beatIndex, { barred });
    if (!validateBeatIntent(intent, { threads }).ok) intent = mockDirector(input, beatIndex);
  }
  // The Director's word rides the one briefing block the Voice already
  // reads — no second channel exists.
  const roomInput = { ...input, story: { ...(input.story || {}), beat_intent: intent } };
  const result = await getDmTurn(roomInput, { barred });

  // LAWS VI–VIII — the Editor's seat, wholly behind the curtain. The
  // pre-pass is free and judges every draft; the judged pass sits only
  // on a flag or at the sampling law (every 7th turn, deterministic);
  // a revise verdict buys exactly one redraft; a twice-refused draft
  // ships with its flags and verdict attested.
  const { priorPages, priorSuggestions } = editorEvidence(input);
  const court = { intent, priorPages, priorSuggestions };
  let sealed = result;
  let flags = sealed?.turn ? editorPrePass(sealed.turn, court) : [];
  // LAW IX — the Art Director's sittings are counted as the drafts
  // arrive: one for any draft that carried a plate, one more if the
  // redraft carried one too. The chair itself sits inside the door
  // (pre-validator); the room only keeps the ledger honest.
  let artDirectorCalls = plateDue(sealed?.turn) ? 1 : 0;
  let editorCalls = 0;
  let revisions = 0;
  let verdict = null;
  const turnNo = Number.isInteger(input?.turn) ? input.turn : null;
  const sampled = turnNo !== null && turnNo % 7 === 0;
  if (sealed?.turn && (flags.length || sampled)) {
    editorCalls += 1;
    verdict = await editorJudges(sealed.turn, { ...court, flags }, { barred });
    if (verdict.verdict === 'revise') {
      editorCalls += 1;
      revisions = 1;
      const revisionInput = { ...roomInput, story: { ...roomInput.story, editor_note: { reasons: verdict.reasons, flags } } };
      const redraft = await getDmTurn(revisionInput, { barred });
      if (redraft?.turn) {
        sealed = redraft;
        flags = editorPrePass(redraft.turn, court);
        artDirectorCalls += plateDue(redraft.turn) ? 1 : 0;
      }
    }
  }
  return {
    ...sealed,
    beat_intent: intent,
    // LAW XI — the room's ledger: counters written as the calls are
    // spent, never reconstructed. All three chairs are seated now:
    // the Director's intent, the Editor's judged passes, the Art
    // Director's plate sittings. `flags` attests the SHIPPED page's
    // standing flags — a twice-refused draft wears them honestly.
    room_ledger: {
      beat_index: Number.isInteger(beatIndex) ? beatIndex : (intent.beat_index ?? 0),
      director_calls: directorCalls,
      editor_calls: editorCalls,
      art_director_calls: artDirectorCalls,
      revisions,
      flags,
      editor_verdict: verdict ? verdict.verdict : null
    }
  };
}
