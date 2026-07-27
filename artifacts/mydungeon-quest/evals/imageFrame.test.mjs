// ---------------------------------------------------------------------------
// IMAGE FRAME GATE (D4) — card image ratios, lightbox viewport containment,
// focus trap and body-scroll lock.
// Proofs:
//   1. Soul-card portraits declare aspect-ratio:4/5 with object-fit:cover.
//   2. Region plates declare aspect-ratio:16/9 with object-fit:cover.
//   3. Pack portraits declare aspect-ratio:4/5 (framed card).
//   4. Lightbox image declares max-width:100vw and max-height:100dvh.
//   5. Lightbox backdrop is exactly 85% opaque (rgba(5,4,8,.85)).
//   6. Lightbox z-index is ≥ 200 (above all other layers).
//   7. Lightbox close button has z-index:1 so it sits above the image.
//   8. App.jsx lightbox effect: body scroll is locked on open, restored on
//      close (document.body.style.overflow = 'hidden').
//   9. App.jsx: backdrop tap fires close (onClick on .plate-lightbox).
//  10. App.jsx: Escape key closes (event.key === 'Escape').
//  11. App.jsx: focus is trapped (Tab → closeRef), restored on close.
//  12. JSX: lightbox carries role="dialog" aria-modal="true".
//  13. JSX: close button carries aria-label.
// ---------------------------------------------------------------------------
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

let failures = 0;
const check = (ok, label) => {
  if (ok) console.log(`  ok — ${label}`);
  else { failures += 1; console.error(`  FAIL — ${label}`); }
};

const css = readFileSync(join(ROOT, 'src/styles.css'), 'utf8');
const appSrc = readFileSync(join(ROOT, 'src/App.jsx'), 'utf8');
const bookSrc = readFileSync(join(ROOT, 'src/components/Book.jsx'), 'utf8');

// ── 1. Soul-card portraits at 4:5 ─────────────────────────────────────────
check(css.includes('soul-face') && css.includes('aspect-ratio:4/5'), 'soul-face CSS declares aspect-ratio:4/5');
// The selector must be in the codex gallery context.
const soulFaceBlock = css.match(/\.soul-face[^{]*\{[^}]*aspect-ratio:4\/5[^}]*\}/)?.[0] ?? '';
check(soulFaceBlock.length > 0, 'soul-face rule carries aspect-ratio:4/5 in the CSS block');
check(soulFaceBlock.includes('object-fit:cover'), 'soul-face uses object-fit:cover');
check(soulFaceBlock.includes('object-position:center top'), 'soul-face uses object-position:center top (focal point on face)');

// ── 2. Region plates at 16:9 ──────────────────────────────────────────────
check(css.includes('region-plate') && css.includes('aspect-ratio:16/9'), 'region-plate CSS declares aspect-ratio:16/9');
const regionBlock = css.match(/img\.region-plate[^{]*\{[^}]*aspect-ratio:16\/9[^}]*\}/)?.[0] ?? '';
check(regionBlock.length > 0, 'img.region-plate rule carries aspect-ratio:16/9');
check(regionBlock.includes('object-fit:cover'), 'region-plate uses object-fit:cover');

// ── 3. Pack portrait at 4:5 ───────────────────────────────────────────────
const packPortBlock = css.match(/\.pack-portrait[^{]*\{[^}]*aspect-ratio:4\/5[^}]*\}/)?.[0] ?? '';
check(packPortBlock.length > 0, '.pack-portrait CSS block has aspect-ratio:4/5');
check(packPortBlock.includes('object-fit:cover') || packPortBlock.includes('object-position'), '.pack-portrait uses cover / focal point');
// Book.jsx uses pack-portrait class on the pack head image.
check(bookSrc.includes('pack-portrait'), 'Book.jsx uses .pack-portrait class');
// Check via regex that .pack-head button does NOT use class "soul-face"
// (it now uses pack-portrait).
check(!/pack-head[\s\S]{0,400}soul-face/.test(bookSrc), 'pack-head no longer uses soul-face directly');

