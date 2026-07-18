import { FrameLocator, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GAME_ROOT } from './vision';

// ------------------------------------------------------------
// THE PROVING HARNESS — boot, seed, read the database through the
// app's own modules, drive the paint pipe through the app's own
// foundry, and harvest plates to disk once so every later iteration
// (and every judge call) reuses the same bytes (§6.4).
// ------------------------------------------------------------

export const FIXTURE_PATH = path.join(GAME_ROOT, 'tests', 'e2e', 'fixtures', 'proving-campaign.json');
// (Task 57) THE DOOM FIXTURE — a second, smaller campaign whose record
// stages a standing battle, a sheeted party, one pre-sealed grave, and a
// companion dying at zero. Seeded through the same sanctioned hook; never
// harvested, never painted live.
export const DOOM_FIXTURE_PATH = path.join(GAME_ROOT, 'tests', 'e2e', 'fixtures', 'doom-session.json');
// (TASK 53, Move Three — logged) The plate store moved to the harvest
// project's own ground: ONE project mints every artifact here, and the
// judge courts read only this disk. The Task 52 store at
// test-results/vision/plates is left in place as that loop's evidence.
export const PLATES_DIR = path.join(GAME_ROOT, 'test-results', 'harvest');

export function fixture(): any {
  return JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
}

export function doomFixture(): any {
  return JSON.parse(fs.readFileSync(DOOM_FIXTURE_PATH, 'utf8'));
}

export interface BootOptions { proving?: boolean; skipArrival?: boolean; errors?: string[] }

export async function boot(page: Page, { proving = true, skipArrival = true, errors }: BootOptions = {}) {
  if (skipArrival) {
    await page.addInitScript(() => { try { sessionStorage.setItem('mdq:arrived', '1'); } catch { /* private mode */ } });
  }
  if (errors) {
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(String(error)));
  }
  await page.goto(proving ? '/?proving=1' : '/');
  await page.waitForSelector('.title-page', { timeout: 45_000 });
}

/** Seeds the fixture through the sanctioned hook and waits for the table. */
export async function seedFixture(page: Page, { sealed = false, boot: doBoot = true, source = null, mutate = null }: { sealed?: boolean; boot?: boolean; source?: any; mutate?: ((fx: any) => any) | null } = {}): Promise<string> {
  if (doBoot) await boot(page);
  // (Task 57) `source` seats a different fixture (default: the proving
  // campaign); `mutate` stages a lawful variant (G23c strips the wound and
  // seeds the standing ask). Every call reads fresh bytes from disk, so a
  // court's mutation can never leak into another court's seat.
  let data = { ...(source ?? fixture()), sealed };
  if (mutate) data = mutate(data) ?? data;
  const campaignId = await page.evaluate(async (fx) => (window as any).__mdqSeed(fx), data);
  await page.waitForSelector('main.adventure-log', { timeout: 30_000 });
  return campaignId as string;
}

// ---------- database readers (through the app's own modules) ----------

// (56.1 logged edit — Directive VII.14 THE ROUND-TRIP RIDER) The read-back
// mapper used to rebuild rows field-by-field, and twice a silently dropped
// key made a court judge a journal thinner than the real one (iteration-4:
// `kind`; 55.1: `dm.story`). The law is now structural: the row rides
// WHOLE — a verbatim spread — with derived conveniences layered BESIDE the
// record, never in place of it. Mapping happens node-side and is exported
// so G00-RT can prove the rider on a maximal row without a browser.
// Directive reading, logged as VII.14 asks: `scene_state` lives on the
// codex/state block, not on journal rows, so the rider governs rows and
// the state block is already carried whole by readCampaign.
export function mapLogRow(log: any): any {
  return {
    ...log,
    kind: log.kind ?? null,
    redacted: !!log.redacted,
    recordHash: log.recordHash ?? null,
    imageAssetHash: log.imageAssetHash ?? null,
    beatIndex: log.beatIndex ?? null,
    hasImage: !!log.imageUrl,
    narrations: (log.dm?.narration_blocks || []).map((block: any) => ({ speaker: block.speaker ?? null, text: block.text || '' })),
    suggestions: log.dm?.suggestions || null,
    timeAdvance: log.dm?.time_advance || null,
    // (56C) crowd rides the read-back — the closure court's allowance must
    // reach the manifest, or every granted crowd is judged as 'none'.
    imageCue: log.dm?.image_cue ? { subjects: log.dm.image_cue.subjects || [], region: log.dm.image_cue.region || null, crowd: log.dm.image_cue.crowd ?? null } : null
  };
}

