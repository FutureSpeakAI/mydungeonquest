// ------------------------------------------------------------
// THE FACE ON THE SHEET — Directive VI, Phase 12.
//
// The July 15 playtest: the hero's own face never reached the
// character sheet. The law: the sheet wears the blessed anchor
// (post-Sitting) if one stands; else the FIRST attested anchor —
// the oldest bust painted for this hero in this tale, the same
// face the storybook's dramatis personae wears; else the
// procedural mark on parchment. Always sourced from the media
// store by asset hash, never re-rendered for the occasion.
//
// Pure: the resolver reads rows it is handed and returns a
// verdict; the component owns blobs, object URLs, and the DOM.
// ------------------------------------------------------------

const canon = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

// The ladder. `rows` are media-store records ({ hash, kind, variant,
// label, createdAt, blob }); `blessedHash` is the hero's post-Sitting
// anchor hash if a Sitting has been held (absent until then — the rung
// must find nothing gracefully, never invent).
export function resolveSheetFace({ heroName = '', blessedHash = null, anchorHash = null, rows = [] } = {}) {
  const usable = rows.filter((r) => r && r.blob);
  // 1. The blessed anchor — a face ACCEPTED at a Sitting outranks all.
  //    Rows answer by the media store's own key: assetHash.
  if (blessedHash) {
    const row = usable.find((r) => r.assetHash === blessedHash);
    if (row) return { source: 'blessed', hash: row.assetHash, row };
  }
  // 2. The stable hash key — the first attested anchor, minted at the
  //    forge and kept on the campaign; a rename never orphans it.
  if (anchorHash) {
    const row = usable.find((r) => r.assetHash === anchorHash);
    if (row) return { source: 'attested', hash: row.assetHash, row };
  }
  // 3. The elder-tale walk — no stable key: the oldest bust bearing the
  //    hero's name. The label must carry the CURRENT name — a lawful
  //    face is the hero's own or none (no borrowed portraits).
  const name = canon(heroName);
  const bust = usable
    .filter((r) => r.kind === 'paint' && r.variant === 'bust' && (!name || canon(r.label).includes(name)))
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))[0] || null;
  if (bust) return { source: 'attested', hash: bust.assetHash, row: bust };
  // 3. The parchment floor — no lawful face; the caller seats the
  //    procedural mark. A sheet with no face at all is a form, not a leaf.
  return { source: 'parchment', hash: null, row: null };
}
