import { canonicalize, sha256 } from 'fatescript/canonical';
import { bearingFor, bearingBlock, paintRoster } from 'fatescript/bearing';
import { cardsForCampaign } from 'fatescript/cards';
import { UNLETTERED_WORLD } from 'fatescript/unlettered';
import { calendarOf, watchOf } from 'fatescript/calendar';
import { yearsSinceTurn } from '../clockAtTable.js';

// THE BEARING AT THE EASEL — Directive VI: the card IS the prompt. Every
// painted soul speaks through the bearing — locked visual canon verbatim,
// the signature always visible, wounds from the record, age from the
// clock, the dead never aging — so the books and the paintings agree by
// construction. Cards are the wiki's own lawful derivation; a soul the
// wiki cannot card yet falls back to its codex line, never to silence.
// `carried` waits on the Ledger's projections (its own phase); an empty
// hand presumes the signature is still worn.
function cardsOf(campaign) {
  try { return cardsForCampaign(campaign).cards; } catch { return {}; }
}
function bearingLineFrom(cards, campaign, name) {
  const card = cards[String(name || '').toLowerCase()];
  if (!card?.identity?.name) return null;
  const yearsSince = yearsSinceTurn(campaign.logs || [], card.identity.introduced_turn || 0);
  return bearingBlock(bearingFor(card, { yearsSince, carried: [] }));
}

const DENY = [
  /\bgore\b/gi, /\bgory\b/gi, /\bdisembowel(?:ed|ment)?\b/gi, /\bdecapitat(?:e|ed|ion)\b/gi,
  /\bsexual(?:ized)?\b/gi, /\bnude|nudity\b/gi, /\berotic\b/gi,
  /\bchild|minor|underage|teenage girl|teenage boy\b/gi
];

export function scrubPrompt(text, campaign = {}) {
  let clean = String(text || '');
  for (const phrase of [...(campaign.lines || []), ...(campaign.veils || [])]) {
    if (!phrase) continue;
    clean = clean.replace(new RegExp(escapeRegExp(phrase), 'gi'), '[omitted]');
  }
  for (const pattern of DENY) clean = clean.replace(pattern, '[PG-13 omitted]');
  return `${clean.replace(/\s+/g, ' ').trim()} ${ART_DIRECTION}`;
}

// The house style for every painted asset — portraits, regions, scenes, key art
// and cinematics all pass through here, so the whole world reads as one hand.
// Deliberately evokes fantasy-novel-cover and film-preproduction concept art
// (Alan Lee / John Howe / early Lord of the Rings & Game of Thrones art books),
// with explicit negatives to steer away from glossy CGI, cartoon, and anime.
// (0.6.1, THE UNLETTERED WORLD) The text law is ONE general clause now,
// owned by the engine (fatescript/unlettered) and shared with the warden
// that enforces it — the accumulated noun-pile this paragraph once carried
// is retired. The clause rides every builder exactly once, via this
// constant, via scrubPrompt.
const ART_DIRECTION = `Rendered as a painterly high-fantasy illustration in the classic English fantasy-illustration tradition: naturalistic oil-and-watercolour concept art, muted earthen and candlelit palette, atmospheric depth with soft diffused light, fine painterly brushwork and film-preproduction realism, cinematic composition. Not cartoonish, not anime, not glossy 3D render, not video-game screenshot. Family-safe PG-13 with restrained peril and no exploitative detail. ${UNLETTERED_WORLD}`;

// THE HOUSE STYLE — the brand's own art direction, used for marketing
// art (the reel, key art, social cards) and as the final fallback when a
// tale carries no style bible of its own.
export const HOUSE_STYLE = 'Painterly epic fantasy in deep ink and candle-gold: chiaroscuro light, ember-rimmed silhouettes, weathered heroes against monumental scale, visible brushwork, no text, no borders';

