// ------------------------------------------------------------
// THE CHRONICLER SUITE — Phase 3 of the Experience Cut.
// Proves, keylessly, that the reteller lives under its three
// laws:
//   1. It may not invent — uncited passages and unknown names
//      are refused.
//   2. It may not contradict — dice totals must match sealed
//      resolutions; the dead are not quoted after they fall.
//   3. It may only retell — quotes are verbatim and declared;
//      digits stay out of the prose.
// And that the floor holds: keyless, the chapter page falls back
// to the sealed text itself — the book always exists.
// Pure node, no DOM, no keys — safe on the proving ground.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import { validateChroniclePassage, rawChroniclePassage, buildChronicleRequest, CHRONICLE_LIMITS } from '../src/lib/chronicler.js';
import { chronicleToolSchema } from '../server/retell.js';

// ---- The sealed evidence fixture -----------------------------
const context = {
  range: { from: 0, to: 2 },
  names: ['Aria Vale', 'Mara Vey', 'Brother Loam', 'The Gloaming Fen'],
  corpus: [
    {
      turn: 0,
      texts: ['I follow the lantern into the fen.', 'The fen swallows the road behind you, stone by patient stone.', 'Keep to the stones, or the water keeps you.'],
      lines: { 'aria vale': ['I follow the lantern into the fen.'], 'mara vey': ['Keep to the stones, or the water keeps you.'] }
    },
    {
      turn: 1,
      texts: ['The water rises without a sound, and Mara Vey does not rise with it.', 'Remember the stones.'],
      lines: { 'mara vey': ['Remember the stones.'] }
    },
    {
      turn: 2,
      texts: ['Dawn finds you on the far shore, colder and truer.', 'You carried her warning well.'],
      lines: { 'brother loam': ['You carried her warning well.'] }
    }
  ],
  deaths: [{ name: 'Mara Vey', turn: 1 }],
  totals: [{ turn: 2, total: 19 }]
};

const lawful = {
  title: 'The tale so far — Chapter I',
  passage: 'The fen swallowed the road behind you, stone by patient stone, and Mara Vey walked it with you while she could. "Keep to the stones, or the water keeps you," she warned, and the warning outlived her — the water rose without a sound and she did not rise with it. By dawn you stood on the far shore, colder and truer, and Brother Loam met you there. "You carried her warning well." The Gloaming Fen keeps what it is given; it was given much.',
  cites: { from_turn: 0, to_turn: 2 },
  mentions: ['Aria Vale', 'Mara Vey', 'Brother Loam', 'The Gloaming Fen'],
  quotes: [
    { speaker: 'Mara Vey', line: 'Keep to the stones, or the water keeps you.', turn: 0 },
    { speaker: 'Brother Loam', line: 'You carried her warning well.', turn: 2 }
  ],
  dice_moments: [{ turn: 2, total: 19, label: 'the crossing' }]
};

// ---- 1. The lawful passage passes ----------------------------
{
  const verdict = validateChroniclePassage(lawful, context);
  assert.deepEqual(verdict.errors, [], 'a lawful retelling must pass clean');
  assert.equal(verdict.ok, true);
}

// ---- 2. It may not invent -------------------------------------
{
  // An unknown name in mentions is an invention.
  const invented = { ...lawful, mentions: [...lawful.mentions, 'Lord Hollow'] };
  const verdict = validateChroniclePassage(invented, context);
  assert.equal(verdict.ok, false);
  assert.ok(verdict.errors.some((e) => e.includes('invented name') && e.includes('Lord Hollow')), 'the invented name is named in the refusal');

  // A missing citation is an invention with good manners.
  for (const cites of [null, {}, { from_turn: 0 }, { from_turn: 2, to_turn: 1 }, { from_turn: 0, to_turn: 99 }]) {
    const uncited = { ...lawful, cites };
    assert.equal(validateChroniclePassage(uncited, context).ok, false, `cites ${JSON.stringify(cites)} must be refused`);
  }

  // An invented speaker is refused even with plausible words.
  const ghostSpeaker = { ...lawful, quotes: [...lawful.quotes, { speaker: 'The Ferryman', line: 'Keep to the stones, or the water keeps you.', turn: 0 }] };
  assert.equal(validateChroniclePassage(ghostSpeaker, context).ok, false);
}

