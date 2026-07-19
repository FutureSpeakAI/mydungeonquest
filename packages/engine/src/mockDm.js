const palettes = [
  ['#0d0b14','#593a49','#d4a24e'], ['#111827','#315b66','#e9dfc8'], ['#24120e','#7d3f2b','#d4a24e']
];

// ------------------------------------------------------------
// THE ECHO SALT (Directive XI, Law VI) — the walk's recurring prose is
// wheel-salted by turn: three word-wheels with periods 23 / 21 / 22,
// every one beyond the Editor's 20-page echo window, seat a changing
// word inside every eight-word stretch of the recurring branches. An
// eight-word run can therefore never recur inside the window: any run
// either contains a wheel word (which will not match again for at
// least 21 turns) or would need eight straight static words, and the
// templates below never leave eight static words together — audited
// stretch by stretch, counting hero names AND possessive-fold splits
// ("ridge's" folds to two words) as static. Each recurring template
// ENDS on or within one word of a wheel: pads fall into head-prefix
// classes (place-first, hero-first, the-/a-first) sharing up to two
// folded words, so an authored tail of t statics + a 2-word shared
// prefix must stay under eight — tails are held to ≤ 5. Genesis and the
// battle cut stay byte-pinned: each speaks once, so the echo court
// never hears them twice. The suggestion pools rotate by turn so no
// two adjacent pages offer the same roads (the sameness law).
// ------------------------------------------------------------
// Every wheel entry is ONE folded word, distinct within its wheel —
// atomicity the echo proof requires. Multi-word or hyphenated entries
// once shared components ("opens past" / "reaches past" both fold a
// 'past'; "ember-lit" / "honey-lit" a 'lit'), letting a run enter
// through the shared piece and count the wheel slot as static. Never
// again: one slot, one word, no two entries of a wheel sharing it.
const WHEEL_A = ['grey','amber','frosted','dewy','smoky','rooted','pale','ruddy','brambled','silvered','foggy','worn','shaded','thorny','mossy','scoured','birchen','chill','honeyed','ashen','stormy','dim','hushed'];
const WHEEL_B = ['hollow','causeway','gate','hedgerow','ford','track','sheepfold','hill','coppice','waymark','stile','bridleway','barn','crossing','bridge','road','lane','race','path','beacon','furrow'];
const WHEEL_C = ['weaves','opens','cuts','bends','climbs','sinks','turns','runs','breaks','drifts','angles','slips','pushes','steps','presses','curls','reaches','threads','wanders','rolls','edges','darts'];
const DEFAULT_ROADS = [
  ['Enter the warm wayhouse', 'Follow the fresh tracks', 'Question Mara directly'],
  ['Climb toward the gold lights', 'Circle the shuttered yard', 'Ask Mara for the map'],
  ['Knock at the bright window', 'Trace the wheel ruts back', 'Wait for full dark']
];