export async function readCampaign(page: Page, campaignId: string): Promise<any> {
  const raw = await page.evaluate(async (id) => {
    const { db } = await import('/src/lib/db.js');
    const campaign = await db.campaigns.get(id);
    if (!campaign) return null;
    // (57.4 logged edit — Directive VII.14 THE ROUND-TRIP RIDER, campaign
    // block) The campaign read-back rebuilt the row field-by-field, and the
    // Battle Cut's new blocks (combat, pendingRoll) never crossed: G23a
    // judged a six-seat sealed order absent while the db row and the
    // rendered banner both held it — the reader was the blind one, third
    // time in this family (iteration-4 `kind`, 55.1 `dm.story`). The law
    // that already governs log rows governs the campaign row now: the row
    // rides WHOLE — a verbatim spread — with the derived normalizations
    // layered BESIDE the record, never in place of it. No assertion moved.
    return JSON.parse(JSON.stringify({
      ...campaign,
      sealedAt: campaign.sealedAt || null, completed: !!campaign.completed,
      logs: campaign.logs || [],
      keyArtHash: campaign.keyArtHash || null, heroBustHash: campaign.heroBustHash || null
    }));
  }, campaignId);
  if (!raw) return null;
  return { ...raw, logs: (raw.logs || []).map(mapLogRow) };
}

export async function readJournal(page: Page, campaignId: string): Promise<any[]> {
  return page.evaluate(async (id) => {
    const { campaignJournal } = await import('/src/lib/db.js');
    const rows = await campaignJournal(id);
    return rows.map((row: any) => ({ i: row.i, type: row.type, recordHash: row.recordHash, payloadKind: row.payload?.scope || null, originTurnHash: row.payload?.originTurnHash ?? null, payload: row.type === 'media_attestation' ? JSON.parse(JSON.stringify(row.payload || null)) : null }));
  }, campaignId);
}

export async function mediaIndex(page: Page, campaignId: string): Promise<any[]> {
  return page.evaluate(async (id) => {
    const { db } = await import('/src/lib/db.js');
    const rows = await db.media.where('campaignId').equals(id).toArray();
    return rows.map((row: any) => ({
      assetHash: row.assetHash ?? null, kind: row.kind, label: row.label ?? null, variant: row.variant ?? null,
      mime: row.mime ?? row.blob?.type ?? null, cacheKey: row.cacheKey ?? null,
      originTurnHash: row.originTurnHash ?? null, bytes: row.blob?.size ?? null
    }));
  }, campaignId);
}

export async function mediaBase64(page: Page, campaignId: string, assetHash: string): Promise<Buffer> {
  const b64 = await page.evaluate(async ({ id, hash }) => {
    const { db } = await import('/src/lib/db.js');
    const row = await db.media.get(hash);
    if (!row || row.campaignId !== id || !row.blob) return null;
    const buffer = await row.blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunk)));
    return btoa(binary);
  }, { id: campaignId, hash: assetHash });
  if (!b64) throw new Error(`media row ${assetHash} missing or blobless`);
  return Buffer.from(b64, 'base64');
}

// ---------- the plate store (§6.4 — paint once, reuse forever) ----------

export interface PlateEntry {
  file: string; kind: string; label: string | null; variant: string | null;
  mime: string; cacheKey: string | null; assetHash: string | null;
  klass: 'scene' | 'keyart' | 'region' | 'portrait' | 'unknown';
}

