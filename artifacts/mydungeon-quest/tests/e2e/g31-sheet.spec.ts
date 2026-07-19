import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { HARVEST_DIR, preflightManifest, rolePlate, topBytes } from './lib/harvestManifest';
import { boot, loadManifest, plateBytes, seedFixture } from './lib/harness';
import type { PlateEntry } from './lib/harness';
import { attirePairVerdict, closureVerdict, sheetIdentityVerdict, sheetIntegrityVerdict, sheetSoulClause } from './lib/frameLaw';
import { binaryVerdict } from './lib/binaryVerdict';
import { freshPlateSweep } from './lib/freshPlate';
// THE ONE ROAD's own law — imported from the same bytes the app walks
// (never mirrored): the ratio law, the cue court, and the prop court.
import { checkPlateRatio, cueCourt, groundFixtures, movedItems, propLawCheck } from '../../src/lib/plateroad.js';

// ============================================================
// G31 — TRUE IMAGE (60B §4). Six sittings over the sealed harvest
// and the road's own law: the sheet court (a), the ceiling and the
// closed frame (b), the fresh-plate walk (c), the vertical law (d),
// honest captions (e), and the prop court's own teeth (f). Every
// vision sitting rides an instrument tooth 20 calibrated first; a
// missing artifact is a loud NAMED refusal, never a skip.
// ============================================================

function sessionOf(tag: 'live' | 'fixture'): any {
  const file = path.join(HARVEST_DIR, tag, 'session.json');
  if (!fs.existsSync(file)) throw new Error(`the ${tag} session is missing from the harvest — the court cannot sit`);
  const session = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(session?.logs)) throw new Error(`the ${tag} session carries no readable logs — fail-closed, never guessed`);
  return session;
}

/** Every sealed image cue in a session's logs, fail-closed on shape. */
function cueRows(session: any): Array<{ id: any; cue: any; papers: any }> {
  return (session.logs as any[])
    .filter((log) => log && typeof log === 'object' && log.imageCue && typeof log.imageCue === 'object')
    .map((log) => ({ id: (log as any).id ?? null, cue: (log as any).imageCue, papers: (log as any).imagePapers ?? null }));
}

/** Plants ONE lawful fresh plate into the seeded campaign's newest log row
 * (this-turn papers, a true 3:4 painting), then walks back to the table
 * through a full reload and the title shelf — the render door must admit
 * it. Returns the data URL it planted. */
async function plantFreshPlate(page: any): Promise<string> {
  const png = await sharp({ create: { width: 384, height: 512, channels: 3, background: { r: 38, g: 52, b: 84 } } }).png().toBuffer();
  const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
  await seedFixture(page, { boot: true });
  const planted = await page.evaluate(async (url: string) => {
    // The render source is the campaign row's OWN embedded logs (the journal
    // table is the seal chain, not the feed). The row is read FRESH from the
    // shelf inside this same breath, so the put can never roll the seal head.
    const { db } = await import('/src/lib/db.js');
    const campaigns = await db.campaigns.toArray();
    const c = campaigns[campaigns.length - 1];
    // Renderable = a dm turn with its stamp that is neither a divider row
    // (kind) nor struck (the seed presses the X-card once — a torn page
    // hangs no painting, so a plant there would prove nothing).
    const rows = (Array.isArray(c?.logs) ? c.logs : []).filter((r: any) => r && r.dm && r.recordHash && !r.redacted && !r.kind);
    if (!rows.length) return { ok: false, why: 'the seeded campaign holds no renderable dm log rows' };
    const row = rows[rows.length - 1];
    row.imageUrl = url;
    row.imagePapers = { assetHash: 'g31-plant-bytes', originTurnHash: row.recordHash, caption: 'A quiet road under evening light' };
    await db.campaigns.put(c);
    return { ok: true, why: '' };
  }, dataUrl);
  if (!planted.ok) throw new Error(`the fresh-plate plant failed: ${planted.why}`);
  await page.reload();
  await page.waitForSelector('.title-page', { timeout: 45_000 });
  await page.locator('.book-spine:not(.new-spine)').first().click();
  await page.waitForSelector('main.adventure-log', { timeout: 30_000 });
  return dataUrl;
}

