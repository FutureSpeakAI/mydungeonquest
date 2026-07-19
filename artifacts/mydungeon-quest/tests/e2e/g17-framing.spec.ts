import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { judge, noteLowConfidence, noteNear } from './lib/vision';
import { preflightManifest, topBytes } from './lib/harvestManifest';

// ============================================================
// G17 — FRAMING & COMPOSITION. Portraits arrive whole; scene plates show
// their named subjects uncut; key art is figure-less, clean, and true to
// its 16:9. This court reads only the harvest store — subjects ride the
// top manifest exactly as the monolith bound them (fixture speakers,
// live paint cues).
// ============================================================

test('G17 preflight: the harvest store holds every artifact this court needs', () => {
  preflightManifest('g17-framing');
});

test('G17a portraits: whole heads, single subjects, no awkward crops', async () => {
  test.setTimeout(600_000);
  const m = preflightManifest('g17-framing');
  // (60B §4) The atelier's DRAMATIC variant is a scene-portrait by
  // design — the soul inside a moment, props and diegetic occlusion
  // welcome. Headshot framing law was never its promise; identity on
  // those plates stays under G9's hard law. Busts and full figures
  // keep the whole-head, no-awkward-crop bench.
  const portraits = m.plates.filter((p) => p.klass === 'portrait' && p.variant !== 'dramatic');
  expect(portraits.length).toBeGreaterThanOrEqual(4);
  const misses: any[] = [];
  for (const portrait of portraits) {
    const verdict = await judge({
      id: `g17a-frame-${String(portrait.assetHash).slice(0, 12)}`, criterion: 'g17a-portrait-framing',
      images: [topBytes(portrait)],
      question: 'This is a character portrait. Is the subject fully in frame — head not cropped at crown or chin, both eyes visible? Is there exactly one primary subject? Is the composition free of awkward crops (limbs or face cut off mid-feature)?',
      schema: { subject_fully_in_frame: 'boolean', single_subject: 'boolean', awkward_crop: 'boolean', confidence: 'number 0..1' }
    });
    if (!verdict.subject_fully_in_frame || !verdict.single_subject || verdict.awkward_crop) misses.push({ plate: portrait.file, verdict });
    noteLowConfidence(`g17a-${portrait.file}`, Number(verdict.confidence));
  }
  expect(misses, JSON.stringify(misses)).toEqual([]);
});

test('G17b scene plates show their named subjects uncut', async () => {
  test.setTimeout(600_000);
  const m = preflightManifest('g17-framing');
  const expectations = m.plates.filter((p) => p.role === 'scene' && p.subjects.length > 0);
  expect(expectations.length, 'at least the fixture scenes carry named subjects').toBeGreaterThanOrEqual(2);
  const misses: any[] = [];
  for (const plate of expectations) {
    const subjects = plate.subjects;
    const verdict = await judge({
      id: `g17b-subjects-${String(plate.assetHash).slice(0, 12)}`, criterion: 'g17b-scene-subjects',
      images: [topBytes(plate)],
      question: `This scene plate was painted with these named subjects: ${subjects.join(', ')}. List which of the named subjects are visible as figures in the image, and state whether any visible named subject is cut in half by the frame edge.`,
      schema: { named_subjects_visible: ['string'], any_subject_cut_off: 'boolean', confidence: 'number 0..1' }
    });
    const visible = (verdict.named_subjects_visible || []).map((name: string) => String(name).toLowerCase());
    const missing = subjects.filter((name) => !visible.some((seen: string) => seen.includes(name.toLowerCase().split(' ')[0])));
    if (missing.length || verdict.any_subject_cut_off) misses.push({ plate: plate.file, subjects, verdict, missing });
    noteLowConfidence(`g17b-${plate.file}`, Number(verdict.confidence));
  }
  expect(misses, JSON.stringify(misses)).toEqual([]);
});

test('G17c key art: figure-less, uncut, clean, and true to its aspect', async () => {
  test.setTimeout(300_000);
  const m = preflightManifest('g17-framing');
  const keyarts = m.plates.filter((p) => p.role === 'keyart');
  expect(keyarts.length).toBeGreaterThanOrEqual(2);
  for (const art of keyarts) {
    const bytes = topBytes(art);
    const meta = await sharp(bytes).metadata();
    const ratio = (meta.width || 0) / (meta.height || 1);
    const drift = Math.abs(ratio - 16 / 9) / (16 / 9);
    expect(drift, `keyart ${art.file} aspect ${meta.width}x${meta.height} drifts ${(drift * 100).toFixed(1)}% from 16:9`).toBeLessThanOrEqual(0.02);
    noteNear(`g17c-aspect-${art.file}`, drift, 0.02, 'max');

    const verdict = await judge({
      id: `g17c-keyart-${String(art.assetHash).slice(0, 12)}`, criterion: 'g17c-keyart-law',
      images: [bytes],
      question: 'This is key art whose law forbids foreground figures. Are there foreground figures (people or creatures prominent in the near ground)? Is any principal subject cut off by the frame? Does the image contain rendered text or a watermark?',
      schema: { has_foreground_figures: 'boolean', principal_subject_cut_off: 'boolean', contains_text_or_watermark: 'boolean', confidence: 'number 0..1' }
    });
    expect(verdict.has_foreground_figures, JSON.stringify({ art: art.file, verdict })).toBe(false);
    expect(verdict.principal_subject_cut_off, JSON.stringify(verdict)).toBe(false);
    expect(verdict.contains_text_or_watermark, JSON.stringify(verdict)).toBe(false);
    noteLowConfidence(`g17c-${art.file}`, Number(verdict.confidence));
  }
});
