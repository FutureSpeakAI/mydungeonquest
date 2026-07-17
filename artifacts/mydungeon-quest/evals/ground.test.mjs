// THE GROUND GATE (Directive VII.10) — the briefing names the ground by
// law. Byte-exact line, SECOND key, honest omission, name-only fallback,
// famine immunity, and the pack's two immunities for the standing region
// (the recent-text heuristic and the budget slim-trim are both bypassed).
import assert from 'node:assert/strict';
import { buildBriefing, buildContextPack } from '../src/lib/graph.js';
import { applyStoryUpdates, initCodex } from '../src/lib/story.js';

const visual = 'A terraced river vale under soft chalk light, orchards in white flower.';
let codex = initCodex('classic-epic');
codex = applyStoryUpdates(codex, { world: { region_add: { name: 'Larkspur Vale', visual } }, scene_set: { region: 'Larkspur Vale' } }, { turn: 0 });
const campaign = { hero: { name: 'Maren' }, codex, logs: [] };

const briefing = buildBriefing(campaign);
assert.equal(briefing.scene_ground, `The scene stands in Larkspur Vale — ${visual}`, 'the ground line is byte-exact: name, em-dash, visual');
assert.deepEqual(Object.keys(briefing).slice(0, 2), ['calendar', 'scene_ground'], 'the ground is the SECOND key, right after the calendar');
assert.equal(briefing.scene_state.region, 'Larkspur Vale', 'the server court reads the same standing ground off the block');

const silent = buildBriefing({ hero: { name: 'Maren' }, codex: initCodex('classic-epic'), logs: [] });
assert.ok(!('scene_ground' in silent), 'no scene, no key — an honest omission, never an empty string');

const orphanCodex = { ...codex, regions: [], scene: { region: 'The Sunken Court', sinceTurn: 2 } };
const orphan = buildBriefing({ hero: { name: 'Maren' }, codex: orphanCodex, logs: [] });
assert.equal(orphan.scene_ground, 'The scene stands in The Sunken Court.', 'a region gone from the codex rides name-only');

// Famine: the budget may starve everything below it, but the ground and the
// calendar never fall — allegiances first, then the wealth line.
const starved = buildBriefing(campaign, { budget: 10 });
assert.equal(starved.scene_ground, `The scene stands in Larkspur Vale — ${visual}`, 'famine never touches the ground');
assert.ok(String(starved.calendar).startsWith('It is Day'), 'famine never touches the calendar');
assert.ok(!('hero_wealth' in starved), 'the wealth line fell to the famine');
assert.deepEqual(starved.stated_allegiances, [], 'the allegiances fell first');

// The pack: the standing region rides FULL past the recent-text heuristic,
// and the budget slim-trim may never slim it — it joins index-0 immunity.
let far = initCodex('classic-epic');
far = applyStoryUpdates(far, { world: { region_add: { name: 'First Home', visual: 'home hills' } } }, { turn: 0 });
far = applyStoryUpdates(far, { world: { region_add: { name: 'The Duchy', visual: 'slate banners over paved stone' } }, scene_set: { region: 'The Duchy' } }, { turn: 1 });
far = applyStoryUpdates(far, { world: { region_add: { name: 'The Fen', visual: 'black reeds' } } }, { turn: 2 });
const packCampaign = { hero: { name: 'Maren' }, codex: far, logs: [{ dm: { narration_blocks: [{ speaker: null, text: 'Quiet words that name nothing.' }] } }] };
const pack = buildContextPack(packCampaign);
assert.equal(pack.regions.find((region) => region.name === 'The Duchy').visual, 'slate banners over paved stone', 'the standing region rides FULL though no recent text names it');
assert.ok(!pack.regions.find((region) => region.name === 'The Fen').visual, 'an untouched, unstood region slims as ever');
const squeezed = buildContextPack(packCampaign, { budget: 1 });
assert.equal(squeezed.regions.find((region) => region.name === 'The Duchy').visual, 'slate banners over paved stone', 'the slim-trim may never slim the ground the tale stands on');
assert.equal(squeezed.regions.find((region) => region.name === 'First Home').visual, 'home hills', 'index-0 immunity is unchanged beside it');

console.log('PASS — the ground gate: byte-exact second-key ground line, honest omission, name-only fallback, famine immunity, and the pack\'s full-ride and slim-trim immunities for the standing region.');
