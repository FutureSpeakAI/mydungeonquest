import { romanNumeral } from './story.js';

// ------------------------------------------------------------
// THE CHRONICLER — the second, smaller harness (directive §7).
// Retelling is exactly the kind of work a model will embellish,
// so the reteller lives under its own three laws:
//   1. IT MAY NOT INVENT — every passage cites the sealed turn
//      range it retells; every name it uses (declared OR standing
//      in the prose itself) must exist in the codex.
//   2. IT MAY NOT CONTRADICT — dice totals come only from sealed
//      resolutions; the dead are not quoted after the turn that
//      killed them.
//   3. IT MAY ONLY RETELL — quoted speech comes VERBATIM from the
//      sealed record, declared in `quotes`, and a quotation may be
//      faithfully fragmented but never extended; numbers live in
//      the margins (`dice_moments`), never in the prose.
// The validator is shared verbatim by the client turn path, the
// server repair-retry path, and the proving ground — one law,
// three courts. When the Chronicler cannot speak lawfully, the
// tale falls back to its own sealed text: the book always exists.
// ------------------------------------------------------------

export const CHRONICLE_LIMITS = {
  title: 80, passage: 1600, words_min: 30, words_max: 220,
  mentions: 24, mention: 80, quotes: 8, quote_line: 240, dice: 6, dice_label: 80
};

const PASSAGE_KEYS = new Set(['title', 'passage', 'cites', 'mentions', 'quotes', 'dice_moments']);

