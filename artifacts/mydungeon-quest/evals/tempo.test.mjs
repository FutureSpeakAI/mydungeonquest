// ---- THE TEMPO LAW (game seating — Directive XX, Law IV) ----
//
// The illuminated tier paints where the story turns, not where the clock
// ticks — and the SEATING obeys the court. Judged headless and keyless:
//   1. The court is consulted for the scene job and ONLY the scene job:
//      the writ opens after key art seats and closes before busts, region
//      plates, and sheets — proven on the easel's own source, one seat,
//      no second court.
//   2. A fixture walk under 'turning' paints exactly the turning-point
//      turns and holds honestly between them — and a held frame is
//      display, not a minting: with no job seated there is no
//      attestation, and the plateroad's own door refuses to mint an
//      unattested frame (paperless), so zero new plate rows ride a hold.
//   3. 'every' reproduces today's job stream exactly — every turn paints
//      — and an existing campaign with no tempo field defaults to it.
//   4. Fresh forges open at 'turning'; the settings surface speaks house
//      words, never machinery values.
//   5. A pre-tempo save loads untouched: deep-frozen, walked whole, not
//      a byte written; the mirror writes only on an explicit change.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Scrub before judging: this bench sits at a keyless table.
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.GEMINI_API_KEY;
delete process.env.GOOGLE_API_KEY;
delete process.env.ELEVENLABS_API_KEY;

const { sceneVerdict, tempoSetting, TEMPO_SETTINGS } = await import('../src/lib/tempo.js');
const { admitPlate } = await import('../src/lib/plateroad.js');

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
};

const tale = JSON.parse(readFileSync(new URL('../../../packages/engine/evals/fixtures/tales/crown-intrigue.chronicle.json', import.meta.url), 'utf8'));
const rows = tale.journal.filter((row) => row.type === 'turn').map((row) => ({ i: row.i, dm: row.payload.dm }));
assert.ok(rows.length >= 30, 'the sealed fixture carries a full tale');
deepFreeze(rows);

// ---- 1. the court sits before the scene plate, and only the scene plate ----
{
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const seat = (needle) => {
    const index = app.indexOf(needle);
    assert.ok(index >= 0, `the easel carries: ${needle.slice(0, 52)}`);
    assert.equal(app.indexOf(needle, index + 1), -1, `one seat only: ${needle.slice(0, 52)}`);
    return index;
  };
  const keyArt = seat('jobs.push(keyArtJob(campaign, actOf(campaign)));');
  const verdictSeat = seat('const tempoVerdict = sceneVerdict(campaign, dm, tempoTurnIndex);');
  const writ = seat('if (tempoVerdict.paints) {');
  // H3 fix: cacheKey now uses scenePlateKey(campaign.id, logId) — a shared
  // function that is stable across the seal boundary (no recordHash conditional,
  // which was the P16 trap: different key at mint vs lookup after seal).
  const scenePush = seat("cacheKey: scenePlateKey(campaign.id, logId)");
  const writClose = seat("the tempo court's writ ends here");
  assert.ok(keyArt < verdictSeat && verdictSeat < writ && writ < scenePush && scenePush < writClose,
    'the writ wraps the scene plate alone — key art seats before the court sits, and the writ closes before every other law');
  for (const outside of ['prompt: portraitPrompt(', 'prompt: regionPrompt(', 'jobs.push(...sheetJobs(campaign, dm.story));']) {
    assert.ok(app.indexOf(outside) > writClose, `${outside.slice(0, 40)} seats OUTSIDE the writ — its own cue, its own law`);
  }
  assert.ok(!app.includes('tempoCourt('), 'the easel consults the bridge, never a second court — one law, one seat');
  const bridge = readFileSync(new URL('../src/lib/tempo.js', import.meta.url), 'utf8');
  assert.ok(bridge.includes("from 'fatescript/tempo'"), 'and the bridge imports the engine court itself');
}

// ---- 2. 'turning' paints the turning points and holds honestly between ----
{
  const campaign = deepFreeze({ codex: tale.campaign.codex, tempo: 'turning' });
  const verdicts = rows.map((row) => sceneVerdict(campaign, row.dm, row.i));
  const expect = (row) => row.i === 0
    || row.dm?.story?.beat_advance === true
    || !!row.dm?.image_cue
    || (Array.isArray(row.dm?.story?.cast_add) && row.dm.story.cast_add.length > 0)
    || (typeof row.dm?.story?.scene_set?.region === 'string' && row.dm.story.scene_set.region.length > 0)
    || row.dm?.combat?.op === 'start'
    || !!row.dm?.cinematic;
  rows.forEach((row, idx) => assert.equal(verdicts[idx].paints, expect(row), `turn i=${row.i} under 'turning'`));
  const at = (i) => verdicts[rows.findIndex((row) => row.i === i)];
  assert.ok(at(0).paints && at(4).paints && at(7).paints && at(21).paints && at(29).paints, 'genesis, boundary, movement, first blood, and introduction all paint');
  for (const quiet of [2, 5, 11]) assert.ok(!at(quiet).paints, `quiet turn i=${quiet} holds the standing plate`);
  // A held frame is display, not a minting: no job means no attestation,
  // and the plateroad door itself refuses to mint an unattested frame.
  const held = admitPlate({ turnHash: 'turn-hash-of-a-held-frame', attestation: null, caption: '' });
  assert.deepEqual(held, { admit: false, status: 'paperless' }, 'zero new plate rows on a held frame — the plateroad law already refuses paperless minting');
}

