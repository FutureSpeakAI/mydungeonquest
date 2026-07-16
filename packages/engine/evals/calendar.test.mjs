// THE CALENDAR GATE — the Calendar Law holds or this file turns the build red.
import assert from 'node:assert/strict';
import { HOURS_PER_DAY, DAYS_PER_YEAR, spanHours, spanEntry, worldClock, watchOf, clockLine, agedBand, bandCrossing, AGE_BANDS } from '../src/clock.js';

// Spans convert honestly.
assert.equal(spanHours({ unit: 'hours', n: 5 }), 5);
assert.equal(spanHours({ unit: 'days', n: 2 }), 48);
assert.equal(spanHours({ unit: 'years', n: 1 }), DAYS_PER_YEAR * HOURS_PER_DAY);
assert.equal(spanHours({}), 0);
assert.equal(spanHours({ unit: 'days', n: -3 }), 0, 'time does not run backward');

// The clock is a fold over the record — model moves and client spans alike.
const dmMove = (unit, n) => ({ dm: { time_advance: { unit, n } } });
const entries = [dmMove('days', 2), dmMove('hours', 5), spanEntry({ unit: 'years', n: 1 }, { turn: 9, cause: 'the interlude between volumes' })];
const clock = worldClock(entries);
assert.equal(clock.totalHours, 2 * 24 + 5 + DAYS_PER_YEAR * 24);
assert.equal(JSON.stringify(worldClock(entries)), JSON.stringify(worldClock(entries)), 'the same record tells the same time');

// A tale opens on day one, in the morning.
const dawn = worldClock([]);
assert.equal(dawn.day, 1);
assert.equal(dawn.hour, 8);
assert.equal(clockLine(dawn), 'Day 1, morning.');
assert.equal(watchOf(19), 'dusk');
assert.equal(watchOf(2), 'deep night');

// The span row is silent to the table: kind 'span', empty dm envelope.
const row = spanEntry({ unit: 'days', n: 3 }, { turn: 4, cause: 'the road to Saltmere' });
assert.equal(row.kind, 'span');
assert.equal(row.dm.story, null);
assert.equal(row.dm.narration_blocks.length, 0);
assert.deepEqual(row.clock_advance, { unit: 'days', n: 3 });

// The ladder: age walks forward only, and only as far as the years carry it.
assert.deepEqual(AGE_BANDS, ['child', 'young', 'adult', 'elder']);
assert.equal(agedBand('child', 0), 'child');
assert.equal(agedBand('child', 8), 'young');
assert.equal(agedBand('child', 22), 'adult');
assert.equal(agedBand('young', 15), 'adult');
assert.equal(agedBand('adult', 30), 'elder');
assert.equal(agedBand('elder', 100), 'elder', 'there is no band past elder — the ladder ends, the person continues');

// Crossings are events the reducer notices, not fields anyone edits.
assert.deepEqual(bandCrossing('young', 10, 20), { from: 'young', to: 'adult' });
assert.equal(bandCrossing('adult', 1, 3), null);

console.log('PASS \u2014 the calendar gate: time is derived from the record and nowhere else, the same fold tells the same hour, spans seal silently, and the age ladder walks forward only.');