// ---- 3. It may not contradict ---------------------------------
{
  // The dead do not speak: Mara fell on turn 1; her dying words (turn 1)
  // are honored, but turn 2 is a séance.
  const dyingWords = { ...lawful, quotes: [...lawful.quotes, { speaker: 'Mara Vey', line: 'Remember the stones.', turn: 1 }] };
  assert.equal(validateChroniclePassage(dyingWords, context).ok, true, 'dying words in the killing turn are honored');
  const seance = { ...lawful, quotes: [...lawful.quotes, { speaker: 'Mara Vey', line: 'Remember the stones.', turn: 2 }] };
  const verdict = validateChroniclePassage(seance, context);
  assert.equal(verdict.ok, false);
  assert.ok(verdict.errors.some((e) => e.includes('the dead do not speak')), 'the séance is refused by name');

  // A die that never showed is refused.
  const loadedDie = { ...lawful, dice_moments: [{ turn: 2, total: 20, label: 'the crossing' }] };
  assert.ok(validateChroniclePassage(loadedDie, context).errors.some((e) => e.includes('the die never showed')));
  const wrongTurn = { ...lawful, dice_moments: [{ turn: 1, total: 19, label: 'the crossing' }] };
  assert.equal(validateChroniclePassage(wrongTurn, context).ok, false);
}

// ---- 4. It may only retell ------------------------------------
{
  // A reworded quote is not a quote.
  const reworded = { ...lawful, quotes: [{ ...lawful.quotes[0], line: 'Stay on the stones, or the water takes you.' }, lawful.quotes[1]] };
  assert.ok(validateChroniclePassage(reworded, context).errors.some((e) => e.includes('not verbatim')));

  // Speech smuggled into the prose without declaration is refused.
  const smuggled = { ...lawful, passage: lawful.passage + ' At the last she whispered, "The fen remembers every name it drinks."' };
  assert.ok(validateChroniclePassage(smuggled, context).errors.some((e) => e.includes('undeclared quotation')));

  // Digits stay out of the prose…
  const numbered = { ...lawful, passage: lawful.passage.replace('By dawn', 'After 3 hard hours, by dawn') };
  assert.ok(validateChroniclePassage(numbered, context).errors.some((e) => e.includes('margins')));

  // …but a digit inside a KNOWN name is that name, not mechanics.
  const numberedName = {
    context: { ...context, names: [...context.names, 'Vault 9'] },
    payload: { ...lawful, passage: lawful.passage.replace('it was given much.', 'it was given much, and Vault 9 holds the rest.'), mentions: [...lawful.mentions, 'Vault 9'] }
  };
  assert.equal(validateChroniclePassage(numberedName.payload, numberedName.context).ok, true, 'a digit inside a known name is lawful');

  // A verbatim quote carrying a sealed digit survives the digit law too.
  const digitQuoteContext = structuredClone(context);
  digitQuoteContext.corpus[2].texts.push('The toll is 12 stones, no fewer.');
  digitQuoteContext.corpus[2].lines['brother loam'].push('The toll is 12 stones, no fewer.');
  const digitQuote = {
    ...lawful,
    passage: lawful.passage + ' He named the price plainly: "The toll is 12 stones, no fewer."',
    quotes: [...lawful.quotes, { speaker: 'Brother Loam', line: 'The toll is 12 stones, no fewer.', turn: 2 }]
  };
  assert.equal(validateChroniclePassage(digitQuote, digitQuoteContext).ok, true, 'sealed digits inside a declared verbatim quote are lawful');
}

// ---- 5. The keyless floor: the sealed text itself -------------
{
  const raw = rawChroniclePassage(context, { numeral: 'I' });
  assert.equal(raw.raw, true);
  assert.equal(raw.provider, 'sealed-text');
  assert.ok(raw.passage.length > 40, 'the raw page carries real sealed prose');
  assert.deepEqual(raw.cites, { from_turn: 0, to_turn: 2 }, 'even the raw page cites its range');
  assert.ok(raw.title.includes('Chapter I'));
}

