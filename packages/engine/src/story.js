import { getSpine } from './spines.js';
import { CONDITIONS, sheetFor } from './rules.js';
import { castVoiceByCard } from './cinema/casting.js';
// THE ONE SEAT (XVIII): the item-kind enum and the threat table live in
// protocol; the armory tables live beside them. The reducer imports the
// law it enforces — a byte-for-byte mirror WILL drift (the standing law).
import { ITEM_KINDS, THREAT_TABLE } from './protocol.js';
import { ENCHANT_TABLE, armorRowFor, derivedAc, equippedRows } from './armory.js';
// THE GRIMOIRE (XVIII, Articles IV-V): the companion shelf and the spell
// rows ride from the one library; the sheet's slots from the one
// arithmetic. The reducer folds; it never re-declares a table.
import { companionSpellsFor, spellRowFor } from './grimoire.js';
import { ROLE_TABLE, slotsForArchetype } from './rules.js';

export const REGION_STATES = ['thriving', 'troubled', 'corrupted', 'ruined', 'healed'];
// The status law: a soul is exactly one of these. Anything else the DM sends
// is refused (noted as a wound), never written to canon. 'dead' is permanent
// downstream — the validator forbids the dead to speak from the next turn on.
export const CAST_STATUS = ['active', 'dead', 'missing'];
const MAX_FACTS = 10;
const MAX_BOND_ARC = 12;
// An honored early ending breathes for this many quiet turns before the seal.
export const SEALING_DENOUEMENT_TURNS = 3;

