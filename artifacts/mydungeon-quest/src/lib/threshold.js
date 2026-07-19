// ---------------------------------------------------------------------------
// THE THRESHOLD LAW (Experience-Directive XVII, Article VII) — world genesis
// wears a branded rite: TRUE progress states named in plain speech, walked
// strictly FORWARD off the pipeline's own events, never invented and never
// a percentage. The First Word law is untouched: the walker only listens;
// the pour still outruns the paint. 'open' can lawfully arrive while a slow
// easel still works — a forward-only walk refuses the late step backward,
// and on the mock tier every stage lands in pinned order.
// Pure; keyless-safe; no browser surface.
// ---------------------------------------------------------------------------
export const RITE_STAGES = [
  { id: 'seated', word: 'The table is set.' },
  { id: 'word', word: 'The first word is on the wire.' },
  { id: 'easel', word: 'The easel is lit. The world and the face are at the frame.' },
  { id: 'anchors', word: 'The anchors are home.' },
  { id: 'open', word: 'Chapter One opens.' }
];

const rank = (id) => RITE_STAGES.findIndex((stage) => stage.id === id);

export function riteOpen() {
  return { stage: 'seated' };
}

// Forward only. A stranger stage, a repeat, or a step backward changes
// nothing — true progress can skip a lane that has not settled, but it can
// never regress.
export function riteWalk(rite, stage) {
  if (!rite || typeof rite.stage !== 'string') return rite;
  const from = rank(rite.stage);
  const to = rank(stage);
  if (to < 0 || to <= from) return rite;
  return { ...rite, stage };
}

export function riteWord(rite) {
  return RITE_STAGES.find((stage) => stage.id === rite?.stage)?.word || '';
}