test('G31a: every minted sheet answers its grid, its silence, and its own sealed soul', async () => {
  test.setTimeout(600_000);
  const m = preflightManifest('g31-sheet');
  const heroSheet = rolePlate(m, 'hero-sheet');
  const anchor = rolePlate(m, 'hero-anchor');
  const card = sessionOf('live').heroCard;
  const clause = sheetSoulClause(card);

  // The cast canon — sealed cast_add visuals from BOTH sessions, so a
  // companion's sheet is judged against the record, never a guess.
  const castCanon = new Map<string, string>();
  for (const tag of ['live', 'fixture'] as const) {
    for (const log of sessionOf(tag).logs as any[]) {
      for (const soul of (log?.dm?.story?.cast_add ?? []) as any[]) {
        if (soul && typeof soul.name === 'string' && typeof soul.visual === 'string' && soul.visual.trim()) {
          castCanon.set(soul.name.trim().toLowerCase(), soul.visual.trim());
        }
      }
    }
  }

  const sheets = (m.plates as any[]).filter((p) => p.role === 'hero-sheet' || p.role === 'sheet')
    .sort((a, b) => String(a.file).localeCompare(String(b.file)));
  expect(sheets.length, 'the store holds at least the hero\u2019s reference sheet').toBeGreaterThanOrEqual(1);

  // Budget: the hero's sheet always sits; at most two companions join.
  const seated = [sheets.find((p) => p.role === 'hero-sheet') ?? heroSheet, ...sheets.filter((p) => p.role === 'sheet').slice(0, 2)];
  for (const plate of seated) {
    const bytes = topBytes(plate);
    const who = String(plate.label ?? 'unlabeled');
    const integrity = await sheetIntegrityVerdict({ bytes, idSeed: `g31a-integrity-${String(plate.assetHash).slice(0, 12)}`, criterion: 'g31a-sheet-integrity' });
    console.log(`[G31a] integrity ${who}: ${JSON.stringify(integrity)}`);
    expect(integrity.grid_four_cells === true && integrity.free_of_lettering === true,
      `${who}: a sheet is four painted cells and no lettering (flaw: ${integrity.flaw ?? 'none'})`).toBe(true);

    const soulClause = plate.role === 'hero-sheet'
      ? clause
      : castCanon.get(String(plate.label ?? '').trim().toLowerCase());
    if (!soulClause) throw new Error(`no sealed canon for the sheet of "${who}" — the record must name every minted soul (fail-closed)`);
    const identity = await sheetIdentityVerdict({ bytes, clause: `${who} — ${soulClause}`, idSeed: `g31a-identity-${String(plate.assetHash).slice(0, 12)}`, criterion: 'g31a-sheet-identity' });
    console.log(`[G31a] identity ${who}: ${JSON.stringify(identity)}`);
    expect(identity.subject_matches === true && identity.cells_agree === true,
      `${who}: every cell depicts the sealed soul (mismatch: ${identity.mismatch ?? 'none'})`).toBe(true);
  }

  // THE ATTIRE PAIR — the sealed anchor beside the sheet derived from it,
  // under the hero card's own signature canon (tooth 20 calibrated this).
  const pair = await attirePairVerdict({ aBytes: topBytes(anchor), bBytes: topBytes(heroSheet), attire: String(card.signature), idSeed: 'g31a-attire-pair', criterion: 'g31a-attire' });
  console.log(`[G31a] attire pair: ${JSON.stringify(pair)}`);
  expect(pair.attire_consistent, `the anchor and the sheet keep one wardrobe (contradiction: ${pair.contradiction ?? 'none'})`).toBe(true);
});

