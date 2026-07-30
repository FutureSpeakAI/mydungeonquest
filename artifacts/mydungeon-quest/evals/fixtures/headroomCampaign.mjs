// ---------------------------------------------------------------------------
// HEADROOM CAMPAIGN FIXTURES — Work Order / Items 2 & 3
//
// Extends the deep-campaign fixture (12 souls, M1 baseline) with five
// configurations designed to answer the headroom-curve questions and to
// deliberately fire the famine path under controlled conditions.
//
// Configurations:
//  buildDeepCampaign16(ch)  — 16 souls (4 extras, all thread-holders → fullSet)
//  buildDeepCampaign20(ch)  — 20 souls (8 extras, all thread-holders → fullSet)
//  buildChainedSaga(ch)     — 12 souls + prior-volume memoir block
//  buildHeirsPresent(ch)    — 12 souls + 2 bond-4 heirs (kinship-immune)
//  buildFamineFixture()     — 11 NPCs in fullSet + 20 background REST souls
//
// Each configuration is independent and deterministic.
// ---------------------------------------------------------------------------

import { buildDeepCampaign } from './deepCampaign.mjs';

// ── Extra souls for 16-soul configuration (souls 13–16) ─────────────────────
// Made thread-holders so they enter fullSet with all known_facts.
const EXTRA_SOULS_A = [
  {
    name: 'Renne Valk',
    role: 'a court historian who survived the siege',
    visual: 'Slight, silver-haired, carries a document case that has been repaired many times',
    voice: 'Measured and archival, qualifies every sentence with its source',
    goal: 'Authenticate the original third seal warrant before it can be forged',
    secret: 'Is the only person who has read all three seal instruments in sequence',
    status: 'active',
    bond: 1,
    introduced_turn: 12,
    known_facts: [
      'Was the senior archivist at the citadel before the siege',
      'Fled with a copy of the third seal warrant hidden in her document case',
      'Knows that one of the three seals was never properly witnessed',
      'Has been living under an assumed name in the valley settlement for years',
      'Recognizes Vesna Sorell\'s work from margin annotations she left behind',
      'The warrant she carries is authentic; the one Karos holds may not be',
    ],
  },
  {
    name: 'Petra Kess',
    role: 'a deserter from Karos\'s forces who crossed the line',
    visual: 'Young, tightly wound, wears civilian clothes over soldier-cut posture',
    voice: 'Clipped, alert, watching doors',
    goal: 'Deliver the roster of Karos\'s agents inside the citadel to the right authority',
    secret: 'Karos ordered the third seal broken from the inside — Petra knows who did it',
    status: 'active',
    bond: 1,
    introduced_turn: 13,
    known_facts: [
      'Served three years in Karos\'s border company before defecting',
      'Carries a cipher that opens the sealed orders in Karos\'s document case',
      'Knows the identities of four agents currently inside the valley settlement',
      'Was ordered to watch the hero and report on their movements',
      'Has already sent one report to Karos — its content she will not disclose',
      'The order she defected over was not military; she calls it a murder order',
    ],
  },
  {
    name: 'Alun',
    role: 'the warden of the lower citadel stores',
    visual: 'Old, methodical, moves through the ruins without consulting a map',
    voice: 'Sparse, practical, trusts objects more than people',
    goal: 'Account for every item in the sealed stores before Karos\'s mandate takes effect',
    secret: 'One item in the stores has already been moved — he moved it himself',
    status: 'active',
    bond: 0,
    introduced_turn: 14,
    known_facts: [
      'Has maintained the lower stores continuously through the siege and after',
      'Knows the inventory of every sealed cache in the citadel\'s lower levels',
      'Refused to give Karos\'s men access even under threat',
      'The item he moved is in the vault Orreth has been seeking',
      'Can open the lower east wing without the warden-key — he has a second method',
      'Has been waiting fourteen years for someone with proper authority to arrive',
    ],
  },
  {
    name: 'Meron Cole',
    role: 'an itinerant judge whose authority crosses all three factions',
    visual: 'Weathered, carrying a sealed commission badge, neutral in bearing',
    voice: 'Precise as a court record, slow as someone who has watched people hang on fast words',
    goal: 'Determine the legal standing of all three seals under old charter law',
    secret: 'Already has an opinion — he will not share it until called upon to rule',
    status: 'active',
    bond: 1,
    introduced_turn: 15,
    known_facts: [
      'Holds the last active commission under the old chancellor\'s court',
      'Has ruled on seal disputes in three other jurisdictions',
      'Arrived at the valley settlement before the hero and has been watching',
      'Can invoke old charter law to nullify any seal that was improperly witnessed',
      'Is in correspondence with the second chancellor — through the ferryman',
      'His ruling, when given, cannot be appealed under the law all parties claim to honor',
    ],
  },
];