// The acts as the player reads them (directive §3.5): every spine beat
// already carries its act number; these are the acts' spoken names.
export const ACT_NAMES = {
  1: 'the world as it was',
  2: 'the world unravelling',
  3: 'the world remade'
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
const clean = (value, max = 500) => String(value || '').trim().slice(0, max);
const canonName = (value) => String(value ?? '').trim().toLowerCase();

export function romanNumeral(n) {
  const value = Math.max(1, Math.trunc(Number(n) || 1));
  const table = [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let rest = value, out = '';
  for (const [size, glyph] of table) while (rest >= size) { out += glyph; rest -= size; }
  return out;
}

// Chapter I…N is the beat index made visible; one beat, one chapter.
export function chapterInfo(codex) {
  const beats = codex.spine.beats;
  const beat = beats[codex.beatIndex] || beats[beats.length - 1];
  return {
    numeral: romanNumeral(codex.beatIndex + 1),
    countNumeral: romanNumeral(beats.length),
    count: beats.length,
    title: beat.title,
    goal: beat.goal,
    act: beat.act || 1
  };
}

export function actInfo(codex) {
  const act = codex.spine.beats[codex.beatIndex]?.act || 1;
  return { act, numeral: romanNumeral(act), name: ACT_NAMES[act] || ACT_NAMES[1] };
}

// Resolve a DM-sent name to a cast card: exact canonical match first, then a
// unique bare-first-name alias ("Mara" reaches "Mara Vey" when she is the only
// Mara at the table). An ambiguous alias resolves to nobody — canon is never
// guessed. The validator's dead-speak check follows the same law.
function findSoul(cast, rawName) {
  const name = canonName(rawName);
  if (!name) return null;
  const exact = cast.find((entry) => canonName(entry.name) === name);
  if (exact) return exact;
  const aliased = cast.filter((entry) => canonName(entry.name).split(/\s+/)[0] === name);
  return aliased.length === 1 ? aliased[0] : null;
}

function pushFact(list, fact) {
  const facts = Array.isArray(list) ? [...list] : [];
  const value = clean(fact, 160);
  if (!value) return facts;
  if (facts.some((f) => String(f).toLowerCase() === value.toLowerCase())) return facts;
  facts.push(value);
  return facts.slice(-MAX_FACTS);
}

// THE STORY SMITH (Directive XIX, Article I): the forge may seat a
// bespoke spine — minted, courted, and attested at the door — so the
// init path accepts the spine OBJECT itself as well as a shelf id.
// Additive: every standing caller passes an id and walks unchanged.
export function initCodex(spineId, seed = {}) {
  const spine = spineId && typeof spineId === 'object' && !Array.isArray(spineId) ? spineId : getSpine(spineId);
  // THE POSSESSIONS CUT (Directive VI): the forge keepsake is the lawful
  // trove seed — cited to turn zero, carried from the forge. troveOf reads
  // the same truth from the hero sheet, so journal and working memory
  // agree from the first word. No keepsake, no seed: an empty trove is an
  // absence honestly recorded, never a defect.
  const keepsake = seed.keepsake && String(seed.keepsake.name || '').trim()
    ? [{ name: clean(seed.keepsake.name, 60), kind: 'keepsake', holder: clean(seed.keepsake.holder, 60), note: null, status: 'held', since: 0, moved: 0 }]
    : [];
  // THE HORIZON (XIX, Article VII): the smith's swept rumors seed the
  // pool at the forge — seed.rumors, sealed with the spine's own mint.
  // No rumors, no pool: an empty horizon is an absence honestly recorded.
  const rumorPool = Array.isArray(seed.rumors)
    ? seed.rumors.filter((text) => typeof text === 'string' && text.trim()).slice(0, 6).map((text) => ({ text: clean(text, 200), status: 'unopened', opened_turn: null }))
    : [];
  return {
    version: 1,
    spine: structuredClone(spine),
    beatIndex: 0,
    arc: seed.arc || null,
    cast: [],
    regions: [],
    memoir: [],
    chronicle: [],
    blight: 0,
    notes: [],
    threads: [],
    trove: keepsake,
    purses: [],
    // THE OPEN ROAD (Directive XIX, Articles IV–VII): declared ambitions,
    // long clocks, the standings ledger (shift ROWS — a score exists only
    // as the fold's own sum), the spine's lawful bends, and the horizon.
    ambitions: [],
    clocks: [],
    standings: [],
    spineAmendments: [],
    rumorPool,
    scene: null,
    // THE PARTY AND THE ELSEWHERE (Directive VIII): who travels with the
    // hero, and the sealed fixtures of every place. The hero is the
    // party's permanent root and never appears in the list.
    party: [],
    fixtures: [],
    // THE BATTLE CUT (Directive X): the sealed bestiary — species canon,
    // written once, painted forever.
    bestiary: [],
    completed: false
  };
}

// THE STANDING SUM (XIX, Article VI) — the ONE arithmetic. A faction's
// score is the sum of its cited shift rows and exists nowhere else; the
// briefing and the Book both read this fold, never their own math.
// Sorted strongest-first by |score|, ties by name — byte-stable.
export function standingsOf(codex) {
  const rows = Array.isArray(codex?.standings) ? codex.standings : [];
  const seats = new Map();
  for (const row of rows) {
    const key = canonName(row?.faction);
    if (!key) continue;
    const seat = seats.get(key) || { faction: row.faction, score: 0, shifts: [] };
    seat.score += Number.isInteger(row?.delta) ? row.delta : 0;
    seat.shifts.push({ ...row });
    seats.set(key, seat);
  }
  return [...seats.values()].sort((a, b) => Math.abs(b.score) - Math.abs(a.score) || String(a.faction).localeCompare(String(b.faction)));
}

// THE HORIZON'S EDGE (XIX, Article VII) — the unopened rumors, bounded,
// in pool order: what the chart's blank vellum may whisper. Marked as
// rumor by every reader; never geography, never a medallion.
export function horizonRumors(codex, cap = 3) {
  return (Array.isArray(codex?.rumorPool) ? codex.rumorPool : [])
    .filter((row) => row && row.status === 'unopened' && typeof row.text === 'string')
    .slice(0, Math.max(0, cap))
    .map((row) => row.text);
}

// SEAL THE TALE — the honored early ending (directive §3.6). The player may
// choose the seal at any time; the DM is then steered into quiet denouement
// turns through the [STORY] directives, and the tale completes once those
// turns have breathed. A pure reducer so the proving ground can walk it.
export function requestSeal(codex, turn) {
  if (codex.completed || codex.sealing) return codex;
  const next = structuredClone(codex);
  const requested = Number.isInteger(turn) ? turn : 0;
  next.sealing = { requested_turn: requested, final_turn: requested + SEALING_DENOUEMENT_TURNS - 1 };
  next.notes.push('The player has chosen to seal the tale — the denouement begins.');
  return next;
}

// meta.turn — the turn number being applied. Stamped onto new cast cards
// (introduced_turn) and bond-arc entries so the storybook can narrate
// relationships truthfully ("by turn 9, she trusted you"). Optional: sealed
// replays and old call sites simply record null. NOTE: this reducer must run
// even when the DM sends story:null — the sealing countdown ticks on every
// turn, not only on turns that carry updates.
export function applyStoryUpdates(codex, updates, meta = {}) {
  const next = structuredClone(codex);
  updates = updates || {};
  if (updates.arc && !next.arc) {
    next.arc = {
      title: clean(updates.arc.title, 100),
      evil_plot: clean(updates.arc.evil_plot, 700),
      stakes: clean(updates.arc.stakes, 500),
      style_bible: clean(updates.arc.style_bible, 240)
    };
  }

  for (const soul of updates.cast_add || []) {
    const exists = next.cast.some((entry) => canonName(entry.name) === canonName(soul.name));
    if (exists) {
      next.notes.push(`Canon attack blocked: ${clean(soul.name, 80)} was already introduced.`);
      continue;
    }
    if (soul.role === 'villain' && next.cast.some((entry) => entry.role === 'villain')) {
      next.notes.push(`Second villain blocked: ${clean(soul.name, 80)}.`);
      continue;
    }
    const card = {
      id: soul.id || `soul-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
      name: clean(soul.name, 80), role: clean(soul.role, 40),
      visual: clean(soul.visual, 360), voice: clean(soul.voice, 180),
      goal: clean(soul.goal, 300), secret: clean(soul.secret, 300),
      status: 'active', bond: 0, last_seen: null,
      known_facts: [], bond_arc: [],
      introduced_turn: Number.isInteger(meta.turn) ? meta.turn : null
    };
    // THE TENOR LAW: the DM's explicit voice_card (gender / age / timbre)
    // rides onto the cast card before the casting session, so the voice is
    // chosen by stated identity — never inferred from prose.
    const stated = soul.voice_card || {};
    const gender = String(stated.gender || '').toLowerCase();
    if (['feminine', 'masculine', 'neutral'].includes(gender)) card.gender = gender;
    const band = String(stated.age || '').toLowerCase();
    if (['child', 'young', 'adult', 'elder'].includes(band)) card.age_band = band;
    if (stated.timbre) card.timbre = clean(String(stated.timbre), 24);
    // THE CASTING SESSION happens here, once, at first introduction: the
    // voice is chosen by reading the card and persisted forever. Souls from
    // before this law have no voiceId and keep their legacy hash voice.
    card.voiceId = castVoiceByCard(card, card.name);
    next.cast.push(card);
  }

  for (const patch of updates.cast_update || []) {
    const soul = findSoul(next.cast, patch.name);
    if (!soul) continue;
    if (patch.status) {
      const status = String(patch.status).trim().toLowerCase();
      if (!CAST_STATUS.includes(status)) {
        next.notes.push(`Unlawful status refused for ${soul.name}: "${clean(patch.status, 40)}" (allowed: ${CAST_STATUS.join(' | ')}).`);
      } else if (status !== soul.status) {
        // Death is a sealed event: the status flips once, a memorial fact is
        // written, and from the NEXT turn the validator holds the line — the
        // dead do not speak. No resurrection retcons.
        if (soul.status === 'dead') {
          next.notes.push(`Resurrection retcon blocked: ${soul.name} is dead and remains so.`);
        } else {
          soul.status = status;
          if (status === 'dead') {
            soul.known_facts = pushFact(soul.known_facts, `Fell${Number.isInteger(meta.turn) ? ` on turn ${meta.turn}` : ''}${patch.last_seen ? ` — ${clean(patch.last_seen, 100)}` : ''}`);
            // THE DOOM LAW (Directive X, Law VII) — the fall marks the
            // ledger: every open thread held by the fallen carries a fall
            // note in the journal's own hand. The thread stays open —
            // grief is not an outcome.
            for (const thread of next.threads || []) {
              if (thread.status === 'open' && thread.holder && canonName(thread.holder) === canonName(soul.name)) {
                thread.fallNote = `${soul.name} fell holding this.`;
                next.notes.push(`The thread "${thread.label}" lost its holder: ${soul.name} has fallen.`);
              }
            }
          }
        }
      }
    }
    const delta = Math.trunc(Number(patch.bond_delta) || 0);
    soul.bond = clamp(soul.bond + delta, 0, 4);
    if (delta !== 0) {
      // The bond arc remembers WHEN a disposition moved and why, so the
      // storybook can narrate the relationship rather than assert it.
      soul.bond_arc = [
        ...(Array.isArray(soul.bond_arc) ? soul.bond_arc : []),
        { turn: Number.isInteger(meta.turn) ? meta.turn : null, delta, why: clean(patch.bond_reason || patch.last_seen || '', 140) || null }
      ].slice(-MAX_BOND_ARC);
    }
    if (patch.fact_add) soul.known_facts = pushFact(soul.known_facts, patch.fact_add);
    // voice_card on an update may FILL missing identity fields (for the wiki
    // and the record) but can never flip a stated one, and the cast voiceId
    // is already sealed — the Cast Law holds.
    if (patch.voice_card) {
      const late = patch.voice_card;
      const lateGender = String(late.gender || '').toLowerCase();
      if (!soul.gender && ['feminine', 'masculine', 'neutral'].includes(lateGender)) soul.gender = lateGender;
      const lateBand = String(late.age || '').toLowerCase();
      if (!soul.age_band && ['child', 'young', 'adult', 'elder'].includes(lateBand)) soul.age_band = lateBand;
      if (!soul.timbre && late.timbre) soul.timbre = clean(String(late.timbre), 24);
    }
    if (patch.last_seen) soul.last_seen = clean(patch.last_seen, 160);
  }

  // THE THREAD LEDGER (Directive V) — promises, debts, mysteries, and sworn
  // goals as sealed operations. The reducer is the canon guard: at most two
  // adds a turn, a duplicate open label is blocked with a note, and only an
  // open thread may close, with an honest outcome.
  const THREAD_KINDS = ['promise', 'debt', 'mystery', 'goal'];
  const THREAD_OUTCOMES = ['kept', 'broken', 'resolved'];
  next.threads = next.threads || [];
  for (const add of (updates.thread_add || []).slice(0, 2)) {
    const label = clean(add?.label, 90);
    if (!label) continue;
    if (next.threads.some((thread) => canonName(thread.label) === canonName(label) && thread.status === 'open')) {
      next.notes.push(`Duplicate open thread blocked: ${label}.`);
      continue;
    }
    // THE HORIZON CITATION (XIX, Article VII): a thread may open FROM a
    // rumor — the citation rides the row whole, and the cited rumor leaves
    // the pool so the chart's edge seats the next whisper.
    const citedRumor = add.rumor ? clean(add.rumor, 200) : null;
    next.threads.push({ label, kind: THREAD_KINDS.includes(add.kind) ? add.kind : 'promise', holder: add.holder ? clean(add.holder, 60) : null, status: 'open', outcome: null, rumor: citedRumor });
    if (citedRumor) {
      next.rumorPool = next.rumorPool ?? [];
      const pooled = next.rumorPool.find((row) => row.status === 'unopened' && canonName(row.text) === canonName(citedRumor));
      if (pooled) { pooled.status = 'opened'; pooled.opened_turn = Number.isInteger(meta.turn) ? meta.turn : null; }
      else next.notes.push(`The cited rumor is not on the horizon — the thread stands, the pool holds: ${citedRumor}.`);
    }
  }
  for (const close of (updates.thread_resolve || []).slice(0, 2)) {
    const open = next.threads.find((thread) => canonName(thread.label) === canonName(clean(close?.label, 90)) && thread.status === 'open');
    if (!open || !THREAD_OUTCOMES.includes(close?.outcome)) {
      next.notes.push(`Unlawful thread resolve blocked: ${clean(close?.label, 90) || 'unnamed'}.`);
      continue;
    }
    open.status = close.outcome; open.outcome = close.outcome;
  }

  // THE OPEN ROAD (Directive XIX, Articles IV–VII) — the declaration, the
  // clocks, the standings, and the spine's one lawful bend. The door
  // refuses malformed ops by name; these belts SPEAK when an unlawful op
  // reaches the record purse-blind. Old codexes backfill empty seats.
  next.ambitions = next.ambitions ?? [];
  for (const add of (updates.ambition_add || []).slice(0, 1)) {
    const text = clean(add?.text, 200);
    if (!text) continue;
    if (next.ambitions.some((row) => canonName(row.text) === canonName(text) && row.status === 'open')) {
      next.notes.push(`The ambition already stands open: ${text}.`);
      continue;
    }
    next.ambitions.push({ text, status: 'open', outcome: null, declared_turn: Number.isInteger(meta.turn) ? meta.turn : null, resolved_turn: null });
  }
  const AMBITION_ENDS = ['achieved', 'renounced', 'lost'];
  for (const close of (updates.ambition_resolve || []).slice(0, 2)) {
    const open = next.ambitions.find((row) => canonName(row.text) === canonName(clean(close?.text, 200)) && row.status === 'open');
    if (!open || !AMBITION_ENDS.includes(close?.outcome)) {
      next.notes.push(`Unlawful ambition resolve blocked: ${clean(close?.text, 200) || 'unnamed'}.`);
      continue;
    }
    open.status = close.outcome; open.outcome = close.outcome;
    open.resolved_turn = Number.isInteger(meta.turn) ? meta.turn : null;
  }
  next.clocks = next.clocks ?? [];
  const CLOCK_SPANS = [4, 6, 8];
  const CLOCK_ENDS = ['struck', 'averted', 'lapsed'];
  let clockBudget = 2;
  for (const open of updates.clock_open || []) {
    if (clockBudget <= 0) { next.notes.push('The clock budget is spent — an open folded away.'); continue; }
    clockBudget -= 1;
    const label = clean(open?.label, 90);
    if (!label || !CLOCK_SPANS.includes(open?.segments)) { next.notes.push(`Unlawful clock blocked: ${label || 'unnamed'}.`); continue; }
    if (next.clocks.some((row) => canonName(row.label) === canonName(label) && row.status === 'open')) { next.notes.push(`Duplicate open clock blocked: ${label}.`); continue; }
    next.clocks.push({ label, segments: open.segments, ambition: open.ambition ? clean(open.ambition, 200) : null, ticks: [], status: 'open', outcome: null, opened_turn: Number.isInteger(meta.turn) ? meta.turn : null, resolved_turn: null });
  }
  for (const tick of updates.clock_tick || []) {
    if (clockBudget <= 0) { next.notes.push('The clock budget is spent — a tick folded away.'); continue; }
    clockBudget -= 1;
    const clock = next.clocks.find((row) => canonName(row.label) === canonName(clean(tick?.label, 90)) && row.status === 'open');
    const reason = clean(tick?.reason, 160);
    if (!clock || !reason) { next.notes.push(`Unlawful clock tick blocked: ${clean(tick?.label, 90) || 'unnamed'}.`); continue; }
    if (clock.ticks.length >= clock.segments) { next.notes.push(`The clock stands filled — a tick past full folded away: ${clock.label}.`); continue; }
    clock.ticks.push({ turn: Number.isInteger(meta.turn) ? meta.turn : null, reason });
  }
  for (const close of updates.clock_resolve || []) {
    if (clockBudget <= 0) { next.notes.push('The clock budget is spent — a resolve folded away.'); continue; }
    clockBudget -= 1;
    const clock = next.clocks.find((row) => canonName(row.label) === canonName(clean(close?.label, 90)) && row.status === 'open');
    if (!clock || !CLOCK_ENDS.includes(close?.outcome)) { next.notes.push(`Unlawful clock resolve blocked: ${clean(close?.label, 90) || 'unnamed'}.`); continue; }
    clock.status = 'resolved'; clock.outcome = close.outcome;
    clock.resolved_turn = Number.isInteger(meta.turn) ? meta.turn : null;
  }
  next.standings = next.standings ?? [];
  const STANDING_STEPS = [-2, -1, 1, 2];
  for (const shift of (updates.standing_shift || []).slice(0, 2)) {
    const faction = clean(shift?.faction, 80);
    const reason = clean(shift?.reason, 160);
    if (!faction || !reason || !STANDING_STEPS.includes(shift?.delta)) { next.notes.push(`Unlawful standing shift blocked: ${faction || 'unnamed'}.`); continue; }
    next.standings.push({ faction, delta: shift.delta, reason, turn: Number.isInteger(meta.turn) ? meta.turn : null });
  }
  next.spineAmendments = next.spineAmendments ?? [];
  const amend = updates.spine_amend;
  if (amend && typeof amend === 'object' && !Array.isArray(amend)) {
    const act = Number.isInteger(amend.act) ? amend.act : null;
    const reason = clean(amend.reason, 200);
    const beatName = clean(amend.beat, 120);
    const beats = next.spine?.beats || [];
    const index = beats.findIndex((beat) => canonName(beat?.title) === canonName(beatName));
    if (!act || !reason || !beatName || (amend.title == null && amend.goal == null)) {
      next.notes.push('Unlawful spine amendment blocked: act, stated reason, beat, and a reshaped title or goal are all required.');
    } else if (next.spineAmendments.some((row) => row.act === act)) {
      next.notes.push(`The spine bends once an act — a second amendment in act ${act} refused.`);
    } else if (index < 0 || beats[index].act !== act) {
      next.notes.push(`spine_amend names no beat of act ${act}: ${beatName || 'unnamed'}.`);
    } else if (index <= (next.beatIndex ?? 0)) {
      next.notes.push(`The played road does not rewrite — spine_amend refused for the reached beat: ${beats[index].title}.`);
    } else {
      if (amend.title != null) beats[index].title = clean(amend.title, 100);
      if (amend.goal != null) beats[index].goal = clean(amend.goal, 300);
      next.spineAmendments.push({ act, beat: beatName, title: amend.title != null ? clean(amend.title, 100) : null, goal: amend.goal != null ? clean(amend.goal, 300) : null, reason, turn: Number.isInteger(meta.turn) ? meta.turn : null });
    }
  }
  next.rumorPool = next.rumorPool ?? [];

  // THE POSSESSIONS CUT (Directive VI) — named things and per-holder coin
  // as sealed operations. The reducer is the canon guard: at most three
  // item operations a turn (adds, then transfers, then removes), at most
  // two purse movements; a duplicate held name, a movement from a hand the
  // record does not show, and an overdraft are refused with notes — and
  // the clamp holds even for a turn that reached this fold purse-blind.
  next.trove = next.trove || [];
  next.purses = next.purses || [];
  const heldThing = (name) => next.trove.find((item) => canonName(item.name) === canonName(name) && item.status === 'held');
  const stamp = Number.isInteger(meta.turn) ? meta.turn : null;
  let itemBudget = 3;
  for (const add of updates.item_add || []) {
    if (itemBudget <= 0) break;
    itemBudget -= 1;
    const name = clean(add?.name, 60);
    if (!name) continue;
    if (heldThing(name)) {
      next.notes.push(`Duplicate held thing blocked: ${name}.`);
      continue;
    }
    const kind = ITEM_KINDS.has(add?.kind) ? add.kind : 'keepsake';
    // THE ENCHANT LAW (XVIII, Article II) — a born rune rides only a
    // lawful table seat; the reducer guards the door-blind paths.
    const bornRune = typeof add?.enchant === 'string' && ENCHANT_TABLE[add.enchant]?.seats.includes(kind) ? add.enchant : null;
    next.trove.push({
      name, kind,
      holder: clean(add?.holder, 60), note: add?.note ? clean(add.note, 90) : null,
      ...(bornRune ? { enchant: bornRune } : {}),
      status: 'held', since: stamp, moved: stamp
    });
  }
  for (const move of updates.item_transfer || []) {
    if (itemBudget <= 0) break;
    itemBudget -= 1;
    const item = heldThing(move?.name);
    const to = clean(move?.to, 60);
    if (!item || !to || canonName(item.holder) !== canonName(move?.from) || canonName(move?.from) === canonName(to)) {
      next.notes.push(`Unlawful transfer blocked: ${clean(move?.name, 60) || 'an unnamed thing'} does not sit in the stated hand.`);
      continue;
    }
    item.holder = to;
    item.moved = stamp;
    // THE EQUIPPED LAW (Directive XII §III.4) — a transfer hands the
    // thing over unequipped; the mark never rides between hands.
    if (item.equipped) delete item.equipped;
  }
  for (const drop of updates.item_remove || []) {
    if (itemBudget <= 0) break;
    itemBudget -= 1;
    const item = heldThing(drop?.name);
    if (!item || canonName(item.holder) !== canonName(drop?.holder)) {
      next.notes.push(`Unlawful remove blocked: ${clean(drop?.name, 60) || 'an unnamed thing'} does not sit in the stated hand.`);
      continue;
    }
    item.status = 'gone';
    item.moved = stamp;
    item.reason = drop?.reason ? clean(drop.reason, 90) : null;
    if (item.equipped) delete item.equipped;
  }
  // THE EQUIPPED LAW (Directive XII §III) — one mark moves per turn:
  // the thing must sit in the named hand and be weapon or tool; a new
  // mark of the same kind lawfully unseats the standing one (the old
  // steps back to the pack, noted); the offscreen tick may not arm a
  // hand. The mark is presence-only: `equipped: true` or absent.
  const equip = updates.item_equip;
  if (equip && typeof equip === 'object' && !Array.isArray(equip)) {
    if (meta.tick) next.notes.push('The offscreen world may not ready a hand: item_equip refused on a tick.');
    else {
      const thing = heldThing(equip?.name);
      const equipHolder = clean(equip?.holder, 60);
      if (!thing || !equipHolder || canonName(thing.holder) !== canonName(equipHolder)) {
        next.notes.push(`Unlawful equip blocked: ${clean(equip?.name, 60) || 'an unnamed thing'} does not sit in the stated hand.`);
      } else if (!['weapon', 'tool', 'armor'].includes(thing.kind)) {
        next.notes.push(`Unlawful equip blocked: ${thing.name} is a ${thing.kind}; only weapons, tools, and armor stand at the ready.`);
      } else if (thing.equipped) {
        next.notes.push(`Already at the ready: ${thing.name} stands equipped in ${thing.holder}'s hand.`);
      } else {
        // THE WORN LAW (XVIII, Article I) — the swap classes are the
        // weapon hand, the tool hand, the worn suit, and the shield: a
        // new mark unseats ONLY its own class (plate for leather, never
        // the sword for the shield). The suit/shield split reads the
        // armor table's one seat, deterministic by name.
        const equipClass = (item) => item.kind === 'armor' ? (armorRowFor(item.name)?.kind === 'shield' ? 'shield' : 'suit') : item.kind;
        const thingClass = equipClass(thing);
        const standing = next.trove.find((item) => item !== thing && item.status === 'held' && canonName(item.holder) === canonName(equipHolder) && item.equipped && equipClass(item) === thingClass);
        if (standing) {
          delete standing.equipped;
          next.notes.push(`${standing.name} steps back to the pack: ${thing.name} takes its place at the ready.`);
        }
        thing.equipped = true;
        thing.moved = stamp;
      }
    }
  }
  // THE ENCHANT LAW (XVIII, Article II) — one rune, table key alone,
  // laid on a held thing in the stated hand; the offscreen tick may
  // not work runes. The reducer is the guardian for door-blind paths:
  // unknown keys, second runes, and unlawful seats become notes.
  const enchantOp = updates.item_enchant;
  if (enchantOp && typeof enchantOp === 'object' && !Array.isArray(enchantOp)) {
    if (meta.tick) next.notes.push('The offscreen world may not work runes: item_enchant refused on a tick.');
    else {
      const thing = heldThing(enchantOp?.name);
      const enchantHolder = clean(enchantOp?.holder, 60);
      const runeKey = typeof enchantOp?.enchant === 'string' ? enchantOp.enchant : null;
      const rune = runeKey ? ENCHANT_TABLE[runeKey] : null;
      if (!thing || !enchantHolder || canonName(thing.holder) !== canonName(enchantHolder)) {
        next.notes.push(`Unlawful rune blocked: ${clean(enchantOp?.name, 60) || 'an unnamed thing'} does not sit in the stated hand.`);
      } else if (!rune) {
        next.notes.push(`Unlawful rune blocked: no ${clean(runeKey || '', 30) || 'nameless'} rune stands in the table.`);
      } else if (thing.enchant) {
        next.notes.push(`Unlawful rune blocked: ${thing.name} already carries the ${thing.enchant} rune.`);
      } else if (!rune.seats.includes(thing.kind)) {
        next.notes.push(`Unlawful rune blocked: the ${runeKey} rune does not seat on a ${thing.kind}.`);
      } else {
        thing.enchant = runeKey;
        thing.moved = stamp;
        next.notes.push(`The rune takes: ${thing.name} now carries the ${runeKey} rune.`);
      }
    }
  }
  for (const move of (updates.purse || []).slice(0, 2)) {
    const holder = clean(move?.holder, 60);
    const delta = Math.trunc(Number(move?.delta) || 0);
    const reason = clean(move?.reason, 90);
    if (!holder || !delta || !reason) {
      next.notes.push('Unlawful purse movement blocked: holder, delta, and reason are all required.');
      continue;
    }
    let purse = next.purses.find((entry) => canonName(entry.holder) === canonName(holder));
    if (!purse) {
      purse = { holder, coin: 0 };
      next.purses.push(purse);
    }
    const target = purse.coin + delta;
    if (target < 0) {
      next.notes.push(`The purse of ${holder} cannot fall below zero — clamped (held ${purse.coin}, asked ${delta}) at "${reason}".`);
      purse.coin = 0;
    } else {
      purse.coin = target;
    }
  }

  const world = updates.world;
  if (world) {
    // THE WORLD SHAPE COURT (Directive XIX, Article VIII) — the door
    // (validateDmTurn's world court) now refuses malformed payloads by
    // name before they reach this fold. What remains here is a last
    // belt, and the belt SPEAKS: the silent bend retires in favor of a
    // standing note in the record.
    const stood = next.blight;
    const delta = world.blight_delta || 0;
    const target = stood + delta;
    next.blight = clamp(target, 0, 5);
    if (delta && next.blight !== target) {
      next.notes.push(`The blight cannot leave 0..5 — held at ${next.blight} (stood ${stood}, asked ${delta > 0 ? '+' : ''}${delta}).`);
    }
    if (world.region_add) {
      if (next.regions.some((region) => canonName(region.name) === canonName(world.region_add.name))) {
        next.notes.push(`The region ${clean(world.region_add.name, 100)} already stands — the add folded away.`);
      } else {
        next.regions.push({
          id: world.region_add.id || `region-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
          name: clean(world.region_add.name, 100), visual: clean(world.region_add.visual, 360), state: 'thriving'
        });
      }
    }
    if (world.region_update) {
      const region = next.regions.find((entry) => canonName(entry.name) === canonName(world.region_update.name));
      if (!region) {
        next.notes.push(`region_update names ${clean(world.region_update.name, 100)} — the record holds no such ground; folded away.`);
      } else if (!REGION_STATES.includes(world.region_update.state)) {
        next.notes.push(`region_update asks an unknown state for ${region.name} — folded away.`);
      } else {
        region.state = world.region_update.state;
      }
    }
  }

  // THE FIXTURE LAW (Directive VIII.6) — fixtures fold after the world and
  // before the ground: place-bound canon, sealed once like region canon.
  // Old codexes backfill []. The offscreen tick MAY seal a fixture — the
  // elsewhere builds, it never moves souls — and no replay reads fixtures,
  // so the one record cannot split.
  next.fixtures = next.fixtures ?? [];
  const fixtureAdd = updates.fixture_add;
  if (fixtureAdd && typeof fixtureAdd === 'object' && !Array.isArray(fixtureAdd)) {
    const placeName = clean(fixtureAdd.place, 100);
    const fixtureName = clean(fixtureAdd.name, 60);
    const fixtureVisual = clean(fixtureAdd.visual, 160);
    const heldPlace = placeName ? next.regions.find((entry) => canonName(entry.name) === canonName(placeName)) : null;
    if (!fixtureName || !fixtureVisual) {
      next.notes.push('Unlawful fixture blocked: a fixture needs its name and its visual truth.');
    } else if (!heldPlace) {
      next.notes.push(`Unlawful fixture blocked: ${placeName || 'an unnamed place'} is not a region the record knows.`);
    } else if (next.fixtures.some((row) => canonName(row.name) === canonName(fixtureName) && canonName(row.place) === canonName(heldPlace.name))) {
      next.notes.push(`Fixture canon sealed once: ${fixtureName} already stands in ${heldPlace.name}.`);
    } else {
      next.fixtures.push({ place: heldPlace.name, name: fixtureName, visual: fixtureVisual, since: Number.isInteger(meta.turn) ? meta.turn : null });
    }
  }

  // THE BESTIARY LAW (Directive X, Law I) — species canon folds beside the
  // fixtures: sealed once, refused thereafter with a note. The offscreen
  // tick MAY seal a species — the elsewhere breeds, it never moves souls —
  // and no replay reads the bestiary, so the one record cannot split.
  // Old codexes backfill [].
  next.bestiary = next.bestiary ?? [];
  const creatureAdd = updates.creature_add;
  if (creatureAdd && typeof creatureAdd === 'object' && !Array.isArray(creatureAdd)) {
    const species = clean(creatureAdd.species, 60);
    const speciesVisual = clean(creatureAdd.visual, 160);
    const speciesNature = clean(creatureAdd.nature, 90);
    const threat = Math.trunc(Number(creatureAdd.threat) || 0);
    if (!species || !speciesVisual || !speciesNature) {
      next.notes.push('Unlawful creature blocked: a species needs its name, its visual truth, and its nature.');
    } else if (threat < 1 || threat > 5) {
      next.notes.push(`Unlawful creature blocked: ${species} carries no honest threat rating.`);
    } else if (next.bestiary.some((card) => canonName(card.species) === canonName(species))) {
      next.notes.push(`Species canon sealed once: ${species} already stands in the bestiary.`);
    } else {
      // THE SPECIES SPELLBOOK (XVIII, Article V): an optional spells list
      // seals WITH the card — grimoire keys only, at most four; unlawful
      // books fall whole and the species seals bookless (the door already
      // spoke; the fold fails closed, never half-seats).
      const book = Array.isArray(creatureAdd.spells)
        ? creatureAdd.spells.map((name) => String(name).trim().toLowerCase()).filter((key) => spellRowFor(key)).slice(0, 4)
        : null;
      next.bestiary.push({ species, visual: speciesVisual, nature: speciesNature, threat, ...(book && book.length ? { spells: book } : {}), since: Number.isInteger(meta.turn) ? meta.turn : null });
    }
  }

  // THE PRESENCE CUT (Directive VII) — the ground folds AFTER the world,
  // so a region added this turn stands before the scene is set upon it.
  // Old codexes backfill scene: null. The offscreen world may act, never
  // relocate the stage: a tick fold refuses scene_set with a note. An
  // unknown region is refused with a note. Restating the standing region
  // no-ops — the ground did not change, so sinceTurn holds.
  next.scene = next.scene ?? null;
  const sceneSet = updates.scene_set;
  if (sceneSet && typeof sceneSet === 'object' && !Array.isArray(sceneSet)) {
    const regionName = clean(sceneSet.region, 100);
    const held = regionName ? next.regions.find((entry) => canonName(entry.name) === canonName(regionName)) : null;
    if (meta.tick) {
      next.notes.push('The offscreen world may not move the stage: scene_set refused on a tick.');
    } else if (!held) {
      next.notes.push(`Unlawful scene_set blocked: ${regionName || 'an unnamed region'} is not a region the record knows.`);
    } else if (!next.scene || canonName(next.scene.region) !== canonName(held.name)) {
      next.scene = { region: held.name, sinceTurn: Number.isInteger(meta.turn) ? meta.turn : null };
    }
  }

  // THE PARTY LAW (Directive VIII.2) — the party folds AFTER the ground,
  // so a leave in a traveling turn pins against the NEW scene unless it
  // names another region outright. Old codexes backfill []. The hero is
  // the permanent root and never appears. The offscreen tick may not move
  // the party: the presence replay skips tick rows whole, and a party the
  // fold moved where the replay cannot follow would split the one record.
  next.party = next.party ?? [];
  const heroRoot = typeof meta.heroName === 'string' ? meta.heroName.trim() : '';
  const namesHero = (raw) => Boolean(heroRoot) && (canonName(raw) === canonName(heroRoot) || canonName(heroRoot).split(/\s+/)[0] === canonName(raw) || canonName(raw).split(/\s+/)[0] === canonName(heroRoot));
  const partyJoin = updates.party_join;
  if (partyJoin && typeof partyJoin === 'object' && !Array.isArray(partyJoin)) {
    const rawName = clean(partyJoin.name, 80);
    const soul = rawName ? findSoul(next.cast, rawName) : null;
    if (meta.tick) next.notes.push('The offscreen world may not move the party: party_join refused on a tick.');
    else if (!rawName) next.notes.push('Unlawful party_join blocked: the joining soul must be named.');
    else if (namesHero(rawName)) next.notes.push(`The hero is the party's root: ${rawName} is never joined.`);
    else if (!soul) next.notes.push(`Unlawful party_join blocked: ${rawName} is not a soul the record knows.`);
    else if (soul.status === 'dead') next.notes.push(`The dead do not travel: ${soul.name}.`);
    else if (next.party.some((member) => canonName(member.name) === canonName(soul.name))) next.notes.push(`Duplicate party_join blocked: ${soul.name} already travels.`);
    else next.party.push({ name: soul.name, joinedTurn: Number.isInteger(meta.turn) ? meta.turn : null });
  }
  const partyLeave = updates.party_leave;
  if (partyLeave && typeof partyLeave === 'object' && !Array.isArray(partyLeave)) {
    const rawName = clean(partyLeave.name, 80);
    const exactMember = rawName ? next.party.find((entry) => canonName(entry.name) === canonName(rawName)) : null;
    const aliasMembers = rawName ? next.party.filter((entry) => canonName(entry.name).split(/\s+/)[0] === canonName(rawName)) : [];
    const member = exactMember || (aliasMembers.length === 1 ? aliasMembers[0] : null);
    const remainsRaw = partyLeave.remains_at == null ? null : clean(partyLeave.remains_at, 100);
    const remainsHeld = remainsRaw ? next.regions.find((entry) => canonName(entry.name) === canonName(remainsRaw)) : null;
    if (meta.tick) next.notes.push('The offscreen world may not move the party: party_leave refused on a tick.');
    else if (!rawName) next.notes.push('Unlawful party_leave blocked: the departing soul must be named.');
    else if (namesHero(rawName)) next.notes.push(`The hero is the party's root: ${rawName} is never left.`);
    else if (!member) next.notes.push(`Unlawful party_leave blocked: ${rawName} does not travel with the party.`);
    else if (remainsRaw && !remainsHeld) next.notes.push(`Unlawful party_leave blocked: ${remainsRaw} is not a region the record knows.`);
    else next.party = next.party.filter((entry) => entry !== member);
  }

  // THE CASTING FOLD (XVIII, Article V) — the ledger's half of a cast: a
  // sheeted companion spends exactly one slot of the spell's own level
  // and holds the thread HERE; the hero's tank folds at the rules seat;
  // every release seals its note in the ledger view only, never on the
  // table. Tick-refused like every arming of the world.
  const castOp = updates.cast_spell;
  if (castOp && typeof castOp === 'object' && !Array.isArray(castOp)) {
    const castRow = spellRowFor(castOp.spell);
    const casterName = clean(castOp.caster, 80);
    if (meta.tick) next.notes.push('The offscreen world may not cast: cast_spell refused on a tick.');
    else if (!castRow || !casterName) next.notes.push('Unlawful cast blocked: the grimoire holds no such spell.');
    else {
      const member = next.party.find((entry) => canonName(entry.name) === canonName(casterName));
      const sheet = member?.sheet;
      if (sheet && sheet.spellSlots) {
        const learned = Array.isArray(sheet.spells) && sheet.spells.some((name) => canonName(name) === canonName(castRow.key));
        const slot = castRow.level >= 1 ? sheet.spellSlots[castRow.level] : null;
        if (!learned) next.notes.push(`Unlawful cast blocked: ${member.name} never learned ${castRow.key}.`);
        else if (castRow.level >= 1 && (!slot || slot.current < 1)) next.notes.push(`Unlawful cast blocked: no slot of level ${castRow.level} remains for ${member.name}.`);
        else if (castRow.concentration && sheet.concentration && castOp.release !== true) next.notes.push(`Unlawful cast blocked: ${member.name} already holds ${sheet.concentration}.`);
        else {
          if (slot) slot.current -= 1;
          if (castOp.release === true && sheet.concentration) { next.notes.push(`Concentration released: ${member.name} lets ${sheet.concentration} fall.`); sheet.concentration = null; }
          if (castRow.concentration) sheet.concentration = castRow.key;
        }
      } else if (castOp.release === true && meta.heroConcentration) {
        // the hero's release: the tank folds at the rules seat; the note
        // seals here, naming the thread that fell.
        next.notes.push(`Concentration released: ${casterName} lets ${meta.heroConcentration} fall.`);
      }
    }
  }

  // THE PICKING SEAL (XVIII, Article IV) — a learning pick lands as a
  // sealed op: the door (validateSpellPicks) ruled at the surface; the
  // ledger records what entered the grimoire, keys only, never free text.
  const learnOp = updates.spell_learn;
  if (learnOp && typeof learnOp === 'object' && !Array.isArray(learnOp)) {
    const learner = clean(learnOp.name, 80);
    const lawfulPicks = Array.isArray(learnOp.spells) ? learnOp.spells.map((key) => String(key).trim().toLowerCase()).filter((key) => spellRowFor(key)) : [];
    if (learner && lawfulPicks.length) next.notes.push(`Learned: ${learner} takes ${lawfulPicks.join(', ')} into the grimoire.`);
  }

  // THE COMPANION-SHEET LAW (Directive X, Law VI) — one grant seals a
  // standing party member's sheet from THE ROLE TABLE: arithmetic, never
  // model numbers. Seal-once with a note; the offscreen tick may not arm
  // the party; an unlawful role or level seals nothing — fail closed.
  const sheetGrant = updates.sheet_grant;
  if (sheetGrant && typeof sheetGrant === 'object' && !Array.isArray(sheetGrant)) {
    const grantName = clean(sheetGrant.name, 60);
    const grantRow = grantName ? next.party.find((entry) => canonName(entry.name) === canonName(grantName)) : null;
    // THE LOCKSTEP LAW (Directive XII §I.6) — a sheet seats at the
    // hero's standing level when the caller attests it; the grant op's
    // own number is overruled. Callers that do not attest keep the old
    // road: the op's level, judged by sheetFor's own law.
    const lockstep = Number.isInteger(meta.heroLevel) ? Math.max(1, Math.min(5, meta.heroLevel)) : null;
    const grantSheet = sheetFor(sheetGrant.role, lockstep ?? sheetGrant.level);
    if (meta.tick) next.notes.push('The offscreen world may not arm the party: sheet_grant refused on a tick.');
    else if (!grantName) next.notes.push('Unlawful sheet_grant blocked: the sheeted soul must be named.');
    else if (!grantRow) next.notes.push(`Unlawful sheet_grant blocked: ${grantName} does not stand in the party.`);
    else if (grantRow.sheet) next.notes.push(`Sheet canon sealed once: ${grantRow.name} already holds a sheet.`);
    else if (!grantSheet) next.notes.push(`Unlawful sheet_grant blocked: no honest role or level for ${grantRow.name}.`);
    else grantRow.sheet = armCasting(grantSheet);
  }

  // THE CONDITION LAW (Directive XII §II.3) — conditions move onto a
  // sheeted companion only here: at most two added and two removed per
  // turn, names from the eight the table knows; a duplicate add and an
  // absent remove are refused by name; the offscreen tick may not
  // poison the party. Sheets sealed before this law gain the lane on
  // first lawful touch — born empty, fail closed.
  const sheetCondition = updates.sheet_condition;
  if (sheetCondition && typeof sheetCondition === 'object' && !Array.isArray(sheetCondition)) {
    const conditionName = clean(sheetCondition.name, 60);
    const conditionRow = conditionName ? next.party.find((entry) => canonName(entry.name) === canonName(conditionName)) : null;
    if (meta.tick) next.notes.push('The offscreen world may not poison the party: sheet_condition refused on a tick.');
    else if (!conditionName) next.notes.push('Unlawful sheet_condition blocked: the sheeted soul must be named.');
    else if (!conditionRow || !conditionRow.sheet) next.notes.push(`Unlawful sheet_condition blocked: ${conditionName} holds no sheet.`);
    else {
      const sheet = conditionRow.sheet;
      sheet.conditions = Array.isArray(sheet.conditions) ? sheet.conditions : [];
      for (const add of (Array.isArray(sheetCondition.add) ? sheetCondition.add : []).slice(0, 2)) {
        if (!CONDITIONS[add]) next.notes.push(`Unlawful condition blocked: ${clean(String(add ?? ''), 30) || 'an unnamed mark'} is not a condition the table knows.`);
        else if (sheet.conditions.includes(add)) next.notes.push(`Condition already stands: ${conditionRow.name} is already ${add}.`);
        else sheet.conditions.push(add);
      }
      for (const removal of (Array.isArray(sheetCondition.remove) ? sheetCondition.remove : []).slice(0, 2)) {
        if (!sheet.conditions.includes(removal)) next.notes.push(`Condition not standing: ${conditionRow.name} is not ${clean(String(removal ?? ''), 30) || 'so marked'}.`);
        else sheet.conditions = sheet.conditions.filter((condition) => condition !== removal);
      }
    }
  }

  if (updates.beat_advance && !next.completed) {
    // The final beat must PLAY, not merely arrive: advancing while already on
    // the last beat is what closes the tale. (Before the Experience Cut,
    // arrival alone completed it — and the epilogue never got its turns.)
    // Once a seal is requested, the denouement clock below is the SOLE
    // authority on completion: a beat_advance may still walk the spine, but
    // closing the final beat yields to the countdown — the promised quiet
    // turns are never cut short by an eager beat.
    if (next.beatIndex >= next.spine.beats.length - 1) { if (!next.sealing) next.completed = true; }
    else next.beatIndex += 1;
  }

  // The honored early ending: once the player has asked for the seal, the
  // tale completes when the denouement turns have breathed.
  if (next.sealing && !next.completed && Number.isInteger(meta.turn) && meta.turn >= next.sealing.final_turn) {
    next.completed = true;
  }
  return next;
}

// THE CASTING COLUMN (XVIII, Article IV) — one seat arms a sheet with its
// craft: the calling's fixed column decides full, half, or none; the shelf
// and the slot arithmetic ride the tables. A none-column sheet returns
// UNCHANGED — byte for byte the pre-directive shape.
function armCasting(sheet) {
  if (!sheet) return sheet;
  const casting = ROLE_TABLE[String(sheet.role || '').toLowerCase()]?.casting || 'none';
  if (casting === 'none') return sheet;
  return {
    ...sheet,
    casting,
    spells: companionSpellsFor(sheet.role, sheet.level, casting),
    spellSlots: slotsForArchetype(casting, sheet.level),
    concentration: sheet.concentration || null
  };
}

// THE LOCKSTEP LAW (Directive XII §I.6) — when the hero rises, every
// standing sheet re-seats to the same level by ROLE TABLE arithmetic.
// Damage carries ABSOLUTE (new maximum minus the wounds already taken,
// never below 1 for the standing), zero stays zero (the doom holds),
// death saves and conditions ride whole. Monotone: a sheet never falls.
export function applyPartyMilestone(codex, level) {
  const target = Math.max(1, Math.min(5, Math.trunc(Number(level) || 1)));
  const party = Array.isArray(codex?.party) ? codex.party : [];
  if (!party.some((member) => member?.sheet && Number(member.sheet.level) < target)) return codex;
  const next = structuredClone(codex);
  for (const member of next.party) {
    const sheet = member?.sheet;
    if (!sheet || Number(sheet.level) >= target) continue;
    const fresh = sheetFor(sheet.role, target);
    if (!fresh) continue;
    const damage = Math.max(0, (Number(sheet.maxHp) || 0) - (Number(sheet.hp) || 0));
    const atZero = (Number(sheet.hp) || 0) <= 0;
    const armed = armCasting({
      ...fresh,
      hp: atZero ? 0 : Math.max(1, fresh.maxHp - damage),
      deathSaves: sheet.deathSaves || fresh.deathSaves,
      conditions: Array.isArray(sheet.conditions) ? sheet.conditions : [],
      ...(sheet.concentration ? { concentration: sheet.concentration } : {})
    });
    // the rise re-derives slots CARRYING the spent counts, the hero's own
    // milestone law mirrored onto the sheet (XVIII, Article IV).
    if (armed.spellSlots && sheet.spellSlots) {
      for (const [slotLevel, slot] of Object.entries(armed.spellSlots)) {
        const old = sheet.spellSlots[slotLevel];
        const spent = old ? Math.max(0, (Number(old.max) || 0) - (Number(old.current) || 0)) : 0;
        slot.current = Math.max(0, slot.max - spent);
      }
    }
    member.sheet = armed;
  }
  return next;
}

export function storyBlock(codex) {
  const beat = codex.spine.beats[codex.beatIndex];
  const roles = new Set(codex.cast.map((soul) => soul.role));
  const overdue = codex.spine.deadlines
    .filter((deadline) => codex.beatIndex >= deadline.byBeat)
    .flatMap((deadline) => deadline.roles)
    .filter((role) => !roles.has(role));
  const nearEnd = codex.beatIndex >= codex.spine.beats.length - 3;
  const sealing = Boolean(codex.sealing) && !codex.completed;
  return {
    beat: { index: codex.beatIndex, ...beat },
    evil_design: codex.beatIndex >= codex.spine.revealIdx ? codex.arc?.evil_plot || '' : '[GATED UNTIL REVELATION]',
    cast: codex.cast,
    regions: codex.regions,
    memoir: codex.memoir,
    wounds: codex.notes.slice(-8),
    open_threads: (codex.threads || []).filter((thread) => thread.status === 'open').slice(0, 6)
      .map((thread) => `${thread.label} (${thread.kind}${thread.holder ? `, held by ${thread.holder}` : ''})`),
    threads_state: (codex.threads || []).map(({ label, status }) => ({ label, status })),
    // THE EQUIPPED LAW (Directive XII §III.5) — trove_state speaks the
    // mark only when it is true; unmarked things keep the old two-key
    // shape. The rune (XVIII) rides the same way: spoken when it stands,
    // structurally absent otherwise.
    trove_state: (codex.trove || []).filter((item) => item.status === 'held').map(({ name, holder, equipped, enchant }) => ({ name, holder, ...(equipped ? { equipped: true } : {}), ...(enchant ? { enchant } : {}) })),
    purse_state: (codex.purses || []).map(({ holder, coin }) => ({ holder, coin })),
    // THE OPEN ROAD STATES (XIX, Articles IV–VII): the door's own
    // evidence, riding to every court exactly as threads_state does.
    // Ambitions ride as BARE open texts (the resolve court matches
    // verbatim); clocks as structured open rows with ticks as the
    // standing COUNT; the horizon as the same bounded whisper the
    // chart's edge seats — the citation court binds to what rode.
    ambitions_state: (codex.ambitions || []).filter((row) => row && row.status === 'open' && typeof row.text === 'string').map((row) => row.text),
    clocks_state: (codex.clocks || []).filter((row) => row && row.status === 'open' && typeof row.label === 'string').map(({ label, segments, ticks }) => ({ label, segments, ticks: Array.isArray(ticks) ? ticks.length : 0, status: 'open' })),
    rumors_state: horizonRumors(codex),
    // THE PRESENCE CUT (Directive VII.7): the standing ground rides to the
    // server court exactly as threads_state and trove_state do.
    scene_state: codex.scene ? { region: codex.scene.region, sinceTurn: codex.scene.sinceTurn ?? null } : null,
    // THE PARTY AND THE ELSEWHERE (Directive VIII.5): the roster and the
    // sealed fixtures ride to the server court the same way.
    party_state: (codex.party || []).map(({ name, joinedTurn }) => ({ name, joinedTurn: joinedTurn ?? null })),
    // THE DERIVED TRUTH (XVIII, Article I): each sheet speaks its armor
    // as computed truth — table rows and DEX, never a stored opinion.
    sheet_state: (codex.party || []).filter((member) => member && member.sheet).map((member) => ({
      name: member.name, role: member.sheet.role, level: member.sheet.level, hp: member.sheet.hp,
      ac: derivedAc(member.sheet.abilities, equippedRows(codex.trove || [], member.name)),
      conditions: Array.isArray(member.sheet.conditions) ? [...member.sheet.conditions] : [],
      // THE CASTING LAW (XVIII): a casting sheet speaks its craft — the
      // learned list, slots as cur/max, and the held thread; a sheet of
      // the none column keeps its old shape to the byte.
      ...(member.sheet.spellSlots ? {
        casting: member.sheet.casting || null,
        spells: Array.isArray(member.sheet.spells) ? [...member.sheet.spells] : [],
        slots: Object.fromEntries(Object.entries(member.sheet.spellSlots).map(([lvl, slot]) => [lvl, `${slot.current}/${slot.max}`])),
        concentration: member.sheet.concentration || null
      } : {})
    })),
    fixture_state: (codex.fixtures || []).map(({ place, name }) => ({ place, name })),
    // THE BATTLE CUT (Directive X.1): the sealed bestiary rides to the
    // server court the same way — species and threat, the seal's evidence.
    // The species table already carries AC by threat band (XVIII ratifies
    // it as the enemy's whole armor law) — the briefing surfaces it.
    bestiary_state: (codex.bestiary || []).map((card) => ({ species: card.species, threat: card.threat, ac: THREAT_TABLE[card.threat]?.ac ?? null, ...(Array.isArray(card.spells) ? { spells: [...card.spells] } : {}) })),
    directives: [
      ...(codex.completed ? ['The tale is sealed. Write nothing new; if asked, speak only a closing line.'] : []),
      ...(sealing ? ['SEAL THE TALE — the player has chosen to end with honor. These are denouement turns: quiet and combat-free; no new cast, no new threads; resolve what stands, let farewells be spoken, and bring the road home. If a cinematic is due, let it be the ending the tale has earned (victory, death, or bittersweet).'] : []),
      ...overdue.map((role) => `Introduce the overdue ${role} role naturally before advancing this beat.`),
      ...(nearEnd ? ['Reckon with neglected bonds, regions, promises, and consequences before the ending.'] : [])
    ]
  };
}
