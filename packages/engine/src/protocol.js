import { CONDITIONS, ROLE_TABLE } from './rules.js';
// THE ENCHANT LAW (XVIII, Article II) rides from the armory's one seat —
// the door judges rune keys and seats against the same table the folds
// and the tool schema read; no key list is mirrored here.
import { ENCHANT_TABLE } from './armory.js';

// THE GRIMOIRE (XVIII, Articles IV-V): the casting court reads the one
// spell library — keys, levels, concentration — never a mirror of it.
import { spellRowFor } from './grimoire.js';

// THE WORLD SHAPE COURT (Directive XIX, Article VIII): the state enum
// reads from its one seat. Function-time use only, so the story/protocol
// import cycle stays inert.
import { REGION_STATES } from './story.js';

const ALLOWED_KEYS = new Set(['narration_blocks','suggestions','roll_request','state_updates','combat','cinematic','story','image_cue','dialogue_cue','time_advance','entropy_use']);
const CINEMATIC_TYPES = new Set(['chapter','boss_reveal','discovery','ominous','level_up','death','victory']);
const ROLL_KINDS = new Set(['check','save','attack','damage','death_save']);
const ADVANTAGE = new Set(['normal','advantage','disadvantage']);
const ZONES = new Set(['engaged','near','far']);
const cleanText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;

function assert(condition, message, errors) { if (!condition) errors.push(message); }

// THE THREAD LEDGER (Directive V) — additive checks for the two new story
// operations only; every older story key keeps its existing (reducer-side)
// guardianship untouched. Context may carry threads: [{label, status}].
const THREAD_KINDS = new Set(['promise','debt','mystery','goal']);
const THREAD_OUTCOMES = new Set(['kept','broken','resolved']);
// THE WORLD SHAPE COURT (Directive XIX, Article VIII) — the architect's
// finding C, cured at the door. Every world payload is judged for shape
// (a plain object with known keys only), bounds (the schema's own
// fences), and strangers, all refused BY NAME; the fold's silent bend
// retires to a last belt that writes a standing note. Presence law
// holds: an absent or null world owes nothing, and the bounds mirror
// the declared tool schema exactly — the door enforces what the schema
// already promised, so no lawful payload changes meaning.
function validateWorldShape(story, context, errors) {
  if (!story || typeof story !== 'object' || Array.isArray(story)) return;
  if (!Object.hasOwn(story, 'world') || story.world == null) return;
  const world = story.world;
  if (typeof world !== 'object' || Array.isArray(world)) { errors.push('world must be a plain object'); return; }
  for (const key of Object.keys(world)) {
    if (!['blight_delta', 'region_add', 'region_update'].includes(key)) errors.push(`world carries the stranger key "${key}"`);
  }
  if (world.blight_delta != null && (!Number.isInteger(world.blight_delta) || world.blight_delta < -5 || world.blight_delta > 5)) {
    errors.push('world.blight_delta must be an integer between -5 and 5');
  }
  const add = world.region_add;
  if (add != null) {
    if (typeof add !== 'object' || Array.isArray(add)) errors.push('world.region_add must be a plain object');
    else {
      for (const key of Object.keys(add)) if (!['name', 'visual'].includes(key)) errors.push(`world.region_add carries the stranger key "${key}"`);
      if (!(cleanText(add.name, 100) && String(add.name).trim().length >= 3)) errors.push('world.region_add.name must be 3-100 chars');
      if (!(cleanText(add.visual, 360) && String(add.visual).trim().length >= 10)) errors.push('world.region_add.visual must be 10-360 chars');
    }
  }
  const update = world.region_update;
  if (update != null) {
    if (typeof update !== 'object' || Array.isArray(update)) errors.push('world.region_update must be a plain object');
    else {
      for (const key of Object.keys(update)) if (!['name', 'state'].includes(key)) errors.push(`world.region_update carries the stranger key "${key}"`);
      if (!(cleanText(update.name, 100) && String(update.name).trim().length >= 3)) errors.push('world.region_update.name must be 3-100 chars');
      if (!REGION_STATES.includes(update.state)) errors.push(`world.region_update.state must be one of the standing states: ${REGION_STATES.join(', ')}`);
    }
  }
}

function validateThreads(story, context, errors) {
  if (!story || typeof story !== 'object') return;
  const known = context.threads || [];
  const openLabels = new Set(known.filter((t) => t.status === 'open').map((t) => String(t.label).trim().toLowerCase()));
  const adds = story.thread_add;
  if (adds !== undefined && adds !== null) {
    assert(Array.isArray(adds) && adds.length <= 2, 'thread_add must be an array of at most 2', errors);
    const seen = new Set();
    for (const add of Array.isArray(adds) ? adds : []) {
      assert(cleanText(add?.label, 90) && String(add.label).trim().length >= 3, 'thread_add.label must be 3-90 chars', errors);
      if (add?.kind !== undefined) assert(THREAD_KINDS.has(add.kind), 'thread_add.kind invalid', errors);
      if (add?.holder !== undefined && add.holder !== null) assert(cleanText(add.holder, 60), 'thread_add.holder invalid', errors);
      noUnknown(add, new Set(['label','kind','holder']), 'story.thread_add', errors);
      const key = String(add?.label || '').trim().toLowerCase();
      assert(!openLabels.has(key), `thread_add duplicates an open thread: ${add?.label}`, errors);
      assert(!seen.has(key), 'thread_add repeats a label within the turn', errors);
      seen.add(key);
    }
  }
  const closes = story.thread_resolve;
  if (closes !== undefined && closes !== null) {
    assert(Array.isArray(closes) && closes.length <= 2, 'thread_resolve must be an array of at most 2', errors);
    for (const close of Array.isArray(closes) ? closes : []) {
      assert(cleanText(close?.label, 90), 'thread_resolve.label invalid', errors);
      assert(THREAD_OUTCOMES.has(close?.outcome), 'thread_resolve.outcome must be kept | broken | resolved', errors);
      noUnknown(close, new Set(['label','outcome']), 'story.thread_resolve', errors);
      if (known.length) assert(openLabels.has(String(close?.label || '').trim().toLowerCase()), `thread_resolve targets no open thread: ${close?.label}`, errors);
    }
  }
}
function noUnknown(object, allowed, path, errors) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return;
  for (const key of Object.keys(object)) if (!allowed.has(key)) errors.push(`${path}.${key} is not allowed`);
}

