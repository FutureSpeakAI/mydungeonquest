import { useEffect } from 'react';

// ------------------------------------------------------------
// THE DICE RITUAL (Phase 6) — the table dims to a spotlight, the
// die tumbles onto its leather circle, and the result glows gold
// or ash. A critical earns one held breath before the prose
// resumes. The rattle is the Director's business (playUiSfx at
// the roll): gap-scheduled punctuation, silent on keyless tables.
// ------------------------------------------------------------

export const RITUAL_MS = 1900;
export const CRIT_HOLD_MS = 900; // one breath, held

export default function DiceOverlay({ result, onDone, haptics = true }) {
  const gold = result ? result.outcome.includes('success') : false;
  const critical = result ? result.outcome.startsWith('critical') : false;
  useEffect(() => {
    if (haptics) navigator.vibrate?.(critical ? [40, 30, 80] : 35);
    const timer = setTimeout(onDone, RITUAL_MS + (critical ? CRIT_HOLD_MS : 0));
    return () => clearTimeout(timer);
  }, [result, onDone, haptics, critical]);
  if (!result) return null;
  return <div className="dice-overlay" role="status" aria-live="assertive">
    <div className="dice-stage">
      <span className="dice-parchment" aria-hidden="true" />
      <div className={`die ${result.outcome === 'critical_success' ? 'critical' : ''} ${gold ? '' : 'ash'}`}><span>{result.selectedDie}</span></div>
    </div>
    <div className="dice-math">
      {result.modifiers.map((mod) => <span key={mod.source}>{mod.source} {mod.value >= 0 ? '+' : ''}{mod.value}</span>)}
      <strong className={gold ? 'gold' : 'ash'}>{result.total}</strong>
      <em>{result.outcome.replaceAll('_', ' ')}{critical ? ' — a breath is held' : ''}</em>
    </div>
  </div>;
}
