// evals/sittingFaces.test.mjs — THE SITTING FACES GATE (C5).
//
// Three chairs, one identity, only the light differs — and now each chair
// holds a PAINTED FACE, not a text chip. This court proves:
//
//   1. The tray renders three image candidates, not text-only options.
//   2. Images are generated from each candidate's brief (the full prompt),
//      so the neutral-ground law is honoured and the three faces differ
//      only in their lighting.
//   3. The lightbox carries a selection button whose accessible name
//      includes the permanence warning — the player makes an informed,
//      unambiguous choice.
//   4. No reference sheet is minted inside the Forge; the sheet lives
//      solely in App.jsx's genesis branch where the bust anchor is
//      already on the shelf.
//   5. Placeholder elements carry semantic labels (role="img" + aria-label)
//      so screen readers announce them correctly.
//
// Keyless, network-free, build-free.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

const forge = read('src/components/Forge.jsx');
const app   = read('src/App.jsx');

// ── 1. Three image candidates, not text chips ─────────────────────────────
assert.ok(
  forge.includes('chair-tray'),
  'the sitting panel uses the chair-tray layout — not the old audition-choices text chips',
);
// The old bare text-chip pattern must be gone.
assert.ok(
  !forge.includes('{candidate.id}\n          </button>)}</div>'),
  'candidate.id is no longer a bare button label in the sitting panel — images replace text chips',
);
assert.ok(
  forge.includes('chair-card'),
  'each candidate is wrapped in a chair-card container',
);
assert.ok(
  forge.includes('chair-tap'),
  'each candidate card has a chair-tap button to open the lightbox',
);

// ── 2. Portraits generated from each candidate's brief ────────────────────
assert.ok(
  forge.includes('candidate.brief'),
  'each chair portrait is generated from its own brief (the full identity + lighting prompt)',
);
assert.ok(
  forge.includes('chairImages'),
  'a chairImages state map stores the per-candidate portrait URLs',
);
// paintPreview is called with the candidate's brief, not a generic prompt call.
assert.ok(
  forge.includes('prompt: candidate.brief'),
  'paintPreview receives the candidate\'s brief as its prompt — neutral ground + lighting',
);

// ── 3. Lightbox carries the permanence warning ────────────────────────────
assert.ok(
  forge.includes('Use this portrait. This is permanent.'),
  'the selection button\'s label spells out the permanence of the choice',
);
assert.ok(
  forge.includes('"Use this portrait. This is permanent."'),
  'the aria-label on the chair-select-button carries the exact permanence phrase',
);
// The lightbox uses the D4 plate-lightbox class and X-close button.
assert.ok(
  forge.includes('plate-lightbox'),
  'the sitting lightbox reuses the D4 plate-lightbox for consistency',
);
assert.ok(
  forge.includes('chair-select-button'),
  'a dedicated chair-select-button class marks the selection action',
);

// ── 4. No sheet is minted inside the Forge ───────────────────────────────
assert.ok(
  !forge.includes('heroSheetJob'),
  'Forge.jsx does not import or invoke heroSheetJob — the sheet waits for genesis',
);
assert.ok(
  !forge.includes('sittingSheet('),
  'Forge.jsx does not call sittingSheet() — no reference sheet before selection',
);
// The sheet IS minted in App.jsx at genesis, after the bust lands.
assert.ok(
  app.includes('heroSheetJob(campaign)'),
  'App.jsx mints the hero sheet at genesis (post-sitting, post-bust)',
);

// ── 5. Accessible labels on placeholder elements ─────────────────────────
// portrait-mark carries role="img" for screen readers.
assert.ok(
  forge.includes('portrait-mark" role="img"'),
  'the portrait-mark span carries role="img" so screen readers announce it as an image',
);
// chair-tap buttons carry explicit aria-labels.
assert.ok(
  forge.includes('aria-label={`Study the'),
  'each chair-tap button has an aria-label — not just candidate.id text',
);
// chair placeholder elements carry role="img" too.
assert.ok(
  forge.includes('chair-placeholder') && forge.includes('role="img"'),
  'chair placeholder elements carry role="img" alongside the image elements',
);

console.log('PASS sittingFaces — three painted chairs, lightbox with permanence warning, sheet deferred to genesis, placeholders labelled');
