// THE FRAME LAW GATE (Directive IX) — the image cue is a claim about who
// stands in the painting, and the door judges the claim: the dead are not
// painted, the elsewhere is not painted, the unrecorded are not painted.
// Seated-court law throughout — each sub-court binds only where the
// briefing testifies, so the eval bench's bare {cast} context keeps its
// old leniency and the app's full landing context gets the full law.
// The two easel clauses are byte-stable: THE CLOSURE CLAUSE ends every
// subject-bearing scene brief, THE PRINCIPAL CLAUSE crowns the cue's
// first subject only when the roster paints a seatable soul by that name.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateDmTurn, safeFallbackTurn } from 'fatescript/protocol';
import { identityClause, scenePrompt } from '../src/lib/cinema/prompts.js';

const base = safeFallbackTurn('', 1);
const cueTurn = (cue, story = null) => ({ ...base, image_cue: cue, story });
const doorErrors = (cue, context, story = null) =>
  validateDmTurn(cueTurn(cue, story), [], context).errors.filter((line) => line.includes('image_cue'));

// ---- shape law (bare context — the law every caller keeps) ----
assert.equal(validateDmTurn(cueTurn({ kind: 'scene', subjects: ['Edda'] }), [], {}).ok, true, 'a bare-context cue keeps its old shape law');
assert.equal(doorErrors({ kind: 'scene', subjects: ['Edda'], crowd: 'none' }, {}).length, 0, 'crowd none is lawful');
assert.equal(doorErrors({ kind: 'scene', subjects: ['Edda'], crowd: 'background' }, {}).length, 0, 'crowd background is lawful');
assert.ok(doorErrors({ kind: 'scene', subjects: ['Edda'], crowd: 'mob' }, {}).some((line) => line.includes('image_cue.crowd holds a word the law does not know: mob')),
  'an unknown crowd word is refused by name');
assert.ok(doorErrors({ kind: 'scene', subjects: ['X'] }, {}).some((line) => line.includes('image_cue.subjects entries must be 2-80 character names')),
  'a one-letter subject fails the name shape');

// ---- the dead are not painted (seats iff cast rides) ----
assert.ok(doorErrors({ kind: 'scene', subjects: ['Edda'] }, { cast: [{ name: 'Edda Thornwake', status: 'dead' }] })
  .some((line) => line.includes('image_cue paints the dead: Edda is dead and is not painted')),
  'a first-name alias reaches its dead soul');
assert.equal(doorErrors({ kind: 'scene', subjects: ['Edda'] }, { cast: [{ name: 'Edda Thornwake', status: 'dead' }, { name: 'Edda Marsh', status: 'alive' }] }).length, 0,
  'an ambiguous name that could mean a living soul is presumed living');
assert.ok(doorErrors({ kind: 'portrait', subjects: ['Edda'] }, { cast: [{ name: 'Edda Thornwake', status: 'dead' }] })
  .some((line) => line.includes('paints the dead')), 'portrait cues answer the same court');

// ---- the unrecorded are not painted (seats iff cast AND hero ride) ----
assert.ok(doorErrors({ kind: 'scene', subjects: ['Nobody Such'] }, { hero: 'Maren', cast: [{ name: 'Edda', status: 'alive' }] })
  .some((line) => line.includes('image_cue names a soul the record does not hold: Nobody Such')),
  'with the hero seated, an unrecorded name is refused by name');
assert.equal(doorErrors({ kind: 'scene', subjects: ['Nobody Such'] }, { cast: [{ name: 'Edda', status: 'alive' }] }).length, 0,
  'without the hero seat the unnamed court does not sit — the eval bench keeps its leniency');
assert.equal(doorErrors({ kind: 'scene', subjects: ['Maren'] }, { hero: 'Maren', cast: [] }).length, 0, 'the hero is always lawful to paint');

// ---- the elsewhere is not painted (seats iff presence + party + scene) ----
const groundContext = {
  hero: 'Maren',
  cast: [{ name: 'Corin Voss', status: 'alive' }],
  party: [],
  presence: [{ name: 'Corin Voss', ground: 'The Duchy' }],
  scene: { region: 'Larkspur Vale' },
};
assert.ok(doorErrors({ kind: 'scene', subjects: ['Corin Voss'] }, groundContext)
  .some((line) => line.includes('image_cue paints the elsewhere: Corin Voss last stood in The Duchy, not Larkspur Vale')),
  'a soul the record holds elsewhere is refused by name and ground');