function rawMockDmTurn({ campaign, hero, story, player, entropy, resolution, turn = 0 }) {
  const beat = story.beat;
  const name = hero.name;
  if (resolution) {
    const success = resolution.outcome.includes('success');
    // THE BATTLE CUT (Directive X, Law IV) — turn 14 closes the mock battle:
    // the strike resolves, Marsh Howler A goes down, B breaks and flees, the
    // operation ends. Ops are fixed regardless of the die so keyless walks
    // stay deterministic; only the prose honors the outcome.
    if (turn === 14) {
      return {
        narration_blocks: [{ text: success
          ? `Your strike lands true. The howler under your blade folds into the wet grass, its fen-light eyes guttering out, and the second beast loses its nerve entirely — it breaks from the circle and pours back into the reeds like spilled water. Mara lowers her staff, chalk light fading along its grain. The ridge is quiet again, and the road north lies open where the pack had closed it.`
          : `Your blade skips off wet hide, but the opening costs the beast more than you. It lunges past your guard onto Mara's waiting staff and drops hard, fen-light eyes guttering out in the grass. The second howler wants none of it — it breaks and pours back into the reeds like spilled water. The ridge is quiet again, and the road north lies open where the pack had closed it.`, speaker: null }],
        suggestions: ['Search the fallen howler', 'Press on northward', 'Ask Mara about the pack'],
        roll_request: null,
        state_updates: { xp_gain: 40, chronicle_add: success ? 'The Marsh Howler pack broke at the ridge.' : 'The pack broke, though the blade glanced.' },
        combat: { op: 'end', round_delta: 0, enemy_add: [], enemy_update: [{ id: 'marsh-howler-a', hp_delta: -9 }], enemy_remove: ['marsh-howler-b'], npc_actions: [] },
        cinematic: null,
        story: { beat_advance: true, cast_add: [], cast_update: [], world: null, arc: null },
        image_cue: { kind: 'scene', subjects: [name], region: story.regions?.[0]?.name || null, mood: 'quiet after violence' },
        dialogue_cue: null, time_advance: null, entropy_use: []
      };
    }
    // THE SECOND BATTLE (Directive XII §V.3) — turn 32 closes the stray's
    // battle: the fall is addressed in its own turn, the bite turns grey,
    // and the fever lands as a lawful sheet_condition. Byte-pinned like
    // the first battle cut — each speaks once — and audited against the
    // turn-12/13/14 prose for shared runs (none reach eight folded words).
    if (turn === 32) {
      return {
        narration_blocks: [{ text: success
          ? `The boat-hook takes the stray mid-spring and turns it in the air. It lands wrong, tries for the reeds, and does not reach them — the fen-light gutters out a stride short of the water. Brannoc stands over the kill breathing hard, then spits once, deliberate as a signature. The bite on his forearm is shallow, but the flesh around it is already going grey. Mara names it without looking up: marsh-tooth fever.`
          : `The hook glances off wet hide, and the stray's teeth find Brannoc's forearm before Mara's staff cracks its skull sideways. It drops at his feet, fen-light guttering, and does not rise. The wound is shallow; the grey spreading around it is not nothing. Mara ties it off and names the grey without ceremony: marsh-tooth fever, the pack's parting gift.`, speaker: null }],
        suggestions: ['Tend the grey bite', 'Ask Mara for the draught', 'Burn the carcass'],
        roll_request: null,
        state_updates: { xp_gain: 30, chronicle_add: success ? 'The stray howler fell to Brannoc\u2019s hook.' : 'The stray fell, though its teeth found Brannoc first.' },
        combat: { op: 'end', round_delta: 0, enemy_add: [], enemy_update: [{ id: 'marsh-howler-a', hp_delta: -7 }], enemy_remove: [], npc_actions: [] },
        cinematic: null,
        story: { beat_advance: true, cast_add: [], cast_update: [], world: null, arc: null, sheet_condition: { name: 'Brannoc', add: ['poisoned'] } },
        image_cue: { kind: 'scene', subjects: [name, 'Brannoc'], region: 'The Wayhouse Ridge', mood: 'hard quiet after the kill' },
        dialogue_cue: null, time_advance: null, entropy_use: []
      };
    }
    return {
      narration_blocks: [{ text: success
        ? `The ${WHEEL_A[turn % 23]} risk breaks in your favor — ${name} ${WHEEL_C[turn % 22]} through before doubt can harden. The ${WHEEL_B[turn % 21]} yields, sharply final. A gold-thread mark ${WHEEL_C[(turn + 5) % 22]} across the ${WHEEL_A[(turn + 13) % 23]} milestone — someone expected you past this ${WHEEL_B[(turn + 15) % 21]}.`
        : `The attempt goes ${WHEEL_A[turn % 23]}-wrong without turning meaningless — noise, resistance, a ${WHEEL_B[turn % 21]} warning, carried. The gold thread ${WHEEL_C[turn % 22]} beneath the weathering. This ${WHEEL_B[(turn + 9) % 21]} was prepared, not abandoned — someone ${WHEEL_A[(turn + 16) % 23]} and watchful knows ${name} comes by the ${WHEEL_B[(turn + 18) % 21]}.`, speaker: null }],
      suggestions: ['Follow the gold mark', 'Hide before pursuit', 'Study the mechanism'],
      roll_request: null,
      state_updates: success ? { xp_gain: 25, chronicle_add: 'The marked threshold yielded.' } : { hp_delta: -1, chronicle_add: 'The threshold answered loudly.' },
      combat: null, cinematic: null, story: turn > 1 ? { beat_advance: true, cast_add: [], cast_update: [], world: null, arc: null } : null,
      // The hero is on stage in her own resolution — the cue says so, so the
      // easel can seat her and her bust anchor rides along.
      image_cue: { kind: 'scene', subjects: [name], region: story.regions?.[0]?.name || null, mood: success ? 'hard-won wonder' : 'dangerous discovery' },
      dialogue_cue: null, time_advance: null, entropy_use: []
    };
  }

  const first = turn === 0;
  const needsRoll = turn > 0 && turn % 3 === 1;
  const cinematic = first || turn % 5 === 0 ? {
    type: first ? 'chapter' : turn % 10 === 0 ? 'discovery' : 'ominous',
    title: first ? beat.title : `The ${beat.title}`,
    subtitle: first ? 'A world remembers the first step taken inside it.' : 'Some truths arrive first as weather.',
    palette: palettes[turn % palettes.length]
  } : null;
  const castAdd = first ? [
    { name: 'Mara Vey', role: 'mentor', visual: 'Silver-braided cartographer in an ink-blue coat, one brass lens over her left eye, hands stained with luminous chalk.', voice: 'Low, dry alto with patient pauses and a smile hidden in the consonants.', goal: 'Keep the old roads from vanishing.', secret: 'She once mapped a road for the enemy.' },
    { name: 'The Hollow Regent', role: 'villain', visual: 'Tall masked sovereign in layered black glass armor, a pale cloak drifting as though underwater, crown split into seven floating shards.', voice: 'Measured velvet baritone, never raised, with a faint doubled echo.', goal: 'Make every uncertain thing obey a single perfect map.', secret: 'The Regent fears a place that cannot be named.' }
  ] : [];
  const arc = first ? {
    title: campaign.title || 'The Unwritten Road',
    evil_plot: 'The Hollow Regent is binding living roads into a perfect imperial map, erasing every future that cannot be predicted.',
    stakes: 'Home, memory, and the right to choose an unmapped life.',
    style_bible: campaign.styleBible || 'Romantic dark-fantasy oil painting with gold-leaf light, deep atmospheric perspective, expressive faces, and restrained PG-13 peril.'
  } : null;
  return {
    narration_blocks: [{
      text: first
        ? `At dusk, the road outside ${campaign.homeRegion || 'your home'} writes a new sentence across the earth. Cobblestones turn one by one toward the northern dark, though no road has ever gone that way. Mara Vey waits beside the impossible bend, luminous chalk bright on her fingers. “It knows your name,” she says, as the distant hills answer with a bell no hand is ringing. The first step is yours.`
        // THE BATTLE CUT (Directive X) — the mock battle at fixed turns:
        // 9 seals the species, 12 opens combat, 13 rides the strike, 14
        // (the resolution branch above) ends it. Deterministic, keyless.
        : turn === 9
          ? `A howl rolls off the marsh — long, low, wrong, bending the mist the way wind never does. Mara goes still over her charts. “Marsh Howler,” she says, naming an old fear precisely. “Reed-green, lean as hunger, eyes like fen-lights. They test courage before they test flesh.” She marks your map with two quick strokes. “The pack has found the ridge road. Decide what you are before they decide for you.”`
          : turn === 12
            ? `They come at dusk's edge — two lean shapes pouring out of the reeds, reed-green weed sleeked to wet hide, eyes burning like fen-lights over the drowned road. The howl that bent the mist all day now closes around you from two sides at once. Mara plants her staff; chalk light gutters along its grain. The pack has decided. The circle draws, and the first howler slides in to test your ground.`
            : turn === 13
              ? `The nearer howler feints and gives ground — an opening bought, not offered. Beyond it the second beast peels wide, cutting the angle to your blind side while its packmate holds your eye. Mara's voice comes low and even: “One breath. Take it.” The circle tightens — wet grass, bared teeth, fen-light eyes — and the strike is yours to make, now or not at all.`
              // THE SECOND BATTLE (Directive XII §V.3) — a stray of the
              // broken pack at turns 30-32, so tales carry a battle where a
              // SHEETED companion's die falls on the player's device and a
              // fall is addressed in its turn. Byte-pinned, spoken once.
              : turn === 30
                ? `Brannoc hears it before anyone — a single howl, thin and hungry, rising off the drowned road behind you. One shape only this time: a stray of the broken pack, bolder for its loneliness, sliding along the reed-line with its eyes fixed on the smallest of you. Mara sweeps her charts under one arm. The stray means to test the weakest hand it can find. The circle it draws is small, and it is Brannoc's.`
                : turn === 31
                  ? `The stray feints at Brannoc and meets the boat-hook instead of his throat. He holds it the way rivermen do, hooked end low, knuckles pale on the haft. “Mine to finish,” he grunts — the first claim he has made on anything since the crossing stones. The stray coils to spring again. His strike, his die: the table waits on Brannoc's own hand.`
                  : needsRoll
                ? `Your road stops at a ${WHEEL_A[turn % 23]} threshold, iron-smelling rain over the ${WHEEL_B[turn % 21]}. A mechanism ${WHEEL_C[turn % 22]} beneath the stone — never ruin. It stays ${WHEEL_A[(turn + 9) % 23]}-taut before the commitment. Past this ${WHEEL_B[(turn + 11) % 21]}, nerve outweighs intention.`
                : `You move, and the ${WHEEL_A[turn % 23]} ${WHEEL_B[turn % 21]} answers. The path ${WHEEL_C[turn % 22]} toward the ridge. Mara chalks the ${WHEEL_B[(turn + 8) % 21]} onto her chart, watching the ${WHEEL_A[(turn + 13) % 23]} horizon. Below, one wayhouse window ${WHEEL_C[(turn + 15) % 22]} toward you, and three ${WHEEL_A[(turn + 17) % 23]} tracks lead inside.`,
      speaker: null
    }],
    suggestions: turn === 9 ? ['Ready your blade', 'Ask Mara about the pack', 'Watch the reed line']
      : turn === 12 ? ['Strike the nearer howler', 'Guard Mara', 'Break for the wayhouse']
        : turn === 13 ? ['Commit to the strike', 'Feint and give ground', 'Shout to scatter them']
          : turn === 30 ? ['Stand with Brannoc', 'Flank the stray', 'Drive it toward the water']
            : turn === 31 ? ['Trust his hook', 'Step in beside him', 'Shout it off him']
              : needsRoll ? ['Test the hidden mechanism', 'Search for a bypass', 'Call into the dark'] : DEFAULT_ROADS[turn % 3],
    roll_request: turn === 13
      ? { id: `roll-${turn}`, label: 'Strike the circling howler', kind: 'attack', die: 'd20', ability: 'STR', skill: null, proficient: true, dc: 11, advantage: 'normal', extra_mod: 0, action_id: 'strike', actor_id: 'hero', target_id: 'marsh-howler-a' }
      // THE TABLE'S-DICE LAW — the sheeted companion's die falls on the
      // player's device: actor_id carries Brannoc's own name (sheeted at
      // turn 21), and the door proves the sheet before the die is asked.
      : turn === 31
        ? { id: `roll-${turn}`, label: 'Brannoc\u2019s hook against the stray', kind: 'attack', die: 'd20', ability: 'STR', skill: null, proficient: true, dc: 11, advantage: 'normal', extra_mod: 0, action_id: 'hook-strike', actor_id: 'Brannoc', target_id: 'marsh-howler-a' }
        : needsRoll ? { id: `roll-${turn}`, label: 'Cross the prepared threshold', kind: 'check', die: 'd20', ability: 'DEX', skill: 'Investigation', proficient: hero.skills.includes('Investigation'), dc: 13, advantage: 'normal', extra_mod: 0, action_id: null, actor_id: 'hero', target_id: null } : null,
    state_updates: needsRoll ? null : { xp_gain: first ? 50 : 10, chronicle_add: first ? 'The impossible road turned north.' : turn === 9 ? 'A howl bent the mist over the ridge road.' : turn === 12 ? 'The Marsh Howler pack closed the ridge road.' : 'The ridge revealed a waiting light.' },
    // THE BATTLE CUT (Directive X): turn 12 opens combat lawfully — spawn
    // from the turn-9 seal, the order sealed as an operation with the pack's
    // one accounted d20 draw, one action from the same-breath instance.
    // Turn 13 presses: the round advances and the second howler moves once.
    combat: turn === 12
      ? { op: 'start', round_delta: 0, enemy_add: [], enemy_update: [], enemy_remove: [],
          spawn: { species: 'Marsh Howler', count: 2, names: null, zone: 'near' },
          initiative: { device: [name], entropy: [{ group: 'Marsh Howler', index: 0 }] },
          npc_actions: [{ actor: 'marsh-howler-a', action: 'Slides from the reeds, hackles high, testing your ground' }] }
      : turn === 13
        ? { op: 'update', round_delta: 1, enemy_add: [], enemy_update: [], enemy_remove: [],
            npc_actions: [{ actor: 'marsh-howler-b', action: 'Circles wide to your blind side while its packmate holds your eye' }] }
        // The stray's battle: the species was sealed at turn 9 — the seal
        // is forever, so the spawn is lawful; the device line carries the
        // sheeted companion, and the pack's one draw is accounted.
        : turn === 30
          ? { op: 'start', round_delta: 0, enemy_add: [], enemy_update: [], enemy_remove: [],
              spawn: { species: 'Marsh Howler', count: 1, names: null, zone: 'near' },
              initiative: { device: [name, 'Brannoc'], entropy: [{ group: 'Marsh Howler', index: 0 }] },
              npc_actions: [{ actor: 'marsh-howler-a', action: 'Slides along the reed-line, eyes on the smallest hand' }] }
          : turn === 31
            ? { op: 'update', round_delta: 1, enemy_add: [], enemy_update: [], enemy_remove: [],
                npc_actions: [{ actor: 'marsh-howler-a', action: 'Coils low in the reed-shadow, waiting out the hook' }] }
            : null, cinematic,
    // THE PRESENCE CUT (Directive VII.13): the mock sets the genesis scene
    // on the region it creates, and turn 4 performs ONE lawful travel —
    // same-turn region creation paired with time_advance — so keyless
    // proofs and seeded tables exercise both doors of the ground law.
    story: { beat_advance: false, arc, cast_add: castAdd, cast_update: turn === 6 ? [{ name: 'Mara Vey', bond_delta: 1, bond_reason: 'She trusted you with the truth of the old roads.', fact_add: 'Mara once mapped a road for the enemy.', last_seen: 'On the ridge above the wayhouse' }] : [], world: first ? { blight_delta: 0, region_add: { name: campaign.homeRegion || 'Larkspur Vale', visual: 'A green river vale of slate roofs, old orchards, white standing stones, and a northern ridge scarred by a road that should not exist.' }, region_update: null } : turn === 4 ? { blight_delta: 0, region_add: { name: 'The Wayhouse Ridge', visual: 'A wind-bent grass ridge stitched with dim gold lights, a shuttered wayhouse below with one warm window and three fresh tracks at the door.' }, region_update: null } : null, ...(first ? { scene_set: { region: campaign.homeRegion || 'Larkspur Vale' } } : turn === 4 ? { scene_set: { region: 'The Wayhouse Ridge' } } : {}), item_add: first ? [{ name: 'A stub of luminous chalk', kind: 'tool', holder: name, note: 'Mara pressed it into your hand at the impossible bend.' }] : turn === 18 ? [{ name: 'A ferry-iron knife', kind: 'weapon', holder: name, note: 'Brannoc’s trade for the road’s protection.' }, { name: 'Brannoc’s boat-hook', kind: 'weapon', holder: 'Brannoc', note: 'Rope-worn, river-true.' }] : [], purse: first ? [{ holder: name, delta: 12, reason: 'A traveler’s stake counted at the door' }] : turn === 21 ? [{ holder: name, delta: -3, reason: 'Ferry toll counted into Brannoc’s rope-burned palm' }] : [], fixture_add: first ? { place: campaign.homeRegion || 'Larkspur Vale', name: 'The Waystation Bell', visual: 'A bronze bell above the waystation door, green with age, rung twice for riders nobody sent.' } : null, ...(turn === 9 ? { creature_add: { species: 'Marsh Howler', visual: 'A lean bog-wolf sheathed in reed-green weed, wet hide over hard ribs, eyes like fen-lights, a howl that bends the mist.', nature: 'Pack hunter of the drowned roads; circles first, tests courage before flesh.', threat: 2 } } : {}),
    // THE DEPTH WALK (Directive XII §V.3) — the new-op road rides turns
    // ≥ 18 ONLY, so the pinned 18-turn keyless walk (turns 0-17) keeps
    // its exact bytes. Turn 18 seats Brannoc (cast + party + promise +
    // two named weapons); 21 readies the knife, sheets him, pays the
    // toll; 24 hands the chalk over; 30-32 are the stray's battle (the
    // sheeted die, the addressed fall, the fever); 33 lifts the fever;
    // 36 sends him home, promise kept.
    ...(turn === 18 ? { cast_add: [{ name: 'Brannoc', role: 'ally', visual: 'Stocky young ferryman in a river-grey oilcloak, rope-burned hands, a boat-hook slung crosswise on his back.', voice: 'Blunt river-cadence tenor, words spent like coin.', goal: 'Get home to the ridge ferry before the season turns.', secret: 'He watched the pack take the last ferryman and ran.' }], party_join: { name: 'Brannoc' }, thread_add: [{ label: 'See Brannoc home to the Wayhouse Ridge', kind: 'promise', holder: name }] } : {}),
    ...(turn === 21 ? { item_equip: { name: 'A ferry-iron knife', holder: name }, sheet_grant: { name: 'Brannoc', role: 'guardian', level: 1 } } : {}),
    ...(turn === 24 ? { item_transfer: [{ name: 'A stub of luminous chalk', from: name, to: 'Brannoc' }] } : {}),
    ...(turn === 33 ? { sheet_condition: { name: 'Brannoc', remove: ['poisoned'] } } : {}),
    ...(turn === 36 ? { party_leave: { name: 'Brannoc', remains_at: 'The Wayhouse Ridge' }, thread_resolve: [{ label: 'See Brannoc home to the Wayhouse Ridge', outcome: 'kept' }] } : {}) },
    image_cue: cinematic ? { kind: 'scene', subjects: first ? [name, 'Mara Vey'] : [name], region: campaign.homeRegion || 'Larkspur Vale', mood: first ? 'impossible invitation at dusk' : 'foreboding wonder' } : null,
    dialogue_cue: cinematic && first ? { speaker: 'Mara Vey', line: 'It knows your name. The first step is yours.' } : null,
    // THE WATCH LAW (Directive VIII.8): the mock script walks the clock
    // through distinct watches — deep night, dawn, morning, afternoon —
    // on free turns (3 and 6 are neither roll nor resolution rows), so
    // keyless proofs watch the calendar line change its watch word.
    time_advance: first ? { unit: 'hours', n: 1 } : turn === 3 ? { unit: 'hours', n: 5 } : turn === 4 ? { unit: 'hours', n: 2 } : turn === 6 ? { unit: 'hours', n: 6 } : null,
    entropy_use: turn === 12 ? [{ index: 0, die: 'd20', purpose: 'Initiative — the Marsh Howler pack draws its speed' }] : turn === 30 ? [{ index: 0, die: 'd20', purpose: 'Initiative — the stray howler draws its speed' }] : []
  };
}

