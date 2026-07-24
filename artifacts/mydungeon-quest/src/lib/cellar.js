// ------------------------------------------------------------
// THE CELLAR SWEEP (Directive XXII — the house keeps a tidy shelf)
//
// Pixels are cache; the record is law. The media shelf under the
// house grows with every painted turn, and most of what it holds
// the record no longer hangs. The sweep is a deterministic pass
// over the shelf that KEEPS every treasure and clears the rest:
//
//   IMMORTAL, each row naming its own immunity in the ledger:
//     · unreadable rows — a row the law cannot read proves nothing
//       and is never burned (fail-closed, the witness law);
//     · every audio row — music, sfx, narration rest untouched
//       this season (the sweep is plates-only by decree);
//     · composite reference sheets (the Likeness Law's timber);
//     · anchors — a soul's blessed bust, a region's first plate
//       (the Anchor Law calls them permanent);
//     · house furniture — keyart, portraits, beat stills, covers:
//       only elder scenes and superseded region states may burn;
//     · plates attested into a bound book (a cited page outlives
//       its author);
//     · each region's standing plate (the state the table shows);
//     · the held frame — the standing scene plate a non-painting
//       turn displays (the tempo law leans on it);
//     · every row young enough — within the last two acts;
//     · unattributable rows — if the sealed record cannot name the
//       turn that minted a plate, the plate is kept (fail-closed).
//
//   EVICTED, each row naming its horizon:
//     · elder scene plates beyond the two-act horizon;
//     · superseded region states beyond the same horizon.
//
// The plan is PURE: media rows + journal + the standing act in,
// full ledger out — deterministic and byte-stable on repeat. The
// executor then walks one Dexie transaction on the media shelf
// alone, deleting exactly what the plan names and nothing else.
// The journal, the chain, the attestations, the campaigns, keys,
// memories, settings, and the seen ledger are never touched. The
// foundry's cache keys are not rewritten — a cleared key simply
// stands empty, and any LAWFUL future ask re-paints under the
// standing spend laws, anchored to the surviving anchors, exactly
// as any paint does. Nothing here re-asks on its own: no silent
// re-bill.
//
// LEAN DOOR: this module imports nothing. The executor borrows
// the db through its own lazy door, so a surface that only wants
// the cellar's spoken line drags no machinery into the closure.
// ------------------------------------------------------------

// The honest empty frame, in house language — spoken by a surface
// standing where an evicted plate once hung (the one-road law's
// own pattern: honest words over a wrong image, always).
export const CELLAR_FRAME_LINE = 'This canvas was cleared from the cellar; the record of its painting stands sealed.';

// Only these plate classes may ever burn. A row from before the
// subtype law (no subtype at all) falls to house furniture — kept.
const EVICTABLE = new Set(['scene', 'region', 'establishing']);
const REGIONAL = new Set(['region', 'establishing']);

// "Attested into a bound book" — journal rows whose payloads cite
// plates by assetHash. The walk is a whitelist: the book's own row
// types, never media_attestation (every plate has one of those —
// citing yourself binds nothing) and never turn rows (prose is not
// a binding).
const BOOK_TYPES = new Set(['chronicle_page', 'binding', 'saga', 'book']);

const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

// Collect every string reachable inside a sealed payload. Sealed
// payloads are canonical JSON by law — plain recursion is safe.
function collectStrings(value, out) {
  if (typeof value === 'string') { out.add(value); return out; }
  if (Array.isArray(value)) { for (const item of value) collectStrings(item, out); return out; }
  if (isRecord(value)) { for (const key of Object.keys(value)) collectStrings(value[key], out); return out; }
  return out;
}

// Deterministic string order — codepoint comparison, never locale.
const byHash = (a, b) => (a.assetHash < b.assetHash ? -1 : a.assetHash > b.assetHash ? 1 : 0);

// Newest-of-group law: latest createdAt wins; ties fall to the
// greater assetHash so repeat walks agree byte for byte.
function newest(rows) {
  let best = null;
  for (const row of rows) {
    if (!best) { best = row; continue; }
    const a = row.createdAt || 0, b = best.createdAt || 0;
    if (a > b || (a === b && row.assetHash > best.assetHash)) best = row;
  }
  return best;
}

