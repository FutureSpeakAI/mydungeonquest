import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { judge, noteLowConfidence } from './lib/vision';
import { HARVEST_DIR, preflightManifest, rolePlate, topBytes } from './lib/harvestManifest';

// ============================================================
// G11 — THE STYLE BIBLE. One campaign, one hand: plates echo the bible's
// own descriptors, and EVERY plate in the store is clean — no baked
// text, no cartoon, no 3D render. This court reads only the harvest
// store. (The warden refuses lettered plates at paint time now — this
// court is the stricter, independent proof that nothing slipped.)
// ============================================================

test('G11 preflight: the harvest store holds every artifact this court needs', () => {
  preflightManifest('g11-style');
});

test('G11a two plates share the bible\'s style', async () => {
  test.setTimeout(180_000);
  const m = preflightManifest('g11-style');
  const scene = m.plates.find((p) => p.tag === 'fixture' && p.role === 'scene')!;
  const verdict = await judge({
    id: 'g11a-shared-style', criterion: 'g11a-style-bible',
    images: [topBytes(rolePlate(m, 'vale-establishing')), topBytes(scene)],
    question: 'These two images come from the same illustrated campaign. Do they share a consistent artistic style? Name the style descriptors they share (medium, palette, lighting, era language).',
    schema: { shared_style: 'boolean', style_descriptors: ['string'], confidence: 'number 0..1' }
  });
  expect(verdict.shared_style, JSON.stringify(verdict)).toBe(true);
  const session = JSON.parse(fs.readFileSync(path.join(HARVEST_DIR, m.files.sessionFixture), 'utf8'));
  const bible = String(session.styleBible || '').toLowerCase();
  expect(bible.length, 'fixture style bible recorded').toBeGreaterThan(0);
  const hits = (verdict.style_descriptors || []).filter((descriptor: string) =>
    String(descriptor).toLowerCase().split(/[^a-z]+/).some((word) => word.length >= 4 && bible.includes(word)));
  expect(hits.length, `descriptors echo the bible: ${JSON.stringify(verdict.style_descriptors)} vs "${bible}"`).toBeGreaterThanOrEqual(2);
  noteLowConfidence('g11a', Number(verdict.confidence));
});

test('G11b every plate is clean: no baked text, no cartoon, no 3d', async () => {
  test.setTimeout(1_200_000);
  const m = preflightManifest('g11-style');
  expect(m.plates.length).toBeGreaterThanOrEqual(10);
  const dirty: any[] = [];
  // (60B §4) Model sheets answer to their OWN bench — G31a judges a
  // sheet's grid, silence, and soul, and reference sheets are studies
  // (turnaround cells, construction views), not story paintings. The
  // style law here keeps every STORY plate; sheets are recused whole.
  for (const entry of m.plates.filter((p) => p.variant !== 'sheet')) {
    const verdict = await judge({
      id: `g11b-clean-${String(entry.assetHash).slice(0, 12)}`, criterion: 'g11b-image-clean',
      images: [topBytes(entry)],
      question: 'Does this image contain rendered text, lettering, a signature, or a watermark? Painted script on objects INSIDE the scene — a scroll, a sign, a banner, a book spine — is scenery, not rendered text: answer true only for lettering that sits ON the image (a caption, signature, watermark, or interface label) rather than IN the painted world. Is the image in a cartoon, cel-shaded, or obvious 3D-render style rather than a painted illustration?',
      schema: { contains_text_or_watermark: 'boolean', is_cartoon_or_3d: 'boolean', confidence: 'number 0..1' }
    });
    if (verdict.contains_text_or_watermark || verdict.is_cartoon_or_3d) dirty.push({ plate: entry.file, verdict });
    noteLowConfidence(`g11b-${entry.file}`, Number(verdict.confidence));
  }
  expect(dirty, JSON.stringify(dirty)).toEqual([]);
});
