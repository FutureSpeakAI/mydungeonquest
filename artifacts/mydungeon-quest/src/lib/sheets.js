// ============================================================
// THE REFERENCE SHEETS (EXPERIENCE DIRECTIVE XVII, Article I) —
// every carded subject gets ONE composite sheet, minted the moment
// it is introduced, derived from its sealed anchor, hash-attested,
// and never chained: a re-mint (lawful canon change only) derives
// from the ORIGINAL anchor again, never from a prior sheet. The
// grid, cells, and silence clause live in plateroad (the one road);
// this module only shapes the mint jobs the foundry runs.
// ============================================================
import { sheetBrief } from './plateroad.js';

// One deterministic ask per subject per revision. Revisions are
// canon-driven, never counters: a place sheet keys on the region's
// standing state (a turned state is a lawful canon change and mints
// fresh); souls, species, and items key at r0 until a lawful canon
// change (the atelier's costume turn, a later stage) names a new rev.
export function sheetKey(campaignId, name, rev = 'r0') {
  return `sheet:${campaignId}:${String(name).trim().toLowerCase()}:${rev}`;
}

// Named items worth a sheet: identity-bearing things the tale will
// paint again — a blade, an heirloom, a treasure. Documents and plain
// tools stay unsheeted (their text is canon, not their look).
export const NOTABLE_ITEM_KINDS = new Set(['weapon', 'treasure', 'keepsake']);

function job({ campaignId, name, kind, canon, rev = 'r0', seed }) {
  return {
    kind: 'paint',
    prompt: sheetBrief({ name, kind, canon }),
    // referenceLabels resolve the subject's SEALED ANCHOR at generation
    // time. The foundry resolves sheet jobs bust-first and NEVER against
    // a prior sheet — the never-chained law lives at that resolution.
    options: { kind: 'sheet', label: name, variant: 'sheet', referenceLabels: [name], ...(seed ? { seed } : {}) },
    // After the identity busts (rank 0) and the moment's own plate
    // (rank 1, easel priority): the sheet serves every FUTURE plate,
    // never delays this turn's. A PLACE sheet seats after the region's
    // canon plate (rank 3) — the lane is serial, so rank 4 guarantees
    // the anchor exists on the shelf before the sheet derives from it.
    // Species and notable items have no prior art: their sheet IS the
    // sealed anchor (a first take, referenceless by law).
    priority: kind === 'place' ? 4 : 2,
    cacheKey: sheetKey(campaignId, name, rev)
  };
}

// The turn's introductions, as sheet asks. Deterministic order:
// souls, then places, then species, then notable items — matching
// the story operations' own declaration order within each family.
export function sheetJobs(campaign, story) {
  const jobs = [];
  const campaignId = campaign.id;
  for (const soul of story?.cast_add || []) {
    const locked = campaign.codex.cast.find((entry) => entry.name === soul.name);
    if (locked) jobs.push(job({ campaignId, name: locked.name, kind: 'soul', canon: locked.visual || '' }));
  }
  if (story?.world?.region_add) {
    const region = campaign.codex.regions?.find((entry) => entry.name === story.world.region_add.name);
    if (region) jobs.push(job({ campaignId, name: region.name, kind: 'place', canon: region.visual || '', rev: region.state ? `s:${region.state}` : 'r0' }));
  }
  // A region whose STATE turned is a lawful canon change: the place
  // sheet re-mints under the new state's key, derived from the
  // region's original anchor again (never the prior sheet).
  if (story?.world?.region_update?.state != null) {
    const region = campaign.codex.regions?.find((entry) => entry.name === story.world.region_update.name);
    if (region) jobs.push(job({ campaignId, name: region.name, kind: 'place', canon: region.visual || '', rev: `s:${story.world.region_update.state}` }));
  }
  if (story?.creature_add) {
    const species = story.creature_add;
    if (species?.species) jobs.push(job({ campaignId, name: species.species, kind: 'species', canon: species.visual || '' }));
  }
  for (const item of story?.item_add || []) {
    if (item?.name && NOTABLE_ITEM_KINDS.has(item.kind)) {
      jobs.push(job({ campaignId, name: item.name, kind: 'item', canon: item.note || '' }));
    }
  }
  return jobs;
}

// The hero walks in at genesis — her sheet mints beside her first
// bust, from that same sealed anchor.
export function heroSheetJob(campaign) {
  if (!campaign?.hero?.name) return null;
  const canon = [campaign.hero.appearance, campaign.hero.signature].filter(Boolean).join('; ');
  return job({ campaignId: campaign.id, name: campaign.hero.name, kind: 'soul', canon });
}
