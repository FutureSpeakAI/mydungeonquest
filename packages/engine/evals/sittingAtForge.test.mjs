// THE SITTING GATE — the Likeness Law's first half at the forge
// (twin of the table's gate, the pure fraction). A face is accepted,
// not assigned: three chairs of one unvarying identity open from the
// hero's own bearing, the blessing is once and final, a stranger is
// refused, NO SHEET BEFORE THE BLESSING — the six-view turnaround
// mints only from the accepted anchor — and the Floor owes no
// sitting: parchment is exempt while the illuminated tier binds.
// Zero keys, deterministic.
//
// The wiring fraction (the Forge component opening the sitting from
// its own hero, the tier asked before a chair is offered, the law
// spoken to the patron, the blessed face travelling with the forge,
// and the compat lib's engine door) is React/component source and is
// judged at the table's own gate — the engine has no forge to render.
import assert from 'node:assert/strict';
import { CANDIDATE_COUNT } from '../src/sitting.js';
import { openHeroSitting as openSitting, blessSitting, sittingSheet, sittingRequired, heroBearingText } from '../src/forge.js';

const HERO = { name: 'Aldric', bearing: 'Weather-worn leathers and a road-warden\u2019s longbow', mark: 'a streak of white at the temple' };

// 1. THREE CHAIRS, ONE IDENTITY — the bearing travels verbatim into
//    every brief; only the staging differs; the same hero is offered
//    the same sitting every time.
{
  const sitting = openSitting(HERO);
  assert.equal(sitting.status, 'unblessed');
  assert.equal(sitting.candidates.length, CANDIDATE_COUNT);
  assert.deepEqual(sitting.candidates.map((c) => c.id), ['hearthlight', 'dawn', 'candle']);
  const identity = heroBearingText(HERO);
  assert.ok(identity.includes('Marked: a streak of white at the temple.'), 'the mark rides the identity block');
  for (const candidate of sitting.candidates) {
    assert.ok(candidate.brief.includes(identity), 'the identity is verbatim in every chair');
    assert.ok(candidate.brief.includes('plain, neutral ground'), 'a soul sits with identity isolated');
  }
  const briefs = sitting.candidates.map((c) => c.brief);
  assert.equal(new Set(briefs).size, CANDIDATE_COUNT, 'the variation is staging, never the person');
  assert.equal(JSON.stringify(openSitting(HERO)), JSON.stringify(sitting), 'the same soul, the same three chairs');
  const reworn = openSitting({ ...HERO, bearing: 'A scholar\u2019s robe, ink-stained to the elbow' });
  assert.notEqual(reworn.candidates[0].brief, sitting.candidates[0].brief, 'a new identity seats a new sitting');
}

// 2. THE BLESSING — once, and final; a stranger never sits.
{
  const sitting = openSitting(HERO);
  const blessed = blessSitting(sitting, 'dawn', 4);
  assert.equal(blessed.ok, true);
  assert.equal(blessed.sitting.status, 'blessed');
  assert.deepEqual(blessed.sitting.blessed, { id: 'dawn', turn: 4 });
  const again = blessSitting(blessed.sitting, 'candle');
  assert.equal(again.ok, false);
  assert.ok(again.reason.includes('already blessed'), 'a face is accepted once');
  const stranger = blessSitting(sitting, 'noonday');
  assert.equal(stranger.ok, false);
  assert.ok(stranger.reason.includes('no such candidate'), 'a stranger never sits');
}

// 3. NO SHEET BEFORE THE BLESSING — the turnaround refuses whole while
//    the sitting stands unblessed, and mints six views from the
//    accepted anchor after.
{
  const sitting = openSitting(HERO);
  const refused = sittingSheet(sitting);
  assert.equal(refused.ok, false, 'no sheet before the blessing');
  assert.ok(refused.reason.includes('no sheet before the blessing'), 'refused in the law\u2019s own words');
  const blessed = blessSitting(sitting, 'hearthlight', 2).sitting;
  const out = sittingSheet(blessed, heroBearingText(HERO));
  assert.equal(out.ok, true);
  assert.equal(out.sheet.views.length, 6, 'the six-view turnaround');
  assert.equal(out.sheet.anchor.candidateId, 'hearthlight', 'minted from the accepted anchor, no other');
  assert.ok(out.sheet.views.every((view) => view.prompt.includes('the blessed portrait as the anchor reference')), 'every view answers to the anchor');
  assert.equal(out.sheet.law.background, 'neutral', 'a soul\u2019s sheet keeps identity isolated');
  assert.equal(out.sheet.law.anchored, true);
}

// 4. THE FLOOR OWES NO SITTING — parchment exempt, the illuminated
//    tier binds, and the old word for it canonicalises.
{
  assert.equal(sittingRequired('parchment'), false, 'the Floor paints procedurally and owes no sitting');
  assert.equal(sittingRequired('illuminated'), true);
  assert.equal(sittingRequired('cinema'), true, 'the old word binds the same law');
}

console.log('PASS \u2014 the sitting gate (engine twin, pure fraction): three chairs of one unvarying identity open from the hero\u2019s own bearing with the mark riding the identity block, the blessing is once and final while strangers are refused, no sheet is minted before the blessing and the six-view turnaround answers only to the accepted anchor, parchment owes no sitting while the illuminated tier binds; the forge wiring is judged at the table\u2019s own gate.');
