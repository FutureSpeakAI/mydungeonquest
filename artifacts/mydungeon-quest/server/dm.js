import { buildSystemPrompt } from '../src/lib/systemPrompt.js';
import { mockDmTurn } from 'fatescript/mockDm';
import { ITEM_KINDS, safeFallbackTurn, validateDmTurn, AMBITION_OUTCOMES, CLOCK_SEGMENTS, CLOCK_OUTCOMES, STANDING_DELTAS } from 'fatescript/protocol';
// THE ONE SEAT (XVIII): the tool schema declares the kind enum and the
// rune keys from the tables themselves — never a mirrored list.
import { ENCHANT_TABLE } from 'fatescript/armory';
// THE GRIMOIRE (XVIII): the schema's spell enum imports from the ONE
// library — a mirror would drift, and a drifted enum is a trap (the
// model emits keys the door then refuses).
import { SPELL_TABLE } from 'fatescript/grimoire';
// THE ATLAS (63.4): the region-state enum imports from the ONE seat —
// the fold's own table in fatescript/story — never a mirror.
import { REGION_STATES } from 'fatescript/story';
import { censusNote, unrecordedSouls } from 'fatescript/census';
import { artDirectorSits } from './artDirector.js';
// THE DASH LAW at the deterministic doors (XVII, Article V) — the whole-turn
// fold from the one pinned source: the engine's 0.9 mock corpus was written
// with em dashes as lawful typography, and a deterministic tier cannot learn
// from a revise, so the house's own tiers are folded at the SOURCE, before
// the chair composes and the one validator seals. Pages from these doors are
// born at zero; the pre-pass flag stays armed for every tier, and the live
// tiers keep the whole teaching loop: flag → mandatory revise → ship-door fold.
import { dashCheck, dashFoldTurn, proseOfTurn } from '../src/lib/voice.js';
// THE ANCHORED WINDOW (Task 54) — the ONE shared history-window law,
// imported by both sides of the wire so the shaped prefix stays
// byte-stable between re-anchors and the prompt cache actually reads.
import { anchoredWindow, HISTORY_FLOOR_MESSAGES, HISTORY_STEP_MESSAGES } from '../src/lib/historyWindow.js';
// Token & cache telemetry: every real Anthropic call (repairs included)
// reports its usage block to the watchtower's day-ledger beside the
// request-count spend tally. Display/log only — never a ceiling.
import { recordTokens } from './watchtower.js';

const bornAtZero = (turn) => (turn && dashCheck(proseOfTurn(turn)).flagged ? dashFoldTurn(turn) : turn);
import { cueCourt, propLawCheck, movedItems, groundFixtures } from '../src/lib/plateroad.js';

// THE CENSUS AT THE DOOR — Directive VI, Phase 11. The validator rules the
// shape; the census rules the roll: an attributed speaker the record does
// not know is an unrecorded soul. Both courts read the same pre-turn
// snapshot, and their findings share the one-repair message — the model
// either declares the stranger (cast_add, voice_card and all) or unclaims
// the line. Exported for the bench; the door is the only live caller.
export function judgeTurn(turn, input) {
  // The ground courts (Directive VII) seat from the same briefing: regions
  // from the pack, the standing scene from [STORY].scene_state — null there
  // attests no scene stands, so genesis rides free. (The briefing's own
  // `scene` key is cast presence, a different beast — never read it here.)
  // THE PARTY AND THE ELSEWHERE (Directive VIII): the party, presence, and
  // fixture courts seat ONLY when the briefing carries their evidence — an
  // older sealed input without these arrays leaves the courts unseated
  // (bare-context law), never falsely attested empty.
  const context = { cast: input.story?.cast || [], threads: input.story?.threads_state || [], trove: input.story?.trove_state || [], purses: input.story?.purse_state || [], regions: input.story?.regions || [], scene: input.story?.scene_state ? { region: input.story.scene_state.region } : null, hero: input.hero?.name || null };
  if (Array.isArray(input.story?.party_state)) context.party = input.story.party_state.map((member) => member?.name).filter((memberName) => typeof memberName === 'string');
  if (Array.isArray(input.story?.presence_state)) context.presence = input.story.presence_state;
  if (Array.isArray(input.story?.fixture_state)) context.fixtures = input.story.fixture_state;
  // THE OPEN ROAD (XIX, Articles IV–VII): the four new courts seat the
  // same conditional way. The declaration is THREE-VALUED: an ABSENT
  // `declaration` key (an elder sealed input) leaves the court out of
  // session; a NULL one is the client attesting no declaration stood;
  // a STRING one forces the verbatim seal.
  if (Object.hasOwn(input.story || {}, 'declaration')) context.declaredAmbition = typeof input.story.declaration === 'string' && input.story.declaration.trim() ? input.story.declaration : null;
  if (Array.isArray(input.story?.ambitions_state)) context.openAmbitions = input.story.ambitions_state.filter((text) => typeof text === 'string');
  if (Array.isArray(input.story?.clocks_state)) context.openClocks = input.story.clocks_state;
  if (Array.isArray(input.story?.rumors_state)) context.rumors = input.story.rumors_state.filter((text) => typeof text === 'string');
  if (Array.isArray(input.spine?.beats)) context.spine = { beats: input.spine.beats, beatIndex: Number.isInteger(input.story?.beat?.index) ? input.story.beat.index : null };
  // THE BATTLE CUT (Directive X): the sealed bestiary and the standing
  // combatants seat their courts the same conditional way — evidence
  // present, court in session; absent, out of session, never faked.
  if (Array.isArray(input.story?.bestiary_state)) context.bestiary = input.story.bestiary_state;
  if (Array.isArray(input.story?.sheet_state)) context.sheets = input.story.sheet_state.map((row) => row?.name).filter((name) => typeof name === 'string');
  // THE REST LAW (XVIII, Article III): the calendar day and the hero's
  // rest mark seat the once-per-day court — evidence present, court in
  // session; absent (older sealed inputs), out of session, never faked.
  if (Number.isInteger(input.story?.calendar_state?.day)) {
    context.day = input.story.calendar_state.day;
    context.lastRestDay = Number.isInteger(input.hero?.lastRestDay) ? input.hero.lastRestDay : null;
  }
  if (Array.isArray(input.state?.combat?.enemies)) context.combatants = input.state.combat.enemies.map((enemy) => ({ id: enemy?.id, name: enemy?.name, hp: enemy?.hp, ...(typeof enemy?.species === 'string' ? { species: enemy.species } : {}) }));
  // THE CASTING LAW (XVIII, Article V): the refusal matrix seats from the
  // request's own hero — learned list, slots, tank, held thread — and the
  // sheeted casters from the briefing's sheet_state. Evidence present,
  // court in session; absent (older sealed inputs), out of session.
  if (input.hero && typeof input.hero === 'object') {
    if (Array.isArray(input.hero.spells)) context.heroSpells = input.hero.spells;
    if (input.hero.spellSlots && typeof input.hero.spellSlots === 'object') context.casterSlots = input.hero.spellSlots;
    if (typeof input.hero.caster === 'string') context.heroCaster = input.hero.caster;
    if (input.hero.spellEnergy && typeof input.hero.spellEnergy === 'object') context.spellEnergy = input.hero.spellEnergy;
    if (typeof input.hero.concentration === 'string' && input.hero.concentration) context.concentration = input.hero.concentration;
  }
  if (Array.isArray(input.story?.sheet_state)) context.sheetCasters = input.story.sheet_state.filter((row) => Array.isArray(row?.spells));
  const validation = validateDmTurn(turn, input.entropy, context);
  const errors = validation.ok ? [] : [...validation.errors];
  const strangers = unrecordedSouls(turn, input.story?.cast || [], { hero: input.hero || null });
  if (strangers.length) errors.push(censusNote(strangers));
  // THE IDENTITY CEILING & THE PROP LAW (XVII, Articles II & IV) — the
  // cue's own courts, seated beside the validator at every door alike:
  // at most five identifiable subjects, and a named item rides the
  // frame only with its holder present, as a fixture of this ground,
  // or moved by this very turn's operations.
  const ceiling = cueCourt(turn.image_cue);
  if (!ceiling.ok) errors.push(...ceiling.violations);
  const props = propLawCheck(turn.image_cue, {
    trove: context.trove,
    fixtures: groundFixtures(context.fixtures || [], context.scene?.region || null),
    moved: movedItems(turn.story)
  });
  if (!props.ok) errors.push(...props.refusals);
  return { ok: errors.length === 0, errors };
}