// ── Extra souls for 20-soul configuration (souls 17–20) ─────────────────────
const EXTRA_SOULS_B = [
  {
    name: 'Jossa Fenn',
    role: 'the ferryman\'s wife who knows more than she has said',
    visual: 'Steady-eyed, keeps her hands busy with repair work, rarely volunteers words',
    voice: 'Even and deliberate, measures what she releases',
    goal: 'Keep her husband and children safe from what he has been drawn into',
    secret: 'Knows her husband ferried Karos twice because she watched from the bank',
    status: 'active',
    bond: 1,
    introduced_turn: 16,
    known_facts: [
      'Lives at the river crossing and has watched traffic across it for twenty years',
      'Recognized Drenn the second time he crossed — from an older encounter she has never described',
      'Has not told her husband what she saw during the second crossing',
      'Keeps a written record of everything she has observed at the ferry',
      'The record is sealed in the compartment under the boat\'s stern boards',
      'Will not speak to the hero directly but will leave the record somewhere they can find it',
    ],
  },
  {
    name: 'The Written Voice',
    role: 'the sealed account left by the first chancellor before the siege',
    visual: 'A folio, cracked binding, sealed with a wax impression that matches nothing in current use',
    voice: 'Speaks only in writing — archaic legal form, never the first person',
    goal: 'Convey the original intent of the first seal to whoever can still act on it',
    secret: 'The folio names the forger of Karos\'s mandate — has done so for fourteen years',
    status: 'active',
    bond: 0,
    introduced_turn: 17,
    known_facts: [
      'Was written before the siege in anticipation of exactly this dispute',
      'Held by the warden-construct as part of its original commission',
      'Can only be read in full by someone the warden-construct recognizes as authorized',
      'Lysse can read it — she is the only one present who qualifies',
      'Contains the name the siege captain refuses to speak',
      'Once read in full, the dispute over the seals has a legal resolution under charter law',
    ],
  },
  {
    name: 'Orell the Younger',
    role: 'Orreth\'s sibling who knows what was left in the vault',
    visual: 'Younger version of Orreth\'s wiry nervousness, less careful about hiding it',
    voice: 'Fast and fragmented, tells the end before the beginning',
    goal: 'Find their sibling before Karos\'s people do',
    secret: 'Was in the vault after Orreth left — and took something Orreth doesn\'t know is gone',
    status: 'active',
    bond: 1,
    introduced_turn: 18,
    known_facts: [
      'Has been looking for Orreth for three months without finding them',
      'Entered the vault via a route Orreth mapped but never shared',
      'What they took from the vault is a sealed mandate addressed to the second chancellor',
      'Does not know what the mandate says — it is sealed with a lock they cannot open',
      'Karos\'s agents have been following them since they left the citadel',
      'Believes the item they took is what Karos\'s people are actually searching for',
    ],
  },
  {
    name: 'Captain Reave',
    role: 'the officer commanding Karos\'s outer cordon',
    visual: 'Professional, efficient, uncomfortable with the mandate he is executing',
    voice: 'Military precise, careful not to say more than ordered',
    goal: 'Execute his commission without becoming responsible for what follows it',
    secret: 'His orders include an instruction he has so far found reasons to delay',
    status: 'active',
    bond: 0,
    introduced_turn: 19,
    known_facts: [
      'Commands the company holding the upper approaches to the citadel',
      'Has been ordered to seal the citadel once Karos gives the word',
      'Does not know what Karos intends to do inside once the citadel is sealed',
      'Is aware that the legal standing of his commission is questionable',
      'Has already let two people through the cordon that his orders said to stop',
      'The instruction he is delaying would constitute a violation of charter law if executed',
    ],
  },
];

