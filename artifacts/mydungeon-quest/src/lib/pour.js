// ------------------------------------------------------------
// THE POUR (Directive XI, Law I) — how a SEALED turn reaches the eye.
//
// The curtain means no word exists client-side before the seal; the
// pour is pure presentation over finished bytes. The plan is built
// once from the sealed narration blocks: word-group steps inside each
// block (every partial is a strict prefix slice of the block's own
// text), block boundaries land as whole paragraphs. Strict growth is
// therefore a property of construction, not of timing — the DOM only
// ever gains characters and paragraphs, never loses or rewrites one,
// which is exactly what the retraction detector (G5) watches for.
//
// Pure module: no React, no timers — the node-side curtain gate
// proves determinism and growth on these functions directly.
// ------------------------------------------------------------

// The plan: an ordered list of views; each view is the narration_blocks
// array as it should render at that step (earlier blocks whole, the
// newest block cut at a word boundary). The final view IS the sealed
// page, byte for byte.
export function pourPlan(blocks, wordsPerStep = 3) {
  const rows = Array.isArray(blocks) ? blocks : [];
  const steps = [];
  for (let i = 0; i < rows.length; i += 1) {
    const text = String(rows[i]?.text ?? '');
    const cuts = [];
    const words = /\S+\s*/g;
    let counted = 0;
    let match;
    while ((match = words.exec(text))) {
      counted += 1;
      if (counted % wordsPerStep === 0 && words.lastIndex < text.length) cuts.push(words.lastIndex);
    }
    for (const cut of cuts) {
      steps.push([...rows.slice(0, i), { ...rows[i], text: text.slice(0, cut) }]);
    }
    steps.push(rows.slice(0, i + 1));
  }
  if (!steps.length) steps.push(rows);
  return steps;
}

// The cadence: sized to the page so a lean turn still reads as a pour
// and a rich turn does not dawdle — the whole telling lands in about
// two and a half seconds, clamped to a humane tick either side.
export function pourInterval(stepCount) {
  return Math.max(24, Math.min(80, Math.round(2500 / Math.max(1, stepCount))));
}
