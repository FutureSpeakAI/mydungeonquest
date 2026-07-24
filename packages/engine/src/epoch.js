// ------------------------------------------------------------
// THE ELDER MEMORY — Experience Directive XX, Law VII.
//
// When an act closes, the Chronicler distills it into a sealed EPOCH
// summary — every claim cited to the turns that prove it, the three
// laws holding whole (no invention, no contradiction, no
// embellishment), and the quote court over any quoted words. The
// memory ladder then reads epochs before elders: the freshest act
// rides raw, every earlier act rides as its sealed summary, and the
// total [MEMORY] cost stays fixed however long the tale grows — year
// three remembers year one at the same price.
//
// This file is the PURE FRACTION: the keyless floor (a deterministic
// template built from the record alone, budgeted, cited), the courts
// (citation and quote — shared verbatim by the illuminated seat, the
// game's seal seat, and the proving ground), the ladder assembly, and
// the row shape. No provider, no clock, no randomness in any verdict.
//
// THE CLAIM GRAMMAR the courts read: a summary is one head — exactly
// "Act N." — followed by claims, and a claim is any run of words that
// ends with its citations and a period, e.g. "Mira fell [t7]." A
// claim may cite several turns ("[t3][t7]."); text that reaches the
// end of the summary without citations is refused whole. Citations
// resolve only to the act's own spoken turns; every proper name in a
// claim must live in the corpus of the turns THAT CLAIM cites (not
// merely somewhere in the record); quoted words must be verbatim in
// the cited turns — typography folds, wording never.
// ------------------------------------------------------------

export const EPOCH_LIMITS = Object.freeze({
  summary: 900,   // at most 900 characters per act's summary
  ladder: 2600,   // the ONE fixed total budget of the [MEMORY] assembly
  rawLine: 160    // one raw line of the freshest act, trimmed
});

const trim = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

