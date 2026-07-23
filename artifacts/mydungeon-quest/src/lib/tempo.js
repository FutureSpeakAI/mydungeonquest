// THE TEMPO LAW (Directive XX, Law IV) — the seating bridge. The pure
// court lives in the engine (one law, one seat — never mirrored here);
// this bridge only reads the campaign's own setting and hands the court
// the sealed evidence the easel already holds. Absence of a setting reads
// 'every' inside tempoSetting itself, so a pre-tempo save keeps today's
// cadence without a byte written to it.
import { tempoCourt, tempoSetting, TEMPO_SETTINGS } from 'fatescript/tempo';

export { tempoCourt, tempoSetting, TEMPO_SETTINGS };

// The one question the easel asks: does THIS turn seat its scene plate?
// Key art, busts, sheets, and region plates never pass through here —
// the court judges the per-turn scene paint and only that.
export function sceneVerdict(campaign, dm, turnIndex) {
  return tempoCourt({
    dm,
    codex: campaign?.codex || null,
    turnIndex,
    setting: tempoSetting(campaign?.tempo)
  });
}
