// ------------------------------------------------------------
// THE COMMONS — the engine's half (Commons Law, Directive V).
//
// A sealed chapter may be shown, and showing has rules. The turning point
// is picked deterministically — the highest-DC deed that succeeded, the
// earliest on a tie. The quote is verbatim from the sealed turn or it is
// absent: the quote court sits in public too. The plate walks only the
// strict door (attested data:image, same as the Binder's). Secrets are
// struck from anything that leaves the table. And the shelf shows text
// as text: every string from the record is escaped at the boundary — a
// soul named <script> walks the shelf inert.
// ------------------------------------------------------------

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

const attestedPlate = (src) => typeof src === 'string' && /^data:image\//.test(src) ? src : null;

// The turning point: the boldest deed that landed. DC first, earliest on
// a tie, and a redacted row never leaves the table.
export function pickTurningPoint(entries = []) {
  let best = null;
  entries.forEach((entry, index) => {
    if (entry.redacted || entry.kind === 'tick' || entry.kind === 'annal' || entry.kind === 'span') return;
    const res = entry.resolution;
    if (!res || !res.success) return;
    const dc = Number(res.dc ?? res.DC ?? 0);
    if (!best || dc > best.dc) best = { entry, index, dc };
  });
  if (!best) return null;
  const quote = (best.entry.dm?.narration_blocks || []).map((b) => b?.text).find(Boolean) || null;
  return { entry: best.entry, quote, dc: best.dc };
}

export function composeShareCard({ worldTitle = '', taleTitle = '', chapterLabel = '', entries = [], plate = null } = {}) {
  const turning = pickTurningPoint(entries);
  return {
    worldTitle: String(worldTitle || ''),
    taleTitle: String(taleTitle || ''),
    chapterLabel: String(chapterLabel || ''),
    quote: turning?.quote || null,          // verbatim or absent — never paraphrased
    plate: attestedPlate(plate),            // the strict door, in public
    credit: 'Made with FateScript'
  };
}

// The card, rendered. Every field crosses the escape at the boundary;
// the plate is inlined only if it passed the strict door.
export function renderShareCardHtml(card) {
  const quote = card.quote ? `<blockquote>“${escapeHtml(card.quote)}”</blockquote>` : '';
  const plate = card.plate ? `<img src="${card.plate}" alt="${escapeHtml(card.taleTitle)}" />` : '';
  return [
    `<article class="share-card">`,
    plate,
    `<h1>${escapeHtml(card.worldTitle || card.taleTitle)}</h1>`,
    card.chapterLabel ? `<h2>${escapeHtml(card.chapterLabel)}</h2>` : '',
    quote,
    `<footer>${escapeHtml(card.credit)}</footer>`,
    `</article>`
  ].filter(Boolean).join('\n');
}

// The shelf model: what a tale looks like in public. Secrets struck for
// every soul; struck rows honored as the journal law demands — present,
// marked, and silent.
export function shelfModel({ worldTitle = '', taleTitle = '', covenant = '', cast = [], entries = [], forkedFrom = null } = {}) {
  return {
    worldTitle: String(worldTitle || ''), taleTitle: String(taleTitle || ''), covenant: String(covenant || ''),
    forkedFrom: forkedFrom ? String(forkedFrom) : null,
    cast: cast.map((soul) => ({
      name: soul.name, role: soul.role, visual: soul.visual, status: soul.status, bond: soul.bond ?? 0,
      secret: soul.secret ? '◈ struck from the public record' : null
    })),
    passages: entries
      .filter((entry) => entry.kind !== 'tick' && entry.kind !== 'annal' && entry.kind !== 'span')
      .map((entry) => entry.redacted
        ? { struck: true, text: '[struck from the record]' }
        : { struck: false, text: (entry.dm?.narration_blocks || []).map((b) => b?.text).filter(Boolean).join(' ') })
  };
}

// A fork carries the covenant and the world's shape — never another
// patron's journal, never a soul's secret — and the credit line seals
// into the child's genesis.
export function forkGenesis({ worldTitle = '', covenant = '', regions = [], shelfUrl = '' } = {}) {
  return {
    worldTitle: String(worldTitle || ''), covenant: String(covenant || ''),
    regions: regions.map((region) => ({ name: region.name, description: region.description ?? '', state: region.state ?? '' })),
    forkedFrom: String(shelfUrl || ''),
    note: `Forked from ${shelfUrl || 'the commons'} — the covenant travels, the journal does not.`
  };
}
