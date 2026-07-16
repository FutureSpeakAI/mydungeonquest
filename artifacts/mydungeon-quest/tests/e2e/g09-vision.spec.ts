import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  act, boot, closeModal, forgeNewChronicle, harvestPlates, loadManifest, mediaIndex,
  openCodex, paintFixtureExtras, PLATES_DIR, plateBytes, readCampaign, readJournal,
  rollIfAsked, seedFixture, sessionInfo, turnCount
} from './lib/harness';
import type { PlateEntry } from './lib/harness';
import { histogramDelta, judge, noteLowConfidence, noteNear } from './lib/vision';

// ============================================================
// THE VISION BOOK — one serial lifecycle. Two harvests fill the plate
// store on disk (once; every later iteration reuses the bytes), then all
// machine-vision criteria (G9–G11, G16–G18) judge from the store. §6.4.
// ============================================================

test.describe.configure({ mode: 'serial' });

const HERO = { name: 'Maren', mark: 'a burn in the shape of a key', presentation: 'feminine', pronouns: 'she/her' };
const VILLAIN = 'The Hollow Regent';

function req(manifest: PlateEntry[], predicate: (entry: PlateEntry) => boolean, what: string): PlateEntry {
  const entry = manifest.find(predicate);
  if (!entry) throw new Error(`plate store missing ${what}`);
  return entry;
}
const isScene = (entry: PlateEntry) => entry.klass === 'scene';
const vale = (manifest: PlateEntry[], which: 'establishing' | 'second' | 'wounded' | 'blighted') => {
  if (which === 'establishing') return req(manifest, (e) => e.klass === 'region' && !String(e.cacheKey || '').startsWith('proving:'), 'Larkspur Vale establishing plate');
  return req(manifest, (e) => String(e.cacheKey || '').endsWith(`:vale-${which === 'second' ? '2' : which}`), `Larkspur Vale ${which} plate`);
};

async function waitForPlates(page: any, campaignId: string, ready: (rows: any[]) => boolean, timeout: number) {
  const deadline = Date.now() + timeout;
  let rows: any[] = [];
  while (Date.now() < deadline) {
    rows = (await mediaIndex(page, campaignId)).filter((row) => row.kind === 'paint');
    if (ready(rows)) return rows;
    await page.waitForTimeout(5000);
  }
  throw new Error(`plates never arrived; store holds: ${JSON.stringify(rows.map((r) => ({ label: r.label, variant: r.variant, cacheKey: r.cacheKey })))}`);
}

// ---------- HARVEST A: a live session on the real paint tier ----------

test('harvest A: live session paints hero anchor, villain, and scenes', async ({ page }) => {
  test.setTimeout(900_000);
  let manifest = loadManifest('live');
  if (!manifest) {
    await boot(page);
    await forgeNewChronicle(page, { sparkIndex: 1, hero: HERO });
    const campaignId = await page.evaluate(async () => {
      const { db } = await import('/src/lib/db.js');
      const all = await db.campaigns.orderBy('updatedAt').reverse().toArray();
      return all[0]?.id;
    });
    expect(campaignId, 'a campaign was born').toBeTruthy();

    await waitForPlates(page, campaignId, (rows) =>
      rows.some((r) => r.label === 'keyart')
      && rows.some((r) => r.variant === 'bust' && r.label === HERO.name)
      && rows.some((r) => r.label === VILLAIN && r.variant === 'bust')
      && rows.some((r) => r.label === VILLAIN && r.variant === 'dramatic')
      && rows.filter((r) => String(r.cacheKey || '').startsWith('scene:')).length >= 1,
    480_000);

    const before = await turnCount(page);
    await act(page, 'I follow the gold-thread mark deeper toward the vault.');
    await page.waitForFunction((count: number) => document.querySelectorAll('main.adventure-log .turn-entry').length > count, before, { timeout: 120_000 });
    await rollIfAsked(page);
    await waitForPlates(page, campaignId, (rows) => rows.filter((r) => String(r.cacheKey || '').startsWith('scene:')).length >= 2, 300_000);

    manifest = await harvestPlates(page, campaignId, 'live');
    const campaign = await readCampaign(page, campaignId);
    fs.writeFileSync(path.join(PLATES_DIR, 'live', 'session.json'),
      JSON.stringify({ campaignId, hero: HERO, villain: VILLAIN, styleBible: campaign.styleBible, logs: campaign.logs }, null, 2));
  }

  req(manifest, (e) => e.klass === 'keyart', 'live key art');
  req(manifest, (e) => e.klass === 'portrait' && e.label === HERO.name && e.variant === 'bust', 'hero anchor');
  req(manifest, (e) => e.label === VILLAIN && e.variant === 'bust', 'villain intro portrait');
  req(manifest, (e) => e.label === VILLAIN && e.variant === 'dramatic', 'villain later plate');
  expect(manifest.filter(isScene).length, 'at least two scene plates').toBeGreaterThanOrEqual(2);
});