// THE VISUAL BIBLE (Directive V) — the identity clause every image prompt
// derives from the CARD: a noun chosen by stated presentation and age (the
// Tenor Law's discipline, applied to paint), the mark verbatim, and the
// written appearance canon. Deterministic: same card, same bytes.
export const VISUAL_REGISTER = {
  feminine: { adult: 'a woman', young: 'a young woman', elder: 'an elderly woman', child: 'a girl' },
  masculine: { adult: 'a man', young: 'a young man', elder: 'an elderly man', child: 'a boy' },
  neutral: { adult: 'a person', young: 'a young person', elder: 'an elderly person', child: 'a child' }
};
export function identityClause(soul = {}) {
  // One clause for every lawful shape: a forge hero (presentation,
  // explicitAge, mark), a raw DM payload (voice_card nested), and a sealed
  // cast entry (the Tenor Law reducer flattens the card to gender and
  // age_band). Stated identity only — absent all three, the plain noun.
  const stated = soul.voice_card || {};
  const register = VISUAL_REGISTER[soul.presentation || stated.gender || soul.gender] || VISUAL_REGISTER.neutral;
  const noun = register[soul.explicitAge || stated.age || soul.age_band] || register.adult;
  const mark = soul.mark ? `; marked by ${soul.mark}` : '';
  const canonLine = soul.visual ? `; appearance canon: ${soul.visual}` : '';
  return `${noun}${mark}${canonLine}`;
}

export function portraitPrompt(campaign, soul, variant = 'bust') {
  // The card is the prompt: the bearing speaks when the wiki can card the
  // soul; the codex line stands in when it cannot (the forge's first take,
  // before any record exists). Either way the locked visual rides verbatim.
  const bearing = bearingLineFrom(cardsOf(campaign), campaign, soul.name);
  const clause = identityClause(soul);
  const identity = bearing ? `${bearing} Painted as ${clause}.` : `Painted as ${clause}.`;
  // THE MARK AT PORTRAIT DISTANCE — a portrait is testimony at arm's length;
  // the mark carries most weight here, where the camera is closest of all
  // (Likeness Law, Directive VI). (0.6.3, Move Two) Prominence is demanded
  // through size, sharpness, and framing alone — recognition-demand words
  // invite the very lettering THE UNLETTERED WORLD refuses.
  // (iteration 54.3's cure) THE PLACEMENT RIDER — the painter restyled a
  // burn-scar mark into a decorative emblem on a pauldron; the judge
  // rightly called the mark absent. The mark's own words say where it
  // lives; the painter does not get to relocate it.
  const markClause = soul.mark ? ` The mark — ${soul.mark} — sits large, sharp, and whole at this distance: framed entire, holding a commanding share of the frame, never cropped away and never turned from the viewer. It appears exactly where and how its own words place it, never relocated and never redrawn as ornament.` : '';
  // (0.6.3, iteration 54.3's cure — replacing 54.2's) THE COVERING LAW,
  // LISTLESS: 54.2's clause enumerated coverings ("a helm, mask, hood,
  // veil, or visor") and the painter took the list as an ORDER — it
  // helmed the bare-faced hero and closed the visor over her eyes. Twice
  // proven now (54.1's letter, 54.3's helm): every concrete noun in a
  // prompt is a command to paint that noun. The law binds to the identity
  // line alone and names nothing itself. THE FRAME LAW rides with it —
  // a bust's whole head inside the frame, framing only, no face claims
  // (a lawfully helmed soul keeps its helm).
  return scrubPrompt(`${campaign.codex?.arc?.style_bible || campaign.styleBible}. ${variant} portrait of ${soul.name}. ${identity} Expression and posture reveal this goal: ${soul.goal}.${markClause} Dress and gear follow the identity line exactly — nothing added that it does not state, nothing it states removed, opened, or undone; the face shows exactly as much as the identity shows. The whole head sits well inside the frame with air on every side — nothing cropped at crown, chin, or shoulder. No frame.`, campaign);
}