// The Anchor Law's own choice, mirrored from the foundry's resolve:
// bust first, then the oldest plate; ties fall to the lesser hash.
function anchorOf(rows) {
  let best = null;
  for (const row of rows) {
    if (!best) { best = row; continue; }
    const bust = row.variant === 'bust', bestBust = best.variant === 'bust';
    if (bust !== bestBust) { if (bust) best = row; continue; }
    const a = row.createdAt || 0, b = best.createdAt || 0;
    if (a < b || (a === b && row.assetHash < best.assetHash)) best = row;
  }
  return best;
}

// THE PLAN — pure, deterministic, byte-stable. Every kept row
// names its immunity; every evicted row names its horizon. The
// journal is read, never written; attribution comes from the
// sealed record alone, and a row the record cannot place is kept.
export function sweepPlan({ media, journal, currentAct } = {}) {
  const rows = (Array.isArray(media) ? media : []).filter(isRecord);
  const record = Array.isArray(journal) ? journal.filter(isRecord) : [];
  const standingAct = Number.isInteger(currentAct) && currentAct > 0 ? currentAct : 1;

  // The sealed record's map: recordHash -> row index i.
  const seatOf = new Map();
  for (const row of record) {
    if (typeof row.recordHash === 'string' && Number.isInteger(row.i)) seatOf.set(row.recordHash, row.i);
  }
  // Act fences: annal and epoch rows both carry the closed act's
  // 0-based index; either suffices, the earliest seat rules. A
  // missing fence undercounts age — rows read YOUNGER, and are
  // kept: the failure direction is the safe one.
  const fenceSeat = new Map();
  for (const row of record) {
    if ((row.type === 'annal' || row.type === 'epoch') && isRecord(row.payload)
      && Number.isInteger(row.payload.actIndex) && Number.isInteger(row.i)) {
      const held = fenceSeat.get(row.payload.actIndex);
      if (held === undefined || row.i < held) fenceSeat.set(row.payload.actIndex, row.i);
    }
  }
  const fences = [...fenceSeat.values()];
  const actOf = (i) => 1 + fences.filter((seat) => seat < i).length;

  // The bound book's citations.
  const bookStrings = new Set();
  for (const row of record) {
    if (BOOK_TYPES.has(row.type) && row.payload !== undefined) collectStrings(row.payload, bookStrings);
  }

  // Group law: standing plates and anchors are chosen per label,
  // the held frame per campaign — computed over readable paint
  // rows only, exactly the rows the walk below will judge.
  const readable = rows.filter((row) => typeof row.assetHash === 'string' && row.assetHash);
  const paints = readable.filter((row) => row.kind === 'paint');
  const groups = { anchors: new Map(), regions: new Map(), scenes: new Map() };
  for (const row of paints) {
    const camp = typeof row.campaignId === 'string' ? row.campaignId : '';
    if (typeof row.label === 'string' && row.label && row.variant !== 'sheet') {
      const key = `${camp}\u0000${row.label}`;
      if (!groups.anchors.has(key)) groups.anchors.set(key, []);
      groups.anchors.get(key).push(row);
    }
    if (REGIONAL.has(row.subtype)) {
      const key = `${camp}\u0000${typeof row.label === 'string' ? row.label : ''}`;
      if (!groups.regions.has(key)) groups.regions.set(key, []);
      groups.regions.get(key).push(row);
    }
    if (row.subtype === 'scene') {
      if (!groups.scenes.has(camp)) groups.scenes.set(camp, []);
      groups.scenes.get(camp).push(row);
    }
  }
  const anchorHashes = new Set(), standingRegionHashes = new Set(), heldFrameHashes = new Set();
  for (const list of groups.anchors.values()) { const row = anchorOf(list); if (row) anchorHashes.add(row.assetHash); }
  for (const list of groups.regions.values()) { const row = newest(list); if (row) standingRegionHashes.add(row.assetHash); }
  for (const list of groups.scenes.values()) { const row = newest(list); if (row) heldFrameHashes.add(row.assetHash); }

  // THE WALK — canonical order (by assetHash), first immunity
  // names the row, and only a row no immunity claims may burn.
  const kept = [], evicted = [];
  let audio = 0, clearedBytes = 0;
  const keep = (row, immunity) => kept.push({
    assetHash: typeof row.assetHash === 'string' ? row.assetHash : null,
    kind: typeof row.kind === 'string' ? row.kind : null,
    subtype: typeof row.subtype === 'string' ? row.subtype : null,
    label: typeof row.label === 'string' ? row.label : null,
    immunity
  });
  const ordered = [...rows].sort((a, b) => {
    const ah = typeof a.assetHash === 'string' ? a.assetHash : '';
    const bh = typeof b.assetHash === 'string' ? b.assetHash : '';
    return ah < bh ? -1 : ah > bh ? 1 : 0;
  });
  for (const row of ordered) {
    if (typeof row.assetHash !== 'string' || !row.assetHash) { keep(row, 'unreadable — a row the law cannot read is never burned'); continue; }
    if (row.kind !== 'paint') { audio += 1; keep(row, 'audio-untouched — the sweep is plates-only this season'); continue; }
    if (row.variant === 'sheet') { keep(row, 'sheet — the Likeness Law\u2019s composite timber'); continue; }
    if (anchorHashes.has(row.assetHash)) { keep(row, 'anchor — the Anchor Law calls it permanent'); continue; }
    if (!EVICTABLE.has(row.subtype)) { keep(row, 'house-furniture — only elder scenes and superseded region states may burn'); continue; }
    if (bookStrings.has(row.assetHash)) { keep(row, 'book-attested — a cited page outlives its author'); continue; }
    if (REGIONAL.has(row.subtype) && standingRegionHashes.has(row.assetHash)) { keep(row, 'standing-region — the state the table shows'); continue; }
    if (row.subtype === 'scene' && heldFrameHashes.has(row.assetHash)) { keep(row, 'held-frame — the standing plate the tempo law leans on'); continue; }
    const seat = typeof row.originTurnHash === 'string' ? seatOf.get(row.originTurnHash) : undefined;
    if (!Number.isInteger(seat)) { keep(row, 'unattributable — the record cannot name its turn, so it stays'); continue; }
    const act = actOf(seat);
    const age = standingAct - act;
    if (age < 2) { keep(row, `young — act ${act} stands within the two-act horizon`); continue; }
    clearedBytes += (row.blob && typeof row.blob.size === 'number') ? row.blob.size : 0;
    evicted.push({
      assetHash: row.assetHash,
      subtype: typeof row.subtype === 'string' ? row.subtype : null,
      label: typeof row.label === 'string' ? row.label : null,
      act,
      horizon: REGIONAL.has(row.subtype)
        ? `a superseded ${typeof row.label === 'string' && row.label ? row.label : 'region'} state of act ${act}, ${age} acts behind the standing act`
        : `an elder scene of act ${act}, ${age} acts behind the standing act`
    });
  }
  return {
    version: 1,
    currentAct: standingAct,
    kept,
    evicted,
    counts: { held: kept.length, cleared: evicted.length, audio, clearedBytes }
  };
}

