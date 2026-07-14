// ---- The narrator never talks over itself: concurrency-guard regression ----
//
// Each turn's voice is generated asynchronously (POST /api/speak), cached in
// Dexie, then played as a chain of segments. A monotonic session token in
// narrator.js guards against two voice tracks starting at once when a player
// rapidly switches uncached turns, or when auto-narrate races a manual
// "Listen" tap. THE SOUND LAW additions are asserted here too: the narrator
// plays no music bed of any kind, and a segment of mock provenance is never
// played (the keyless floor for audio is silence, not placeholder tones).
//
// THE ONE THROAT: narrator.js speaks through a single persistent element —
// the autoplay blessing attaches to the element and survives src changes, so
// gestures prime it once and later auto-reads start unprompted. This suite
// therefore asserts "one element, ever" and "a stale take is never STARTED"
// (the old per-take "never constructed a second Audio" claim, restated for a
// reusable element), plus the refusal law: a browser that denies an
// unprompted start leaves the reading STAGED and published as blocked, and
// the tap that accepts the invitation plays the staged take without
// regenerating it.
//
// It exercises the real narrator.js: we only stub the browser edges it touches
// (fetch, Audio, object URLs) and back Dexie with fake-indexeddb, so a future
// change to the playback controller that reintroduces overlap fails here.

import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';

const tick = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Stub: object URLs. Encode the blob's MIME (so an assigned src can be told
//     apart as a voice track 'audio/mpeg' vs anything else) and a content tag
//     (so a voice URL reveals WHICH turn it belongs to). Voice blobs are
//     returned by our fake fetch with the same identity, so a Map keyed on
//     blob identity carries the tag through to createObjectURL. ---
let urlSeq = 0;
const blobTags = new Map();
globalThis.URL.createObjectURL = (blob) =>
  `blob:${blob?.type || 'unknown'}|${blobTags.get(blob) || ''}#${urlSeq++}`;
globalThis.URL.revokeObjectURL = () => {};

// --- Stub: HTMLAudioElement, mirroring the media-load semantics the ONE
//     THROAT relies on: assigning src resets paused/ended (the load
//     algorithm), so a reused element never carries a finished take's flags
//     into the next one. Every constructed element registers itself (the
//     suite asserts there is only ever ONE); every successful play() logs the
//     src it started, proving stale takes are never started. `denyPlays`
//     simulates a browser refusing an unprompted start (NotAllowedError). ---
const audios = [];
const plays = [];
let denyPlays = false;
class FakeAudio {
  constructor(src) {
    this._src = '';
    this.paused = true;
    this.ended = false;
    this.loop = false;
    this.volume = 1;
    this.onended = null;
    this.onpause = null;
    this.onplay = null;
    if (src) this.src = src;
    audios.push(this);
  }
  get src() { return this._src; }
  set src(value) {
    this._src = String(value || '');
    this.paused = true; // a newly assigned source never auto-plays
    this.ended = false; // the media-load algorithm resets 'ended'
  }
  get kind() { return this._src.includes('audio/beat') ? 'bed' : 'voice'; }
  play() {
    if (denyPlays) {
      const refusal = new Error("play() failed because the user didn't interact with the document first.");
      refusal.name = 'NotAllowedError';
      return Promise.reject(refusal);
    }
    plays.push(this._src);
    this.paused = false;
    this.onplay?.();
    return Promise.resolve();
  }
  pause() { this.paused = true; this.onpause?.(); }
}
globalThis.Audio = FakeAudio;

// --- Stub: /api/speak. Each call parks on a deferred so the test controls the
//     resolution ORDER, letting a stale generation land after a newer one. The
//     provenance header is configurable so mock-refusal can be proven. ---
let speakCalls = [];
let providerHeader = 'elevenlabs';
globalThis.fetch = (url, opts) => {
  const text = JSON.parse(opts.body).text;
  let release;
  const promise = new Promise((resolve) => { release = resolve; });
  const blob = new Blob([`voice:${text}`], { type: 'audio/mpeg' });
  blobTags.set(blob, text);
  const header = providerHeader;
  const response = { ok: true, headers: { get: () => header }, blob: async () => blob };
  speakCalls.push({ text, release: () => release(response) });
  return promise;
};

