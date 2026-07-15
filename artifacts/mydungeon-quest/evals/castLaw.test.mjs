// ------------------------------------------------------------
// THE CAST LAW SUITE — Phase 1 of the Experience Cut.
// Proves, keylessly:
//   1. The dead do not speak — the one dm_turn law amendment:
//      dialogue attributed to a dead soul invalidates the turn
//      (narration blocks and dialogue_cue, case-insensitive and
//      alias-aware), while dying words in the killing turn stay
//      lawful and a name shared with the living stays presumed
//      living.
//   2. The casting session — voices are cast BY THE CARD at first
//      introduction, deterministically, and persisted (voiceId).
//   3. The migration law — souls from before the casting law keep
//      their legacy name-hash voice; nobody is recast mid-tale.
//   4. The card canon — status enum, memorial facts, resurrection
//      refusal, known_facts dedup/cap, the bond arc, and sloppy
//      names (whitespace, bare first names) still reaching canon.
// Pure node, no DOM, no keys — safe on the proving ground.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import { safeFallbackTurn, validateDmTurn } from 'fatescript/protocol';
import { applyStoryUpdates, initCodex, CAST_STATUS } from 'fatescript/story';
import { castVoiceId, castVoiceByCard, resolveVoiceId } from 'fatescript/cinema/casting';

// ---- 1. The dead do not speak --------------------------------
{
  const deadCast = [{ name: 'Mara Vey', status: 'dead' }];
  const livingCast = [{ name: 'Mara Vey', status: 'active' }];

  const narrated = safeFallbackTurn('', 3);
  narrated.narration_blocks[0].speaker = 'Mara Vey';
  assert.equal(validateDmTurn(narrated, [], { cast: livingCast }).ok, true, 'a living soul may speak');
  const graveNarration = validateDmTurn(narrated, [], { cast: deadCast });
  assert.equal(graveNarration.ok, false, 'narration by the dead must invalidate the turn');
  assert.ok(graveNarration.errors.some((e) => e.includes('the dead do not speak')), 'the law must be named in the error');

  const cued = safeFallbackTurn('', 3);
  cued.dialogue_cue = { speaker: 'MARA VEY', line: 'The road remembers me still.' };
  assert.equal(validateDmTurn(cued, [], { cast: deadCast }).ok, false, 'dialogue_cue by the dead must fail, case-insensitively');

  const stranger = safeFallbackTurn('', 3);
  stranger.narration_blocks[0].speaker = 'A Hooded Stranger';
  assert.equal(validateDmTurn(stranger, [], { cast: deadCast }).ok, true, 'unregistered speakers (introduced this turn) remain lawful');

  // The alias law: a bare first name reaches its soul — the dead "Mara Vey"
  // cannot slip back onstage as "Mara", nor behind stray whitespace.
  const aliased = safeFallbackTurn('', 3);
  aliased.narration_blocks[0].speaker = 'Mara';
  assert.equal(validateDmTurn(aliased, [], { cast: deadCast }).ok, false, 'the dead addressed by bare first name must stay silenced');
  const spaced = safeFallbackTurn('', 3);
  spaced.narration_blocks[0].speaker = '  mara vey ';
  assert.equal(validateDmTurn(spaced, [], { cast: deadCast }).ok, false, 'whitespace must not smuggle the dead onstage');
  // Ambiguity resolves to the living: with a living Mara Quinn at the table,
  // a bare "Mara" is presumed to be her — the law blocks only the
  // unambiguous dead, never a lawful living speaker.
  const twoMaras = [{ name: 'Mara Vey', status: 'dead' }, { name: 'Mara Quinn', status: 'active' }];
  assert.equal(validateDmTurn(aliased, [], { cast: twoMaras }).ok, true, 'an alias shared with the living is presumed living');

  // Dying words: the snapshot is taken BEFORE the turn's updates apply, so
  // the turn that kills a soul may still carry their final line.
  const dying = safeFallbackTurn('', 3);
  dying.narration_blocks[0].speaker = 'Mara Vey';
  dying.story = { cast_update: [{ name: 'Mara Vey', status: 'dead' }] };
  assert.equal(validateDmTurn(dying, [], { cast: livingCast }).ok, true, 'dying words in the killing turn are lawful');

  const noContext = safeFallbackTurn('', 3);
  assert.equal(validateDmTurn(noContext, []).ok, true, 'the context parameter must stay optional');
}

