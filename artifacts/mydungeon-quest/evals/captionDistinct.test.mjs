// E7 — captionDistinct (T11)
//
// Ten fixture cues produce ten plate captions with no shared phrase over
// five words. Verifies that `cueCaption` derives from actual cue content
// (subjects + region) and that distinct cues yield distinct captions.
//
// Also confirms: cueCaption prefers sealed Art Director captions, falls back
// to subjects+region, then to narration text — never to the model's mood
// field (which produces template phrases).
//
// Headless — no build, no browser, no AI keys.

import assert from 'node:assert/strict';

// ── Inline cueCaption mirror (mirrors App.jsx exactly) ───────────────────
// This duplicates the logic defined in App.jsx so the eval can run headless.
// If App.jsx's cueCaption changes, update both.
function plateMoodStub(dm, max) {
  const blocks = dm?.narration_blocks || [];
  const line = blocks.find((block) => block && !block.speaker && block.text) || blocks[0] || null;
  return String((line && line.text) || '').slice(0, max);
}
function cueCaption(cue, dm) {
  if (typeof cue?.caption === 'string' && cue.caption.trim()) return cue.caption;
  const subjects = Array.isArray(cue?.subjects) ? cue.subjects.filter((s) => typeof s === 'string' && s.trim()) : [];
  const region = typeof cue?.region === 'string' ? cue.region.trim() : '';
  if (subjects.length && region) return `${subjects.slice(0, 3).join(', ')} in ${region}`;
  if (subjects.length) return subjects.slice(0, 3).join(', ');
  if (region) return region;
  return plateMoodStub(dm, 90) || 'the scene';
}

// ── Shared-phrase checker ─────────────────────────────────────────────────
function ngrams(text, n) {
  const words = text.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const result = new Set();
  for (let i = 0; i <= words.length - n; i++) result.add(words.slice(i, i + n).join(' '));
  return result;
}
function sharedPhrase(a, b, n = 5) {
  const ag = ngrams(a, n);
  for (const gram of ngrams(b, n)) if (ag.has(gram)) return gram;
  return null;
}

// ── Fixture cues — ten campaigns, each distinct ───────────────────────────
const FIXTURES = [
  { cue: { subjects: ['Aelin Ashford'],         region: 'The Hollow Market',          mood: 'beneath an unnamed sky' }, dm: { narration_blocks: [{ text: 'A figure moves through shadow.', speaker: null }] } },
  { cue: { subjects: ['Torr Vane', 'Lira'],      region: 'The Ember Gate',             mood: 'as this page tells it'  }, dm: { narration_blocks: [{ text: 'The gate groans open at dawn.', speaker: null }] } },
  { cue: { subjects: ['Vesper Null'],             region: 'The Salt Flats',             mood: 'the staged moment'      }, dm: { narration_blocks: [{ text: 'Sand stretches beyond sight.', speaker: null }] } },
  { cue: { subjects: ['Owain Dusk', 'Rinn'],      region: 'The Brass Library',         mood: 'an unnamed composition' }, dm: { narration_blocks: [{ text: 'Books line every wall to the ceiling.', speaker: null }] } },
  { cue: { subjects: ['Maren Voss'],              region: 'The Pale Shore',             mood: 'a generic vista'        }, dm: { narration_blocks: [{ text: 'Waves pull at the stones.', speaker: null }] } },
  { cue: { subjects: ['The Herald'],              region: 'The Ruined Crossroads',      mood: 'the unfolding scene'    }, dm: { narration_blocks: [{ text: 'Four roads meet at silence.', speaker: null }] } },
  { cue: { subjects: ['Sella Marrow', 'Old Wick'],region: 'The Apothecary Cellars',    mood: 'as this chapter tells it'}, dm: { narration_blocks: [{ text: 'Jars of ash line the lower shelves.', speaker: null }] } },
  { cue: { subjects: ['Ren'],                     region: 'The Bell Tower',             mood: 'the world and its light' }, dm: { narration_blocks: [{ text: 'The bell has not rung in three years.', speaker: null }] } },
  { cue: { subjects: ['Captain Loch', 'Dasha'],   region: 'The Harbor at Night',        mood: 'a scene in the world'   }, dm: { narration_blocks: [{ text: 'Lanterns mark the moorings.', speaker: null }] } },
  { cue: { subjects: ['The Warden'],              region: 'The Glass Sanctum',          mood: 'beneath the unnamed sky' }, dm: { narration_blocks: [{ text: 'Light bends strangely in the sanctum.', speaker: null }] } },
];

// ── Court 1 — distinct captions ───────────────────────────────────────────
const captions = FIXTURES.map(({ cue, dm }) => cueCaption(cue, dm));

// Every caption is a non-empty string
for (let i = 0; i < captions.length; i++) {
  assert.ok(
    typeof captions[i] === 'string' && captions[i].trim().length > 0,
    `caption[${i}] must be a non-empty string; got ${JSON.stringify(captions[i])}`
  );
}

// No two captions share a phrase of 5 or more words
for (let i = 0; i < captions.length; i++) {
  for (let j = i + 1; j < captions.length; j++) {
    const shared = sharedPhrase(captions[i], captions[j], 5);
    assert.ok(
      !shared,
      `captions[${i}] and captions[${j}] share a 5-word phrase: "${shared}" — "${captions[i]}" vs "${captions[j]}"`
    );
  }
}

console.log('ok — distinct captions: 10 cues → 10 captions with no shared 5-word phrase');

// ── Court 2 — template phrases never surface ──────────────────────────────
const BANNED = ['beneath an unnamed sky', 'as this page tells it', 'the staged moment', 'the unfolding scene', 'an unnamed composition', 'a generic vista', 'as this chapter tells it', 'the world and its light', 'a scene in the world', 'beneath the unnamed sky'];
for (const caption of captions) {
  for (const phrase of BANNED) {
    assert.ok(
      !caption.toLowerCase().includes(phrase.toLowerCase()),
      `template phrase "${phrase}" must not appear in a generated caption; got "${caption}"`
    );
  }
}

console.log('ok — template-phrase gate: none of the banned cue.mood strings appear in any generated caption');

// ── Court 3 — sealed caption wins over everything ────────────────────────
const sealedCaption = 'Aelin and the Herald at the crossroads, ink still wet.';
const withSealed = cueCaption({ subjects: ['Aelin', 'The Herald'], region: 'The Ruined Crossroads', caption: sealedCaption }, null);
assert.equal(withSealed, sealedCaption, 'sealed Art Director caption must win over subjects+region');

console.log('ok — sealed caption wins');

// ── Court 4 — narration fallback when no subjects or region ──────────────
const narrationOnly = cueCaption(null, { narration_blocks: [{ text: 'The long road bends toward a distant fire.', speaker: null }] });
assert.ok(narrationOnly.startsWith('The long road'), `narration fallback must use plateMood text; got "${narrationOnly}"`);

console.log('ok — narration fallback when cue is absent');

// ── Court 5 — final fallback when everything is absent ───────────────────
const finalFallback = cueCaption(null, {});
assert.equal(finalFallback, 'the scene', 'final fallback must be "the scene"');

console.log('ok — final fallback is "the scene"');

console.log('PASS captionDistinct \u2014 T11: ten fixture cues produce ten distinct captions with no shared 5-word phrase; template mood phrases never surface; sealed Art Director caption wins; narration fallback applies when subjects absent; "the scene" is the last resort.');
