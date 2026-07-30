// ---------------------------------------------------------------------------
// DEEP CAMPAIGN FIXTURE — Stage 8 / M1
//
// Deterministic load fixture representing a 15-chapter campaign at realistic
// depth. Used by contextUnderLoad.test.mjs to prove the context pack stays
// within budget under real content conditions.
//
// Design:
//   - 12 carded souls (hero + 11), each with 6 known_facts strings
//   - 4 regions, each with a full visual description (~80-100 chars)
//   - 4 open threads
//   - 60 turns across 15 chapters (4 per chapter), narration at 'none'
//     band ceiling: 160 words / 6 blocks per turn
//   - Ticks, act changes, combat, and repaired-turn markers distributed
//
// The fixture returns campaign snapshots at each chapter checkpoint without
// going through applyStoryUpdates — the codex is built directly because
// buildContextPack reads the codex fields, not the update history.
//
// Committed and deterministic: same inputs always produce the same bytes.
// ---------------------------------------------------------------------------

import { initCodex } from 'fatescript/story';

// ── Word pool (deterministic prose generator) ────────────────────────────────
// Six fixed blocks of ~27 words each (162 words total) at 'none' band ceiling.
const CEILING_BLOCKS = [
  'The road wound through brittle scrubland where the soil cracked in long gray seams and the air carried the smell of ash from fires that had burned three days ago.',
  'Aldric pulled his cloak tighter against the wind and said nothing while the horizon shifted between pale gold and the color of old bruises gathering before rain.',
  'From the ridge the ruined citadel spread below them, its towers broken at irregular heights, the courtyard filled with rubble and the deep shadows of things that had not moved in years.',
  'Karos moved through the hall with the unhurried certainty of someone who had already counted every exit and found none of them necessary, his pale eyes resting on the hero for only a moment.',
  'The seals on the lower door were intact but the wax was the wrong color — not the gray-green of the old chancellery but something darker, applied in haste and still bearing a thumbprint.',
  'Night settled over the valley with unusual speed. The cookfires went out one by one before the watch called the hour, and no one could explain afterward why they had let them die.',
];

// ── The 12 souls ────────────────────────────────────────────────────────────
// Hero + 11 NPCs. Each has 6 known_facts (~50 chars each).
// Soul names are mentioned in narration so scene detection works.

const HERO = {
  name: 'Caelith Dorn',
  ancestry: 'Human',
  className: 'Scout',
  presentation: 'ambiguous',
};

