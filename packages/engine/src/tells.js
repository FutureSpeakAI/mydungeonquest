// ------------------------------------------------------------
// THE HUMAN HAND — the Tell Court (Directive VI).
//
// StoryScope (Russell et al., arXiv 2604.03136) showed AI fiction is
// detectable at 93% from NARRATIVE STRUCTURE alone — thematic
// over-explanation, linear plots that tie off clean, emotion routed
// through stock bodily reactions, and per-model registers — and that
// the signal survives stylistic editing. The house's first answer is
// architectural: here the player, the dice, the entropy pool, the
// spine, the ticks, and the world's own events author the structure,
// so the durable fingerprint — machine plotting — largely is not ours
// to leave. This module is the second answer: the tells that remain
// model-owned are MEASURABLE, so the house measures them. A
// deterministic court reads the sealed narration, counts the four
// families below per thousand words, and when a family runs hot the
// context pack pushes back with a counter-directive in the DM's next
// brief. No key, no vibes: the same record convicts the same tells.
//
// The court measures; it never rewrites. The record is law, including
// its sins — the pressure lands on the NEXT turn, where pressure
// belongs.
// ------------------------------------------------------------

const clean = (value) => String(value ?? '');

// The four families the paper (and its attribution fingerprints) hand
// us in measurable form. Named in house terms, cited in plain ones.
export const TELL_FAMILIES = {
  statedMoral: {
    name: 'the stated moral',
    finding: 'thematic over-explanation — the story announces its own meaning',
    patterns: [
      /\b(?:she|he|they|you|I) (?:finally |suddenly )?(?:understood|realized|learned|knew(?: now)?) that\b/gi,
      /\bthe (?:real|true) (?:lesson|meaning|treasure|gift|victory|magic)\b/gi,
      /\bwhat (?:really |truly )?mattered (?:most |now )?was\b/gi,
      /\bit was (?:in that moment|then) that\b/gi,
      /\b(?:and )?in the end, (?:it|that|this) was\b/gi
    ]
  },
  borrowedBody: {
    name: 'the borrowed body',
    finding: 'emotion routed through stock bodily reactions instead of named feeling or deed',
    patterns: [
      /\b(?:stomach|gut) (?:dropped|twisted|churned|clenched|lurched)\b/gi,
      /\bheart (?:pounded|hammered|raced|thundered|clenched|sank)\b/gi,
      /\bbreath (?:caught|hitched|she didn'?t know she(?:'d| had) been holding)\b/gi,
      /\bchest (?:tightened|constricted)\b/gi,
      /\bblood (?:ran cold|turned to ice)\b/gi,
      /\bthroat (?:went dry|tightened|closed)\b/gi
    ]
  },
  tidyBow: {
    name: 'the tidy bow',
    finding: 'linear plotting that resolves every thread clean — human tales keep loose ends',
    patterns: [
      /\bat last,? (?:peace|quiet|calm|order) (?:settled|returned|came)\b/gi,
      /\ball was (?:well|quiet|calm|as it should be)\b/gi,
      /\bthe matter was (?:settled|finished|done)\b/gi,
      /\band (?:so|thus) the \w+ (?:ended|was over|was done)\b/gi,
      /\bnothing (?:more|left) to (?:fear|do|say)\b/gi,
      /\bevery (?:question|wrong|debt) (?:answered|righted|paid)\b/gi
    ]
  },
  hushedRegister: {
    name: 'the hushed register',
    finding: 'the unbroken reverent tone — a per-model fingerprint; solemnity without variance',
    patterns: [
      /\b(?:sacred|hallowed|solemn|reverent|reverence)\b/gi,
      /\bancient beyond (?:memory|reckoning|counting)\b/gi,
      /\b(?:quiet|terrible) dignity\b/gi,
      /\bimpossibly (?:old|vast|ancient)\b/gi
    ]
  }
};

// Flagging thresholds, per thousand words — AND a floor of two hits, so
// one stray phrase in a short chapter convicts nobody.
export const TELL_THRESHOLDS = { statedMoral: 1.5, borrowedBody: 3, tidyBow: 1.5, hushedRegister: 4 };
export const MIN_HITS = 2;

export function measureTells(text = '') {
  const body = clean(text);
  const words = (body.match(/\S+/g) || []).length;
  const counts = {}; const samples = {};
  for (const [key, family] of Object.entries(TELL_FAMILIES)) {
    counts[key] = 0; samples[key] = [];
    for (const pattern of family.patterns) {
      const found = body.match(pattern) || [];
      counts[key] += found.length;
      for (const hit of found.slice(0, 2)) samples[key].push(clean(hit).slice(0, 60));
    }
  }
  const per1k = {};
  for (const key of Object.keys(TELL_FAMILIES)) per1k[key] = words ? +((counts[key] * 1000) / words).toFixed(2) : 0;
  return { words, counts, per1k, samples };
}

// The court in session: fold the sealed narration (struck rows stay
// struck), convict the families that run hot, cite the turns.
export function tellReport(entries = []) {
  let corpus = '';
  const offenders = [];
  entries.forEach((entry, index) => {
    if (entry?.redacted) return;
    const turn = Number.isInteger(entry.turn) ? entry.turn : index;
    const text = (entry?.dm?.narration_blocks || []).map((block) => clean(block?.text)).join(' ');
    if (!text) return;
    corpus += ` ${text}`;
    const local = measureTells(text);
    for (const [key, count] of Object.entries(local.counts)) {
      if (count > 0) offenders.push({ turn, family: key, sample: local.samples[key][0] || '' });
    }
  });
  const measure = measureTells(corpus);
  const flagged = Object.keys(TELL_FAMILIES).filter((key) => measure.counts[key] >= MIN_HITS && measure.per1k[key] >= TELL_THRESHOLDS[key]);
  return { ...measure, flagged, offenders };
}

// The counter-directives — one line per hot family, ordered by how far
// over the line it runs, capped so the pack never drowns in correction.
const COUNTER = {
  statedMoral: 'Do not state the moral. Show the deed and trust the table to find the meaning.',
  borrowedBody: 'Not every feeling lives in the stomach or the chest. Name an emotion plainly now and then, or let it show in what a soul does.',
  tidyBow: 'Leave at least one raised thread unresolved this chapter. Human tales keep loose ends; the next volume inherits them.',
  hushedRegister: 'Vary the register. Let someone be plain, funny, petty, or wrong; not every hour is solemn.'
};

export function styleDirectives(report, { cap = 3 } = {}) {
  return (report.flagged || [])
    .map((key) => ({ key, excess: report.per1k[key] / TELL_THRESHOLDS[key] }))
    .sort((a, b) => b.excess - a.excess || a.key.localeCompare(b.key))
    .slice(0, cap)
    .map((entry) => COUNTER[entry.key]);
}
