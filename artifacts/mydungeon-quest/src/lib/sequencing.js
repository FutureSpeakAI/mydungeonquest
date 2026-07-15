// ------------------------------------------------------------
// SEQUENCING — story beats land in order. Task #50, amended.
//
// Presentation law, not record law: NOTHING in this module writes to logs
// or the journal, and nothing here mutates a tick. The sealed record stays
// exactly as the reducers left it; this layer only decides what the feed
// SHOWS and WHERE. Pure functions, gated in evals/sequencing.test.mjs.
// ------------------------------------------------------------

// A sealed entry's render kind. A tick is never an empty turn row.
export function renderKindOf(log) {
  return log?.kind === 'tick' ? 'tick' : 'turn';
}

// The divider's phrase, read from the SEALED turn that summoned the tick
// (its time_advance). No time on the neighbor means the chapter turned.
export function tickPhrase(prevLog) {
  const advance = prevLog?.dm?.time_advance;
  if (advance?.unit === 'hours') return advance.n === 1 ? 'An hour passes.' : `${advance.n} hours pass.`;
  if (advance?.unit === 'days') return advance.n === 1 ? 'A day passes.' : `${advance.n} days pass.`;
  return 'Time passes.';
}

// Up to two whispers, QUOTING the tick's own sealed ops — never invented.
// 'Offscreen — presses on toward the mill's debt.' → 'presses on toward the mill's debt'
export function tickWhispers(log, max = 2) {
  return (log?.dm?.story?.cast_update || []).slice(0, max).map((patch) => ({
    name: patch.name,
    change: String(patch.fact_add || '').replace(/^Offscreen — /, '').replace(/\.$/, '')
  })).filter((whisper) => whisper.change);
}

// THE BOUNDARY STACK, codified: within the feed, a chapter's chronicle page
// closes its chapter (anchored after the chapter's last entry), THEN the
// time-passes divider, THEN the next chapter's first turn. Pages anchor by
// afterLogId; a page whose anchor is gone (or was struck) falls back to the
// last entry of its own beat, then to the end — a page is never lost to
// arrival timing. Pending rows hold a page's place at the same anchor, and
// vanish the moment the page (or nothing) is decided.
export function orderFeed(logs = [], pages = [], pendingPages = []) {
  const items = [];
  const anchored = new Set();
  const logIds = new Set(logs.map((log) => log.id));
  const byAfterId = new Map();
  for (const page of pages) if (page.afterLogId && logIds.has(page.afterLogId)) byAfterId.set(page.afterLogId, page);

  const lastIndexOfBeat = new Map();
  logs.forEach((log, index) => lastIndexOfBeat.set(log.beatIndex, index));

  logs.forEach((log, index) => {
    items.push({ kind: renderKindOf(log), log });
    const page = byAfterId.get(log.id);
    if (page) { items.push({ kind: 'page', page }); anchored.add(page); }
    // Orphaned pages — anchor log struck from existence or never seen —
    // land at their chapter's true boundary: the last entry of their beat.
    for (const orphan of pages) {
      if (anchored.has(orphan)) continue;
      if (orphan.afterLogId && logIds.has(orphan.afterLogId)) continue; // will anchor directly
      if (lastIndexOfBeat.get(orphan.beatIndex) === index) { items.push({ kind: 'page', page: orphan }); anchored.add(orphan); }
    }
    // A pending row holds the PAGE'S OWN seat (same afterLogId anchor the
    // page will take), only while no page exists for that chapter; the beat
    // boundary is the fallback when the anchor is unknowable.
    for (const pending of pendingPages) {
      if (pages.some((page) => page.beatIndex === pending.beatIndex)) continue;
      const seatHere = pending.afterLogId && logIds.has(pending.afterLogId)
        ? log.id === pending.afterLogId
        : lastIndexOfBeat.get(pending.beatIndex) === index;
      if (seatHere) items.push({ kind: 'page-pending', beatIndex: pending.beatIndex });
    }
  });
  for (const orphan of pages) if (!anchored.has(orphan)) items.push({ kind: 'page', page: orphan });
  return items;
}

// THE TALE SO FAR — built ONLY from what already exists. A struck page is
// never shown (redaction law); with no lawful page, the mast alone orients
// (act, chapter, the arc's name); a fresh or completed tale stays silent.
export function recapFor(campaign) {
  const logs = (campaign?.logs || []);
  if (!logs.some((log) => !log.redacted && log.kind !== 'tick')) return null;
  if (campaign.completed) return null; // a finished book opens to its keepsakes, not a recap
  if (campaign.readOnly) return null; // a borrowed book opens where it lies — read-only spines are never recapped
  const codex = campaign.codex;
  const beat = codex?.spine?.beats?.[codex.beatIndex] || {};
  const mast = {
    act: beat.act || 1,
    chapter: beat.title || '',
    goal: beat.goal || '',
    arc: codex?.arc?.title || campaign.title || ''
  };
  const struck = new Set(logs.filter((log) => log.redacted).map((log) => log.id));
  const lawful = (campaign.chroniclePages || [])
    .filter((page) => !page.redacted && !struck.has(page.afterLogId))
    .sort((a, b) => b.beatIndex - a.beatIndex);
  if (lawful.length) return { kind: 'page', page: lawful[0], mast };
  return { kind: 'mast', mast };
}
