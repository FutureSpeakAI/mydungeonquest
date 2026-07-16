import { Sparkles } from 'lucide-react';

// THE THREE SPARKS ROW (Directive V) — three ready worlds, one tap each.
// Writing your own sentence stays one field below; the Deep Forge stays a
// door away. Prop-driven and pure, so the gate can render it headless.
export function SparkRow({ sparks, onPick, disabled }) {
  return <div className="spark-row" role="group" aria-label="Three ready worlds">
    {sparks.map((spark) => <button key={spark.title} type="button" className="spark-card" disabled={disabled} onClick={() => onPick(spark)}>
      <span className="spark-eyebrow"><Sparkles size={12} aria-hidden /> A ready world</span>
      <b>{spark.title}</b>
      <p>{spark.covenant}</p>
      <small>{spark.tone}</small>
    </button>)}
  </div>;
}