// THE STATE GRAMMAR — a region's state must read at a glance, not as a
// caption. One word ("wounded") barely moves a painting, especially when a
// reference plate anchors the composition; each state therefore speaks a
// full visual sentence — palette, light, and the condition of roofs, fields,
// and roads — so thriving and blighted can never wear the same picture.
const REGION_STATE_GRAMMAR = {
  thriving: 'State — THRIVING: the land is alive and generous. Green meadows in full color, hearth-smoke rising from whole roofs, blossom in the hedgerows, bright water, warm golden light across the whole frame. Dominant colors of this frame: living spring green, warm harvest gold, clear blue sky and bright water; no grey pall, no ash, no mud — the palette itself says abundance across the whole frame.',
  wounded: 'State — WOUNDED: the hurt shows everywhere. Scorched fence-lines and broken carts, trampled fields gone brown, a smoke-pall thinning the light, patched roofs and gaps in the hedgerows, a flat grey overcast palette. The region canon above describes this place in kinder days — keep its bones, never its colors. Dominant colors of this frame: flat grey, mud-brown, smoke-white; green survives only in bruised trampled patches; nothing glows. If a reference image anchors this place, it shows kinder days — keep only its landforms and landmarks, and repaint palette, sky, light, and vegetation entirely; the change of fortune owns every corner of the frame — palette, sky, and light all speak it at once.',
  blighted: 'State — BLIGHTED: the land is dying. Ashen dead fields, black leafless trees, collapsed roofs and abandoned lanes, standing water gone dark and still, a cold violet-grey gloom pressing down on everything, the whole frame low-key and DARK — deep shadows over most of the canvas, a heavy lightless sky, never a pale or bright blight. The region canon above describes this place in kinder days — keep its bones, never its colors. Dominant colors of this frame: ash-grey, charcoal-black, cold violet; no green and no warm gold anywhere in the image; the sky is dead slate; every field lies under ash. If a reference image anchors this place, it shows kinder days — keep only its landforms and landmarks, and repaint palette, sky, light, and vegetation entirely; the change of fortune owns every corner of the frame — palette, sky, and light all speak it at once.'
};

export function regionPrompt(campaign, region) {
  const blight = campaign.codex.blight || 0;
  const grammar = REGION_STATE_GRAMMAR[String(region.state || '').toLowerCase()] || `Current state: ${region.state}.`;
  return scrubPrompt(`${campaign.codex.arc?.style_bible || campaign.styleBible}. Establishing landscape of ${region.name}. Region canon: ${region.visual}. ${grammar} World blight ${blight}/5, shown through weather, architecture, and vegetation rather than gore. Wide cinematic composition.`, campaign);
}

// THE FRAMING WHEEL — eight compositions dealt deterministically by the turn's
// own seed, so consecutive plates differ in camera even when the storyteller
// describes scenes in similar words. Variety comes from composition; the
// subjects' appearance canon and reference anchors stay wired in regardless.
const FRAMINGS = [
  'wide establishing shot, the figures small against the landscape',
  'medium shot at eye level, the moment\u2019s central figures held in frame',
  'low-angle composition, the subject looming against sky or ceiling',
  'intimate close framing on faces and hands, shallow painted depth',
  'over-the-shoulder view into the scene\u2019s focal point',
  'high vantage looking down on the unfolding moment',
  'threshold framing \u2014 the scene glimpsed through a doorway, arch, or branches',
  'strong profile composition lit by a single hard source'
];

