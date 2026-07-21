import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { seedFixture, readCampaign, openChapter } from './lib/harness';
// @ts-ignore — the engine is plain ESM; the spec reads the same ledger the app reads.
import { openThreadsOf } from 'fatescript/threads';

// ------------------------------------------------------------
// G35 — THE SAGA COURT (Directive XIX, Articles I–III).
// The compass unbinds, the ledger never does: a sealed tale closes a
// volume, never a world. This court walks the whole road at the app's
// own doors, KEYLESS on the rig (the mock tier is sovereign): the
// sealed seed forges its successor through the story smith's floor,
// the Book carries the world forward cited, the desk walks both
// volumes and their linkage, the heir rises after a seeded fall, and
// the sealed first volume stands untouched beside its successor.
// ------------------------------------------------------------

const EXPORT_DIR = path.join(process.cwd(), 'test-results', 'g35-exports');

/** Reads journal rows WHOLE (the round-trip rider): a verbatim JSON
 * round-trip, never a field-by-field rebuild that drops new blocks. */
async function journalRows(page: Page, id: string): Promise<any[]> {
  return page.evaluate(async (campaignId: string) => {
    const { campaignJournal } = await import('/src/lib/db.js');
    return JSON.parse(JSON.stringify(await campaignJournal(campaignId)));
  }, id);
}

/** Seeds the SEALED fixture and walks the volume door: ceremony →
 * (optional) smith ask → "A winter passes" → the successor seats and its
 * genesis first word lands through the keyless mock pour. */
async function forgeSecondVolume(page: Page, { smith }: { smith: boolean }) {
  await seedFixture(page, { sealed: true });
  const elder = await page.evaluate(async () => {
    const { db } = await import('/src/lib/db.js');
    const all = await db.campaigns.toArray();
    const row = all[all.length - 1];
    return JSON.parse(JSON.stringify({ id: row.id, title: row.title, headHash: row.headHash, spineId: row.spineId, sealedAt: row.sealedAt || null, turnCount: row.turnCount, signatureStatus: row.signatureStatus }));
  });
  expect(elder.sealedAt, 'the seeded volume stands sealed').toBeTruthy();
  expect(elder.headHash, 'the sealed volume wears a real head seal').toMatch(/^[0-9a-f]{64}$/);

  // The consequence that seeds the continuation, read from the elder's own
  // replayed ledger — the court hardcodes nothing the record can say.
  const elderCampaign = await readCampaign(page, elder.id);
  const elderOpen = openThreadsOf(elderCampaign);
  expect(elderOpen.length, 'the elder tale left at least one thread unpaid — the seed of continuation').toBeGreaterThan(0);
  const elderJournalCount = (await journalRows(page, elder.id)).length;

  await page.locator('button', { hasText: /keepsake/i }).first().click();
  await page.waitForSelector('.keepsakes.next-volume', { timeout: 15_000 });
  const ask = page.locator('.smith-forge-ask input');
  if (smith) await ask.check();
  else await expect(ask, 'the smith mark is an ask, never a demand — unchecked, the shelf stands').not.toBeChecked();
  await page.locator('button', { hasText: 'A winter passes' }).click();

  // The successor seats and its FIRST WORD lands (pours dispatch before any
  // paint; the mock DM answers keyless). The court waits on the record.
  const handle = await page.waitForFunction(async (elderId: string) => {
    const { db } = await import('/src/lib/db.js');
    const all = await db.campaigns.toArray();
    const next = all.find((c: any) => c.id !== elderId && c.saga && Array.isArray(c.saga.volumes) && c.saga.volumes.length > 0 && !c.sealedAt);
    if (!next) return null;
    const worded = (Array.isArray(next.logs) ? next.logs : []).some((l: any) => l && l.dm && l.recordHash && !l.kind);
    return worded ? next.id : null;
  }, elder.id, { timeout: 120_000, polling: 1_000 });
  const vol2Id = (await handle.jsonValue()) as string;
  expect(vol2Id, 'the next volume stands with its first word sealed').toBeTruthy();
  await page.waitForSelector('main.adventure-log', { timeout: 30_000 });
  return { elder, elderOpen, elderJournalCount, vol2Id };
}

/** Seals the CURRENT volume through the same wax the first one wore. */
async function sealCurrentVolume(page: Page) {
  await page.locator('button', { hasText: /keepsake/i }).first().click();
  const press = page.locator('.press-seal');
  await press.waitFor({ timeout: 15_000 });
  await press.click();
  await page.waitForSelector('.keepsakes.next-volume', { timeout: 60_000 });
}