// ── Additional threads for 16-soul and 20-soul configs ───────────────────────
// These make the extra souls thread-holders, guaranteeing they enter fullSet.
const EXTRA_THREADS_A = [
  { label: 'Authenticate the third seal warrant before Karos can substitute it', kind: 'mystery', holder: 'Renne Valk', status: 'open', outcome: null },
  { label: 'Deliver Petra Kess\'s cipher to the archivist before Karos closes the road', kind: 'errand', holder: 'Petra Kess', status: 'open', outcome: null },
  { label: 'Find what Alun moved out of the sealed stores before Karos\'s men seal the lower levels', kind: 'mystery', holder: 'Alun', status: 'open', outcome: null },
  { label: 'Convince Meron Cole to invoke charter law before Karos\'s mandate takes formal effect', kind: 'promise', holder: 'Meron Cole', status: 'open', outcome: null },
];

const EXTRA_THREADS_B = [
  { label: 'Recover the record Jossa Fenn has hidden before Karos\'s agents find the ferry', kind: 'errand', holder: 'Jossa Fenn', status: 'open', outcome: null },
  { label: 'Have Lysse read the Written Voice before the warden-construct runs out of mandate', kind: 'promise', holder: 'The Written Voice', status: 'open', outcome: null },
  { label: 'Find Orell the Younger before Karos\'s agents catch up to them', kind: 'errand', holder: 'Orell the Younger', status: 'open', outcome: null },
  { label: 'Delay Captain Reave long enough for the legal challenge to reach him', kind: 'promise', holder: 'Captain Reave', status: 'open', outcome: null },
];

// ── Heir soul for heirs-present configuration ────────────────────────────────
// Bond 4 triggers the kinship immunity (XX.8) — this soul rides every pack
// regardless of scene activity.
const HEIR_SOUL = {
  name: 'Thorn Dorn',
  role: 'Caelith Dorn\'s younger sibling, newly arrived at the valley',
  visual: 'Younger version of the hero\'s build, wearing travelling clothes marked by a long road',
  voice: 'Direct and slightly breathless, still processing what they walked into',
  goal: 'Find their sibling and understand what they have become involved in',
  secret: 'Was sent by their family because someone warned them the citadel would be sealed soon',
  status: 'active',
  bond: 4,
  introduced_turn: 20,
  known_facts: [
    'Arrived at the valley settlement two days ago following the hero\'s trail',
    'Carries a letter from their family that includes a warning about someone at the citadel',
    'Does not know who wrote the warning — it was delivered anonymously',
    'The family sealed it; Thorn has not opened it yet',
    'Was told the hero would be in danger if they did not arrive before a specific date',
    'The date in question is tomorrow',
  ],
};

const HEIR_THREAD = {
  label: 'Open the sealed family letter with Thorn before the date it names arrives',
  kind: 'promise',
  holder: 'Thorn Dorn',
  status: 'open',
  outcome: null,
};

// ── Background souls for famine fixture ─────────────────────────────────────
// 20 souls with minimal data. NOT thread-holders, NOT recently active.
// These go into REST (slimmed to name/role/status/bond) and trigger the drop
// loop when the pack overflows. The drop loop removes them until under budget.
const BACKGROUND_SOULS = Array.from({ length: 20 }, (_, i) => ({
  name: `Background Soul ${String(i + 1).padStart(2, '0')}`,
  role: `a distant figure in the background of the tale (${i + 1})`,
  visual: `A figure seen once at the edge of the action, barely noticed`,
  voice: 'Has not spoken within earshot',
  goal: 'Unknown — irrelevant to the current scene',
  secret: null,
  status: 'active',
  bond: 0,
  introduced_turn: 200 + i, // far past any reasonable horizon — never recently active
  known_facts: [
    `Was present somewhere in the background during chapter ${(i % 15) + 1}`,
    'Has not been spoken of since',
    'Is unlikely to matter unless the tale takes an unexpected direction',
    'Their connection to the main cast is indirect and unstated',
    'They know one thing they have not said',
    'Nobody has asked them',
  ],
}));

