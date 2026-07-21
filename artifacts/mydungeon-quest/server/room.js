// ------------------------------------------------------------
// THE WRITER'S ROOM — Directive XI, the table's door.
//
// The orchestrator behind the one door. The room's LAW — bands,
// courts, floors, and the pinned rubric — moved home with the parity
// cut (fatescript/room); this file keeps what only the table can
// hold: the provider seats and their keys, the pinned cliche lexicon
// (fixture data, loaded here and handed to the engine's courts at
// the door), and the convene itself.
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
import {
  MEASURES, foldProse, threadNames, ambitionNames, validateBeatIntent, mockDirector, beatIndexOf,
  editorEvidence, mockEditor, EDITOR_RUBRIC,
  clicheCheck as lawClicheCheck, editorPrePass as lawEditorPrePass
} from 'fatescript/room';
import { plateDue } from './artDirector.js';
import { getDmTurn, dmPlan } from './dm.js';
import { buildSystemPrompt } from '../src/lib/systemPrompt.js';
// THE HOUSE VOICE (XVII, Article V) — the one pinned source: dash and
// tells scans for the pre-pass, the mandatory-revise reason, and the
// live Editor's addendum all speak from src/lib/voice.js.
import { dashCheck, dashFoldTurn, proseOfTurn, DASH_REASON, EDITOR_ADDENDUM } from '../src/lib/voice.js';

// The law, re-spoken through the table's door so every gate, probe,
// and seat keeps its one import path.
export {
  MEASURES, MEASURE_BANDS, threadNames, ambitionNames, validateBeatIntent, measureForBeat,
  mockDirector, beatIndexOf, foldProse, echoCheck, jaccard, samenessCheck,
  measureCheck, editorEvidence, EDITOR_RUBRIC, mockEditor
} from 'fatescript/room';

// LAW VI — THE CLICHE LEXICON: pinned fixture data (instrument matter,
// not prompt law — LISTLESS LEGISLATION stands). Loaded once at the
// door, folded by the engine's own fold, and bound as the default
// instrument for every court this door serves.
const CLICHE_LEXICON = Object.freeze(
  JSON.parse(readFileSync(new URL('./cliche-lexicon.json', import.meta.url), 'utf8'))
    .phrases.map((phrase) => foldProse(phrase)).filter(Boolean)
);

// The engine's courts, with the table's instrument bound in — callers
// at this door judge with the pinned lexicon unless they hand their own.
export function clicheCheck(draftText, lexicon = CLICHE_LEXICON) {
  return lawClicheCheck(draftText, lexicon);
}

// THE TELLS LEXICON (XVII, Article V) — language-model tells, pinned
// fixture data like the cliche shelf above, judged through the SAME one
// instrument so the density ceiling is inherited, never mirrored.
const TELLS_LEXICON = Object.freeze(
  JSON.parse(readFileSync(new URL('./tells-lexicon.json', import.meta.url), 'utf8'))
    .phrases.map((phrase) => foldProse(phrase)).filter(Boolean)
);

export function editorPrePass(turn, opts = {}) {
  const flags = lawEditorPrePass(turn, { lexicon: CLICHE_LEXICON, ...opts });
  // XVII Article V — the deterministic house-voice scans ride the same
  // pre-pass, before any judged look: the dash law (mandatory revise at
  // the sitting) and the tells density court.
  const prose = proseOfTurn(turn);
  if (dashCheck(prose).flagged) flags.push('dash');
  if (lawClicheCheck(prose, TELLS_LEXICON).flagged) flags.push('tells');
  return flags;
}

// The live Director: one strict-JSON sitting through the standing
// provider plan. The Anthropic seat carries NO temperature dial — the
// family retired it (probed July 18, 2026: claude-sonnet-5 answers 400
// to any request carrying it, the same law the smith learned in 58B),
// and before the cure every live director ask was 400ing straight to
// the deterministic floor. The OpenAI understudy still honors its
// zero and keeps it. Any refusal, error, or unlawful word falls to
// the deterministic floor — the table is never stalled and never
// darkened by its planner.
const intentToolSchema = {
  type: 'object', additionalProperties: false,
  required: ['intent', 'secrets_held', 'threads_to_touch', 'forbidden_repeats', 'measure'],
  properties: {
    intent: { type: 'string', minLength: 12, maxLength: 200, description: 'One sentence: what this beat must accomplish this turn.' },
    secrets_held: { type: 'array', maxItems: 4, items: { type: 'string', maxLength: 120 }, description: 'Truths the narration may know but must not say.' },
    threads_to_touch: { type: 'array', maxItems: 3, items: { type: 'string', maxLength: 120 }, description: 'EXACT names of open threads from the briefing that are overdue for payoff.' },
    ambitions_served: { type: 'array', maxItems: 3, items: { type: 'string', maxLength: 200 }, description: 'EXACT texts of open ambitions from the briefing this beat serves — at least one whenever any stand open.' },
    forbidden_repeats: { type: 'array', maxItems: 5, items: { type: 'string', maxLength: 120 }, description: 'Motifs recently overused; the Voice must refuse them.' },
    measure: { type: 'string', enum: MEASURES, description: 'lean: quiet connective. standard: most beats. rich: arrivals, revelations, act turns.' }
  }
};