function classify(row: any): PlateEntry['klass'] {
  if (String(row.cacheKey || '').startsWith('scene:') || String(row.cacheKey || '').startsWith('proving-scene:')) return 'scene';
  if (row.label === 'keyart') return 'keyart';
  if (['bust', 'full-figure', 'dramatic'].includes(row.variant)) return 'portrait';
  if (row.label) return 'region';
  return 'unknown';
}

export function loadManifest(tag: string): PlateEntry[] | null {
  const file = path.join(PLATES_DIR, tag, 'manifest.json');
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

export function plateBytes(entry: PlateEntry): Buffer {
  return fs.readFileSync(path.join(PLATES_DIR, entry.file));
}

export function sessionInfo(tag: string): any | null {
  const file = path.join(PLATES_DIR, tag, 'session.json');
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

/** Pulls every painted plate for a campaign out of the database and onto
 * disk. FAILS LOUDLY on SVG bytes — the Watchtower degrades to the mock
 * painter silently, and a silent downgrade is an environment failure. */
export async function harvestPlates(page: Page, campaignId: string, tag: string): Promise<PlateEntry[]> {
  const rows = (await mediaIndex(page, campaignId)).filter((row) => row.kind === 'paint');
  const dir = path.join(PLATES_DIR, tag);
  fs.mkdirSync(dir, { recursive: true });
  const manifest: PlateEntry[] = [];
  for (const row of rows) {
    if (String(row.mime).includes('svg')) {
      throw new Error(`MOCK TRIPWIRE: plate ${row.label || row.cacheKey} is ${row.mime} — live paint silently downgraded (§0.5)`);
    }
    const bytes = await mediaBase64(page, campaignId, row.assetHash);
    const ext = String(row.mime).includes('png') ? 'png' : String(row.mime).includes('webp') ? 'webp' : 'jpg';
    const stem = `${String(row.label || row.variant || 'plate').replace(/[^a-z0-9-]+/gi, '_')}-${String(row.assetHash).slice(0, 10)}`;
    const name = `${stem}.${ext}`;
    fs.writeFileSync(path.join(dir, name), bytes);
    manifest.push({
      file: path.join(tag, name), kind: row.kind, label: row.label, variant: row.variant,
      mime: row.mime, cacheKey: row.cacheKey, assetHash: row.assetHash, klass: classify(row)
    });
  }
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

/** Drives the app's OWN foundry (same prompts, same anchors, same
 * attestations) to paint the fixture's souls, regions, cover, and two scene
 * plates. This is the letter's "paint or seed" sanction: the pipe is real,
 * only the enqueue trigger is the test. Scene plates land on their logs
 * exactly the way the table lands them. */
export async function paintFixtureExtras(page: Page, campaignId: string, anchorSeed: { dataUrl: string; assetHash: string; mime: string } | null = null, battle: { card: any; cue: string } | null = null): Promise<{ painted: number; prompts: Record<string, string> }> {
  return page.evaluate(async ({ id, seed, battle }) => {
    const { db, saveCampaign } = await import('/src/lib/db.js');
    const { appendEvent } = await import('/src/lib/seal.js');
    const { Foundry } = await import('/src/lib/cinema/foundry.js');
    const { portraitPrompt, regionPrompt, scenePrompt, generationSpec } = await import('/src/lib/cinema/prompts.js');
    const { keyArtJob, heroBustJob, heroSoul, actOf, nameSeed } = await import('/src/lib/cinema/prologue.js');
    const campaign = await db.campaigns.get(id);
    if (!campaign) throw new Error('fixture campaign missing');
    const regions = campaign.codex.regions || [];
    const cast = campaign.codex.cast || [];
    const vale = regions.find((region: any) => region.name === 'Larkspur Vale');
    const edda = cast.find((soul: any) => soul.name === 'Edda');
    if (!vale || !edda) throw new Error(`fixture codex incomplete: vale=${!!vale} edda=${!!edda}`);

    // (iteration-8 logged edit) THE ANCHOR CROSSES THE MIRROR: the live
    // session's blessed anchor is seeded into the fixture store, so the
    // fixture's hero bust paints as a POST-anchor render through the app's
    // own warden lane (drift repaints once; a second drift ships the anchor
    // itself — the house never ships a stranger). This mirrors the app law
    // that every hero render after the blessing resolves against the anchor;
    // two independent blessings of one soul was the mirror's deviation, and
    // no court's question changed.
    if (seed?.dataUrl) {
      const anchorBlob = await (await fetch(seed.dataUrl)).blob();
      await db.media.put({ assetHash: seed.assetHash, campaignId: id, kind: 'paint', label: campaign.hero.name, variant: 'bust', mime: seed.mime, blob: anchorBlob, cacheKey: `proving:${id}:anchor-seed`, createdAt: Date.now() });
    }

    const foundry = new Foundry({
      campaignId: id, tier: campaign.mediaTier, spend: campaign.spend,
      onAttestation: async (payload: any) => appendEvent(id, 'media_attestation', payload)
    });

    const jobs: any[] = [];
    jobs.push({ ...keyArtJob(campaign, actOf(campaign)), originTurnHash: null, slot: 'keyart' });
    jobs.push(seed?.dataUrl
      ? { kind: 'paint', prompt: portraitPrompt(campaign, heroSoul(campaign.hero), 'bust'), options: { kind: 'portrait', label: campaign.hero.name, variant: 'bust', seed: nameSeed(campaign.hero.name), referenceLabels: [campaign.hero.name] }, priority: 0, originTurnHash: null, slot: 'hero-bust' }
      : { ...heroBustJob(campaign), originTurnHash: null, slot: 'hero-bust' });
    jobs.push({ kind: 'paint', prompt: portraitPrompt(campaign, edda, 'bust'), options: { kind: 'portrait', label: edda.name, variant: 'bust', seed: nameSeed(edda.name) }, priority: 2, originTurnHash: null, slot: 'edda-bust' });
    jobs.push({ kind: 'paint', prompt: regionPrompt(campaign, vale), options: { kind: 'region', label: vale.name, seed: nameSeed(vale.name) }, priority: 3, originTurnHash: null, slot: 'vale-1' });
    jobs.push({ kind: 'paint', prompt: regionPrompt(campaign, vale), options: { kind: 'region', label: vale.name, seed: nameSeed(vale.name) }, priority: 3, originTurnHash: null, cacheKey: `proving:${id}:vale-2`, slot: 'vale-2' });
    // (iteration-6 logged edit) The game's anchor law changed: a repaint
    // whose STATE turned paints fresh — geography holds by seed and canon,
    // never by the old state's pixels (App region_update path). These two
    // state-shifted jobs mirror that law; the same-state plates above keep
    // their anchors. No assertion changed.
    jobs.push({ kind: 'paint', prompt: regionPrompt(campaign, { ...vale, state: 'wounded' }), options: { kind: 'region', label: vale.name, seed: nameSeed(vale.name) }, priority: 4, originTurnHash: null, cacheKey: `proving:${id}:vale-wounded`, slot: 'vale-wounded' });
    jobs.push({ kind: 'paint', prompt: regionPrompt(campaign, { ...vale, state: 'blighted' }), options: { kind: 'region', label: vale.name, seed: nameSeed(vale.name) }, priority: 4, originTurnHash: null, cacheKey: `proving:${id}:vale-blighted`, slot: 'vale-blighted' });

    // (iteration-3 logged edit) Tick rows joined campaign.logs when the seed
    // learned the living-world fold — select scene turns by TURN-list
    // position (same two plates as before), not by raw log index.
    const sceneLogs = (campaign.logs || [])
      .filter((log: any) => !log.kind)
      .map((log: any, index: number) => ({ log, index }))
      .filter(({ log }: any) => !log.redacted && log.recordHash && (log.narrations?.length || log.dm?.narration_blocks?.length))
      .filter(({ index }: any) => index === 1 || index === 3);
    for (const { log } of sceneLogs) {
      // THE MOMENT, GAME-SHAPED — the app's own easel builds its moment as
      // { prose, seed, speaker } (App.jsx sceneMoment); the beat-supremacy
      // clause in scenePrompt reads moment.prose. The old pass-through of a
      // raw narration block (.text) left the beat clause silently empty —
      // fixture plates painted region canon instead of the moment.
      const blocks = log.dm.narration_blocks || [];
      const moment = {
        prose: blocks.map((block: any) => (block && block.text) || '').join(' ').slice(0, 480),
        seed: log.recordHash || String(log.id || ''),
        speaker: (blocks.find((block: any) => block && block.speaker) || {}).speaker || null
      };
      const speakers = log.dm.narration_blocks.map((block: any) => block.speaker).filter(Boolean);
      // Mirror the app's plateMood law: the cue mood is the first
      // UNATTRIBUTED narration line (stage directions), not dialogue.
      const moodLine: any = blocks.find((block: any) => block && !block.speaker && block.text) || blocks[0] || {};
      const cue = { kind: 'scene', region: vale.name, subjects: speakers.slice(0, 2), mood: String(moodLine.text || '').slice(0, 140) };
      jobs.push({
        kind: 'paint', prompt: scenePrompt(campaign, cue, moment),
        options: { kind: 'scene', moment: { prose: moment.prose }, referenceLabels: [...speakers.filter((name: string) => name === 'Edda'), vale.name].slice(0, 3) },
        priority: 1, originTurnHash: log.recordHash, cacheKey: `scene:${id}:${log.recordHash}`, slot: `scene-${log.id}`, logId: log.id
      });
    }

    // (Task 56C logged edit) THE FRAME COURTS' SEATS — three deterministic
    // scene paints for Directive IX. The Duchy pair: the SAME sealed ground
    // painted twice, independently (distinct cache keys force two mints of
    // one brief), both post-seal so the Brass Toll-Scale rider rides both —
    // the constancy court's pair. The hero-first plate: a cue that names the
    // hero FIRST beside Edda, the principal court's guaranteed seat. All
    // three cues are living-and-present under the replayed record: Corin
    // remains at The Duchy after his leave, Edda rides in the party, the
    // hero is the root. No assertion changed.
    const duchy = regions.find((region: any) => region.name === 'The Duchy');
    const toll = (campaign.codex.fixtures || []).find((fixture: any) => fixture.place === 'The Duchy');
    if (!duchy || !toll) throw new Error(`fixture codex incomplete for the frame courts: duchy=${!!duchy} toll=${!!toll}`);
    // (56C.7 logged edit) Two souls, and the mood orders the sealed fixture's
    // own attributes — a lone figure "weighing trade" begged a painted
    // counterparty (2/2 mints added one), and a mood that never named the
    // arch-bolting got freestanding scales (0/2 rendered canon). The
    // instruments were right both times; the brief was the liar.
    const pairCue = { kind: 'scene', region: 'The Duchy', subjects: ['Corin Voss', 'Edda'], mood: 'dusk trade weighed at the gate arch, the man-high brass toll-scale bolted there catching lantern light in its mirror-polished pans', crowd: 'none' };
    jobs.push({ kind: 'paint', prompt: scenePrompt(campaign, pairCue, null), options: { kind: 'scene' }, priority: 5, originTurnHash: null, cacheKey: `proving-scene:${id}:duchy-pair-1`, slot: 'duchy-pair-1' });
    jobs.push({ kind: 'paint', prompt: scenePrompt(campaign, pairCue, null), options: { kind: 'scene' }, priority: 5, originTurnHash: null, cacheKey: `proving-scene:${id}:duchy-pair-2`, slot: 'duchy-pair-2' });
    const heroFirstCue = { kind: 'scene', region: vale.name, subjects: [campaign.hero.name, 'Edda'], mood: 'the hearth-light holds the road-reader and the fire-keeper', crowd: 'none' };
    jobs.push({ kind: 'paint', prompt: scenePrompt(campaign, heroFirstCue, null), options: { kind: 'scene', referenceLabels: [campaign.hero.name, 'Edda'] }, priority: 5, originTurnHash: null, cacheKey: `proving-scene:${id}:hero-first-scene`, slot: 'hero-first-scene' });

    // (Task 57, G23e) THE SPECIES SEAT — one deterministic battle plate:
    // the app's OWN scenePrompt briefed under a campaign whose codex holds
    // the sealed species card and whose combat stands a living instance, so
    // THE BESTIARY RIDER rides the brief byte-for-byte. The card is the
    // sha-pinned battle fixture's own canon (battleLaw reads the same file
    // the courts and tooth 16 read); the doom fixture seals the same bytes
    // in its journal, and G23e ties plate, brief, and journal together.
    if (battle) {
      const battleCampaign = { ...campaign, codex: { ...campaign.codex, bestiary: [battle.card] }, combat: { active: true, round: 1, order: [], enemies: [{ id: 'battle-species-instance', name: `${battle.card.species} A`, species: battle.card.species, hp: 9, maxHp: 9, ac: 11, zone: 'near' }] } };
      const battleCue = { kind: 'scene', region: vale.name, subjects: [], mood: battle.cue, crowd: 'none' };
      jobs.push({ kind: 'paint', prompt: scenePrompt(battleCampaign, battleCue, null), options: { kind: 'scene' }, priority: 5, originTurnHash: null, cacheKey: `proving-scene:${id}:battle-species`, slot: 'battle-species' });
    }

    const prompts: Record<string, string> = {};
    for (const job of jobs) prompts[job.slot] = job.prompt;

    const assets: any[] = [];
    // THE MINT LAW (owner's ruling, 2026-07-18; effective 57.5) — the
    // fixture arm rides the same law as the live waits, per the ruling's
    // own words ("including harvest B's battle plates"): a ladder that
    // ends refused (null, or the anchor's row comes back — no row lands
    // under the ask's own key, by law) or anchored may re-lay the FULL
    // ladder with fresh dice, at most THREE complete ladders per artifact
    // per sitting. The re-ask is the SAME job bytes under the SAME key, so
    // fidelity is by construction (the spec object never changes), and
    // every ladder attests through the app's own door exactly as today. A
    // capped ask is never a ladder fall — the halt is named honestly. At
    // three falls the LAST lawful outcome ships and the courts judge it:
    // the preflight doors speak ANCHORED/REFUSED honestly (54.2), a
    // starved need reds the sitting, and the sealed journal holds every
    // ladder's attestation under the seat's key for the owner's report —
    // seats the store never needed distinct (the anchor-mirror bust ships
    // its anchor BY DESIGN) stay lawful deliveries, never false blockers.
    for (const job of jobs) {
      const { slot, logId, ...clean } = job;
      const spec = await generationSpec(clean.kind, clean.prompt, clean.options);
      const key = clean.cacheKey || spec.hash;
      let asset: any = null;
      for (let ladder = 1; ladder <= 3; ladder += 1) {
        if (!foundry.allowed('paint')) throw new Error(`MINT-HALTED — ${slot}: the image cap is spent; a capped ask is never a ladder fall (THE MINT LAW)`);
        asset = await foundry.enqueue(clean).catch((error: any) => { throw new Error(`paint ${slot} failed: ${error?.message || error}`); });
        if (asset && asset.cacheKey === key) break; // a true mint under the ask's own key
      }
      assets.push({ slot, logId, asset });
    }

    const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

    const fresh = await db.campaigns.get(id);
    const logs = fresh.logs.map((log: any) => ({ ...log }));
    for (const { slot, logId, asset } of assets) {
      if (!logId || !asset?.assetHash) continue;
      const row = await db.media.get(asset.assetHash);
      if (!row?.blob) continue;
      const dataUrl = await blobToDataUrl(row.blob);
      const at = logs.findIndex((log: any) => log.id === logId);
      if (at !== -1) logs[at] = { ...logs[at], imageUrl: dataUrl, imageAssetHash: asset.assetHash };
    }
    const keyArt = assets.find((entry) => entry.slot === 'keyart')?.asset;
    const heroBust = assets.find((entry) => entry.slot === 'hero-bust')?.asset;
    await saveCampaign({
      ...fresh, logs, spend: foundry.spend,
      keyArtHash: keyArt?.assetHash || fresh.keyArtHash || null,
      heroBustHash: heroBust?.assetHash || fresh.heroBustHash || null,
      updatedAt: Date.now()
    });
    return { painted: assets.filter((entry) => entry.asset).length, prompts };
  }, { id: campaignId, seed: anchorSeed, battle });
}

// ---------- table drivers ----------

export async function forgeNewChronicle(page: Page, options: { sparkIndex?: number; hero?: { name: string; mark?: string; presentation?: string; pronouns?: string; bearing?: string } | null } = {}): Promise<void> {
  const { sparkIndex = 1, hero = null } = options;
  await page.click('.new-spine');
  await page.waitForSelector('.spark-card');
  await page.locator('.spark-card').nth(sparkIndex).click();
  await page.click('button:has-text("Forge the hero")');
  await page.waitForSelector('.audition-chip', { timeout: 20_000 });
  if (hero) {
    await page.locator('.door-tab').nth(2).click(); // the hand door
    const nameInput = page.locator('label:has-text("Name") input');
    await nameInput.fill(hero.name);
    if (hero.presentation) {
      const select = page.locator('label:has-text("Presentation") select');
      const value = await select.locator('option').evaluateAll((options, wanted) => {
        const match = options.find((option) => (option.textContent || '').toLowerCase().includes(wanted) || (option as HTMLOptionElement).value.toLowerCase().includes(wanted));
        return match ? (match as HTMLOptionElement).value : null;
      }, hero.presentation.toLowerCase());
      if (!value) throw new Error(`no presentation option matching "${hero.presentation}"`);
      await select.selectOption(value);
    }
    if (hero.pronouns) await page.locator('label:has-text("Pronouns") input').fill(hero.pronouns);
    if (hero.mark) await page.locator('label:has-text("Distinguishing mark") input').fill(hero.mark);
    if (hero.bearing) await page.locator('label:has-text("Bearing") input').fill(hero.bearing);
  }
  await page.locator('.audition-chip').first().click(); // the voice blessing
  await page.click('button:has-text("Begin the chronicle")');
  await page.waitForSelector('main.adventure-log', { timeout: 90_000 });
}

export async function act(page: Page, text: string): Promise<void> {
  await page.fill('.composer textarea', text);
  await page.locator('.composer button').last().click();
}

export async function turnCount(page: Page): Promise<number> {
  return page.locator('main.adventure-log .turn-entry').count();
}

/** If a roll is pending, press it, watch the die, and wait for the
 * resolution turn (the table replays it ~1s after the overlay). */
export async function rollIfAsked(page: Page): Promise<boolean> {
  const button = page.locator('.roll-button');
  if (!(await button.isVisible().catch(() => false))) return false;
  const before = await turnCount(page);
  await button.click();
  await page.waitForSelector('.die', { timeout: 15_000 });
  await page.waitForFunction((count) => document.querySelectorAll('main.adventure-log .turn-entry').length > count, before, { timeout: 120_000 });
  return true;
}

export async function waitForTurn(page: Page, above: number, timeout = 120_000): Promise<void> {
  await page.waitForFunction((count) => document.querySelectorAll('main.adventure-log .turn-entry').length > count, above, { timeout });
  await page.waitForSelector('.composer textarea:not([disabled]), .roll-button', { timeout });
}

// ---------- overlays ----------

export async function openCodex(page: Page): Promise<void> {
  // (56C.10 logged edit) One tap can land in a hydration gap — observed once
  // in four rides: page alive, button [active], modal never opened, 240s
  // burned. A patron taps again; so does the walk. Re-tap only when the
  // modal is provably absent; the final unguarded wait keeps the court's
  // own timeout as the law. No assertion weakened — the codex must still
  // open and answer everything the court demands.
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await page.locator('.modal .codex-head').isVisible().catch(() => false)) return;
    // (58C logged edit — Directive XIV) The one door is relabeled Book;
    // same seat, same waits, same law.
    await page.click('nav button:has-text("Book")');
    const head = await page.waitForSelector('.modal .codex-head', { timeout: 15_000 }).catch(() => null);
    if (head) return;
  }
  await page.waitForSelector('.modal .codex-head');
}

// (58C logged edit — Directive XIV) The codex opens as THE BOOK: six
// chapters behind the one door. openChapter turns to a named page and
// waits for it to stand. The ribbon persists within a sitting, so a court
// that needs a particular page must turn to it explicitly — reopening the
// book lands wherever the last walk left it.
export async function openChapter(page: Page, chapter: string): Promise<void> {
  await openCodex(page);
  const tab = page.locator(`.book-chapters button[data-chapter="${chapter}"]`);
  if (!(await tab.evaluate((el) => el.classList.contains('open')).catch(() => false))) {
    await tab.click();
  }
  await page.waitForSelector(`.book-page[data-page="${chapter}"]`, { timeout: 15_000 });
}

export async function openSheet(page: Page): Promise<void> {
  await page.click('.sigil-button');
  await page.waitForSelector('.modal .stat-ribbon');
}

export async function closeModal(page: Page): Promise<void> {
  await page.click('.modal header button[aria-label="Close"]');
  await page.waitForSelector('.modal', { state: 'detached' });
}

export async function openStorybook(page: Page): Promise<FrameLocator> {
  await page.click('nav .wax-seal');
  await page.waitForSelector('iframe.book-frame', { timeout: 120_000 });
  const frame = page.frameLocator('iframe.book-frame');
  await frame.locator('.leaf').first().waitFor({ timeout: 60_000 });
  return frame;
}

// ---------- feed extraction (G14 ground truth for the pure checker) ----------

export async function extractFeed(page: Page): Promise<{ rows: any[]; mast: string }> {
  return page.evaluate(() => {
    const main = document.querySelector('main.adventure-log');
    const rows: any[] = [];
    const mast = main?.querySelector('.campaign-mast span')?.textContent || '';
    for (const el of Array.from(main?.children || [])) {
      if (el.classList.contains('campaign-mast')) continue;
      if (el.classList.contains('recap-card')) { rows.push({ kind: 'recap' }); continue; }
      if (el.classList.contains('chronicle-page')) {
        const title = el.querySelector('h4')?.textContent || '';
        const match = title.match(/Chapter\s+([IVXLC]+)/i);
        rows.push({ kind: 'page', chapterRoman: match ? match[1].toUpperCase() : null, title, footer: el.querySelector('footer small')?.textContent || '' });
        continue;
      }
      if (el.classList.contains('page-pending')) { rows.push({ kind: 'page-pending' }); continue; }
      if (el.classList.contains('time-divider')) {
        rows.push({
          kind: 'tick',
          phrase: el.querySelector('em')?.textContent?.trim() || el.textContent?.trim() || '',
          whispers: Array.from(el.querySelectorAll('.whispers span')).map((span) => span.textContent || '')
        });
        continue;
      }
      if (el.classList.contains('redacted-line')) { rows.push({ kind: 'redacted', text: el.textContent || '' }); continue; }
      if (el.classList.contains('turn-entry')) {
        const order: string[] = [];
        const speakers: string[] = [];
        for (const child of Array.from(el.querySelectorAll('.player-line, .roll-stamp, .narration, .suggestions'))) {
          if (child.classList.contains('roll-stamp')) order.push('roll');
          else if (child.classList.contains('deed')) order.push('deed');
          else if (child.classList.contains('player-line')) order.push('player');
          else if (child.classList.contains('narration')) order.push('narration');
          else if (child.classList.contains('suggestions')) order.push('suggestions');
        }
        el.querySelectorAll('.narration p > strong').forEach((strong) => speakers.push((strong.textContent || '').trim()));
        rows.push({
          kind: 'turn', order, speakers,
          firstNarration: (el.querySelector('.narration p')?.textContent || '').slice(0, 120),
          narrationTexts: Array.from(el.querySelectorAll('.narration p')).map((p) => p.textContent || '')
        });
        continue;
      }
      rows.push({ kind: 'other', className: el.className });
    }
    return { rows, mast };
  });
}

export async function bodyText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText);
}