// ---- 2. The casting session reads the card -------------------
{
  const smith = { name: 'Torvald Emberhand', role: 'blacksmith', visual: 'A broad-shouldered smith, soot-black beard, scarred forearms', voice: 'A gravelly bass rumble like coals settling', goal: 'Keep the forge lit', secret: '' };
  assert.equal(castVoiceByCard(smith), 'N2lVS1w4EtoT3dr4eOWO', 'a gravelly smith must draw the hoarse voice, not a reedy tenor');

  const scout = { name: 'Pip Farrow', role: 'scout', visual: 'A young woman with clever eyes', voice: 'A bright, quick voice like a struck bell', goal: '', secret: '' };
  assert.equal(castVoiceByCard(scout), 'Xb7hH8MSUJpSbSDYk0k2', 'a bright young scout must draw the bright young voice');

  const regent = { name: 'The Hollow Regent', role: 'villain', visual: 'Tall masked sovereign in black glass armor', voice: 'Measured velvet baritone, never raised', goal: 'Bind every road', secret: '' };
  assert.equal(castVoiceByCard(regent), 'N2lVS1w4EtoT3dr4eOWO', 'a masc villain must pull toward the villainous timbre');

  const queen = { name: 'Queen Vexis', role: 'villain', visual: 'A pale empress crowned in frost', voice: 'A cold, regal soprano', goal: 'Freeze the seasons', secret: '' };
  assert.equal(castVoiceByCard(queen), 'XB0fDUnXU5powFXDhCwa', 'a fem villain must pull toward the cold regal timbre');

  for (const soul of [smith, scout, regent, queen]) {
    assert.equal(castVoiceByCard(soul), castVoiceByCard(structuredClone(soul)), 'casting must be deterministic across sessions');
  }
}

// ---- 3. The migration law: nobody is recast mid-tale ----------
{
  // Legacy pools in their original order — a regression here would silently
  // recast every soul introduced before the casting law.
  const LEGACY_MASC = ['onwK4e9ZLuTAKqWW03F9','pNInz6obpgDQGcFmaJgB','VR6AewLTigWG4xSOukaG','N2lVS1w4EtoT3dr4eOWO','pqHfZKP75CvOlQylNhV4','TxGEqnHWrfWFTfGW9XjX'];
  const LEGACY_FEM = ['EXAVITQu4vr4xnSDxMaL','AZnzlk1XvdvUeBnXmlld','XB0fDUnXU5powFXDhCwa','Xb7hH8MSUJpSbSDYk0k2','XrExE9yKIg1WjnnlVkGX','MF3mGyEYCl7XYWbV9V6O'];
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return Math.abs(h); };

  const preLawFem = { name: 'Mara Vey', role: 'mentor', visual: 'Silver-braided cartographer', voice: 'Low, dry alto with patient pauses' };
  assert.equal(castVoiceId(preLawFem), LEGACY_FEM[hash('Mara Vey') % LEGACY_FEM.length], 'legacy fem casting must match the original pool and order');
  const preLawMasc = { name: 'Brother Aldous', role: 'priest', visual: 'A stooped man in rough wool', voice: 'A tired tenor' };
  assert.equal(castVoiceId(preLawMasc), LEGACY_MASC[hash('Brother Aldous') % LEGACY_MASC.length], 'legacy masc casting must match the original pool and order');
  const preLawUnknown = { name: 'The Veiled One', role: 'stranger', visual: 'A shape in traveling cloth', voice: 'A whisper' };
  assert.equal(castVoiceId(preLawUnknown), [...LEGACY_MASC, ...LEGACY_FEM][hash('The Veiled One') % 12], 'unknown register must draw from the whole legacy ensemble');

  // Cards without a voiceId (pre-law campaigns) resolve to the legacy voice;
  // cards with one keep it verbatim. No soul is ever recast mid-tale.
  assert.equal(resolveVoiceId(preLawFem), castVoiceId(preLawFem), 'a pre-law card must keep its hash voice');
  assert.equal(resolveVoiceId({ ...preLawFem, voiceId: 'LOCKED-VOICE' }), 'LOCKED-VOICE', 'a cast card keeps its persisted voice forever');
}