// ── 4. Lightbox image: 100vw / 100dvh ─────────────────────────────────────
const lbImgBlock = css.match(/\.plate-lightbox\s+img\s*\{[^}]+\}/)?.[0] ?? '';
check(lbImgBlock.length > 0, '.plate-lightbox img CSS block found');
check(lbImgBlock.includes('max-width:100vw'), '.plate-lightbox img has max-width:100vw');
check(lbImgBlock.includes('max-height:100dvh'), '.plate-lightbox img has max-height:100dvh');
check(lbImgBlock.includes('object-fit:contain'), '.plate-lightbox img uses object-fit:contain');

// ── 5. Lightbox backdrop at 85% opacity ───────────────────────────────────
const lbBlock = css.match(/\.plate-lightbox\s*\{[^}]+\}/)?.[0] ?? '';
check(lbBlock.length > 0, '.plate-lightbox CSS block found');
check(lbBlock.includes('rgba(5,4,8,.85)'), '.plate-lightbox backdrop is 85% opaque (rgba(5,4,8,.85))');

// ── 6. Lightbox z-index ≥ 200 ─────────────────────────────────────────────
const lbZIndex = (lbBlock.match(/z-index:(\d+)/) || [])[1];
check(lbZIndex && Number(lbZIndex) >= 200, `.plate-lightbox z-index is ≥ 200 (found ${lbZIndex})`);

// ── 7. Close button z-index:1 (above image) ───────────────────────────────
const closeBlock = css.match(/\.lightbox-close\s*\{[^}]+\}/)?.[0] ?? '';
check(closeBlock.length > 0, '.lightbox-close CSS block found');
check(closeBlock.includes('z-index:1'), '.lightbox-close has z-index:1');
// Close button positioned at top-right.
check(closeBlock.includes('right:'), '.lightbox-close has right positioning');
check(closeBlock.includes('top:'), '.lightbox-close has top positioning');

// ── 8. Body scroll lock in App.jsx lightbox effect ────────────────────────
// The effect for expandedSrc must lock and restore body overflow.
check(appSrc.includes("document.body.style.overflow = 'hidden'"), 'lightbox effect locks body scroll (overflow=hidden)');
// Restoration: prevOverflow is captured then re-applied in the cleanup.
check(appSrc.includes('const prevOverflow = document.body.style.overflow') &&
      appSrc.includes('document.body.style.overflow = prevOverflow'), 'lightbox effect restores body overflow on close');

// ── 9. Backdrop tap closes ────────────────────────────────────────────────
// The .plate-lightbox element has an onClick that calls setExpandedSrc(null).
check(appSrc.includes('plate-lightbox') && appSrc.includes('onClick={() => setExpandedSrc(null)') && appSrc.includes('plate-lightbox'), 'backdrop onClick closes the lightbox');

// ── 10. Escape key closes ─────────────────────────────────────────────────
check(appSrc.includes("event.key === 'Escape'") && appSrc.includes('setExpandedSrc(null)'), 'Escape key handler closes the lightbox');

// ── 11. Tab focus trap ────────────────────────────────────────────────────
check(appSrc.includes("event.key === 'Tab'") && appSrc.includes('closeRef.current?.focus()'), 'Tab is trapped to the close button');
check(appSrc.includes('opener.focus?.()'), 'focus is restored to opener on close');

// ── 12. role="dialog" aria-modal="true" ───────────────────────────────────
check(appSrc.includes('role="dialog"') && appSrc.includes('aria-modal="true"'), 'lightbox carries role=dialog and aria-modal=true');

// ── 13. Close button aria-label ───────────────────────────────────────────
check(appSrc.includes('aria-label="Close the illustration"'), 'close button has aria-label');

// ── 14. Pinch zoom enabled ────────────────────────────────────────────────
check(lbBlock.includes('pinch-zoom') || lbImgBlock.includes('pinch-zoom'), 'lightbox enables pinch-zoom touch-action');

// ── final verdict ──────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`FAIL — image frame gate: ${failures} clause(s) broken.`);
  process.exit(1);
}
console.log('PASS — image frame gate: soul portraits at 4:5, region plates at 16:9, pack portraits at 4:5, lightbox at 100vw/100dvh with 85% backdrop, z-index ≥ 200, focus trap, body scroll lock, pinch zoom, backdrop tap and Escape close, role=dialog.');
