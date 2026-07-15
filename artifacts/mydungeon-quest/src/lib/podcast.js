import { romanNumeral } from 'fatescript/story';

// ------------------------------------------------------------
// THE PODCAST FORGE, script side (the Experience Cut, Phase 5).
// One produced episode compiled ONLY from what was sealed:
//   · cold open — the tale's single best sealed line, spoken by
//     its own character (chosen by stakes, verbatim always),
//   · the narrator retelling the saga chapter by chapter — the
//     Chronicler's sealed passages read whole,
//   · the cast re-speaking their finest lines verbatim from the
//     sealed record (the documentary pull-quote, never a remix),
//   · chapters without a Chronicler page fall back to selected
//     sealed narration (cinematic-adjacent turns, high-stakes
//     rolls, bond swings — the episode is a retelling, not a
//     replay), and
//   · a fixed liturgy for the frame (title card, chapter slates,
//     the sign-off "Sealed, and true.") — the ONLY words allowed
//     that were not sealed, and they are templates, not prose.
// The validator re-derives every claim: each segment must match
// its cited source verbatim or the script is refused.
// THE SOUND LAW lives in the mix plan: voices separated by
// breathing gaps, stings only BETWEEN sections, nothing ever
// under a voice. assertLawfulPlan is the court for that.
// ------------------------------------------------------------

export const LITURGY = {
  open: (title) => `${title}. A tale sealed on the device that lived it — retold from its own record.`,
  chapterIntro: (numeral, title) => `Chapter ${numeral}. ${title}.`,
  signOff: () => 'Sealed, and true.'
};

// Redaction is journal law first, snapshot flag second — the same two courts
// the Storybook answers to. Turn record k ↔ logs[k].
function struckOrdinals(journal) {
  const turnRecords = (journal || []).filter((record) => record.type === 'turn');
  const struckHashes = new Set((journal || []).filter((record) => record.type === 'redaction').map((record) => record.payload?.targetRecordHash).filter(Boolean));
  return new Set(turnRecords.map((record, ordinal) => (struckHashes.has(record.recordHash) ? ordinal : -1)).filter((ordinal) => ordinal >= 0));
}

// A Chronicler page may be voiced only while EVERY turn it retells is still
// bound. A redaction that lands after the page was sealed strikes the whole
// retelling — the chapter falls back to lawful raw narration instead. A page
// without citations cannot prove its range, so it is never voiced.
function pageIsBound(page, bound) {
  const from = page?.cites?.from_turn;
  const to = page?.cites?.to_turn;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) return false;
  for (let turn = from; turn <= to; turn += 1) if (!bound(turn)) return false;
  return true;
}

const stakes = (log) => (Number.isInteger(log?.resolution?.total) ? Math.abs(log.resolution.total - 10.5) : -1);