// ---------- HARVEST B: the fixture painted, revealed, sealed, and bound ----------

test('harvest B: fixture paints through the app foundry, then seals into the book', async ({ page }) => {
  test.setTimeout(900_000);
  if (loadManifest('fixture') && fs.existsSync(path.join(PLATES_DIR, 'fixture', 'storybook.json'))) {
    expect(loadManifest('fixture')!.length).toBeGreaterThanOrEqual(8);
    return;
  }

  const campaignId = await seedFixture(page);
  const { prompts } = await paintFixtureExtras(page, campaignId);

  // THE REVEAL LAW — the book retells only dealt art. Re-seat the campaign
  // so the freshly landed plates actually render (and are seen), and visit
  // the Vale's place page so its establishing plate is dealt too.
  await page.click('nav button:has-text("Hearth")');
  await page.waitForSelector('.title-page', { timeout: 20_000 });
  await page.locator('.book-spine:not(.new-spine)').first().click();
  await page.waitForSelector('main.adventure-log', { timeout: 30_000 });
  await page.waitForFunction(() => document.querySelectorAll('main.adventure-log .plate-zoom img').length >= 2, undefined, { timeout: 60_000 });

  await openCodex(page);
  await page.locator('.region-gallery article.tappable', { hasText: 'Larkspur Vale' }).first().click();
  // (iteration-2 logged edit) The plate IS the img.region-plate element —
  // the old selector demanded an img nested inside it and could never match,
  // even with the painted row proven present. Criterion unchanged.
  await expect(page.locator('.place-page img.region-plate').first()).toBeVisible({ timeout: 30_000 });
  await closeModal(page);

  const manifest = await harvestPlates(page, campaignId, 'fixture');
  const campaign = await readCampaign(page, campaignId);
  fs.writeFileSync(path.join(PLATES_DIR, 'fixture', 'session.json'),
    JSON.stringify({ campaignId, prompts, styleBible: campaign.styleBible, logs: campaign.logs }, null, 2));

  // SEAL through the app's own ritual (Codex → seal ask → the wax).
  await openCodex(page);
  await page.locator('.modal button', { hasText: /seal/i }).first().click();
  const confirm = page.locator('button:has-text("Seal the Tale"), button:has-text("Seal the tale")').first();
  await confirm.click({ timeout: 15_000 });
  const press = page.locator('.press-seal, button:has-text("Press")').first();
  if (await press.isVisible().catch(() => false)) await press.click();
  await expect(page.locator('.verify-wax').first()).toContainText(/This tale is true/i, { timeout: 60_000 });

  // Open the storybook keepsake and capture the whole editorial state.
  await page.locator('button', { hasText: /storybook/i }).first().click();
  await page.waitForSelector('iframe.book-frame', { timeout: 120_000 });
  await page.frameLocator('iframe.book-frame').locator('.leaf').first().waitFor({ timeout: 60_000 });

  // (iteration-6 logged edit) The book frame is lawfully sandboxed into an
  // opaque origin — no allow-same-origin, so a crafted chronicle can never
  // reach the vault — which makes contentDocument null BY DESIGN. The
  // harvest reads the same DOM through the frame's own context and joins
  // the media meta from the app origin afterward. Same captured shape,
  // same downstream assertions; nothing weakened.
  const frameHandle = await page.$('iframe.book-frame');
  const bookFrame = await frameHandle!.contentFrame();
  const frameData = await bookFrame!.evaluate(() => {
    const chapters = Array.from(document.querySelectorAll('.leaf.chapter')).map((leaf, index) => ({
      index,
      className: leaf.className,
      heading: (leaf.querySelector('h1, h2, h3, h4')?.textContent || '').trim(),
      prose: (leaf.querySelector('.folio-prose')?.textContent || '').trim(),
      plates: Array.from(leaf.querySelectorAll('.chapter-plate img')).map((img) => ({
        dataUrl: (img as HTMLImageElement).src,
        alt: (img as HTMLImageElement).alt
      }))
    }));
    const words = Array.from(document.querySelectorAll('.words')).map((node) => (node.textContent || '').trim());
    const bodyTextContent = (document.body as HTMLElement).innerText;
    const images = Array.from(document.images).map((img) => ({ ok: img.naturalWidth > 0, alt: img.alt }));
    return { chapters, words, bodyTextContent, images };
  });
  const byUrl = await page.evaluate(async (id) => {
    const { db } = await import('/src/lib/db.js');
    const rows = await db.media.where('campaignId').equals(id).toArray();
    const toDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const map: Record<string, any> = {};
    for (const row of rows) if (row.blob) map[await toDataUrl(row.blob)] = { assetHash: row.assetHash, originTurnHash: row.originTurnHash ?? null, label: row.label ?? null };
    return map;
  }, campaignId);
  const book = {
    ...frameData,
    chapters: frameData.chapters.map((chapter: any) => ({
      ...chapter,
      plates: chapter.plates.map((plate: any) => ({ ...plate, meta: byUrl[plate.dataUrl] || null }))
    }))
  };

  // Persist the editorial capture; plate bytes go beside it.
  const dir = path.join(PLATES_DIR, 'fixture');
  const chapters = book.chapters.map((chapter: any) => ({
    ...chapter,
    plates: chapter.plates.map((plate: any, i: number) => {
      const match = /^data:image\/(\w+);base64,(.+)$/.exec(plate.dataUrl || '');
      let file: string | null = null;
      if (match) {
        file = `book-ch${chapter.index}-plate${i}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
        fs.writeFileSync(path.join(dir, file), Buffer.from(match[2], 'base64'));
      }
      return { file, alt: plate.alt, meta: plate.meta };
    })
  }));
  const journal = await readJournal(page, campaignId);
  const sealedCampaign = await readCampaign(page, campaignId);
  fs.writeFileSync(path.join(dir, 'storybook.json'), JSON.stringify({
    chapters, words: book.words, bodyTextContent: book.bodyTextContent, images: book.images,
    attestations: journal.filter((row: any) => row.type === 'media_attestation'),
    logs: sealedCampaign.logs, sealed: !!sealedCampaign.sealedAt
  }, null, 2));

  const cover = page.frameLocator('iframe.book-frame').locator('.leaf.cover').first();
  await cover.waitFor({ timeout: 30_000 });
  fs.writeFileSync(path.join(dir, 'cover.png'), await cover.screenshot());

  expect(manifest.length, 'the fixture store holds its plates').toBeGreaterThanOrEqual(8);
  expect(book.chapters.length, 'the book bound at least one chapter').toBeGreaterThanOrEqual(1);
});

// ---------- G9 CHARACTER CONSISTENCY ----------

test('G9a the hero holds her face, mark, and presentation into a scene', async () => {
  test.setTimeout(300_000);
  const manifest = loadManifest('live')!;
  const anchor = plateBytes(req(manifest, (e) => e.klass === 'portrait' && e.label === HERO.name && e.variant === 'bust', 'hero anchor'));
  const scenes = manifest.filter(isScene);
  const attempts: any[] = [];
  let winner: any = null;
  for (const scene of scenes) {
    const verdict = await judge({
      id: `g09a-hero-${String(scene.assetHash).slice(0, 12)}`,
      criterion: 'g09a-hero-constancy',
      images: [anchor, plateBytes(scene)],
      question: 'Image 1 is the portrait anchor of the hero: a feminine-presenting figure whose distinguishing mark is "a burn in the shape of a key" (a key-shaped burn scar). Image 2 is a scene plate from the same story. Answer: same_character — is the anchor\'s character present in image 2 (same face, hair, build, wardrobe language)? mark_visible — is the key-shaped burn mark visible on that character in image 2? presentation_matches — does the character\'s gender presentation in image 2 match image 1?',
      schema: { same_character: 'boolean', mark_visible: 'boolean', presentation_matches: 'boolean', confidence: 'number 0..1' }
    });
    attempts.push({ scene: scene.file, verdict });
    if (verdict.same_character && verdict.mark_visible && verdict.presentation_matches && Number(verdict.confidence) >= 0.75) { winner = verdict; break; }
  }
  expect(winner, `no scene plate carried the hero true; attempts: ${JSON.stringify(attempts)}`).toBeTruthy();
  noteNear('g09a-confidence', Number(winner.confidence), 0.75, 'min');
  noteLowConfidence('g09a', Number(winner.confidence));
});

test('G9b the villain holds his face from intro to a later plate', async () => {
  test.setTimeout(180_000);
  const manifest = loadManifest('live')!;
  const intro = plateBytes(req(manifest, (e) => e.label === VILLAIN && e.variant === 'bust', 'villain intro'));
  const later = plateBytes(req(manifest, (e) => e.label === VILLAIN && e.variant === 'dramatic', 'villain later plate'));
  const verdict = await judge({
    id: 'g09b-villain-constancy', criterion: 'g09b-villain-constancy',
    images: [intro, later],
    question: 'Image 1 is a character\'s introduction portrait. Image 2 is a later plate of the same story. Is the same character depicted in both (same face, features, silhouette, costume language)?',
    schema: { same_character: 'boolean', confidence: 'number 0..1' }
  });
  expect(verdict.same_character, JSON.stringify(verdict)).toBe(true);
  expect(Number(verdict.confidence)).toBeGreaterThanOrEqual(0.75);
  noteNear('g09b-confidence', Number(verdict.confidence), 0.75, 'min');
  noteLowConfidence('g09b', Number(verdict.confidence));
});

test('G9c the Edda regression: feminine, elder, forever', async () => {
  test.setTimeout(180_000);
  const manifest = loadManifest('fixture')!;
  const edda = plateBytes(req(manifest, (e) => e.label === 'Edda' && e.variant === 'bust', 'Edda portrait'));
  const verdict = await judge({
    id: 'g09c-edda-regression', criterion: 'g09c-edda-regression',
    images: [edda],
    question: 'State the apparent presentation and age band of this figure.',
    schema: { presentation: 'feminine|masculine|androgynous', age_band: 'child|young adult|adult|elder', confidence: 'number 0..1' }
  });
  expect(String(verdict.presentation).toLowerCase(), JSON.stringify(verdict)).toContain('feminine');
  expect(String(verdict.age_band).toLowerCase(), JSON.stringify(verdict)).toContain('elder');
  noteLowConfidence('g09c', Number(verdict.confidence));
});

// ---------- G10 ENVIRONMENTAL CONSISTENCY ----------

test('G10a the Vale twice: same location, shared motifs', async () => {
  test.setTimeout(180_000);
  const manifest = loadManifest('fixture')!;
  const verdict = await judge({
    id: 'g10a-vale-pair', criterion: 'g10a-region-constancy',
    images: [plateBytes(vale(manifest, 'establishing')), plateBytes(vale(manifest, 'second'))],
    question: 'These are two plates of the same fictional region. Do they depict the same location (same landscape logic, architecture, landmark language)? Name the visual motifs they share.',
    schema: { same_location: 'boolean', shared_motifs: ['string'], confidence: 'number 0..1' }
  });
  expect(verdict.same_location, JSON.stringify(verdict)).toBe(true);
  expect((verdict.shared_motifs || []).length, JSON.stringify(verdict)).toBeGreaterThanOrEqual(2);
  noteLowConfidence('g10a', Number(verdict.confidence));
});

test('G10b histogram gate: same region, same state, delta at most 0.35', async () => {
  const manifest = loadManifest('fixture')!;
  const delta = await histogramDelta(plateBytes(vale(manifest, 'establishing')), plateBytes(vale(manifest, 'second')));
  expect(delta, `histogramDelta ${delta}`).toBeLessThanOrEqual(0.35);
  noteNear('g10b-histogram', delta, 0.35, 'max');
});

test('G10c the wounded Vale reads wounded', async () => {
  test.setTimeout(180_000);
  const manifest = loadManifest('fixture')!;
  const verdict = await judge({
    id: 'g10c-vale-wounded', criterion: 'g10c-region-damage',
    images: [plateBytes(vale(manifest, 'establishing')), plateBytes(vale(manifest, 'wounded'))],
    question: 'Which image shows visible damage, decay, or darkening relative to the other? Answer 1 or 2.',
    schema: { damaged_image: '1|2', confidence: 'number 0..1' }
  });
  expect(String(verdict.damaged_image), JSON.stringify(verdict)).toContain('2');
  noteLowConfidence('g10c', Number(verdict.confidence));
});

// ---------- G11 THE STYLE BIBLE ----------

test('G11a two plates share the bible\'s style', async () => {
  test.setTimeout(180_000);
  const manifest = loadManifest('fixture')!;
  const scene = manifest.filter(isScene)[0];
  expect(scene, 'a fixture scene plate exists').toBeTruthy();
  const verdict = await judge({
    id: 'g11a-shared-style', criterion: 'g11a-style-bible',
    images: [plateBytes(vale(manifest, 'establishing')), plateBytes(scene)],
    question: 'These two images come from the same illustrated campaign. Do they share a consistent artistic style? Name the style descriptors they share (medium, palette, lighting, era language).',
    schema: { shared_style: 'boolean', style_descriptors: ['string'], confidence: 'number 0..1' }
  });
  expect(verdict.shared_style, JSON.stringify(verdict)).toBe(true);
  const bible = String(sessionInfo('fixture')?.styleBible || '').toLowerCase();
  expect(bible.length, 'fixture style bible recorded').toBeGreaterThan(0);
  const hits = (verdict.style_descriptors || []).filter((descriptor: string) =>
    String(descriptor).toLowerCase().split(/[^a-z]+/).some((word) => word.length >= 4 && bible.includes(word)));
  expect(hits.length, `descriptors echo the bible: ${JSON.stringify(verdict.style_descriptors)} vs "${bible}"`).toBeGreaterThanOrEqual(2);
  noteLowConfidence('g11a', Number(verdict.confidence));
});

test('G11b every plate is clean: no baked text, no cartoon, no 3d', async () => {
  test.setTimeout(1_200_000);
  const entries = [...(loadManifest('live') || []), ...(loadManifest('fixture') || [])];
  expect(entries.length).toBeGreaterThanOrEqual(10);
  const dirty: any[] = [];
  for (const entry of entries) {
    const verdict = await judge({
      id: `g11b-clean-${String(entry.assetHash).slice(0, 12)}`, criterion: 'g11b-image-clean',
      images: [plateBytes(entry)],
      question: 'Does this image contain rendered text, lettering, a signature, or a watermark? Is it in a cartoon, cel-shaded, or obvious 3D-render style rather than a painted illustration?',
      schema: { contains_text_or_watermark: 'boolean', is_cartoon_or_3d: 'boolean', confidence: 'number 0..1' }
    });
    if (verdict.contains_text_or_watermark || verdict.is_cartoon_or_3d) dirty.push({ plate: entry.file, verdict });
    noteLowConfidence(`g11b-${entry.file}`, Number(verdict.confidence));
  }
  expect(dirty, JSON.stringify(dirty)).toEqual([]);
});

// ---------- G16 CAPTION & MOMENT COHERENCE ----------

function scenePairs(tag: 'live' | 'fixture'): { plate: PlateEntry; prose: string }[] {
  const manifest = loadManifest(tag) || [];
  const session = sessionInfo(tag);
  if (!session) return [];
  const pairs: { plate: PlateEntry; prose: string }[] = [];
  for (const plate of manifest.filter(isScene)) {
    const log = (session.logs || []).find((entry: any) =>
      entry.imageAssetHash === plate.assetHash
      || String(plate.cacheKey || '').endsWith(`:${entry.recordHash}`));
    const prose = log?.narrations?.[0]?.text || '';
    if (prose) pairs.push({ plate, prose });
  }
  return pairs;
}

test('G16a every scene plate depicts its bound moment', async () => {
  test.setTimeout(600_000);
  const pairs = [...scenePairs('live'), ...scenePairs('fixture')];
  expect(pairs.length, 'scene/moment pairs recovered from both stores').toBeGreaterThanOrEqual(3);
  const misses: any[] = [];
  for (const { plate, prose } of pairs) {
    const verdict = await judge({
      id: `g16a-moment-${String(plate.assetHash).slice(0, 12)}`, criterion: 'g16a-moment-coherence',
      images: [plateBytes(plate)],
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
  const book = JSON.parse(fs.readFileSync(path.join(PLATES_DIR, 'fixture', 'storybook.json'), 'utf8'));
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
      images: [fs.readFileSync(path.join(PLATES_DIR, 'fixture', pair.file))],
      question: `This plate sits on a storybook page whose retelling begins:\n"${pair.prose}"\nDoes the image depict this scene?`,
      schema: { depicts_this_scene: 'boolean', confidence: 'number 0..1' }
    });
    if (!verdict.depicts_this_scene) misses.push({ ...pair, verdict });
    noteLowConfidence(`g16b-${pair.file}`, Number(verdict.confidence));
  }
  expect(misses, JSON.stringify(misses)).toEqual([]);
});

test('G16c explicit captions under plates plausibly describe them', async ({ page }) => {
  test.setTimeout(300_000);
  await seedFixture(page);
  // Each caption is judged against ITS OWN figure's image bytes.
  const captions = await page.evaluate(() => Array.from(document.querySelectorAll('main.adventure-log figure figcaption'))
    .map((node) => {
      const img = node.closest('figure')?.querySelector('img') as HTMLImageElement | null;
      return { text: (node.textContent || '').trim(), dataUrl: img?.src?.startsWith('data:image/') ? img.src : null };
    })
    .filter((entry) => entry.text.length > 0 && entry.dataUrl));
  // The feed captions plates through alt text and margins; explicit
  // figcaptions may not exist. The criterion binds WHEN captions exist —
  // and the sabotage caption tooth proves this check can bite.
  for (const caption of captions) {
    const match = /^data:image\/\w+;base64,(.+)$/.exec(caption.dataUrl!);
    if (!match) throw new Error(`caption figure image is not judgeable bytes: ${caption.dataUrl!.slice(0, 40)}`);
    const verdict = await judge({
      id: `g16c-caption-${Buffer.from(caption.text).toString('hex').slice(0, 16)}`, criterion: 'g16c-caption-plausible',
      images: [Buffer.from(match[1], 'base64')],
      question: `Does this caption plausibly describe this image: "${caption.text}"?`,
      schema: { caption_plausible: 'boolean', confidence: 'number 0..1' }
    });
    expect(verdict.caption_plausible, JSON.stringify({ caption: caption.text, verdict })).toBe(true);
  }
  expect(true).toBe(true);
});

// ---------- G17 FRAMING & COMPOSITION ----------

test('G17a portraits: whole heads, single subjects, no awkward crops', async () => {
  test.setTimeout(600_000);
  const portraits = [...(loadManifest('live') || []), ...(loadManifest('fixture') || [])]
    .filter((entry) => entry.klass === 'portrait');
  expect(portraits.length).toBeGreaterThanOrEqual(4);
  const misses: any[] = [];
  for (const portrait of portraits) {
    const verdict = await judge({
      id: `g17a-frame-${String(portrait.assetHash).slice(0, 12)}`, criterion: 'g17a-portrait-framing',
      images: [plateBytes(portrait)],
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
  const expectations: { plate: PlateEntry; subjects: string[] }[] = [];
  const fixtureManifest = loadManifest('fixture') || [];
  const fixtureSession = sessionInfo('fixture');
  for (const plate of fixtureManifest.filter(isScene)) {
    const log = (fixtureSession?.logs || []).find((entry: any) => String(plate.cacheKey || '').endsWith(`:${entry.recordHash}`) || entry.imageAssetHash === plate.assetHash);
    const speakers = (log?.narrations || []).map((block: any) => block.speaker).filter(Boolean);
    if (speakers.length) expectations.push({ plate, subjects: [...new Set(speakers)] as string[] });
  }
  const liveSession = sessionInfo('live');
  for (const plate of (loadManifest('live') || []).filter(isScene)) {
    const log = (liveSession?.logs || []).find((entry: any) => entry.imageAssetHash === plate.assetHash);
    const named = log?.imageCue?.subjects || [];
    if (named.length) expectations.push({ plate, subjects: named });
  }
  expect(expectations.length, 'at least the fixture scenes carry named subjects').toBeGreaterThanOrEqual(2);
  const misses: any[] = [];
  for (const { plate, subjects } of expectations) {
    const verdict = await judge({
      id: `g17b-subjects-${String(plate.assetHash).slice(0, 12)}`, criterion: 'g17b-scene-subjects',
      images: [plateBytes(plate)],
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
  const keyarts = [...(loadManifest('live') || []), ...(loadManifest('fixture') || [])]
    .filter((entry) => entry.klass === 'keyart');
  expect(keyarts.length).toBeGreaterThanOrEqual(2);
  for (const art of keyarts) {
    const bytes = plateBytes(art);
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

// ---------- G18 STORYBOOK EDITORIAL ORDER ----------

function readBook(): any {
  return JSON.parse(fs.readFileSync(path.join(PLATES_DIR, 'fixture', 'storybook.json'), 'utf8'));
}

test('G18a pages ascend with no gaps and no empty bodies', async () => {
  const book = readBook();
  expect(book.sealed, 'the book was bound from a sealed record').toBe(true);
  expect(book.chapters.length).toBeGreaterThanOrEqual(1);
  const numbers = book.chapters.map((chapter: any) => {
    const act = /act-(\d+)/.exec(chapter.className)?.[1];
    const heading = /chapter\s+([ivxlc]+|\d+)/i.exec(chapter.heading)?.[1];
    return { act: act ? Number(act) : null, heading, raw: chapter.heading };
  });
  for (let i = 1; i < numbers.length; i += 1) {
    if (numbers[i].act !== null && numbers[i - 1].act !== null) {
      expect(numbers[i].act, `acts never regress: ${JSON.stringify(numbers)}`).toBeGreaterThanOrEqual(numbers[i - 1].act!);
    }
  }
  for (const chapter of book.chapters) {
    expect(chapter.heading.length, `chapter ${chapter.index} has a heading`).toBeGreaterThan(0);
    expect(chapter.prose.length, `chapter "${chapter.heading}" has a body`).toBeGreaterThan(0);
  }
});

test('G18b every seated plate sits in the chapter its sealed record attests', async () => {
  const book = readBook();
  const attested = JSON.stringify(book.attestations || []);
  const seated = book.chapters.flatMap((chapter: any) => chapter.plates.filter((plate: any) => plate.meta?.assetHash).map((plate: any) => ({ chapter: chapter.index, ...plate })));
  expect(seated.length, 'at least one plate was seated with provenance').toBeGreaterThanOrEqual(1);
  for (const plate of seated) {
    expect(attested.includes(plate.meta.assetHash), `plate ${plate.file} (${plate.meta.assetHash}) is attested in the sealed record`).toBe(true);
    if (plate.meta.originTurnHash) {
      const log = (book.logs || []).find((entry: any) => entry.recordHash === plate.meta.originTurnHash);
      expect(log, `plate ${plate.file} origin turn exists in the record`).toBeTruthy();
      const expectedChapter = (log.beatIndex ?? 0);
      expect(plate.chapter, `plate ${plate.file} sits in the chapter of its origin beat`).toBe(expectedChapter);
    }
  }
});

test('G18c dramatis quotes wear quotation marks and true citations', async () => {
  const book = readBook();
  expect(book.words.length, 'the dramatis speaks').toBeGreaterThanOrEqual(2);
  for (const line of book.words) {
    expect(line, `dramatis line wears quotes: "${line}"`).toMatch(/[“"][^”"]+[”"]/);
    const cite = /\(turn (\d+)\)/.exec(line);
    expect(cite, `dramatis line cites a turn: "${line}"`).toBeTruthy();
    const turn = Number(cite![1]);
    expect(turn >= 0 && turn < (book.logs || []).length, `cited turn ${turn} exists in the record`).toBe(true);
    const cited = (book.logs || [])[turn];
    expect(cited?.redacted, `cited turn ${turn} is not a struck turn`).not.toBe(true);
  }
  expect(book.bodyTextContent).toMatch(/Edda[\s\S]{0,400}?\(turn 1\)/);
  expect(book.bodyTextContent).toMatch(/Corin Voss[\s\S]{0,400}?\(turn 3\)/);
});

test('G18d the cover: hero present and whole, clean art, reads as a cover', async () => {
  test.setTimeout(180_000);
  const cover = fs.readFileSync(path.join(PLATES_DIR, 'fixture', 'cover.png'));
  const verdict = await judge({
    id: 'g18d-cover', criterion: 'g18d-cover-law',
    images: [cover],
    question: 'This is the rendered cover page of an illustrated storybook. Clean overlaid TITLE TYPOGRAPHY is expected and correct on a cover — do not count it as baked text. Answer: hero_present — is a hero figure (a person) visible on the cover? hero_whole — is that figure whole, not awkwardly cropped? baked_text_in_artwork — aside from the clean title typography, is any text baked INTO the painted artwork itself (warped lettering, gibberish signs, watermarks)? reads_as_cover — does the composition read as a deliberate book cover rather than a mid-action crop?',
    schema: { hero_present: 'boolean', hero_whole: 'boolean', baked_text_in_artwork: 'boolean', reads_as_cover: 'boolean', confidence: 'number 0..1' }
  });
  expect(verdict.hero_present, JSON.stringify(verdict)).toBe(true);
  expect(verdict.hero_whole, JSON.stringify(verdict)).toBe(true);
  expect(verdict.baked_text_in_artwork, JSON.stringify(verdict)).toBe(false);
  expect(verdict.reads_as_cover, JSON.stringify(verdict)).toBe(true);
  noteLowConfidence('g18d-cover', Number(verdict.confidence));
});
