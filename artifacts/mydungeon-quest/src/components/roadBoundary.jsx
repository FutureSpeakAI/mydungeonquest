// ---------------------------------------------------------------------------
// THE ROAD-FALLEN BOUNDARY (lean door, the architect's round) — a split
// surface whose timber never arrives must fall to a spoken seat, never a
// white page. One seat for every lazy road. A fallen chunk is almost
// always a stale index left over from a fresh publish, so the honest cure
// the button offers is to walk the whole road again from the door. The
// mishap still feeds the errata ring (the beta doors' law): a fall caught
// by a boundary never reaches window's own listeners, so the boundary
// folds it into the ledger by hand.
// ---------------------------------------------------------------------------
import { Component } from 'react';
import { foldErratum } from '../lib/errata.js';

export class RoadBoundary extends Component {
  constructor(props) { super(props); this.state = { fallen: false }; }
  static getDerivedStateFromError() { return { fallen: true }; }
  componentDidCatch(error) {
    foldErratum({ kind: 'road', word: `${this.props.road || 'a road'}: ${error?.message || 'fell unnamed'}` });
  }
  render() {
    if (!this.state.fallen) return this.props.children;
    return (
      <div className="lean-veil road-fallen" role="alert">
        <p>The road to this page fell away before it arrived.</p>
        <button type="button" onClick={() => (typeof window !== 'undefined' && window.location ? window.location.reload() : this.setState({ fallen: false }))}>Walk the road again</button>
      </div>
    );
  }
}
