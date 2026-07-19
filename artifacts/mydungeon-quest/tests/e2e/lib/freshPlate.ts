// ============================================================
// THE FRESH-PLATE SWEEP (60B §4, G31c / TOOTH 21) — one seat, two
// sitters: the G31 court runs this walker over a lawful session and
// demands zero stale rows; tooth 21 doctors a row's papers and
// demands the SAME walker name the plant. The comparison is the
// court's OWN reading of the sealed fields — deliberately not a call
// into admitPlate, because a broken render door must not be able to
// green-light the court that judges it. (The door itself is proven
// in the DOM: an injected stale plate must show the honest
// stale-papers line, pinned below from the road's own words.)
// ============================================================
import { emptyFrameLine } from '../../../src/lib/plateroad.js';

export interface FreshRow {
  logId: string | null;
  status: 'fresh' | 'stale' | 'paperless-with-image' | 'captionless';
  detail: string;
}

/** The stale-papers line the DOM must show — read from the road's own
 * lexicon (one seat), so a re-worded refusal moves court and app together. */
export const STALE_LINE: string = emptyFrameLine('stale-papers');

/** Walks a campaign's log rows (harness mapLogRow shape or raw Dexie rows
 * carried WHOLE — the harness-row-roundtrip law) and judges every row
 * that claims a painted illustration. A row with imagePapers must carry
 * this-turn papers: attestation.originTurnHash === the row's own sealed
 * recordHash. A row with an image but NO papers is only lawful when it
 * predates the papers law (grandfathered replay) — the caller decides
 * whether such rows may exist; this sweep just names them. */
export function freshPlateSweep(logs: any[]): { fresh: FreshRow[]; stale: FreshRow[]; unpapered: FreshRow[] } {
  const fresh: FreshRow[] = [];
  const stale: FreshRow[] = [];
  const unpapered: FreshRow[] = [];
  for (const log of Array.isArray(logs) ? logs : []) {
    if (!log || typeof log !== 'object') continue;
    const papers = (log as any).imagePapers;
    const hasImage = Boolean((log as any).imageAssetHash || (log as any).imageUrl);
    const id = (log as any).id ?? null;
    if (papers && typeof papers === 'object') {
      const origin = (papers as any).originTurnHash ?? null;
      const turn = (log as any).recordHash ?? null;
      if (!turn || origin !== turn) {
        stale.push({ logId: id, status: 'stale', detail: `log ${id}: papers origin ${String(origin).slice(0, 12)}… ≠ turn ${String(turn).slice(0, 12)}…` });
      } else if (typeof (papers as any).caption === 'string' && !(papers as any).caption.trim()) {
        stale.push({ logId: id, status: 'captionless', detail: `log ${id}: papers carry a blank caption` });
      } else {
        fresh.push({ logId: id, status: 'fresh', detail: `log ${id}: this-turn papers` });
      }
    } else if (hasImage) {
      unpapered.push({ logId: id, status: 'paperless-with-image', detail: `log ${id}: an image rides with no papers (lawful only for pre-law replays)` });
    }
  }
  return { fresh, stale, unpapered };
}
