// ------------------------------------------------------------
// THE CENSUS-DOOR GATE — Directive VI, Phase 11.
//
// The census court (packages/engine/src/census.js, gate `census`)
// already proves the count itself. THIS gate proves the WIRING: the
// court sits at the server door inside the one-repair message, the
// standing rule rides the DM prompt in lockstep, and the client
// landing runs the same count before a turn becomes record.
// Keyless by law: no provider is consulted; the door is judged in
// its own words.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { judgeTurn } from '../server/dm.js';
import { censusNote } from 'fatescript/census';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');
const CENSUS_MARK = 'The record has no soul named';

// A skeletal turn: the shape validator will name its own violations —
// this gate asserts only on the census clause, which must join (or
// stay out of) the same one-repair message.
const input = {
  entropy: null,
  hero: { name: 'Bram' },
  story: { cast: [{ name: 'Mother Aldis' }] },
};
const turnWith = (blocks, cast_add = []) => ({
  narration_blocks: blocks,
  story: { cast_add },
});

// 1. A stranger joins the one-repair message, by name, via censusNote.
{
  const verdict = judgeTurn(turnWith([{ speaker: 'Wren', text: 'Halt.' }]), input);
  assert.equal(verdict.ok, false, 'a stranger at the door is not ok');
  const clause = verdict.errors.find((e) => e.includes(CENSUS_MARK));
  assert.ok(clause, 'the census clause joins the same repair message');
  assert.ok(clause.includes('Wren'), 'the stranger is named to the model');
  assert.equal(clause, censusNote(['Wren']), 'the clause is the census note verbatim — one law, one wording');
}

// 2. Counted souls pass the census in silence: standing cast, the hero,
//    the narrator's empty chair — and a soul added by THIS very turn.
{
  for (const blocks of [
    [{ speaker: 'Mother Aldis', text: 'Sit.' }],
    [{ speaker: 'Bram', text: 'I am here.' }],
    [{ speaker: null, text: 'Rain falls.' }],
  ]) {
    const verdict = judgeTurn(turnWith(blocks), input);
    assert.ok(!verdict.errors.some((e) => e.includes(CENSUS_MARK)), `no census clause for ${blocks[0].speaker ?? 'the narrator'}`);
  }
  const sameTurn = judgeTurn(
    turnWith([{ speaker: 'Wren', text: 'Halt.' }], [{ name: 'Wren', voice_card: { gender: 'feminine', age: 'young', timbre: 'reed' } }]),
    input,
  );
  assert.ok(!sameTurn.errors.some((e) => e.includes(CENSUS_MARK)), 'a soul added this turn may speak this turn');
}

// 3. The census never silences the shape validator: its clause JOINS the
//    validator's own findings rather than replacing them.
{
  const verdict = judgeTurn(turnWith([{ speaker: 'Wren', text: 'Halt.' }]), input);
  assert.ok(verdict.errors.length >= 2, 'shape violations and the census clause share one message');
  assert.equal(verdict.errors.filter((e) => e.includes(CENSUS_MARK)).length, 1, 'one census clause, however many strangers');
}

// 4. LOCKSTEP — the standing rule rides the prompt: the model is never
//    tried under a law it was not read.
{
  const prompt = read('src/lib/systemPrompt.js');
  assert.ok(prompt.includes('THE CENSUS'), 'the prompt names the census law');
  assert.ok(/THE CENSUS[\s\S]*cast_add[\s\S]*speaker null/.test(prompt), 'the rule demands cast_add or the narrator, as the court does');
}

// 5. The client landing keeps the same count: the turn is judged once
//    more where it becomes record, with the same pre-turn snapshot.
{
  const app = read('src/App.jsx');
  assert.ok(app.includes('unrecordedSouls(dm, base.codex.cast'), 'the landing runs the census on the pre-turn cast');
  assert.ok(app.includes('censusNote(strangers)'), 'the landing refuses in the census\u2019s own words');
}

console.log('PASS — the census door: a stranger joins the one-repair message by name (the census note verbatim, alongside the shape court, never instead of it), counted souls — cast, hero, narrator, and this turn\u2019s own cast_add — pass in silence, the standing rule rides the prompt in lockstep, and the client landing keeps the same count.');