// ------------------------------------------------------------
// THE MEASURE LAW (Directive XI, Law V) — the mock Voice honors the
// Director's band. A paragraph is one narration block; when the
// briefing carries beat_intent, the page is shaped INTO its band:
// padded up to the band floor with short connective description
// lines, trimmed into the ceiling by merging tail blocks. Without an
// intent the legacy walk is untouched, so older fixtures and evals
// read the same bytes they always did.
//
// The padding pool is turn-salted by construction: templates are
// picked at stride 7 through a pool of 24 (coprime), so an adjacent
// pair of pad lines recurs only every 24 turns — outside any 20-turn
// echo window — and every line stays under eight folded words, too
// short to carry an eight-word run alone.
// ------------------------------------------------------------
const MEASURE_BANDS = { lean: [1, 2], standard: [3, 5], rich: [6, 8] };
// Every pad carries a ${s.salt} slot fed from WHEEL_A at period 23:
// within any 20-page echo window the salt at a given pad ordinal never
// repeats, so no 8-word run through a pad can recur — and the joint
// congruences (pad identity mod 24, salt mod 23) have no solution for
// any turn gap of 1–20 (checked gap by gap; pairs need |Δordinal| ≤ 4,
// which forces gaps ≤ 4 or ≥ 19, and none of those satisfy the pad
// equation). Static stretches are audited: ≤ 4 folded words before the
// salt, ≤ 3 after (a two-word place counted), so runs crossing pad
// boundaries always swallow a salt.
const PAD_LINES = [
  (s) => `${s.place} holds its ${s.salt} breath.`,
  (s) => `Wind crosses ${s.place}, ${s.salt}, and settles.`,
  (s) => `The lantern gutters ${s.salt}, then steadies.`,
  (s) => `Beyond ${s.place}, a ${s.salt} door closes.`,
  (s) => `Old stone remembers ${s.salt}, older rain.`,
  (s) => `${s.hero} counts the ${s.salt} quiet.`,
  (s) => `A bird changes its ${s.salt} mind mid-air.`,
  (s) => `The road waits, ${s.salt}, past ${s.place}.`,
  (s) => `Smoke stands ${s.salt} in the air.`,
  (s) => `${s.place} keeps its ${s.salt} counsel.`,
  (s) => `The light leans ${s.salt} and low.`,
  (s) => `${s.hero} listens; nothing ${s.salt} answers yet.`,
  (s) => `Dust settles where ${s.salt} footsteps ended.`,
  (s) => `${s.place} shows one ${s.salt} light, far off.`,
  (s) => `The hour turns, ${s.salt}, without sound.`,
  (s) => `${s.hero} reads the ${s.salt} ground twice.`,
  (s) => `Cold finds the ${s.salt} gap in seams.`,
  (s) => `${s.place} smells of ${s.salt} rain coming.`,
  (s) => `A shutter taps its ${s.salt} slow question.`,
  (s) => `${s.hero} lets the ${s.salt} silence finish.`,
  (s) => `The grass bends, remembering ${s.salt} wind.`,
  (s) => `Night gathers ${s.salt} over ${s.place}.`,
  (s) => `Something small hurries ${s.salt}, home unseen.`,
  (s) => `${s.place} answers nothing, ${s.salt}, tonight.`
];

