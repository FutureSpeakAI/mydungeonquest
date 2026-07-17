import sharp from 'sharp';
import { createHash } from 'node:crypto';
// The engine's own instrument — question texts, box validation, stated
// padding, clamp arithmetic. These are LAW (a paint-law source): the
// production repaint warden and this court hold the SAME magnifier, so
// they can no longer disagree by looking differently.
// @ts-ignore — the engine ships untyped ESM.
import { boxBrief, markBrief, validateBox, clampBox } from 'fatescript/magnifier';
import { judge } from './vision';

// ============================================================
// THE MAGNIFIED LOOK (TASK 54B §3), court side. Mark examination is
// two-stage everywhere it occurs:
//   stage one — the judge boxes the subject's head and shoulders
//               (strict flat JSON, relative coordinates);
//   stage two — sharp cuts that box at the engine's stated padding and
//               the mark question is asked on the crop ALONE.
// A boxless stage one is an honest not-proven: mark_visible false,
// never a sighting — fail-closed at both doors alike.
// ============================================================

export interface MagnifiedLook {
  found: boolean;
  box: { left: number; top: number; width: number; height: number } | null;
  mark_visible: boolean;
  confidence: number;
  cropSha: string | null;
}

export async function magnifiedMark(args: {
  bytes: Buffer;
  markText: string;
  idSeed: string;
  criterion: string;
  protocol?: string;
}): Promise<MagnifiedLook> {
  const { bytes, markText, idSeed, criterion } = args;
  const protocol = args.protocol || 'p2';
  const boxVerdict = await judge({
    id: `${idSeed}-box`,
    protocol,
    criterion,
    images: [bytes],
    question: boxBrief(),
    schema: { found: 'boolean', x: 'number 0..1', y: 'number 0..1', w: 'number 0..1', h: 'number 0..1' },
  });
  const box = validateBox(boxVerdict);
  if (!box) {
    return { found: false, box: null, mark_visible: false, confidence: 0, cropSha: null };
  }
  const meta = await sharp(bytes).metadata();
  const rect = clampBox({ box, width: meta.width || 1, height: meta.height || 1 });
  const crop = await sharp(bytes).extract(rect).png().toBuffer();
  const markVerdict = await judge({
    id: `${idSeed}-mark`,
    protocol,
    criterion,
    images: [crop],
    question: markBrief(markText),
    schema: { mark_visible: 'boolean', confidence: 'number 0..1' },
  });
  return {
    found: true,
    box: rect,
    mark_visible: markVerdict.mark_visible === true,
    confidence: Math.max(0, Math.min(1, Number(markVerdict.confidence) || 0)),
    cropSha: createHash('sha256').update(crop).digest('hex'),
  };
}