const directorBrief = (input, beatIndex) =>
  `[SPINE]\n${JSON.stringify(input.spine || null)}\n[BEAT_INDEX]\n${beatIndex}\n[STORY]\n${JSON.stringify(input.story || null)}\n[DIRECTION]\nSit as the Director of this campaign. Hand down beat_intent for the standing beat — one intent sentence, secrets to hold, open threads (exact ledger names only) overdue for motion, the open ambitions this beat serves (exact texts — at least one whenever any stand open), motifs to forbid, and the measure by its law: lean for quiet connective beats, standard for most, rich for arrivals, revelations, and act turns.`;

async function anthropicIntent(input, beatIndex) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.DIRECTOR_MODEL || process.env.DM_MODEL || 'claude-sonnet-4-6',
      max_tokens: 400, // no temperature: the family retired the dial (Directive XII §VIII)

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
  const ambitions = ambitionNames(input?.story);
  for (const provider of plan) {
    if (provider === 'mock') break;
    try {
      const raw = provider === 'anthropic' ? await anthropicIntent(input, beatIndex) : await openaiIntent(input, beatIndex);
      const seated = { ...raw, beat_index: Number.isInteger(beatIndex) ? beatIndex : 0 };
      if (validateBeatIntent(seated, { threads, ambitions }).ok) return seated;
    } catch (error) {
      console.error('The Director lost its voice:', error?.message || error);
    }
  }
  return mockDirector(input, beatIndex);
}

const verdictToolSchema = {
  type: 'object', additionalProperties: false, required: ['verdict', 'reasons'],
  properties: {
    verdict: { type: 'string', enum: ['ship', 'revise'], description: 'ship when the page holds; revise when it must be redrafted.' },
    reasons: { type: 'array', maxItems: 4, items: { type: 'string', maxLength: 200 }, description: 'One reason per failure, each quoting two words of evidence.' }
  }
};

const editorBrief = (draft, context) =>
  `[DRAFT]\n${JSON.stringify({ narration_blocks: draft.narration_blocks, suggestions: draft.suggestions })}\n[BEAT_INTENT]\n${JSON.stringify(context.intent || null)}\n[FLAGS]\n${JSON.stringify(context.flags)}\n[RECENT_PAGES]\n${JSON.stringify((context.priorPages || []).slice(-5))}\n[PRIOR_ROADS]\n${JSON.stringify(context.priorSuggestions || [])}\n[DIRECTION]\nJudge the draft and return your verdict.`;

async function anthropicVerdict(draft, context) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.EDITOR_MODEL || 'claude-haiku-4-5',
      max_tokens: 300, // no temperature: the family retired the dial (Directive XII §VIII)
      system: [{ type: 'text', text: EDITOR_RUBRIC }, { type: 'text', text: EDITOR_ADDENDUM }],
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
        { role: 'system', content: EDITOR_ADDENDUM },
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

// LAW VII — the judged pass. One judged sitting at determinism's edge —
// the Anthropic seat carries no temperature (the family retired the
// dial; a carried dial 400s at the door and the floor seats silently),
// the OpenAI seat still pins zero. A cheaper model is sanctioned; any
// refusal or unlawful word falls to the deterministic floor. The table
// is never stalled by its Editor.
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
  const ambitions = ambitionNames(input?.story);
  let intent = null;
  let directorCalls = 0;
  if (carried && Number.isInteger(beatIndex) && carried.beat_index === beatIndex && validateBeatIntent(carried, { threads, ambitions }).ok) {
    intent = carried;
  } else {
    directorCalls = 1;
    intent = await directorSits(input, beatIndex, { barred });
    if (!validateBeatIntent(intent, { threads, ambitions }).ok) intent = mockDirector(input, beatIndex);
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
    // THE DASH LAW (XVII, Article V) — a 'dash' flag is MANDATORY REVISE:
    // whatever the judged seat answered, the verdict is revise, and the
    // dash law stands among its named reasons.
    if (flags.includes('dash')) {
      const reasons = Array.isArray(verdict.reasons) ? verdict.reasons : [];
      if (verdict.verdict !== 'revise') verdict = { verdict: 'revise', reasons: [...reasons, DASH_REASON] };
      else if (!reasons.some((reason) => /dash/i.test(String(reason)))) verdict = { ...verdict, reasons: [...reasons, DASH_REASON] };
    }
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
  // THE DASH LAW's ship door — absolute and deterministic. A twice-refused
  // draft that still carries an em dash is folded here (the fold only ever
  // shrinks or holds length, so no validator ceiling breaks): ZERO em
  // dashes ship, keyless or keyed. The flags then re-attest the page as
  // it actually ships.
  if (sealed?.turn && dashCheck(proseOfTurn(sealed.turn)).flagged) {
    sealed = { ...sealed, turn: dashFoldTurn(sealed.turn) };
    flags = editorPrePass(sealed.turn, court);
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