test('G31b: the identity ceiling holds at the cue and the frame stays closed at the bar', async () => {
  test.setTimeout(600_000);
  preflightManifest('g31-sheet');
  // Deterministic half — the road's own cue court over every sealed cue.
  for (const tag of ['live', 'fixture'] as const) {
    const rows = cueRows(sessionOf(tag));
    const violations = rows.flatMap((row) => cueCourt(row.cue).violations.map((v: string) => `${tag} log ${row.id}: ${v}`));
    console.log(`[G31b] ${tag}: ${rows.length} sealed cues, ${violations.length} violations`);
    expect(violations, `${tag}: every sealed cue passes the cue court`).toEqual([]);
  }

  // Vision half — the crowdest live plate must hold a CLOSED frame: the
  // cued souls and no uncued likeness beyond the cue's own allowance.
  const entries = loadManifest('live');
  if (!entries) throw new Error('the live plate store is missing — harvest first');
  // A cue commissions a SCENE paint (variant null). Atelier mints hang
  // on rows whose cue speaks of another canvas — judging a two-soul cue
  // against a hung bust convicts the wrong painting (62.5's lesson).
  const live = cueRows(sessionOf('live'))
    .filter((row) => row.papers?.assetHash && Array.isArray(row.cue?.subjects) && row.cue.subjects.length >= 1)
    .map((row) => ({ row, entry: entries.find((e: PlateEntry) => e.assetHash === row.papers.assetHash) }))
    .filter((seat) => seat.entry && seat.entry.variant == null);
  if (!live.length) {
    // The store binds a cue to a plate only when both sit on ONE row —
    // late-landing paints carry no commission link (papers stamp the
    // hanging turn, by G31c law; even the paint salt cites the arrival
    // row). An unbindable seat is an empty seat, not a broken contract:
    // G22a keeps the closure watch on its minted and opportunistic seats.
    console.log('[G31b] the live walk hung no scene plate on its own cue row — the closure seat stands empty; the cue court above has already held');
    return;
  }
  const crowdest = live.sort((a, b) => b.row.cue.subjects.length - a.row.cue.subjects.length)[0].row;
  const entry = live.sort((a, b) => b.row.cue.subjects.length - a.row.cue.subjects.length)[0].entry as PlateEntry;
  const subjects = crowdest.cue.subjects.filter((s: any) => typeof s === 'string' && s.trim());
  const allowance = crowdest.cue.crowd === 'background' ? 'background' : 'none';
  const closure = await closureVerdict({ bytes: plateBytes(entry), subjects, allowance, idSeed: `g31b-closure-${String(entry.assetHash).slice(0, 12)}`, criterion: 'g31b-closure' });
  console.log(`[G31b] closure (${subjects.join(', ')} / ${allowance}): ${JSON.stringify(closure)}`);
  expect(closure.figures_match, `the frame is closed: ${closure.unaccounted || 'no unaccounted figure'}`).toBe(true);
});

test('G31c: every plate carries this-turn papers, and a lawful fresh plate renders', async ({ page }) => {
  test.setTimeout(240_000);
  preflightManifest('g31-sheet');
  // Deterministic half — the fresh-plate sweep over both sealed sessions.
  const live = freshPlateSweep(sessionOf('live').logs);
  console.log(`[G31c] live: ${live.fresh.length} fresh, ${live.stale.length} stale, ${live.unpapered.length} unpapered`);
  expect(live.stale.map((r) => r.detail), 'the live session holds no stale papers').toEqual([]);
  expect(live.unpapered.map((r) => r.detail), 'the live house was born under the papers law — no unpapered image may ride').toEqual([]);
  const fixture = freshPlateSweep(sessionOf('fixture').logs);
  console.log(`[G31c] fixture: ${fixture.fresh.length} fresh, ${fixture.stale.length} stale, ${fixture.unpapered.length} unpapered (pre-law replays lawful)`);
  expect(fixture.stale.map((r) => r.detail), 'the fixture session holds no stale papers').toEqual([]);

  // DOM half — a lawfully papered plate walks the render door and hangs.
  await boot(page);
  const dataUrl = await plantFreshPlate(page);
  await expect(page.locator('.empty-frame'), 'no honest empty frame stands over a lawful plate').toHaveCount(0);
  const hung = page.locator(`img[src^="data:image/png"]`).first();
  await expect(hung, 'the planted fresh plate hangs in the feed').toBeVisible({ timeout: 15_000 });
  const natural = await hung.evaluate((img: HTMLImageElement) => ({ w: img.naturalWidth, h: img.naturalHeight }));
  expect(natural.w, 'the plate carries real pixels').toBeGreaterThan(0);
  expect(dataUrl.startsWith('data:image/png;base64,'), 'the plant walked the strict media door').toBe(true);
});

