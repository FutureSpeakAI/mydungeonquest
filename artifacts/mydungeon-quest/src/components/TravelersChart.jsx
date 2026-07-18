import { useMemo } from 'react';
import { chartOf } from 'fatescript/chart';

// ------------------------------------------------------------
// THE TRAVELER'S CHART (Directive XIV, the Chart Law) — the drawn seat
// of the engine's chart fold, and nothing more: medallions cut from
// their own sealed plates (the gallery the store already holds — no
// paint is commissioned here), roads only where the record sealed a
// crossing, each labeled with the calendar fold's own days, the
// current ground marked, the route readable in played order, and
// blank vellum beyond the known — the record does not guess, so
// neither does the chart. Layout is the fold's deterministic
// placement scaled to the page; the same tale always draws the same
// chart. Tapping a medallion opens that place's own page.
// ------------------------------------------------------------
export default function TravelersChart({ campaign, gallery, onOpenPlace }) {
  const chart = useMemo(() => chartOf(campaign), [campaign]);
  const layout = useMemo(() => {
    const xs = chart.medallions.map((m) => m.x);
    const ys = chart.medallions.map((m) => m.y);
    const minX = Math.min(0, ...xs), maxX = Math.max(0, ...xs);
    const minY = Math.min(0, ...ys), maxY = Math.max(0, ...ys);
    const spanX = Math.max(1, maxX - minX), spanY = Math.max(1, maxY - minY);
    const W = 760, H = 430, PAD = 96;
    return {
      W, H,
      sx: (x) => PAD + ((x - minX) / spanX) * (W - PAD * 2),
      sy: (y) => PAD + ((y - minY) / spanY) * (H - PAD * 2)
    };
  }, [chart]);
  if (chart.medallions.length === 0) return <p className="muted">No ground has entered the record yet — the vellum waits.</p>;
  const { W, H, sx, sy } = layout;
  return <figure className="travelers-chart">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The Traveler's Chart — the witnessed world">
      {chart.roads.map((road, i) => {
        const x1 = sx(road.x1), y1 = sy(road.y1), x2 = sx(road.x2), y2 = sy(road.y2);
        return <g key={`${road.a}::${road.b}`} className="chart-road-group">
          <line className="chart-road" x1={x1} y1={y1} x2={x2} y2={y2} />
          <text className="chart-road-label" x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 9} textAnchor="middle">{road.label}</text>
        </g>;
      })}
      {chart.medallions.map((m, i) => <g key={m.name}
        className={`chart-medallion${m.current ? ' current' : ''}`}
        data-region={m.name} data-current={m.current ? 'true' : undefined}
        transform={`translate(${sx(m.x)},${sy(m.y)})`}
        role="button" tabIndex={0} aria-label={`${m.name} — open the place page`}
        onClick={() => onOpenPlace(m.name)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenPlace(m.name); } }}>
        <title>{m.name}</title>
        {m.current && <circle className="chart-current" r="36" />}
        <clipPath id={`medallion-clip-${i}`}><circle r="28" /></clipPath>
        {gallery[m.name]
          ? <image href={gallery[m.name]} x="-28" y="-28" width="56" height="56" preserveAspectRatio="xMidYMid slice" clipPath={`url(#medallion-clip-${i})`} />
          : <circle className="medallion-plateless" r="28" />}
        <circle className="medallion-rim" r="28" />
        <text className="medallion-name" y="46" textAnchor="middle">{m.name}</text>
        <text className="medallion-state" y="60" textAnchor="middle">{m.state}{Number.isInteger(m.discoveredTurn) ? ` · entered turn ${m.discoveredTurn}` : ''}</text>
      </g>)}
    </svg>
    <figcaption>
      <p className="chart-route">{chart.route.length
        ? <>The road so far: {chart.route.map((stand, i) => <span key={i}>{i > 0 ? ' → ' : ''}{stand.ground}{Number.isInteger(stand.turn) ? <span className="cite"> (turn {stand.turn})</span> : null}</span>)}</>
        : 'The road has not yet been walked.'}</p>
      <p className="muted chart-vellum-note">Beyond these grounds the vellum stays blank — the record does not guess, so neither does the chart.</p>
    </figcaption>
  </figure>;
}