// ---- 6. The evidence builder: redaction and the corpus --------
{
  const campaign = {
    title: 'The Fen Crossing', homeRegion: 'The Gloaming Fen', tone: 'somber',
    hero: { name: 'Aria Vale' },
    codex: {
      spine: { beats: [{ title: 'Into the Fen', goal: 'Cross alive', act: 1 }, { title: 'The Far Shore', goal: 'Learn the price', act: 1 }] },
      cast: [{ name: 'Mara Vey', status: 'dead', known_facts: [] }, { name: 'Brother Loam', status: 'active' }],
      regions: [{ name: 'The Gloaming Fen' }]
    },
    logs: [
      { id: 'log-0', beatIndex: 0, redacted: false, player: 'I follow the lantern into the fen.', dm: { narration_blocks: [{ text: 'The fen swallows the road behind you, stone by patient stone.', speaker: null }], dialogue_cue: { speaker: 'Mara Vey', line: 'Keep to the stones, or the water keeps you.' }, story: null }, resolution: null },
      { id: 'log-1', beatIndex: 0, redacted: true, player: 'A scene set aside.', dm: { narration_blocks: [{ text: 'This never reaches the Chronicler.', speaker: null }], story: { cast_update: [{ name: 'Brother Loam', status: 'dead' }] } }, resolution: null },
      { id: 'log-2', beatIndex: 1, redacted: false, player: 'Press on to the shore.', dm: { narration_blocks: [{ text: 'The water rises without a sound, and Mara Vey does not rise with it.', speaker: null }], story: { cast_update: [{ name: 'Mara Vey', status: 'dead' }] } }, resolution: { total: 19 } }
    ]
  };
  const request = buildChronicleRequest(campaign, 0);
  assert.ok(request, 'a walked chapter yields a request');
  assert.equal(request.afterLogId, 'log-2', 'the page hangs after the advancing turn');
  assert.equal(request.context.corpus.some((entry) => entry.texts.join(' ').includes('never reaches')), false, 'redacted turns are outside canon — not their words');
  assert.equal(request.context.deaths.some((death) => death.name === 'Brother Loam'), false, '…and not their deaths');
  assert.ok(request.context.deaths.some((death) => death.name === 'Mara Vey' && death.turn === 2), 'a sealed fall is dated by its turn');
  assert.ok(request.context.totals.some((total) => total.turn === 2 && total.total === 19), 'sealed dice ride along as evidence');
  assert.ok(request.body.chapter.numeral === 'I' && request.body.chapter.title === 'Into the Fen');
}

// ---- 7. Lockstep: the tool schema mirrors the validator --------
// The schema is what the model sees; the validator is what the client
// enforces. If they drift, models emit valid-but-rejected passages and
// silently burn their repairs (a lesson this codebase has already paid for).
{
  assert.deepEqual([...chronicleToolSchema.required].sort(), ['cites', 'dice_moments', 'mentions', 'passage', 'quotes', 'title'], 'schema requires exactly the keys the validator requires');
  assert.deepEqual(Object.keys(chronicleToolSchema.properties).sort(), [...chronicleToolSchema.required].sort(), 'no schema key escapes the required set');
  assert.equal(chronicleToolSchema.additionalProperties, false);
  // A payload wearing an extra key is refused by BOTH courts.
  const extra = { ...lawful, mood: 'wistful' };
  assert.ok(validateChroniclePassage(extra, context).errors.some((e) => e.includes('not allowed')));
  assert.equal(chronicleToolSchema.properties.passage.maxLength, CHRONICLE_LIMITS.passage);
  assert.equal(chronicleToolSchema.properties.quotes.maxItems, CHRONICLE_LIMITS.quotes);
  assert.equal(chronicleToolSchema.properties.dice_moments.maxItems, CHRONICLE_LIMITS.dice);
  assert.equal(chronicleToolSchema.properties.mentions.maxItems, CHRONICLE_LIMITS.mentions);
}

// ---- 8. The prose itself is scanned for inventions -------------
// Declared mentions were never the only door: a name smuggled into the
// passage WITHOUT being declared must be caught standing in the prose.
{
  const smuggledName = { ...lawful, passage: lawful.passage.replace('and the warning outlived her', 'and Lord Hollow gathered the warning') };
  const verdict = validateChroniclePassage(smuggledName, context);
  assert.equal(verdict.ok, false);
  assert.ok(verdict.errors.some((e) => e.includes('invented name in the telling') && e.includes('Hollow')), 'a prose-smuggled name is caught undeclared');
  // Sentence-start capitals stay exempt — the lawful fixture (test 1) opens
  // sentences with "The…", "By…" and passes the scan.
}

