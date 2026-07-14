// ---- The Sound Law, enforced: Audio Director regression ----
//
// The director is the single throat for every non-narration sound. This suite
// drives it headlessly with the same stubs as the narrator suite and asserts
// the Law: mock provenance is refused outright; at most ONE director sound is
// ever live; a voice claiming the stage silences music instantly; punctuation
// that misses its moment is dropped (never late, never overlapped); effects
// outrank music when a gap opens; nothing the director plays may loop.

import assert from 'node:assert/strict';

let urlSeq = 0;
globalThis.URL.createObjectURL = (blob) => `blob:${blob?.type || 'unknown'}#${urlSeq++}`;
globalThis.URL.revokeObjectURL = () => {};

const audios = [];
class FakeAudio {
  constructor(src) {
    this.src = src || '';
    this.paused = true;
    this.ended = false;
    this.loop = false;
    this.volume = 1;
    this.onended = null;
    audios.push(this);
  }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  finish() { this.ended = true; this.paused = true; this.onended?.(); } // natural end
}
globalThis.Audio = FakeAudio;

const { playMusic, playSfx, stopMusic, stopAllSound, setVoiceActive, directorState } =
  await import('../src/lib/cinema/audioDirector.js');

const tick = (ms = 15) => new Promise((resolve) => setTimeout(resolve, ms));
const audible = () => audios.filter((a) => !a.paused && !a.ended);
const blobOf = (tag) => new Blob([tag], { type: `audio/${tag}` });

function reset() {
  stopAllSound();
  setVoiceActive(false);
  audios.length = 0;
}

// 1. Provenance or silence: mock (or missing) provenance never constructs audio.
{
  reset();
  assert.equal(playMusic({ blob: blobOf('m1'), provider: 'mock' }), false, 'mock music must be refused');
  assert.equal(playSfx({ blob: blobOf('s1'), provider: 'mock' }), false, 'mock sfx must be refused');
  assert.equal(playMusic({ blob: blobOf('m2'), provider: '' }), false, 'unattested audio must be refused');
  assert.equal(audios.length, 0, 'refusal must not construct any Audio element');
  console.log('PASS — the audio floor is silence: mock provenance is refused at the door.');
}

// 2. One sound at a time; a newer phrase supersedes an older one; no loops.
{
  reset();
  assert.equal(playMusic({ blob: blobOf('phrase-a'), provider: 'elevenlabs' }), true);
  assert.equal(audible().length, 1, 'a lawful phrase plays alone');
  assert.equal(audios[0].loop, false, 'nothing the director plays may loop');
  assert.equal(directorState().playing, 'music');
  assert.equal(playMusic({ blob: blobOf('phrase-b'), provider: 'elevenlabs' }), true, 'a re-fired cinematic swaps phrases');
  assert.equal(audible().length, 1, 'the swap leaves exactly one sound live');
  assert.ok(audible()[0].src.includes('phrase-b'), 'the newer phrase won the stage');
  console.log('PASS — one sound at a time; a newer phrase supersedes, never stacks.');
}

// 3. The voice outranks everything: music is silenced the instant a voice
//    starts, and nothing may start over the voice.
{
  reset();
  playMusic({ blob: blobOf('phrase'), provider: 'elevenlabs' });
  assert.equal(audible().length, 1);
  setVoiceActive(true);
  assert.equal(audible().length, 0, 'the voice silences music instantly, no fade, no negotiation');
  assert.equal(playMusic({ blob: blobOf('late'), provider: 'elevenlabs', maxWaitMs: 0 }), false, 'no-wait music is dropped while a voice holds the stage');
  assert.equal(playSfx({ blob: blobOf('hit'), provider: 'elevenlabs', maxWaitMs: 0 }), false, 'no-wait sfx is dropped while a voice holds the stage');
  assert.equal(audible().length, 0, 'nothing sounded over the voice');
  setVoiceActive(false);
  console.log('PASS — the voice owns the stage: music dies instantly, nothing starts over it.');
}

// 4. Punctuation that misses its moment is dropped — a stale accent never
//    fires late. A staged accent within its window fires when the gap opens.
{
  reset();
  setVoiceActive(true);
  assert.equal(playSfx({ blob: blobOf('stale'), provider: 'elevenlabs', maxWaitMs: 20 }), true, 'staging within a window is lawful');
  await tick(50); // the window closes while the voice still speaks
  setVoiceActive(false);
  assert.equal(audible().length, 0, 'an expired accent must never fire late');
  assert.equal(directorState().queued, 0, 'the expired accent left the queue');

  setVoiceActive(true);
  assert.equal(playSfx({ blob: blobOf('fresh'), provider: 'elevenlabs', maxWaitMs: 5000 }), true);
  setVoiceActive(false);
  assert.equal(audible().length, 1, 'a staged accent fires the moment the voice yields');
  assert.ok(audible()[0].src.includes('fresh'));
  console.log('PASS — missed moments are dropped; staged punctuation fires only in its window.');
}

// 5. When a gap opens with both lanes waiting, the effect fires before the
//    music — and they still play one at a time, in sequence.
{
  reset();
  setVoiceActive(true);
  playMusic({ blob: blobOf('mood'), provider: 'elevenlabs', maxWaitMs: 5000 });
  playSfx({ blob: blobOf('accent'), provider: 'elevenlabs', maxWaitMs: 5000 });
  setVoiceActive(false);
  assert.equal(audible().length, 1, 'the gap admits exactly one sound');
  assert.ok(audible()[0].src.includes('accent'), 'the effect outranks the music in the gap');
  assert.equal(directorState().playing, 'sfx');
  audible()[0].finish(); // the accent ends naturally
  assert.equal(audible().length, 1, 'the music follows only after the effect ends');
  assert.ok(audible()[0].src.includes('mood'));
  console.log('PASS — effects before music in a gap, and still one sound at a time.');
}

// 6. stopMusic ends the phrase and clears staged music without touching an
//    effect's place; stopAllSound leaves total silence.
{
  reset();
  playMusic({ blob: blobOf('phrase'), provider: 'elevenlabs' });
  playMusic({ blob: blobOf('queued'), provider: 'elevenlabs', maxWaitMs: 5000 });
  stopMusic();
  assert.equal(audible().length, 0, 'stopMusic silences the live phrase');
  assert.equal(directorState().queued, 0, 'stopMusic clears staged music');
  playSfx({ blob: blobOf('accent'), provider: 'elevenlabs' });
  assert.equal(audible().length, 1);
  stopAllSound();
  assert.equal(audible().length, 0, 'stopAllSound leaves total silence');
  console.log('PASS — stop controls return the table to silence, which is always lawful.');
}

reset();
console.log('PASS — the Sound Law holds: one voice, punctuation only, silence over placeholder.');