// THE POSSESSIONS CUT (Directive VI) — additive checks for the four item
// and coin operations only; every older story key keeps its reducer-side
// guardianship untouched. Context may carry trove: [{name, holder}] and
// purses: [{holder, coin}]. These courts are PRESENCE-based: an empty
// array is the caller attesting the ledger is empty, so legality binds;
// an absent key (bare-context callers) leaves shape and counting law
// only. The record consulted is the PRE-TURN record: a thing added this
// turn may not also be transferred this turn through the door.
// Exported as the ONE seat (XVIII, Article I): the reducer and the tool
// schema import this enum; armor joined additively with the armory law.
export const ITEM_KINDS = new Set(['weapon','tool','keepsake','treasure','document','armor']);
const canonKey = (value) => String(value ?? '').trim().toLowerCase();
function validateTrove(story, context, errors) {
  if (!story || typeof story !== 'object') return;
  const adds = story.item_add, moves = story.item_transfer, drops = story.item_remove;
  if ((adds === undefined || adds === null) && (moves === undefined || moves === null) && (drops === undefined || drops === null)) return;
  const carried = Array.isArray(context.trove);
  const heldNames = new Map();
  if (carried) for (const item of context.trove) {
    if ((item?.status ?? 'held') === 'held') heldNames.set(canonKey(item?.name), canonKey(item?.holder));
  }
  if (adds !== undefined && adds !== null) {
    assert(Array.isArray(adds), 'item_add must be an array', errors);
    const seen = new Set();
    for (const add of Array.isArray(adds) ? adds : []) {
      assert(cleanText(add?.name, 60) && String(add.name).trim().length >= 3, 'item_add.name must be 3-60 chars', errors);
      assert(ITEM_KINDS.has(add?.kind), 'item_add.kind invalid', errors);
      assert(cleanText(add?.holder, 60), 'item_add.holder invalid', errors);
      if (add?.note !== undefined && add?.note !== null) assert(cleanText(add.note, 90), 'item_add.note invalid', errors);
      // THE ENCHANT LAW (XVIII, Article II) — a born rune rides by table
      // key alone: an unknown key or an unlawful seat dies at the door,
      // and numbers never ride the op.
      if (add?.enchant !== undefined && add?.enchant !== null) {
        const rune = typeof add.enchant === 'string' ? ENCHANT_TABLE[add.enchant] : null;
        assert(!!rune, `item_add.enchant names no rune the table holds: ${add?.enchant}`, errors);
        if (rune) assert(rune.seats.includes(add?.kind), `the ${add.enchant} rune does not seat on a ${add?.kind}`, errors);
      }
      noUnknown(add, new Set(['name','kind','holder','note','enchant']), 'story.item_add', errors);
      const key = canonKey(add?.name);
      assert(!heldNames.has(key), `item_add duplicates a held thing: ${add?.name}`, errors);
      assert(!seen.has(key), 'item_add repeats a name within the turn', errors);
      seen.add(key);
    }
  }
  if (moves !== undefined && moves !== null) {
    assert(Array.isArray(moves), 'item_transfer must be an array', errors);
    for (const move of Array.isArray(moves) ? moves : []) {
      assert(cleanText(move?.name, 60) && String(move.name).trim().length >= 3, 'item_transfer.name must be 3-60 chars', errors);
      assert(cleanText(move?.from, 60), 'item_transfer.from invalid', errors);
      assert(cleanText(move?.to, 60), 'item_transfer.to invalid', errors);
      assert(canonKey(move?.from) !== canonKey(move?.to), 'item_transfer.from and .to must differ', errors);
      noUnknown(move, new Set(['name','from','to']), 'story.item_transfer', errors);
      if (carried) assert(heldNames.get(canonKey(move?.name)) === canonKey(move?.from), `item_transfer moves a thing the record does not place in ${move?.from}'s hand: ${move?.name}`, errors);
    }
  }
  if (drops !== undefined && drops !== null) {
    assert(Array.isArray(drops), 'item_remove must be an array', errors);
    for (const drop of Array.isArray(drops) ? drops : []) {
      assert(cleanText(drop?.name, 60) && String(drop.name).trim().length >= 3, 'item_remove.name must be 3-60 chars', errors);
      assert(cleanText(drop?.holder, 60), 'item_remove.holder invalid', errors);
      if (drop?.reason !== undefined && drop?.reason !== null) assert(cleanText(drop.reason, 90), 'item_remove.reason invalid', errors);
      noUnknown(drop, new Set(['name','holder','reason']), 'story.item_remove', errors);
      if (carried) assert(heldNames.get(canonKey(drop?.name)) === canonKey(drop?.holder), `item_remove takes a thing the record does not place in ${drop?.holder}'s hand: ${drop?.name}`, errors);
    }
  }
  const total = (Array.isArray(adds) ? adds.length : 0) + (Array.isArray(moves) ? moves.length : 0) + (Array.isArray(drops) ? drops.length : 0);
  assert(total <= 3, `at most three item operations per turn across add, transfer, and remove (received ${total})`, errors);
}
// THE OVERDRAFT LAW: the Dungeon Master may not spend coin a soul does
// not hold. When the context carries purse state the court folds the
// turn's own movements sequentially — the second is judged against the
// balance the first left — and any dip below zero is refused by name.
// The reducer clamps at zero regardless (story.js), so even a turn that
// reached the fold purse-blind cannot mint negative coin.
function validatePurse(story, context, errors) {
  if (!story || typeof story !== 'object') return;
  const moves = story.purse;
  if (moves === undefined || moves === null) return;
  assert(Array.isArray(moves) && moves.length <= 2, 'purse must be an array of at most 2', errors);
  const carried = Array.isArray(context.purses);
  const balances = new Map();
  if (carried) for (const entry of context.purses) balances.set(canonKey(entry?.holder), Math.trunc(Number(entry?.coin) || 0));
  for (const move of Array.isArray(moves) ? moves : []) {
    assert(cleanText(move?.holder, 60), 'purse.holder invalid', errors);
    assert(Number.isInteger(move?.delta) && move.delta !== 0 && move.delta >= -999 && move.delta <= 999, 'purse.delta must be a non-zero integer between -999 and 999', errors);
    assert(cleanText(move?.reason, 90) && String(move.reason).trim().length >= 3, 'purse.reason must be 3-90 chars', errors);
    noUnknown(move, new Set(['holder','delta','reason']), 'story.purse', errors);
    if (carried && Number.isInteger(move?.delta)) {
      const key = canonKey(move?.holder);
      const held = balances.get(key) ?? 0;
      assert(held + move.delta >= 0, `purse would overdraw ${move?.holder}: holds ${held}, delta ${move.delta}`, errors);
      balances.set(key, Math.max(0, held + move.delta));
    }
  }
}

// THE PRESENCE CUT (Directive VII) — the ground as one additive story
// operation: scene_set { region }, an object and never an array — one
// stage per turn by shape, exactly one key. The courts are PRESENCE-based
// like the possessions courts: context.regions being an array seats the
// atlas court (empty = attested empty; the record consulted is the
// pre-turn record, except the stage may be built and stood upon in one
// breath by this turn's own world.region_add); the context CARRYING the
// scene key seats the travel court (scene: null attests no scene stands —
// genesis is free). A bare context gets shape law only. A seated change
// of ground must ride with time_advance in the same turn — free
// teleportation is refused by name; restating the standing region is
// lawful and costs nothing.
function validateScene(story, context, errors, payload) {
  if (!story || typeof story !== 'object') return;
  const set = story.scene_set;
  if (set === undefined || set === null) return;
  if (Array.isArray(set)) { errors.push('scene_set must be an object, not an array'); return; }
  if (typeof set !== 'object') { errors.push('scene_set must be an object with exactly region'); return; }
  for (const key of Object.keys(set)) if (key !== 'region') { errors.push('scene_set must be an object with exactly region'); return; }
  if (!(cleanText(set.region, 100) && String(set.region).trim().length >= 3)) { errors.push('scene_set.region must be 3-100 chars'); return; }
  const target = canonKey(set.region);
  if (Array.isArray(context.regions)) {
    const known = new Set(context.regions.map((region) => canonKey(typeof region === 'string' ? region : region?.name)));
    const built = canonKey(story.world?.region_add?.name || '');
    if (!known.has(target) && built !== target) errors.push(`scene_set names a region the record does not hold: ${String(set.region).trim()}`);
  }
  if ('scene' in context) {
    const standing = context.scene && typeof context.scene === 'object' ? String(context.scene.region || '').trim() : '';
    if (standing && canonKey(standing) !== target && (payload?.time_advance === undefined || payload?.time_advance === null)) {
      errors.push(`scene_set changes the ground from ${standing} to ${String(set.region).trim()} without time_advance — travel costs time`);
    }
  }
}