const SOULS = [
  {
    name: 'Karos the Pale',
    role: 'villain',
    visual: 'A tall figure in dark chancellor robes, face gaunt, eyes colorless as winter sky',
    voice: 'Low and precise, never raising above a murmur',
    goal: 'Absorb the citadel\'s accumulated authority into a single sealed mandate',
    secret: 'Was the original architect of the three seals; only he can unmake them',
    status: 'active',
    bond: 0,
    introduced_turn: 1,
    known_facts: [
      'Holds the broken warden-key from the old chancellery',
      'Was exiled from the citadel fourteen years ago under the chancellor\'s seal',
      'Travels with a silent companion who has never been named aloud',
      'Carries the authority sigil of the dissolved third court',
      'Has been seen in four different regions within the same week',
      'The cookfires go out wherever he passes — no one knows why',
    ],
  },
  {
    name: 'Aldric Mourne',
    role: 'a ruined knight sworn to the citadel\'s old order',
    visual: 'Broad-shouldered, scarred across the jaw, armor repaired with different metals',
    voice: 'Gruff, economical, silence used more than words',
    goal: 'Recover enough of his old commission to die with his oath intact',
    secret: 'Betrayed the third seal under duress and has carried the guilt since',
    status: 'active',
    bond: 3,
    introduced_turn: 2,
    known_facts: [
      'Knows every secret entrance to the lower citadel',
      'Lost two fingers on his sword hand in the siege of the outer gate',
      'Still carries the broken seal-ring from his commission',
      'Has a daughter in the valley settlement he has never spoken to',
      'Owes a debt to the ferryman that he refuses to name',
      'Dreams of the night the third seal was broken and wakes silent',
    ],
  },
  {
    name: 'Vesna Sorell',
    role: 'a traveling archivist',
    visual: 'Small, ink-stained fingers, wears a coat with too many pockets',
    voice: 'Fast and precise, trails off when uncertain',
    goal: 'Document the citadel\'s seal records before they are destroyed or stolen',
    secret: 'Is already working for one of the factions and has not said which',
    status: 'active',
    bond: 2,
    introduced_turn: 3,
    known_facts: [
      'Has transcribed partial copies of all three seal instruments',
      'Knows the chancellor\'s personal cypher used in the third record',
      'Was in the citadel the night of the exile and saw what happened',
      'Carries a duplicate key that she claims is a copy of the warden-key',
      'Sells information to multiple parties but has her own agenda',
      'Her coat pockets contain sealed letters she has not delivered',
    ],
  },
  {
    name: 'Tomas Fenn',
    role: 'the valley ferryman',
    visual: 'Weathered, patient-eyed, poles his boat with practiced ease',
    voice: 'Unhurried, says more with silence than most do with words',
    goal: 'Keep his family safe from whatever is moving through the high passes',
    secret: 'Has ferried Karos across the river twice and kept it from everyone',
    status: 'active',
    bond: 1,
    introduced_turn: 4,
    known_facts: [
      'Knows every landing spot on the river for twenty miles',
      'Was the last person to speak with the missing second chancellor',
      'His boat has a hidden compartment under the stern boards',
      'Will not cross after dark regardless of payment',
      'Owes Aldric Mourne a debt he has never disclosed',
      'Has seen the pale-eyed man three times and said nothing each time',
    ],
  },
  {
    name: 'Orreth',
    role: 'a ruin-scavenger who knows the citadel\'s lower levels',
    visual: 'Wiry, nervous hands, layers of mismatched salvage-clothing',
    voice: 'Quick and apologetic, ends statements as questions',
    goal: 'Find the sealed vault in the lower east wing before anyone else does',
    secret: 'Has already been inside the vault and left something behind',
    status: 'active',
    bond: 1,
    introduced_turn: 5,
    known_facts: [
      'Mapped the lower citadel over four years of careful entry',
      'Knows where the third seal is physically housed',
      'Was caught by Karos\'s companion and released without explanation',
      'Carries salvaged fragments of the chancellor\'s personal correspondence',
      'The vault he seeks contains something he refuses to describe',
      'Has a working relationship with the valley settlement\'s headwoman',
    ],
  },
  {
    name: 'Mirhe Sonn',
    role: 'the headwoman of the valley settlement',
    visual: 'Tall, direct gaze, speaks with the authority of someone who settles disputes',
    voice: 'Even and measured, patience worn thin only at the edges',
    goal: 'Keep the valley out of the conflict gathering above them',
    secret: 'Knows what is in the sealed vault and has known for years',
    status: 'active',
    bond: 1,
    introduced_turn: 6,
    known_facts: [
      'Has kept the settlement neutral through two previous conflicts',
      'Her family held the valley stewardship for four generations',
      'Is in correspondence with someone in the citadel she will not name',
      'Knows the legal standing of all three seals under old charter law',
      'Has already turned away three delegations from the upper factions',
      'Her silence on the vault is deliberate and costs her',
    ],
  },
  {
    name: 'Drenn',
    role: 'Karos\'s unnamed companion',
    visual: 'Shorter than expected, face habitually turned away, moves without sound',
    voice: 'Has never spoken within earshot',
    goal: 'Unknown — observes and reports, acts only when commanded',
    secret: 'Carries a second sealed mandate that supersedes the one Karos holds',
    status: 'active',
    bond: 0,
    introduced_turn: 7,
    known_facts: [
      'Has been following the hero since before the first encounter with Karos',
      'Was seen entering the citadel alone and emerging three hours later',
      'The ferryman recognized him but refused to say from where',
      'Carries a sealed document that has never been opened in view',
      'Does not eat or sleep in the company of others',
      'The archivist has a name for him but will not write it down',
    ],
  },
  {
    name: 'Lysse',
    role: 'a young citadel ward who escaped the siege',
    visual: 'Young, watchful, dressed in clothes that no longer fit the role they were made for',
    voice: 'Careful and literal, avoids metaphor',
    goal: 'Find out what happened to the chancellor who sponsored her wardship',
    secret: 'Witnessed the breaking of the second seal and can describe the mechanism',
    status: 'active',
    bond: 2,
    introduced_turn: 8,
    known_facts: [
      'Was hidden in the archive during the siege and heard everything',
      'Can read the old seal instruments — a skill that is nearly extinct',
      'Knows a way into the citadel\'s upper level that no one else has found',
      'The chancellor who sponsored her is not dead but is not free',
      'Carries three pages torn from the personal archive by memory',
      'Is being sought by at least two parties who do not yet know she survived',
    ],
  },
  {
    name: 'The Warden-Construct',
    role: 'a mechanical guardian bound to the original seal',
    visual: 'Iron and brass, taller than a man, joints sealed with old wax that has cracked',
    voice: 'Sounds like water over stone, speaks only in old legal forms',
    goal: 'Fulfill the original mandate of the first seal, which has never been revoked',
    secret: 'The mandate it holds contradicts the one Karos carries — one is forged',
    status: 'active',
    bond: 0,
    introduced_turn: 9,
    known_facts: [
      'Has been dormant for fourteen years and recently reactivated',
      'Recognizes Aldric Mourne\'s broken seal-ring as a lawful authority token',
      'Cannot be destroyed while the first seal remains intact',
      'Its mandate supersedes any individual authority including Karos\'s',
      'Was built by the same hand that wrote the original charter',
      'Speaks directly to Lysse in a form no one else can follow',
    ],
  },
  {
    name: 'Harren Solt',
    role: 'a siege-era captain who held the outer gate',
    visual: 'Old now, one eye clouded, moves with the caution of sustained old injury',
    voice: 'Deliberate, has learned to be careful with facts',
    goal: 'Die having told someone the true account of the siege',
    secret: 'The third seal was not broken by Karos — Harren broke it under orders',
    status: 'active',
    bond: 1,
    introduced_turn: 10,
    known_facts: [
      'Was the last loyal officer to hold position during the siege',
      'Gave the order that opened the outer gate to Karos\'s forces',
      'Has lived in the valley in voluntary obscurity for fourteen years',
      'Knows who gave him the order and has never said the name',
      'The name he will not say is not Karos',
      'Has written a sealed account that he has left with the headwoman',
    ],
  },
  {
    name: 'The Second Chancellor',
    role: 'the deposed authority whose mandate started the conflict',
    visual: 'Older, reduced, dressed in nothing that marks former office',
    voice: 'Precise in the way of someone who has had time to rehearse the truth',
    goal: 'Ensure the sealed vault is opened by the right hand and not Karos\'s',
    secret: 'The vault contains not documents but a living witness who must be freed',
    status: 'active',
    bond: 1,
    introduced_turn: 11,
    known_facts: [
      'Was not killed during the siege but hidden by the ferryman',
      'Holds the only remaining lawful authority to revoke all three seals',
      'Has been in correspondence with the headwoman through the ferryman',
      'Knows the warden-construct\'s original mandate by heart',
      'The person Lysse knows is alive is this chancellor',
      'Will not act until the first seal is either intact or destroyed cleanly',
    ],
  },
];

