// ---------------------------------------------------------------------------
// THE HOUSE VOICE — Experience-Directive XVII, Article V. ONE PINNED SOURCE.
//
// The craft canon and the exemplar shelf ride the writer's prompt from this
// seat; the Editor's addendum and the deterministic dash scan read the same
// law; the gates probe this file and no mirror of it (the mirrors law).
// LISTLESS LEGISLATION stands: the tells lexicon (server/tells-lexicon.json)
// legislates the Editor's ear through the pre-pass; this seat teaches the
// Voice's tongue in general language only.
// ---------------------------------------------------------------------------

export const EM_DASH = '\u2014';

// The craft canon, distilled — Article V's own words, the writer's teaching.
export const CRAFT_CANON = [
  'Concrete nouns over abstractions; name the thing, not the idea of it.',
  'Active verbs over auxiliary scaffolding; let the subject do the deed.',
  'The senses before the summary: what is seen, heard, smelled, and touched arrives before what it means.',
  'Enter the scene late and leave it early.',
  'Sentence music varied: short after long, never three alike.',
  'Character speech belongs to one mouth; no two souls share a cadence.',
  'No throat-clearing openers, no hedged weather-report prose, no inventory lists wearing a paragraph\u2019s clothes.'
];

// The exemplar shelf — public-domain passages, known-good fixtures. Style is
// inspiration, never imitation of any living author's protected expression.
// Every author died before 1956 (life + 70 clears 2026 everywhere); every
// passage predates 1930. No em dash rides the shelf: the fixtures obey the
// law they teach.
export const EXEMPLAR_SHELF = [
  {
    author: 'Mary Shelley', died: 1851, work: 'Frankenstein (1818)',
    passage: 'It was on a dreary night of November that I beheld the accomplishment of my toils. With an anxiety that almost amounted to agony, I collected the instruments of life around me, that I might infuse a spark of being into the lifeless thing that lay at my feet.'
  },
  {
    author: 'Robert Louis Stevenson', died: 1894, work: 'Treasure Island (1883)',
    passage: 'I remember him as if it were yesterday, as he came plodding to the inn door, his sea-chest following behind him in a hand-barrow; a tall, strong, heavy, nut-brown man, his tarry pigtail falling over the shoulder of his soiled blue coat.'
  },
  {
    author: 'George MacDonald', died: 1905, work: 'The Princess and the Goblin (1872)',
    passage: 'There was once a little princess whose father was king over a great country full of mountains and valleys. His palace was built upon one of the mountains, and was very grand and beautiful.'
  },
  {
    author: 'Beowulf, trans. Francis B. Gummere', died: 1919, work: 'Beowulf (trans. 1910)',
    passage: 'To him an heir was afterward born, a son in his halls, whom heaven sent to favor the folk, feeling their woe that erst they had lacked an earl for leader so long a while.'
  }
];

export function shelfLines() {
  return EXEMPLAR_SHELF.map((entry) => `${entry.passage} (${entry.author}, ${entry.work})`).join('\n');
}

// ---------------------------------------------------------------------------
// THE DASH LAW — absolute and deterministic: ZERO em dashes in shipped
// narration. The scan is the pre-pass's instrument; the fold is the ship
// door's backstop for a twice-refused draft, so the law holds even when
// the judged sittings are spent. The fold only ever shrinks or holds the
// text's length, so no validator ceiling can break at the door.
// ---------------------------------------------------------------------------

export function dashCheck(prose) {
  const count = (String(prose || '').match(/\u2014/g) || []).length;
  return { count, flagged: count > 0 };
}

export function dashFold(text) {
  return String(text || '')
    .replace(/[ \t]+\u2014+[ \t]+/g, ', ')
    .replace(/\u2014+[ \t]*/g, ',')
    .replace(/[ \t]*\u2014+/g, ',');
}

// One prose fold for the scans: narration blocks joined, block shape
// tolerated whether the block is a bare string or carries a text field.
export function proseOfTurn(turn) {
  const blocks = Array.isArray(turn?.narration_blocks) ? turn.narration_blocks : [];
  return blocks.map((block) => (typeof block === 'string' ? block : String(block?.text ?? ''))).join('\n');
}

export function dashFoldBlocks(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map((block) =>
    typeof block === 'string' ? dashFold(block) : { ...block, text: dashFold(block?.text ?? '') });
}

// The whole-turn fold: narration blocks and the cue's quoted moment fold
// in lockstep — a folded page must never contradict its own cue — and
// nothing else is touched: the law's scope is shipped prose.
export function dashFoldTurn(turn) {
  if (!turn) return turn;
  const folded = { ...turn, narration_blocks: dashFoldBlocks(turn.narration_blocks) };
  if (folded.image_cue && typeof folded.image_cue.moment === 'string' && folded.image_cue.moment.includes(EM_DASH)) {
    folded.image_cue = { ...folded.image_cue, moment: dashFold(folded.image_cue.moment) };
  }
  return folded;
}

// ---------------------------------------------------------------------------
// The teachings that ride out of this one seat.
// ---------------------------------------------------------------------------

export const DASH_REASON = 'the dash law: zero em dashes ship; fold each to a comma, a period, or a rebuilt sentence';

export const HOUSE_VOICE_RULE = `44. THE HOUSE VOICE: write like a fantasy author, never like a language model. ${CRAFT_CANON.join(' ')} THE DASH LAW: the em dash is not in this house's type case. Never write one; where a dash tempts you, choose a comma, a period, or a rebuilt sentence. Let these voices tune your ear (inspiration, never imitation):
${shelfLines()}`;

export const EDITOR_ADDENDUM = `THE HOUSE VOICE ADDENDUM (Directive XVII, Article V). The pre-pass flags are deterministic law, not taste. A 'dash' flag is MANDATORY REVISE: zero em dashes may ship; name the dash law among your reasons and direct each dash to a comma, a period, or a rebuilt sentence. A 'tells' flag means language-model tells crowd the page past the pinned density; direct replacements in the house craft: concrete nouns, active verbs, the senses before the summary, sentence music varied.`;
