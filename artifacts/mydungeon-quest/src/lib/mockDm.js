const palettes = [
  ['#0d0b14','#593a49','#d4a24e'], ['#111827','#315b66','#e9dfc8'], ['#24120e','#7d3f2b','#d4a24e']
];

export function mockDmTurn({ campaign, hero, story, player, entropy, resolution, turn = 0 }) {
  const beat = story.beat;
  const name = hero.name;
  if (resolution) {
    const success = resolution.outcome.includes('success');
    return {
      narration_blocks: [{ text: success
        ? `The risk breaks in your favor. ${name} moves before doubt can harden, and the obstacle gives way with a sharp, satisfying finality. Beyond it, the path reveals a detail that was hidden from caution: a gold-thread mark matching the symbol burned into the old milestone. Someone expected you to come this far.`
        : `The attempt goes wrong without becoming meaningless. The obstacle answers with noise, resistance, and a warning carried farther than you would like. Yet in the failure you notice the gold-thread mark beneath the weathering—proof that this place was prepared, not abandoned. Somewhere ahead, someone now knows you are coming.`, speaker: null }],
      suggestions: ['Follow the gold mark', 'Hide before pursuit', 'Study the mechanism'],
      roll_request: null,
      state_updates: success ? { xp_gain: 25, chronicle_add: 'The marked threshold yielded.' } : { hp_delta: -1, chronicle_add: 'The threshold answered loudly.' },
      combat: null, cinematic: null, story: turn > 1 ? { beat_advance: true, cast_add: [], cast_update: [], world: null, arc: null } : null,
      image_cue: { kind: 'scene', subjects: [], region: story.regions?.[0]?.name || null, mood: success ? 'hard-won wonder' : 'dangerous discovery' },
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
    style_bible: campaign.styleBible || 'Romantic dark-fantasy oil painting with illuminated-manuscript gold, deep atmospheric perspective, expressive faces, and restrained PG-13 peril.'
  } : null;
  return {
    narration_blocks: [{
      text: first
        ? `At dusk, the road outside ${campaign.homeRegion || 'your home'} writes a new sentence across the earth. Cobblestones turn one by one toward the northern dark, though no road has ever gone that way. Mara Vey waits beside the impossible bend, luminous chalk bright on her fingers. “It knows your name,” she says, as the distant hills answer with a bell no hand is ringing. The first step is yours.`
        : needsRoll
          ? `Your choice carries you to a narrow threshold where the air smells of rain on old iron. A mechanism waits beneath the stone, too deliberate to be ruin and too quiet to be harmless. Beyond it, something moves once and becomes still. You can cross—but the scene stops on the instant before commitment, when nerve and technique matter more than intention.`
          : `You move, and the world moves back. The path opens through wind-bent grass toward a ridge stitched with dim gold lights. Mara watches the horizon rather than you. “Maps are promises made by people who rarely ask the road,” she says. Below the ridge, a shuttered wayhouse shows one warm window and three fresh tracks leading inside.`,
      speaker: null
    }],
    suggestions: needsRoll ? ['Test the hidden mechanism', 'Search for a bypass', 'Call into the dark'] : ['Enter the warm wayhouse', 'Follow the fresh tracks', 'Question Mara directly'],
    roll_request: needsRoll ? { id: `roll-${turn}`, label: 'Cross the prepared threshold', kind: 'check', die: 'd20', ability: 'DEX', skill: 'Investigation', proficient: hero.skills.includes('Investigation'), dc: 13, advantage: 'normal', extra_mod: 0, action_id: null, actor_id: 'hero', target_id: null } : null,
    state_updates: needsRoll ? null : { xp_gain: first ? 50 : 10, chronicle_add: first ? 'The impossible road turned north.' : 'The ridge revealed a waiting light.' },
    combat: null, cinematic,
    story: { beat_advance: false, arc, cast_add: castAdd, cast_update: [], world: first ? { blight_delta: 0, region_add: { name: campaign.homeRegion || 'Larkspur Vale', visual: 'A green river vale of slate roofs, old orchards, white standing stones, and a northern ridge scarred by a road that should not exist.' }, region_update: null } : null },
    image_cue: cinematic ? { kind: 'scene', subjects: first ? ['Mara Vey'] : [], region: campaign.homeRegion || 'Larkspur Vale', mood: first ? 'impossible invitation at dusk' : 'foreboding wonder' } : null,
    dialogue_cue: cinematic && first ? { speaker: 'Mara Vey', line: 'It knows your name. The first step is yours.' } : null,
    time_advance: first ? { unit: 'hours', n: 1 } : null,
    entropy_use: []
  };
}