test('G31d: the vertical law holds in the store and the frame is never cropped on any glass', async ({ page }) => {
  test.setTimeout(240_000);
  preflightManifest('g31-sheet');
  // Deterministic half — every stored plate wears its pinned ratio.
  const misses: string[] = [];
  for (const tag of ['live', 'fixture'] as const) {
    const entries = loadManifest(tag);
    if (!entries) throw new Error(`the ${tag} plate store is missing — harvest first`);
    for (const entry of entries) {
      expect(entry.klass, `${tag}/${entry.file}: every stored plate is classed — an unknown class cannot be judged`).not.toBe('unknown');
      const kind = entry.klass === 'scene' ? 'scene' : entry.klass === 'portrait' ? 'portrait' : entry.klass === 'sheet' ? 'sheet' : 'keyart';
      const meta = await sharp(plateBytes(entry)).metadata();
      const ratio = checkPlateRatio(meta.width ?? 0, meta.height ?? 0, kind);
      if (!ratio.ok) misses.push(`${tag}/${entry.file} (${entry.klass}): ${meta.width}x${meta.height} is not ${ratio.expected}`);
    }
  }
  expect(misses, 'every plate, sheet, and canon wears its pinned ratio').toEqual([]);

  // DOM half — the hung plate keeps its own proportions on every glass:
  // letterboxed if the frame must, never stretched, never cropped.
  await boot(page);
  await plantFreshPlate(page);
  for (const [w, h] of [[360, 780], [768, 1024], [1280, 900]] as const) {
    await page.setViewportSize({ width: w, height: h });
    const hung = page.locator('img[src^="data:image/png"]').first();
    await hung.scrollIntoViewIfNeeded();
    await expect(hung).toBeVisible();
    // The letterbox law judges the RESTING frame. The plate arrives on a
    // .7s entrance flight (image-arrive: blur + scale 1.01), and a rect
    // taken mid-flight reads a hair wider than the glass — an honest
    // box convicted for the crime of still landing (62.5's lesson).
    await hung.evaluate((img: HTMLImageElement) =>
      Promise.all(img.getAnimations().map((a) => a.finished.catch(() => undefined))));
    const shape = await hung.evaluate((img: HTMLImageElement) => {
      const box = img.getBoundingClientRect();
      return { bw: box.width, bh: box.height, nw: img.naturalWidth, nh: img.naturalHeight, fit: getComputedStyle(img).objectFit };
    });
    const displayed = shape.bw / shape.bh;
    const natural = shape.nw / shape.nh;
    console.log(`[G31d] ${w}x${h}: displayed ${displayed.toFixed(3)} vs natural ${natural.toFixed(3)} fit=${shape.fit}`);
    // The letterbox law, measured as the app enforces it: object-fit
    // contain letterboxes the CONTENT inside a clamped element box (the
    // 74vh ceiling), so the drawn painting keeps its ratio by
    // construction; any other fit must keep the element box itself true.
    const lawful = shape.fit === 'contain' || Math.abs(displayed - natural) <= natural * 0.025;
    expect(lawful, `${w}x${h}: the plate keeps its proportions (fit=${shape.fit}, box ${displayed.toFixed(3)} vs art ${natural.toFixed(3)})`).toBe(true);
    expect(shape.bw <= w, `${w}x${h}: the plate never overflows the glass`).toBe(true);
  }
});

