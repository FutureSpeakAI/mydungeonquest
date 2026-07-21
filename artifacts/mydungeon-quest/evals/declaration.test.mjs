// THE DECLARATION GATE — Directive XIX, Article IV. The player's goals
// become first-class record: a declared ambition must seal VERBATIM the
// same turn (drop and rewrite both refused by name), never be invented
// from the teller's side, resolve only with an honest outcome from the
// small lawful set, oblige the Director whenever any stand open, and
// bend the spine at most once per act — the played road never rewrites.
import assert from 'node:assert/strict';
import { safeFallbackTurn, validateDmTurn } from '../src/lib/protocol.js';
import { applyStoryUpdates, initCodex, storyBlock } from '../src/lib/story.js';
import { buildBriefing } from 'fatescript/graph';
import { validateBeatIntent, mockDirector, ambitionNames } from 'fatescript/room';

const turn = (story) => ({ ...safeFallbackTurn('', 3), story });
const base = { cast: [], threads: [] };
const DECLARED = 'I will unmask the false steward of Harrowmere';

// --- 1. The verbatim-seal court ---
assert.equal(validateDmTurn(turn({ ambition_add: [{ text: DECLARED }] }), [], { ...base, declaredAmbition: DECLARED }).ok, true, 'the verbatim seal is lawful');
const dropped = validateDmTurn(turn({}), [], { ...base, declaredAmbition: DECLARED });
assert.equal(dropped.ok, false, 'a turn that drops the declaration is refused');
assert.ok(dropped.errors.some((error) => error.includes('drops the declared ambition')), 'and the drop is named');
const droppedNull = validateDmTurn(turn(null), [], { ...base, declaredAmbition: DECLARED });
assert.equal(droppedNull.ok, false, 'the drop court runs even against a null story');
const rewritten = validateDmTurn(turn({ ambition_add: [{ text: 'I will unmask the steward' }] }), [], { ...base, declaredAmbition: DECLARED });
assert.equal(rewritten.ok, false, 'a rewritten declaration is refused');
assert.ok(rewritten.errors.some((error) => error.includes('rewrites the declaration')), 'and the rewrite is named');
const invented = validateDmTurn(turn({ ambition_add: [{ text: 'A goal the player never spoke aloud' }] }), [], { ...base, declaredAmbition: null });
assert.equal(invented.ok, false, 'an ambition without a declaration is refused — attested none');
assert.ok(invented.errors.some((error) => error.includes("ambition_add without a declaration")), 'and the invention is named');
assert.equal(validateDmTurn(turn({ ambition_add: [{ text: 'Shape-lawful ambition text' }] }), [], base).ok, true, 'a bare context proves nothing (elder sealed inputs)');
assert.equal(validateDmTurn(turn({ ambition_add: [{ text: 'too short' }] }), [], base).ok, false, 'the text fence holds (12-200)');
assert.equal(validateDmTurn(turn({ ambition_add: [{ text: DECLARED }, { text: DECLARED }] }), [], { ...base, declaredAmbition: DECLARED }).ok, false, 'at most one seal a turn');

// --- 2. Honest resolution against the open list ---
const openCtx = { ...base, openAmbitions: [DECLARED] };
assert.equal(validateDmTurn(turn({ ambition_resolve: [{ text: DECLARED, outcome: 'achieved' }] }), [], openCtx).ok, true);
const strayClose = validateDmTurn(turn({ ambition_resolve: [{ text: 'Never declared', outcome: 'lost' }] }), [], openCtx);
assert.equal(strayClose.ok, false, 'resolving nothing is refused');
assert.ok(strayClose.errors.some((error) => error.includes('targets no open ambition')), 'and named');
assert.equal(validateDmTurn(turn({ ambition_resolve: [{ text: DECLARED, outcome: 'forgotten' }] }), [], openCtx).ok, false, 'an unlawful outcome is refused');

// --- 3. The fold: cited rows, no duplicates, stamped closes ---
let codex = initCodex('classic-epic');
codex = applyStoryUpdates(codex, { ambition_add: [{ text: DECLARED }] }, { turn: 4 });
assert.equal(codex.ambitions.length, 1);
assert.equal(codex.ambitions[0].status, 'open');
assert.equal(codex.ambitions[0].declared_turn, 4, 'the declaration cites its turn');
codex = applyStoryUpdates(codex, { ambition_add: [{ text: DECLARED.toUpperCase() }] }, { turn: 5 });
assert.equal(codex.ambitions.length, 1, 'a duplicate open ambition is blocked');
assert.ok(codex.notes.some((note) => /ambition/i.test(note)), 'and the block leaves a note');
const block = storyBlock(codex);
assert.deepEqual(block.ambitions_state, [DECLARED], 'the machine seat carries the open texts bare');
const briefed = buildBriefing({ codex, logs: [], hero: { name: 'Maren' } }, { budget: 9000 });
assert.deepEqual(briefed.open_ambitions, [DECLARED], 'the briefing carries the ambition bare — no suffix for the court to trip on');
codex = applyStoryUpdates(codex, { ambition_resolve: [{ text: DECLARED, outcome: 'achieved' }] }, { turn: 9 });
assert.equal(codex.ambitions[0].status, 'achieved');
assert.equal(codex.ambitions[0].resolved_turn, 9, 'the close cites its turn');
assert.deepEqual(storyBlock(codex).ambitions_state, [], 'a closed ambition leaves the open seat');

