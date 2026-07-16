// ------------------------------------------------------------
// THE HUMAN HAND at the table — the tell court (Directive VI,
// Phase 10).
//
// The engine's court reads the sealed record — free, deterministic,
// struck rows staying struck — and counts the four measurable
// fingerprints per thousand words: the stated moral, the borrowed
// body, the tidy bow, the hushed register. When a family runs hot,
// the counter-directives ride the pack — capped at three, hottest
// family first — so the pressure lands on the NEXT turn, where
// pressure belongs. The court measures; it never rewrites. The
// record is law, including its sins.
// ------------------------------------------------------------
import { tellReport, styleDirectives, TELL_FAMILIES } from 'fatescript/tells';

export { TELL_FAMILIES };

// The court in session over the table's own record. Rows that never
// spoke — ticks, spans, annals — contribute nothing; the engine
// already refuses struck rows and empty mouths.
export function tellCourt(campaign) {
  const report = tellReport(campaign?.logs || []);
  return { report, directives: styleDirectives(report) };
}