// THE PARTY AND THE ELSEWHERE (Directive VIII) — three additive story
// operations, each an object and never an array, judged against the
// PRE-TURN record like every court before them. PRESENCE-based seating:
// the membership court seats iff context.party is an array (empty =
// attested empty); the living court reads context.cast; the ground court
// seats iff context carries a presence array AND a standing scene; the
// hero-root court seats iff context carries hero. A bare context gets
// shape law only.
function resolveAmong(names, rawName) {
  const key = canonKey(rawName);
  if (!key) return null;
  const exact = names.find((name) => canonKey(name) === key);
  if (exact !== undefined) return exact;
  const aliased = names.filter((name) => canonKey(name).split(/\s+/)[0] === key);
  return aliased.length === 1 ? aliased[0] : null;
}
function namesTheHero(context, rawName) {
  const hero = typeof context.hero === 'string' ? context.hero.trim() : '';
  if (!hero) return false;
  const c = canonKey(rawName), h = canonKey(hero);
  return c === h || h.split(/\s+/)[0] === c || c.split(/\s+/)[0] === h;
}
function validateParty(story, context, errors) {
  if (!story || typeof story !== 'object') return;
  const partyNames = Array.isArray(context.party) ? context.party.filter((name) => typeof name === 'string') : null;
  const sameTurnCast = (rawName) => (Array.isArray(story.cast_add) ? story.cast_add : []).some((add) => {
    const c = canonKey(add?.name);
    return c && (c === canonKey(rawName) || c.split(/\s+/)[0] === canonKey(rawName));
  });
  const join = story.party_join;
  if (join !== undefined && join !== null) {
    if (!join || typeof join !== 'object' || Array.isArray(join) || Object.keys(join).some((key) => key !== 'name')) {
      errors.push('party_join must be an object with exactly name');
    } else if (!(cleanText(join.name, 80) && String(join.name).trim().length >= 2)) {
      errors.push('party_join.name must be 2-80 chars');
    } else {
      const name = String(join.name).trim();
      if (namesTheHero(context, name)) errors.push(`party_join names the hero: ${name} is the party's permanent root and is never joined`);
      if (partyNames && resolveAmong(partyNames, name)) errors.push(`party_join duplicates a standing member: ${name}`);
      const souls = (context.cast || []).filter((soul) => {
        const c = canonKey(soul?.name);
        return c && (c === canonKey(name) || c.split(/\s+/)[0] === canonKey(name));
      });
      if (souls.length > 0 && souls.every((soul) => canonKey(soul?.status) === 'dead')) errors.push(`party_join seats the dead: ${name} is dead and cannot travel`);
      // The ground court: lawful only for a soul whose last lawful ground
      // is the current scene, or one introduced by this same turn's
      // cast_add. Seats iff presence AND a standing scene are carried; a
      // null scene stands no court — genesis is free.
      if (Array.isArray(context.presence) && 'scene' in context && !sameTurnCast(name) && !namesTheHero(context, name)) {
        const sceneRegion = context.scene && typeof context.scene === 'object' ? String(context.scene.region || '').trim() : '';
        if (sceneRegion) {
          const presenceNames = context.presence.map((entry) => (entry && typeof entry.name === 'string' ? entry.name : '')).filter(Boolean);
          const resolved = resolveAmong(presenceNames, name);
          const entry = resolved === null ? null : context.presence.find((row) => row && row.name === resolved);
          const ground = entry && typeof entry.ground === 'string' ? entry.ground.trim() : '';
          if (!ground) errors.push(`party_join seats a soul the record does not stand at the scene: ${name} — whereabouts unknown`);
          else if (canonKey(ground) !== canonKey(sceneRegion)) errors.push(`party_join seats a soul the record does not stand at the scene: ${name} last stood in ${ground}`);
        }
      }
    }
  }
  const leave = story.party_leave;
  if (leave !== undefined && leave !== null) {
    if (!leave || typeof leave !== 'object' || Array.isArray(leave) || Object.keys(leave).some((key) => key !== 'name' && key !== 'remains_at')) {
      errors.push('party_leave must be an object with exactly name and an optional remains_at');
    } else if (!(cleanText(leave.name, 80) && String(leave.name).trim().length >= 2)) {
      errors.push('party_leave.name must be 2-80 chars');
    } else {
      const name = String(leave.name).trim();
      if (namesTheHero(context, name)) errors.push(`party_leave names the hero: ${name} is the party's permanent root and is never left`);
      else if (partyNames && !resolveAmong(partyNames, name)) errors.push(`party_leave names a soul outside the party: ${name}`);
      if (leave.remains_at !== undefined && leave.remains_at !== null) {
        if (!(cleanText(leave.remains_at, 100) && String(leave.remains_at).trim().length >= 3)) {
          errors.push('party_leave.remains_at must be 3-100 chars');
        } else if (Array.isArray(context.regions)) {
          const target = canonKey(leave.remains_at);
          const known = new Set(context.regions.map((region) => canonKey(typeof region === 'string' ? region : region?.name)));
          const built = canonKey(story.world?.region_add?.name || '');
          if (!known.has(target) && built !== target) errors.push(`party_leave pins ${name} at a region the record does not hold: ${String(leave.remains_at).trim()}`);
        }
      }
    }
  }
}
// THE FIXTURE LAW (Directive VIII.6) — place-bound canon, sealed once
// like region canon. Atlas court iff context.regions is an array; seal
// court iff context.fixtures is an array ([{ place, name }]).
function validateFixtures(story, context, errors) {
  if (!story || typeof story !== 'object') return;
  const fixture = story.fixture_add;
  if (fixture === undefined || fixture === null) return;
  if (!fixture || typeof fixture !== 'object' || Array.isArray(fixture) || Object.keys(fixture).some((key) => !['place', 'name', 'visual'].includes(key))) {
    errors.push('fixture_add must be an object with exactly place, name, and visual');
    return;
  }
  if (!(cleanText(fixture.place, 100) && String(fixture.place).trim().length >= 3)) errors.push('fixture_add.place must be 3-100 chars');
  if (!(cleanText(fixture.name, 60) && String(fixture.name).trim().length >= 3)) errors.push('fixture_add.name must be 3-60 chars');
  if (!(cleanText(fixture.visual, 160) && String(fixture.visual).trim().length >= 8)) errors.push('fixture_add.visual must be 8-160 chars');
  if (Array.isArray(context.regions) && cleanText(fixture.place, 100)) {
    const target = canonKey(fixture.place);
    const known = new Set(context.regions.map((region) => canonKey(typeof region === 'string' ? region : region?.name)));
    const built = canonKey(story.world?.region_add?.name || '');
    if (!known.has(target) && built !== target) errors.push(`fixture_add names a place the record does not hold: ${String(fixture.place).trim()}`);
  }
  if (Array.isArray(context.fixtures) && cleanText(fixture.place, 100) && cleanText(fixture.name, 60)) {
    const dup = context.fixtures.some((row) => row && canonKey(row.name) === canonKey(fixture.name) && canonKey(row.place) === canonKey(fixture.place));
    if (dup) errors.push(`fixture_add duplicates a sealed fixture: ${String(fixture.name).trim()} already stands in ${String(fixture.place).trim()}`);
  }
}
// THE BATTLE CUT (Directive X, Law I) — species canon seals once, like
// fixture canon: creature_add { species, visual, nature, threat }, an
// object and never an array, exactly four keys. Shape law always; the
// seal court seats iff context.bestiary is an array ([{ species, threat }]).
// A duplicate sealed species is refused by name.
export const THREAT_TABLE = { 1: { hp: 4, ac: 10 }, 2: { hp: 9, ac: 11 }, 3: { hp: 16, ac: 12 }, 4: { hp: 30, ac: 14 }, 5: { hp: 55, ac: 16 } };
function validateBestiary(story, context, errors) {
  if (!story || typeof story !== 'object') return;
  const add = story.creature_add;
  if (add === undefined || add === null) return;
  if (!add || typeof add !== 'object' || Array.isArray(add) || Object.keys(add).some((key) => !['species', 'visual', 'nature', 'threat', 'spells'].includes(key))) {
    errors.push('creature_add must be an object with exactly species, visual, nature, and threat (spells optional)');
    return;
  }
  if (!(cleanText(add.species, 60) && String(add.species).trim().length >= 3)) errors.push('creature_add.species must be 3-60 chars');
  if (!(cleanText(add.visual, 160) && String(add.visual).trim().length >= 8)) errors.push('creature_add.visual must be 8-160 chars');
  if (!(cleanText(add.nature, 90) && String(add.nature).trim().length >= 3)) errors.push('creature_add.nature must be 3-90 chars');
  if (!(Number.isInteger(add.threat) && add.threat >= 1 && add.threat <= 5)) errors.push('creature_add.threat must be an integer between 1 and 5');
  // THE SPECIES SPELLBOOK (XVIII, Article V): enemy casts come from the
  // card — an optional list of grimoire keys, at most four, sealed once
  // at creature_add; a species without the list never casts.
  if (add.spells !== undefined && (!Array.isArray(add.spells) || add.spells.length < 1 || add.spells.length > 4 || add.spells.some((name) => !spellRowFor(name)))) {
    errors.push('creature_add.spells must be 1-4 spell keys the grimoire holds');
  }
  if (Array.isArray(context.bestiary) && cleanText(add.species, 60)) {
    if (context.bestiary.some((card) => canonKey(card?.species) === canonKey(add.species))) {
      errors.push(`creature_add duplicates a sealed species: ${String(add.species).trim()}`);
    }
  }
}
// THE CASTING COURT (XVIII, Article V) — ONE op: story.cast_spell
// { caster, spell, target?, release? }. The refusal matrix at the door:
// an unknown spell; a spell not on the caster's learned list; an empty
// slot at the spell's level (cantrips slotless, the energy tank its own
// lane); an illegal target; a second concentration while one holds —
// unless this same op carries the release (the sealed note is the story
// fold's business). Courts seat on evidence, presence-based, both
// benches alike; bare context keeps shape law and no more.
function validateCastSpell(story, context, errors) {
  if (!story || typeof story !== 'object') return;
  const cast = story.cast_spell;
  if (cast === undefined || cast === null) return;
  if (typeof cast !== 'object' || Array.isArray(cast) || Object.keys(cast).some((key) => !['caster', 'spell', 'target', 'release'].includes(key)) || !Object.hasOwn(cast, 'caster') || !Object.hasOwn(cast, 'spell')) {
    errors.push('cast_spell must be an object carrying caster and spell (target and release optional)');
    return;
  }
  if (!(cleanText(cast.caster, 80) && String(cast.caster).trim().length >= 2)) { errors.push('cast_spell.caster must be 2-80 chars'); return; }
  const row = spellRowFor(cast.spell);
  if (!row) { errors.push(`cast_spell names a spell the grimoire does not hold: ${String(cast.spell ?? '').trim().slice(0, 40) || '(unnamed)'}`); return; }
  if (cast.release !== undefined && cast.release !== true) errors.push('cast_spell.release, when it rides, is exactly true');
  if (cast.target !== undefined && cast.target !== null && !(cleanText(cast.target, 80) && String(cast.target).trim().length >= 2)) errors.push('cast_spell.target must be null or 2-80 chars');
  const key = canonKey(cast.caster);
  const heroSeated = typeof context.hero === 'string' && canonKey(context.hero) === key;
  const sheetRow = Array.isArray(context.sheetCasters) ? context.sheetCasters.find((sheet) => canonKey(sheet?.name) === key) : null;
  // the enemy bench: a standing combatant, or one spawned this same breath
  const combatantRow = Array.isArray(context.combatants) ? context.combatants.find((foe) => canonKey(foe?.name) === key || canonKey(foe?.id) === key) : null;
  // THE CASTER'S SEAT — judged when the full census stands (hero named and
  // the party's names seated); a soul nowhere counted may not cast.
  if (typeof context.hero === 'string' && Array.isArray(context.sheets) && !heroSeated && !sheetRow && !combatantRow) {
    const sheetNamed = context.sheets.some((name) => canonKey(name) === key);
    if (!sheetNamed) {
      errors.push(`cast_spell.caster is nobody the record counts: ${String(cast.caster).trim()}`);
    } else if (Array.isArray(context.sheetCasters)) {
      // THE CRAFTLESS SHEET — seated in the party, absent from the caster
      // bench: she keeps no craft, and the cast is refused BY NAME. Before
      // this seat the sheeted non-caster was fail-open — the census passed
      // her while every learned/slot/thread court above keyed on a
      // sheetCasters row she never had. Judged only when the bench itself
      // is seated (presence law): bare context proves nothing.
      errors.push(`${String(cast.caster).trim()} keeps no craft on the sheet — the grimoire refuses the cast`);
    }
  }
  // THE LEARNED LAW — each bench proves the list it holds.
  if (heroSeated && Array.isArray(context.heroSpells)) {
    if (!context.heroSpells.some((name) => canonKey(name) === row.key)) errors.push(`${row.key} is not on the caster's learned list`);
  }
  if (sheetRow && Array.isArray(sheetRow.spells)) {
    if (!sheetRow.spells.some((name) => canonKey(name) === row.key)) errors.push(`${row.key} is not on ${String(cast.caster).trim()}'s learned list`);
  }
  if (combatantRow) {
    // enemy casts come from the species card, and only from it
    const species = combatantRow.species;
    const cards = [...(Array.isArray(context.bestiary) ? context.bestiary : [])];
    const fresh = story.creature_add;
    if (fresh && typeof fresh === 'object' && !Array.isArray(fresh)) cards.push(fresh);
    if (typeof species === 'string' && cards.length) {
      const card = cards.find((entry) => canonKey(entry?.species) === canonKey(species));
      if (card && (!Array.isArray(card.spells) || !card.spells.some((name) => canonKey(name) === row.key))) {
        errors.push(`the ${String(species).trim()} card carries no such spell: ${row.key}`);
      }
    }
  }
  // THE SLOT LAW — a cast spends exactly one slot of the spell's level;
  // cantrips are slotless; the energy tank spends a charge instead.
  if (row.level >= 1 && heroSeated) {
    if (context.heroCaster === 'energy') {
      if (context.spellEnergy && typeof context.spellEnergy === 'object' && !(Number(context.spellEnergy.current) >= 1)) errors.push('the energy tank is empty — no charge remains for the cast');
    } else if (context.casterSlots && typeof context.casterSlots === 'object') {
      const slot = context.casterSlots[row.level];
      if (!slot || !(Number(slot.current) >= 1)) errors.push(`no slot of level ${row.level} remains for ${row.key}`);
    }
  }
  if (row.level >= 1 && sheetRow && sheetRow.slots && typeof sheetRow.slots === 'object') {
    const slot = sheetRow.slots[row.level];
    const current = typeof slot === 'string' ? Number(slot.split('/')[0]) : Number(slot?.current);
    if (!(current >= 1)) errors.push(`no slot of level ${row.level} remains on ${String(cast.caster).trim()}'s sheet for ${row.key}`);
  }
  // THE ONE THREAD — a second concentration while one holds is refused
  // whole, unless this same op carries the release.
  if (row.concentration && cast.release !== true) {
    if (heroSeated && typeof context.concentration === 'string' && context.concentration) {
      errors.push(`a second concentration while ${context.concentration} holds — carry release: true or hold the thread`);
    }
    if (sheetRow && typeof sheetRow.concentration === 'string' && sheetRow.concentration) {
      errors.push(`${String(cast.caster).trim()} already holds ${sheetRow.concentration} — carry release: true or hold the thread`);
    }
  }
  // THE HONEST MARK — a named target must be a soul or foe the record
  // counts, and never the sealed dead.
  if (typeof cast.target === 'string' && cast.target.trim() && Array.isArray(context.cast)) {
    const targetKey = canonKey(cast.target);
    const soul = context.cast.find((member) => canonKey(member?.name) === targetKey);
    if (soul && canonKey(soul.status) === 'dead') errors.push(`cast_spell.target is sealed dead: ${String(cast.target).trim()}`);
    const counted = Boolean(soul)
      || (typeof context.hero === 'string' && canonKey(context.hero) === targetKey)
      || (Array.isArray(context.sheets) && context.sheets.some((name) => canonKey(name) === targetKey))
      || (Array.isArray(context.combatants) && context.combatants.some((foe) => canonKey(foe?.name) === targetKey || canonKey(foe?.id) === targetKey))
      || (Array.isArray(story.cast_add) ? story.cast_add : []).some((add) => typeof add?.name === 'string' && canonKey(add.name) === targetKey);
    if (!counted && typeof context.hero === 'string' && Array.isArray(context.sheets)) {
      errors.push(`cast_spell.target is nobody the record counts: ${String(cast.target).trim()}`);
    }
  }
}

