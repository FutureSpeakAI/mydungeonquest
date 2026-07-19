// ============================================================
// THE ONE ROAD (EXPERIENCE DIRECTIVE XVII, Article 0) — the single
// pipeline module the application AND the proving harness import.
// Never mirrored, never copied: the render door, the slot law, the
// prop court, the ratio law, the easel order, the sheet grid, and
// the render-payload whitelist all live HERE, so the app the player
// walks and the road the courts judge are the same bytes. Pure
// functions and pinned constants only — no IO, no db, no fetch.
// ============================================================

// ---- THE VERTICAL LAW (XVII, operative clause) ----
// One pinned portrait ratio from the provider's native set. Feed
// plates (scene, portrait) are vertical by default so they render
// whole on a phone; reference sheets are square (a 2x2 grid);
// covers, key art, and region canon are furniture, not feed plates,
// and keep their landscape frame.
export const PLATE_RATIO = '3:4';
export const PLATE_KINDS = ['scene', 'portrait'];

export function ratioFor(kind) {
  if (kind === 'sheet') return '1:1';
  return PLATE_KINDS.includes(kind) ? PLATE_RATIO : '16:9';
}

// Deterministic delivery check: a delivered plate's pixel box must
// match the pinned ratio within one part in fifty (provider rounding
// is real; drift beyond that is a wrong frame, not rounding).
export function checkPlateRatio(width, height, kind = 'scene') {
  const [rw, rh] = ratioFor(kind).split(':').map(Number);
  const ok = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    && Math.abs(width / height - rw / rh) <= (rw / rh) / 50;
  return { ok, expected: ratioFor(kind) };
}

// ---- THE SLOT LAW (XVII, Article II) ----
// Reference budgets are pinned constants PER PROVIDER — the painter's
// honest capability, never a guess. Mock carries the full law so the
// keyless house exercises every slot.
export const SLOT_BUDGETS = {
  gemini: { subjects: 5, references: 14 },
  openai: { subjects: 5, references: 4 },
  mock: { subjects: 5, references: 14 }
};

export function slotBudget(provider = 'gemini') {
  return SLOT_BUDGETS[provider] || SLOT_BUDGETS.gemini;
}

// THE IDENTITY CEILING sits on the cue itself, at the validator's
// seat — the Art Director overflows by direction (crowd, blocking,
// shots that do not need every face), never by a sixth likeness.
export function cueCourt(cue) {
  const violations = [];
  if (cue == null) return { ok: true, violations };
  if (typeof cue !== 'object' || Array.isArray(cue)) return { ok: false, violations: ['image_cue must be an object or null'] };
  const ceiling = slotBudget('gemini').subjects;
  const subjects = Array.isArray(cue.subjects) ? cue.subjects.filter((s) => typeof s === 'string' && s.trim()) : [];
  if (subjects.length > ceiling) {
    violations.push(`image_cue.subjects names ${subjects.length} identifiable figures — the pinned ceiling is ${ceiling}; stage the rest by direction (crowd: 'background', framing that does not need every face), never a ${ceiling + 1}th likeness`);
  }
  const seen = new Set();
  for (const name of subjects) {
    const folded = name.trim().toLowerCase();
    if (seen.has(folded)) violations.push(`image_cue.subjects repeats "${name.trim()}" — one seat per soul`);
    seen.add(folded);
  }
  if (cue.items != null) {
    if (!Array.isArray(cue.items)) violations.push('image_cue.items must be an array of named items when present');
    else {
      if (cue.items.length > 4) violations.push(`image_cue.items names ${cue.items.length} — a plate features at most 4 named items`);
      for (const item of cue.items) {
        if (typeof item !== 'string' || item.trim().length < 3 || item.trim().length > 60) {
          violations.push('every image_cue.items entry is a named item, 3-60 characters');
          break;
        }
      }
    }
  }
  return { ok: violations.length === 0, violations };
}

// ---- THE PROP LAW (XVII, Article IV) ----
// An item may appear in a plate only if its holder stands in the cue,
// it is a fixture of the current ground, or this turn's operations
// moved it. Enforced on the cue's item list, at the validator's door.
export function movedItems(story) {
  const names = [];
  for (const op of story?.item_add || []) if (op?.name) names.push(op.name);
  for (const op of story?.item_transfer || []) if (op?.name) names.push(op.name);
  for (const op of story?.item_remove || []) if (op?.name) names.push(op.name);
  if (story?.item_equip?.name) names.push(story.item_equip.name);
  return names;
}