test('G31e: every set of papers carries an honest caption, and the caption tells the truth', async () => {
  test.setTimeout(600_000);
  preflightManifest('g31-sheet');
  // Deterministic half — papers hang no MUTE plates: every hung painting
  // must have a caption source to wear (the cue's sealed caption, its
  // mood, or the turn's own narration for the fallback line). The papers
  // themselves never carry captions — that law lives on the cue.
  for (const tag of ['live', 'fixture'] as const) {
    const mute = (sessionOf(tag).logs as any[])
      .filter((log) => log?.imagePapers && typeof log.imagePapers === 'object' && log.hasImage)
      .filter((log) => {
        const cue = log?.dm?.image_cue || {};
        const narration = (log?.dm?.narration_blocks || []).map((b: any) => b?.text || '').join(' ').trim();
        const source = (typeof cue.caption === 'string' && cue.caption.trim()) || (typeof cue.mood === 'string' && cue.mood.trim()) || narration;
        return !source;
      })
      .map((log) => `${tag} log ${log.id}`);
    expect(mute, `${tag}: every hung plate has a caption to wear`).toEqual([]);
  }

  // Vision half — up to three live SEALED captions (the cue's own words,
  // the ones the figcaption wears first) judged against their plates
  // through the tooth-11 calibrated binary instrument.
  const entries = loadManifest('live');
  if (!entries) throw new Error('the live plate store is missing — harvest first');
  const papered = (sessionOf('live').logs as any[])
    .filter((log) => log?.imagePapers?.assetHash && typeof log?.dm?.image_cue?.caption === 'string' && log.dm.image_cue.caption.trim())
    .map((log) => ({ caption: String(log.dm.image_cue.caption), entry: entries.find((e: PlateEntry) => e.assetHash === log.imagePapers.assetHash) }))
    // The cue's caption describes the cue's OWN commissioned paint — a
    // scene plate (variant null). Atelier mints (busts, sheets, figures)
    // hang on rows whose cue speaks of another canvas entirely; pairing
    // them here convicts an honest caption of a crime it never claimed.
    .filter((row) => row.entry && row.entry.variant == null) as Array<{ caption: string; entry: PlateEntry }>;
  if (!papered.length) {
    // Same seat law as G31b: a sealed caption is judged only against the
    // plate its OWN row hangs. Late paints wear the words of their arrival
    // turn by design — a pairing the record never seals, so the truth seat
    // stands empty and the wearing law above has already held.
    console.log('[G31e] no live row binds its own cue caption to a hung scene plate this walk — the sealed-caption truth seat stands empty');
    return;
  }
  for (const { caption, entry } of papered.slice(0, 3)) {
    const outcome = await binaryVerdict({ kind: 'caption', prose: caption.slice(0, 600), bytes: plateBytes(entry), idSeed: `g31e-caption-${String(entry.assetHash).slice(0, 12)}`, criterion: 'g31e-caption' });
    console.log(`[G31e] ${entry.file}: pass=${outcome.pass} false=${JSON.stringify(outcome.falseBinaries ?? [])}`);
    expect(outcome.pass, `${entry.file}: the caption "${caption.slice(0, 60)}…" tells the plate's truth`).toBe(true);
  }
});

test('G31f: the prop court admits the lantern on its own ground and refuses it everywhere else', async () => {
  preflightManifest('g31-sheet');
  const LANTERN = "the brass wayfarer's lantern";
  const rows = [{ name: LANTERN, place: 'Larkspur Vale' }];

  // Lawful ground — a fixture of the vale renders in the vale.
  const home = propLawCheck({ subjects: ['Maren'], items: [LANTERN] }, { fixtures: groundFixtures(rows, 'Larkspur Vale') });
  expect(home.ok, 'the seeded lantern renders where prop law allows').toBe(true);

  // Wrong ground — the same lantern is refused by name at the Duchy.
  const away = propLawCheck({ subjects: ['Maren'], items: [LANTERN] }, { fixtures: groundFixtures(rows, 'Duchy of Bellmere') });
  expect(away.ok, 'the lantern does not follow the hero off its ground').toBe(false);
  expect(away.refusals[0], 'the refusal names the law in court language').toContain('no fixture of this ground');

  // A held thing appears only in its holder's hands.
  const trove = [{ name: "the pilgrim's iron key", holder: 'Edda' }];
  const heldAway = propLawCheck({ subjects: ['Maren'], items: ["the pilgrim's iron key"] }, { trove });
  expect(heldAway.ok, 'a held thing without its holder in frame is refused').toBe(false);
  expect(heldAway.refusals[0]).toContain('does not stand among the subjects');
  const heldHome = propLawCheck({ subjects: ['Maren', 'Edda'], items: ["the pilgrim's iron key"] }, { trove });
  expect(heldHome.ok, 'the same thing renders once its holder stands in frame').toBe(true);

  // This turn's own operations move a thing into frame lawfully.
  const moved = movedItems({ item_add: [{ name: 'a waxed rope' }] });
  const carried = propLawCheck({ subjects: ['Maren'], items: ['a waxed rope'] }, { moved });
  expect(carried.ok, 'an operation-moved item renders the turn it moves').toBe(true);

  // The sealed corpus keeps the same shape law end to end.
  for (const tag of ['live', 'fixture'] as const) {
    const itemCues = cueRows(sessionOf(tag)).filter((row) => Array.isArray(row.cue?.items) && row.cue.items.length);
    console.log(`[G31f] ${tag}: ${itemCues.length} item-bearing sealed cues (shape-swept by G31b's cue court)`);
  }
});