const { playNarration, toggleNarration, stopNarration, subscribeNarration, primeNarration } =
  await import('../src/lib/cinema/narrator.js');
const { db } = await import('../src/lib/db.js');

// A voice/bed track is "audible" if it is playing and not finished.
const audible = (kind) => audios.filter((a) => a.kind === kind && !a.paused && !a.ended);
const releaseSpeak = (text) => {
  const call = speakCalls.find((c) => c.text === text && !c.done);
  assert.ok(call, `expected a pending /api/speak for "${text}"`);
  call.done = true;
  call.release();
};

// Distinct turns; text is unique so we can match each to its speak() call and
// to the blob the throat ends up playing.
const turn = (n, extra = {}) => ({
  id: `turn-${n}`,
  recordHash: `hash-${n}`,
  dm: { narration_blocks: [{ text: `Line ${n} of the chronicle.`, speaker: null }] },
  ...extra
});
const lineOf = (n) => `Line ${n} of the chronicle.`;

async function reset() {
  stopNarration();
  // NOTE: `audios` is deliberately NOT cleared — the ONE THROAT persists across
  // readings by design (discarding it would forfeit the autoplay blessing), so
  // the same element carries every test. Clearing the list would blind
  // audible() to it.
  plays.length = 0;
  speakCalls = [];
  urlSeq = 0;
  providerHeader = 'elevenlabs';
  denyPlays = false;
  await db.media.clear();
}

// ---------------------------------------------------------------------------
// 1. Rapid uncached turn switches: a stale generation resolving AFTER a newer
//    one must not start a second voice. Three turns are requested back to back
//    (all uncached), then their audio is delivered in the most dangerous order
//    — newest first, oldest last — to prove the guard, not luck, decides.
// ---------------------------------------------------------------------------
{
  await reset();
  const campaign = { id: 'camp-switch' };
  const seen = [];
  const unsub = subscribeNarration((s) => seen.push(s));

  // Three near-simultaneous taps. Do not await — this is the race.
  const p1 = playNarration(campaign, turn(1));
  const p2 = playNarration(campaign, turn(2));
  const p3 = playNarration(campaign, turn(3));

  await tick(); // let the (uncached) cache lookups settle and speak() register
  assert.equal(speakCalls.length, 3, 'each uncached turn should request its own narration');
  assert.equal(audible('voice').length, 0, 'no voice should play before any audio is delivered');

  // Deliver newest first (turn 3 wins), then the stale ones. The late arrivals
  // of turns 2 and 1 must be discarded, never started.
  releaseSpeak(lineOf(3));
  await tick();
  releaseSpeak(lineOf(2));
  releaseSpeak(lineOf(1));
  await Promise.all([p1, p2, p3]);
  await tick();

  const voices = audible('voice');
  assert.equal(voices.length, 1, 'exactly one voice track may be audible after the race');
  assert.ok(voices[0].src.includes(lineOf(3)), 'the audible voice must be the LATEST requested turn (3)');
  assert.equal(audios.length, 1, 'THE ONE THROAT: a race must not mint extra elements');
  assert.ok(!plays.some((src) => src.includes(lineOf(1)) || src.includes(lineOf(2))),
    'superseded turns must never be STARTED (no silent second track)');

  const finalState = seen[seen.length - 1];
  assert.equal(finalState.id, 'turn-3', 'the published narration state must point at the latest turn');
  assert.equal(finalState.playing, true, 'the latest turn should report as playing');
  unsub();
  console.log('PASS — rapid uncached switches: only the latest turn plays; stale generations are dropped.');
}

