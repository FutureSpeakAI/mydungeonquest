import { useMemo } from 'react';
import { buildSoulsWeb } from 'fatescript/soulsWeb';
import { canonicalNames } from '../lib/waypost.js';
import { tieLine } from 'fatescript/wikiText';

// ------------------------------------------------------------
// THE WEB OF SOULS (Directive XX, Article Five, Law XIV) — the drawn
// seat of the engine's soulsWeb fold, and nothing more: the known
// world strung as a web, souls weighted by bond, every strand a
// sealed tie citing its turn. Zero model calls, zero new truth.
//
// THE REVEALS SEAT: this surface uses canonicalNames (D7) — the one
// gate shared by the cast grid, the party chip, and the graph.
// canonicalNames = hero + introducedCast + codex.party companions.
// No private reading of the canon is grown here: the unmet are
// absence in the data before this file ever sees it.
//
// Layout is the fold's own order laid on a wheel, deterministically:
// the hero at the centre, each known soul at an angle fixed by the
// record's introduction order, drawn inward by bond — the same tale
// always weaves the same web. Tapping a soul opens their own page in
// the Book's manner; the dead rest marked, as the record remembers.
//
// D6 — EMPTY STATES: below five nodes a centred list replaces the
// canvas. Legend filtered to only the strand types the record holds.
// All non-hero nodes uniform in size — position encodes bond.
// ------------------------------------------------------------

const STRAND_WORDS = { kin: 'bound by blood', enemy: 'sworn enemies', ally: 'oath and bond', met: 'paths crossed' };
const STRAND_ENTRIES = Object.entries(STRAND_WORDS);

export default function SoulsWeb({ campaign, onNav, statusWord = {} }) {
  const web = useMemo(() => {
    try { return buildSoulsWeb(campaign, { known: canonicalNames(campaign) }); }
    catch { return null; }
  }, [campaign]);

  // Hoist open so both the list and the canvas can use it.
  const open = (name) => onNav && onNav({ chapter: 'people', place: null, soul: name });

  if (!web) return <p className="muted">The web cannot be read.</p>;
  if (web.nodes.length === 0) return <p className="muted">No soul has entered the record yet — the loom holds no thread.</p>;
  if (web.nodes.length === 1) return <p className="muted">The web waits — the record knows only one soul so far.</p>;

  // Only the strand types actually in the record belong in the legend.
  const presentTypes = new Set(web.edges.map((e) => e.type));

  // D6 — LIST FALLBACK: below five nodes, a centred list replaces the canvas.
  if (web.nodes.length <= 4) {
    return <figure className="souls-web souls-web--list">
      <ul className="souls-list">
        {web.nodes.map((node) => {
          const rest = node.status === 'dead';
          const word = statusWord[node.status] || node.status;
          const nodeEdges = web.edges.filter((e) => e.from === node.name || e.to === node.name);
          return <li key={node.name}
            className={`souls-list-item${node.hero ? ' the-hero' : ''}${rest ? ' at-rest' : ''}`}>
            <button className="text-button" onClick={() => open(node.name)}
              aria-label={`${node.name} — ${word}. Open their page.`}>
              {node.name}{rest ? <span className="muted"> †</span> : null}
            </button>
            {nodeEdges.map((edge, i) => {
              const other = edge.from === node.name ? edge.to : edge.from;
              return <span key={i} className="souls-list-tie muted">
                {STRAND_WORDS[edge.type] || edge.type} with {other}
              </span>;
            })}
          </li>;
        })}
      </ul>
      {presentTypes.size > 0 && <figcaption className="web-legend">
        {STRAND_ENTRIES.filter(([type]) => presentTypes.has(type)).map(([type, label]) =>
          <span key={type}><i className={`key-${type}`} />{label}</span>)}
        <span className="muted">Tap a soul to open their page.</span>
      </figcaption>}
    </figure>;
  }

  // FULL CANVAS — five or more nodes.
  const W = 560, H = 470, cx = W / 2, cy = H / 2 - 10;
  const anchor = web.nodes.find((node) => node.hero) || null;
  const ring = web.nodes.filter((node) => node !== anchor);
  const seat = new Map();
  if (anchor) seat.set(anchor.name, { x: cx, y: cy });
  ring.forEach((node, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / ring.length;
    const radius = 195 - (Number(node.bond) || 0) * 30; // position encodes bond
    seat.set(node.name, { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
  });

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
        // D6: uniform size — position (distance from centre) encodes bond.
        const r = node.hero ? 16 : 11;
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
    {/* D6: legend filtered to only the strand types the record holds. */}
    <figcaption className="web-legend">
      {STRAND_ENTRIES.filter(([type]) => presentTypes.has(type)).map(([type, label]) =>
        <span key={type}><i className={`key-${type}`} />{label}</span>)}
      <span className="muted">Closer to the hero means higher bond — tap a soul to open their page.</span>
    </figcaption>
  </figure>;
}