test('G35a the volume door: the sealed tale forges its successor through the mock smith — minted, cited, carried', async ({ page }) => {
  test.setTimeout(240_000);
  const { elder, elderOpen, vol2Id } = await forgeSecondVolume(page, { smith: true });
  const vol2 = await readCampaign(page, vol2Id);

  // THE MINT (Article I) — one attestation, sealed on the record. The rig
  // is keyless and proving, so the smith's ask floors to the MOCK smith
  // (deterministic in seed, covenant, carryover) — never the shelf echo,
  // never a silent key-shaped skip.
  expect(vol2.spineMint, 'the volume mint rides the record').toBeTruthy();
  expect(vol2.spineMint.source, 'the bespoke arc came through the mock smith — the keyless floor').toBe('mock');
  expect(vol2.spineMint.spine?.id, 'the minted spine IS the seated spine').toBe(vol2.spineId);
  expect(vol2.spineId, 'the bespoke spine is its own arc, not the elder\u2019s echo').not.toBe(elder.spineId);
  const beats = vol2.spineMint.spine?.beats || [];
  expect(beats.length, 'a lawful bespoke arc: twelve to fifteen beats').toBeGreaterThanOrEqual(12);
  expect(beats.length, 'a lawful bespoke arc: twelve to fifteen beats').toBeLessThanOrEqual(15);

  // THE SAGA SEAT (Article II) — the manifest names the elder by head seal.
  expect(vol2.title, 'the successor is named as the world\u2019s second volume').toBe(`${elder.title} — Volume II`);
  expect(vol2.saga?.taleIndex, 'the successor knows its seat in the saga').toBe(1);
  expect(vol2.saga?.volumes?.length, 'the manifest binds exactly the one prior volume').toBe(1);
  expect(vol2.saga.volumes[0].index).toBe(0);
  expect(vol2.saga.volumes[0].title).toBe(elder.title);
  expect(vol2.saga.volumes[0].headHash, 'the manifest binds the elder head seal byte-for-byte').toBe(elder.headHash);

  // THE GENESIS (Article II) — the volume's FIRST word cites the prior head.
  const rows = await journalRows(page, vol2Id);
  const genesis = rows[0];
  expect(genesis?.type, 'the genesis is the first word of the volume').toBe('genesis');
  expect(genesis.i, 'the citation seat is index zero — nothing stands before it').toBe(0);
  expect(genesis.payload?.priorVolume?.headHash, 'the genesis cites the elder head seal by hash').toBe(elder.headHash);
  expect(genesis.payload?.priorVolume?.campaignId, 'the genesis names the elder spine itself').toBe(elder.id);
  expect(genesis.payload?.manifest?.volumes?.[0]?.headHash, 'the sealed manifest carries the same citation').toBe(elder.headHash);

  // THE CARRYOVER (Article II) — forged from what the last one left unpaid:
  // every elder open thread crosses whole, cited to its origin.
  const vol2Threads = Array.isArray(vol2.codex?.threads) ? vol2.codex.threads : [];
  for (const owed of elderOpen) {
    const crossed = vol2Threads.find((t: any) => String(t?.label || '').trim().toLowerCase() === String(owed.label).trim().toLowerCase());
    expect(crossed, `the unpaid thread crosses the volume door: ${owed.label}`).toBeTruthy();
    expect(crossed.carried, `the carried row keeps its origin citation: ${owed.label}`).toBeTruthy();
  }

  // THE ELDER STANDS UNTOUCHED — same head, same seal, same count.
  const elderAfter = await page.evaluate(async (id: string) => {
    const { db } = await import('/src/lib/db.js');
    const row = await db.campaigns.get(id);
    return JSON.parse(JSON.stringify({ headHash: row.headHash, sealedAt: row.sealedAt || null, turnCount: row.turnCount }));
  }, elder.id);
  expect(elderAfter.headHash, 'the elder head seal did not move').toBe(elder.headHash);
  expect(elderAfter.sealedAt, 'the elder wax stands').toBeTruthy();
  expect(elderAfter.turnCount, 'the elder chain grew by nothing').toBe(elder.turnCount);
  console.log(`[g35a] Volume II minted (source=${vol2.spineMint.source}, spine=${vol2.spineId}); genesis cites ${String(elder.headHash).slice(0, 12)}…; ${elderOpen.length} thread(s) crossed carried`);
});

test('G35b the Book carries the world forward — the carried weather renders its citation', async ({ page }) => {
  test.setTimeout(240_000);
  // The shelf door this time: the carryover law does not depend on the smith.
  const { elderOpen } = await forgeSecondVolume(page, { smith: false });

  // The carried thread arrived through the sealed packet, not a journal turn
  // of THIS volume — the pure replay cannot see it, so the Debts chapter
  // renders it from the reducer's own testimony, cited to its origin volume
  // (the fall-note pattern, Directive X).
  await openChapter(page, 'debts');
  const carriedRow = page.locator('.thread-row.carried-weather', { hasText: elderOpen[0].label }).first();
  await expect(carriedRow, 'the unpaid thread stands in the new volume\u2019s Book').toBeVisible({ timeout: 15_000 });
  await expect(carriedRow.locator('small'), 'the carried row speaks its citation aloud').toContainText('carried from Volume');
  console.log(`[g35b] the Book cites the crossing: "${elderOpen[0].label}" rides carried into Volume II`);
});