// ── Prior-volume memoir entries for chained saga ─────────────────────────────
// A saga that chains from a prior volume carries a larger memoir block.
// These entries simulate a prior volume's narrative history.
const PRIOR_VOLUME_MEMOIR = [
  'In the first volume, the hero witnessed the breaking of the outer seal and fled the city before Karos consolidated control.',
  'The ferryman Tomas Fenn helped the hero cross the border river twice during the first volume, once with Aldric Mourne.',
  'Vesna Sorell made contact in the first volume at the archive; she passed the hero a partial copy of the second seal instrument.',
  'The hero learned in the first volume that the warden-construct was dormant but not destroyed, and that reactivation was possible.',
  'At the end of the first volume, the hero left the valley knowing the second chancellor was alive somewhere in the citadel.',
  'The first volume ended with the hero outside the citadel wall, the inner gate sealed behind them, and Karos still in control.',
  'Between volumes, the hero spent two months recovering from injuries sustained in the lower citadel during the first volume\'s final scene.',
  'The second chancellor passed word to the hero through the ferryman during the interval between volumes.',
];

// ── Extra souls 21–26 for the target-campaign configuration ─────────────────
// Six NPCs that bring buildDeepCampaign20 (19 souls) up to 25 souls.
// All are thread-holders so they enter fullSet at chapter 15.
const EXTRA_SOULS_C = [
  {
    name: 'Harl Tanner',
    role: 'a tanner who keeps the valley settlement\'s transaction ledger',
    visual: 'A stocky man in his forties, hands perpetually stained despite vigorous scrubbing, a leather apron that has survived more than one rough season',
    voice: 'Deliberate and suspicious, pauses before answering anything',
    goal: 'Protect the tannery records that document every transaction Karos\'s men have made in the valley',
    secret: 'The records he is protecting contain evidence of a transaction he was party to — not entirely unwillingly',
    status: 'active', bond: 1, introduced_turn: 20,
    known_facts: [
      'Has run the only tannery in the valley for eleven years',
      'Karos\'s men visited his tannery twice and left without explaining why',
      'The transaction ledger he keeps has two pages that do not match the rest of the binding',
      'Has already hidden a copy of the suspicious entries in a location he has not disclosed',
      'Is afraid of Meron Cole for reasons he will not state',
      'Knows which side of the road Karos\'s outer cordon cannot see',
    ],
  },
  {
    name: 'Serafine Lowe',
    role: 'a traveling herbalist whose knowledge predates the siege',
    visual: 'A slight woman in a heavy patchwork cloak, always carrying two satchels — one large and one small, the small one never opened in company',
    voice: 'Careful and layered, says the second thing she means before the first',
    goal: 'Find the source of the discoloration spreading through the valley\'s medicinal plants before it reaches the food crop',
    secret: 'The discoloration is not disease — she has seen it before, and it follows the same pattern as something introduced deliberately',
    status: 'active', bond: 1, introduced_turn: 21,
    known_facts: [
      'Has been traveling the region for three seasons studying the spread',
      'Her grandmother\'s notes describe the same discoloration from forty years ago, elsewhere',
      'The pattern she has mapped points to a specific location she is reluctant to name',
      'The small satchel contains samples she collected before the contamination reached them',
      'Karos\'s men showed no interest in her work, which she found more alarming than attention would have been',
      'She knows what cures the contamination; she does not know how to produce it here',
    ],
  },
  {
    name: 'Brother Cull',
    role: 'a wandering mendicant with a specific destination inside the citadel',
    visual: 'Gaunt in a rough grey robe with sandals too light for the season, eyes too sharp for someone claiming to want nothing',
    voice: 'Slow and resonant, uses silence as punctuation',
    goal: 'Reach the lower citadel chapel before the sealing of the citadel makes entry impossible',
    secret: 'The chapel contains a document sealed inside the altar that names him as the third chancellor\'s legitimate heir',
    status: 'active', bond: 0, introduced_turn: 22,
    known_facts: [
      'Has been walking toward the citadel for two months by a deliberately indirect route',
      'The doctrine he preaches is his own composition but was not invented without reason',
      'Has spoken to Meron Cole twice; both times the conversation ended abruptly',
      'Knows a route through the lower citadel that Captain Reave\'s cordon does not cover',
      'Carries a small wooden case at his belt and handles it with unusual care',
      'Has not told anyone what he is actually seeking inside the citadel',
    ],
  },
  {
    name: 'Mira the Ostler',
    role: 'keeper of the waystation stable at the crossroads',
    visual: 'A compact woman with short-cropped hair and a gait that implies years of ducking low doorways, hands strong enough to stop a horse mid-bolt',
    voice: 'Clipped and transactional, longer sentences when the topic earns them',
    goal: 'Keep the waystation operating as a neutral space regardless of which faction holds the roads',
    secret: 'Has been renting a stall to someone who arrives after dark and leaves before dawn and has been paid to ask no questions',
    status: 'active', bond: 1, introduced_turn: 23,
    known_facts: [
      'Has run the waystation for nine years, through three different road authorities',
      'Knows every rider who has passed through in the last six months by horse and gait if not by name',
      'The overnight guest has been absent for four days, breaking the established pattern',
      'Found something in the stall after the last visit that she has not disposed of or shown to anyone',
      'Is aware that Captain Reave\'s men watch the crossroads road; she watches them back',
      'Her loyalty to the waystation\'s neutrality is real but not unconditional',
    ],
  },
  {
    name: 'The Pale Merchant',
    role: 'a dealer in curios whose inventory changes between visits',
    visual: 'Unnervingly pale regardless of season, perpetually overdressed in fine dark cloth, never visibly cold or warm',
    voice: 'Warm and unhurried, as though the conversation has always been happening',
    goal: 'Locate and acquire a specific object that changes description each time the merchant refers to it',
    secret: 'Is not a merchant but a factor for a party the hero has not yet identified; the object is not a curio',
    status: 'active', bond: 0, introduced_turn: 24,
    known_facts: [
      'Has appeared in the valley settlement on three separate occasions with no visible transit between them',
      'Shows genuine interest in the hero\'s movements but claims it is professional curiosity',
      'Knows the Written Voice exists — and knows what it actually says',
      'The object being sought is not portable in the conventional sense; the merchant has not explained this',
      'Was seen speaking with Karos\'s silent companion before the first visit to the valley',
      'Has not given a name and has not been asked directly',
    ],
  },
  {
    name: 'Old Brennan',
    role: 'the valley\'s oldest resident, who remembers the first chancellor\'s original court',
    visual: 'A very old man, nearly blind, who navigates the settlement entirely by memory and sound, wrapped in wool regardless of the weather',
    voice: 'Slow and circular, reaches conclusions only after passing through them twice',
    goal: 'Record his account of the first chancellor\'s original ruling before he loses the memory of it',
    secret: 'Was present at the signing of the first seal and witnessed an irregularity that was never documented',
    status: 'active', bond: 1, introduced_turn: 25,
    known_facts: [
      'Is the only person alive who was present at all three original seal ceremonies',
      'His memory of the events is clear but his account does not match the official record',
      'Has been trying to dictate his account for a year but finds no one willing to write it down',
      'Will not speak about the irregularity unless the right question is asked in the right way',
      'Is aware that Meron Cole has read his testimony from a prior hearing; is not sure what to make of it',
      'Knows something about Karos\'s past that predates the siege by thirty years',
    ],
  },
];

