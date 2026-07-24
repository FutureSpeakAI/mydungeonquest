// ------------------------------------------------------------
// THE WAYPOST LAW (Directive XX, Law VI) — the house's ONE road to a
// proven shortcut. Replay is truth: every reader below either resumes
// from a waypost that PROVES itself and STANDS against the living
// record, or walks the full record exactly as it always has. Any
// disagreement is a silent refusal — no banner, no error; the full
// walk simply stands in. Wayposts are machinery: sealed in the journal
// like any record, chained and signed by the same desk, and NEVER
// rendered — not in the feed, not in the book, not behind the curtain.
// The harness and the app walk this same code; there is no second seat.
// ------------------------------------------------------------
import { foldCheckpoint, resumeFolds, walkFolds, checkpointStands, checkpointProves, WAYPOST_STRIDE } from 'fatescript/waypost';
import { styleDirectives } from 'fatescript/tells';
import { chartOf } from 'fatescript/chart';

export const WAYPOST_KIND = 'waypost';
export { WAYPOST_STRIDE };

// THE SESSION COURT — a seat is proven by its ROAD, never its shape:
// only a checkpoint that passed this session's hydrate court (proves +
// stands) or was built whole at the seal seat may ever resume a reader.
// The brand lives in a WeakSet: movable bytes (imports, restores, forks,
// any parsed file) can never wear it, so the reader itself refuses a
// foreign seat — even one wearing real pins — and the full walk stands
// in, silently, per the law.
const provenSeats = new WeakSet();
export function isProvenSeat(seat) { return typeof seat === 'object' && seat !== null && provenSeats.has(seat); }

// THE SEAL SEAT — both turn roads (the table and the proving walk) call
// this right after a turn's cluster has sealed. Every twenty-fifth
// sealed turn it folds the covered record whole and seals the checkpoint
// as a journal row. A refusal here never touches the turn: machinery
// fails to the console, and the full walk simply remains the law.
export async function sealWaypostIfDue(campaign, seal) {
  try {
    if (!campaign?.id || typeof seal !== 'function') return null;
    const turns = Number(campaign.turnNumber) || 0;
    if (turns < WAYPOST_STRIDE || turns % WAYPOST_STRIDE !== 0) return null;
    const checkpoint = await foldCheckpoint({ hero: campaign.hero ?? null, entries: Array.isArray(campaign.logs) ? campaign.logs : [] });
    if (!checkpoint.rows) return null;
    await seal(campaign.id, WAYPOST_KIND, checkpoint);
    provenSeats.add(checkpoint);
    return checkpoint;
  } catch (error) {
    console.error('The waypost was not raised — the full walk stands:', error);
    return null;
  }
}

// THE HYDRATE DOOR — at campaign open: the NEWEST journal waypost that
// both proves itself (its own digest and state hash) and stands against
// the living record is seated beside the campaign. A bent newest post is
// walked past — an elder that still stands may serve; none standing,
// null, and the full walk is the only road.
export async function hydrateWaypost(journal, campaign) {
  const rows = Array.isArray(journal) ? journal : [];
  const hero = campaign?.hero ?? null;
  const logs = Array.isArray(campaign?.logs) ? campaign.logs : [];
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    if (!row || typeof row !== 'object' || row.type !== WAYPOST_KIND) continue;
    try {
      if (!(await checkpointProves(row.payload))) continue;
    } catch { continue; }
    if (!checkpointStands(row.payload, { hero, entries: logs })) continue;
    provenSeats.add(row.payload);
    return row.payload;
  }
  return null;
}

// THE ONE ROAD every reader walks: resumed when the seated waypost still
// stands against the record AT THIS INSTANT (a strike lands mid-session
// too, and un-seats it just as silently), the full walk otherwise.
// Pure and synchronous — surfaces call it inside their own memos.
export function foldsAt(campaign) {
  const hero = campaign?.hero ?? null;
  const logs = Array.isArray(campaign?.logs) ? campaign.logs : [];
  const checkpoint = campaign?.waypost;
  if (checkpoint && isProvenSeat(checkpoint) && checkpointStands(checkpoint, { hero, entries: logs })) {
    try {
      return resumeFolds(checkpoint, logs.slice(checkpoint.rows), { hero });
    } catch (error) {
      console.error('The waypost did not resume — the full walk stands:', error);
    }
  }
  return walkFolds({ hero, entries: logs });
}

// The readers, each byte-identical to the direct it shadows.
export function cardsAt(campaign) { return foldsAt(campaign).cards; }
export function packClockAt(campaign) { return foldsAt(campaign).pack; }
export function tellCourtAt(campaign) {
  const report = foldsAt(campaign).tells;
  return { report, directives: styleDirectives(report) };
}
export function chartAt(campaign) { return chartOf(campaign, { travel: foldsAt(campaign).travel }); }