// Mirrors the constraints enforced by fatescript/protocol#validateDmTurn.
// The tool schema is what the model actually sees, so any enum/shape the
// validator checks for must be declared here or the model has no way to
// know the exact values the client will accept.
const rollRequestSchema = {
  anyOf: [
    { type: 'null' },
    {
      type: 'object', additionalProperties: false,
      required: ['id','label','kind','die','ability','skill','proficient','dc','advantage','extra_mod','action_id','actor_id','target_id'],
      properties: {
        id: { type: 'string', maxLength: 80 },
        label: { type: 'string', maxLength: 120 },
        kind: { type: 'string', enum: ['check','save','attack','damage','death_save'] },
        die: { type: 'string', enum: ['d4','d6','d8','d10','d12','d20','d100'] },
        ability: { anyOf: [{ type: 'null' }, { type: 'string', enum: ['STR','DEX','CON','INT','WIS','CHA'] }] },
        skill: { anyOf: [{ type: 'null' }, { type: 'string', maxLength: 50 }] },
        proficient: { type: 'boolean' },
        dc: { anyOf: [{ type: 'null' }, { type: 'integer', minimum: 5, maximum: 30 }] },
        advantage: { type: 'string', enum: ['normal','advantage','disadvantage'] },
        extra_mod: { type: 'integer', minimum: -10, maximum: 20 },
        action_id: { anyOf: [{ type: 'null' }, { type: 'string', maxLength: 80 }] },
        actor_id: { type: 'string', maxLength: 80, description: "Whose die falls: 'hero', or a SHEETED companion's exact name — the table rolls only for the hero and the sheeted; the owner's die lands on the player's own device." },
        target_id: { anyOf: [{ type: 'null' }, { type: 'string', maxLength: 80 }] }
      }
    }
  ]
};
const cinematicSchema = {
  anyOf: [
    { type: 'null' },
    {
      type: 'object', additionalProperties: false,
      required: ['type','title','subtitle','palette'],
      properties: {
        type: { type: 'string', enum: ['chapter','boss_reveal','discovery','ominous','level_up','death','victory'] },
        title: { type: 'string', maxLength: 100 },
        subtitle: { type: 'string', maxLength: 180 },
        palette: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string', description: 'Hex color like #d4a24e.' } }
      }
    }
  ]
};
const combatSchema = {
  anyOf: [
    { type: 'null' },
    {
      type: 'object', additionalProperties: false,
      required: ['op','round_delta','enemy_add','enemy_update','enemy_remove','npc_actions'],
      properties: {
        op: { type: 'string', enum: ['start','update','end'] },
        round_delta: { type: 'integer', enum: [0,1] },
        enemy_add: { type: 'array', items: { type: 'object', required: ['id','name','hp','maxHp','ac','zone'], properties: { id: { type: 'string' }, name: { type: 'string' }, hp: { type: 'integer', minimum: 1, maximum: 999 }, maxHp: { type: 'integer', minimum: 1, maximum: 999 }, ac: { type: 'integer', minimum: 1, maximum: 30 }, zone: { type: 'string', enum: ['engaged','near','far'] } } } },
        enemy_update: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, hp_delta: { type: 'integer' }, zone: { anyOf: [{ type: 'null' }, { type: 'string', enum: ['engaged','near','far'] }] } } } },
        enemy_remove: { type: 'array', items: { type: 'string' } },
        npc_actions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['actor','action'], properties: {
          actor: { type: 'string', maxLength: 80, description: 'Exact enemy instance id or name. ONE action per living combatant per turn — a second action by the same actor is refused by name, and the downed and the fled do not act.' },
          action: { type: 'string', maxLength: 120 }
        } } },
        // THE BATTLE CUT (Directive X): declared because the strict validator
        // enforces these exact shapes — a schema the model cannot see is a trap.
        spawn: { anyOf: [ { type: 'null' }, { type: 'object', additionalProperties: false, required: ['species','count','names','zone'], properties: {
          species: { type: 'string', minLength: 3, maxLength: 60, description: 'A species the bestiary has SEALED via story.creature_add — this turn or before. Instances derive hit points and armor from the sealed threat rating; never invent stats for a sealed species.' },
          count: { type: 'integer', minimum: 1, maximum: 6 },
          names: { anyOf: [ { type: 'null' }, { type: 'array', maxItems: 6, items: { type: 'string', minLength: 2, maxLength: 60 } } ], description: 'Optional given names; unnamed instances take deterministic letters (Marsh Howler A, B, …). Spawn rides only op start.' },
          zone: { type: 'string', enum: ['engaged','near','far'] }
        } } ] },
        initiative: { anyOf: [ { type: 'null' }, { type: 'object', additionalProperties: false, required: ['device','entropy'], properties: {
          device: { type: 'array', minItems: 1, items: { type: 'string', maxLength: 80 }, description: 'The player side by exact name — the hero and every party companion. Their d20s fall on the player\'s own screen; never roll for them.' },
          entropy: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['group','index'], properties: {
            group: { type: 'string', maxLength: 80, description: 'Species name (pack initiative — one draw per species group) or the exact id of a lone added enemy.' },
            index: { type: 'integer', description: 'Index into this turn\'s entropy_use citing a d20 draw — every draw accounted.' }
          } } }
        }, description: 'REQUIRED when op is start, refused otherwise — the order is sealed once, as an operation. At most three enemy groups; the pool holds three d20s.' } ] }
      }
    }
  ]
};
const imageCueSchema = {
  anyOf: [
    { type: 'null' },
    { type: 'object', additionalProperties: false, required: ['kind','subjects'], properties: {
      kind: { type: 'string', enum: ['portrait','scene'] },
      subjects: { type: 'array', maxItems: 5, items: { type: 'string', minLength: 2, maxLength: 80, description: 'Exact cast or hero name, LIVING AND PRESENT at the scene — never a dead soul, never a soul the record holds elsewhere, never a name outside the record. FIRST NAME FIRST: the first subject is the principal figure of the composition. AT MOST FIVE identifiable subjects (the pinned reference budget) — stage a larger gathering with crowd background and framing, never a sixth likeness.' } },
      crowd: { type: 'string', enum: ['none','background'], description: 'Whether an indistinct, unidentifiable background crowd may fill the frame. Omitted or none, the frame is closed to all but the named subjects.' },
      items: { type: 'array', maxItems: 4, items: { type: 'string', minLength: 3, maxLength: 60 }, description: 'THE PROP LAW: named trove things due IN FRAME this plate — each lawful ONLY if its recorded holder stands among subjects, it is a fixture of the standing ground, or this very turn\u2019s operations moved it. Omit otherwise; an unlawful item is refused by name.' }
    } }
  ]
};
const dialogueCueSchema = {
  anyOf: [
    { type: 'null' },
    { type: 'object', additionalProperties: false, required: ['speaker','line'], properties: { speaker: { type: 'string', maxLength: 80, description: 'Exact living cast name. THE DEAD DO NOT SPEAK — a dead soul may have spoken final words only in the very turn it died, never after.' }, line: { type: 'string', maxLength: 180 } } }
  ]
};
const timeAdvanceSchema = {
  anyOf: [
    { type: 'null' },
    { type: 'object', additionalProperties: false, required: ['unit','n'], properties: { unit: { type: 'string', enum: ['hours','days'] }, n: { type: 'integer', minimum: 1, maximum: 30 } } }
  ]
};
// THE POSSESSIONS CUT (Directive VI): the four item/coin operations are
// declared structurally because the strict validator enforces their enums
// and bounds — a schema the model cannot see is a trap. Established story
// keys keep their reducer-side guardianship, so the object stays open.
const storySchema = {
  anyOf: [
    { type: 'null' },
    {
      type: 'object',
      properties: {
        item_add: { type: 'array', maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['name','kind','holder','note'], properties: {
          name: { type: 'string', minLength: 3, maxLength: 60 },
          kind: { type: 'string', enum: [...ITEM_KINDS] },
          holder: { type: 'string', maxLength: 60, description: 'Exact name of the soul now holding it.' },
          note: { anyOf: [{ type: 'null' }, { type: 'string', maxLength: 90 }] },
          enchant: { anyOf: [{ type: 'null' }, { type: 'string', enum: Object.keys(ENCHANT_TABLE) }], description: 'Born-enchanted: at most ONE rune, by table key, lawful only on the kinds its row seats. The table owns the numbers — never state them.' }
        } } },
        item_transfer: { type: 'array', maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['name','from','to'], properties: {
          name: { type: 'string', minLength: 3, maxLength: 60 },
          from: { type: 'string', maxLength: 60, description: 'The hand [STORY].trove_state currently shows holding it.' },
          to: { type: 'string', maxLength: 60 }
        } } },
        item_remove: { type: 'array', maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['name','holder','reason'], properties: {
          name: { type: 'string', minLength: 3, maxLength: 60 },
          holder: { type: 'string', maxLength: 60 },
          reason: { anyOf: [{ type: 'null' }, { type: 'string', maxLength: 90 }] }
        } } },
        purse: { type: 'array', maxItems: 2, items: { type: 'object', additionalProperties: false, required: ['holder','delta','reason'], properties: {
          holder: { type: 'string', maxLength: 60 },
          delta: { type: 'integer', minimum: -999, maximum: 999, description: 'Non-zero. Never spend below the [STORY].purse_state balance.' },
          reason: { type: 'string', minLength: 3, maxLength: 90 }
        } } },
        // THE QUIET TABLE (Directive XVII) — the thread ops, declared with
        // the validator's OWN enums and bounds: a schema the model cannot
        // see is a trap (the toolschema-validation lesson).
        thread_add: { type: 'array', maxItems: 2, items: { type: 'object', additionalProperties: false, required: ['label'], properties: {
          label: { type: 'string', minLength: 3, maxLength: 90, description: 'A hook the tale now owes — unique among open threads.' },
          kind: { type: 'string', enum: ['promise','debt','mystery','goal'] },
          holder: { anyOf: [{ type: 'null' }, { type: 'string', maxLength: 60 }], description: 'The soul this thread binds, when one does.' },
          rumor: { anyOf: [{ type: 'null' }, { type: 'string', maxLength: 200 }], description: 'When this thread opens FROM the horizon: the exact rumor text from [STORY].rumors_state — the pool rotates, the thread carries the citation.' }
        } } },
        thread_resolve: { type: 'array', maxItems: 2, items: { type: 'object', additionalProperties: false, required: ['label','outcome'], properties: {
          label: { type: 'string', maxLength: 90, description: 'An OPEN thread\'s exact label from [STORY].threads_state.' },
          outcome: { type: 'string', enum: ['kept','broken','resolved'] }
        } } },
        // THE OPEN ROAD (XIX, Articles IV–VII): the four new courts'
        // seats, declared with the validator's OWN enums (the toolschema-
        // validation lesson — a hidden seat is a trap, a mirrored enum is
        // a slower one).
        ambition_add: { type: 'array', maxItems: 1, items: { type: 'object', additionalProperties: false, required: ['text'], properties: {
          text: { type: 'string', minLength: 12, maxLength: 200, description: 'The player\'s declared ambition, BYTE-IDENTICAL to [STORY].declaration — never invented, never rewritten.' }
        } }, description: 'Seal the player\'s declared ambition the turn it is spoken — exactly when [STORY].declaration carries one, never otherwise.' },
        ambition_resolve: { type: 'array', maxItems: 2, items: { type: 'object', additionalProperties: false, required: ['text','outcome'], properties: {
          text: { type: 'string', maxLength: 200, description: 'An OPEN ambition\'s exact text from [STORY].open_ambitions.' },
          outcome: { type: 'string', enum: [...AMBITION_OUTCOMES], description: 'achieved: won in the fiction. renounced: the player let it go. lost: the world closed it.' }
        } } },
        clock_open: { type: 'array', maxItems: 2, items: { type: 'object', additionalProperties: false, required: ['label','segments'], properties: {
          label: { type: 'string', minLength: 3, maxLength: 90, description: 'The undertaking\'s name — unique among open clocks.' },
          segments: { type: 'integer', enum: [...CLOCK_SEGMENTS], description: '4 short, 6 standard, 8 long.' },
          ambition: { anyOf: [{ type: 'null' }, { type: 'string', maxLength: 200 }], description: 'The open ambition this clock serves — its exact text, when it serves one.' }
        } } },
        clock_tick: { type: 'array', maxItems: 2, items: { type: 'object', additionalProperties: false, required: ['label','reason'], properties: {
          label: { type: 'string', maxLength: 90, description: 'An OPEN clock\'s exact label from [STORY].open_clocks.' },
          reason: { type: 'string', minLength: 3, maxLength: 160, description: 'What this turn concretely did to advance it.' }
        } }, description: 'ONE segment per tick, with its stated reason. AT MOST TWO clock operations a turn, all kinds together; never tick past full.' },
        clock_resolve: { type: 'array', maxItems: 2, items: { type: 'object', additionalProperties: false, required: ['label','outcome'], properties: {
          label: { type: 'string', maxLength: 90, description: 'An OPEN clock\'s exact label.' },
          outcome: { type: 'string', enum: [...CLOCK_OUTCOMES], description: 'struck: it came to pass. averted: turned aside. lapsed: the moment quietly passed.' }
        } }, description: 'A clock [STORY].open_clocks shows FILLED must resolve THIS turn.' },
        standing_shift: { type: 'array', maxItems: 2, items: { type: 'object', additionalProperties: false, required: ['faction','delta','reason'], properties: {
          faction: { type: 'string', minLength: 3, maxLength: 80, description: 'The faction whose regard truly moved this turn.' },
          delta: { type: 'integer', enum: [...STANDING_DELTAS] },
          reason: { type: 'string', minLength: 3, maxLength: 160, description: 'The concrete event that moved it — this turn\'s own.' }
        } }, description: 'Factions remember. The client sums the sealed shifts; never state a standing number in prose.' },
        spine_amend: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, required: ['act','beat','reason'], properties: {
          act: { type: 'integer', minimum: 1, maximum: 3 },
          beat: { type: 'string', maxLength: 120, description: 'The NOT-YET-REACHED beat\'s exact title.' },
          title: { anyOf: [{ type: 'null' }, { type: 'string', maxLength: 100 }], description: 'The reshaped title, when the bend renames it.' },
          goal: { anyOf: [{ type: 'null' }, { type: 'string', maxLength: 300 }], description: 'The reshaped goal, when the bend redirects it.' },
          reason: { type: 'string', minLength: 12, maxLength: 200, description: 'Why the played tale demands this bend.' }
        } } ], description: 'The one lawful bend: reshape a FUTURE beat\'s title or goal when the player\'s choices have outrun the spine. One a turn, one per act, never the beat you stand on nor any behind you.' },
        // THE NEW GROUND (VIII + the toolschema-validation lesson): the
        // validator's same-breath teach and the fold both read story.world,
        // yet the schema never held the seat — three descriptions pointed
        // at world.region_add while the model had no lawful way to emit it
        // (the Thistlewick refusals, iter 63.3: two sealed sittings taught
        // new ground at a seat the schema hid, and the door fell to the
        // floor). Declared now with the fold's OWN tolerances; the state
        // enum imports from the one seat (fatescript/story), never a mirror.
        world: { anyOf: [ { type: 'null' }, { type: 'object', additionalProperties: false, properties: {
          blight_delta: { anyOf: [ { type: 'null' }, { type: 'integer', minimum: -5, maximum: 5 } ], description: 'How far the blight moves this turn; the fold clamps the standing value 0..5.' },
          region_add: { anyOf: [ { type: 'null' }, { type: 'object', additionalProperties: false, required: ['name','visual'], properties: {
            name: { type: 'string', minLength: 3, maxLength: 100, description: 'The new region\'s name — sealed once; this same turn\'s scene_set, fixture_add.place, and party_leave.remains_at may stand on it.' },
            visual: { type: 'string', minLength: 10, maxLength: 360, description: 'The ground\'s standing look — the painter reads this clause wherever scenes stand here. Every region carries one.' }
          } } ], description: 'Create NEW ground the record will hold from this turn on. The atlas refuses scene_set/fixture_add naming regions the record does not hold — teach the region in this same breath, or stand on standing ground.' },
          region_update: { anyOf: [ { type: 'null' }, { type: 'object', additionalProperties: false, required: ['name','state'], properties: {
            name: { type: 'string', minLength: 3, maxLength: 100, description: 'A region the record holds — exact name.' },
            state: { type: 'string', enum: [...REGION_STATES], description: 'The region\'s new standing state — the fold ignores states outside its own table.' }
          } } ] }
        } } ], description: 'The world\'s own turn: blight movement, new ground, a region\'s state turning. Null when the world stands unchanged.' },
        // THE PRESENCE CUT (Directive VII): declared because the strict
        // validator enforces the shape — a schema the model cannot see is
        // a trap. Exactly one key, and never an array.
        scene_set: { anyOf: [ { type: 'null' }, { type: 'object', additionalProperties: false, required: ['region'], properties: {
          region: { type: 'string', minLength: 3, maxLength: 100, description: 'The region the scene now stands in — one the record already holds, or one created by this same turn\'s world.region_add. A change of ground must ride with time_advance in the same turn.' }
        } } ] },
        // THE PARTY AND THE ELSEWHERE (Directive VIII): declared because
        // the strict validator enforces these exact shapes — a schema the
        // model cannot see is a trap. Each is a single object, never an
        // array.
        party_join: { anyOf: [ { type: 'null' }, { type: 'object', additionalProperties: false, required: ['name'], properties: {
          name: { type: 'string', minLength: 2, maxLength: 80, description: 'A living cast soul whose last lawful ground is the current scene, or one introduced by this same turn\'s cast_add. The party travels as one when the scene moves. The hero is never joined — the party is hers already.' }
        } } ] },
        party_leave: { anyOf: [ { type: 'null' }, { type: 'object', additionalProperties: false, required: ['name'], properties: {
          name: { type: 'string', minLength: 2, maxLength: 80, description: 'A current party member, released from the party. The hero is never left.' },
          remains_at: { anyOf: [ { type: 'null' }, { type: 'string', minLength: 3, maxLength: 100 } ], description: 'The region where the departing soul remains — one the record holds, or one created by this same turn\'s world.region_add. Omitted, the soul remains at the current scene.' }
        } } ] },
        fixture_add: { anyOf: [ { type: 'null' }, { type: 'object', additionalProperties: false, required: ['place','name','visual'], properties: {
          place: { type: 'string', minLength: 3, maxLength: 100, description: 'The region this fixture stands in — one the record holds, or one created by this same turn\'s world.region_add.' },
          name: { type: 'string', minLength: 3, maxLength: 60 },
          visual: { type: 'string', minLength: 8, maxLength: 160, description: 'The fixture\'s paintable visual truth. Fixture canon seals once — written once, never rewritten, and the painter reads it forever.' }
        } } ] },
        // THE BATTLE CUT (Directive X, Law I): declared because the strict
        // validator enforces this exact shape — a single object, never an
        // array, and the seal is once.
        creature_add: { anyOf: [ { type: 'null' }, { type: 'object', additionalProperties: false, required: ['species','visual','nature','threat'], properties: {
          species: { type: 'string', minLength: 3, maxLength: 60, description: 'Species canon seals ONCE — written once, never rewritten; a duplicate of [STORY].bestiary_state is refused by name.' },
          visual: { type: 'string', minLength: 8, maxLength: 160, description: 'The species\' paintable visual truth — the painter reads it forever.' },
          nature: { type: 'string', minLength: 3, maxLength: 90, description: 'How the species behaves — hunts, guards, flees.' },
          threat: { type: 'integer', minimum: 1, maximum: 5, description: 'Fixes every instance\'s hit points and armor through the table\'s threat law; never state enemy stats yourself.' },
          spells: { anyOf: [ { type: 'null' }, { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string', enum: Object.keys(SPELL_TABLE) } } ], description: 'OPTIONAL species spellbook — at most four grimoire keys, sealed once with the card. Only a card carrying its list may ever cast; a bookless species never does.' }
        } } ] },
        sheet_grant: { anyOf: [ { type: 'null' }, { type: 'object', additionalProperties: false, required: ['name','role','level'], properties: {
          name: { type: 'string', minLength: 2, maxLength: 60, description: "A STANDING party member's exact name (party_state; a soul joining this same turn counts). Sheets seal once — a duplicate is refused by name." },
          role: { type: 'string', enum: ['guardian','skirmisher','mender','trickster'], description: 'THE ROLE TABLE fixes the ability spread and hit points in code — never state sheet numbers yourself.' },
          level: { type: 'integer', minimum: 1, maximum: 5, description: 'hp = band + (level − 1) × growth, by the role table in code. The client seats the sheet at the hero\'s standing level — the road overrules this number.' }
        } } ] },
        // THE CONDITION LAW (Directive XII §II): declared because the strict
        // validator enforces the enum and bounds — a schema the model cannot
        // see is a trap (the toolschema-validation lesson).
        sheet_condition: { anyOf: [ { type: 'null' }, { type: 'object', additionalProperties: false, required: ['name'], properties: {
          name: { type: 'string', minLength: 2, maxLength: 60, description: 'A SHEETED companion — a name [STORY].sheet_state lists (a sheet granted this same turn counts).' },
          add: { type: 'array', maxItems: 2, items: { type: 'string', enum: ['poisoned','frightened','restrained','stunned','paralyzed','unconscious','blinded','prone'] }, description: 'Conditions landing this turn — at most 2, exact SRD names only.' },
          remove: { type: 'array', maxItems: 2, items: { type: 'string', enum: ['poisoned','frightened','restrained','stunned','paralyzed','unconscious','blinded','prone'] }, description: 'Conditions lifting this turn — at most 2, only ones sheet_state shows standing.' }
        } } ], description: 'Move conditions on a sheeted companion — add and/or remove, at least one named. Refused on offscreen ticks.' },
        // THE EQUIPPED LAW (Directive XII §III): one mark a turn, weapon or
        // tool, a thing trove_state already places in that hand.
        item_equip: { anyOf: [ { type: 'null' }, { type: 'object', additionalProperties: false, required: ['name','holder'], properties: {
          name: { type: 'string', minLength: 3, maxLength: 60, description: 'A weapon, tool, or armor [STORY].trove_state already places in the holder\'s hand — never a thing added this same turn.' },
          holder: { type: 'string', minLength: 1, maxLength: 60, description: 'The soul whose hand readies or body wears it. A new mark unseats only its own class.' }
        } } ], description: 'Mark ONE held thing at the ready or worn — at most one weapon or tool in hand, one worn suit, one shield (XVIII: the worn law). trove_state speaks equipped: true while the mark stands.' },
        // THE ENCHANT LAW (XVIII, Article II): declared with the table's
        // OWN keys — a schema the model cannot see is a trap, and the
        // enum imports from the one seat (never a mirror).
        item_enchant: { anyOf: [ { type: 'null' }, { type: 'object', additionalProperties: false, required: ['name','holder','enchant'], properties: {
          name: { type: 'string', minLength: 3, maxLength: 60, description: 'A held thing [STORY].trove_state places in the holder\'s hand — never a thing added this same turn (born-enchanted things use item_add.enchant).' },
          holder: { type: 'string', minLength: 1, maxLength: 60 },
          enchant: { type: 'string', enum: Object.keys(ENCHANT_TABLE), description: 'The rune\'s table key alone. One rune per notable thing, ever; the table owns the numbers.' }
        } } ], description: 'Lay ONE rune on a held thing, by table key. The door refuses unknown keys, second runes, and unlawful seats.' },
        // THE CASTING (XVIII, Article V): one op, judged at the door by
        // the grimoire's own keys — the enum imports from the one seat.
        cast_spell: { anyOf: [ { type: 'null' }, { type: 'object', additionalProperties: false, required: ['caster','spell'], properties: {
          caster: { type: 'string', minLength: 2, maxLength: 80, description: 'The hero, a sheeted companion whose craft sheet_state shows, or a standing combatant whose species card carries the spell.' },
          spell: { type: 'string', enum: Object.keys(SPELL_TABLE), description: 'A grimoire key the caster has LEARNED — hero: the caster line in [STATE]; companion: sheet_state.spells; enemy: the species card.' },
          target: { anyOf: [ { type: 'null' }, { type: 'string', minLength: 2, maxLength: 80 } ], description: 'The named soul or foe the spell lands on, when it lands on one — a name the record counts, never the sealed dead.' },
          release: { anyOf: [ { type: 'null' }, { type: 'boolean', enum: [true] } ], description: 'Exactly true, and ONLY to let a held concentration fall as this cast takes the thread; the release seals its note in the ledger.' }
        } } ], description: 'ONE cast this turn. Spends exactly one slot of the spell\'s own level (cantrips slotless; the warlock\'s tank spends a charge). A cast IS the actor\'s action — never also move that actor through npc_actions. Resolution rides the standing lanes: roll_request for player-side dice, [ENTROPY] accounted in entropy_use for enemy dice, damage/heal/condition ops carrying the row\'s numbers.' }
      }
    }
  ]
};

