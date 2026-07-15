// THE SHARED SKY GATE — the Shared Sky Law holds or this file turns the build red.
import assert from 'node:assert/strict';
import { SKY_NOTE_MAX, currentSeason, skyNote, FIXTURE_SEASONS } from '../src/sky.js';

// The season standing now is chosen by start, deterministically.
const midJuly = Date.UTC(2026, 6, 15);
const november = Date.UTC(2026, 10, 1);
const juneBefore = Date.UTC(2026, 5, 1);
assert.equal(currentSeason(FIXTURE_SEASONS, midJuly)?.id, 'comet-year');
assert.equal(currentSeason(FIXTURE_SEASONS, november)?.id, 'long-thaw');
assert.equal(currentSeason(FIXTURE_SEASONS, juneBefore), null, 'no season yet begun is no season at all');
assert.equal(currentSeason([], midJuly), null);

// The note is composed the same way every time, and it is a hook — a
// short one — never a command.
const season = currentSeason(FIXTURE_SEASONS, midJuly);
const note = skyNote(season);
assert.equal(note, skyNote(season), 'the same sky reads the same');
assert.equal(note, 'The sky: The Comet Year \u2014 A pale comet crosses every sky; each world reads it by its own covenant.');
assert.ok(note.length <= SKY_NOTE_MAX);

// A long omen is bounded, never sprawling.
const longOmen = { name: 'The Endless Rain', omen: 'rain '.repeat(80) };
const bounded = skyNote(longOmen);
assert.ok(bounded.length <= SKY_NOTE_MAX);
assert.ok(bounded.endsWith('\u2026'));

// A world may close its sky, and a closed sky is a silent one.
assert.equal(skyNote(season, { sky: 'off' }), null);
assert.equal(skyNote(null), null);
assert.equal(skyNote({ name: '', omen: '  ' }), null);

// The module composes; it never writes. Nothing here can touch a codex.
import * as sky from '../src/sky.js';
for (const [name, value] of Object.entries(sky)) {
  if (typeof value !== 'function') continue;
  assert.ok(['currentSeason', 'skyNote'].includes(name), `the sky exports readers only, found: ${name}`);
}

console.log('PASS \u2014 the shared sky gate: one sky over many worlds, the omen reads the same twice, the note stays bounded, the off-switch is silence, and the module composes without ever writing canon.');
