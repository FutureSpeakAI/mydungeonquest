// ------------------------------------------------------------
// THE SHARED SKY GATE (game) — Directive V, Phase 5.
//
// One sky over every world: the same season and world read the same
// note; the off-switch is silence; the note is bounded; and the omen
// NEVER writes itself into canon — after a turn in which the DM
// ignores it, the codex holds no omen text. The house publishes the
// feed; the fixture seasons stand when the feed cannot be reached,
// so a fork owes nothing. Zero keys, deterministic throughout.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');

const { skyNote, currentSeason, FIXTURE_SEASONS, SKY_NOTE_MAX } = await import('fatescript/sky');
const { fetchSeasons, skyNoteFor } = await import('../src/lib/sky.js');
const { applyStoryUpdates } = await import('fatescript/story');
const { fixtureCodex } = await import('../../../packages/engine/evals/fixtures.mjs');

const NOW = Date.UTC(2026, 6, 16);
const world = { id: 'sky-tale', sky: undefined };

// 1. THE SAME SKY READS THE SAME — deterministic, and exactly the engine's word.
{
  const one = skyNoteFor(world, FIXTURE_SEASONS, NOW);
  const two = skyNoteFor(world, FIXTURE_SEASONS, NOW);
  assert.equal(one, two, 'the same season and world yield the same note');
  assert.equal(one, skyNote(currentSeason(FIXTURE_SEASONS, NOW)), 'the game adds no words of its own');
  assert.ok(one && one.includes('comet'), 'mid-July 2026 stands under the Comet Year');
  assert.ok(one.length <= SKY_NOTE_MAX, 'the note is bounded');
}

// 2. THE OFF-SWITCH IS SILENCE — a closed sky says nothing at all.
{
  assert.equal(skyNoteFor({ ...world, sky: 'off' }, FIXTURE_SEASONS, NOW), null, 'a world may close its sky with one setting');
  assert.equal(skyNoteFor(world, FIXTURE_SEASONS, Date.UTC(2026, 0, 1)), null, 'no season yet begun is no season at all');
}

// 3. THE OMEN NEVER WRITES ITSELF — a turn that ignores the sky leaves
//    no omen text in canon; it enters only through ordinary story ops.
{
  const codex = fixtureCodex();
  assert.ok(!JSON.stringify(codex).toLowerCase().includes('comet'), 'the fixture world has never seen the comet');
  const after = applyStoryUpdates(codex, { cast_update: [{ name: 'Brannoc', fact_add: 'holds the pass.' }] }, { turn: 7 });
  assert.ok(!JSON.stringify(after).toLowerCase().includes('comet'), 'an ignored omen is nowhere in the codex');
}

// 4. THE FEED'S FLOOR — when the house cannot be reached, the fixture
//    seasons stand; a fork inherits them and owes nothing.
{
  const seasons = await fetchSeasons(); // relative fetch has no home in node — the mercy path
  assert.deepEqual(seasons, FIXTURE_SEASONS, 'the floor is the fixture seasons, never an error');
}

// 5. THE HOUSE PUBLISHES — the feed file is real, lawful, and served.
{
  const feed = JSON.parse(read('server/seasons/seasons.json'));
  assert.ok(Array.isArray(feed) && feed.length >= 1, 'the house has written its feed');
  for (const season of feed) {
    assert.ok(season.id && season.name && season.omen, 'every season carries id, name, and omen');
    assert.ok(Number.isFinite(season.start), 'every season knows when it begins');
    assert.ok(skyNote(season).length <= SKY_NOTE_MAX, 'every published season composes within the bound');
  }
  const server = read('server/index.js');
  assert.ok(server.includes('/api/seasons'), 'the house serves the sky');
}

// 6. THE WIRING — the note rides the pack additively; the switch stands
//    in Settings; the engine's law is the only sky law.
{
  const lib = read('src/lib/sky.js');
  assert.ok(lib.includes('fatescript/sky') && lib.includes('skyNote'), 'the engine composes, the game only carries');
  const app = read('src/App.jsx');
  assert.ok(app.includes('skyNoteFor('), 'the table reads the sky');
  assert.ok(app.includes('story = { ...story, sky'), 'the note rides the pack additively, like the clock');
  const overlays = read('src/components/Overlays.jsx');
  assert.ok(overlays.includes('The shared sky'), 'the switch stands in Settings');
}

console.log('PASS \u2014 the shared sky gate (game): the same season and world read the same bounded note in the engine\u2019s own words, a closed sky is silent, an unstarted season is no season, an ignored omen leaves no text in canon, the fixture seasons stand when the house cannot be reached, and the house\u2019s published feed is lawful and served.');