export function groundFixtures(fixtures = [], region = null) {
  if (!region) return [];
  const folded = String(region).trim().toLowerCase();
  return fixtures
    .filter((row) => String(row?.place || '').trim().toLowerCase() === folded)
    .map((row) => row?.name)
    .filter((name) => typeof name === 'string');
}

export function propLawCheck(cue, { trove = [], fixtures = [], moved = [] } = {}) {
  const refusals = [];
  const items = Array.isArray(cue?.items) ? cue.items.filter((s) => typeof s === 'string' && s.trim()) : [];
  if (!items.length) return { ok: true, refusals };
  const subjects = new Set((Array.isArray(cue?.subjects) ? cue.subjects : []).map((s) => String(s).trim().toLowerCase()));
  const fixtureSet = new Set(fixtures.map((s) => String(s).trim().toLowerCase()));
  const movedSet = new Set(moved.map((s) => String(s).trim().toLowerCase()));
  for (const raw of items) {
    const item = raw.trim();
    const folded = item.toLowerCase();
    const holder = trove.find((row) => String(row?.name || '').trim().toLowerCase() === folded)?.holder || null;
    const holderPresent = holder ? subjects.has(String(holder).trim().toLowerCase()) : false;
    if (holderPresent || fixtureSet.has(folded) || movedSet.has(folded)) continue;
    refusals.push(
      holder
        ? `image_cue.items asks for "${item}" but its holder ${holder} does not stand among the subjects — a held thing appears only in its holder's hands`
        : `image_cue.items asks for "${item}" but no recorded hand holds it, it is no fixture of this ground, and no operation moved it this turn`
    );
  }
  return { ok: refusals.length === 0, refusals };
}

// ---- THE SLOT SELECTOR (XVII, Article II) — the seating plan ----
// Deterministic, from the sealed cue alone: which subjects' sheets
// ride to the easel, in what order. The plan is names and roles; the
// foundry resolves each name to its sheet (or its sealed anchor while
// the sheet is still on the easel) and composes the binding lines
// from what actually attached.
//   1. the principal (first subject) always rides
//   2. the ground's place sheet always rides
//   3. remaining cue subjects follow in cue order
//   4. one species sheet covers every instance of that species
//   5. fixtures ride the place sheet and never spend a slot
//   6. a named item due in frame (prop-lawful) earns a slot
export function seatingPlan({ cue, region = null, species = [], provider = 'gemini' }) {
  const budget = slotBudget(provider);
  const plan = [];
  const seated = new Set();
  const seat = (name, role) => {
    const clean = String(name || '').trim();
    if (!clean || seated.has(clean.toLowerCase()) || plan.length >= budget.references) return;
    seated.add(clean.toLowerCase());
    plan.push({ name: clean, role });
  };
  const subjects = (Array.isArray(cue?.subjects) ? cue.subjects : []).filter((s) => typeof s === 'string' && s.trim());
  if (subjects[0]) seat(subjects[0], 'principal');
  if (region) seat(region, 'ground');
  for (const name of subjects.slice(1)) seat(name, 'subject');
  for (const name of species) seat(name, 'species');
  for (const name of Array.isArray(cue?.items) ? cue.items : []) seat(name, 'item');
  return { plan, budget };
}

// THE BINDING LINES — byte-stable, composed from what actually rode.
// Each attached reference is bound to its subject in plain words, in
// attachment order, so the painter never guesses which image is who.
//   resolved: [{ name, role, sheet: boolean }]
export function bindingLinesFor(resolved = []) {
  return resolved.map((ref, i) => {
    const what = ref.sheet
      ? 'the composite reference sheet (face, profile, full figure in current costume, defining detail)'
      : 'the sealed reference portrait';
    const seatName = ref.role === 'principal' ? `${ref.name}, the principal figure`
      : ref.role === 'ground' ? `${ref.name}, the ground this scene stands on`
      : ref.role === 'species' ? `the species ${ref.name} — every instance in frame`
      : ref.role === 'item' ? `the named item ${ref.name}`
      : ref.name;
    return `Reference image ${i + 1} is ${what} of ${seatName}. Hold this likeness exactly.`;
  });
}

// ---- THE REFERENCE SHEET LAW (XVII, Article I) — the grid ----
// A sheet is ONE image in a fixed 2x2 grid with a fixed cell order,
// minted once at introduction from the subject's sealed anchor by
// edit-mode derivation, and never re-anchored (the lever exists and
// its default is OFF). Minting prompts carry the silence clause.
export const SHEET_GRID = { columns: 2, rows: 2 };
export const RE_ANCHOR_LEVER = false;
export const SHEET_SILENCE_CLAUSE = 'The sheet bears no labels, no letters, no numerals, no watermarks, no writing of any kind — four painted cells and nothing else.';

