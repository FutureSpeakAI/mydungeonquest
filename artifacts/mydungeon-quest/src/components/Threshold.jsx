import { RITE_STAGES, riteWord } from '../lib/threshold.js';
import { HOUSE_PROMO } from '../lib/houseConfig.js';

// THE THRESHOLD RITE (Experience-Directive XVII, Article VII) — the branded
// face of world genesis: the house candle, the wordmark, and the pipeline's
// TRUE stage spoken in plain speech. Never a spinner, never a percentage.
// One config-gated slot for the house's own word ships dark by default;
// no third-party surface exists here — no script, no iframe, no network.
// The band sits over the table without blocking it: the First Word law
// means narration is already streaming beneath while the easel works.
export function ThresholdRite({ rite }) {
  if (!rite) return null;
  const lit = RITE_STAGES.findIndex((stage) => stage.id === rite.stage);
  return <div className={`threshold-rite${rite.stage === 'open' ? ' opening' : ''}`} role="status" aria-live="polite">
    <div className="candle" aria-hidden="true"><span className="halo"/><span className="flame"/><span className="stem"/></div>
    <b className="rite-mark">MyDungeon<span>.Quest</span></b>
    <p className="rite-word">{riteWord(rite)}</p>
    <div className="rite-walk" aria-hidden="true">{RITE_STAGES.map((stage, i) => <i key={stage.id} className={i <= lit ? 'lit' : ''}/>)}</div>
    {HOUSE_PROMO && <p className="rite-promo">{HOUSE_PROMO}</p>}
  </div>;
}
