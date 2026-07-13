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
  return `${clean.replace(/\s+/g, ' ').trim()} Family-safe PG-13 fantasy illustration with restrained peril and no exploitative detail.`;
}

export function portraitPrompt(campaign, soul, variant = 'bust') {
  return scrubPrompt(`${campaign.codex?.arc?.style_bible || campaign.styleBible}. ${variant} portrait of ${soul.name}. Appearance canon: ${soul.visual}. Expression and posture reveal this goal: ${soul.goal}. No text, no frame.`, campaign);
}

export function regionPrompt(campaign, region) {
  const blight = campaign.codex.blight || 0;
  return scrubPrompt(`${campaign.codex.arc?.style_bible || campaign.styleBible}. Establishing landscape of ${region.name}. Region canon: ${region.visual}. Current state: ${region.state}. World blight ${blight}/5, shown through weather, architecture, and vegetation rather than gore. Wide cinematic composition.`, campaign);
}

export function scenePrompt(campaign, cue) {
  const souls = (cue.subjects || []).map((name) => campaign.codex.cast.find((soul) => soul.name === name)).filter(Boolean);
  const region = campaign.codex.regions.find((entry) => entry.name === cue.region);
  return scrubPrompt(`${campaign.codex.arc?.style_bible || campaign.styleBible}. Scene mood: ${cue.mood}. ${souls.map((soul) => `${soul.name} appearance canon: ${soul.visual}.`).join(' ')} ${region ? `${region.name} region canon: ${region.visual}; state ${region.state}.` : ''} Blight ${campaign.codex.blight}/5. Maintain exact faces, clothing motifs, and silhouette from reference images.`, campaign);
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

export function cinematicPrompt(campaign, cinematic, cue = {}) {
  return scrubPrompt(`${campaign.codex.arc?.style_bible || campaign.styleBible}. A 6-10 second 16:9 cinematic for ${cinematic.type}: “${cinematic.title}.” ${cinematic.subtitle}. Mood: ${cue.mood || cinematic.type}. Slow purposeful camera movement, one readable action, strong silhouette, no cuts faster than two seconds.`, campaign);
}

export async function generationSpec(kind, prompt, options = {}) {
  const value = { kind, scrubbedPrompt: prompt, promptVersion: 1, canonVersion: 1, provider: options.provider || 'auto', model: options.model || 'auto', seed: options.seed ?? null, dimensions: options.dimensions || null, duration: options.duration || null, referenceAssetHashes: options.referenceAssetHashes || [], providerParameters: options.providerParameters || {} };
  return { value, hash: await sha256(canonicalize(value)), promptHash: await sha256(prompt) };
}

function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
