// ------------------------------------------------------------
// THE MAGNIFIED LOOK (TASK 54B §3) — one instrument, two eyes.
//
// A five-pixel mark at scene distance deserves a magnifier, not a
// coin flip. Mark examination is TWO-STAGE everywhere it occurs:
//   stage one — the model names the subject's head-and-shoulders
//     bounding box as STRICT flat JSON in relative coordinates;
//   stage two — that box is cropped with sharp at the STATED padding
//     below, and the mark question is asked on the crop ALONE.
// The production repaint warden (server, /api/warden) and the proving
// court (tests/e2e/lib/magnifier.ts) both hold THIS instrument: the
// same question texts, the same box validation, the same padding, the
// same clamp arithmetic — so they can no longer disagree by looking
// differently. The texts and math here are LAW (a paint-law source);
// changing them razes the harvest store.
//
// Everything here is pure: no I/O, no sharp import (the callers own
// the crop), fully deterministic — the warden-eye gate proves it.
// ------------------------------------------------------------

/** The stated padding: each side of the head-and-shoulders box grows by
 * this fraction of the box's own width/height before the crop. */
export const MAGNIFIER_PADDING = 0.25;

/** The crop never shrinks below this many pixels on a side — a sliver
 * cannot be examined honestly. Expansion stays inside the image. */
export const MAGNIFIER_MIN_EDGE = 48;

// Stage one — the box question. Relative coordinates survive resizes;
// flat JSON parses identically at both doors.
export function boxBrief() {
  return [
    'Locate the ONE primary person in this image.',
    'Report the bounding box of their HEAD AND SHOULDERS — from the crown of the head down to mid-chest, wide enough to include both shoulders where visible.',
    'Coordinates are RELATIVE fractions of the image: x and y are the top-left corner (0..1 from the left and top edges), w and h are the box width and height (0..1).',
    'If there is no clear primary person, or only body parts with no identifiable head, answer found false with x, y, w, h all 0.',
    'Answer with ONLY this JSON, nothing else:',
    '{"found": true|false, "x": 0.0-1.0, "y": 0.0-1.0, "w": 0.0-1.0, "h": 0.0-1.0}'
  ].join(' ');
}

// Stage two — the mark question, on the crop alone.
export function markBrief(markText = '') {
  return [
    'This is a MAGNIFIED head-and-shoulders crop of one figure from a larger painting.',
    `The figure's locked identity names this distinguishing feature: ${String(markText || '').trim()}`,
    'Is that specific feature CLEARLY visible in this crop — unmistakable, not merely hinted?',
    'If you are not certain it is visible, answer false.',
    'It does NOT mean an artist\u2019s signature, lettering, or any text — painted text is a defect, never a feature.',
    'Answer with ONLY this JSON, nothing else:',
    '{"mark_visible": true|false, "confidence": 0.0-1.0}'
  ].join(' ');
}

/** The one box-validation law, shared verbatim by both doors. Accepts a
 * parsed object; answers a lawful relative box or null. Strict: found
 * must be exactly true, all four coordinates finite, the box must have
 * real area, sit inside the frame (2% tolerance, then clamped), and
 * cover neither nothing nor everything-plus. */
export function validateBox(raw) {
  if (!raw || raw.found !== true) return null;
  const nums = ['x', 'y', 'w', 'h'].map((k) => Number(raw[k]));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  let [x, y, w, h] = nums;
  if (w <= 0.005 || h <= 0.005) return null;                 // no real area
  if (x < -0.02 || y < -0.02 || x + w > 1.02 || y + h > 1.02) return null; // off the frame
  x = Math.min(Math.max(x, 0), 1); y = Math.min(Math.max(y, 0), 1);
  w = Math.min(w, 1 - x); h = Math.min(h, 1 - y);
  if (w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

/** Tolerant text reader for stage one (the warden's transport hands back
 * prose-wrapped JSON sometimes). Gibberish or an unlawful box is an
 * honest not-found — the magnifier then answers mark-not-proven. */
export function parseBox(text = '') {
  const body = String(text);
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) return { found: false, box: null };
  try {
    const box = validateBox(JSON.parse(body.slice(start, end + 1)));
    return box ? { found: true, box } : { found: false, box: null };
  } catch {
    return { found: false, box: null };
  }
}

/** Tolerant text reader for stage two. The law is `=== true`: an absent
 * or hedged answer is not a sighting. */
export function parseMark(text = '') {
  const body = String(text);
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) return { mark_visible: false, confidence: 0 };
  try {
    const raw = JSON.parse(body.slice(start, end + 1));
    return {
      mark_visible: raw.mark_visible === true,
      confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0)),
    };
  } catch {
    return { mark_visible: false, confidence: 0 };
  }
}

/** The clamp arithmetic — pure and total. Relative box + image size →
 * integer pixel rect, padded by `padding` of the box's own size, clamped
 * to the frame, and grown (inside the frame) to MAGNIFIER_MIN_EDGE.
 * Deterministic: the same inputs always cut the same crop. */
export function clampBox({ box, width, height, padding = MAGNIFIER_PADDING }) {
  const W = Math.max(1, Math.floor(width));
  const H = Math.max(1, Math.floor(height));
  const padX = box.w * padding;
  const padY = box.h * padding;
  // Snap products to a millionth before floor/ceil: IEEE noise
  // (0.4 + 0.2 + 0.05 → 0.6500000000000001) must not steal or gift a
  // pixel — the crop lands where the STATED arithmetic says, at both
  // doors identically.
  const snap = (v) => Math.round(v * 1e6) / 1e6;
  let left = Math.floor(snap(Math.max(0, (box.x - padX)) * W));
  let top = Math.floor(snap(Math.max(0, (box.y - padY)) * H));
  let right = Math.ceil(snap(Math.min(1, (box.x + box.w + padX)) * W));
  let bottom = Math.ceil(snap(Math.min(1, (box.y + box.h + padY)) * H));
  right = Math.min(right, W); bottom = Math.min(bottom, H);
  // Grow a sliver to the minimum edge, staying inside the frame:
  // extend right/down first, then left/up — deterministic order.
  const minW = Math.min(MAGNIFIER_MIN_EDGE, W);
  const minH = Math.min(MAGNIFIER_MIN_EDGE, H);
  if (right - left < minW) {
    right = Math.min(W, left + minW);
    left = Math.max(0, right - minW);
  }
  if (bottom - top < minH) {
    bottom = Math.min(H, top + minH);
    top = Math.max(0, bottom - minH);
  }
  return { left, top, width: right - left, height: bottom - top };
}
