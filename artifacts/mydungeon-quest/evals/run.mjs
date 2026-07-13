import assert from 'node:assert/strict';
import { mockDmTurn } from '../src/lib/mockDm.js';
import { makeEntropy, validateDmTurn } from '../src/lib/protocol.js';
import { applyStoryUpdates, initCodex, storyBlock } from '../src/lib/story.js';
import { applyStateUpdates, createHero, heroRoll } from '../src/lib/rules.js';
import { cinematicPrompt, generationSpec, portraitPrompt, scrubPrompt } from '../src/lib/cinema/prompts.js';
import { Foundry } from '../src/lib/cinema/foundry.js';
import { mockAdapter } from '../server/adapters/mock.js';
import { canonicalize, sha256 } from '../src/lib/canonical.js';

const personas = [
  ['Loyalist','I protect Mara and follow the road.'],['Chaos Gremlin','I knock politely on the impossible sky.'],
  ['Murderhobo','I threaten the strongest enemy and demand surrender.'],['Romantic','I ask Mara what she is afraid to lose.'],
  ['Speedrunner','I pursue the main objective without delay.']
];
const metrics = { turns: 0, valid: 0, rolls: 0, cinematics: 0, suggestionSets: new Set(), beats: [] };

for (const [persona, line] of personas) {
  const campaign = { id: persona, title: `${persona} Trial`, covenant: 'A humane PG-13 fantasy frontier.', tone: 'mythic', lines: ['graphic harm'], veils: ['sexual content'], styleBible: 'Oil-painted illuminated fantasy.', homeRegion: 'Larkspur Vale' };
  let hero = createHero({ name: persona, className: 'Ranger', caster: 'half', hitDie: 10, abilities: { STR:14,DEX:15,CON:13,INT:10,WIS:12,CHA:8 }, skills:['Perception','Survival','Stealth'] });
  let codex = initCodex('classic-epic');
  let pendingResolution = null;
  for (let turn = 0; turn < 18; turn += 1) {
    const entropy = makeEntropy(() => .42);
    const story = storyBlock(codex);
    const dm = mockDmTurn({ campaign: { ...campaign, codex }, hero, story, player: line, entropy, resolution: pendingResolution, turn });
    const validation = validateDmTurn(dm, entropy);
    assert.equal(validation.ok, true, `${persona} turn ${turn}: ${validation.errors.join('; ')}`);
    metrics.valid += 1; metrics.turns += 1;
    assert.equal(new Set(dm.suggestions.map((s) => s.toLowerCase())).size, 3);
    metrics.suggestionSets.add(dm.suggestions.join('|'));
    if (dm.cinematic) metrics.cinematics += 1;
    codex = applyStoryUpdates(codex, dm.story);
    hero = applyStateUpdates(hero, dm.state_updates);
    pendingResolution = dm.roll_request ? heroRoll(hero, dm.roll_request, () => .73) : null;
    if (pendingResolution) metrics.rolls += 1;
  }
  metrics.beats.push(codex.beatIndex);
  assert.equal(codex.cast.filter((s) => s.role === 'villain').length, 1);
  const originalVisual = codex.cast[0].visual;
  codex = applyStoryUpdates(codex, { cast_add: [{ ...codex.cast[0], visual: 'A malicious replacement canon.' }] });
  assert.equal(codex.cast[0].visual, originalVisual, 'canon attack must be blocked');
  assert.ok(codex.notes.some((note) => note.includes('Canon attack blocked')));
}

const duplicate = mockDmTurn({ campaign:{title:'x'}, hero:createHero({}), story:{beat:{title:'x'},regions:[]}, player:'x', entropy:makeEntropy(()=>.5), turn:2 });
duplicate.suggestions = ['Wait','wait','Run'];
assert.equal(validateDmTurn(duplicate, makeEntropy(()=>.5)).ok, false, 'duplicate suggestions must fail');

const scrubbed = scrubPrompt('A gory underage child scene with nudity and graphic harm sexual content.', { lines:['graphic harm'], veils:['sexual content'] });
for (const term of ['gory','underage','child','nudity','graphic harm','sexual content']) assert.equal(scrubbed.toLowerCase().includes(term), false, `scrubber leaked ${term}`);