// THE COMPANION-SHEET LAW (Directive X, Law VI) — one additive grant seals
// a standing party member's sheet: exactly { name, role, level }, role from
// THE ROLE TABLE, level 1-5, an object never an array. Membership is judged
// with the party seated (a soul joining this same breath counts); a
// duplicate sheet is refused by name with the sheet ledger seated; bare
// context keeps shape law and no more.
function validateSheetGrant(story, context, errors) {
  if (!story || typeof story !== 'object') return;
  const grant = story.sheet_grant;
  if (grant === undefined || grant === null) return;
  if (typeof grant !== 'object' || Array.isArray(grant) || Object.keys(grant).length !== 3 || Object.keys(grant).some((key) => !['name', 'role', 'level'].includes(key))) {
    errors.push('sheet_grant must be an object with exactly name, role, and level');
    return;
  }
  if (!(cleanText(grant.name, 60) && String(grant.name).trim().length >= 2)) errors.push('sheet_grant.name must be 2-60 chars');
  if (!(typeof grant.role === 'string' && Object.prototype.hasOwnProperty.call(ROLE_TABLE, String(grant.role).toLowerCase()))) errors.push('sheet_grant.role must be one of guardian, skirmisher, mender, trickster');
  if (!(Number.isInteger(grant.level) && grant.level >= 1 && grant.level <= 5)) errors.push('sheet_grant.level must be an integer between 1 and 5');
  if (!cleanText(grant.name, 60)) return;
  if (Array.isArray(context.party)) {
    const joining = story.party_join?.name;
    const seated = context.party.some((name) => canonKey(name) === canonKey(grant.name)) || (joining && canonKey(joining) === canonKey(grant.name));
    if (!seated) errors.push(`sheet_grant names a soul outside the standing party: ${String(grant.name).trim()}`);
  }
  if (Array.isArray(context.sheets) && context.sheets.some((name) => canonKey(name) === canonKey(grant.name))) {
    errors.push(`sheet_grant duplicates a standing sheet: ${String(grant.name).trim()}`);
  }
}
// THE CONDITION LAW (Directive XII §II.3) — conditions land on companions
// only through sheet_condition: exactly { name, add?, remove? }, at most 2
// added and 2 removed per turn, names drawn only from the eight, aimed
// only at a sheeted soul. With the sheet ledger seated membership binds
// (a sheet granted this same breath counts); bare context keeps shape
// law. The tick refusal is the reducer's own law, as for every party op.
const CONDITION_NAMES = new Set(Object.keys(CONDITIONS));
function validateSheetCondition(story, context, errors) {
  if (!story || typeof story !== 'object') return;
  const op = story.sheet_condition;
  if (op === undefined || op === null) return;
  if (typeof op !== 'object' || Array.isArray(op)) {
    errors.push('sheet_condition must be an object with name and add and/or remove');
    return;
  }
  noUnknown(op, new Set(['name', 'add', 'remove']), 'story.sheet_condition', errors);
  if (!(cleanText(op.name, 60) && String(op.name).trim().length >= 2)) errors.push('sheet_condition.name must be 2-60 chars');
  let named = 0;
  const lanes = { add: new Set(), remove: new Set() };
  for (const lane of ['add', 'remove']) {
    const list = op[lane];
    if (list === undefined || list === null) continue;
    if (!Array.isArray(list) || list.length > 2) {
      errors.push(`sheet_condition.${lane} must be an array of at most 2`);
      continue;
    }
    for (const condition of list) {
      named += 1;
      if (!CONDITION_NAMES.has(condition)) errors.push(`sheet_condition.${lane} names no lawful condition: ${String(condition).slice(0, 30)}`);
      else if (lanes[lane].has(condition)) errors.push(`sheet_condition.${lane} repeats ${condition}`);
      lanes[lane].add(condition);
    }
  }
  if (!named) errors.push('sheet_condition must add or remove at least one condition');
  for (const condition of lanes.add) if (lanes.remove.has(condition)) errors.push(`sheet_condition adds and removes the same condition: ${condition}`);
  if (cleanText(op.name, 60) && Array.isArray(context.sheets)) {
    const granting = story.sheet_grant?.name;
    const sheeted = context.sheets.some((name) => canonKey(name) === canonKey(op.name)) || (granting && canonKey(granting) === canonKey(op.name));
    if (!sheeted) errors.push(`sheet_condition names an unsheeted soul: ${String(op.name).trim()}`);
  }
}
// THE EQUIPPED LAW (Directive XII §III) — one mark moves per turn:
// exactly { name, holder }, an object never an array. With the trove
// seated the court binds: the thing must sit in the named holder's
// hand, and where the ledger speaks a kind, only weapon, tool, and
// armor pass (XVIII: the worn law).
// The record consulted is the PRE-TURN record — a thing added this
// same turn may not also be equipped through the door, exactly as it
// may not be transferred. Bare context keeps shape law.
function validateItemEquip(story, context, errors) {
  if (!story || typeof story !== 'object') return;
  const op = story.item_equip;
  if (op === undefined || op === null) return;
  if (typeof op !== 'object' || Array.isArray(op)) {
    errors.push('item_equip must be an object with exactly name and holder');
    return;
  }
  noUnknown(op, new Set(['name', 'holder']), 'story.item_equip', errors);
  assert(cleanText(op?.name, 60) && String(op.name).trim().length >= 3, 'item_equip.name must be 3-60 chars', errors);
  assert(cleanText(op?.holder, 60), 'item_equip.holder invalid', errors);
  if (Array.isArray(context.trove)) {
    const row = context.trove.find((item) => canonKey(item?.name) === canonKey(op?.name));
    if (!row) errors.push(`item_equip names a thing the record does not hold: ${op?.name}`);
    else {
      if (canonKey(row.holder) !== canonKey(op?.holder)) errors.push(`item_equip marks a thing the record does not place in ${op?.holder}'s hand: ${op?.name}`);
      if (row.kind !== undefined && !['weapon', 'tool', 'armor'].includes(row.kind)) errors.push(`item_equip touches an unequippable kind: ${op?.name} is ${row.kind}`);
    }
  }
}
// THE ENCHANT LAW (XVIII, Article II) — one rune, by table key, on a
// thing the PRE-TURN record holds in the named hand. Where the ledger
// speaks a kind the seat law binds; where it speaks a standing rune the
// one-per-thing law binds. Bare context keeps shape law, as ever.
function validateEnchant(story, context, errors) {
  if (!story || typeof story !== 'object') return;
  const op = story.item_enchant;
  if (op === undefined || op === null) return;
  if (typeof op !== 'object' || Array.isArray(op)) {
    errors.push('item_enchant must be an object with exactly name, holder, and enchant');
    return;
  }
  noUnknown(op, new Set(['name', 'holder', 'enchant']), 'story.item_enchant', errors);
  assert(cleanText(op?.name, 60) && String(op.name).trim().length >= 3, 'item_enchant.name must be 3-60 chars', errors);
  assert(cleanText(op?.holder, 60), 'item_enchant.holder invalid', errors);
  const rune = typeof op?.enchant === 'string' ? ENCHANT_TABLE[op.enchant] : null;
  assert(!!rune, `item_enchant.enchant names no rune the table holds: ${op?.enchant}`, errors);
  if (Array.isArray(context.trove)) {
    const row = context.trove.find((item) => canonKey(item?.name) === canonKey(op?.name) && (item?.status ?? 'held') === 'held');
    if (!row) errors.push(`item_enchant names a thing the record does not hold: ${op?.name}`);
    else {
      if (canonKey(row.holder) !== canonKey(op?.holder)) errors.push(`item_enchant touches a thing the record does not place in ${op?.holder}'s hand: ${op?.name}`);
      if (row.enchant !== undefined && row.enchant !== null) errors.push(`${op?.name} already carries the ${row.enchant} rune — one rune per notable thing, ever`);
      if (rune && row.kind !== undefined && !rune.seats.includes(row.kind)) errors.push(`the ${op?.enchant} rune does not seat on a ${row.kind}: ${op?.name}`);
    }
  }
}
// THE REST LAW (XVIII, Article III) — one lawful value, once per
// calendar day of world time. The court seats only when the briefing
// carries the calendar's day (bare context keeps shape law); a hero
// who has never rested carries no mark and passes free.
function validateRest(payload, context, errors) {
  const rest = payload?.state_updates?.rest;
  if (rest === undefined || rest === null) return;
  assert(rest === 'long', `state_updates.rest must be exactly 'long' — short rests are flavor, not mechanics`, errors);
  if (rest === 'long' && Number.isInteger(context.day) && Number.isInteger(context.lastRestDay) && context.lastRestDay >= context.day) {
    errors.push(`a long rest already blessed day ${context.day} — the door refuses a second before the calendar turns`);
  }
}
// THE SPAWN EXPANSION — the ONE helper every bench and client calls, so
// instances derive identically everywhere: id `species-slug-letter`,
// deterministic letters for the unnamed, hit points and armor from THE
// THREAT TABLE, zone from the spawn. A species the bestiary cannot
// resolve expands to nothing — fail closed, never invent.
export function expandSpawn(spawn, bestiary = []) {
  if (!spawn || typeof spawn !== 'object' || Array.isArray(spawn)) return [];
  const card = (Array.isArray(bestiary) ? bestiary : []).find((row) => canonKey(row?.species) === canonKey(spawn.species));
  if (!card) return [];
  const table = THREAT_TABLE[card.threat];
  if (!table) return [];
  const species = String(card.species).trim();
  const slug = canonKey(species).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'creature';
  const letters = ['a', 'b', 'c', 'd', 'e', 'f'];
  const count = Math.max(1, Math.min(6, Math.trunc(Number(spawn.count) || 1)));
  return letters.slice(0, count).map((letter, i) => {
    const given = Array.isArray(spawn.names) ? spawn.names[i] : null;
    const name = typeof given === 'string' && given.trim() ? given.trim().slice(0, 60) : `${species} ${letter.toUpperCase()}`;
    return { id: `${slug}-${letter}`, name, species, hp: table.hp, maxHp: table.hp, ac: table.ac, zone: ZONES.has(spawn.zone) ? spawn.zone : 'near' };
  });
}

