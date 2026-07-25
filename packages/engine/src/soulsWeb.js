// ------------------------------------------------------------
// THE WEB OF SOULS (Directive XX, Article Five, Law XIV) — the known
// world drawn as a web, purely from the ChronicleGraph: souls as
// nodes weighted by bond, typed ties as edges (kin, enemy, ally,
// met), every node and every edge citing the sealed turns that
// establish it. Zero model calls, zero new truth — the web is
// DERIVED STATE, one more pure reader over the cards fold, and it
// invents nothing the record did not seal.
//
// THE REVEALS SEAT (the alias lesson's sibling): the builder takes
// the wiki's OWN answer — the set of canonical names the record has
// introduced — and filters HERE, at the source, so the emitted data
// itself is clean: no unmet soul, no strand toward the unmet, no
// secret a surface must remember to hide. A surface holding this
// data cannot leak what the data never carried; this module grows no
// reveals reading of its own, and neither may any surface above it.
//
// THE ONE ROAD (Directive XXI): names resolve through the cards
// fold's own canon and alias road — an aliased soul is ONE card
// there, so it is ONE node here. No resolver is grown in this file.
//
// THE STRUCK TURN: redacted rows never feed the web, in the
// ChronicleGraph's own manner — a strike outranks every reader.
//
// Born fail-closed: a junk record, a junk row, or a missing reveals
// seat draws an empty web — never a crash, never a guess.
// ------------------------------------------------------------
import { rowsOf } from './rows.js';
import { buildCards } from './cards.js';

const canon = (name) => String(name || '').trim().toLowerCase();

// The web: { nodes: [{ name, hero, status, bond, cites }], edges:
// [{ type, from, to, why, cites }] }. Nodes stand in the record's own
// introduction order; edges stand sorted by endpoints then type — the
// same tale always weaves the same bytes.
export function buildSoulsWeb(campaign, { known } = {}) {
  const empty = { nodes: [], edges: [] };
  if (!campaign || typeof campaign !== 'object' || Array.isArray(campaign)) return empty;
  if (!(known instanceof Set)) return empty; // no reveals seat, no world — the web fails closed

  const entries = rowsOf(campaign.logs).filter((entry) => !entry.redacted);
  const { cards, order } = buildCards({ hero: campaign.hero || null, entries });
  const heroKey = canon(campaign.hero?.name);

  const seated = new Set();
  const nodes = [];
  for (const name of order) {
    const key = canon(name);
    if (!key || !known.has(key)) continue; // the unmet are ABSENCE, filtered at the builder
    const card = cards[key];
    if (!card) continue;
    const cites = [...new Set(
      card.chronicle.filter((line) => Number.isInteger(line?.turn)).map((line) => line.turn)
    )].sort((one, two) => one - two);
    nodes.push({ name: card.name, hero: key === heroKey, status: card.state.status, bond: card.state.bond, cites });
    seated.add(key);
  }

  const edges = [];
  const held = new Set();
  for (const name of order) {
    const fromKey = canon(name);
    if (!seated.has(fromKey)) continue;
    for (const tie of cards[fromKey].ties) {
      if (typeof tie.to !== 'string') continue;
      const toKey = canon(tie.to);
      // A strand may join only two SEATED souls: an edge toward the
      // unmet is absence, not a teaser — the same law the tie chips keep.
      if (!seated.has(toKey) || toKey === fromKey) continue;
      const [a, b] = fromKey < toKey ? [fromKey, toKey] : [toKey, fromKey];
      const strand = `${tie.type}|${a}|${b}`;
      if (held.has(strand)) continue; // a mutual tie is ONE strand, never two
      held.add(strand);
      edges.push({
        type: tie.type,
        from: cards[fromKey].name,
        to: cards[toKey].name,
        why: tie.why,
        cites: Number.isInteger(tie.turn) ? [tie.turn] : []
      });
    }
  }
  edges.sort((one, two) => {
    const x = `${canon(one.from)}|${canon(one.to)}|${one.type}`;
    const y = `${canon(two.from)}|${canon(two.to)}|${two.type}`;
    return x < y ? -1 : x > y ? 1 : 0;
  });

  return { nodes, edges };
}