const toolSchema = {
  type: 'object', additionalProperties: false,
  required: ['narration_blocks','suggestions','roll_request','state_updates','combat','cinematic','story','image_cue','dialogue_cue','time_advance','entropy_use'],
  properties: {
    narration_blocks: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'object', additionalProperties: false, required: ['text','speaker'], properties: { text: { type: 'string', maxLength: 1200 }, speaker: { anyOf: [{ type: 'string', maxLength: 80 }, { type: 'null' }], description: 'Exact cast name for a dialogue block; null for description. THE DEAD DO NOT SPEAK — never attribute dialogue to a cast member whose status is dead.' } } } },
    suggestions: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string', maxLength: 60, description: 'At most 6 words.' } },
    // THE REST LAW (XVIII, Article III): rest is declared with the
    // validator's own enum (the toolschema-validation lesson); the
    // object stays open — established keys keep reducer guardianship.
    roll_request: rollRequestSchema, state_updates: { anyOf: [{ type: 'null' }, { type: 'object', properties: { rest: { anyOf: [{ type: 'null' }, { type: 'string', enum: ['long'] }], description: 'A LONG rest: the client restores hit points and every spell slot from the tables. Lawful ONCE per calendar day of world time; ride time_advance with the night. Short rests are flavor — no mechanics.' } } }] },
    combat: combatSchema, cinematic: cinematicSchema,
    story: storySchema, image_cue: imageCueSchema,
    dialogue_cue: dialogueCueSchema, time_advance: timeAdvanceSchema,
    entropy_use: { type: 'array', items: { type: 'object', required: ['index','die','purpose'], properties: { index: { type: 'integer' }, die: { type: 'string' }, purpose: { type: 'string' } } } }
  }
};

