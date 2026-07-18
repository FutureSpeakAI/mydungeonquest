const palettes = [
  ['#0d0b14','#593a49','#d4a24e'], ['#111827','#315b66','#e9dfc8'], ['#24120e','#7d3f2b','#d4a24e']
];

export function mockDmTurn({ campaign, hero, story, player, entropy, resolution, turn = 0 }) {
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
    return {
      narration_blocks: [{ text: success
        ? `The risk breaks in your favor. ${name} moves before doubt can harden, and the obstacle gives way with a sharp, satisfying finality. Beyond it, the path reveals a detail that was hidden from caution: a gold-thread mark matching the symbol burned into the old milestone. Someone expected you to come this far.`
        : `The attempt goes wrong without becoming meaningless. The obstacle answers with noise, resistance, and a warning carried farther than you would like. Yet in the failure you notice the gold-thread mark beneath the weathering—proof that this place was prepared, not abandoned. Somewhere ahead, someone now knows you are coming.`, speaker: null }],
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
              : needsRoll
                ? `Your choice carries you to a narrow threshold where the air smells of rain on old iron. A mechanism waits beneath the stone, too deliberate to be ruin and too quiet to be harmless. Beyond it, something moves once and becomes still. You can cross—but the scene stops on the instant before commitment, when nerve and technique matter more than intention.`
                : `You move, and the world moves back. The path opens through wind-bent grass toward a ridge stitched with dim gold lights. Mara watches the horizon rather than you. “Maps are promises made by people who rarely ask the road,” she says. Below the ridge, a shuttered wayhouse shows one warm window and three fresh tracks leading inside.`,
      speaker: null
    }],
    suggestions: turn === 9 ? ['Ready your blade', 'Ask Mara about the pack', 'Watch the reed line']
      : turn === 12 ? ['Strike the nearer howler', 'Guard Mara', 'Break for the wayhouse']
        : turn === 13 ? ['Commit to the strike', 'Feint and give ground', 'Shout to scatter them']
          : needsRoll ? ['Test the hidden mechanism', 'Search for a bypass', 'Call into the dark'] : ['Enter the warm wayhouse', 'Follow the fresh tracks', 'Question Mara directly'],
    roll_request: turn === 13
      ? { id: `roll-${turn}`, label: 'Strike the circling howler', kind: 'attack', die: 'd20', ability: 'STR', skill: null, proficient: true, dc: 11, advantage: 'normal', extra_mod: 0, action_id: 'strike', actor_id: 'hero', target_id: 'marsh-howler-a' }
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
        : null, cinematic,
    // THE PRESENCE CUT (Directive VII.13): the mock sets the genesis scene
    // on the region it creates, and turn 4 performs ONE lawful travel —
    // same-turn region creation paired with time_advance — so keyless
    // proofs and seeded tables exercise both doors of the ground law.
    story: { beat_advance: false, arc, cast_add: castAdd, cast_update: turn === 6 ? [{ name: 'Mara Vey', bond_delta: 1, bond_reason: 'She trusted you with the truth of the old roads.', fact_add: 'Mara once mapped a road for the enemy.', last_seen: 'On the ridge above the wayhouse' }] : [], world: first ? { blight_delta: 0, region_add: { name: campaign.homeRegion || 'Larkspur Vale', visual: 'A green river vale of slate roofs, old orchards, white standing stones, and a northern ridge scarred by a road that should not exist.' }, region_update: null } : turn === 4 ? { blight_delta: 0, region_add: { name: 'The Wayhouse Ridge', visual: 'A wind-bent grass ridge stitched with dim gold lights, a shuttered wayhouse below with one warm window and three fresh tracks at the door.' }, region_update: null } : null, ...(first ? { scene_set: { region: campaign.homeRegion || 'Larkspur Vale' } } : turn === 4 ? { scene_set: { region: 'The Wayhouse Ridge' } } : {}), item_add: first ? [{ name: 'A stub of luminous chalk', kind: 'tool', holder: name, note: 'Mara pressed it into your hand at the impossible bend.' }] : [], purse: first ? [{ holder: name, delta: 12, reason: 'A traveler’s stake counted at the door' }] : [], fixture_add: first ? { place: campaign.homeRegion || 'Larkspur Vale', name: 'The Waystation Bell', visual: 'A bronze bell above the waystation door, green with age, rung twice for riders nobody sent.' } : null, ...(turn === 9 ? { creature_add: { species: 'Marsh Howler', visual: 'A lean bog-wolf sheathed in reed-green weed, wet hide over hard ribs, eyes like fen-lights, a howl that bends the mist.', nature: 'Pack hunter of the drowned roads; circles first, tests courage before flesh.', threat: 2 } } : {}) },
    image_cue: cinematic ? { kind: 'scene', subjects: first ? [name, 'Mara Vey'] : [name], region: campaign.homeRegion || 'Larkspur Vale', mood: first ? 'impossible invitation at dusk' : 'foreboding wonder' } : null,
    dialogue_cue: cinematic && first ? { speaker: 'Mara Vey', line: 'It knows your name. The first step is yours.' } : null,
    // THE WATCH LAW (Directive VIII.8): the mock script walks the clock
    // through distinct watches — deep night, dawn, morning, afternoon —
    // on free turns (3 and 6 are neither roll nor resolution rows), so
    // keyless proofs watch the calendar line change its watch word.
    time_advance: first ? { unit: 'hours', n: 1 } : turn === 3 ? { unit: 'hours', n: 5 } : turn === 4 ? { unit: 'hours', n: 2 } : turn === 6 ? { unit: 'hours', n: 6 } : null,
    entropy_use: turn === 12 ? [{ index: 0, die: 'd20', purpose: 'Initiative — the Marsh Howler pack draws its speed' }] : []
  };
}