export function buildPodcastScript({ campaign, journal = [] }) {
  const logs = Array.isArray(campaign.logs) ? campaign.logs : [];
  const pages = Array.isArray(campaign.chroniclePages) ? campaign.chroniclePages : [];
  const beats = campaign.codex?.spine?.beats || [];
  const struck = struckOrdinals(journal);
  const bound = (turn) => logs[turn] && !logs[turn].redacted && !struck.has(turn);

  const sections = [];
  const chapters = [];

  // The cold open: of every line the Chronicler sealed as a quote, the one
  // from the highest-stakes bound turn speaks first — its own character's
  // voice, before any framing at all.
  const allQuotes = pages.flatMap((page) => (page.quotes || []).map((quote) => ({ ...quote, beatIndex: page.beatIndex })));
  const openable = allQuotes.filter((quote) => Number.isInteger(quote.turn) && bound(quote.turn) && quote.speaker && quote.line);
  const coldOpen = openable.sort((a, b) => stakes(logs[b.turn]) - stakes(logs[a.turn]))[0] || null;
  if (coldOpen) {
    sections.push({ kind: 'cold-open', segments: [{ voice: coldOpen.speaker, text: coldOpen.line, source: { type: 'chronicle_quote', beatIndex: coldOpen.beatIndex, turn: coldOpen.turn } }] });
  }

  // The title card — fixed liturgy, narrator's voice.
  sections.push({ kind: 'liturgy-open', segments: [{ voice: 'narrator', text: LITURGY.open(campaign.title), source: { type: 'liturgy', form: 'open' } }] });

  // One section per walked beat, in spine order.
  const beatIndexes = [...new Set(logs.map((log) => log.beatIndex ?? 0))].sort((a, b) => a - b);
  for (const beatIndex of beatIndexes) {
    const beat = beats[beatIndex] || {};
    const numeral = romanNumeral(beatIndex + 1);
    const title = beat.title || 'A Turn of the Road';
    const segments = [{ voice: 'narrator', text: LITURGY.chapterIntro(numeral, title), source: { type: 'liturgy', form: 'chapterIntro', beatIndex } }];
    const sealedPage = pages.find((p) => p.beatIndex === beatIndex) || null;
    const page = sealedPage && pageIsBound(sealedPage, bound) ? sealedPage : null;

    if (page) {
      // The narrator reads the sealed retelling whole…
      segments.push({ voice: 'narrator', text: page.passage, source: { type: 'chronicle_page', beatIndex } });
      // …then the cast re-speak their finest lines, verbatim, skipping the
      // one already spent on the cold open.
      for (const quote of (page.quotes || []).slice(0, 2)) {
        if (!quote.speaker || !quote.line || !Number.isInteger(quote.turn) || !bound(quote.turn)) continue;
        if (coldOpen && quote.turn === coldOpen.turn && quote.line === coldOpen.line) continue;
        segments.push({ voice: quote.speaker, text: quote.line, source: { type: 'chronicle_quote', beatIndex, turn: quote.turn } });
      }
    } else {
      // No lawful Chronicler page (none sealed, or its turns were struck):
      // selected sealed narration, spoken as written. Selection heuristics —
      // cinematic-adjacent, high-stakes, bond swings.
      const entries = logs.map((log, turn) => ({ log, turn })).filter(({ log, turn }) => (log.beatIndex ?? 0) === beatIndex && bound(turn));
      const score = ({ log }) => (log.dm?.cinematic ? 3 : 0) + (stakes(log) >= 7 ? 2 : 0) + ((log.dm?.cast_update || []).length ? 1 : 0);
      const chosen = entries.map((entry) => ({ entry, points: score(entry) }))
        .sort((a, b) => b.points - a.points || a.entry.turn - b.entry.turn)
        .slice(0, 3)
        .map(({ entry }) => entry)
        .sort((a, b) => a.turn - b.turn);
      for (const { log, turn } of chosen) {
        (log.dm?.narration_blocks || []).forEach((block, blockIndex) => {
          if (!block?.text) return;
          segments.push({ voice: block.speaker || 'narrator', text: block.text, source: { type: 'sealed_turn', turn, blockIndex } });
        });
      }
    }

    chapters.push({ title: `Chapter ${numeral} — ${title}`, section: sections.length });
    sections.push({ kind: 'chapter', beatIndex, numeral, title, segments });
  }

  // The sign-off — the seal spoken.
  sections.push({ kind: 'seal', segments: [{ voice: 'narrator', text: LITURGY.signOff(), source: { type: 'liturgy', form: 'signOff' } }] });

  const slug = String(campaign.title || 'tale').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'tale';
  return { title: campaign.title, slug, sections, chapters };
}

