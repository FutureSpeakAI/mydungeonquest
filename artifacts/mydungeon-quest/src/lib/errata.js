// ---------------------------------------------------------------------------
// THE ERRATA LEDGER (Experience-Directive XVII, stage three, the beta
// doors) — an on-device ring of uncaught mishaps, kept small, device-local
// like the seen ledger: never sealed, never synced, never exported on its
// own. It feeds exactly one thing: the beta door's report, which leaves
// only by the tester's own hand. Fail-open by law — a walled storage keeps
// the game whole and the ledger silently empty.
// ---------------------------------------------------------------------------
const KEY = 'mdq:errata';
const CAP = 20;

export function errata() {
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(rows) ? rows.filter((row) => row && typeof row.word === 'string') : [];
  } catch { return []; }
}

export function foldErratum(entry) {
  try {
    const rows = errata();
    rows.push({
      kind: String(entry?.kind || 'error').slice(0, 24),
      word: String(entry?.word || '').slice(0, 200),
      at: Number(entry?.at) || Date.now()
    });
    localStorage.setItem(KEY, JSON.stringify(rows.slice(-CAP)));
  } catch { /* walled off — the ledger stays quiet */ }
}

export function watchErrata(win = typeof window !== 'undefined' ? window : null) {
  if (!win?.addEventListener) return;
  win.addEventListener('error', (event) => foldErratum({ kind: 'error', word: event?.message || 'unnamed error' }));
  win.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    foldErratum({ kind: 'promise', word: (reason && (reason.message || String(reason))) || 'unnamed rejection' });
  });
}

// THE REPORT — composed whole, consent stated in its first lines, sent only
// by hand. No campaign title, no id, no prose from the tale rides in it:
// tier, seat, turn count, and the errata tail are the whole testimony.
export function composeReport({ version, campaign, settings, plan } = {}) {
  const kept = errata();
  const tail = kept.slice(-5);
  return [
    'MyDungeon.Quest beta report',
    'CONSENT: this report leaves only by your own hand. Read it whole before you send it; nothing is sent for you.',
    `version: ${version || 'unversioned'}`,
    `tier: ${campaign?.mediaTier || settings?.mediaTier || 'unknown'}`,
    `seat: ${plan || 'keyless'}`,
    `turns walked: ${Number.isInteger(campaign?.turnCount) ? campaign.turnCount : 0}`,
    `errata kept: ${kept.length}${tail.length ? ` (last ${tail.length} follow)` : ''}`,
    ...tail.map((row) => `  [${row.kind}] ${new Date(row.at).toISOString()} ${row.word}`),
    'what happened, in your own words:',
    ''
  ].join('\n');
}