const EXTRA_THREADS_C = [
  { label: 'Find what the tanner\'s suspicious ledger entries actually document', kind: 'mystery', holder: 'Harl Tanner', status: 'open', outcome: null },
  { label: 'Identify the source of the plant discoloration before it reaches the food crop', kind: 'mystery', holder: 'Serafine Lowe', status: 'open', outcome: null },
  { label: 'Reach the lower citadel chapel before it is sealed', kind: 'errand', holder: 'Brother Cull', status: 'open', outcome: null },
  { label: 'Discover what the overnight guest left behind in the waystation stall', kind: 'mystery', holder: 'Mira the Ostler', status: 'open', outcome: null },
  { label: 'Determine what object the pale merchant is actually seeking and for whom', kind: 'mystery', holder: 'The Pale Merchant', status: 'open', outcome: null },
  { label: 'Hear Old Brennan\'s account of the first seal irregularity before he loses the memory', kind: 'errand', holder: 'Old Brennan', status: 'open', outcome: null },
];

// A fifth region for the target campaign — the crossroads waystation where
// several of the extra souls operate.
const TARGET_REGION = {
  name: 'The Crossroads Waystation',
  visual: 'A low timber building at the junction of two ancient roads, ringed by a muddy yard and a stable that always seems half-full of horses whose owners are never visible',
  state: 'the waystation where the roads divide',
};

