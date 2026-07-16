// THE CALENDAR GATE — story time is a pure fold over sealed time_advance
// operations. Ticks carry no clock and move nothing; redacted turns move
// nothing; hours carry into days at 24; the fold is deterministic.
import assert from 'node:assert/strict';
import { calendarOf, calendarLine } from '../src/lib/calendar.js';

const t = (advance, extra = {}) => ({ dm: { time_advance: advance }, ...extra });
assert.deepEqual(calendarOf([]), { day: 1, hours: 0 }, 'the tale opens on Day 1');
assert.equal(calendarOf([t({ unit: 'days', n: 2 }), t({ unit: 'days', n: 3 })]).day, 6);
assert.deepEqual(calendarOf([t({ unit: 'hours', n: 30 })]), { day: 2, hours: 6 }, 'hours carry at 24');
assert.equal(calendarOf([t({ unit: 'days', n: 5 }, { redacted: true })]).day, 1, 'a struck turn moves no clock');
assert.equal(calendarOf([{ kind: 'tick', dm: { time_advance: null } }]).day, 1, 'ticks carry no clock');
const logs = [t({ unit: 'days', n: 1 }), t(null), t({ unit: 'hours', n: 25 })];
assert.equal(JSON.stringify(calendarOf(logs)), JSON.stringify(calendarOf(logs)), 'deterministic');
assert.equal(calendarLine(logs), 'It is Day 3 of the tale.');
console.log('PASS — the calendar gate: Day 1 at the opening, a pure fold over sealed advances, hours carry at 24, ticks and strikes move nothing.');
