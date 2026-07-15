// THE TENOR GATE — voices are cast from stated identity, never inferred from
// prose about other people. Encodes the playtest that exposed the flaw: a
// hero's mother spoke in a man's voice because her card mentioned her son.
import assert from 'node:assert/strict';
import { castVoiceByCard, castVoiceId, resolveVoiceId, castHeroVoice, VOICE_REGISTER, auditionCandidates } from '../src/lib/cinema/casting.js';
import { applyStoryUpdates, initCodex } from '../src/lib/story.js';

const reg = (id) => VOICE_REGISTER[id];

// 1. The playtest case: a mother whose canon speaks of men casts FEMININE —
//    her own station outranks every word about her son and her king.
const mother = { name: 'Mirabel', role: 'her mother, the miller', visual: 'flour-dusted hands, grey braid', voice: 'low and tired', goal: 'grieves the son she lost to the king\'s war' };
assert.equal(reg(castVoiceByCard(mother, 'Mirabel')), 'fem', 'the mother speaks in a feminine voice');

// 2. The hero: a scarred knight who is a woman is cast as one — presentation travels.
const heroine = { name: 'Sera Vale', ancestry: 'Human', className: 'Knight', bearing: 'a scarred knight in dented plate, gravel-voiced from old smoke', background: 'a soldier of the king\'s last war', presentation: 'feminine' };
assert.equal(reg(castHeroVoice(heroine)), 'fem', 'stated presentation outranks a knightly bearing');

// 3. An explicit voice_card outranks even the station lexicon.
const codexA = initCodex('classic-epic');
const stated = applyStoryUpdates(codexA, { cast_add: [{ name: 'Wren', role: 'the queen\'s hunter', voice_card: { gender: 'masculine', age: 'young', timbre: 'bright' }, visual: 'lean, quick', voice: 'clipped', goal: 'find the white hart', secret: '' }] }, { turn: 1 });
const wren = stated.cast.find((s) => s.name === 'Wren');
assert.equal(wren.gender, 'masculine', 'voice_card fields land on the card');
assert.equal(wren.age_band, 'young');
assert.equal(reg(wren.voiceId), 'masc', 'explicit gender beats the queen in his role line');

// 4. The Cast Law holds: a soul with a voice keeps it; an update may fill
//    missing identity but never flip a stated one.
const filled = applyStoryUpdates(stated, { cast_update: [{ name: 'Wren', voice_card: { gender: 'feminine', timbre: 'silver' } }] }, { turn: 2 });
const wren2 = filled.cast.find((s) => s.name === 'Wren');
assert.equal(wren2.gender, 'masculine', 'a stated gender can never be flipped');
assert.equal(wren2.voiceId, wren.voiceId, 'the cast voice is sealed');
assert.equal(resolveVoiceId({ voiceId: 'LEGACY-HELD' }, 'Anyone'), 'LEGACY-HELD', 'a carried voiceId always wins');

// 5. Legacy souls resolve exactly as before the law: deterministic, register-honest.
const legacy = { name: 'Brannoc', role: 'ferryman', visual: 'a gravel-voiced old man of the river', voice: '', goal: '' };
const first = castVoiceId(legacy, 'Brannoc');
assert.equal(first, castVoiceId(legacy, 'Brannoc'), 'legacy hash is stable');
assert.equal(reg(first), 'masc', 'legacy prose sweep still reads honestly');

// 6. The audition: presentation opens the right bins, three distinct voices.
const fem3 = auditionCandidates('feminine', 'Sera Vale');
assert.equal(fem3.length, 3);
assert.ok(fem3.every((v) => reg(v.id) === 'fem'), 'a feminine audition offers only feminine voices');
assert.equal(new Set(fem3.map((v) => v.id)).size, 3, 'three distinct candidates');
const neutral3 = auditionCandidates('neutral', 'Ash');
assert.ok(neutral3.some((v) => reg(v.id) === 'fem') && neutral3.some((v) => reg(v.id) === 'masc'), 'a neutral audition offers both registers');

console.log('PASS — the tenor gate: the mother speaks feminine, presentation travels, voice_card rules, the Cast Law seals, legacy souls unrecast.');
