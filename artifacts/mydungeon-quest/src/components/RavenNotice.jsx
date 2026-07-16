// ------------------------------------------------------------
// WHAT THE RAVENS BRING — the return's quiet notice (Raven Law).
// Shown once when a tale is opened after days away; every line
// beneath the heading traces to a record row sealed on this open.
// Dismissed with a touch; zero absence renders nothing at all.
// ------------------------------------------------------------
export function RavenNotice({ recap, onClose }) {
  if (!recap || !recap.text) return null;
  return (
    <div className="raven-notice" role="status" aria-live="polite" style={{
      position: 'fixed', top: '4.25rem', left: '50%', transform: 'translateX(-50%)', zIndex: 60,
      maxWidth: 'min(34rem, calc(100vw - 2rem))', padding: '0.9rem 1.1rem', borderRadius: '0.6rem',
      background: 'rgba(13,11,20,0.94)', border: '1px solid rgba(196,178,132,0.35)',
      color: '#e8e2d4', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
    }}>
      <strong style={{ display: 'block', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>What the Ravens Bring</strong>
      {recap.lines.map((line, at) => <p key={at} style={{ margin: '0.15rem 0', opacity: 0.92 }}>{line}</p>)}
      {recap.text.includes('Last the record tells:') && (
        <p style={{ margin: '0.45rem 0 0', opacity: 0.65, fontStyle: 'italic' }}>{recap.text.split('\n').find((l) => l.startsWith('Last the record tells:'))}</p>
      )}
      <button type="button" onClick={onClose} style={{
        marginTop: '0.6rem', padding: '0.3rem 0.9rem', borderRadius: '0.4rem', cursor: 'pointer',
        background: 'transparent', border: '1px solid rgba(196,178,132,0.4)', color: 'inherit'
      }}>Read and done</button>
    </div>
  );
}