// ── Background souls for the new famine fixture ──────────────────────────────
// 20 background travelers. NOT thread-holders, NOT recently active.
// They go into REST (slim) and trigger the drop loop when the target-campaign
// pack overflows the new budget. The drop loop removes them until under budget.
// 100 background travelers — enough to push the target-campaign pack (24,796 chars)
// well above the new PACK_BUDGET (32,500 chars) and fire the drop loop.
// At ~102 chars per slim REST soul: 100 × 102 = ~10,200 extra chars → ~35,000
// chars unfenced, overflowing 32,500 by ~2,500 chars. The drop loop drops
// ~25 souls until the pack is under budget.
const NEW_FAMINE_BACKGROUND_SOULS = Array.from({ length: 100 }, (_, i) => ({
  name: `Wayfarer ${String(i + 1).padStart(2, '0')}`,
  role: `a wayfarer passing through the valley (${i + 1})`,
  visual: 'An unremarkable traveler, face weathered by the road, carrying what can be carried',
  voice: 'Has not spoken within earshot',
  goal: 'Reach the next waystation before nightfall',
  secret: null,
  status: 'active', bond: 0, introduced_turn: 200 + i,
  known_facts: [
    `Was seen on the road near the valley during chapter ${(i % 15) + 1}`,
    'Did not stop for longer than a meal',
    'Exchanged a few words with no one in particular',
    'Left no record of their passage',
    'Their connection to the main events is unclear',
    'Has not been seen since',
  ],
}));

// ── Build functions ───────────────────────────────────────────────────────────

/**
 * 16-soul campaign at chapter ch.
 * Adds 4 NPCs (thread-holders) to the base 12-soul fixture.
 * All extra souls are in fullSet at chapter 15 via thread-holder elevation.
 */
export function buildDeepCampaign16(chapter) {
  const base = buildDeepCampaign(chapter);
  base.codex.cast = [...base.codex.cast, ...EXTRA_SOULS_A.filter((s) => s.introduced_turn <= chapter * 4)];
  base.codex.threads = [...base.codex.threads, ...EXTRA_THREADS_A];
  base.id = `deep-campaign-16-ch${chapter}`;
  return base;
}

/**
 * 20-soul campaign at chapter ch.
 * Adds 8 NPCs (thread-holders) to the base 12-soul fixture.
 */
export function buildDeepCampaign20(chapter) {
  const base = buildDeepCampaign16(chapter);
  base.codex.cast = [...base.codex.cast, ...EXTRA_SOULS_B.filter((s) => s.introduced_turn <= chapter * 4)];
  base.codex.threads = [...base.codex.threads, ...EXTRA_THREADS_B];
  base.id = `deep-campaign-20-ch${chapter}`;
  return base;
}