// THE NOBODY-TELEPORTS LAW (Directive VIII.3) — when the court is seated,
// a narration speaker or dialogue_cue voice whose derived last lawful
// ground is KNOWN and is neither the current scene nor within the party
// is rejected, naming the soul and its actual ground. Exempt by law: the
// hero (the root travels with the scene), every party member, a soul
// introduced by this same turn's cast_add, and a soul whose whereabouts
// the record does not know. The court seats iff the context carries a
// presence array, a party array, AND a standing scene — all three, or
// silence: the law binds only where the record can testify.
function validateSpeakerGround(payload, context, errors) {
  if (!payload || typeof payload !== 'object') return;
  if (!Array.isArray(context.presence) || !Array.isArray(context.party)) return;
  const sceneRegion = context.scene && typeof context.scene === 'object' ? String(context.scene.region || '').trim() : '';
  if (!sceneRegion) return;
  const story = (payload.story && typeof payload.story === 'object' && !Array.isArray(payload.story)) ? payload.story : {};
  const partyNames = context.party.filter((name) => typeof name === 'string');
  const presenceNames = context.presence.map((entry) => (entry && typeof entry.name === 'string' ? entry.name : '')).filter(Boolean);
  const introduced = (Array.isArray(story.cast_add) ? story.cast_add : []).map((add) => (typeof add?.name === 'string' ? add.name : '')).filter(Boolean);
  const judge = (speaker, label) => {
    if (typeof speaker !== 'string' || !speaker.trim()) return;
    if (namesTheHero(context, speaker)) return;
    if (resolveAmong(partyNames, speaker)) return;
    if (introduced.some((name) => canonKey(name) === canonKey(speaker) || canonKey(name).split(/\s+/)[0] === canonKey(speaker))) return;
    const resolved = resolveAmong(presenceNames, speaker);
    if (resolved === null) return; // unknown soul — the census court's business
    const entry = context.presence.find((row) => row && row.name === resolved);
    const ground = entry && typeof entry.ground === 'string' ? entry.ground.trim() : '';
    if (!ground) return; // whereabouts unknown — nothing to testify
    if (canonKey(ground) !== canonKey(sceneRegion)) errors.push(`${label}: the elsewhere does not speak — ${speaker.trim()} last stood in ${ground}, not ${sceneRegion}`);
  };
  (Array.isArray(payload.narration_blocks) ? payload.narration_blocks : []).forEach((block, index) => judge(block?.speaker, `narration_blocks[${index}]`));
  judge(payload.dialogue_cue?.speaker, 'dialogue_cue');
}