// ---------------------------------------------------------------------------
// 2. Auto-narrate racing a manual "Listen": the auto play for one turn is still
//    generating when the player taps Listen on a different turn (toggle routes
//    to a fresh play). Only the manually chosen turn may end up audible, even
//    though the auto turn's audio arrives afterward.
// ---------------------------------------------------------------------------
{
  await reset();
  const campaign = { id: 'camp-race' };

  const auto = playNarration(campaign, turn(1)); // auto-narrate
  await tick();
  const manual = toggleNarration(campaign, turn(2)); // player taps Listen on turn 2
  await tick();
  assert.equal(speakCalls.length, 2, 'both the auto turn and the tapped turn request narration');

  // The tapped turn resolves first and starts; then the auto turn's stale audio
  // lands and must be ignored.
  releaseSpeak(lineOf(2));
  await tick();
  releaseSpeak(lineOf(1));
  await Promise.all([auto, manual]);
  await tick();

  const voices = audible('voice');
  assert.equal(voices.length, 1, 'auto+manual overlap must leave exactly one voice audible');
  assert.ok(voices[0].src.includes(lineOf(2)), 'the manually tapped turn must win over the racing auto-narrate');
  assert.ok(!plays.some((src) => src.includes(lineOf(1))),
    'the superseded auto-narrate must never have started its take');
  console.log('PASS — auto-narrate racing a manual Listen: the tapped turn wins, no overlap.');
}

// ---------------------------------------------------------------------------
// 3. THE SOUND LAW: no music bed, ever. Even with per-turn music stingers
//    seeded in the media table (as older chronicles have), a reading must
//    play NO bed — the voice stands alone.
// ---------------------------------------------------------------------------
{
  await reset();
  const campaign = { id: 'camp-bed' };
  // Seed per-turn music stingers (matched by originTurnHash) for turns 1..3 —
  // exactly what the retired bed feature used to pick up and loop.
  await db.media.bulkPut([1, 2, 3].map((n) => ({
    assetHash: `beat-${n}`, cacheKey: `k-${n}`, campaignId: campaign.id, kind: 'music',
    originTurnHash: `hash-${n}`, createdAt: n, provider: 'elevenlabs',
    blob: new Blob([`beat${n}`], { type: 'audio/beat' })
  })));

  const p1 = playNarration(campaign, turn(1));
  const p2 = playNarration(campaign, turn(2));
  const p3 = playNarration(campaign, turn(3));
  await tick();
  releaseSpeak(lineOf(3));
  await tick();
  releaseSpeak(lineOf(2));
  releaseSpeak(lineOf(1));
  await Promise.all([p1, p2, p3]);
  await tick(60);

  assert.equal(audible('voice').length, 1, 'still exactly one voice audible');
  assert.equal(audios.filter((a) => a.kind === 'bed').length, 0,
    'THE SOUND LAW: the narrator must never take up a music bed, even when stingers exist');
  assert.ok(!plays.some((src) => src.includes('audio/beat')),
    'THE SOUND LAW: no bed source may ever have been started');
  console.log('PASS — no music bed exists: the voice stands alone over silence.');
}

// ---------------------------------------------------------------------------
// 4. Toggling the SAME, already-playing turn must pause/resume it in place —
//    never mint a second voice track for the same turn.
// ---------------------------------------------------------------------------
{
  await reset();
  const campaign = { id: 'camp-toggle' };
  const first = toggleNarration(campaign, turn(1));
  await tick();
  releaseSpeak(lineOf(1));
  await first;
  await tick();
  assert.equal(audible('voice').length, 1, 'the turn should be playing after the first tap');

  await toggleNarration(campaign, turn(1)); // second tap: pause in place
  assert.equal(audible('voice').length, 0, 'a second tap on the same turn pauses it');
  assert.equal(audios.length, 1, 'pausing must not mint a new element');

  const playsBefore = plays.length;
  await toggleNarration(campaign, turn(1)); // third tap: resume in place
  assert.equal(audible('voice').length, 1, 'a third tap resumes the same track');
  assert.equal(plays.length, playsBefore + 1, 'resuming re-starts the SAME take (one play, no regeneration)');
  assert.ok(plays[plays.length - 1].includes(lineOf(1)), 'the resumed take is the same turn');
  console.log('PASS — toggling the same turn pauses/resumes in place without a second voice.');
}

