// THE PODCAST FORGE, PROVED (the Experience Cut, Phase 5) — the episode is
// compiled ONLY from sealed text (Chronicler passages, sealed quotes, sealed
// narration, fixed liturgy), and the mix plan is verifiably sequential: the
// ffmpeg graph is one concat chain that cannot overlap a sting with a voice.
import assert from 'node:assert/strict';
import { buildPodcastScript, validatePodcastScript, buildMixPlan, assertLawfulPlan, LITURGY } from '../src/lib/podcast.js';
import { buildSequencerArgs, buildChapterMetadata, LAWFUL_REF } from '../server/sequencer.js';

const campaign = {
  id: 'camp-pod', title: 'The Fen Crossing',
  codex: {
    spine: { label: 'The Long Road', beats: [{ title: 'Into the Fen', act: 1 }, { title: 'The Far Shore', act: 2 }] },
    cast: [
      { id: 'c1', name: 'Mara Vey', role: 'guide', status: 'dead' },
      { id: 'c2', name: 'Brother Loam', role: 'monk', status: 'active' }
    ]
  },
  chroniclePages: [
    {
      beatIndex: 0, passage: 'The fen swallowed the road behind you, and Mara Vey walked it with you while she could.',
      quotes: [{ speaker: 'Mara Vey', line: 'Keep to the stones, or the water keeps you.', turn: 0 }],
      cites: { from_turn: 0, to_turn: 1 }
    },
    {
      beatIndex: 1, passage: 'The far shore asked a price the fen had only hinted at.',
      quotes: [{ speaker: 'Brother Loam', line: 'The shore keeps what the fen releases.', turn: 3 }],
      cites: { from_turn: 3, to_turn: 3 }
    }
  ],
  logs: [
    { id: 'log-0', beatIndex: 0, redacted: false, player: 'I follow the lantern.', dm: { narration_blocks: [{ text: 'The fen opens its black mouth.', speaker: null }], cinematic: { title: 'The Black Mouth' } }, resolution: { total: 2 } },
    { id: 'log-1', beatIndex: 0, redacted: false, player: 'I leap for the stone.', dm: { narration_blocks: [{ text: 'You land hard and alive.', speaker: null }] }, resolution: { total: 19 } },
    { id: 'log-2', beatIndex: 1, redacted: true, player: 'A scene set aside.', dm: { narration_blocks: [{ text: 'REDACTED-NEVER-SPOKEN', speaker: null }] }, resolution: null },
    { id: 'log-3', beatIndex: 1, redacted: false, player: 'I rest at the shore.', dm: { narration_blocks: [{ text: 'The far shore is colder and truer.', speaker: 'Brother Loam' }] }, resolution: { total: 3 } }
  ]
};
const journal = [
  { type: 'turn', i: 0, prevHash: null, payload: {}, ts: 1, recordHash: 'h0' },
  { type: 'turn', i: 1, prevHash: 'h0', payload: {}, ts: 2, recordHash: 'h1' },
  { type: 'turn', i: 2, prevHash: 'h1', payload: {}, ts: 3, recordHash: 'h2' },
  { type: 'turn', i: 3, prevHash: 'h2', payload: {}, ts: 4, recordHash: 'h3' }
];

// ---- 1. The script speaks only sealed words -------------------------------
const script = buildPodcastScript({ campaign, journal });
const verdict = validatePodcastScript(script, { campaign, journal });
assert.ok(verdict.ok, `the compiled script must pass its own court: ${verdict.errors[0] || ''}`);
const allText = script.sections.flatMap((s) => s.segments.map((seg) => seg.text)).join('\n');
assert.ok(!allText.includes('REDACTED-NEVER-SPOKEN'), 'redacted turns are never voiced');
assert.ok(allText.includes('The fen swallowed the road behind you'), 'the Chronicler retelling is read whole');
assert.ok(allText.includes(LITURGY.signOff()), 'the episode signs off: Sealed, and true.');

// ---- 2. The cold open is the highest-stakes sealed line, in its own voice --
assert.equal(script.sections[0].kind, 'cold-open');
assert.equal(script.sections[0].segments[0].voice, 'Mara Vey', 'stakes |2−10.5| beat |3−10.5| — the guide opens');
assert.equal(script.sections[0].segments[0].text, 'Keep to the stones, or the water keeps you.');