// ---- v2 turn engine: memory, cache, and a real stream ---------
// The system prompt is static per campaign (cache_control holds).
// The conversation history carries the DM's own prior narration,
// with a cache breakpoint on the last stable message so the
// prefix caches incrementally. Only the final user message
// changes per turn.

// THE VERDICT (Task 54 §6, audition of July 20, 2026 — see
// docs/dm-model-audition.md): claude-sonnet-5 held the whole contract
// (4/4 post-repair valid, zero fallback turns — even with the baseline)
// at lower cost and roughly half the latency of claude-sonnet-4-6.
// Both haiku ids and sonnet-4-5 dropped turns to fallback and are
// rejected. DM_MODEL still overrides.
const MODEL = () => process.env.DM_MODEL || 'claude-sonnet-5';
// THE GENESIS SEAT (Task 54): Session Zero is the single most demanding
// structural turn (arc + villain + region + gear + chapter cinematic +
// beat 1, all in one seal), so its default is pinned EXPLICITLY to the
// strong model — it does not follow a cheaper DM_MODEL override down.
const GENESIS_MODEL = () => process.env.DM_MODEL_GENESIS || 'claude-sonnet-5';

// THE CACHE'S CANDLE (Task 54 §3): players read and listen between
// turns, often past Anthropic's 5-minute default, so the breakpoints
// default to the 1-hour candle (DM_CACHE_TTL=5m restores the short
// one). Segments under the provider's minimum cacheable size simply
// pass through uncached — no law here minds.
const CACHE_TTL = () => (String(process.env.DM_CACHE_TTL || '1h') === '5m' ? '5m' : '1h');
const cacheMark = () => ({ type: 'ephemeral', ttl: CACHE_TTL() });

