// THE UNLETTERED-WORLD GATE (0.6.1, Task 53 §2) — one clause instead of
// seven nouns. The paint law's accumulated silence vocabulary is retired;
// ONE general clause (fatescript/unlettered) rides every builder exactly
// once, and the warden asks the text question of EVERY delivered plate:
// one repaint with the clause reinforced, then the plate is REFUSED and
// the refusal writes its note into the record. Identity still outranks
// text — a fallen face anchors, never refuses.
import assert from 'node:assert/strict';
import {
  UNLETTERED_WORLD, UNLETTERED_REINFORCEMENT, UNLETTERED_REFUSAL,
  unletteredBrief, parseUnlettered, unletteredRuling
} from 'fatescript/unlettered';
import { wardenBrief, parseVerdict, mockWarden, wardenRuling } from 'fatescript/warden';
import { applyStoryUpdates, initCodex } from '../src/lib/story.js';
import { scrubPrompt, portraitPrompt, regionPrompt, scenePrompt, keyArtPrompt } from '../src/lib/cinema/prompts.js';

// —— The clause itself: general, complete, with its lawful escape. ——
for (const noun of ['letters', 'signatures', 'watermarks', 'glyphs', 'runes', 'sigils', 'labels', 'maps', 'charts', 'inscriptions', 'epitaphs']) {
  assert.ok(UNLETTERED_WORLD.toLowerCase().includes(noun), `the clause covers ${noun}`);
}
assert.ok(UNLETTERED_WORLD.includes('legible or decorative writing'), 'legible and decorative writing alike');
assert.ok(UNLETTERED_WORLD.includes('faces the viewer'), 'scoped to surfaces facing the viewer');
assert.ok(UNLETTERED_WORLD.includes('turned away, in shadow, or beyond legibility'), 'the story-required escape hatch');

// —— The clause rides every builder exactly once, byte-stable. ——
const rides = (prompt) => prompt.split(UNLETTERED_WORLD).length - 1;
let codex = initCodex('classic-epic');
codex = applyStoryUpdates(codex, {
  cast_add: [{ name: 'Corin Voss', role: 'envoy', visual: 'a narrow face and clipped grey coat', goal: 'press the claim', voice_card: { gender: 'masculine', age: 'adult', timbre: 'clipped' } }],
  world: { region_add: { name: 'Larkspur Vale', visual: 'terraced orchards under chalk' } }
});
const campaign = { styleBible: 'BIBLE', covenant: 'the river covenant', homeRegion: 'Larkspur Vale', tone: 'mythic', hero: { name: 'Maren', mark: 'a burn in the shape of a key', presentation: 'feminine' }, codex, logs: [] };
const prompts = {
  portrait: portraitPrompt(campaign, { name: 'Corin Voss', goal: 'press the claim' }, 'bust'),
  region: regionPrompt(campaign, codex.regions.find((entry) => entry.name === 'Larkspur Vale')),
  scene: scenePrompt(campaign, { subjects: ['Corin Voss'], region: 'Larkspur Vale', mood: 'dusk' }, { prose: 'He set the letter on the stone.', speaker: 'Corin Voss', seed: 't9' }),
  keyart: keyArtPrompt(campaign)
};
for (const [name, prompt] of Object.entries(prompts)) {
  assert.equal(rides(prompt), 1, `the clause rides the ${name} builder exactly once`);
}
assert.equal(rides(scrubPrompt('bare words', {})), 1, 'scrubPrompt itself seats the clause exactly once');

// —— The noun-pile is retired: the old vocabulary no longer rides. ——
for (const relic of ['UNSIGNED work', 'weathered smudges', 'No text', 'not on roads, stones, skies']) {
  for (const [name, prompt] of Object.entries(prompts)) {
    assert.ok(!prompt.includes(relic), `the ${name} builder no longer carries "${relic}"`);
  }
}

