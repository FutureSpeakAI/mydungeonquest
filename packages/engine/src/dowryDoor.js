// ------------------------------------------------------------
// THE DOWRY DOOR (Directive XX, Article Five, Law XV) — outside lore
// enters the house ONLY as proposals through the one door. A page of
// plain text is read on the floor; every reading may only PROPOSE
// ordinary story operations — a soul, a region, a fact — each bound to
// a citation that quotes its source passage VERBATIM. The validator
// then judges each proposal exactly as it judges a turn: the same op
// seams, the same courts, unweakened. Nothing enters the canon that
// was not blessed by the player's own hand, and nothing blessed enters
// except through the ordinary reducers.
//
// THE NO-INVENTION LAW: a proposal whose citation does not appear in
// the page's own bytes is refused — the reader may summarize nothing,
// embellish nothing, invent nothing. The floor reader below is honest
// by construction; the citation court still sits on every proposal,
// because doctored rows arrive from anywhere.
//
// THE GROUNDING COURT (convictions γ and δ): a quote grounds ONLY what
// it names WHOLE. Same-page presence is not grounding — an invented
// soul riding an unrelated but perfectly verbatim line is refused BY
// NAME (γ) — and substring presence is not naming: `ella` hiding
// inside "Sella Marrow" passes for nothing (δ); the name must stand in
// the quote whole-phrase, bounded by non-letters on both sides, or the
// no-invention law is a doorframe with no door. The one lawful bypass
// is TWO-HANDED: context.playersHand === true (caller code, never row
// data — turned only by the ceremony's live judge and the threshold's
// fold) AND the row's own amended mark (minted only by the ceremony's
// amend hands, dropped at the wire boundary), where the player's
// sovereignty over names is the amend law's own (the hero forge
// precedent). An unamended row keeps its grounding belt at EVERY seat
// — the threshold included — so upstream strictness is never a single
// point of failure. The reading doors — the server's judge, the floor
// — never turn the knob, so a reader's invention dies before the
// player ever sees it.
//
// THE COLLISION COURTS: a proposal that would re-forge a locked soul
// is refused BY NAME through the Alias Ledger's one canon road
// (claimsIndex — an epithet is its soul, never a twin); two pages may
// not both forge the same newborn (the first claim holds); and the
// forged hero's own name outranks every page.
//
// BLESSED-ONLY APPLY, AS PURE LAW: applyDowry folds ONLY proposals
// wearing blessed === true, re-judging every one with the hero seated
// — an unblessed proposal never reaches the fold and leaves no trace;
// a refused proposal folds nothing. The fold itself is the ordinary
// reducer (applyStoryUpdates) at turn 0 — the tale's threshold — so
// dowry-born souls carry introduced_turn 0 and the wiki tells them
// lawfully as known.
//
// Deterministic, byte-stable, zero deps — the same pages always read
// to the same proposals; context-agnostic — any codex, any canon.
// Born fail-closed: junk pages, junk proposals, junk codexes prove
// nothing and never crash a reader.
// ------------------------------------------------------------
import { canonName, claimsIndex } from './names.js';
import { validateDmTurn } from './protocol.js';
import { applyStoryUpdates } from './story.js';

const MAX_PAGES = 8;
const MAX_PAGE_CHARS = 200000;
const MAX_PROPOSALS = 60;

const isRow = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const KINDS = new Set(['cast', 'region', 'fact']);

// Whole-phrase naming: the name stands in the quote bounded by
// non-letters on both sides (or the line's own edges) — `ella` inside
// "Sella Marrow" is presence, not naming (conviction δ).
const LETTER = /[\p{L}\p{N}]/u;
const nameGrounded = (quote, name) => {
  for (let at = quote.indexOf(name); at !== -1; at = quote.indexOf(name, at + 1)) {
    const before = at > 0 ? quote[at - 1] : '';
    const after = at + name.length < quote.length ? quote[at + name.length] : '';
    if (!LETTER.test(before) && !LETTER.test(after)) return true;
  }
  return false;
};

// The floor's section words — a heading opens a section; bullets outside
// any recognized section propose nothing (the floor reads only what it
// can prove it was shown).
const SECTION_WORDS = [
  [/\b(people|cast|souls|characters|companions|allies|party)\b/i, 'cast'],
  [/\b(places|regions|world|lands|locations|geography)\b/i, 'region'],
  [/\b(facts|lore|history|truths|notes|events|legends)\b/i, 'fact']
];

