import { useEffect, useRef, useState } from 'react';
import { Feather } from 'lucide-react';
import ChroniclePage from './ChroniclePage.jsx';
import { tickPhrase, tickWhispers } from 'fatescript/sequencing';
import { spanPhrase } from '../lib/clockAtTable.js';

// ------------------------------------------------------------
// SEQUENCE ROWS — Task #50: story beats land in order.
// Presentation only. Nothing here writes; everything here quotes.
// ------------------------------------------------------------

// TIME PASSES — a sealed tick, shown as a quiet divider instead of an empty
// turn row. The phrase reads the SEALED neighbor's time_advance; the
// whispers quote the tick's own ops, never invent.
export function TickDivider({ log, prevLog }) {
  // A sealed span (Directive VI, Phase 1) is time the table itself
  // declared — an interlude's day on the road. Its phrase is its own
  // clock words, its whispers the band-crossings it carried. Quotes only.
  if (log.kind === 'span') {
    const notes = Array.isArray(log.notes) ? log.notes : [];
    return <div className="time-divider" role="note" aria-label="Time passes in the world">
      <span className="divider-row"><i /><em>{spanPhrase(log)}</em><i /></span>
      {notes.length > 0 && <p className="whispers">{notes.map((note, i) => <span key={i}>{note}</span>)}</p>}
    </div>;
  }
  const whispers = tickWhispers(log);
  return <div className="time-divider" role="note" aria-label="Time passes in the world">
    <span className="divider-row"><i /><em>{tickPhrase(prevLog)}</em><i /></span>
    {whispers.length > 0 && <p className="whispers">{whispers.map((whisper, i) =>
      <span key={i}>Meanwhile, {whisper.name} {whisper.change}.</span>)}</p>}
  </div>;
}

// THE CHRONICLER IS WRITING — holds a page's seat while the retelling is in
// flight. Never rendered on a keyless table (the seat is only ever taken
// when a real retelling is possible).
export function PendingPage({ reduceMotion }) {
  // The quill bobs only for tables that welcome motion: the app-level
  // setting stills it here; the OS-level preference stills it in CSS.
  return <div className={reduceMotion ? 'page-pending still' : 'page-pending'} role="status"><Feather size={12} aria-hidden /> The Chronicler is writing…</div>;
}

// CHOICES ON THE BEAT — suggestion chips fade in after a short reading
// beat, staggered; reduced motion sees them at once; input is never gated.
// Long suggestions (>55 chars) open a full-text sheet before committing; short
// ones pick directly. Edge fades appear only when the rail can scroll.
export function SuggestionRow({ suggestions, disabled, onPick, reduceMotion }) {
  const railRef = useRef(null);
  const [sheet, setSheet] = useState(null); // index of expanded chip, or null

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;
    const update = () => {
      const wrap = rail.parentElement;
      if (!wrap) return;
      const { scrollLeft, scrollWidth, clientWidth } = rail;
      wrap.classList.toggle('scroll-has-left', scrollLeft > 2);
      wrap.classList.toggle('scroll-has-right', scrollLeft < scrollWidth - clientWidth - 2);
    };
    update();
    rail.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => { rail.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, []);

  return <div className="suggestions-wrap">
    {sheet !== null && <div className="chip-sheet" role="dialog" aria-modal="true" aria-label="Full suggestion text">
      <p>{suggestions[sheet]}</p>
      <div className="chip-sheet-row">
        <button onClick={() => { onPick(suggestions[sheet]); setSheet(null); }} disabled={disabled}>Use this</button>
        <button className="secondary-button" onClick={() => setSheet(null)}>Back</button>
      </div>
    </div>}
    <div className="suggestions" ref={railRef}>
      {suggestions.map((suggestion, index) => {
        const isLong = suggestion.length > 55;
        return <button key={suggestion} disabled={disabled}
          className={`${reduceMotion ? '' : 'chip-enter '}chip-item${isLong ? ' chip-long' : ''}`}
          style={reduceMotion ? undefined : { animationDelay: `${(0.55 + index * 0.07).toFixed(2)}s` }}
          onClick={() => isLong ? setSheet(index) : onPick(suggestion)}>
          {suggestion}
        </button>;
      })}
    </div>
  </div>;
}

// THE TALE SO FAR — re-entry orientation built only from what is already
// sealed: the latest lawful chronicle page when one exists, the mast alone
// when none does. Dismiss returns to the road; nothing is generated.
export function RecapCard({ recap, onDismiss }) {
  const mast = recap.mast || {};
  return <section className="recap-card" aria-label="The tale so far">
    <span className="eyebrow">The tale so far</span>
    <p className="recap-mast"><b>{mast.arc}</b> · Act {mast.act} · {mast.chapter}{mast.goal ? `: ${mast.goal}` : ''}</p>
    {recap.kind === 'page' && <ChroniclePage page={recap.page} />}
    {/* (Directive XIV) The Tale chapter re-reads this card as a page — a
        reading has no dismiss; the feed's own card keeps its door. */}
    {onDismiss && <button className="text-button" onClick={onDismiss}>Return to the road →</button>}
  </section>;
}