/**
 * Chained-saga campaign at chapter ch.
 * 12 souls + prior-volume memoir block (8 entries, ~100 chars each).
 * The larger memoir increases the storyBlock `memoir` field, which rides
 * the pack. This tests whether a campaign linked to a prior volume pushes
 * the pack over budget on its own.
 */
export function buildChainedSaga(chapter) {
  const base = buildDeepCampaign(chapter);
  // Prepend prior-volume memoir entries to the existing memoir
  base.codex.memoir = [...PRIOR_VOLUME_MEMOIR, ...base.codex.memoir];
  base.id = `chained-saga-ch${chapter}`;
  return base;
}

/**
 * Heirs-present campaign at chapter ch.
 * 12 souls + 2 high-bond heirs (bond: 4, kinship-immune under XX.8).
 * The heirs are retained even when famine would otherwise drop them,
 * because they satisfy `(soul.bond ?? 0) >= 3`.
 */
export function buildHeirsPresent(chapter) {
  const base = buildDeepCampaign(chapter);
  base.codex.cast = [...base.codex.cast, HEIR_SOUL];
  base.codex.threads = [...base.codex.threads, HEIR_THREAD];
  base.id = `heirs-present-ch${chapter}`;
  return base;
}

/**
 * Target campaign — chapter 15, 25 souls, 5 regions.
 *
 * This is the "real play should support this" shape for the Work Order /
 * Part 3 budget derivation. It combines:
 *   - buildDeepCampaign20 base (19 souls, 4 regions)
 *   - 6 extra thread-holding souls (EXTRA_SOULS_C) → 25 souls total
 *   - 5th region (TARGET_REGION)
 *   - prior-volume memoir block (chained saga)
 *
 * The unfenced pack at chapter 15 is the measurement used to derive
 * PACK_BUDGET (see packages/engine/src/graph.js for derivation comment).
 */
export function buildTargetCampaign(chapter) {
  const base = buildDeepCampaign20(chapter);
  base.codex.cast    = [...base.codex.cast, ...EXTRA_SOULS_C.filter((s) => s.introduced_turn <= chapter * 4)];
  base.codex.threads = [...base.codex.threads, ...EXTRA_THREADS_C];
  base.codex.regions = [...base.codex.regions, TARGET_REGION];
  // Chained saga: prepend prior-volume memoir
  base.codex.memoir  = [...PRIOR_VOLUME_MEMOIR, ...base.codex.memoir];
  base.id = `target-campaign-ch${chapter}`;
  return base;
}

/**
 * New famine fixture — chapter 15 target campaign (25 souls) + 20 background
 * wayfarer REST souls. The wayfarers push the unfenced pack well above the
 * new PACK_BUDGET, firing the drop loop. All 25 named souls survive (scene
 * floor + thread-holders + heirs); only wayfarers are dropped or slimmed.
 *
 * Wayfarer introduced_turn = 200+ — far past any horizon — so they are never
 * recently active and go into REST. They have no threads and are not bound to
 * in-scene souls, making them the first candidates for the drop loop.
 */
export function buildNewFamineFixture() {
  const base = buildTargetCampaign(15);
  base.codex.cast = [...base.codex.cast, ...NEW_FAMINE_BACKGROUND_SOULS];
  base.id = 'new-famine-fixture-ch15';
  return base;
}

/**
 * Famine fixture — chapter 15 base (11 NPCs all in fullSet) + 20 background

 * REST souls. The background souls are slimmed to ~85 chars each, adding
 * 20 × 85 ≈ 1,700 chars. The base pack is ~6,482 chars. Total ≈ 8,182 chars,
 * exceeding the 7,000 budget by ~1,182 chars. The drop loop fires, discarding
 * ~14 background souls until the pack is under budget.
 *
 * All background souls have introduced_turn=200+ — far past any horizon —
 * so they are never recently active and go into REST (not fullSet).
 * They have no threads and are not tied to in-scene souls.
 */
export function buildFamineFixture() {
  const base = buildDeepCampaign(15);
  base.codex.cast = [...base.codex.cast, ...BACKGROUND_SOULS];
  base.id = 'famine-fixture-ch15';
  return base;
}