export function sceneFraming(seed) {
  const s = String(seed ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return FRAMINGS[Math.abs(h) % FRAMINGS.length];
}

// `moment` (optional) carries the turn's own truth into the brief: a slice of
// the actual prose and a per-turn seed for the framing wheel. Same turn, same
// brief — a reopen or a refused pour repaints nothing it already has.
// Turn the hero the player wrote into a paintable soul — shared by the
// forge's bust job and the scene easel, so the hero's canon reads the same
// wherever she is painted. (Moved from prologue.js when scenes learned to
// seat the hero.)
export function heroSoul(hero) {
  // The forge hero's stated identity rides WHOLE: identityClause was built
  // for exactly these fields (presentation, explicitAge, mark), and dropping
  // them here once cost the hero her mark in every scene she entered.
  return {
    name: hero.name,
    visual: String(hero.bearing || hero.background || `${hero.ancestry || ''} ${hero.className || hero.class || ''}`).slice(0, 300),
    mark: hero.mark,
    presentation: hero.presentation,
    explicitAge: hero.explicitAge,
    goal: 'the hero whose legend this chronicle records'
  };
}

export function scenePrompt(campaign, cue, moment = null) {
  // THE ROSTER — at most three painted subjects per plate: speaker, then
  // villain, then bond, chosen the same way every time; everyone else is
  // staged in prose (bearing law, Directive VI). The painted speak through
  // their bearings — the card is the prompt.
  const cards = cardsOf(campaign);
  const { painted, staged } = paintRoster({ present: cue.subjects || [], speaker: moment?.speaker || null, cards });
  // The hero is seatable: she lives outside the cast wiki, but when the cue
  // names her she is seated like any soul — same canon as her bust, and her
  // bust anchor resolves by her name exactly as cast anchors do.
  const souls = painted.map(({ name }) => campaign.codex.cast.find((soul) => soul.name === name) || (campaign.hero && name === campaign.hero.name ? heroSoul(campaign.hero) : null)).filter(Boolean);
  const region = campaign.codex.regions.find((entry) => entry.name === cue.region);
  // BEAT SUPREMACY IS POSITIONAL TOO — the moment rides directly behind the
  // style bible, BEFORE the souls and the region canon, so a painter that
  // weights the opening cannot drown the moment in eight hundred characters
  // of contradicting canon (a dawn beat was painted dusk because "soft
  // northern light" spoke first). The words say the moment wins; now the
  // order says it with them. (Iteration 54.4 completed this cure: the
  // MOOD had still been speaking before the beat — "Dawn, then." painted
  // dusk again through that one leading clause. The beat now rides FIRST
  // and the mood follows it, subordinated by name to the beat's hour.)
  // (0.6.3, iteration 54.1's cure) The example list once named A LETTER to
  // be staged "plainly in the foreground — large" — a direct order to paint
  // a written page frontal and huge whenever the telling names one; the
  // warden then lawfully refused the plate twice. The list now carries only
  // unwritten things, the staging demand speaks size (never "plainly"), and
  // written matter gets its LOCAL law right beside the command that once
  // overrode it: closed, turned, or shadowed — the shape tells, never the
  // surface.
  const beat = moment?.prose ? ` This exact moment from the telling: "${String(moment.prose).replace(/"/g, '\u2019').slice(0, 480)}". Depict this beat literally — its action, props, weather, geography, time of day, and light — and stage every thing the telling names (a road, a fork, a bell, a glow, a lantern) large in the foreground of the frame, filling a commanding share of it, each named thing carried by its form and silhouette alone — so this moment could be no other and never a generic vista of the same place. Anything the telling names as WRITTEN — a letter, seal, sign, map, page, or book — appears only as a closed or turned object: its face away from the viewer, folded shut, or lost in shadow, its shape telling the story its surface never does. Where the beat and the region canon below disagree, the beat wins — time of day, weather, light, and the count of named features come from the moment alone, never from the canon. The telling's words are stage directions only — never painted as visible writing.` : '';
  const framing = moment ? ` Composition: ${sceneFraming(moment.seed)}.` : '';
  // THE CAMERA LAW — a mark that lives on a face is testimony; a back view
  // silences it. When a painted soul carries a named mark, the framing wheel
  // still deals variety, but the marked face must stay toward the viewer.
  const marked = souls.filter((soul) => soul.mark);
  const markLaw = marked.length ? ` The camera keeps ${marked.map((soul) => soul.name).join(' and ')} facing the viewer — the marked face never turns fully away, and the mark stays in frame, rendered large and distinct at this plate's distance. If the dealt composition is too wide for the mark to hold that size, pull the camera closer until it does.` : '';
  const soulLines = souls.map((soul) => {
    const bearing = bearingLineFrom(cards, campaign, soul.name);
    const clause = `${soul.name} — ${identityClause(soul)}.`;
    return bearing ? `${clause} ${bearing}` : clause;
  }).join(' ');
  const stagedLine = staged.length ? ` Present but unpainted, staged in the scene's prose: ${staged.join(', ')}.` : '';
  const moodLine = ` Scene mood${moment?.prose ? ", subordinate to the beat's stated hour and light" : ''}: ${cue.mood}.`;
  // THE WATCH AND THE FIXTURES (Directive VIII.7–8) — two byte-stable
  // riders. The watch word rides beneath the beat and the mood, so dusk
  // cannot flip to noon between plates of the same day — and where the
  // beat states its own hour, the beat still wins (beat supremacy above).
  // The fixture rider stands beside the region canon: up to three sealed
  // fixtures of the painted place, most recently sealed first, each
  // visual clause verbatim — sealed once, painted forever.
  const watchLine = ` The watch of the day is ${watchOf(calendarOf(campaign.logs || []).hours)}.`;
  const placeFixtures = (campaign.codex.fixtures || [])
    .filter((entry) => entry.place === cue.region)
    .sort((a, b) => ((b.since ?? -1) - (a.since ?? -1)))
    .slice(0, 3);
  const fixtureLine = placeFixtures.length ? ` Standing fixtures of ${cue.region}, sealed canon each: ${placeFixtures.map((entry) => `${entry.name} — ${entry.visual}`).join('; ')}.` : '';
  // THE HONEST FRAME (Directive IX) — two byte-stable riders. THE PRINCIPAL
  // CLAUSE crowns the cue's FIRST subject the composition's foremost figure,
  // spoken only when the roster paints that soul — a staged soul cannot be
  // foremost in a frame it never enters. THE CLOSURE CLAUSE ends every
  // subject-bearing scene brief: the frame holds the painted souls and no
  // one else — except, when the cue grants it, an indistinct background
  // crowd with no readable face.
  const firstSubject = (cue.subjects || [])[0];
  const principalSoul = firstSubject ? souls.find((soul) => soul.name === firstSubject) : null;
  // (56C amendment 6) The principal LEADS without demoting anyone: the old
  // zero-sum wording ("no other figure outranks this presence in prominence")
  // taught the painter to shrink the other named souls into the background,
  // where the likeness warden rightly refused them. Leadership and likeness
  // must pull the same direction.
  const principalLaw = principalSoul ? ` Principal presence: ${principalSoul.name}, ${identityClause(principalSoul)} — this figure leads the composition, foremost in position and focus; any other named soul stands near enough that face and mark read true, never reduced to a distant background figure.` : '';
  const closureLaw = souls.length
    ? (cue.crowd === 'background'
      ? ' The frame is closed except its granted crowd: beyond the named painted souls, only an indistinct distant background crowd may stand — unidentifiable figures, no readable face, no named soul among them.'
      : ' The frame is closed: the only figures in this frame are the named painted souls — no other person, figure, or silhouette of any kind stands in frame.')
    : '';
  return scrubPrompt(`${campaign.codex.arc?.style_bible || campaign.styleBible}.${beat}${moodLine}${watchLine} ${soulLines}${stagedLine}${principalLaw} ${region ? `${region.name} region canon: ${region.visual}; state ${region.state}.` : ''}${fixtureLine} Blight ${campaign.codex.blight}/5.${framing} Likeness law, equal in force to the moment: every named soul is the SAME person as their reference images and identity line — exact face, age, build, clothing motifs, and silhouette — and any distinguishing mark named in an identity line rides on them in frame, large and whole. Named souls are the PRINCIPAL figures of this frame — never demoted to the background, never displaced by an invented figure. Each named soul's dress, gear, and worn covering follow their identity line exactly — nothing added it does not state, nothing it states removed or undone.${markLaw}${closureLaw}`, campaign);
}

// The roster, exported for the job bench: the same painted-first seating
// the scene prompt uses, so reference anchors follow the roster — never a
// soul the plate will not hold.
export function sceneRoster(campaign, cue, moment = null) {
  return paintRoster({ present: cue.subjects || [], speaker: moment?.speaker || null, cards: cardsOf(campaign) });
}

// The locked bearing as one string for the Warden's brief — the same
// words the easel paints by, so the judge and the painter read one law.
// Null when the wiki cannot card the soul yet; a null bearing is a
// render the warden owes nothing (the first take has no anchor anyway).
export function bearingTextFor(campaign, name) {
  return bearingLineFrom(cardsOf(campaign), campaign, name);
}

export function keyArtPrompt(campaign, variant = 'establishing') {
  const bible = campaign.codex?.arc?.style_bible || campaign.styleBible;
  const darkening = variant === 'act-3'
    ? ' The story at its maximum stakes: storm-lit and embattled, the land itself holding its breath.'
    : variant === 'act-2'
      ? ' The world has darkened since the beginning: longer shadows, colder light, a threat now gathering on the horizon.'
      : '';
  return scrubPrompt(`${bible}. Epic 16:9 key art establishing this world — a single iconic vista with cinematic depth and dramatic light, no figures in the foreground. The world: ${campaign.covenant || ''}. Home region: ${campaign.homeRegion || 'the frontier'}. Tone: ${campaign.tone || 'mythic'}. No frame.${darkening} The vista stands EMPTY — no people, no figures, no creatures, no riders, no silhouettes anywhere in frame; the land alone carries the story.`, campaign);
}


export async function generationSpec(kind, prompt, options = {}) {
  const value = { kind, scrubbedPrompt: prompt, promptVersion: 1, canonVersion: 1, provider: options.provider || 'auto', model: options.model || 'auto', seed: options.seed ?? null, dimensions: options.dimensions || null, duration: options.duration || null, referenceAssetHashes: options.referenceAssetHashes || [], providerParameters: options.providerParameters || {} };
  return { value, hash: await sha256(canonicalize(value)), promptHash: await sha256(prompt) };
}

function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ------------------------------------------------------------
// THE PLATE'S CAPTION (0.6.1, THE MOMENT LAW) — the figcaption under a
// plate must DESCRIBE the picture, and the cue mood the easel builds must
// brief the painter in stage directions, not dialogue. Both draw the first
// UNATTRIBUTED narration line — the telling's own scene description — and
// fall back to the opening line only when a turn is wall-to-wall speech.
// (A raw quote sliced mid-sentence captioned a hearth interior; the
// caption court refused it — rightly.)
export function plateMood(dm, max = 90) {
  const blocks = dm?.narration_blocks || [];
  const line = blocks.find((block) => block && !block.speaker && block.text) || blocks[0] || null;
  return String((line && line.text) || '').slice(0, max);
}

// ------------------------------------------------------------
// THE MOMENT LAW (0.6.1) — the beat-supremacy clause is a plea until
// someone checks the work. A live plate answered a rain-on-iron threshold
// with the region canon's sunny vale and two invented riders; every scene
// plate that carries its moment now goes back to the warden's door with
// ONE question: is THIS moment staged? A miss repaints once with the
// order reinforced; a second miss ships the better take with the miss
// sealed in its attest — the house labels dishonesty rather than starve
// the shelf. The judge's own stumbles never count against a render.
export function momentBrief(prose) {
  return `You are judging ONE image against the story moment it was painted to depict: "${String(prose).replace(/"/g, '\u2019').slice(0, 480)}". Does the image stage THIS moment — its action, its time of day and weather, and the specific things the text names (a road, a fork, a mechanism, a hearth, a threshold, a figure) — rather than a generic vista of the same world? Judge presence, not artistry. Answer true only when the moment's DEFINING features — every named thing, the action, the time of day — are present together, large in the frame, each carried by its form and silhouette alone. Answer false when any defining feature is absent, or when the image could pass for a generic scene of the same world. Answer STRICT JSON only: {"moment_staged": true|false, "missing": "<the single most telling named thing you cannot find, or an empty string>"}.`;
}

export function parseMoment(text = '') {
  try {
    const raw = String(text);
    const body = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    return { moment_staged: body.moment_staged === true, missing: typeof body.missing === 'string' ? body.missing.slice(0, 160) : '' };
  } catch { return { moment_staged: true, missing: '', floor: true }; }
}

export function momentRuling(verdict, { attempt = 1 } = {}) {
  if (verdict.floor || verdict.moment_staged) {
    return { action: 'accept', attest: { moment: verdict.floor ? 'floor' : 'staged' }, notes: [] };
  }
  if (attempt === 1) {
    return { action: 'repaint', attest: { moment: 'missed', ...(verdict.missing ? { missing: verdict.missing } : {}) }, notes: [`THE MOMENT WAS MISSED — the previous take painted the world and ignored the telling. Stage the moment's own action, weather, light, and named things large in the frame${verdict.missing ? `; above all, stage: ${verdict.missing}` : ''}. The moment outranks every canon. Show, never write — no words, letters, or signs.`] };
  }
  // A second miss SHIPS the better take with the miss sealed in the attest —
  // the house labels dishonesty, it does not starve the shelf. A turn with no
  // plate at all starves every consumer that waits on the easel (and the
  // courts judge what ships either way).
  return { action: 'accept', attest: { moment: 'missed', ...(verdict.missing ? { missing: verdict.missing } : {}) }, notes: [] };
}