// ---- 3. 'every' reproduces today's stream; absence defaults to it ----
{
  const legacy = deepFreeze({ codex: tale.campaign.codex, mediaTier: 'illuminated' }); // no tempo field — a pre-tempo save
  const before = JSON.stringify(legacy);
  const verdicts = rows.map((row) => sceneVerdict(legacy, row.dm, row.i));
  assert.ok(verdicts.every((verdict) => verdict.paints === true), "an existing campaign defaults to 'every' — every turn paints, today's stream exactly");
  assert.equal(JSON.stringify(rows.map((row) => sceneVerdict(legacy, row.dm, row.i))), JSON.stringify(verdicts), 'byte-stable on the repeat walk');
  assert.equal(JSON.stringify(legacy), before, 'and the pre-tempo save was never written by the walk');
  assert.equal(tempoSetting(undefined), 'every');
  assert.equal(tempoSetting('cinema'), 'every', 'alien words read every — no ground moves silently');
  assert.deepEqual([...TEMPO_SETTINGS], ['every', 'turning', 'sparse']);
}

// ---- 4. fresh forges open at 'turning'; the cadence has its OWN door ----
{
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.ok(app.includes("mediaTier: settings.mediaTier, tempo: 'turning',"), "the forge writes tempo: 'turning' into every newly forged tale");
  assert.ok(!/campaign\.tempo\s*=/.test(app), 'no silent migration — nothing assigns tempo onto an opened save');
  // The cadence never rides the shared settings object: the generic door
  // cannot write it, so no unrelated toggle can carry a stale cadence into
  // this campaign — or across campaigns. The piggyback class is dead.
  const doorStart = app.indexOf('const persistSettings');
  const doorEnd = app.indexOf('\n  };', doorStart); // the shared door's own close
  assert.ok(doorStart >= 0 && doorEnd > doorStart, 'the shared settings door stands whole');
  const settingsDoor = app.slice(doorStart, doorEnd);
  assert.ok(app.includes('const persistTempo'), 'and the dedicated tempo door stands beside it');
  assert.ok(!settingsDoor.includes('tempo'), 'the shared settings door never touches the cadence');
  assert.ok(!app.includes('settings.tempo'), 'nothing reads a cadence from the shared settings store');
  assert.ok(app.includes("if ((current.tempo || 'every') === id) return; // explicit change only"), 'the dedicated door writes only on an explicit change, and absence reads every');
  assert.ok(app.includes('onTempo={persistTempo}'), 'the surface is handed the dedicated door');
  const surface = readFileSync(new URL('../src/components/Overlays.jsx', import.meta.url), 'utf8');
  assert.ok(surface.includes('onTempo(id)'), 'the tempo grid writes through its own door');
  assert.ok(!surface.includes('settings,tempo') && !surface.includes('settings, tempo'), 'and never spreads the cadence into the shared settings');
  for (const houseWord of ['The tempo of the brush', 'Every turn', 'Where the story turns', 'The great turnings']) {
    assert.ok(surface.includes(houseWord), `the settings surface speaks house words: ${houseWord}`);
  }
}

// ---- 5. sparse holds where turning paints — the player's three-way stands ----
{
  const campaign = deepFreeze({ codex: tale.campaign.codex, tempo: 'sparse' });
  const verdicts = rows.map((row) => sceneVerdict(campaign, row.dm, row.i));
  const turningCampaign = deepFreeze({ codex: tale.campaign.codex, tempo: 'turning' });
  rows.forEach((row, idx) => {
    if (verdicts[idx].paints) assert.ok(sceneVerdict(turningCampaign, row.dm, row.i).paints, 'sparse is a subset of turning');
  });
  for (const held of [7, 21, 29]) {
    const idx = rows.findIndex((row) => row.i === held);
    assert.ok(!verdicts[idx].paints, `i=${held} holds under sparse — movement, first blood, and introductions alone never paint the rare book`);
  }
  assert.ok(verdicts[rows.findIndex((row) => row.i === 0)].paints, 'genesis still paints the sparse book');
}

console.log("PASS — the tempo law: the easel consults the court for the scene plate and only the scene plate (key art before the writ, busts, region plates, and sheets outside it, one bridge and never a second court), a fixture walk under turning paints exactly the turning points and holds honestly between them with the plateroad door refusing paperless mints on held frames, every reproduces today's stream exactly and a campaign without the setting defaults to it untouched under deep-freeze, fresh forges open at turning while the cadence keeps its own door — never riding the shared settings object — and the settings surface speaks house words, and sparse keeps only the great turnings.");