function dynamicBlocks(input) {
  return `[STATE]\n${JSON.stringify(input.state)}\n[STORY]\n${JSON.stringify(input.story)}\n[MEMORY]\n${JSON.stringify(input.memory || [])}\n[ENTROPY]\n${JSON.stringify(input.entropy)}\n${input.resolution ? `[RESOLUTION]\n${JSON.stringify(input.resolution)}\n` : ''}[PLAYER]\n${input.player}`;
}

function shapeMessages(input) {
  // THE ANCHORED WINDOW (Task 54 §2): the server judges messages with
  // the shared law's doubled floor/step. Its floor equals the client's
  // widest lawful send, so a lawful client window passes whole — the
  // server never trims below the client's ceiling, and between
  // re-anchors one turn's shaped history is a byte-for-byte prefix of
  // the next turn's.
  const history = anchoredWindow(
    (Array.isArray(input.history) ? input.history : [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim()),
    { floor: HISTORY_FLOOR_MESSAGES, step: HISTORY_STEP_MESSAGES },
  ).map((m) => ({ role: m.role, content: [{ type: 'text', text: m.content.slice(0, 6000) }] }));
  // The breakpoint rides the last STABLE history message — the final
  // user message below carries every dynamic block and is never cached.
  if (history.length) history[history.length - 1].content[0].cache_control = cacheMark();
  return [...history, { role: 'user', content: [{ type: 'text', text: dynamicBlocks(input) }] }];
}

function shapeRequest(input) {
  return {
    model: input.genesis ? GENESIS_MODEL() : MODEL(),
    // THE MEASURE LAW (Directive XI, Law V): the ceiling rises so a rich
    // beat's 6-8 paragraphs are possible; the measure directs richness,
    // the Editor's courts keep it honest.
    max_tokens: 3200,
    system: [{ type: 'text', text: buildSystemPrompt(input), cache_control: cacheMark() }],
    messages: shapeMessages(input),
    tools: [{ name: 'dm_turn', description: 'The only valid Dungeon Master response.', input_schema: toolSchema }],
    tool_choice: { type: 'tool', name: 'dm_turn' }
  };
}

// The eval bench and the keyed audition harness read the shaped request
// through this seam — the exact bytes the door would send, never a mirror.
export { shapeRequest as shapeDmRequest };

const anthropicHeaders = () => ({
  'x-api-key': process.env.ANTHROPIC_API_KEY,
  'anthropic-version': '2023-06-01',
  'content-type': 'application/json',
  // The 1-hour candle rides a beta flag; the 5-minute default does not.
  ...(CACHE_TTL() === '1h' ? { 'anthropic-beta': 'extended-cache-ttl-2025-04-11' } : {}),
});

// When a previous attempt was schema-valid per Anthropic but rejected by the
// stricter client validator, `repair` carries that turn plus the exact
// violations so the model can correct itself instead of falling back to
// generic narration. This tightens reliability without loosening the validator.
async function anthropicTurn(input, repair = null) {
  const request = shapeRequest(input);
  if (repair) {
    request.messages = [
      ...request.messages,
      { role: 'assistant', content: [{ type: 'tool_use', id: 'dm_turn_repair', name: 'dm_turn', input: repair.turn }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'dm_turn_repair', is_error: true, content: `The rules client REJECTED that dm_turn. Every field is still required; keep everything that was correct and fix ONLY these violations, then resend the complete corrected dm_turn:\n- ${repair.errors.join('\n- ')}` }] }
    ];
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: anthropicHeaders(), body: JSON.stringify(request)
  });
  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${await response.text()}`);
  const json = await response.json();
  // Task 54 §1 — the usage block is never discarded again: every call
  // (repairs included) tallies its tokens and cache reads/writes in the
  // watchtower's day-ledger. Telemetry only; never a ceiling, never a throw.
  try { recordTokens('anthropic', request.model, json.usage); } catch { /* the tale never dies of its bookkeeping */ }
  return json.content?.find((item) => item.type === 'tool_use' && item.name === 'dm_turn')?.input;
}

// THE CURTAIN (Directive XI, Law I): the pre-seal stream is gone whole —
// the partial-JSON narration walker and the streaming first call retired
// with the door events they fed. No word leaves before the seal.

// OpenAI fallback for the DM: same tool schema, system prompt, and strict
// client validator as Anthropic, so a fallback turn is held to the identical
// contract. Used only when Anthropic errors/fails validation twice. Anthropic
// message blocks are flattened to plain strings for the chat API.
async function openaiTurn(input, repair = null) {
  const messages = [
    { role: 'system', content: buildSystemPrompt(input) },
    ...shapeMessages(input).map((m) => ({ role: m.role, content: m.content.map((c) => c.text).join('\n') }))
  ];
  if (repair) {
    messages.push({ role: 'assistant', content: `Previous dm_turn attempt:\n${JSON.stringify(repair.turn)}` });
    messages.push({ role: 'user', content: `The rules client REJECTED that dm_turn. Keep everything that was correct and fix ONLY these violations, then resend the COMPLETE corrected dm_turn via the dm_turn tool:\n- ${repair.errors.join('\n- ')}` });
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.DM_MODEL_OPENAI || 'gpt-4o',
      // THE MEASURE LAW (Directive XI, Law V): risen with Anthropic's.
      max_tokens: 3400,
      messages,
      tools: [{ type: 'function', function: { name: 'dm_turn', description: 'The only valid Dungeon Master response.', parameters: toolSchema } }],
      tool_choice: { type: 'function', function: { name: 'dm_turn' } }
    })
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  const json = await response.json();
  const call = json.choices?.[0]?.message?.tool_calls?.find((t) => t.function?.name === 'dm_turn');
  if (!call) throw new Error('OpenAI returned no dm_turn tool call');
  return JSON.parse(call.function.arguments);
}

/**
 * The DM's provider plan: which artisans may tell this turn, in order, with
 * mock as the guaranteed floor. `barred` is the watchtower's word — a
 * provider whose daily spend ceiling is reached is struck from the plan
 * INDIVIDUALLY, so a spent Anthropic day degrades to OpenAI (if configured
 * and unspent) before the floor, and a spent provider is never called.
 */
// THE QUIET TABLE (XVII) — the schema is probe-able: the lockstep gate
// walks these enums against the validator's own law, so the two can
// never drift apart unseen.
export const dmToolSchema = toolSchema;

export function dmPlan(barred = {}) {
  if (process.env.DM_PROVIDER === 'mock') return ['mock'];
  const plan = [];
  if (process.env.ANTHROPIC_API_KEY && !barred.anthropic) plan.push('anthropic');
  if (process.env.OPENAI_API_KEY && process.env.DM_FALLBACK !== 'off' && !barred.openai) plan.push('openai');
  plan.push('mock');
  return plan;
}

export async function getDmTurn(input, { barred = {} } = {}) {
  const plan = dmPlan(barred);
  const useMock = plan[0] === 'mock';

  if (useMock) {
    try {
      // LAW IX — the Art Director sits between the draft and the ONE
      // validator, at every door alike: the merged cue is judged in
      // the same seal as the rest of the turn.
      const turn = artDirectorSits(bornAtZero(mockDmTurn(input)));
      const validation = judgeTurn(turn, input);
      if (!validation.ok) throw new Error(`Invalid DM turn: ${validation.errors.join('; ')}`);
      return { turn, provider: 'mock' };
    } catch (error) {
      console.error(error);
      return { turn: bornAtZero(safeFallbackTurn(input.player, input.turn)), provider: 'fallback', error: error.message };
    }
  }

  // THE CURTAIN (Directive XI, Law I): both attempts are plain sealed
  // calls — the second a self-repair guided by the exact validator errors
  // from the first. No word leaves this function before the turn is
  // sealed, so a repair has nothing it could ever need to retract.
  // Network/API errors get a plain retry.
  let lastError = new Error('no DM provider was allowed to speak');
  let repair = null;
  for (let attempt = 0; plan.includes('anthropic') && attempt < 2; attempt += 1) {
    try {
      const turn = artDirectorSits(await anthropicTurn(input, repair));
      const validation = judgeTurn(turn, input);
      if (validation.ok) return { turn, provider: 'anthropic', repaired: attempt > 0 };
      lastError = new Error(`Invalid DM turn: ${validation.errors.join('; ')}`);
      repair = { turn, errors: validation.errors };
    } catch (error) {
      lastError = error;
      repair = null;
    }
  }

  // Anthropic spent, barred, or exhausted — try OpenAI before the floor.
  if (plan.includes('openai')) {
    let repairO = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const turn = artDirectorSits(await openaiTurn(input, repairO));
        const validation = judgeTurn(turn, input);
        if (validation.ok) return { turn, provider: 'openai', repaired: attempt > 0, fellBackFrom: 'anthropic' };
        lastError = new Error(`Invalid DM turn (openai): ${validation.errors.join('; ')}`);
        repairO = { turn, errors: validation.errors };
      } catch (error) {
        lastError = error;
        repairO = null;
      }
    }
  }

  console.error(lastError);
  return { turn: safeFallbackTurn(input.player, input.turn), provider: 'fallback', error: lastError.message };
}