// Typography folds, wording never (the chronicler's own forgiveness law).
const softFold = (value) => String(value ?? '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();

// Sentence-frame words the template itself supplies — never evidence of
// invention. Everything else capitalized must live in the cited turns.
const EPOCH_FRAME = new Set(['The', 'A', 'An', 'Act', 'Turn', 'In', 'At', 'On', 'By', 'When', 'Then', 'But', 'And', 'Now', 'She', 'He', 'They', 'It', 'Her', 'His', 'Their', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']);

// The act's own spoken turns: redactions out (the redaction law outranks
// memory), machinery rows out (memory never digests memory), acts read
// from the spine exactly as the table reads them. actIndex is 0-based.
export function actEpochSlice(record, actIndex) {
  const beats = record?.codex?.spine?.beats || [];
  const actOf = (log) => beats[log?.beatIndex ?? 0]?.act || 1;
  return (Array.isArray(record?.entries) ? record.entries : [])
    .filter((log) => log && !log.redacted && !log.kind && log.dm && actOf(log) === actIndex + 1);
}

// Every string one spoken turn actually holds — the corpus a claim's own
// citations are judged against, and only that.
function turnCorpus(log) {
  const parts = [log.player, log.deed];
  for (const block of log.dm?.narration_blocks || []) parts.push(block?.speaker, block?.text);
  const su = log.dm?.story;
  if (su) {
    for (const op of [...(su.cast_add || []), ...(su.cast_update || [])]) {
      parts.push(op?.name, op?.visual, op?.voice, op?.goal, op?.secret, op?.fact_add, op?.last_seen, op?.status);
    }
  }
  if (log.dm?.dialogue_cue) parts.push(log.dm.dialogue_cue.speaker, log.dm.dialogue_cue.line);
  return parts.filter(Boolean).join(' \u0001 ');
}

const citeOf = (log) => `[t${Number.isInteger(log?.turn) ? log.turn : 0}]`;

// ---------------------------------------------------------------
// THE KEYLESS FLOOR — a deterministic template summary built from the
// record alone: byte-stable on repeat walks, at most 900 characters,
// every claim carrying its turn citations, quotes absent by design
// (absent quotes are lawful; invented ones never are). The floor is
// LABELED by the seat that seals it — the text itself stays pure.
// ---------------------------------------------------------------
export function epochSummary(record, actIndex) {
  const slice = actEpochSlice(record, actIndex);
  const head = `Act ${actIndex + 1}.`;
  if (!slice.length) return head;
  const lines = [];
  const seen = new Set();
  const put = (line) => { if (line && !seen.has(line)) { seen.add(line); lines.push(line); } };
  const opening = slice[0].dm?.narration_blocks?.find((block) => block?.text)?.text;
  if (opening) put(`The act opened — ${trim(opening, 100)} ${citeOf(slice[0])}.`);
  for (const log of slice) {
    const su = log.dm?.story;
    for (const op of su?.cast_add || []) { if (op?.name) put(`${op.name} entered the tale ${citeOf(log)}.`); }
    for (const op of su?.cast_update || []) {
      if (!op?.name) continue;
      if (String(op.status || '').toLowerCase() === 'dead') put(`${op.name} fell ${citeOf(log)}.`);
      else if (op.fact_add) put(`${op.name} — ${trim(op.fact_add, 110)} ${citeOf(log)}.`);
    }
  }
  if (slice.length > 1) {
    const closing = slice[slice.length - 1].dm?.narration_blocks?.find((block) => block?.text)?.text;
    if (closing) put(`The act closed — ${trim(closing, 100)} ${citeOf(slice[slice.length - 1])}.`);
  }
  const out = [head, ...lines];
  // The budget folds whole claims from the tail — a truncated claim would
  // orphan its citation, so no claim is ever cut mid-word.
  while (out.length > 1 && out.join(' ').length > EPOCH_LIMITS.summary) out.pop();
  return out.join(' ');
}

// ---------------------------------------------------------------
// THE COURTS — citation and quote, one seat for every caller.
// ---------------------------------------------------------------
export function validateEpochSummary(text, record, actIndex) {
  const errors = [];
  const s = String(text || '').trim();
  if (!s) return { ok: false, errors: ['empty summary'] };
  if (s.length > EPOCH_LIMITS.summary) errors.push(`over budget: ${s.length} characters against the ${EPOCH_LIMITS.summary}-character law`);

  // The head is exactly "Act N." — no decoration rides uncourted.
  const headMatch = s.match(/^Act (\d+)\./);
  if (!headMatch) errors.push('the head must be exactly "Act N." — nothing rides before the claims');
  else if (Number(headMatch[1]) !== actIndex + 1) errors.push(`the head names Act ${headMatch[1]}; this is Act ${actIndex + 1}`);

  const slice = actEpochSlice(record, actIndex);
  const turnsInAct = new Map(slice.map((log) => [Number(log.turn), log]));

  // Tile the body into claims: each ends with its citations and a period.
  const body = headMatch ? s.slice(headMatch[0].length).trim() : s;
  const claims = [];
  let cursor = 0;
  if (body) {
    for (const match of body.matchAll(/[^]*?(?:\[t\d+\])+\s*\./g)) {
      if (match.index !== cursor) break;
      claims.push(match[0]);
      cursor = match.index + match[0].length;
    }
    if (cursor < body.length) errors.push('a claim stands without its citation — every claim ends with the turns that prove it, e.g. "[t4]."');
  }

  for (const claim of claims) {
    const cites = [...claim.matchAll(/\[t(\d+)\]/g)].map((match) => Number(match[1]));
    const cited = cites.map((turn) => turnsInAct.get(turn));
    if (!cited.length || cited.some((log) => !log)) {
      errors.push(`citation does not resolve to this act's spoken record: ${trim(claim, 60)}`);
      continue;
    }
    const corpusSoft = softFold(cited.map(turnCorpus).join(' \u0001 '));
    const prose = claim.replace(/\[t\d+\]/g, ' ');
    // The citation court: a claim may speak only of what its OWN cited
    // turns hold. A name the cited turns never speak is an invention.
    for (const match of prose.matchAll(/\b([A-Z][a-zA-Z'’-]{2,})\b/g)) {
      const word = match[1];
      if (EPOCH_FRAME.has(word)) continue;
      const bare = softFold(word).replace(/['’]s$/, '');
      if (!corpusSoft.includes(bare)) errors.push(`the cited turns do not speak of ${word} — a claim is proven only by its own citations`);
    }
    // The quote court: quoted words are verbatim in the cited turns or
    // they are contraband. Typography folds; wording never.
    for (const match of prose.matchAll(/[“"]([^”"]{2,240})[”"]/g)) {
      if (!corpusSoft.includes(softFold(match[1]))) errors.push(`quote not verbatim in the cited turns: “${trim(match[1], 40)}”`);
    }
  }
  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------
// THE LADDER — what [MEMORY] drinks once epochs stand: the freshest
// act raw (its spoken turns, played order, each line short), then
// every earlier act by its sealed summary, newest first. One fixed
// total budget, measured as the bytes that will ride the prompt.
// Budget folds, in order: the eldest seals compress to their head
// line, then the eldest seals drop, then the raw thins from its
// OLDEST line — the newest raw line and the newest seal are the
// floor. Deterministic in (record, rows, budget).
// ---------------------------------------------------------------
export function epochLadder(record, epochRows = [], { budget = EPOCH_LIMITS.ladder } = {}) {
  const beats = record?.codex?.spine?.beats || [];
  const currentAct = beats[record?.codex?.beatIndex ?? 0]?.act || 1;
  const raw = actEpochSlice(record, currentAct - 1).map((log) => {
    const spoke = log.dm?.narration_blocks?.find((block) => block?.text)?.text || '';
    const line = `t${Number.isInteger(log.turn) ? log.turn : 0}: ${[log.player, spoke].filter(Boolean).join(' — ')}`;
    return trim(line, EPOCH_LIMITS.rawLine);
  }).filter((line) => !/^t\d+:\s*$/.test(line));
  const seen = new Set();
  const elders = [];
  // Walk the rows newest-first so a re-sealed act's NEWEST seal wins,
  // then order what survives newest act first.
  for (const row of [...(Array.isArray(epochRows) ? epochRows : [])].reverse()
    .filter((row) => row && Number.isInteger(row.actIndex) && row.actIndex + 1 < currentAct && String(row.text || '').trim())
    .sort((a, b) => b.actIndex - a.actIndex)) {
    if (seen.has(row.actIndex)) continue; // one seal per act — the newest row wins
    seen.add(row.actIndex);
    elders.push({ text: String(row.text).trim(), headlined: false });
  }
  // A headlined seal keeps its head AND its first cited claim — "Act 1."
  // alone remembers nothing.
  const headline = (text) => {
    const t = String(text).trim();
    const claim = t.match(/^Act \d+\.\s*[^]*?(?:\[t\d+\])+\s*\./);
    if (claim) return claim[0];
    const dot = t.indexOf('. ');
    return dot > 0 ? t.slice(0, dot + 1) : t;
  };
  const compose = () => [...raw, ...elders.map((elder) => elder.text)];
  let guard = 0;
  while (JSON.stringify(compose()).length > budget && guard < 500) {
    guard += 1;
    const eldest = [...elders].reverse().find((elder) => !elder.headlined);
    if (eldest) { eldest.text = headline(eldest.text); eldest.headlined = true; continue; }
    if (elders.length > 1) { elders.pop(); continue; }
    if (raw.length > 1) { raw.shift(); continue; }
    if (elders.length === 1 && raw.length) { elders.pop(); continue; }
    break;
  }
  return compose();
}

// The sealed row: machinery for the DM's mind — silent in the book, the
// podcast, and the feed (empty dm envelope, the annal pattern exactly).
// `label` names which voice wrote it: the floor or the illuminated seat —
// never mistaken for one another.
export function epochEntry(text, { turn = 0, actIndex = 0, beatIndex = 0, label = 'floor' } = {}) {
  return {
    id: (globalThis.crypto?.randomUUID?.() || `epoch-${turn}-${Math.random().toString(36).slice(2)}`),
    kind: 'epoch', turn, actIndex, beatIndex,
    epoch: String(text || ''),
    label: label === 'illuminated' ? 'illuminated' : 'floor',
    player: null, sent: null, deed: null, resolution: null, redacted: false, ts: Date.now(),
    dm: { narration_blocks: [], suggestions: [], roll_request: null, state_updates: null, combat: null, cinematic: null, story: null, image_cue: null, dialogue_cue: null, time_advance: null, entropy_use: [] }
  };
}

// The Chronicler's charge for the illuminated seat — shared by the real
// providers and the repair path so the prompt can never drift from the
// courts (the lockstep law).
export function buildEpochPrompt(input = {}) {
  const actNumber = (input.actIndex ?? 0) + 1;
  const transcript = (input.corpus || []).map((entry) => {
    return `— turn ${entry.turn} —\n${(entry.texts || []).map((text) => `  ${text}`).join('\n')}`;
  }).join('\n');
  return `You are THE CHRONICLER of MyDungeon.Quest, distilling one CLOSED act into a sealed epoch summary — machinery for the Dungeon Master's memory, never shown to the player.

YOUR THREE LAWS (a rules client rejects any summary that breaks them):
1. YOU MAY NOT INVENT — every claim ends with the citations that prove it, e.g. "Mira fell [t7]." A claim may cite several turns: "[t3][t7]." Every proper name in a claim must appear in the turns THAT CLAIM cites.
2. YOU MAY NOT CONTRADICT — cite only turns from the transcript below; a citation outside them is refused.
3. YOU MAY ONLY RETELL — quoted words must be verbatim from the cited turns, or absent. Absent quotes are always lawful.

FORM: begin with exactly "Act ${actNumber}." then your claims. At most ${EPOCH_LIMITS.summary} characters in all. Dense, factual, past tense — names, deaths, secrets learned, debts and promises, where the act left the world. No decoration, no headers, no prose flourish.

[SEALED TURNS OF ACT ${actNumber}]
${transcript}

Respond ONLY with the epoch_summary tool call.`;
}