export function sheetCells(kind = 'soul') {
  if (kind === 'place') return ['the establishing view at eye level', 'the same ground from a second angle', 'the widest whole view', 'the defining landmark detail, close'];
  if (kind === 'species') return ['the head, front on', 'head and body in profile', 'the full creature standing', 'the defining anatomical detail, close'];
  if (kind === 'item') return ['the item plain, front on', 'the item in profile', 'the item whole at arm\u2019s length', 'the defining detail, close'];
  return ['the face, front on, neutral expression', 'the head in true profile', 'the full figure in current costume', 'the defining detail, close'];
}

export function sheetBrief({ name, kind = 'soul', canon = '' }) {
  const cells = sheetCells(kind);
  return [
    `A single composite REFERENCE SHEET of ${name}: one image divided into a fixed ${SHEET_GRID.columns}x${SHEET_GRID.rows} grid, four cells in reading order —`,
    `top-left, ${cells[0]}; top-right, ${cells[1]}; bottom-left, ${cells[2]}; bottom-right, ${cells[3]}.`,
    'Neutral poses, eye level, flat even studio light, plain neutral backdrop in every cell — a working model sheet, not a dramatic plate.',
    canon ? `Sealed canon, preserved exactly: ${canon}.` : '',
    'Derive every cell from the attached sealed anchor image — the same face, the same build, the same costume, edited into each view; never a fresh invention.',
    SHEET_SILENCE_CLAUSE
  ].filter(Boolean).join(' ');
}

// ---- THE FRESH PLATE LAW (XVII, Article III) — the render door ----
// Every player-visible plate carries its attested cue and caption or
// it cannot render. Papers are THIS turn's papers: the attestation's
// originTurnHash must equal the sealed hash of the very turn the
// plate claims to illustrate. No prior turn's painting may stand in.
export function admitPlate({ turnHash = null, attestation = null, caption = '' }) {
  if (!attestation || typeof attestation !== 'object' || !attestation.assetHash) return { admit: false, status: 'paperless' };
  if (!turnHash || attestation.originTurnHash !== turnHash) return { admit: false, status: 'stale-papers' };
  if (typeof caption !== 'string' || !caption.trim()) return { admit: false, status: 'captionless' };
  return { admit: true, status: 'admitted' };
}

// The honest empty frame names its status in plain speech — never a
// recycled image, never dev language.
export function emptyFrameLine(status) {
  return {
    paperless: 'No painting arrived for this moment.',
    'stale-papers': 'The painting offered here belongs to another moment, so the frame stays empty.',
    captionless: 'This painting has no caption yet, so the frame waits.',
    'refused-paint': 'The painting was refused by the house\u2019s own eyes, so the frame stays empty.',
    painting: 'The painting is still on the easel.'
  }[status] || 'The frame is honestly empty.';
}

// ---- THE EASEL PRIORITY (XVII, operative clause) ----
// The paint request enqueues the moment its cue seals, ahead of voice
// and music. Deterministic: every image ask before every audio ask,
// priority within a class, declaration order breaking ties.
export function easelOrder(jobs) {
  const classOf = (job) => (job.kind === 'paint' ? 0 : 1);
  return jobs
    .map((job, i) => ({ job, i }))
    .sort((a, b) => classOf(a.job) - classOf(b.job) || (a.job.priority ?? 5) - (b.job.priority ?? 5) || a.i - b.i)
    .map((entry) => entry.job);
}

// ---- THE QUIET ROAD (XVII, Article 0) — render-payload whitelist ----
// Court language — validator violations, repair notes, reducer notes —
// is ledger-only. What MAY cross to a render surface is whitelisted by
// name; anything else is structurally absent because it is never
// copied, not because a blacklist remembered to strike it.
const RENDERABLE_TURN_FIELDS = [
  'narration_blocks', 'suggestions', 'roll_request', 'state_updates', 'combat',
  'cinematic', 'story', 'image_cue', 'dialogue_cue', 'time_advance', 'entropy_use'
];

export function renderableTurn(turn) {
  if (!turn || typeof turn !== 'object' || Array.isArray(turn)) return turn;
  const safe = {};
  for (const field of RENDERABLE_TURN_FIELDS) if (field in turn) safe[field] = turn[field];
  return safe;
}
