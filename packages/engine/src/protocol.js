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
const ITEM_KINDS = new Set(['weapon','tool','keepsake','treasure','document']);
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
      noUnknown(add, new Set(['name','kind','holder','note']), 'story.item_add', errors);
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

// context — the codex snapshot the turn is judged against, threaded by every
// caller (client turn path, server repair-retry path, evals). Taken BEFORE
// this turn's story updates apply, so a soul may speak its dying words in the
// very turn that kills it — and never again after.
//   context.cast: [{ name, status }] — the sealed cast at the turn's start.
export function validateDmTurn(payload, entropyPool = [], context = {}) {
  const errors = [];
  if (payload && typeof payload === 'object') {
    validateThreads(payload.story, context, errors);
    validateTrove(payload.story, context, errors);
    validatePurse(payload.story, context, errors);
    validateScene(payload.story, context, errors, payload);
    validateParty(payload.story, context, errors);
    validateFixtures(payload.story, context, errors);
    validateSpeakerGround(payload, context, errors);
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
    noUnknown(combat, new Set(['op','round_delta','enemy_add','enemy_update','enemy_remove','npc_actions']), 'combat', errors);
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
