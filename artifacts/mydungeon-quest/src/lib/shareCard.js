// ------------------------------------------------------------
// THE COMMONS at the table — share cards (Directive V, Commons
// Law's groundwork half).
//
// A sealed chapter may be shown, and showing has rules — all of
// them the engine's (fatescript/shareCard): the turning point is
// picked deterministically, the quote is verbatim from the sealed
// turn or absent, the plate walks only the strict door, secrets
// and struck rows never leave the table, and every record string
// crosses the escape at the boundary. This seat slices a chapter
// from the record, names the file from the numeral alone (record
// strings never name a file), and hands the rendered card to the
// patron as a download. A fork carries the covenant and the
// world's shape — never another patron's journal.
// ------------------------------------------------------------
import { composeShareCard, renderShareCardHtml, forkGenesis, escapeHtml } from 'fatescript/shareCard';
import { romanNumeral } from 'fatescript/story';

// One chapter, one beat: the rows that lived under it — struck rows
// included, because the law wants them present, marked, and silent;
// the engine refuses them a public word.
export function chapterEntries(campaign, beatIndex) {
  return (campaign?.logs || []).filter((log) => (log?.beatIndex ?? -1) === beatIndex);
}

// The chapter's public face, composed in the engine's own words.
export function chapterCard(campaign, beatIndex, plate = null) {
  const beat = campaign?.codex?.spine?.beats?.[beatIndex] || null;
  const chapterLabel = beat ? `Chapter ${romanNumeral(beatIndex + 1)} \u2014 ${beat.title}` : '';
  return composeShareCard({
    worldTitle: campaign?.title || '',
    taleTitle: campaign?.codex?.arc?.title || campaign?.title || '',
    chapterLabel,
    entries: chapterEntries(campaign, beatIndex),
    plate
  });
}

// The card as a whole page: a static shell around the engine-escaped
// fragment — no record string enters unescaped.
export function cardPageHtml(card) {
  return [
    '<!doctype html>',
    '<html lang="en"><head><meta charset="utf-8"/>',
    `<title>${escapeHtml(card.worldTitle || card.taleTitle || 'A tale')}</title>`,
    '<style>body{margin:0;display:grid;place-items:center;min-height:100vh;background:#141210;color:#e8e0d2;font-family:Georgia,serif}article.share-card{max-width:32rem;padding:2.5rem;text-align:center}article.share-card img{max-width:100%;border-radius:6px}blockquote{font-style:italic;font-size:1.15rem;line-height:1.6}footer{margin-top:2rem;opacity:.6;font-size:.85rem;letter-spacing:.08em}</style>',
    '</head><body>',
    renderShareCardHtml(card),
    '</body></html>'
  ].join('\n');
}

// The strict door names the file: numeral only, never a record string.
export function cardFileName(beatIndex) {
  return `share-card-chapter-${romanNumeral(beatIndex + 1).toLowerCase()}.html`;
}

// Hand the card to the patron. Browser-only by nature; the gate never calls it.
export function downloadCard(card, beatIndex) {
  if (typeof document === 'undefined') throw new Error('The card is handed over at the table, not on the bench.');
  const blob = new Blob([cardPageHtml(card)], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = cardFileName(beatIndex);
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// A fork carries the covenant and the world's shape — never another
// patron's journal, never a soul's secret. By construction: the genesis
// has no seat for logs, cast, or journal at all.
export function forkSkeleton(campaign, shelfUrl = '') {
  return forkGenesis({
    worldTitle: campaign?.title || '',
    covenant: campaign?.covenant || '',
    regions: campaign?.codex?.regions || [],
    shelfUrl
  });
}