// ---- 4. The card canon: status, facts, bonds, memorials -------
{
  assert.deepEqual(CAST_STATUS, ['active', 'dead', 'missing'], 'the status law names exactly three states');

  let codex = initCodex('classic-epic');
  codex = applyStoryUpdates(codex, { cast_add: [{ name: 'Mara Vey', role: 'mentor', visual: 'Silver-braided cartographer', voice: 'Low, dry alto with patient pauses', goal: 'Keep the old roads', secret: 'She mapped for the enemy' }] }, { turn: 3 });
  const mara = () => codex.cast[0];
  assert.equal(mara().status, 'active');
  assert.equal(mara().introduced_turn, 3, 'introduction must be stamped with its turn');
  assert.deepEqual(mara().known_facts, []);
  assert.deepEqual(mara().bond_arc, []);
  assert.ok(mara().voiceId, 'the casting session must persist a voice on the new card');
  assert.equal(mara().voiceId, castVoiceByCard(mara()), 'the persisted voice must be the card-cast voice');

  codex = applyStoryUpdates(codex, { cast_update: [{ name: 'Mara Vey', status: 'ascended' }] }, { turn: 4 });
  assert.equal(mara().status, 'active', 'an unlawful status must be refused');
  assert.ok(codex.notes.some((n) => n.includes('Unlawful status refused')), 'the refusal must be noted as a wound');

  codex = applyStoryUpdates(codex, { cast_update: [{ name: 'Mara Vey', bond_delta: 1, bond_reason: 'She confessed her old map.', fact_add: 'She fears the unmapped dark.' }] }, { turn: 5 });
  assert.equal(mara().bond, 1);
  assert.deepEqual(mara().bond_arc, [{ turn: 5, delta: 1, why: 'She confessed her old map.' }], 'the bond arc must remember when and why');
  assert.deepEqual(mara().known_facts, ['She fears the unmapped dark.']);
  codex = applyStoryUpdates(codex, { cast_update: [{ name: 'Mara Vey', fact_add: 'she fears the unmapped dark.' }] }, { turn: 6 });
  assert.equal(mara().known_facts.length, 1, 'facts must dedup case-insensitively');

  codex = applyStoryUpdates(codex, { cast_update: [{ name: 'Mara Vey', status: 'dead', last_seen: 'At the shattered bridge' }] }, { turn: 7 });
  assert.equal(mara().status, 'dead');
  assert.ok(mara().known_facts.some((f) => f.includes('Fell on turn 7')), 'death must write a memorial fact');

  codex = applyStoryUpdates(codex, { cast_update: [{ name: 'Mara Vey', status: 'active' }] }, { turn: 8 });
  assert.equal(mara().status, 'dead', 'no resurrection retcons');
  assert.ok(codex.notes.some((n) => n.includes('Resurrection retcon blocked')), 'the retcon must be noted as a wound');

  // And the validator holds the line against this very codex.
  const grave = safeFallbackTurn('', 9);
  grave.narration_blocks[0].speaker = 'Mara Vey';
  assert.equal(validateDmTurn(grave, [], { cast: codex.cast }).ok, false, 'the sealed dead must not speak in later turns');

  // Caps: facts hold the latest ten; the bond arc holds the latest twelve.
  for (let i = 0; i < 12; i += 1) codex = applyStoryUpdates(codex, { cast_update: [{ name: 'Mara Vey', fact_add: `Recorded fact number ${i}.` }] }, { turn: 10 + i });
  assert.equal(mara().known_facts.length, 10, 'known_facts must cap at ten');
  assert.ok(mara().known_facts[0].includes('number 2'), 'the cap must keep the newest facts');
  for (let i = 0; i < 14; i += 1) codex = applyStoryUpdates(codex, { cast_update: [{ name: 'Mara Vey', bond_delta: i % 2 === 0 ? 1 : -1, bond_reason: `Turning ${i}.` }] }, { turn: 30 + i });
  assert.equal(mara().bond_arc.length, 12, 'the bond arc must cap at twelve entries');

  // Sloppy names still reach the card: trimmed, case-insensitive, and by
  // unique bare first name — but an ambiguous alias touches nobody.
  codex = applyStoryUpdates(codex, { cast_update: [{ name: '  mara vey  ', fact_add: 'The bridge keeps her name.' }] }, { turn: 50 });
  assert.ok(mara().known_facts.some((f) => f.includes('bridge keeps her name')), 'whitespace must not orphan a cast_update');
  codex = applyStoryUpdates(codex, { cast_update: [{ name: 'Mara', fact_add: 'Bare first names reach their soul.' }] }, { turn: 51 });
  assert.ok(mara().known_facts.some((f) => f.includes('reach their soul')), 'a unique bare first name must reach the card');
  codex = applyStoryUpdates(codex, { cast_add: [{ name: 'Mara Quinn', role: 'rival', visual: 'A sharp-eyed duelist in road leathers', voice: 'A clipped, quick mezzo', goal: 'Outride the mentor', secret: '' }] }, { turn: 52 });
  assert.equal(codex.cast.length, 2, 'a distinct soul sharing a first name may still join the tale');
  codex = applyStoryUpdates(codex, { cast_update: [{ name: 'Mara', fact_add: 'Ambiguity touches nobody.' }] }, { turn: 53 });
  assert.equal(codex.cast.some((s) => (s.known_facts || []).some((f) => f.includes('Ambiguity touches nobody'))), false, 'an ambiguous alias must resolve to no card — canon is never guessed');
}

