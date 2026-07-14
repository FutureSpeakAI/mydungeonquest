import { Feather } from 'lucide-react';

// ------------------------------------------------------------
// THE TALE SO FAR — the sealed page that closes a chapter.
// The Chronicler's retelling (or, in a keyless world, nothing:
// raw text is bound into the book at sealing time instead, and
// no placeholder prose is ever presented as a page). Dice
// moments sit in the margin, as marginalia in a real folio;
// provenance is worn honestly at the foot.
// ------------------------------------------------------------

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const spoken = (n) => NUMBER_WORDS[n] || String(n);

export default function ChroniclePage({ page }) {
  if (!page?.passage) return null;
  return <section className="chronicle-page" aria-label={page.title}>
    <header>
      <span className="page-rule" />
      <Feather size={13} aria-hidden />
      <h4>{page.title}</h4>
      <span className="page-rule" />
    </header>
    <div className="page-body">
      <div className="page-prose">
        {String(page.passage).split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </div>
      {Array.isArray(page.dice_moments) && page.dice_moments.length > 0 && <aside className="page-margin" aria-label="marginalia">
        {page.dice_moments.map((moment, index) => <small key={index}>Here the die showed {spoken(moment.total)} — {moment.label}.</small>)}
      </aside>}
    </div>
    <footer>
      <span className="page-wax" aria-hidden>✦</span>
      <small>{page.raw ? 'from the sealed record' : `retold by the Chronicler · sealed as written · turns ${page.cites?.from_turn}–${page.cites?.to_turn}`}</small>
    </footer>
  </section>;
}