// ---------------------------------------------------------------------------
// 5. MULTI-SEGMENT turn (narrator prose + a character's OWN voice). Segments are
//    generated one at a time, so between the narrator segment ending and the
//    dialogue segment arriving there is an inter-segment gap. A pause tap in that
//    gap must NOT resume the finished segment, and the arriving segment must NOT
//    start a second voice. Resume then plays exactly the next segment; stop
//    leaves nothing audible. This guards the multi-voice reader against overlap.
// ---------------------------------------------------------------------------
{
  await reset();
  const campaign = { id: 'camp-multi', codex: { cast: [] } };
  const multiTurn = {
    id: 'turn-multi', recordHash: 'hash-multi',
    dm: { narration_blocks: [
      { text: 'The hall fell silent.', speaker: null },
      { text: 'You will not pass.', speaker: 'Mara' },
    ] },
  };

  const play = playNarration(campaign, multiTurn);
  await tick();
  assert.equal(speakCalls.length, 1, 'a multi-segment turn generates one segment at a time');
  const seg0 = speakCalls[0].text;
  releaseSpeak(seg0);
  await play;
  await tick();
  assert.equal(audible('voice').length, 1, 'the first (narrator) segment plays');
  const firstEl = audible('voice')[0];

  // The narrator segment finishes (a real ended element reports ended+paused),
  // so the chain requests the dialogue segment — the gap begins.
  firstEl.ended = true; firstEl.paused = true; firstEl.onended();
  await tick();
  assert.equal(audible('voice').length, 0, 'nothing plays during the inter-segment gap');
  assert.equal(speakCalls.filter((c) => !c.done).length, 1, 'the next segment is being generated');

  // Player taps PAUSE inside the gap; then the dialogue segment's audio arrives.
  toggleNarration(campaign, multiTurn);
  const seg1 = speakCalls.find((c) => !c.done).text;
  releaseSpeak(seg1);
  await tick();
  assert.equal(audible('voice').length, 0, 'a pause in the gap must not start the arriving segment');
  assert.ok(audios.every((a) => a.paused || a.ended), 'no orphan voice is left playing while paused');

  // Resume: exactly the dialogue segment plays — never a replay of the narrator.
  toggleNarration(campaign, multiTurn);
  await tick();
  const live = audible('voice');
  assert.equal(live.length, 1, 'resume plays exactly one voice, the next segment');
  assert.ok(live[0].src.includes(seg1), 'resume plays the dialogue segment, not a replay of the narrator');

  stopNarration();
  assert.equal(audible('voice').length, 0, 'stop silences the reading with no orphan track');
  console.log('PASS — multi-segment: a pause in the inter-segment gap never overlaps or orphans a voice.');
}

// ---------------------------------------------------------------------------
// 6. THE SOUND LAW: provenance or silence. When /api/speak falls back to mock
//    (keyless table), the narrator must play NOTHING — the throat is never
//    started, and the reading ends reporting not-playing. Silence, not tones.
// ---------------------------------------------------------------------------
{
  await reset();
  providerHeader = 'mock';
  const campaign = { id: 'camp-keyless' };
  const seen = [];
  const unsub = subscribeNarration((s) => seen.push(s));

  const playsBefore = plays.length;
  const play = playNarration(campaign, turn(1));
  await tick();
  releaseSpeak(lineOf(1));
  await play;
  await tick();

  assert.equal(plays.length, playsBefore, 'mock provenance must never start the throat');
  assert.equal(audible('voice').length, 0, 'a keyless reading leaves nothing audible');
  const finalState = seen[seen.length - 1];
  assert.equal(finalState.playing, false, 'a keyless reading ends reporting not-playing');
  unsub();
  console.log('PASS — keyless tables are silent: mock narration is refused, never played.');
}