function sectionOf(line) {
  const heading = line.match(/^#{1,6}\s+(.+?)\s*$/) || (line.length <= 48 && !/^\s*[-*•]/.test(line) ? line.match(/^([A-Za-z][A-Za-z\s&'’]{1,46}):\s*$/) : null);
  if (!heading) return undefined; // not a heading at all
  for (const [pattern, kind] of SECTION_WORDS) if (pattern.test(heading[1])) return kind;
  return null; // a heading, but not one the floor recognizes — closes any open section
}

// One bullet, one proposal: `- Name — the page's own words` (em dash, en
// dash, colon, or spaced hyphen). The name is the page's; the words are
// the page's; the floor invents NOTHING — no role, no voice, no gloss.
function splitBullet(rest) {
  const seams = [' — ', ' – ', ': ', ' - '];
  let at = -1; let seam = '';
  for (const candidate of seams) {
    const index = rest.indexOf(candidate);
    if (index > 0 && (at === -1 || index < at)) { at = index; seam = candidate; }
  }
  if (at === -1) return { name: rest.trim(), words: '' };
  return { name: rest.slice(0, at).trim(), words: rest.slice(at + seam.length).trim() };
}

// ---- THE FLOOR READER — deterministic, cited, useful ----------------
// pages: [{ name, text }] of plain text or markdown. Returns
// { proposals, notes }: every proposal carries the ORIGINAL line as its
// citation quote, verbatim by construction; notes speak honestly of
// anything the floor set aside. Same pages in, same bytes out.
export function readPagesFloor(pages) {
  const proposals = [];
  const notes = [];
  const rows = Array.isArray(pages) ? pages.filter(isRow) : [];
  if (!rows.length) return { proposals, notes };
  let read = 0;
  for (const [pageIndex, page] of rows.entries()) {
    if (read >= MAX_PAGES) { notes.push('the table holds eight pages — the rest wait for another dowry'); break; }
    read += 1;
    const source = String(page.name || `page ${pageIndex + 1}`).slice(0, 80);
    let text = typeof page.text === 'string' ? page.text : '';
    if (text.length > MAX_PAGE_CHARS) { text = text.slice(0, MAX_PAGE_CHARS); notes.push(`"${source}" was read to its ${MAX_PAGE_CHARS}th character — the rest waits`); }
    let section = null;
    const lines = text.split('\n');
    for (const [lineIndex, rawLine] of lines.entries()) {
      const line = rawLine.replace(/\r$/, '');
      const opened = sectionOf(line);
      if (opened !== undefined) { section = opened; continue; }
      if (!section) continue;
      const bullet = line.match(/^\s*[-*•]\s+(.+?)\s*$/);
      if (!bullet) continue;
      if (proposals.length >= MAX_PROPOSALS) { notes.push('the floor read its fill — sixty proposals stand; the rest of the pages wait'); break; }
      const { name, words } = splitBullet(bullet[1]);
      if (!name || name.length > 80 || !/[A-Za-z]/.test(name)) continue;
      const citation = { source, quote: line };
      const id = `dowry-p${pageIndex}-l${lineIndex}`;
      if (section === 'cast') {
        proposals.push({ id, kind: 'cast', op: { name, ...(words ? { visual: words.slice(0, 360) } : {}) }, citation, blessed: false });
      } else if (section === 'region') {
        proposals.push({ id, kind: 'region', op: { name, ...(words ? { visual: words.slice(0, 360) } : {}) }, citation, blessed: false });
      } else if (section === 'fact' && words) {
        proposals.push({ id, kind: 'fact', op: { name, fact_add: words.slice(0, 160) }, citation, blessed: false });
      }
    }
    if (proposals.length >= MAX_PROPOSALS) break;
  }
  return { proposals, notes };
}

// The wrapper turn: a proposal is judged EXACTLY as a turn is judged —
// the op rides a minimal lawful dm_turn through validateDmTurn itself,
// so every court of the turn law sits on the dowry unweakened, and a
// refusal speaks in the door's own words.
function wrapperTurn(story) {
  return {
    // E5: text extended to >= 60 words so the wrapper turn satisfies the
    // 'none' narration floor (NARRATION_FLOOR.byMeasure.none.minWords = 60)
    // now enforced by validateDmTurn when no beatMeasure rides the context.
    narration_blocks: [{ text: 'The dowry pages are read aloud at the threshold of the tale, each claim spoken plainly before the court, so every offered soul, place, and truth may be judged by the standing law. No gift enters without this rite: the name must be the page\'s own, the words must be the page\'s own, and the law the tale keeps will keep them or turn them away by name, never by silence.', speaker: null }],
    suggestions: ['Read on', 'Set the page down', 'Ask the keeper'],
    roll_request: null, state_updates: null, combat: null, cinematic: null,
    story, image_cue: null, dialogue_cue: null, time_advance: null, entropy_use: []
  };
}

// The op rides WHOLE into its seam — never rebuilt field by field, so a
// stranger key a page smuggled in meets the validator's own stranger-key
// court instead of being silently laundered away (the row-roundtrip law).
function fragmentOf(proposal) {
  if (proposal.kind === 'cast') return { cast_add: [{ ...proposal.op }] };
  if (proposal.kind === 'region') return { world: { region_add: { ...proposal.op } } };
  return { cast_update: [{ name: proposal.op.name, fact_add: proposal.op.fact_add }] };
}

// ---- THE JUDGE — every proposal, every court, in order --------------
// context: { cast, regions, hero, pages }. Returns verdicts aligned to
// the proposals: { id, ok, errors }. Accepted cast newborns join the
// working canon for every LATER proposal (the newborn court's law), so
// two pages cannot both forge one soul.
export function judgeProposals(proposals, context = {}) {
  const rows = Array.isArray(proposals) ? proposals : [];
  const cast = Array.isArray(context.cast) ? context.cast.filter(isRow) : [];
  const regions = Array.isArray(context.regions) ? context.regions.filter(isRow) : [];
  const hero = typeof context.hero === 'string' && context.hero.trim() ? context.hero.trim() : null;
  const heroKey = hero ? canonName(hero) : null;
  const pageMap = new Map();
  for (const page of Array.isArray(context.pages) ? context.pages.filter(isRow) : []) {
    pageMap.set(String(page.name || ''), typeof page.text === 'string' ? page.text : '');
  }
  const claims = claimsIndex(cast); // names AND epithets — the one canon road
  const regionKeys = new Set(regions.map((region) => canonName(region.name)).filter(Boolean));
  const batchCast = new Map(); // canon key -> first claimant's name, this batch
  const batchRegions = new Map();
  const newbornCards = [];
  const verdicts = [];

  for (const proposal of rows) {
    const id = isRow(proposal) && typeof proposal.id === 'string' ? proposal.id : null;
    const errors = [];
    const refuse = (word) => { errors.push(word); };

    if (!isRow(proposal) || !KINDS.has(proposal.kind) || !isRow(proposal.op)) {
      refuse('the dowry knows no such offering — a proposal is a cast, region, or fact op with its citation');
      verdicts.push({ id, ok: false, errors });
      continue;
    }
    // THE CITATION COURT — the no-invention law. Every claim quotes its page.
    const citation = proposal.citation;
    if (!isRow(citation) || typeof citation.source !== 'string' || typeof citation.quote !== 'string' || !citation.quote.trim()) {
      refuse('a proposal without its citation is refused — every claim must quote its page');
    } else if (!pageMap.has(citation.source)) {
      refuse(`the citation names a page not on the table: "${citation.source}"`);
    } else if (!pageMap.get(citation.source).includes(citation.quote)) {
      refuse(`the citation is not the page's own words — the quoted line appears nowhere in "${citation.source}" (the no-invention law)`);
    }

    const name = typeof proposal.op.name === 'string' ? proposal.op.name.trim() : '';
    if (!name) refuse('the offering carries no name — a nameless op cannot be judged');
    const key = name ? canonName(name) : '';

    // THE GROUNDING COURT — a quote grounds ONLY what it names WHOLE
    // (γ, δ). The bypass is two-handed: playersHand (caller code) AND
    // the row's own amended mark — the shape the player's hand renamed.
    const byPlayersOwnHand = context.playersHand === true && proposal.amended === true;
    if (!byPlayersOwnHand && name && isRow(citation) && typeof citation.quote === 'string' && !nameGrounded(citation.quote, name)) {
      refuse(`the cited line does not name "${name}" — a quote grounds only what it names (the no-invention law)`);
    }

    if (name && proposal.kind === 'cast') {
      // THE COLLISION COURTS — refused BY NAME, through the one canon road.
      if (heroKey && key === heroKey) refuse(`"${name}" is the forged hero's own name — the dowry may not re-forge the hero`);
      else if (batchCast.has(key)) refuse(`two pages may not both forge "${name}" — the first claim holds`);
      else if (claims.has(key)) {
        const holder = claims.get(key);
        if (typeof holder === 'string' && holder) refuse(`"${name}" already stands in the canon as ${holder} — the dowry may not re-forge a locked soul`);
        else refuse(`"${name}" is contested among the standing cast — the dowry may not touch a disputed claim`);
      }
    }
    if (name && proposal.kind === 'region') {
      if (batchRegions.has(key)) refuse(`two pages may not both raise "${name}" — the first claim holds`);
      else if (regionKeys.has(key)) refuse(`the region "${name}" already stands on the map — the dowry may not redraw it`);
    }
    if (name && proposal.kind === 'fact') {
      if (typeof proposal.op.fact_add !== 'string' || !proposal.op.fact_add.trim()) refuse('a fact needs its words — fact_add is empty');
      if (heroKey && key === heroKey) refuse(`the hero's own tale is not written from dowry pages — the record will tell it`);
      else if (!batchCast.has(key) && !(claims.has(key) && typeof claims.get(key) === 'string')) {
        if (claims.has(key)) refuse(`"${name}" is contested among the standing cast — the dowry may not touch a disputed claim`);
        else refuse(`the page speaks of "${name}", but no such soul stands in the canon — a fact needs its soul`);
      }
    }

    // THE VALIDATOR'S OWN COURT — the same op seams, unweakened. The court
    // context seats everything it reads (the turn-reliability law): the
    // standing cast PLUS this batch's accepted newborns, and the hero.
    if (!errors.length) {
      const verdict = validateDmTurn(wrapperTurn(fragmentOf(proposal)), [], { cast: [...cast, ...newbornCards], hero });
      if (!verdict.ok) for (const word of verdict.errors) refuse(word);
    }

    const ok = errors.length === 0;
    if (ok && proposal.kind === 'cast') { batchCast.set(key, name); newbornCards.push({ name }); }
    if (ok && proposal.kind === 'region') batchRegions.set(key, name);
    verdicts.push({ id, ok, errors });
  }
  return verdicts;
}

// ---- BLESSED-ONLY APPLY, AS PURE LAW ---------------------------------
// applyDowry(codex, proposals, { hero, pages }) → { codex, applied,
// refused, unblessed }. Only blessed === true reaches the judge; only a
// judged-ok proposal reaches the fold; the fold is the ordinary reducer
// at turn 0 — the tale's threshold. The input codex is never mutated.
export function applyDowry(codex, proposals, { hero = null, pages = [] } = {}) {
  if (!isRow(codex)) return { codex: null, applied: [], refused: [], unblessed: [] };
  const rows = Array.isArray(proposals) ? proposals.filter(isRow) : [];
  const unblessed = rows.filter((row) => row.blessed !== true).map((row) => (typeof row.id === 'string' ? row.id : null));
  const blessed = rows.filter((row) => row.blessed === true);
  // The threshold is the player's own hand: blessed shapes may carry
  // amended names beyond the page's words (playersHand — the grounding
  // court's one lawful bypass); every OTHER court still sits, hero seated.
  const verdicts = judgeProposals(blessed, { cast: Array.isArray(codex.cast) ? codex.cast : [], regions: Array.isArray(codex.regions) ? codex.regions : [], hero, pages, playersHand: true });
  let next = codex;
  const applied = [];
  const refused = [];
  for (const [index, proposal] of blessed.entries()) {
    const verdict = verdicts[index];
    if (!verdict.ok) { refused.push({ id: verdict.id, errors: verdict.errors }); continue; }
    next = applyStoryUpdates(next, fragmentOf(proposal), { turn: 0 });
    applied.push(proposal);
  }
  return { codex: next, applied, refused, unblessed };
}
