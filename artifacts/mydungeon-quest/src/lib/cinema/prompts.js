import { canonicalize, sha256 } from '../canonical.js';

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
const ART_DIRECTION = 'Rendered as a painterly high-fantasy illustration in the tradition of Alan Lee and John Howe: naturalistic oil-and-watercolour concept art, muted earthen and candlelit palette, atmospheric depth with soft diffused light, fine painterly brushwork and film-preproduction realism, cinematic composition. Not cartoonish, not anime, not glossy 3D render, not video-game screenshot. Family-safe PG-13 with restrained peril and no exploitative detail. No text, watermarks, logos, or borders.';

export function portraitPrompt(campaign, soul, variant = 'bust') {
  return scrubPrompt(`${campaign.codex?.arc?.style_bible || campaign.styleBible}. ${variant} portrait of ${soul.name}. Appearance canon: ${soul.visual}. Expression and posture reveal this goal: ${soul.goal}. No text, no frame.`, campaign);
}

export function regionPrompt(campaign, region) {
  const blight = campaign.codex.blight || 0;
  return scrubPrompt(`${campaign.codex.arc?.style_bible || campaign.styleBible}. Establishing landscape of ${region.name}. Region canon: ${region.visual}. Current state: ${region.state}. World blight ${blight}/5, shown through weather, architecture, and vegetation rather than gore. Wide cinematic composition.`, campaign);
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
export function scenePrompt(campaign, cue, moment = null) {
  const souls = (cue.subjects || []).map((name) => campaign.codex.cast.find((soul) => soul.name === name)).filter(Boolean);
  const region = campaign.codex.regions.find((entry) => entry.name === cue.region);
  const beat = moment?.prose ? ` This exact moment from the telling: "${String(moment.prose).replace(/"/g, '\u2019').slice(0, 220)}".` : '';
  const framing = moment ? ` Composition: ${sceneFraming(moment.seed)}.` : '';
  return scrubPrompt(`${campaign.codex.arc?.style_bible || campaign.styleBible}. Scene mood: ${cue.mood}. ${souls.map((soul) => `${soul.name} appearance canon: ${soul.visual}.`).join(' ')} ${region ? `${region.name} region canon: ${region.visual}; state ${region.state}.` : ''} Blight ${campaign.codex.blight}/5.${beat}${framing} Maintain exact faces, clothing motifs, and silhouette from reference images.`, campaign);
}

export function keyArtPrompt(campaign, variant = 'establishing') {
  const bible = campaign.codex?.arc?.style_bible || campaign.styleBible;
  const darkening = variant === 'act-3'
    ? ' The story at its maximum stakes: storm-lit and embattled, the land itself holding its breath.'
    : variant === 'act-2'
      ? ' The world has darkened since the beginning: longer shadows, colder light, a threat now gathering on the horizon.'
      : '';
  return scrubPrompt(`${bible}. Epic 16:9 key art establishing this world — a single iconic vista with cinematic depth and dramatic light, no figures in the foreground. The world: ${campaign.covenant || ''}. Home region: ${campaign.homeRegion || 'the frontier'}. Tone: ${campaign.tone || 'mythic'}. No text, no frame, no title.${darkening}`, campaign);
}


export async function generationSpec(kind, prompt, options = {}) {
  const value = { kind, scrubbedPrompt: prompt, promptVersion: 1, canonVersion: 1, provider: options.provider || 'auto', model: options.model || 'auto', seed: options.seed ?? null, dimensions: options.dimensions || null, duration: options.duration || null, referenceAssetHashes: options.referenceAssetHashes || [], providerParameters: options.providerParameters || {} };
  return { value, hash: await sha256(canonicalize(value)), promptHash: await sha256(prompt) };
}

function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