// —— The warden asks the text question of every anchored plate. ——
assert.ok(wardenBrief({ bearingText: 'the bearing' }).includes('"contains_text_or_watermark"'), 'the likeness brief carries the question');
assert.equal(parseVerdict('{"same":true,"confidence":0.9,"signature_present":true,"contains_text_or_watermark":true,"drift":[]}').contains_text_or_watermark, true);
assert.equal(parseVerdict('{"same":true,"confidence":0.9,"signature_present":true,"contains_text_or_watermark":"true","drift":[]}').contains_text_or_watermark, false, 'strict boolean — a string never refuses a plate');
assert.equal(parseVerdict('{"same":true,"confidence":0.9,"signature_present":true,"drift":[]}').contains_text_or_watermark, false, 'absent reads false — old verdicts are unchanged');
assert.equal(mockWarden().contains_text_or_watermark, false, 'the floor never sees text');

// —— The ruling: one reinforced repaint, then refusal with its note. ——
const texted = parseVerdict('{"same":true,"confidence":0.92,"signature_present":true,"contains_text_or_watermark":true,"drift":[]}');
const first = wardenRuling(texted, { attempt: 1 });
assert.equal(first.action, 'repaint');
assert.equal(first.notes[0], UNLETTERED_REINFORCEMENT, 'the repaint carries the clause reinforced');
const second = wardenRuling(texted, { attempt: 2 });
assert.equal(second.action, 'refuse');
assert.equal(second.attest.warden, 'refused');
assert.equal(second.attest.reason, UNLETTERED_REFUSAL, 'the refusal writes its note into the record');

// —— Identity outranks text: a fallen face anchors, never refuses. ——
const fallen = parseVerdict('{"same":false,"confidence":0.9,"signature_present":true,"contains_text_or_watermark":true,"drift":["another face"]}');
assert.equal(wardenRuling(fallen, { attempt: 2 }).action, 'anchor', 'likeness law speaks first — the anchor is textless by its own minting');

// —— Text outranks the locket: the reinforcement note, not the feature note. ——
const marklessTexted = parseVerdict('{"same":true,"confidence":0.9,"signature_present":false,"contains_text_or_watermark":true,"drift":[]}');
assert.equal(wardenRuling(marklessTexted, { attempt: 1 }).notes[0], UNLETTERED_REINFORCEMENT);

// —— The single-image law for plates with no anchor to stand beside. ——
const brief = unletteredBrief();
assert.ok(brief.includes('IMAGE 1') && brief.includes('"contains_text_or_watermark"'), 'one image, the same question');
assert.ok(brief.includes('turned away or beyond legibility do not count'), 'the escape hatch rides the brief too');
assert.equal(parseUnlettered('```json\n{"contains_text_or_watermark": true, "confidence": 0.9}\n```').contains_text_or_watermark, true, 'fenced JSON parses');
assert.equal(parseUnlettered('static on the wire').malformed, true);
assert.equal(unletteredRuling(parseUnlettered('static on the wire'), { attempt: 2 }).action, 'pass', 'the judge\u2019s own failure never refuses a render');
assert.equal(unletteredRuling({ contains_text_or_watermark: false, confidence: 0.9, malformed: false }, { attempt: 1 }).action, 'pass');
assert.equal(unletteredRuling({ contains_text_or_watermark: false, confidence: 0, malformed: false, floor: true }, { attempt: 1 }).action, 'pass', 'the floor ships unjudged');
const seen1 = unletteredRuling({ contains_text_or_watermark: true, confidence: 0.9, malformed: false }, { attempt: 1 });
assert.equal(seen1.action, 'repaint');
assert.equal(seen1.notes[0], UNLETTERED_REINFORCEMENT);
const seen2 = unletteredRuling({ contains_text_or_watermark: true, confidence: 0.9, malformed: false }, { attempt: 2 });
assert.equal(seen2.action, 'refuse');
assert.equal(seen2.attest.reason, UNLETTERED_REFUSAL);

// —— Deterministic: same verdict, same ruling, byte for byte. ——
assert.equal(JSON.stringify(wardenRuling(texted, { attempt: 2 })), JSON.stringify(wardenRuling(texted, { attempt: 2 })));
assert.equal(JSON.stringify(unletteredRuling({ contains_text_or_watermark: true, confidence: 0.8, malformed: false }, { attempt: 1 })), JSON.stringify(unletteredRuling({ contains_text_or_watermark: true, confidence: 0.8, malformed: false }, { attempt: 1 })));

console.log('PASS — the unlettered-world gate: one clause rides every builder exactly once, the noun-pile is retired, the warden asks the text question of every plate, a second sighting refuses the plate, and the refusal writes its note into the record.');