// ── Regions ─────────────────────────────────────────────────────────────────
const REGIONS = [
  {
    id: 'region-sunken-citadel',
    name: 'The Sunken Citadel',
    visual: 'A fortress half-buried by the hillside collapse that followed the siege, towers broken at irregular heights, its lower levels accessible only through rubble passages that shift with every hard rain',
    state: 'ruined',
  },
  {
    id: 'region-valley-settlement',
    name: 'The Valley Settlement',
    visual: 'A compact community of stone-and-timber buildings arranged around a central well, hedged by terraced fields and the river on two sides, self-sufficient and deliberately unremarkable',
    state: 'thriving',
  },
  {
    id: 'region-high-passes',
    name: 'The High Passes',
    visual: 'Narrow routes through limestone ridges where the wind comes from three directions and the path is marked by cairns that travelers have maintained for generations without official sanction',
    state: 'troubled',
  },
  {
    id: 'region-river-crossing',
    name: 'The River Crossing',
    visual: 'A wide slow bend in the river where the ferryman operates, the banks marked by old stonework from a bridge that no longer exists, the water dark and deep in the channel',
    state: 'thriving',
  },
];

// ── Threads ──────────────────────────────────────────────────────────────────
const THREADS = [
  { label: 'Recover the broken seal-ring\'s authority token', kind: 'promise', holder: 'Aldric Mourne', status: 'open', outcome: null },
  { label: 'Learn what the sealed vault actually contains', kind: 'mystery', holder: 'Vesna Sorell', status: 'open', outcome: null },
  { label: 'Identify the second mandate that Drenn carries', kind: 'mystery', holder: null, status: 'open', outcome: null },
  { label: 'Deliver the siege captain\'s sealed account to its rightful reader', kind: 'errand', holder: 'Harren Solt', status: 'open', outcome: null },
];