// ---- 3. The cast re-speak verbatim; the cold-open line is not spent twice --
const respeaks = script.sections.filter((s) => s.kind === 'chapter').flatMap((s) => s.segments.filter((seg) => seg.source.type === 'chronicle_quote'));
assert.ok(respeaks.some((seg) => seg.text === 'The shore keeps what the fen releases.' && seg.voice === 'Brother Loam'), 'the monk re-speaks his sealed line');
assert.ok(!respeaks.some((seg) => seg.text === 'Keep to the stones, or the water keeps you.'), 'the cold-open line is not repeated in its chapter');

// ---- 4. The court refuses tampering ---------------------------------------
const tampered = JSON.parse(JSON.stringify(script));
const pageSeg = tampered.sections.flatMap((s) => s.segments).find((seg) => seg.source.type === 'chronicle_page');
pageSeg.text += ' And then a dragon appeared.';
assert.ok(!validatePodcastScript(tampered, { campaign, journal }).ok, 'an edited retelling is refused');
const tamperedLiturgy = JSON.parse(JSON.stringify(script));
tamperedLiturgy.sections[tamperedLiturgy.sections.length - 1].segments[0].text = 'Sealed, and mostly true.';
assert.ok(!validatePodcastScript(tamperedLiturgy, { campaign, journal }).ok, 'the liturgy is a template, not a suggestion');

// ---- 5. Journal law outranks the snapshot flag — and strikes whole pages ---
const strikeJournal = [...journal, { type: 'redaction', i: 4, prevHash: 'h3', payload: { targetRecordHash: 'h0' }, ts: 5, recordHash: 'h4' }];
const struckScript = buildPodcastScript({ campaign, journal: strikeJournal });
const struckText = struckScript.sections.flatMap((s) => s.segments.map((seg) => seg.text)).join('\n');
assert.ok(!struckText.includes('Keep to the stones'), 'a quote on a journal-struck turn is not voiced');
assert.ok(!struckText.includes('The fen swallowed the road'), 'a retelling whose cited turns were struck falls whole — pages answer to redaction too');
assert.ok(struckText.includes('You land hard and alive.'), 'the chapter falls back to lawful raw narration');
assert.equal(struckScript.sections[0].segments[0].text, 'The shore keeps what the fen releases.', 'the cold open falls to the next lawful line');
assert.ok(validatePodcastScript(struckScript, { campaign, journal: strikeJournal }).ok);
assert.ok(!validatePodcastScript(script, { campaign, journal: strikeJournal }).ok, 'voicing a page that rides struck turns is refused by the court');

// ---- 6. The raw floor: no Chronicler, still an episode ---------------------
const rawScript = buildPodcastScript({ campaign: { ...campaign, chroniclePages: [] }, journal });
assert.equal(rawScript.sections[0].kind, 'liturgy-open', 'no sealed quotes → no cold open, no invention');
const rawVerdict = validatePodcastScript(rawScript, { campaign: { ...campaign, chroniclePages: [] }, journal });
assert.ok(rawVerdict.ok, `raw floor passes the court: ${rawVerdict.errors[0] || ''}`);
assert.ok(rawScript.sections.flatMap((s) => s.segments).some((seg) => seg.source.type === 'sealed_turn' && seg.text === 'The far shore is colder and truer.' && seg.voice === 'Brother Loam'), 'sealed narration is spoken as written, in its writer\'s voice');
const citeless = buildPodcastScript({ campaign: { ...campaign, chroniclePages: [{ beatIndex: 0, passage: 'A page with no citations.', quotes: [] }] }, journal });
assert.ok(!citeless.sections.flatMap((s) => s.segments).some((seg) => seg.text === 'A page with no citations.'), 'a page that cannot prove its range is never voiced');