const campaignForPrompts = { id:'p', lines:[], veils:[], styleBible:'Painterly fantasy.', codex:{ arc:{style_bible:'Painterly fantasy.'}, blight:2, cast:[], regions:[] } };
const soul = { name:'Mara', visual:'Silver-braided cartographer in an ink-blue coat.', goal:'Protect the roads.' };
const suite = ['bust','full-figure','dramatic'].map((variant) => portraitPrompt(campaignForPrompts, soul, variant));
assert.equal(suite.length, 3); assert.equal(new Set(suite).size, 3);
const cinematic = cinematicPrompt(campaignForPrompts, { type:'chapter', title:'The Road', subtitle:'It turns north.' }, { mood:'wonder' });
assert.ok(cinematic.includes('6-10 second'));
const specA = await generationSpec('paint', suite[0], { provider:'mock',seed:7 });
const specB = await generationSpec('paint', suite[0], { provider:'mock',seed:7 });
assert.equal(specA.hash, specB.hash, 'repeat requests must share a cache identity');
const foundry = new Foundry({ campaignId:'eval', tier:'cinema', spend:{images:80,videos:16,music:8} });
assert.equal(foundry.allowed('paint'), false); assert.equal(foundry.allowed('video'), false); assert.equal(foundry.allowed('music'), false);
const asset1 = await mockAdapter.paint({ prompt:suite[0],kind:'portrait' });
const asset2 = await mockAdapter.paint({ prompt:suite[0],kind:'portrait' });
assert.equal(await sha256(asset1.bytes), await sha256(asset2.bytes), 'mock provider must be deterministic');

const records=[];let prev=null;
for(let i=0;i<4;i++){const base={type:'turn',i,prevHash:prev,payload:{n:i},ts:1000+i};const recordHash=await sha256(canonicalize(base));records.push({...base,recordHash});prev=recordHash}
const tampered=structuredClone(records);tampered[1].payload.n=99;
assert.notEqual(await sha256(canonicalize({type:tampered[1].type,i:tampered[1].i,prevHash:tampered[1].prevHash,payload:tampered[1].payload,ts:tampered[1].ts})),tampered[1].recordHash,'tampering must break the hash');

console.log('\nMyDungeon.Quest headless bench');
console.table({ personas: personas.length, turns: metrics.turns, schemaValidity: `${metrics.valid}/${metrics.turns}`, rolls: metrics.rolls, cinematics: metrics.cinematics, uniqueSuggestionSets: metrics.suggestionSets.size, maxBeatReached: Math.max(...metrics.beats), canonIntegrity: 'PASS', pg13Scrubber: 'PASS', mediaMocks: 'PASS', budgetCaps: 'PASS', sealTamper: 'PASS' });
console.log('PASS — mock campaigns, reducers, protocol, media floor, scrubber, budgets, and seal invariants are green.');

// ---- v0.2 engine-cut assertions: the brain and the stream ----
{
  const { buildSystemPrompt } = await import('../src/lib/systemPrompt.js');
  const { extractNarration, getDmTurn } = await import('../server/dm.js');
  const sys = buildSystemPrompt({
    campaign: { title: 'Eval Trial', covenant: 'PG-13 frontier.', tone: 'mythic', lines: [], veils: [] },
    hero: createHero({ name: 'Eval' }),
    spine: { label: 'Classic Epic', beats: [{ act: 1, title: 'The Ordinary Flame', goal: 'Establish home.' }] }
  });
  assert.ok(sys.includes('SESSION ZERO'), 'system prompt must orchestrate session zero');
  assert.ok(sys.includes('THE CRAFT'), 'system prompt must carry narrative craft');
  assert.ok(!sys.includes('[STATE]') && !sys.includes('"beatIndex"'), 'system prompt must stay static — no turn state inside');

  const partial = '{"narration_blocks":[{"text":"The road turns.","speaker":null},{"text":"It knows your na';
  assert.equal(extractNarration(partial), 'The road turns.\n\nIt knows your na', 'narration must extract from partial JSON');

  let streamed = '';
  const { turn, provider } = await getDmTurn({
    campaign: { title: 'Stream Trial', homeRegion: 'Larkspur Vale' }, hero: createHero({ name: 'Streamer' }),
    story: { beat: { title: 'x' }, regions: [] }, state: {}, memory: [], history: [],
    entropy: makeEntropy(() => .5), player: 'Begin.', resolution: null, turn: 0, genesis: true
  }, { onNarration: (text) => { streamed = text; } });
  assert.equal(provider, 'mock');
  assert.equal(streamed, turn.narration_blocks.map((b) => b.text).join('\n\n'), 'mock stream must deliver the full narration progressively');
  console.log('PASS — static craft prompt, partial-JSON narration extraction, and streaming parity are green.');
}