// --- 4. The Director's obligation, presence-lawed ---
const story = { open_ambitions: [DECLARED] };
assert.deepEqual(ambitionNames({ open_ambitions: [DECLARED] }), [DECLARED]);
const intentOf = (extra) => ({ beat_index: 2, intent: 'Press the steward question at the millhouse door.', secrets_held: [], threads_to_touch: [], forbidden_repeats: [], measure: 'standard', ...extra });
assert.equal(validateBeatIntent(intentOf({ ambitions_served: [DECLARED] }), { threads: [], ambitions: [DECLARED] }).ok, true);
const unserved = validateBeatIntent(intentOf({}), { threads: [], ambitions: [DECLARED] });
assert.equal(unserved.ok, false, 'open ambitions oblige the Director');
assert.ok(unserved.errors.some((error) => error.includes('ambitions_served must name at least one')), 'and the silence is named');
assert.equal(validateBeatIntent(intentOf({ ambitions_served: ['A goal nobody holds'] }), { threads: [], ambitions: [DECLARED] }).ok, false, 'serving a stranger ambition is refused');
assert.equal(validateBeatIntent(intentOf({ ambitions_served: [DECLARED] }), { threads: [], ambitions: [] }).ok, false, 'an attested-empty list cannot be served');
assert.equal(validateBeatIntent(intentOf({}), { threads: [], ambitions: null }).ok, true, 'a bare bench stays out of session');
const served = mockDirector({ story: { ...story, beat: { index: 2 } } }, 2);
assert.deepEqual(served.ambitions_served, [DECLARED], 'the mock Director serves the first open ambition, deterministically');

// --- 5. The spine's one bend — the door ---
const beats = [
  { act: 1, title: 'The Summons', goal: 'Leave the village' },
  { act: 2, title: 'The False Steward', goal: 'Reach Harrowmere' },
  { act: 3, title: 'The Reckoning', goal: 'End it' }
];
const spineCtx = { ...base, spine: { beats, beatIndex: 0 } };
const bend = { act: 2, beat: 'The False Steward', goal: 'Expose the steward before the harvest court', reason: 'The player unmasked the steward two acts early' };
assert.equal(validateDmTurn(turn({ spine_amend: bend }), [], spineCtx).ok, true, 'a lawful bend passes');
assert.equal(validateDmTurn(turn({ spine_amend: { ...bend, title: null, goal: null } }), [], spineCtx).ok, false, 'a bend must reshape something');
assert.equal(validateDmTurn(turn({ spine_amend: { ...bend, reason: 'because' } }), [], spineCtx).ok, false, 'the reason fence holds');
const strangerBeat = validateDmTurn(turn({ spine_amend: { ...bend, beat: 'A Beat Never Written' } }), [], spineCtx);
assert.equal(strangerBeat.ok, false);
assert.ok(strangerBeat.errors.some((error) => error.includes('names a beat the spine does not hold')), 'a stranger beat is named');
assert.ok(validateDmTurn(turn({ spine_amend: { ...bend, act: 3 } }), [], spineCtx).errors.some((error) => error.includes('does not match the named beat')), 'an act mismatch is named');
const reached = validateDmTurn(turn({ spine_amend: { act: 1, beat: 'The Summons', title: 'Rewritten', reason: 'trying to rewrite the played road' } }), [], spineCtx);
assert.equal(reached.ok, false, 'the reached beat never bends');
assert.ok(reached.errors.some((error) => error.includes('the played road does not rewrite')), 'and the refusal is named');

// --- 6. The bend in the fold: applied once, capped per act ---
let spun = initCodex('classic-epic');
const futureIndex = spun.spine.beats.length - 1;
const futureBeat = spun.spine.beats[futureIndex];
spun = applyStoryUpdates(spun, { spine_amend: { act: futureBeat.act, beat: futureBeat.title, goal: 'A goal reshaped by the played tale', reason: 'The tale outran the written road entirely' } }, { turn: 6 });
assert.equal(spun.spine.beats[futureIndex].goal, 'A goal reshaped by the played tale', 'the bend lands on the named beat');
assert.equal(spun.spineAmendments.length, 1, 'the amendment is recorded');
assert.equal(spun.spineAmendments[0].turn, 6, 'with its citation');
const secondBeat = spun.spine.beats.filter((row) => row.act === futureBeat.act && row.title !== spun.spine.beats[futureIndex].title).pop();
const before = structuredClone(spun.spine.beats);
spun = applyStoryUpdates(spun, { spine_amend: { act: futureBeat.act, beat: (secondBeat || futureBeat).title, goal: 'A second bend in the same act', reason: 'testing the once-per-act cap at the fold' } }, { turn: 7 });
assert.deepEqual(spun.spine.beats, before, 'the once-per-act cap holds — the second bend does not land');
assert.equal(spun.spineAmendments.length, 1, 'and is not recorded as law');
assert.ok(spun.notes.some((note) => /amend|act/i.test(note)), 'the cap leaves a standing note');

console.log('PASS — the declaration gate: verbatim seals, named refusals, honest closes, the obliged Director, and the spine bending at most once per act.');