// ---- 9. A quotation may be fragmented, never extended ----------
{
  // Extending a declared quote with words nobody spoke breaks the inclusion
  // chain (span ⊆ declared ⊆ sealed) and is refused…
  const extended = { ...lawful, passage: lawful.passage.replace('"You carried her warning well."', '"You carried her warning well, and further than any of us."') };
  const verdict = validateChroniclePassage(extended, context);
  assert.equal(verdict.ok, false);
  assert.ok(verdict.errors.some((e) => e.includes('undeclared quotation')), 'a superset span is refused — spans must live inside declared lines');
  // …while a contiguous fragment of a sealed line is faithful retelling.
  const fragment = {
    ...lawful,
    passage: lawful.passage.replace('"You carried her warning well."', 'He said you had "carried her warning well."'),
    quotes: [lawful.quotes[0], { speaker: 'Brother Loam', line: 'carried her warning well.', turn: 2 }]
  };
  assert.equal(validateChroniclePassage(fragment, context).ok, true, 'a contiguous fragment quote is verbatim');
}

// ---- 10. Redacted-origin deaths do not resurface ----------------
{
  const campaign = {
    title: 'The Fen Crossing', homeRegion: 'The Gloaming Fen', tone: 'somber',
    hero: { name: 'Aria Vale' },
    codex: {
      spine: { beats: [{ title: 'Into the Fen', goal: 'Cross alive', act: 1 }] },
      // Mara is dead in the codex, but NO unredacted turn seals her fall —
      // and her card even carries a dated fact. The date must NOT be used.
      cast: [{ name: 'Mara Vey', status: 'dead', known_facts: ['Fell on turn 7 to the rising water.'] }],
      regions: [{ name: 'The Gloaming Fen' }]
    },
    logs: [
      { id: 'log-0', beatIndex: 0, redacted: false, player: 'I follow the lantern.', dm: { narration_blocks: [{ text: 'The fen swallows the road behind you, stone by patient stone.', speaker: null }], story: null }, resolution: null },
      { id: 'log-1', beatIndex: 0, redacted: true, player: 'A scene set aside.', dm: { narration_blocks: [{ text: 'The redacted fall.', speaker: null }], story: { cast_update: [{ name: 'Mara Vey', status: 'dead' }] } }, resolution: null }
    ]
  };
  const request = buildChronicleRequest(campaign, 0);
  const mara = request.context.deaths.find((death) => death.name === 'Mara Vey');
  assert.ok(mara, 'the codex-dead soul is still guarded');
  assert.equal(mara.turn, -1, 'a fall with no unredacted seal is dated -1 — no redacted turn number resurfaces');
  // …and turn -1 means unquotable at ANY turn in range:
  const seanceAnyTurn = validateChroniclePassage(
    { ...lawful, quotes: [{ speaker: 'Mara Vey', line: 'Keep to the stones, or the water keeps you.', turn: 0 }] },
    { ...context, deaths: [{ name: 'Mara Vey', turn: -1 }] }
  );
  assert.equal(seanceAnyTurn.ok, false);
  assert.ok(seanceAnyTurn.errors.some((e) => e.includes('the dead do not speak')), 'an undated fall silences every turn');
}

// ---- 11. A chapter close is claimed exactly once -----------------
// The claim is synchronous (taken before any await), so two racing
// chapter-close paths in one session cannot both seal a page.
{
  const { claimChapterClose } = await import('../src/lib/chronicler.js');
  assert.equal(claimChapterClose('camp-x', 3), true, 'first claim wins');
  assert.equal(claimChapterClose('camp-x', 3), false, 'second claim is refused — no duplicate pages');
  assert.equal(claimChapterClose('camp-x', 4), true, 'other beats are unaffected');
  assert.equal(claimChapterClose('camp-y', 3), true, 'other campaigns are unaffected');
}

console.log('PASS — the Chronicler holds its three laws: nothing invented (declared or smuggled), nothing contradicted (no séance, no loaded dice), only the sealed tale retold (fragments yes, extensions never) — and keyless, the sealed text itself serves.');
