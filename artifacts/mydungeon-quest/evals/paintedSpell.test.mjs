// THE PAINTED SPELL GATE (Experience Directive XVIII, Article VI) — when a
// cast rides the turn, the spell's visual clause travels the ONE scene-brief
// road byte-intact: scrub-stable in the library, seated on the moment's own
// field at the easel, joined once in the engine's scene brief, mirrored at
// the re-lay door, and witnessed by the recorded promptHash. Keyless, pure.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPELL_TABLE, spellClauseFor } from 'fatescript/grimoire';
import { generationSpec, scenePrompt } from 'fatescript/cinema/prompts';

const at = (p) => new URL(p, import.meta.url);

// --- 1. The clause reader: the row's bytes or nothing ---
assert.equal(spellClauseFor(null), null, 'no story, no clause');
assert.equal(spellClauseFor({}), null, 'no cast, no clause');
assert.equal(spellClauseFor({ cast_spell: { caster: 'x', spell: 'no-such-craft' } }), null, 'an unknown spell paints nothing');
assert.equal(
  spellClauseFor({ cast_spell: { caster: 'Elaria', spell: 'fire bolt' } }),
  'a mote of orange flame streaking in a dead-straight line, ember tail',
  'the clause is the row\u2019s visual, byte for byte'
);

// --- 2. Scrub-stability is a LIBRARY law: every clause survives the road's
// whitespace fold untouched, so byte-intact is guaranteed, not hoped ---
for (const [key, row] of Object.entries(SPELL_TABLE)) {
  assert.equal(row.visual, row.visual.replace(/\s+/g, ' ').trim(), `${key} visual is already scrub-stable`);
}

// --- 3. The one road: every clause lands whole in the scene brief ---
const campaign = {
  styleBible: 'Muted oil-painting fantasy, weathered and grounded',
  lines: [], veils: [], logs: [], combat: null, hero: null,
  codex: { arc: { style_bible: 'Muted oil-painting fantasy, weathered and grounded' }, cast: [], regions: [], fixtures: [], bestiary: [], cards: [], blight: 0 }
};
const cue = { kind: 'scene', mood: 'quiet dread', subjects: [], region: null };
for (const [key, row] of Object.entries(SPELL_TABLE)) {
  const brief = scenePrompt(campaign, cue, { prose: '', seed: 's1', speaker: null, spellClause: row.visual });
  assert.ok(brief.includes(`The spell made visible, exactly this: ${row.visual}`), `${key} clause rides the brief byte-intact`);
}
const plain = scenePrompt(campaign, cue, { prose: '', seed: 's1', speaker: null });
assert.ok(!plain.includes('The spell made visible'), 'no cast, no rider — the brief stays silent');

// --- 4. The recorded brief: the attested promptHash witnesses the clause ---
const withClause = scenePrompt(campaign, cue, { prose: '', seed: 's1', speaker: null, spellClause: SPELL_TABLE['fire bolt'].visual });
const specWith = await generationSpec('paint', withClause, { kind: 'scene' });
const specWithout = await generationSpec('paint', plain, { kind: 'scene' });
assert.ok(specWith.promptHash && specWithout.promptHash, 'the foundry hashes every brief it records');
assert.notEqual(specWith.promptHash, specWithout.promptHash, 'the recorded hash binds the clause bytes — strip the clause, change the record');
assert.equal(specWith.promptHash, (await generationSpec('paint', withClause, { kind: 'scene' })).promptHash, 'the record is deterministic');

// --- 5. One road, no second assembly path (source-bound) ---
const appSource = readFileSync(at('../src/App.jsx'), 'utf8');
const seatBytes = '...(spellClauseFor(dm.story) ? { spellClause: spellClauseFor(dm.story) } : {})';
assert.equal(appSource.split(seatBytes).length - 1, 1, 'the easel seats the clause exactly once, on the moment\u2019s own field');
assert.ok(!appSource.includes('spellClause: dm'), 'no raw second seat at the easel');
const engineSource = readFileSync(at('../../../packages/engine/src/cinema/prompts.js'), 'utf8');
assert.equal(engineSource.split('The spell made visible, exactly this: ').length - 1, 1, 'the rider has one seat in the engine');
assert.ok(engineSource.includes('${beat}${spellLine}'), 'the rider joins the one scene brief, right behind the beat');
const mirrorSource = readFileSync(at('../tests/e2e/harvest.spec.ts'), 'utf8');
assert.ok(mirrorSource.includes('...(spellClauseFor(dm.story) ? { spellClause: spellClauseFor(dm.story) } : {})'), 'the re-lay mirror seats the same field (mirror law)');
assert.ok(engineSource.includes("export { spellClauseFor } from '../grimoire.js'"), 'the mirror\u2019s handle is a pointer to the one seat, never a copy');

console.log('PASS: the painted spell holds — every clause scrub-stable and riding the one scene-brief road byte-intact, the recorded hash witnessing it, no second assembly path');
