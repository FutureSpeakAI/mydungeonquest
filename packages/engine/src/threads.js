// ------------------------------------------------------------
// THE THREAD LEDGER — the narrative debt economy, replayed pure from the
// sealed record. A thread exists because a thread_add sealed it; it closes
// because a thread_resolve sealed the honest outcome. Citations come from
// replay, so the Codex can point at the exact turn a promise was made.
// ------------------------------------------------------------
const canon = (label) => String(label || '').trim().toLowerCase();
export const THREAD_KINDS = ['promise', 'debt', 'mystery', 'goal'];
export const THREAD_OUTCOMES = ['kept', 'broken', 'resolved'];

export function threadsOf(campaign) {
  const ledger = [];
  (campaign?.logs || []).forEach((log, index) => {
    if (log.redacted) return;
    const story = log?.dm?.story || {};
    for (const add of (story.thread_add || []).slice(0, 2)) {
      if (!add?.label || ledger.some((thread) => canon(thread.label) === canon(add.label) && thread.status === 'open')) continue;
      ledger.push({
        label: String(add.label).slice(0, 90),
        kind: THREAD_KINDS.includes(add.kind) ? add.kind : 'promise',
        holder: add.holder ? String(add.holder).slice(0, 60) : null,
        openedTurn: index,
        gloss: String(log.player || log.deed || '').slice(0, 90),
        status: 'open', closedTurn: null, outcome: null
      });
    }
    for (const close of (story.thread_resolve || []).slice(0, 2)) {
      const open = ledger.find((thread) => canon(thread.label) === canon(close?.label) && thread.status === 'open');
      if (!open || !THREAD_OUTCOMES.includes(close.outcome)) continue;
      open.status = close.outcome; open.outcome = close.outcome; open.closedTurn = index;
    }
  });
  return ledger;
}

export const openThreadsOf = (campaign) => threadsOf(campaign).filter((thread) => thread.status === 'open');