test('G35c the desk walks the whole saga: both volumes verify and the linkage holds', async ({ page }) => {
  test.setTimeout(240_000);
  const { elder, vol2Id } = await forgeSecondVolume(page, { smith: false });
  await sealCurrentVolume(page);

  // The desk's saga walk, over the app's OWN bytes: both chronicles through
  // the export door, the manifest grown from the genesis row's sealed
  // manifest by exactly the newly sealed volume's seat — never hand-invented.
  const out = await page.evaluate(async ({ elderId, vol2 }: { elderId: string; vol2: string }) => {
    const { exportChronicle, verifySaga } = await import('/src/lib/seal.js');
    const { db, campaignJournal } = await import('/src/lib/db.js');
    const row = await db.campaigns.get(vol2);
    const genesis = (await campaignJournal(vol2)).find((r: any) => r.type === 'genesis');
    const manifest = { ...genesis.payload.manifest, volumes: [...genesis.payload.manifest.volumes, { index: row.saga.taleIndex, title: row.title, headHash: row.headHash }] };
    const chronicles = [await exportChronicle(elderId), await exportChronicle(vol2)];
    return JSON.parse(JSON.stringify({ verdict: await verifySaga({ manifest, chronicles }), sealedHead: row.headHash }));
  }, { elderId: elder.id, vol2: vol2Id });

  expect(out.sealedHead, 'the second volume sealed with its own head').toMatch(/^[0-9a-f]{64}$/);
  expect(out.verdict.ok, `the desk walks the saga green: ${out.verdict.reason || 'ok'}`).toBe(true);
  expect(out.verdict.volumes.length, 'both volumes seated at the desk').toBe(2);
  expect(out.verdict.volumes.every((v: any) => v.ok), 'every volume verified, every citation walked').toBe(true);
  console.log(`[g35c] verifySaga green across 2 volumes; Volume II's genesis cites ${String(elder.headHash).slice(0, 12)}… and the chain holds`);
});

test('G35d the heir rises mid-world: the memorial is permanent, the debts inherit, the record holds', async ({ page }) => {
  test.setTimeout(240_000);
  const campaignId = await seedFixture(page);
  const before = await readCampaign(page, campaignId);
  const fallen = before.hero.name;
  const regionsBefore = (before.codex?.regions || []).length;
  const openBefore = openThreadsOf(before);
  expect(openBefore.length, 'the tale owes at least one open thread before the fall').toBeGreaterThan(0);

  // THE SEEDED FALL — the shelf row wears the doom exactly as the doom law
  // leaves it: dead, zeroed, three failures. (The fall's own sealing is the
  // doom court's law; this court judges what rises AFTER a fall stands.)
  await page.evaluate(async (id: string) => {
    const { db } = await import('/src/lib/db.js');
    const row = await db.campaigns.get(id);
    row.hero = { ...row.hero, dead: true, hp: 0, deathSaves: { successes: 0, failures: 3 } };
    await db.campaigns.put(row);
  }, campaignId);
  await page.reload();
  await page.waitForSelector('.title-page', { timeout: 45_000 });
  await page.locator('.book-spine:not(.new-spine)').first().click();

  // The epitaph offers the succession; the standing forge opens mid-tale
  // (the Two Hands whole — Article III).
  const rise = page.locator('.heir-rise');
  await expect(rise, 'the dead hero\u2019s table offers the heir door').toBeVisible({ timeout: 30_000 });
  await rise.click();
  await page.waitForSelector('.audition-chip', { timeout: 30_000 });
  await page.locator('.audition-chip').first().click();
  await page.locator('button', { hasText: 'Begin the chronicle' }).click();
  await page.waitForFunction(async (id: string) => {
    const { db } = await import('/src/lib/db.js');
    const row = await db.campaigns.get(id);
    return !!(row && row.hero && !row.hero.dead);
  }, campaignId, { timeout: 30_000, polling: 500 });

  const after = await readCampaign(page, campaignId);
  expect(after.hero.name, 'a new hand holds the road').not.toBe(fallen);
  expect((after.codex?.regions || []).length, 'the world record continues untouched').toBe(regionsBefore);

  // THE MEMORIAL (Article III) — permanent, in the cast fold's own words.
  const memorial = (after.codex?.cast || []).find((soul: any) => soul?.name === fallen);
  expect(memorial, 'the fallen keep their place in the cast').toBeTruthy();
  expect(memorial.status, 'the grave law stands').toBe('dead');
  expect(memorial.memorial, 'the memorial mark is sealed').toBe(true);
  expect(memorial.role, 'the fallen are named hero of this tale').toBe('hero of this tale');

  // THE INHERITED WEATHER — open threads remain open, cited to the fall.
  const threads = Array.isArray(after.codex?.threads) ? after.codex.threads : [];
  for (const owed of openBefore) {
    const inherited = threads.find((t: any) => String(t?.label || '').trim().toLowerCase() === String(owed.label).trim().toLowerCase());
    expect(inherited?.inherited, `the debt inherits open: ${owed.label}`).toBeTruthy();
    expect(inherited.inherited.from, 'the inheritance cites the fallen by name').toBe(fallen);
    expect(inherited.inherited.reason, 'the inheritance cites the fall itself').toBe('fell');
  }

  // THE SUCCESSION ROW — append-only, in the chain's own ink.
  const rows = await journalRows(page, campaignId);
  const succession = rows.find((row: any) => row.type === 'succession');
  expect(succession, 'the succession seals as record').toBeTruthy();
  expect(succession.payload?.fallen?.name, 'the row names the fallen').toBe(fallen);
  expect(succession.payload?.heir?.name, 'the row names the heir').toBe(after.hero.name);
  expect(succession.payload?.reason, 'the row names the reason').toBe('fell');

  // THE BOOK SPEAKS — the memorial card and the inherited citation render.
  await openChapter(page, 'people');
  await expect(page.locator('.soul-card.memorial', { hasText: fallen }).first(), 'the memorial card hangs in the People chapter').toBeVisible({ timeout: 15_000 });
  await openChapter(page, 'debts');
  await expect(page.locator('.thread-carried', { hasText: `inherited from ${fallen}` }).first(), 'the Debts chapter cites the inheritance').toBeVisible({ timeout: 15_000 });
  console.log(`[g35d] ${fallen} fell; ${after.hero.name} rose; ${openBefore.length} debt(s) inherited cited; the memorial is permanent`);
});