// ── Chronicle entries ────────────────────────────────────────────────────────
// Realistic chronicle accumulates through play. 15 entries, one per chapter.
function buildChronicle(upToChapter) {
  const ALL = [
    'The hero reached the valley settlement and learned the citadel had been sealed for fourteen years.',
    'Aldric Mourne revealed the existence of the warden-key and its connection to the third seal.',
    'The archivist shared partial transcriptions of the seal instruments, withholding the cypher.',
    'Tomas Fenn confirmed he had ferried a pale-eyed man across the river but refused to name him.',
    'The hero entered the lower citadel through a rubble passage and found the warden-construct dormant.',
    'Karos appeared at the outer gate and offered terms the hero did not accept.',
    'Drenn was spotted inside the citadel alone; the archivist recognized him and went silent.',
    'Lysse was found hidden in the archive and confirmed she had witnessed the second seal breaking.',
    'The warden-construct reactivated and addressed Lysse in the old legal form.',
    'Harren Solt came forward and disclosed he had given the order to open the outer gate.',
    'The second chancellor was confirmed alive and in contact with the valley headwoman.',
    'The warden-construct\'s mandate was read aloud and found to contradict Karos\'s document.',
    'Aldric Mourne offered his broken seal-ring to the warden-construct and was recognized.',
    'The vault mechanism was located in the lower east wing, sealed under the second chancellor\'s authority.',
    'The hero stands at the threshold of the vault with all principals converged and the question unresolved.',
  ];
  return ALL.slice(0, upToChapter);
}

