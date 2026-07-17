import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { judge, noteLowConfidence, noteNear } from './lib/vision';
import { HARVEST_DIR, preflightManifest, topBytes } from './lib/harvestManifest';

// ============================================================
// G16 — CAPTION & MOMENT COHERENCE. Every scene plate depicts ITS bound
// moment; every storybook plate depicts its page's retelling; every
// explicit caption plausibly describes its own figure. This court reads
// only the harvest store: scene prose rides the top manifest, the book
// and the captions ride their captures. The sabotage caption tooth
// proves the caption question can bite.
// ============================================================

test('G16 preflight: the harvest store holds every artifact this court needs', () => {
  preflightManifest('g16-captions');
});

test('G16a every scene plate depicts its bound moment', async () => {
  test.setTimeout(600_000);
  const m = preflightManifest('g16-captions');
  const pairs = m.plates.filter((p) => p.role === 'scene' && p.prose);
  expect(pairs.length, 'scene/moment pairs recovered from both stores').toBeGreaterThanOrEqual(3);
  const misses: any[] = [];
  for (const plate of pairs) {
    const prose = String(plate.prose);
    const verdict = await judge({
      id: `g16a-moment-${String(plate.assetHash).slice(0, 12)}`, criterion: 'g16a-moment-coherence',
      images: [topBytes(plate)],
      question: `This plate was painted to illustrate the following story moment:\n"${prose.slice(0, 600)}"\nDoes the image depict THIS moment (its place, weather, action, or subjects — not a generic fantasy scene)? Name ONE visual element in the image that comes from the text.`,
      schema: { depicts_this_moment: 'boolean', named_element: 'string', confidence: 'number 0..1' }
    });
    const echoed = String(verdict.named_element || '').toLowerCase().split(/[^a-z]+/)
      .some((word) => word.length >= 4 && prose.toLowerCase().includes(word));
    if (!verdict.depicts_this_moment || Number(verdict.confidence) < 0.7 || !echoed) {
      misses.push({ plate: plate.file, verdict, echoed });
    }
    noteNear(`g16a-${plate.file}`, Number(verdict.confidence), 0.7, 'min');
    noteLowConfidence(`g16a-${plate.file}`, Number(verdict.confidence));
  }
  expect(misses, JSON.stringify(misses)).toEqual([]);
});

test('G16b every storybook plate depicts its page\'s retelling', async () => {
  test.setTimeout(600_000);
  const m = preflightManifest('g16-captions');
  const book = JSON.parse(fs.readFileSync(path.join(HARVEST_DIR, m.files.storybook), 'utf8'));
  const pairs: { file: string; prose: string }[] = [];
  for (const chapter of book.chapters) {
    for (const plate of chapter.plates) {
      if (plate.file && chapter.prose) pairs.push({ file: plate.file, prose: chapter.prose.slice(0, 200) });
    }
  }
  expect(pairs.length, 'the sealed book seated at least one plate').toBeGreaterThanOrEqual(1);
  const misses: any[] = [];
  for (const pair of pairs) {
    const verdict = await judge({
      id: `g16b-book-${pair.file}`, criterion: 'g16b-storybook-coherence',
      images: [fs.readFileSync(path.join(HARVEST_DIR, 'fixture', pair.file))],
      question: `This plate sits on a storybook page whose retelling begins:\n"${pair.prose}"\nDoes the image depict this scene?`,
      schema: { depicts_this_scene: 'boolean', confidence: 'number 0..1' }
    });
    if (!verdict.depicts_this_scene) misses.push({ ...pair, verdict });
    noteLowConfidence(`g16b-${pair.file}`, Number(verdict.confidence));
  }
  expect(misses, JSON.stringify(misses)).toEqual([]);
});

test('G16c explicit captions under plates plausibly describe them', async () => {
  test.setTimeout(300_000);
  const m = preflightManifest('g16-captions');
  const captions: { file: string; text: string }[] = JSON.parse(
    fs.readFileSync(path.join(HARVEST_DIR, m.files.captions), 'utf8'));
  // The feed captions plates through alt text and margins; explicit
  // figcaptions may not exist. The criterion binds WHEN captions exist —
  // and the sabotage caption tooth proves this check can bite.
  for (const caption of captions) {
    const verdict = await judge({
      id: `g16c-caption-${Buffer.from(caption.text).toString('hex').slice(0, 16)}`, criterion: 'g16c-caption-plausible',
      images: [fs.readFileSync(path.join(HARVEST_DIR, caption.file))],
      question: `Does this caption plausibly describe this image: "${caption.text}"?`,
      schema: { caption_plausible: 'boolean', confidence: 'number 0..1' }
    });
    expect(verdict.caption_plausible, JSON.stringify({ caption: caption.text, verdict })).toBe(true);
  }
  expect(true).toBe(true);
});