const canon = (value) => String(value ?? '').trim().toLowerCase();
const firstName = (value) => canon(value).split(/\s+/)[0] || '';
const cleanText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
// Verbatim comparison forgives typography, never wording: smart quotes fold to
// plain, whitespace collapses, case yields — the words themselves must match.
const norm = (value) => String(value ?? '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();

function assert(condition, message, errors) { if (!condition) errors.push(message); }

// Alias-aware name resolution, mirroring the cast law: an exact canonical
// match first, then a unique bare-first-name alias. Ambiguity resolves to
// nobody — the Chronicler does not get to guess either.
function resolveName(names, raw) {
  const name = canon(raw);
  if (!name) return null;
  const exact = names.find((entry) => canon(entry) === name);
  if (exact) return exact;
  const aliased = names.filter((entry) => firstName(entry) === name);
  return aliased.length === 1 ? aliased[0] : null;
}

// context — the sealed evidence the passage is judged against:
//   range:  { from, to }        the turns the caller asked to be retold
//   names:  [string]            every name that exists (hero, cast, regions…)
//   corpus: [{ turn, texts, lines }]  the sealed words of each turn in range;
//           `lines` maps canonical speaker → [their sealed words]
//   deaths: [{ name, turn }]    when each fallen soul fell (-1: before canon —
//                               unquotable at any turn)
//   totals: [{ turn, total }]   every die the sealed record shows
export function validateChroniclePassage(payload, context = {}) {
  const errors = [];
  assert(payload && typeof payload === 'object' && !Array.isArray(payload), 'payload must be an object', errors);
  if (!payload || typeof payload !== 'object') return { ok: false, errors };
  for (const key of Object.keys(payload)) if (!PASSAGE_KEYS.has(key)) errors.push(`chronicle_passage.${key} is not allowed`);
  for (const key of PASSAGE_KEYS) assert(Object.hasOwn(payload, key), `${key} is required`, errors);

  const range = context.range || { from: 0, to: Number.MAX_SAFE_INTEGER };
  const names = Array.isArray(context.names) ? context.names : [];
  const corpus = Array.isArray(context.corpus) ? context.corpus : [];
  const deaths = Array.isArray(context.deaths) ? context.deaths : [];
  const totals = Array.isArray(context.totals) ? context.totals : [];
  const corpusAt = (turn) => corpus.find((entry) => entry.turn === turn);

  assert(cleanText(payload.title, CHRONICLE_LIMITS.title), 'title invalid', errors);
  assert(cleanText(payload.passage, CHRONICLE_LIMITS.passage), 'passage invalid', errors);
  const words = String(payload.passage || '').trim().split(/\s+/).filter(Boolean).length;
  assert(words >= CHRONICLE_LIMITS.words_min && words <= CHRONICLE_LIMITS.words_max, `passage must be ${CHRONICLE_LIMITS.words_min}-${CHRONICLE_LIMITS.words_max} words (received ${words})`, errors);

  // LAW 1a — the citation. A passage that does not say which sealed turns it
  // retells is not a retelling; it is an invention with good manners.
  const cites = payload.cites;
  const citesOk = cites && typeof cites === 'object' && Number.isInteger(cites.from_turn) && Number.isInteger(cites.to_turn)
    && cites.from_turn <= cites.to_turn && cites.from_turn >= range.from && cites.to_turn <= range.to;
  assert(citesOk, `cites must name the sealed turn range being retold (within turns ${range.from}-${range.to})`, errors);

  // LAW 1b — the declared names. Every declared mention must exist in the
  // codex. Unknown names are inventions.
  assert(Array.isArray(payload.mentions) && payload.mentions.length <= CHRONICLE_LIMITS.mentions, `mentions must be an array of at most ${CHRONICLE_LIMITS.mentions}`, errors);
  for (const mention of Array.isArray(payload.mentions) ? payload.mentions : []) {
    if (!cleanText(mention, CHRONICLE_LIMITS.mention)) { errors.push('mentions entries must be short non-empty strings'); continue; }
    assert(resolveName(names, mention), `invented name: "${mention}" is not in the codex — the Chronicler may not invent`, errors);
  }

  // LAW 2 & 3 — the quotes. Each declared quote must appear VERBATIM among
  // the sealed words OF THAT SPEAKER at the cited turn; the dead are not
  // quoted after the turn that killed them (dying words in the killing turn
  // itself are honored, as at the table). A declared line may be a contiguous
  // FRAGMENT of a sealed utterance — fragmenting is faithful; extending is
  // forgery (LAW 3b closes the other direction).
  // One further forgiveness: a quotation folded into prose trades its period
  // for a comma ("…keeps you," she warned) — punctuation at the EDGES of a
  // quote is typography, not wording. Interior wording remains law.
  const soft = (value) => norm(value).replace(/^[\s"'.,;:!?…—–-]+|[\s"'.,;:!?…—–-]+$/g, '');
  assert(Array.isArray(payload.quotes) && payload.quotes.length <= CHRONICLE_LIMITS.quotes, `quotes must be an array of at most ${CHRONICLE_LIMITS.quotes}`, errors);
  for (const [index, quote] of (Array.isArray(payload.quotes) ? payload.quotes : []).entries()) {
    const path = `quotes[${index}]`;
    if (!quote || typeof quote !== 'object') { errors.push(`${path} invalid`); continue; }
    assert(cleanText(quote.speaker, CHRONICLE_LIMITS.mention), `${path}.speaker invalid`, errors);
    assert(cleanText(quote.line, CHRONICLE_LIMITS.quote_line), `${path}.line invalid`, errors);
    if (!Number.isInteger(quote.turn) || (citesOk && (quote.turn < cites.from_turn || quote.turn > cites.to_turn))) {
      errors.push(`${path}.turn must be an integer inside the cited range`); continue;
    }
    const speaker = resolveName(names, quote.speaker);
    if (!speaker) { errors.push(`${path}: invented speaker "${quote.speaker}"`); continue; }
    const death = deaths.find((d) => canon(d.name) === canon(speaker) || firstName(d.name) === firstName(speaker));
    if (death && Number.isInteger(death.turn) && quote.turn > death.turn) {
      errors.push(`${path}: the dead do not speak — ${speaker} fell ${death.turn >= 0 ? `on turn ${death.turn}` : 'before these turns'} and cannot be quoted on turn ${quote.turn}`);
      continue;
    }
    const spoken = corpusAt(quote.turn)?.lines?.[canon(speaker)] || [];
    assert(soft(quote.line) && spoken.some((line) => soft(line).includes(soft(quote.line))), `${path}: not verbatim — the sealed record of turn ${quote.turn} does not contain those words from ${speaker}`, errors);
  }

  // LAW 3b — undeclared or extended speech. Any quoted span inside the
  // passage prose must live INSIDE a declared line (span ⊆ declared ⊆ sealed
  // — an inclusion chain nothing can widen). `span.includes(line)` is
  // deliberately absent: that direction would let a passage EXTEND a declared
  // quote with words nobody spoke. Spans shorter than two words are treated
  // as scare-quote typography, not dialogue.
  const declared = (Array.isArray(payload.quotes) ? payload.quotes : []).map((quote) => soft(quote?.line)).filter(Boolean);
  const spans = String(payload.passage || '').match(/["“”][^"“”]{8,240}["“”]/g) || [];
  for (const rawSpan of spans) {
    const span = soft(rawSpan.slice(1, -1));
    if (!span || !span.includes(' ')) continue;
    assert(declared.some((line) => line.includes(span)), `undeclared quotation in passage: ${rawSpan.slice(0, 60)}… — quoted speech must live inside a declared verbatim quote, never extended beyond it`, errors);
  }

  // LAW 1c — the prose itself is scanned for inventions. Any capitalized word
  // standing mid-sentence must be (or belong to) a codex name. Sentence
  // openings and quote openings are exempt — quote CONTENTS are already
  // chained to sealed lines by LAW 3b, so stripped quotes leave a quote mark
  // behind to exempt what follows. A declared quote whose edge punctuation
  // flexed past the exact strip fails conservative: repair rewrites it.
  const knownWords = new Set(names.flatMap((name) => canon(name).split(/[\s'’-]+/)).filter((word) => word.length >= 2));
  let scan = String(payload.passage || '');
  for (const line of (Array.isArray(payload.quotes) ? payload.quotes : []).map((quote) => String(quote?.line || ''))) {
    if (line) scan = scan.split(line).join(' " ');
  }
  const tokenPattern = /[A-Z][a-zA-Z'’-]+/g;
  let token;
  while ((token = tokenPattern.exec(scan)) !== null) {
    const before = scan.slice(0, token.index).replace(/[\s(]+$/, '');
    if (!before || /[.!?…:\n"“”'‘’]$/.test(before)) continue;
    const word = canon(token[0]).replace(/['’]s$/, '');
    const parts = [word, ...word.split(/[-'’]/)].filter(Boolean);
    const lawful = parts.some((part) => knownWords.has(part) || names.some((name) => canon(name).includes(part)));
    assert(lawful, `invented name in the telling: "${token[0]}" is not in the codex — the Chronicler may not invent`, errors);
  }

  // LAW 2b — the dice. The margins may only show dice the sealed record shows.
  assert(Array.isArray(payload.dice_moments) && payload.dice_moments.length <= CHRONICLE_LIMITS.dice, `dice_moments must be an array of at most ${CHRONICLE_LIMITS.dice}`, errors);
  for (const [index, moment] of (Array.isArray(payload.dice_moments) ? payload.dice_moments : []).entries()) {
    const path = `dice_moments[${index}]`;
    if (!moment || typeof moment !== 'object') { errors.push(`${path} invalid`); continue; }
    assert(cleanText(moment.label, CHRONICLE_LIMITS.dice_label), `${path}.label invalid`, errors);
    const found = Number.isInteger(moment.turn) && Number.isInteger(moment.total)
      && totals.some((entry) => entry.turn === moment.turn && entry.total === moment.total);
    assert(found, `${path}: the die never showed — no sealed resolution of turn ${moment?.turn} totals ${moment?.total}`, errors);
  }

  // LAW 3c — numbers belong to the margins. Digits may survive in the prose
  // only inside a known name or a declared verbatim quote; any digit left
  // after those are stripped is mechanics leaking into the telling.
  let prose = String(payload.passage || '');
  for (const line of (Array.isArray(payload.quotes) ? payload.quotes : []).map((quote) => String(quote?.line || ''))) {
    if (line) prose = prose.split(line).join(' ');
  }
  for (const name of [...names].sort((a, b) => b.length - a.length)) {
    if (name) prose = prose.split(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')).join(' ');
  }
  assert(!/\d/.test(prose), 'numbers belong to the margins (dice_moments), not the prose — write numbers out or cite the die', errors);

  return { ok: errors.length === 0, errors };
}

// Build the sealed evidence for one chapter's retelling from a campaign.
// Returns null when there is nothing to retell. Redacted turns are outside
// active canon and never reach the Chronicler — not their words, not their
// deaths, nothing.
export function buildChronicleRequest(campaign, closedBeatIndex) {
  const logs = Array.isArray(campaign?.logs) ? campaign.logs : [];
  if (!logs.length) return null;
  let from = logs.findIndex((log) => !log.redacted && (log.beatIndex ?? 0) === closedBeatIndex);
  if (from < 0) from = Math.max(0, logs.length - 1);
  const to = logs.length - 1;

  const heroName = campaign.hero?.name || 'the hero';
  const names = [heroName, campaign.title, campaign.homeRegion,
    ...(campaign.codex?.cast || []).map((soul) => soul.name),
    ...(campaign.codex?.regions || []).map((region) => region.name)
  ].filter((name) => typeof name === 'string' && name.trim());

  const corpus = [];
  const totals = [];
  const deaths = [];
  for (let i = 0; i < logs.length; i += 1) {
    const log = logs[i];
    if (log.redacted) continue;
    for (const patch of log.dm?.story?.cast_update || []) {
      if (canon(patch?.status) === 'dead' && patch?.name) deaths.push({ name: patch.name, turn: i });
    }
    if (i < from || i > to) continue;
    const texts = [];
    const lines = {};
    const spoke = (speaker, text) => {
      const key = canon(resolveName(names, speaker) || speaker);
      if (!key || !text) return;
      lines[key] = [...(lines[key] || []), text];
    };
    if (log.player) { texts.push(log.player); spoke(heroName, log.player); }
    for (const block of log.dm?.narration_blocks || []) {
      if (!block?.text) continue;
      texts.push(block.text);
      if (block.speaker) spoke(block.speaker, block.text);
    }
    if (log.dm?.dialogue_cue?.line) { texts.push(log.dm.dialogue_cue.line); spoke(log.dm.dialogue_cue.speaker, log.dm.dialogue_cue.line); }
    if (log.resolution?.total != null) totals.push({ turn: i, total: log.resolution.total });
    corpus.push({ turn: i, texts, lines });
  }
  if (!corpus.length) return null;

  // A soul the codex holds dead whose fall was never sealed in an UNREDACTED
  // turn gets the conservative reading: unquotable at any turn (turn -1).
  // Deliberately NO fallback to codex facts for a date — a fall whose only
  // record was redacted must not resurface here, not even as a turn number.
  for (const soul of campaign.codex?.cast || []) {
    if (canon(soul.status) !== 'dead') continue;
    if (deaths.some((death) => canon(death.name) === canon(soul.name))) continue;
    deaths.push({ name: soul.name, turn: -1 });
  }

  const beat = campaign.codex?.spine?.beats?.[closedBeatIndex] || {};
  const chapter = {
    index: closedBeatIndex,
    numeral: romanNumeral(closedBeatIndex + 1),
    title: beat.title || 'A Turn of the Road',
    goal: beat.goal || '',
    act: beat.act || 1
  };
  const range = { from, to };
  const context = { range, names, corpus, deaths, totals };
  // The page's seat: a chapter page anchors after the last row that can
  // close a chapter — a narrative turn — never after sealed time (a tick,
  // a span) or an annal. The dividers follow the page; the page follows
  // the prose: turn → page → the road moving on.
  let anchor = to;
  while (anchor > from && (logs[anchor]?.kind === 'tick' || logs[anchor]?.kind === 'span' || logs[anchor]?.kind === 'annal')) anchor -= 1;
  return {
    afterLogId: logs[anchor].id,
    context,
    body: {
      campaign: { title: campaign.title, tone: campaign.tone, styleBible: campaign.styleBible },
      chapter, range, names, corpus, deaths, totals
    }
  };
}

// One chapter, one page, one claim. The claim is taken SYNCHRONOUSLY (before
// any await) so two racing chapter-close paths in the same session cannot
// both seal a page; across sessions the persisted chroniclePages guard holds.
// Claims are per-session and deliberately never released — a chapter closes
// once, and a declined retelling stays declined until the book binds raw.
const closeClaims = new Set();
export function claimChapterClose(campaignId, beatIndex) {
  const key = `${campaignId}:${beatIndex}`;
  if (closeClaims.has(key)) return false;
  closeClaims.add(key);
  return true;
}

// The fallback the laws promise: when no Chronicler can speak — keyless, or
// twice unlawful — the chapter page is the sealed text itself. The book
// always exists; it degrades to the beautiful raw chronicle, never to nothing.
export function rawChroniclePassage(context, chapter = null) {
  const corpus = Array.isArray(context?.corpus) ? context.corpus : [];
  const range = context?.range || { from: 0, to: Math.max(0, corpus.length - 1) };
  let passage = corpus.map((entry) => entry.texts?.find((text) => text && text.length > 40) || entry.texts?.[0] || '').filter(Boolean).join(' ');
  if (passage.length > 1100) {
    const cut = passage.slice(0, 1100);
    passage = cut.slice(0, cut.lastIndexOf('. ') + 1) || cut;
  }
  return {
    title: `The tale so far${chapter?.numeral ? ` — Chapter ${chapter.numeral}` : ''}`,
    passage: passage || 'The road was walked, and the journal holds every step.',
    cites: { from_turn: range.from, to_turn: range.to },
    mentions: [], quotes: [], dice_moments: [],
    raw: true, provider: 'sealed-text'
  };
}

// The Chronicler's charge — shared by the real providers and the repair
// path so the prompt can never drift from the validator (the lockstep law).
export function buildChroniclerPrompt(input) {
  const chapter = input.chapter || {};
  const transcript = (input.corpus || []).map((entry) => {
    const said = Object.entries(entry.lines || {}).map(([who, lines]) => lines.map((line) => `  ${who.toUpperCase()}: "${line}"`).join('\n')).filter(Boolean).join('\n');
    const die = (input.totals || []).filter((total) => total.turn === entry.turn).map((total) => `  THE DIE: total ${total.total}`).join('\n');
    return `— turn ${entry.turn} —\n${(entry.texts || []).map((text) => `  ${text}`).join('\n')}${said ? `\n${said}` : ''}${die ? `\n${die}` : ''}`;
  }).join('\n');
  return `You are THE CHRONICLER of MyDungeon.Quest — the keeper of the sealed record, retelling one chapter of a tale that has already happened. You are not the Dungeon Master. Nothing new happens in your pages.

YOUR THREE LAWS (a rules client rejects any passage that breaks them):
1. YOU MAY NOT INVENT. Cite the sealed turns you retell in \`cites\`. Declare every cast, region, or hero name you use in \`mentions\` — a name that is not in [NAMES] does not exist, and EVERY capitalized proper name in your prose must be a [NAMES] name.
2. YOU MAY NOT CONTRADICT. Dice appear only in \`dice_moments\`, and only with the exact sealed totals shown in the transcript. The fallen in [FALLEN] are not quoted after the turn they fell.
3. YOU MAY ONLY RETELL. Quoted speech comes verbatim, word for word, from the transcript — declare each quotation in \`quotes\` with its speaker and turn. Quote whole sealed lines or contiguous fragments of them; NEVER extend a quotation beyond the sealed words. Write no digits in the passage prose; write numbers out as words, or let the die speak from the margin.

VOICE: ${input.campaign?.styleBible || 'measured, warm, a storyteller at a fire'} — quiet past tense, second person for the hero. ${CHRONICLE_LIMITS.words_min}-${CHRONICLE_LIMITS.words_max} words. This is the "tale so far" page a reader finds at the chapter's close.

[CHAPTER]
Chapter ${chapter.numeral || '?'} — ${chapter.title || ''}${chapter.goal ? ` (${chapter.goal})` : ''} · Act ${chapter.act || 1}
[NAMES]
${(input.names || []).join(' | ')}
[FALLEN]
${(input.deaths || []).map((death) => `${death.name} — ${death.turn >= 0 ? `fell on turn ${death.turn}` : 'fell before these turns; may not be quoted here at all'}`).join('\n') || 'none'}
[SEALED TURNS ${input.range?.from ?? 0}-${input.range?.to ?? 0}]
${transcript}

Respond ONLY with the chronicle_passage tool call.`;
}