// ---- 5. The hero's casting law: the forge card is read --------
{
  const { castHeroVoice, resolveHeroVoiceId, heroVoiceCard } = await import('fatescript/cinema/casting');
  const FEM_IDS = ['EXAVITQu4vr4xnSDxMaL', 'AZnzlk1XvdvUeBnXmlld', 'XB0fDUnXU5powFXDhCwa', 'Xb7hH8MSUJpSbSDYk0k2', 'XrExE9yKIg1WjnnlVkGX', 'MF3mGyEYCl7XYWbV9V6O'];
  const MASC_IDS = ['onwK4e9ZLuTAKqWW03F9', 'pNInz6obpgDQGcFmaJgB', 'VR6AewLTigWG4xSOukaG', 'N2lVS1w4EtoT3dr4eOWO', 'pqHfZKP75CvOlQylNhV4', 'TxGEqnHWrfWFTfGW9XjX'];

  // The wrong-register bug, pinned: a neutrally-named hero whose BEARING
  // carries the register. The legacy name-hash read only the name and could
  // draw from the wrong side of the room; the card-cast reads what the player
  // actually wrote at the forge.
  const ash = { name: 'Ash', ancestry: 'Human', className: 'Ranger', bearing: "A quiet woman with storm-grey eyes, her mother's bow across her back", background: 'Raised by the road wardens' };
  assert.ok(FEM_IDS.includes(castHeroVoice(ash)), 'a fem bearing must cast a fem voice, whatever the name-hash says');

  const bram = { name: 'Bram', ancestry: 'Dwarf', className: 'Fighter', bearing: "A barrel-chested man, soot in his beard, his father's axe never far", background: 'Forge-born' };
  assert.ok(MASC_IDS.includes(castHeroVoice(bram)), 'a masc bearing must cast a masc voice');

  // Background carries register too when the bearing is quiet.
  const wren = { name: 'Wren', ancestry: 'Elf', className: 'Bard', bearing: '', background: 'A priestess of the river choirs before she took the road' };
  assert.ok(FEM_IDS.includes(castHeroVoice(wren)), 'the background must reach the casting session when the bearing is silent');

  // Deterministic in the written card — same hero, same voice, every session,
  // every replay, every export.
  assert.equal(castHeroVoice(ash), castHeroVoice(structuredClone(ash)), 'hero casting must be deterministic');

  // The card the session reads carries what the player wrote.
  const card = heroVoiceCard(ash);
  assert.ok(card.visual.includes('storm-grey'), 'the bearing must reach the card');
  assert.ok(card.role.toLowerCase().includes('ranger'), 'ancestry and class stand as the role');

  // Resolution mirrors the NPC law: a persisted voice is kept forever; an
  // uncast hero (pre-law campaign, read-only spine) resolves to the card-cast
  // answer in memory — never the blind name-draw.
  assert.equal(resolveHeroVoiceId({ ...ash, voiceId: 'LOCKED-HERO-VOICE' }), 'LOCKED-HERO-VOICE', 'a cast hero keeps the persisted voice forever');
  assert.equal(resolveHeroVoiceId(ash), castHeroVoice(ash), 'an uncast hero resolves by the card, deterministically');
}

// ---- 6. The hero answers to their first name — unless it's taken ----
{
  const { speakerIsHero } = await import('fatescript/cinema/casting');
  const hero = { name: 'Ash Vale', bearing: 'A quiet woman with storm-grey eyes' };
  assert.equal(speakerIsHero('Ash Vale', hero, []), true, 'the full name is always the hero');
  assert.equal(speakerIsHero('  ash vale ', hero, []), true, 'case and stray whitespace must not matter');
  assert.equal(speakerIsHero('Ash', hero, []), true, 'a bare first name reaches the hero when nobody else claims it');
  assert.equal(speakerIsHero('Ash', hero, [{ name: 'Ash Thorn' }]), false, 'an ambiguous first name touches nobody — a voice is never guessed');
  assert.equal(speakerIsHero('Vale', hero, []), false, 'a surname alone is not an alias');
  assert.equal(speakerIsHero('Mara', hero, []), false, 'a stranger is never the hero');
  assert.equal(speakerIsHero('', hero, []), false, 'silence is nobody');
  assert.equal(speakerIsHero('Ash', null, []), false, 'no hero, no claim');
}

console.log('PASS — the cast law: the dead do not speak, casting reads the card, migration recasts no one, the card canon holds, and the hero is cast by the forge card.');
