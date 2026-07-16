// ------------------------------------------------------------
// THE SCRIPTORIUM at the table — the room plans, the door speaks
// (Directive VI, Scriptorium Law groundwork).
//
// Four scribes — plot, character, setting, conflict — sit in the
// engine's room; the game convenes the keyless MOCK room over the
// record each turn: a deterministic plan derived from codex and
// cards alone, honest and labeled, free of keys. The court sits at
// the door regardless of who planned: a plan that carries prose
// machinery — narration blocks, speakers, smuggled paragraphs —
// is discarded WHOLE, and the pack rides without it. One Door is
// fed, never amended. Real, model-backed scribes are a charted
// wiring phase; they will convene at this same seam and face this
// same court.
// ------------------------------------------------------------
import { SCRIBES, scribeBrief, mockRoom, assertRoomSilent } from 'fatescript/scriptorium';
import { cardsForCampaign } from 'fatescript/cards';

export { SCRIBES, scribeBrief };
export const courtRoom = assertRoomSilent;

// Convene the room over the record: the mock plan, then the court.
// A sealed tale needs no plan; a speaking plan is refused whole.
export function roomForTurn(campaign) {
  if (!campaign?.codex || campaign.completed) return null;
  let cards = {};
  // THE REDACTION LAW at this seam: the cards the room plans from are
  // derived from the UNSTRUCK record only. A struck row feeds no
  // scribe, marks no soul active, and steers no directive — the
  // engine's cards fold reads whatever it is handed, so the hand
  // must be clean.
  try { cards = cardsForCampaign({ ...campaign, logs: (campaign.logs || []).filter((entry) => !entry?.redacted) }).cards; } catch { cards = {}; }
  const plan = mockRoom({ codex: campaign.codex, cards });
  const court = assertRoomSilent(plan);
  if (!court.ok) return null;
  return plan;
}
