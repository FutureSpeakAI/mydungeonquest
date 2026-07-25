import { useMemo } from 'react';
import { buildSoulsWeb } from 'fatescript/soulsWeb';
import { introducedNames } from '../lib/unmet.js';
import { tieLine } from 'fatescript/wikiText';

// ------------------------------------------------------------
// THE WEB OF SOULS (Directive XX, Article Five, Law XIV) — the drawn
// seat of the engine's soulsWeb fold, and nothing more: the known
// world strung as a web, souls weighted by bond, every strand a
// sealed tie citing its turn. Zero model calls, zero new truth.
//
// THE REVEALS SEAT: this surface asks the wiki's OWN seat —
// introducedNames, the same fold the tie chips and the cast grid
// obey — and hands its answer to the builder, which filters at the
// source. No private reading of the canon is grown here: the unmet
// are absence in the data before this file ever sees it.
//
// Layout is the fold's own order laid on a wheel, deterministically:
// the hero at the centre, each known soul at an angle fixed by the
// record's introduction order, drawn inward by bond — the same tale
// always weaves the same web. Tapping a soul opens their own page in
// the Book's manner; the dead rest marked, as the record remembers.
// ------------------------------------------------------------

const STRAND_WORDS = { kin: 'bound by blood', enemy: 'sworn enemies', ally: 'oath and bond', met: 'paths crossed' };

export default function SoulsWeb({ campaign, onNav, statusWord = {} }) {
  const web = useMemo(() => {
    try { return buildSoulsWeb(campaign, { known: introducedNames(campaign) }); }
    catch { return null; }
  }, [campaign]);

  if (!web) return <p className="muted">The web cannot be read.</p>;
  if (web.nodes.length === 0) return <p className="muted">No soul has entered the record yet — the loom holds no thread.</p>;
  if (web.nodes.length === 1) return <p className="muted">The web waits — the record knows only one soul so far.</p>;

  const W = 560, H = 470, cx = W / 2, cy = H / 2 - 10;
  const anchor = web.nodes.find((node) => node.hero) || null;
  const ring = web.nodes.filter((node) => node !== anchor);
  const seat = new Map();
  if (anchor) seat.set(anchor.name, { x: cx, y: cy });
  ring.forEach((node, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / ring.length;
    const radius = 195 - (Number(node.bond) || 0) * 30; // the bound draw close; strangers keep the rim
    seat.set(node.name, { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
  });

  const open = (name) => onNav && onNav({ chapter: 'people', place: null, soul: name });

  return <figure className="souls-web">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The web of souls — every known soul and every sealed tie">
      {web.edges.map((edge) => {
        const from = seat.get(edge.from), to = seat.get(edge.to);
        if (!from || !to) return null;
        return <line key={`${edge.type}:${edge.from}:${edge.to}`} className={`web-strand web-strand-${edge.type}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}>
          <title>{`${STRAND_WORDS[edge.type] || edge.type} — ${edge.from}, ${tieLine(edge)} · sealed at turn ${edge.cites[0]}`}</title>
        </line>;
      })}
      {web.nodes.map((node) => {
        const at = seat.get(node.name);
        const rest = node.status === 'dead';
        const r = node.hero ? 16 : 9 + (Number(node.bond) || 0) * 2;
        const word = statusWord[node.status] || node.status;
        return <g key={node.name} className={`web-soul${node.hero ? ' the-hero' : ''}${rest ? ' at-rest' : ''}`}
          transform={`translate(${at.x},${at.y})`} role="button" tabIndex={0}
          aria-label={`${node.name} — ${word}. Open their page.`}
          onClick={() => open(node.name)}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(node.name); } }}>
          <title>{`${node.name} — ${word} · bond ${node.bond} of 4 · sealed at turn${node.cites.length === 1 ? '' : 's'} ${node.cites.join(', ')}`}</title>
          {rest && <circle className="web-rest-ring" r={r + 4} fill="none" />}
          <circle className="web-soul-ring" r={r} />
          <text className="web-soul-name" y={r + 14}>{node.name}</text>
          {rest && <text className="web-rest-mark" y={4}>†</text>}
        </g>;
      })}
    </svg>
    <figcaption className="web-legend">
      <span><i className="key-kin" />bound by blood</span>
      <span><i className="key-enemy" />sworn enemies</span>
      <span><i className="key-ally" />oath and bond</span>
      <span><i className="key-met" />paths crossed</span>
      <span className="muted">Every strand a sealed tie — tap a soul to open their page.</span>
    </figcaption>
  </figure>;
}
