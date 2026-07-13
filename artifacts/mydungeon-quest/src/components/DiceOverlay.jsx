import { useEffect } from 'react';

export default function DiceOverlay({ result, onDone, haptics = true }) {
  useEffect(() => {
    if (haptics) navigator.vibrate?.(result?.outcome?.includes('critical') ? [40,30,80] : 35);
    const timer = setTimeout(onDone, 1900);
    return () => clearTimeout(timer);
  }, [result, onDone, haptics]);
  if (!result) return null;
  const critical = result.outcome === 'critical_success';
  return <div className="dice-overlay" role="status" aria-live="assertive">
    <div className={`die ${critical ? 'critical' : ''}`}><span>{result.selectedDie}</span></div>
    <div className="dice-math">
      {result.modifiers.map((mod) => <span key={mod.source}>{mod.source} {mod.value >= 0 ? '+' : ''}{mod.value}</span>)}
      <strong>{result.total}</strong>
      <em>{result.outcome.replaceAll('_', ' ')}</em>
    </div>
  </div>;
}