assert.equal(doorErrors({ kind: 'scene', subjects: ['Corin Voss'] }, { ...groundContext, party: ['Corin Voss'] }).length, 0,
  'a party member travels with the scene');
assert.equal(doorErrors({ kind: 'scene', subjects: ['Corin Voss'] }, { ...groundContext, scene: null }).length, 0,
  'genesis rides free — a null scene seats no ground court');
assert.equal(doorErrors({ kind: 'scene', subjects: ['Corin Voss'] }, { ...groundContext, presence: [] }).length, 0,
  'whereabouts unknown — nothing to testify');
assert.equal(doorErrors({ kind: 'scene', subjects: ['Corin Voss'] }, groundContext, { party_join: { name: 'Corin Voss' } }).length, 0,
  'a soul seated by this same turn\'s party_join is exempt at the cue court (the party court speaks for the join itself)');
assert.equal(doorErrors({ kind: 'scene', subjects: ['Vessarine'] }, { hero: 'Maren', cast: [] }, { cast_add: [{ name: 'Vessarine' }] }).length, 0,
  'a soul introduced by this same turn\'s cast_add is exempt at the cue court (the cast court speaks for the add itself)');

// ---- the clauses at the easel — byte-stable, listless ----
const campaign = { styleBible: 'TESTBIBLE romantic oil', logs: [], codex: { arc: null, blight: 2, cast: [
  { name: 'Edda', role: 'family', visual: 'a grey shawl and flour-dusted hands', goal: 'hold the ferry-house', voice_card: { gender: 'feminine', age: 'elder', timbre: 'warm' } }
], regions: [{ name: 'Larkspur Vale', visual: 'terraced orchards under chalk', state: 'wounded' }] } };
const cue = { subjects: ['Edda'], region: 'Larkspur Vale', mood: 'dusk at the ferry' };
const moment = { prose: 'She waits by the water.', seed: 'turn-9' };
const brief = scenePrompt(campaign, cue, moment);
const eddaClause = identityClause(campaign.codex.cast[0]);
assert.ok(brief.includes(`Principal presence: Edda, ${eddaClause} — this figure leads the composition, foremost in position and focus; any other named soul stands near enough that face and mark read true, never reduced to a distant background figure.`),
  'the principal clause crowns the first subject by her identity clause, byte-stable');
assert.ok(brief.includes('The frame is closed: the only figures in this frame are the named painted souls — no other person, figure, or silhouette of any kind stands in frame.'),
  'the closure clause ends the brief, byte-stable');
const crowdBrief = scenePrompt(campaign, { ...cue, crowd: 'background' }, moment);
assert.ok(crowdBrief.includes('The frame is closed except its granted crowd: beyond the named painted souls, only an indistinct distant background crowd may stand — unidentifiable figures, no readable face, no named soul among them.'),
  'a granted crowd rides its own closure clause');
assert.ok(!crowdBrief.includes('The frame is closed: the only figures'), 'one closure clause at a time');
assert.equal(crowdBrief, scenePrompt(campaign, { ...cue, crowd: 'background' }, moment), 'same cue, same bytes');
const strangerFirst = scenePrompt(campaign, { subjects: ['Aaa Nobody', 'Edda'], region: 'Larkspur Vale', mood: 'dusk' }, { prose: 'x', seed: 's', speaker: 'Edda' });
assert.ok(!strangerFirst.includes('Principal presence:'),
  'a first subject the roster cannot seat as a soul earns no principal clause');
assert.ok(strangerFirst.includes('The frame is closed:'), 'the closure clause still rides while any soul is painted');
const nobodyBrief = scenePrompt(campaign, { subjects: [], region: 'Larkspur Vale', mood: 'empty road' }, null);
assert.ok(!nobodyBrief.includes('The frame is closed'), 'a subjectless brief carries no closure clause — there is no roster to close');

// ---- the visual bible grew in place (same single PASS line) ----
const bibleSource = fs.readFileSync(new URL('./visualBible.test.mjs', import.meta.url), 'utf8');
assert.ok(bibleSource.includes('Principal presence') && bibleSource.includes('The frame is closed'),
  'the visual bible gate pins the frame clauses too — the growth is proven in place');

console.log('PASS — the frame law gate: the door refuses the dead, the elsewhere, and the unrecorded by name under seated-court law; crowd speaks only its two lawful words; the closure and principal clauses ride the easel byte-stable.');