// THE HONEST FRAME (Directive IX) — the image cue is a CLAIM about who
// stands in the painting, and the claim is judged like any other line of
// the record: the dead are not painted, the elsewhere is not painted, the
// unrecorded are not painted. Seat law mirrors the speaker-ground court —
// each sub-court binds only where the briefing can testify, so a bare
// context keeps exactly the shape law it always had:
//   dead court     — seats iff context.cast is an array;
//   unnamed court  — seats iff context.cast AND context.hero are seated
//                    (a court without the hero's name cannot call any
//                    name unknown — the name might be hers);
//   elsewhere court — seats iff presence AND party arrays ride AND a
//                    scene stands (null scene = genesis rides free).
// Exempt everywhere, same as the speaker court: the hero, every party
// member, a soul introduced by this same turn's cast_add, and a soul
// seated by this same turn's party_join.
// LAW X — THE PLATE'S CAPTION (0.9.0), the court itself. ONE law, two
// doors: validateImageCue seats it inside the one dm_turn seal, and the
// prose court's probe (G24e) re-reads shipped session bytes through the
// SAME function — no second copy to drift. Null/undefined means legacy
// (sealed before the Art Director's chair opened): out of session.
export function captionCourt(caption, pageText) {
  if (caption === undefined || caption === null) return [];
  if (typeof caption !== 'string') return ['image_cue.caption must be prose, not machinery'];
  const errors = [];
  const cap = caption.trim();
  if (cap.length < 40 || cap.length > 220) errors.push(`image_cue.caption must run 40-220 characters, not ${cap.length}`);
  if (!/^[A-Z]/.test(cap)) errors.push('image_cue.caption must open on a capital');
  if (!/[.!?]$/.test(cap)) errors.push('image_cue.caption must close on terminal punctuation');
  if (/\u2026/.test(cap) || /\.\.\./.test(cap)) errors.push('image_cue.caption carries a truncation mark');
  const sentences = cap.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean).length;
  if (sentences > 2) errors.push('image_cue.caption must hold to one or two sentences');
  const foldCap = cap.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const foldPage = String(pageText || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (foldCap && foldPage.includes(foldCap)) errors.push('image_cue.caption merely quotes the page — a caption describes the plate');
  return errors;
}

function validateImageCue(payload, context, errors) {
  const cue = payload?.image_cue;
  if (cue === undefined || cue === null) return;
  if (typeof cue !== 'object' || Array.isArray(cue)) return; // the shape law below speaks
  if (!['portrait', 'scene'].includes(cue.kind) || !Array.isArray(cue.subjects)) return; // ditto
  if (cue.crowd !== undefined && cue.crowd !== null && !['none', 'background'].includes(cue.crowd)) {
    errors.push(`image_cue.crowd holds a word the law does not know: ${String(cue.crowd).slice(0, 40)}`);
  }
  // LAW X — a caption riding the cue answers to captionCourt (above):
  // 40–220 characters, capital opening, terminal close, one or two
  // sentences, no truncation marks, never a whitespace-folded substring
  // of the folded narration — a caption DESCRIBES the plate; it does
  // not quote the page. (A raw quote sliced mid-sentence once captioned
  // a hearth interior — legacy sliced captions live on replay-only.)
  {
    const pageText = (Array.isArray(payload.narration_blocks) ? payload.narration_blocks : [])
      .map((block) => String(block?.text || '')).join(' ');
    for (const line of captionCourt(cue.caption, pageText)) errors.push(line);
  }
  // The moment is the page's own staged line — a substring by design,
  // so it answers only for shape: prose, present, within the brief's cap.
  if (cue.moment !== undefined && cue.moment !== null) {
    if (typeof cue.moment !== 'string' || !cue.moment.trim() || cue.moment.length > 480) {
      errors.push('image_cue.moment must be 1-480 characters of the page\'s own prose');
    }
  }
  for (const raw of cue.subjects) {
    if (!(typeof raw === 'string' && raw.trim().length >= 2 && raw.trim().length <= 80)) {
      errors.push('image_cue.subjects entries must be 2-80 character names');
      return;
    }
  }
  const story = (payload.story && typeof payload.story === 'object' && !Array.isArray(payload.story)) ? payload.story : {};
  const introduced = (Array.isArray(story.cast_add) ? story.cast_add : []).map((add) => (typeof add?.name === 'string' ? add.name : '')).filter(Boolean);
  if (typeof story.party_join?.name === 'string') introduced.push(story.party_join.name);
  const isSameTurn = (name) => introduced.some((fresh) => canonKey(fresh) === canonKey(name) || canonKey(fresh).split(/\s+/)[0] === canonKey(name));
  const castSouls = (Array.isArray(context.cast) ? context.cast : [])
    .map((soul) => ({ key: canonKey(soul?.name), first: canonKey(soul?.name).split(/\s+/)[0] || '', dead: canonKey(soul?.status) === 'dead' }))
    .filter((soul) => soul.key);
  const heroSeated = typeof context.hero === 'string' && context.hero.trim();
  const partyNames = Array.isArray(context.party) ? context.party.filter((name) => typeof name === 'string') : null;
  const sceneRegion = context.scene && typeof context.scene === 'object' ? String(context.scene.region || '').trim() : '';
  const groundSeated = Array.isArray(context.presence) && partyNames && sceneRegion;
  for (const raw of cue.subjects) {
    const name = raw.trim();
    if (namesTheHero(context, name)) continue;
    if (isSameTurn(name)) continue;
    if (Array.isArray(context.cast)) {
      const matches = castSouls.filter((soul) => soul.key === canonKey(name) || soul.first === canonKey(name));
      if (matches.length && matches.every((soul) => soul.dead)) {
        errors.push(`image_cue paints the dead: ${name} is dead and is not painted`);
        continue;
      }
      if (!matches.length && heroSeated) {
        errors.push(`image_cue names a soul the record does not hold: ${name}`);
        continue;
      }
    }
    if (groundSeated) {
      if (resolveAmong(partyNames, name)) continue;
      const presenceNames = context.presence.map((entry) => (entry && typeof entry.name === 'string' ? entry.name : '')).filter(Boolean);
      const resolved = resolveAmong(presenceNames, name);
      if (resolved === null) continue; // whereabouts unknown — nothing to testify
      const entry = context.presence.find((row) => row && row.name === resolved);
      const ground = entry && typeof entry.ground === 'string' ? entry.ground.trim() : '';
      if (!ground) continue;
      if (canonKey(ground) !== canonKey(sceneRegion)) errors.push(`image_cue paints the elsewhere: ${name} last stood in ${ground}, not ${sceneRegion}`);
    }
  }
}