// THE VERBATIM COURT — every segment must match its cited source exactly.
// Liturgy must match its template; a chronicle page must be the sealed
// passage whole AND all of its cited turns still bound; a quote must be a
// sealed quote with its own speaker on a bound turn; a sealed turn must be
// the block as written, in its writer's voice. Anything else — invented
// prose, edited lines, resurrected redactions — is refused.
export function validatePodcastScript(script, { campaign, journal = [] }) {
  const errors = [];
  const logs = Array.isArray(campaign.logs) ? campaign.logs : [];
  const pages = Array.isArray(campaign.chroniclePages) ? campaign.chroniclePages : [];
  const beats = campaign.codex?.spine?.beats || [];
  const struck = struckOrdinals(journal);
  const bound = (turn) => logs[turn] && !logs[turn].redacted && !struck.has(turn);

  for (const section of script?.sections || []) {
    for (const segment of section.segments || []) {
      const { voice, text, source } = segment || {};
      if (!text || !voice || !source) { errors.push('a segment is missing voice, text, or source'); continue; }
      if (source.type === 'liturgy') {
        const lawful = (source.form === 'open' && text === LITURGY.open(campaign.title))
          || (source.form === 'signOff' && text === LITURGY.signOff())
          || (source.form === 'chapterIntro' && Number.isInteger(source.beatIndex)
              && text === LITURGY.chapterIntro(romanNumeral(source.beatIndex + 1), beats[source.beatIndex]?.title || 'A Turn of the Road'));
        if (!lawful) errors.push(`liturgy does not match its template: "${String(text).slice(0, 60)}"`);
        if (lawful && voice !== 'narrator') errors.push('liturgy belongs to the narrator');
      } else if (source.type === 'chronicle_page') {
        const page = pages.find((p) => p.beatIndex === source.beatIndex);
        if (!page || page.passage !== text) errors.push(`a retelling does not match the sealed page for beat ${source.beatIndex}`);
        else if (!pageIsBound(page, bound)) errors.push(`a retelling rides on struck turns (beat ${source.beatIndex})`);
        if (voice !== 'narrator') errors.push('the retelling belongs to the narrator');
      } else if (source.type === 'chronicle_quote') {
        const match = pages.some((page) => (page.quotes || []).some((quote) => quote.line === text && quote.speaker === voice && quote.turn === source.turn));
        if (!match) errors.push(`a re-spoken line is not a sealed quote: "${String(text).slice(0, 60)}"`);
        else if (!bound(source.turn)) errors.push(`a quote rides on a struck turn ${source.turn}`);
      } else if (source.type === 'sealed_turn') {
        if (!bound(source.turn)) { errors.push(`a sealed_turn segment cites struck turn ${source.turn}`); continue; }
        const block = logs[source.turn]?.dm?.narration_blocks?.[source.blockIndex];
        if (!block || block.text !== text) errors.push(`a sealed line was altered at turn ${source.turn}`);
        else if ((block.speaker || 'narrator') !== voice) errors.push(`a sealed line speaks in the wrong voice at turn ${source.turn}`);
      } else {
        errors.push(`unknown source type "${source.type}"`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

// THE MIX PLAN — strictly sequential by construction. Voices breathe (650ms
// gaps inside a section), sections turn with a longer breath, and a sting —
// when any sealed musical phrase exists — sounds only INSIDE that turn,
// framed by 900ms of silence on both sides. Chapter markers point at the
// first voice of their section. No item ever plays over another.
export function buildMixPlan({ voices = [], chapters = [], stings = [] }) {
  const items = [];
  const planChapters = [];
  let lastSection = null;
  let stingAt = 0;
  for (const voice of voices) {
    if (lastSection === null) {
      items.push({ type: 'gap', ms: 400 }); // one breath before the first word
    } else if (voice.section !== lastSection) {
      if (stings.length) {
        items.push({ type: 'gap', ms: 900 }, { type: 'sting', ref: stings[stingAt++ % stings.length] }, { type: 'gap', ms: 900 });
      } else {
        items.push({ type: 'gap', ms: 1100 });
      }
    } else {
      items.push({ type: 'gap', ms: 650 });
    }
    const chapter = chapters.find((c) => c.section === voice.section);
    if (chapter && !planChapters.some((p) => p.title === chapter.title)) {
      planChapters.push({ title: chapter.title, beforeItem: items.length });
    }
    items.push({ type: 'voice', ref: voice.ref });
    lastSection = voice.section;
  }
  return { items, chapters: planChapters };
}

// THE SEQUENCE COURT — proves a plan cannot overlap: only voice/sting/gap
// items exist, and no two audible items ever touch. This is what makes the
// no-bed law *verifiable* rather than promised.
export function assertLawfulPlan(plan) {
  const errors = [];
  let previousAudible = false;
  for (const item of plan?.items || []) {
    if (item.type === 'gap') {
      if (!(Number(item.ms) > 0)) errors.push('a gap has no duration');
      previousAudible = false;
    } else if (item.type === 'voice' || item.type === 'sting') {
      if (!item.ref) errors.push(`a ${item.type} item has no ref`);
      if (previousAudible) errors.push(`two audible items touch (…${item.type} without a gap)`);
      previousAudible = true;
    } else {
      errors.push(`unknown item type "${item.type}"`);
    }
  }
  if (!(plan?.items || []).some((item) => item.type === 'voice')) errors.push('a plan with no voice is not an episode');
  return { ok: errors.length === 0, errors };
}