function fitToMeasure(turn, input) {
  const band = MEASURE_BANDS[input?.story?.beat_intent?.measure];
  if (!band || !Array.isArray(turn.narration_blocks)) return turn;
  const [floor, ceiling] = band;
  const blocks = [...turn.narration_blocks];
  const turnNo = Number(input?.turn) || 0;
  const slots = {
    place: input?.campaign?.homeRegion || input?.story?.regions?.[0]?.name || 'the road',
    hero: input?.hero?.name || 'The hero'
  };
  for (let i = 0; blocks.length < floor; i += 1) {
    const pick = ((turnNo * 7 + i * 3) % PAD_LINES.length + PAD_LINES.length) % PAD_LINES.length;
    const salt = WHEEL_A[(((turnNo + i) % 23) + 23) % 23];
    blocks.push({ text: PAD_LINES[pick]({ ...slots, salt }), speaker: null });
  }
  while (blocks.length > ceiling) {
    const tail = blocks.pop();
    const last = blocks[blocks.length - 1];
    blocks[blocks.length - 1] = { ...last, text: `${last.text} ${tail.text}`.slice(0, 1200) };
  }
  return { ...turn, narration_blocks: blocks };
}

export function mockDmTurn(input) {
  return fitToMeasure(rawMockDmTurn(input), input);
}