// ---- 7. The mix plan cannot overlap ----------------------------------------
const voices = [{ ref: 'v0', section: 0 }, { ref: 'v1', section: 1 }, { ref: 'v2', section: 1 }, { ref: 'v3', section: 2 }];
const plan = buildMixPlan({ voices, chapters: [{ title: 'Chapter I — Into the Fen', section: 1 }], stings: ['s0'] });
assert.ok(assertLawfulPlan(plan).ok, 'the built plan is lawful');
const stingAt = plan.items.findIndex((item) => item.type === 'sting');
assert.ok(stingAt > 0, 'a sting sounds at the section turn');
assert.equal(plan.items[stingAt - 1].type, 'gap', 'silence before the sting');
assert.equal(plan.items[stingAt + 1].type, 'gap', 'silence after the sting');
for (let i = 1; i < plan.items.length; i += 1) {
  assert.ok(!(plan.items[i].type !== 'gap' && plan.items[i - 1].type !== 'gap'), 'no two audible items ever touch');
}
assert.equal(plan.chapters[0].title, 'Chapter I — Into the Fen');
assert.equal(plan.items[plan.chapters[0].beforeItem].type, 'voice', 'the marker points at its first voice');
const outlaw = { items: [{ type: 'voice', ref: 'v0' }, { type: 'sting', ref: 's0' }] };
assert.ok(!assertLawfulPlan(outlaw).ok, 'audible-against-audible is refused');
assert.ok(!assertLawfulPlan({ items: [{ type: 'gap', ms: 500 }] }).ok, 'a plan with no voice is not an episode');

// ---- 8. The ffmpeg graph is one concat chain — no mixing exists ------------
const files = { v0: '/tmp/v0.mp3', v1: '/tmp/v1.mp3', v2: '/tmp/v2.mp3', v3: '/tmp/v3.mp3', s0: '/tmp/s0.mp3' };
const { args, filter, inputCount } = buildSequencerArgs({ items: plan.items, files, out: '/tmp/out.mp3', coverFile: '/tmp/cover.png', metaFile: '/tmp/meta.txt' });
assert.ok(/concat=n=\d+:v=0:a=1\[mix\]/.test(filter), 'one concat chain binds everything');
assert.ok(!/amix|amerge/.test(filter), 'THE LAW: nothing in the graph can overlap two sounds');
assert.ok(filter.includes('aevalsrc=0'), 'gaps are generated silence, part of the same chain');
assert.ok(filter.includes('loudnorm=I=-16'), 'voices are normalized to podcast loudness');
assert.ok(filter.includes('loudnorm=I=-19'), 'stings sit a shade below the voice');
assert.equal(inputCount, plan.items.filter((item) => item.type !== 'gap').length, 'every audible use is its own input');
assert.ok(args.includes('attached_pic'), 'the cover art rides as an attached picture');
assert.ok(args.includes('-map_metadata'), 'chapter markers ride as metadata');
assert.equal(args[args.length - 1], '/tmp/out.mp3');

// ---- 9. Chapter markers on the true timeline, titles escaped ---------------
const meta = buildChapterMetadata([{ title: 'Chapter I — a=b;c#d', beforeItem: 1 }], [400, 5000, 650, 4000]);
assert.ok(meta.startsWith(';FFMETADATA1'), 'ffmetadata header');
assert.ok(meta.includes('START=400') && meta.includes('END=10050'), 'the marker lands where the chain actually plays');
assert.ok(meta.includes('title=Chapter I — a\\=b\\;c\\#d'), 'metadata escaping holds');

// ---- 10. The ref law: nothing a ref says can leave the binder's room -------
for (const good of ['v0', 's12', 'a', 'voice-line-3']) assert.ok(LAWFUL_REF.test(good), `lawful ref: ${good}`);
for (const evil of ['../evil', 'v0/../../x', 'V0', 'v 0', 'v.mp3', '', 'x'.repeat(33), '-lead', '0lead']) {
  assert.ok(!LAWFUL_REF.test(evil), `unlawful ref refused: ${JSON.stringify(evil)}`);
}

console.log('PASS — the Forge speaks only sealed words (liturgy by template, tampering refused, journal law strikes quotes AND whole pages, citeless pages never voiced), refs pass one strict door, and the mix is one concat chain: gaps breathe, stings sound only between voices, nothing can overlap.');