// ── Log entry generator ───────────────────────────────────────────────────────
// Builds realistic turn log entries at 'none' band ceiling (160 words, 6 blocks).
// Deterministic: turn index drives content selection.
function makeTurnEntry(turnIndex, chapterIndex) {
  // Include soul names in narration so scene detection fires correctly.
  const soulNames = ['Caelith Dorn', 'Karos the Pale', 'Aldric Mourne', 'Vesna Sorell'];
  const inSceneSoul = soulNames[turnIndex % soulNames.length];

  // Build 6 blocks with ceiling prose; first block always mentions the scene soul.
  const blocks = CEILING_BLOCKS.map((text, i) => {
    if (i === 0) {
      return { text: `${inSceneSoul} noted the shift in the air before the others did. ${text}`, speaker: i === 1 ? inSceneSoul : null };
    }
    return { text, speaker: null };
  });

  const story = {
    // Distribute combat at chapter 5 and 10
    ...(chapterIndex === 5 && turnIndex % 4 === 0 ? { combat: { op: 'begin', context: 'Karos\'s forces move to seal the upper gate' } } : {}),
    // Distribute ticks every third turn
    ...(turnIndex % 3 === 0 ? { clock_tick: { label: 'The three seals erode', reason: 'Another day without resolution weakens the bindings' } } : {}),
    // Act change at chapter 5 (ordeal) and chapter 9 (counterstroke)
    ...(chapterIndex === 5 && turnIndex % 4 === 3 ? { beat_advance: true } : {}),
  };

  return {
    turn: turnIndex + 1,
    dm: {
      narration_blocks: blocks,
      story: Object.keys(story).length > 0 ? story : null,
    },
    // Mark repaired turns at specific positions
    ...(turnIndex % 7 === 0 ? { repaired: true, provider: 'anthropic' } : {}),
  };
}

// ── buildDeepCampaign ────────────────────────────────────────────────────────
/**
 * Returns a campaign snapshot at the given chapter (1-based, 1–15).
 * beatIndex = chapter - 1 (chapters map 1:1 to classic-epic beats 0-14).
 *
 * The snapshot has:
 *   - Full codex with 12 souls (each with 6 known_facts), 4 regions, 4 threads
 *   - beatIndex set to the chapter
 *   - Chronicle accumulated up to the chapter
 *   - Logs: all turns up to chapter × 4 (last 6 are relevant for pack recency)
 */
export function buildDeepCampaign(chapter) {
  if (chapter < 1 || chapter > 15) throw new RangeError(`chapter must be 1–15, got ${chapter}`);

  const codex = initCodex('classic-epic');

  // Advance beatIndex to the target chapter (0-based)
  codex.beatIndex = chapter - 1;

  // Populate cast: hero is never in codex.cast, only NPCs
  codex.cast = SOULS.map((soul) => ({
    ...soul,
    // Only include souls introduced up to this chapter
    ...(soul.introduced_turn > chapter * 4 ? { introduced_turn: soul.introduced_turn } : {}),
  })).filter((soul) => soul.introduced_turn <= chapter * 4);

  // Populate regions
  codex.regions = REGIONS.slice();

  // Populate threads
  codex.threads = THREADS.slice();

  // Set scene to the citadel so scene detection works with narration
  codex.scene = {
    region: 'The Sunken Citadel',
    sinceTurn: Math.max(1, (chapter - 1) * 4),
  };

  // Chronicle accumulated
  codex.chronicle = buildChronicle(chapter);

  // Memoir: short narrative summary (realistic length)
  codex.memoir = [
    'The hero arrived from the high passes seeking the truth behind the sealed citadel.',
    'Three factions converge on the vault: Karos\'s mandate, the old order\'s last knight, and the hidden chancellor.',
    'The warden-construct stands between the vault and all of them, bound to a mandate older than the conflict.',
  ].slice(0, Math.ceil(chapter / 5));

  // Build all logs up to this chapter (4 turns per chapter)
  const totalTurns = chapter * 4;
  const logs = [];
  for (let t = 0; t < totalTurns; t += 1) {
    const ch = Math.floor(t / 4);
    logs.push(makeTurnEntry(t, ch));
  }

  return {
    id: `deep-campaign-ch${chapter}`,
    title: 'The Three Seals',
    hero: HERO,
    codex,
    logs,
  };
}

// Pre-export the five checkpoint chapters for use in the test
export const CHECKPOINTS = [1, 4, 8, 12, 15];