test('G35e the sealed first volume still exports, verifies, and stands untouched', async ({ page }) => {
  test.setTimeout(240_000);
  const { elder, elderJournalCount } = await forgeSecondVolume(page, { smith: false });

  // Back to the shelf; open the ELDER volume, never the successor.
  await page.reload();
  await page.waitForSelector('.title-page', { timeout: 45_000 });
  const elderSpine = page.locator('.book-spine:not(.new-spine)', { hasText: elder.title }).filter({ hasNotText: '— Volume' });
  await expect(elderSpine.first(), 'the elder spine stands on the shelf beside its successor').toBeVisible({ timeout: 15_000 });
  await elderSpine.first().click();
  await page.waitForSelector('main.adventure-log', { timeout: 30_000 });

  // The ceremony still serves the sealed tale — and the road door stands
  // open again: sealing closed a volume, never the world.
  await page.locator('button', { hasText: /keepsake/i }).first().click();
  await page.waitForSelector('.keepsakes', { timeout: 15_000 });
  await expect(page.locator('.keepsakes.next-volume'), 'the road door still stands — the world is unbound').toBeVisible();

  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60_000 }),
    page.locator('button', { hasText: /export/i }).first().click()
  ]);
  const exportPath = path.join(EXPORT_DIR, `g35e-elder-${Date.now()}.json`);
  await download.saveAs(exportPath);
  const exported = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  expect(exported.header?.headHash, 'the exported head seal is byte-stable across the forge').toBe(elder.headHash);
  expect(exported.header?.signatureStatus, 'the signature posture did not move').toBe(elder.signatureStatus);
  expect((exported.journal || []).length, 'the chain grew by nothing').toBe(elderJournalCount);

  // The desk re-proves the export whole — the same eye every reader gets.
  // (The commons walk itself is G29's court on its own housed ledger; a
  // keyless table keeps the commons byte-quiet by law. What THIS court pins
  // is the publish contract's preconditions, byte-stable: sealed, head
  // sealed, signature posture unmoved.)
  const verdict = await page.evaluate(async (data: any) => {
    const { verifyChronicle } = await import('/src/lib/seal.js');
    return JSON.parse(JSON.stringify(await verifyChronicle(data)));
  }, exported);
  expect(verdict.ok, `the exported chronicle verifies: ${verdict.reason || 'ok'}`).toBe(true);
  console.log(`[g35e] elder exports (${(exported.journal || []).length} rows), verifies, head ${String(elder.headHash).slice(0, 12)}… untouched; the road door stands`);
});
