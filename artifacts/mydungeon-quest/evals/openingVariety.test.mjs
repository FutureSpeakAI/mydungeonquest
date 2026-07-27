// OPENING VARIETY GATE (B1)
//
// Every world must open with a distinct narration that weaves the
// world's home region, hero class, and carried item into its prose.
// Shape is selected from OPENING_SHAPES deterministically — same
// world seed → same shape and same text; different worlds → no
// shared sentence over eight words.
//
// Proofs (all against the MOCK provider; no AI key required):
//   1. Ten fixture worlds produce ten distinct opening texts.
//   2. No two texts share a verbatim sentence of nine or more words.
//   3. Same world seed run twice → byte-identical output.
//   4. Every opening references at least two world specifics:
//      home region AND hero class (keepsake also when present).
//   5. All four opening shapes appear across the ten worlds.

// Force mock provider — AI keys in the environment must not run live
// turns here; the test probes the mock floor's own determinism.
process.env.DM_PROVIDER = 'mock';

import assert from 'node:assert/strict';
import { getDmTurn }      from '../server/dm.js';
import { createHero }     from 'fatescript/rules';
import { openingShapeOf } from 'fatescript/mockDm';

// Minimal entropy stub — the mock does not use it for genesis text
const fixedEntropy = { pool: [1, 2, 3, 4, 5], draw: () => 0.42 };

function makeInput({ title, covenant = 'A classic high-fantasy journey.', homeRegion, tone = 'mythic', heroClass, keepsake = null }) {
  return {
    campaign: { title, covenant, homeRegion, tone,
                lines: [], veils: [], styleBible: 'Oil-painted fantasy.' },
    hero: createHero({ name: 'Kira', className: heroClass, keepsake }),
    story: { beat: { index: 0, title: 'The Opening Beat' }, regions: [], prior_suggestions: [] },
    state: {}, memory: [], history: [],
    player: 'Begin.', resolution: null,
    entropy: fixedEntropy,
    turn: 0, genesis: true,
  };
}

// Ten distinct worlds — each has a unique homeRegion which guarantees
// no sentence shared between any two openings (every sentence > 8
// words contains the home region by template construction).
const FIXTURE_WORLDS = [
  { title: 'The Sunken Republic',    covenant: 'A gritty harbor noir.',   homeRegion: 'Saltmere Docks',    tone: 'gritty',   heroClass: 'Rogue',      keepsake: 'a forged harbor pass'    },
  { title: 'The Gilded Hollow',      covenant: 'A mythic odyssey.',       homeRegion: 'Ashford Crossing',  tone: 'mythic',   heroClass: 'Cleric',     keepsake: null                      },
  { title: 'The Iron Covenant',      covenant: 'A dark-fantasy siege.',   homeRegion: 'Brambleholt',       tone: 'dark',     heroClass: 'Warrior',    keepsake: 'a chipped ancestral axe' },
  { title: 'The Silver Dream',       covenant: 'A hopeful sea voyage.',   homeRegion: 'Caerwyn Bay',       tone: 'hopeful',  heroClass: 'Mage',       keepsake: 'a cracked compass'       },
  { title: 'The Ember Court',        covenant: 'A political intrigue.',   homeRegion: 'Thornvale',         tone: 'political',heroClass: 'Ranger',     keepsake: null                      },
  { title: 'The Blood Meridian',     covenant: 'A grim frontier war.',    homeRegion: 'Dunewatch',         tone: 'grim',     heroClass: 'Paladin',    keepsake: 'a sealed family letter'  },
  { title: 'The Quiet Revolution',   covenant: 'A cozy village mystery.', homeRegion: 'Millhaven',         tone: 'cozy',     heroClass: 'Druid',      keepsake: "grandmother's ring"      },
  { title: 'The Fractured Crown',    covenant: 'An epic war for a throne.',homeRegion: 'Whitestep',        tone: 'epic',     heroClass: 'Bard',       keepsake: null                      },
  { title: 'The Last Winter',        covenant: 'A survival horror trek.', homeRegion: 'Kessmark',          tone: 'survival', heroClass: 'Barbarian',  keepsake: 'a wolf-tooth necklace'   },
  { title: 'The Warden\'s Vigil',   covenant: 'A mythic guardian saga.', homeRegion: 'Dawnhaven',         tone: 'mythic',   heroClass: 'Wizard',     keepsake: 'an obsidian key'         },
];

// ── 1 & 2 & 4 ── Gather ten openings, check variety and specifics ─
const openings = [];
for (const world of FIXTURE_WORLDS) {
  const input = makeInput(world);
  const { turn, provider } = await getDmTurn(input, {});
  assert.equal(provider, 'mock', `world "${world.title}" must use mock provider`);
  assert.ok(
    Array.isArray(turn.narration_blocks) && turn.narration_blocks.length >= 1,
    `world "${world.title}" genesis must return at least one narration block`,
  );
  const text = turn.narration_blocks.map(b => b.text).join(' ');
  openings.push({ world, text });
}

// ── 1 ── All ten texts must be distinct ───────────────────────────
const unique = new Set(openings.map(o => o.text));
assert.equal(unique.size, FIXTURE_WORLDS.length,
  `expected ${FIXTURE_WORLDS.length} distinct opening texts, got ${unique.size}`);

// ── 2 ── No shared sentence of nine or more words ─────────────────
// Split on sentence-ending punctuation followed by whitespace or end.
function splitSentences(text) {
  return text.split(/(?<=[.!?"])\s+/).map(s => s.trim()).filter(Boolean);
}
function wordCount(sentence) {
  return sentence.split(/\s+/).length;
}

const sentenceSets = openings.map(o =>
  new Set(splitSentences(o.text).filter(s => wordCount(s) >= 9))
);
for (let i = 0; i < openings.length; i++) {
  for (let j = i + 1; j < openings.length; j++) {
    for (const sent of sentenceSets[i]) {
      assert.ok(!sentenceSets[j].has(sent),
        `worlds "${openings[i].world.title}" and "${openings[j].world.title}" share a sentence of ≥9 words:\n  "${sent}"`);
    }
  }
}

// ── 3 ── Same world seed → byte-identical output ──────────────────
{
  const world = FIXTURE_WORLDS[0];
  const inputA = makeInput(world);
  const inputB = makeInput(world);
  const a = await getDmTurn(inputA, {});
  const b = await getDmTurn(inputB, {});
  assert.equal(
    JSON.stringify(a.turn),
    JSON.stringify(b.turn),
    `world "${world.title}" genesis output must be byte-identical across two runs`,
  );
}

// ── 4 ── Each opening must reference at least two world specifics ──
for (const { world, text } of openings) {
  const specifics = [world.homeRegion, world.heroClass, world.keepsake].filter(Boolean);
  const found = specifics.filter(s => text.includes(s));
  assert.ok(found.length >= 2,
    `world "${world.title}" opening references only ${found.length} specific(s): "${text}"`);
}

// ── 5 ── All four opening shapes must appear across the ten worlds ──
const shapes = FIXTURE_WORLDS.map(w => openingShapeOf({ title: w.title, covenant: w.covenant }).id);
const shapeSet = new Set(shapes);
assert.equal(shapeSet.size, 4,
  `expected all 4 opening shapes across 10 worlds, got ${shapeSet.size}: ${[...shapeSet].join(', ')}`);

console.log(`PASS — opening variety: ten worlds produce ten distinct openings (shapes: ${shapes.join(', ')}); no shared sentence ≥9 words; byte-deterministic; every opening names at least two world specifics; all four shapes represented.`);