// ---------------------------------------------------------------------------
// 7. THE REFUSAL LAW: a browser that denies an unprompted start (no gesture
//    grace) must leave the reading STAGED, silent, and published as blocked —
//    a visible invitation, not a dead button. The tap that accepts it plays
//    the staged take itself: same audio, no regeneration, block cleared.
// ---------------------------------------------------------------------------
{
  await reset();
  denyPlays = true; // a strict browser: no gesture, no sound
  const campaign = { id: 'camp-blocked' };
  const seen = [];
  const unsub = subscribeNarration((s) => seen.push(s));

  const play = playNarration(campaign, turn(1)); // auto-narrate with no tap anywhere
  await tick();
  releaseSpeak(lineOf(1));
  await play;
  await tick();

  assert.equal(audible('voice').length, 0, 'a refused start leaves nothing audible');
  let state = seen[seen.length - 1];
  assert.equal(state.id, 'turn-1', 'the staged reading still belongs to its turn');
  assert.equal(state.playing, false, 'a blocked reading must not claim to be playing');
  assert.equal(state.blocked, true, 'the refusal must be published so the button can invite the tap');

  // The player accepts the invitation. The tap routes through toggle; being a
  // gesture, the browser now permits it — and the STAGED take plays.
  denyPlays = false;
  const speaksBefore = speakCalls.length;
  await toggleNarration(campaign, turn(1));
  await tick();
  const live = audible('voice');
  assert.equal(live.length, 1, 'the blessing tap plays the staged reading');
  assert.ok(live[0].src.includes(lineOf(1)), 'the staged take itself plays — same audio, same turn');
  assert.equal(speakCalls.length, speaksBefore, 'the staged take is reused, never regenerated');
  state = seen[seen.length - 1];
  assert.equal(state.blocked, false, 'the invitation clears once the voice speaks');
  assert.equal(state.playing, true, 'the reading reports playing after the tap');
  unsub();
  console.log('PASS — a refused unprompted start is staged and visibly invites the tap that plays it.');
}

// ---------------------------------------------------------------------------
// 8. THE BREATH: priming inside a gesture blesses the throat with a moment of
//    true silence — never audible, never narration state — and a prime landing
//    mid-reading (every send taps it) must not clobber the live take.
// ---------------------------------------------------------------------------
{
  await reset();
  const campaign = { id: 'camp-breath' };

  primeNarration(); // an idle-table gesture offers the breath
  await tick();
  assert.equal(audios.length, 1, 'THE ONE THROAT: priming speaks through the same single element');
  assert.equal(audible('voice').length, 0, 'the breath is paused again at once — never audible');

  const play = playNarration(campaign, turn(1));
  await tick();
  releaseSpeak(lineOf(1));
  await play;
  await tick();
  const before = audible('voice')[0].src;
  primeNarration(); // a send lands mid-reading
  await tick();
  assert.equal(audible('voice')[0]?.src, before, 'priming mid-reading must not clobber the live take');
  console.log('PASS — the gesture breath blesses the throat without ever speaking over it.');
}

// ---------------------------------------------------------------------------
// 9. THE HERO'S VOICE holds through alias forms: a bare first name reaches the
//    hero's own cast voice when nobody else could claim it; an ambiguous first
//    name touches nobody (legacy draw) — the same restraint canon uses for
//    aliases. The full name is the hero even with a rival at the table.
// ---------------------------------------------------------------------------
{
  const { narrationSegments } = await import('../src/lib/cinema/narrator.js');
  const hero = { name: 'Ash Vale', voiceId: 'HERO-VOICE' };
  const dm = { narration_blocks: [
    { text: 'The gate held.', speaker: null },
    { text: 'Not while I stand.', speaker: 'Ash' },
  ] };

  const spoken = narrationSegments(dm, [], hero).find((s) => s.speaker === 'Ash');
  assert.equal(spoken.voiceId, 'HERO-VOICE', "a bare first name speaks with the hero's cast voice");

  const rival = [{ name: 'Ash Thorn', voiceId: 'RIVAL-VOICE' }];
  const contested = narrationSegments(dm, rival, hero).find((s) => s.speaker === 'Ash');
  assert.notEqual(contested.voiceId, 'HERO-VOICE', 'an ambiguous first name must not be claimed for the hero');
  assert.notEqual(contested.voiceId, 'RIVAL-VOICE', 'nor handed to the rival — ambiguity resolves to the legacy draw');

  const exact = narrationSegments({ narration_blocks: [{ text: 'So be it.', speaker: 'Ash Vale' }] }, rival, hero);
  assert.equal(exact[exact.length - 1].voiceId, 'HERO-VOICE', 'the full name is the hero even with a rival Ash at the table');
  console.log("PASS — the hero's voice holds through alias forms; ambiguity is never guessed.");
}

await reset();
console.log('PASS — the narrator never talks over itself, plays no bed, refuses placeholders, and stages refusals as invitations.');