// THE EXECUTION — one transaction on the media shelf alone,
// deleting exactly what the plan names. The plan is computed
// BEFORE the transaction opens (the Dexie law: nothing async
// but the store's own ops inside), and no other store is joined.
export async function executeSweep(dbi, plan) {
  const hashes = (plan && Array.isArray(plan.evicted) ? plan.evicted : [])
    .map((row) => row && row.assetHash).filter((hash) => typeof hash === 'string' && hash);
  if (hashes.length) await dbi.transaction('rw', dbi.media, async () => { await dbi.media.bulkDelete(hashes); });
  return plan ? plan.counts : { held: 0, cleared: 0, audio: 0, clearedBytes: 0 };
}

// THE PASS — plan then execute for one campaign. Rides its own
// lazy door to the db so importing this module costs nothing.
export async function sweepCellar(campaignId, currentAct) {
  const { db } = await import('./db.js');
  const [media, journal] = await Promise.all([
    db.media.where('campaignId').equals(campaignId).toArray(),
    db.journal.where('campaignId').equals(campaignId).toArray()
  ]);
  const plan = sweepPlan({ media, journal, currentAct });
  await executeSweep(db, plan);
  return plan;
}

// The honest counts, spoken in house language.
export function sweepStory(counts) {
  const held = counts?.held || 0, cleared = counts?.cleared || 0, audio = counts?.audio || 0;
  const canvases = cleared === 1 ? 'old canvas' : 'old canvases';
  const rest = audio ? ` ${audio} audio ${audio === 1 ? 'row rests' : 'rows rest'} untouched.` : '';
  return `The cellar keeps its treasures — ${held} held, ${cleared} ${canvases} cleared.${rest}`;
}