// context — the codex snapshot the turn is judged against, threaded by every
// caller (client turn path, server repair-retry path, evals). Taken BEFORE
// this turn's story updates apply, so a soul may speak its dying words in the
// very turn that kills it — and never again after.
//   context.cast: [{ name, status }] — the sealed cast at the turn's start.
export function validateDmTurn(payload, entropyPool = [], context = {}) {
  const errors = [];
  if (payload && typeof payload === 'object') {
    validateWorldShape(payload.story, context, errors);
    validateThreads(payload.story, context, errors);
    validateTrove(payload.story, context, errors);
    validatePurse(payload.story, context, errors);
    validateScene(payload.story, context, errors, payload);
    validateParty(payload.story, context, errors);
    validateFixtures(payload.story, context, errors);
    validateBestiary(payload.story, context, errors);
    validateSheetGrant(payload.story, context, errors);
    validateSheetCondition(payload.story, context, errors);
    validateItemEquip(payload.story, context, errors);
    validateEnchant(payload.story, context, errors);
    validateRest(payload, context, errors);
    validateCastSpell(payload.story, context, errors);
    validateSpeakerGround(payload, context, errors);
    validateImageCue(payload, context, errors);
  }
  assert(payload && typeof payload === 'object' && !Array.isArray(payload), 'payload must be an object', errors);
  if (!payload || typeof payload !== 'object') return { ok: false, errors };
  noUnknown(payload, ALLOWED_KEYS, 'dm_turn', errors);
  for (const key of ALLOWED_KEYS) assert(Object.hasOwn(payload, key), `${key} is required`, errors);

  // THE DEAD DO NOT SPEAK — the one law amendment of the Experience Cut.
  // Dialogue attributed to a cast member whose sealed status is 'dead' makes
  // the whole turn invalid. Matching is canonical (trimmed, case-insensitive)
  // and alias-aware: a bare first name reaches its soul, so the dead
  // "Mara Vey" cannot slip back onstage as "Mara". When a name could mean
  // both a living and a dead soul, the living one is presumed to speak —
  // the law blocks only the unambiguous dead.
  const canon = (value) => String(value ?? '').trim().toLowerCase();
  const firstName = (value) => canon(value).split(/\s+/)[0] || '';
  const souls = (context.cast || [])
    .map((soul) => ({ name: canon(soul?.name), first: firstName(soul?.name), dead: canon(soul?.status) === 'dead' }))
    .filter((soul) => soul.name);
  const speaksFromTheGrave = (speaker) => {
    if (typeof speaker !== 'string') return false;
    const name = canon(speaker);
    if (!name) return false;
    const matches = souls.filter((soul) => soul.name === name || soul.first === name);
    return matches.length > 0 && matches.every((soul) => soul.dead);
  };

  assert(Array.isArray(payload.narration_blocks) && payload.narration_blocks.length >= 1 && payload.narration_blocks.length <= 8, 'narration_blocks must contain 1-8 blocks', errors);
  let words = 0;
  for (const [index, block] of (payload.narration_blocks || []).entries()) {
    noUnknown(block, new Set(['text','speaker']), `narration_blocks[${index}]`, errors);
    assert(cleanText(block.text, 1200), `narration_blocks[${index}].text invalid`, errors);
    assert(block.speaker === null || cleanText(block.speaker, 80), `narration_blocks[${index}].speaker invalid`, errors);
    assert(!speaksFromTheGrave(block.speaker), `narration_blocks[${index}]: the dead do not speak — ${block.speaker} is dead and cannot be given dialogue`, errors);
    words += String(block.text || '').trim().split(/\s+/).filter(Boolean).length;
  }
  assert(words >= 20 && words <= 180, `narration total must be 20-180 words (received ${words})`, errors);

  assert(Array.isArray(payload.suggestions) && payload.suggestions.length === 3, 'suggestions must contain exactly 3 entries', errors);
  const normalized = (payload.suggestions || []).map((s) => String(s).trim().toLowerCase());
  assert(new Set(normalized).size === normalized.length, 'suggestions must be distinct', errors);
  for (const suggestion of payload.suggestions || []) assert(cleanText(suggestion, 60) && suggestion.trim().split(/\s+/).length <= 6, 'each suggestion must be <=6 words', errors);

  if (payload.roll_request !== null) {
    const rr = payload.roll_request;
    noUnknown(rr, new Set(['id','label','kind','die','ability','skill','proficient','dc','advantage','extra_mod','action_id','actor_id','target_id']), 'roll_request', errors);
    assert(cleanText(rr?.id, 80), 'roll_request.id invalid', errors);
    assert(cleanText(rr?.label, 120), 'roll_request.label invalid', errors);
    assert(ROLL_KINDS.has(rr?.kind), 'roll_request.kind invalid', errors);
    assert(/^d(4|6|8|10|12|20|100)$/.test(rr?.die || ''), 'roll_request.die invalid', errors);
    assert(rr?.ability === null || ['STR','DEX','CON','INT','WIS','CHA'].includes(rr?.ability), 'roll_request.ability invalid', errors);
    assert(rr?.skill === null || cleanText(rr?.skill, 50), 'roll_request.skill invalid', errors);
    assert(typeof rr?.proficient === 'boolean', 'roll_request.proficient invalid', errors);
    assert(rr?.dc === null || Number.isInteger(rr?.dc) && rr.dc >= 5 && rr.dc <= 30, 'roll_request.dc invalid', errors);
    assert(ADVANTAGE.has(rr?.advantage), 'roll_request.advantage invalid', errors);
    assert(Number.isInteger(rr?.extra_mod) && rr.extra_mod >= -10 && rr.extra_mod <= 20, 'roll_request.extra_mod invalid', errors);
    assert(cleanText(rr?.actor_id, 80), 'roll_request.actor_id invalid', errors);
    // THE TABLE'S-DICE LAW (Directive X, Law V) — with the sheet ledger
    // seated, the table rolls only for the hero and the sheeted: actor_id
    // is 'hero' or a sheeted companion's name. Bare context keeps shape law.
    if (Array.isArray(context?.sheets) && cleanText(rr?.actor_id, 80) && String(rr.actor_id).trim() !== 'hero') {
      if (!context.sheets.some((name) => canonKey(name) === canonKey(rr.actor_id))) {
        errors.push(`roll_request.actor_id names an unsheeted actor: ${String(rr.actor_id).trim()} — the table rolls only for the hero and the sheeted`);
      }
    }
    assert(rr?.target_id === null || cleanText(rr?.target_id, 80), 'roll_request.target_id invalid', errors);
    if (['attack','damage'].includes(rr?.kind)) assert(cleanText(rr?.action_id, 80), 'attacks and damage require action_id', errors);
    if (payload.state_updates !== null) errors.push('state_updates must be null while a roll is unresolved');
  }

  if (payload.cinematic !== null) {
    const c = payload.cinematic;
    noUnknown(c, new Set(['type','title','subtitle','palette']), 'cinematic', errors);
    assert(CINEMATIC_TYPES.has(c?.type), 'cinematic.type invalid', errors);
    assert(cleanText(c?.title, 100), 'cinematic.title invalid', errors);
    assert(cleanText(c?.subtitle, 180), 'cinematic.subtitle invalid', errors);
    assert(Array.isArray(c?.palette) && c.palette.length === 3 && c.palette.every((hex) => /^#[0-9a-fA-F]{6}$/.test(hex)), 'cinematic.palette invalid', errors);
  }

  if (payload.combat !== null) {
    const combat = payload.combat;
    noUnknown(combat, new Set(['op','round_delta','enemy_add','enemy_update','enemy_remove','npc_actions','spawn','initiative']), 'combat', errors);
    assert(['start','update','end'].includes(combat?.op), 'combat.op invalid', errors);
    assert([0,1].includes(combat?.round_delta), 'combat.round_delta invalid', errors);
    assert(Array.isArray(combat?.enemy_add) && Array.isArray(combat?.enemy_update) && Array.isArray(combat?.enemy_remove) && Array.isArray(combat?.npc_actions), 'combat arrays required', errors);
    for (const enemy of combat?.enemy_add || []) {
      assert(cleanText(enemy.id, 80) && cleanText(enemy.name, 80), 'enemy identity invalid', errors);
      assert(Number.isInteger(enemy.hp) && enemy.hp > 0 && enemy.hp <= 999, 'enemy hp invalid', errors);
      assert(Number.isInteger(enemy.maxHp) && enemy.maxHp >= enemy.hp && enemy.maxHp <= 999, 'enemy maxHp invalid', errors);
      assert(Number.isInteger(enemy.ac) && enemy.ac >= 1 && enemy.ac <= 30, 'enemy ac invalid', errors);
      assert(ZONES.has(enemy.zone), 'enemy zone invalid', errors);
    }
    // THE BESTIARY LAW (Directive X, Law I) — instances enter through spawn,
    // referencing a SEALED species; hit points and armor derive from the
    // threat table, never from the model. Spawn rides only the opening
    // operation — instances enter when battle opens, so every group draws.
    const spawn = combat?.spawn;
    if (spawn !== undefined && spawn !== null) {
      if (typeof spawn !== 'object' || Array.isArray(spawn) || Object.keys(spawn).some((key) => !['species', 'count', 'names', 'zone'].includes(key))) {
        errors.push('combat.spawn must be an object with exactly species, count, names, and zone');
      } else {
        assert(cleanText(spawn.species, 60) && String(spawn.species).trim().length >= 3, 'combat.spawn.species must be 3-60 chars', errors);
        assert(Number.isInteger(spawn.count) && spawn.count >= 1 && spawn.count <= 6, 'combat.spawn.count must be an integer between 1 and 6', errors);
        assert(spawn.names === null || spawn.names === undefined || (Array.isArray(spawn.names) && spawn.names.length <= (Number.isInteger(spawn.count) ? spawn.count : 0) && spawn.names.every((name) => cleanText(name, 60) && String(name).trim().length >= 2)), 'combat.spawn.names must be null or 2-60 char names, at most one per instance', errors);
        assert(ZONES.has(spawn.zone), 'combat.spawn.zone invalid', errors);
        assert(combat?.op === 'start', 'combat.spawn rides only the opening operation — instances enter when battle opens', errors);
        if (Array.isArray(context.bestiary) && cleanText(spawn.species, 60)) {
          const sealed = context.bestiary.some((card) => canonKey(card?.species) === canonKey(spawn.species));
          const sameBreath = canonKey(payload.story?.creature_add?.species || '') === canonKey(spawn.species);
          assert(sealed || sameBreath, `combat.spawn names a species the record has not sealed: ${String(spawn.species).trim()}`, errors);
        }
      }
    }
    // THE ROUND LAW (Directive X, Law III) — combat opens by sealing
    // initiative as an operation: ONE order, device draws for the player's
    // side, one accounted d20 pool draw per enemy species group (pack
    // initiative — the pool holds three d20s, so at most three groups).
    const init = combat?.initiative;
    if (combat?.op === 'start') assert(init !== undefined && init !== null, 'combat.op start requires initiative — the order is sealed as an operation', errors);
    if (init !== undefined && init !== null && combat?.op !== 'start') errors.push('combat.initiative rides only the opening operation — the order is sealed once');
    if (init !== undefined && init !== null) {
      if (typeof init !== 'object' || Array.isArray(init) || Object.keys(init).some((key) => !['device', 'entropy'].includes(key))) {
        errors.push('combat.initiative must be an object with exactly device and entropy');
      } else {
        assert(Array.isArray(init.device) && init.device.length >= 1 && init.device.every((name) => cleanText(name, 80)), 'combat.initiative.device must name the player side — the hero and every companion draw on the device', errors);
        const draws = Array.isArray(init.entropy) ? init.entropy : [];
        assert(Array.isArray(init.entropy) && draws.length >= 1 && draws.length <= 3, 'combat.initiative.entropy must hold 1-3 group draws — the pool holds three d20s', errors);
        const groups = new Set();
        for (const [i, draw] of draws.entries()) {
          if (!draw || typeof draw !== 'object' || Array.isArray(draw) || Object.keys(draw).some((key) => !['group', 'index'].includes(key))) {
            errors.push(`combat.initiative.entropy[${i}] must be an object with exactly group and index`);
            continue;
          }
          assert(cleanText(draw.group, 80), `combat.initiative.entropy[${i}].group invalid`, errors);
          const use = (payload.entropy_use || [])[draw.index];
          assert(Number.isInteger(draw.index) && Boolean(use) && use.die === 'd20', `initiative draw for ${String(draw.group || '').trim() || 'an unnamed group'} must cite a d20 entropy_use entry by index — every draw accounted`, errors);
          const key = canonKey(draw.group);
          if (key) {
            assert(!groups.has(key), `initiative draws twice for the same group: ${String(draw.group).trim()}`, errors);
            groups.add(key);
          }
        }
        if (spawn && cleanText(spawn?.species, 60)) {
          assert(groups.has(canonKey(spawn.species)), `initiative must account a draw for the spawned species: ${String(spawn.species).trim()}`, errors);
        }
        for (const enemy of combat?.enemy_add || []) {
          if (cleanText(enemy?.id, 80)) assert(groups.has(canonKey(enemy.id)) || groups.has(canonKey(enemy.name)), `initiative must account a draw for the added enemy: ${String(enemy?.name || enemy?.id).trim()}`, errors);
        }
        // The device coverage court — seats iff the context carries the
        // hero AND a party array: the device list names exactly the
        // player's side, nobody missing, nobody invented. A soul joined
        // by this same turn's party_join may lawfully appear.
        if (typeof context.hero === 'string' && context.hero.trim() && Array.isArray(context.party)) {
          const declared = new Set((Array.isArray(init.device) ? init.device : []).map((name) => canonKey(name)));
          for (const need of [context.hero, ...context.party.filter((name) => typeof name === 'string')]) {
            if (!declared.has(canonKey(need))) errors.push(`initiative.device must name the whole player side — missing: ${String(need).trim()}`);
          }
          const lawful = new Set([canonKey(context.hero), ...context.party.filter((name) => typeof name === 'string').map((name) => canonKey(name))]);
          if (typeof payload.story?.party_join?.name === 'string') lawful.add(canonKey(payload.story.party_join.name));
          for (const name of Array.isArray(init.device) ? init.device : []) {
            if (!lawful.has(canonKey(name))) errors.push(`initiative.device names a soul outside the player side: ${String(name).trim()}`);
          }
        }
      }
    }
    // THE ONE-ACTION COURT (Directive X, Law III) — npc_actions gains its
    // first shape: { actor, action }. One action per living combatant per
    // turn; a second is refused BY NAME; the dead and the fled keep their
    // seats and act no more. The standing court seats iff the context
    // carries a combatants array; an actor spawned or added this same
    // turn is lawful (the same-breath law).
    const sameBreathActors = new Set();
    if (spawn && typeof spawn === 'object' && !Array.isArray(spawn)) {
      const cards = [...(Array.isArray(context.bestiary) ? context.bestiary : [])];
      const fresh = payload.story?.creature_add;
      if (fresh && typeof fresh === 'object' && !Array.isArray(fresh)) cards.push(fresh);
      for (const instance of expandSpawn(spawn, cards)) {
        sameBreathActors.add(canonKey(instance.id));
        sameBreathActors.add(canonKey(instance.name));
      }
    }
    for (const enemy of combat?.enemy_add || []) {
      if (enemy?.id) sameBreathActors.add(canonKey(enemy.id));
      if (enemy?.name) sameBreathActors.add(canonKey(enemy.name));
    }
    const actors = new Set();
    // THE CASTING LAW (XVIII, Article V): a cast is THE action — the
    // round law counts this turn's cast_spell caster as having acted,
    // so a second motion through npc_actions is refused by name.
    const turnCast = payload.story?.cast_spell;
    if (turnCast && typeof turnCast === 'object' && !Array.isArray(turnCast) && typeof turnCast.caster === 'string' && canonKey(turnCast.caster)) {
      actors.add(canonKey(turnCast.caster));
    }
    for (const [i, action] of (combat?.npc_actions || []).entries()) {
      if (!action || typeof action !== 'object' || Array.isArray(action) || Object.keys(action).length !== 2 || Object.keys(action).some((key) => !['actor', 'action'].includes(key))) {
        errors.push(`combat.npc_actions[${i}] must be an object with exactly actor and action`);
        continue;
      }
      assert(cleanText(action.actor, 80) && String(action.actor).trim().length >= 2, `combat.npc_actions[${i}].actor must be 2-80 chars`, errors);
      assert(cleanText(action.action, 120) && String(action.action).trim().length >= 3, `combat.npc_actions[${i}].action must be 3-120 chars`, errors);
      const key = canonKey(action.actor);
      if (!key) continue;
      assert(!actors.has(key), `a second action in one turn is refused by name: ${String(action.actor).trim()} has already acted`, errors);
      actors.add(key);
      if (Array.isArray(context.combatants)) {
        const row = context.combatants.find((c) => canonKey(c?.id) === key || canonKey(c?.name) === key);
        if (!row && !sameBreathActors.has(key)) errors.push(`combat.npc_actions[${i}] moves a combatant the record does not stand: ${String(action.actor).trim()}`);
        else if (row && Number.isFinite(Number(row?.hp)) && Number(row.hp) <= 0) errors.push(`the fallen do not act: ${String(action.actor).trim()} is down`);
      }
    }
  }

  assert(Array.isArray(payload.entropy_use), 'entropy_use must be an array', errors);
  const indices = (payload.entropy_use || []).map((entry) => entry.index);
  for (let i = 0; i < indices.length; i += 1) {
    assert(Number.isInteger(indices[i]) && indices[i] >= 0 && indices[i] < entropyPool.length, `entropy index ${indices[i]} invalid`, errors);
    assert(indices[i] === i, 'entropy indices must be contiguous and consumed in order', errors);
    assert(payload.entropy_use[i].die === entropyPool[i]?.die, 'entropy die must match supplied pool', errors);
  }

  if (payload.dialogue_cue !== null) {
    assert(cleanText(payload.dialogue_cue?.speaker, 80), 'dialogue_cue.speaker invalid', errors);
    assert(!speaksFromTheGrave(payload.dialogue_cue?.speaker), `dialogue_cue: the dead do not speak — ${payload.dialogue_cue?.speaker} is dead and cannot be given dialogue`, errors);
    assert(cleanText(payload.dialogue_cue?.line, 180) && payload.dialogue_cue.line.trim().split(/\s+/).length <= 18, 'dialogue line must be <=18 words', errors);
  }
  if (payload.image_cue !== null) {
    assert(['portrait','scene'].includes(payload.image_cue?.kind), 'image_cue.kind invalid', errors);
    assert(Array.isArray(payload.image_cue?.subjects), 'image_cue.subjects invalid', errors);
  }
  if (payload.time_advance !== null) {
    assert(['hours','days'].includes(payload.time_advance?.unit), 'time_advance.unit invalid', errors);
    assert(Number.isInteger(payload.time_advance?.n) && payload.time_advance.n >= 1 && payload.time_advance.n <= 30, 'time_advance.n invalid', errors);
  }
  return { ok: errors.length === 0, errors };
}

export function makeEntropy(seed = Math.random) {
  const dice = [20,20,20,6,6,8,12,100];
  return dice.map((sides, index) => ({ index, die: `d${sides}`, value: Math.floor(seed() * sides) + 1 }));
}

export function safeFallbackTurn(playerText = '', turn = 0) {
  return {
    narration_blocks: [{ text: `The world holds its breath around your choice. ${playerText ? 'Your intent is clear, but fate asks for a cleaner telling before it will move.' : 'A distant bell marks the beginning of an unwritten road.'} Nothing mechanical changes while the Dungeon Master gathers the thread again.`, speaker: null }],
    suggestions: ['Look for another path', 'Ask what changed', 'Wait and listen'],
    roll_request: null, state_updates: null, combat: null,
    cinematic: turn === 0 ? { type: 'chapter', title: 'The First Turning', subtitle: 'Every world begins with one impossible choice.', palette: ['#0d0b14','#6f3f2d','#d4a24e'] } : null,
    story: null, image_cue: null, dialogue_cue: null, time_advance: null, entropy_use: []
  };
}
