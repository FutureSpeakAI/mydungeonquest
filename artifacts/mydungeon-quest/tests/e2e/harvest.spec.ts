import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  act, boot, closeModal, forgeNewChronicle, harvestPlates, loadManifest, mediaIndex,
  openChapter, openCodex, paintFixtureExtras, PLATES_DIR, readCampaign, readJournal,
  rollIfAsked, seedFixture, turnCount
} from './lib/harness';
import type { PlateEntry } from './lib/harness';
import { buildTopManifest, ensureFreshStore } from './lib/harvestManifest';
import { classifyAttestations, waitForResolutions } from './lib/terminality';
import type { PaintResolution } from './lib/terminality';
import { BATTLE_CUE, battleCard } from './lib/battleLaw';

// ============================================================
// THE HARVEST — the ONE project that touches the app (Move Three). It
// paints (or lawfully reuses, under the paint-law hash) both stores,
// captures the storybook, the captions, and the exported records, and
// binds everything into the top manifest. The judge courts read only
// what this project leaves on disk — and refuse BY NAME when it's short.
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

// THE TERMINAL ANSWER (Task 54 Move One) — the harvest reads the SEALED
// RECORD, never the shelf. The journal's media attestations are the ask's
// terminal answers: FULFILLED (bytes on the shelf under the attested hash)
// or REFUSED (no media row, by law). Task 53 closed red because the old
// shelf-poll read a lawful refusal's silence as eternal pending.
async function readResolutions(page: any, campaignId: string): Promise<PaintResolution[]> {
  const journalRows = await readJournal(page, campaignId);
  const shelf = new Set<string>((await mediaIndex(page, campaignId))
    .filter((row) => row.kind === 'paint' && (row.bytes ?? 0) > 0)
    .map((row) => String(row.assetHash)));
  return classifyAttestations(journalRows, shelf);
}

// THE MEASURED CAP (§2.3; arithmetic logged in LOOP_LOG.md, TASK 54) —
// across the 35 prior run logs: worst observed take 52.8s (run-iter12),
// worst observed warden judgment 6.6s → one terminal ask costs at most
// take + retake + four judgments ≈ 132s. The image lane is SERIAL: the
// first sitting queues ≈9 asks ahead of these needs (typical ≈25s each,
// plus one worst-case allowance ≈ 357s) → cap 480s. The act sitting
// queues ≤4 asks → cap 300s. These caps bound only true SILENCE — a
// sealed refusal fails in the same poll that reads it.
const WAIT1_CAP_MS = 480_000;
const WAIT2_CAP_MS = 300_000;

// ---------- THE MINT LAW's re-lay door (owner's ruling, 2026-07-18; 57.5) ----------
// Instrument-only: the door re-lays a fallen REQUIRED seat's FULL ladder
// through the app's OWN foundry — same prompts, same warden lane, same
// attestation door (appendEvent) — with fresh dice. It rebuilds the ask by
// MIRRORING the app's own builders (the App easel's turn scene job; the
// prologue's genesis jobs; the introduce path's portrait jobs), then
// PROVES fidelity before firing: the rebuilt ask's promptHash and
// generationSpecHash must equal the fallen ask's attested fingerprints,
// and the rebuilt cacheKey must be the very seat. A drifted mirror can
// only ever REFUSE to re-lay (the fall then stands as sealed) — it can
// never re-lay a different brief. No paint-law byte moves: bought dice
// only. The same-key re-ask runs a genuinely fresh ladder because a
// refused or anchored ask stores NO media row, by law — the foundry's
// cache has nothing to return for the key. The door deliberately does NOT
// touch campaign.spend: the app's settle-once meter law (54C) owns that
// ledger and the server clamp remains the true wall; an advisory
// undercount in a proving campaign beats racing the settlement.
async function fireMintLadder(page: any, campaignId: string, seat: any): Promise<{ fired: boolean; capped?: boolean; mismatch?: string; infra?: string }> {
  return page.evaluate(async ({ id, seat }: any) => {
    const { db } = await import('/src/lib/db.js');
    const { appendEvent } = await import('/src/lib/seal.js');
    const { Foundry } = await import('/src/lib/cinema/foundry.js');
    const { generationSpec, scenePrompt, portraitPrompt, sceneRoster, plateMood, bearingTextFor, identityClause, heroSoul } = await import('/src/lib/cinema/prompts.js');
    const { keyArtJob, heroBustJob, actOf, nameSeed } = await import('/src/lib/cinema/prologue.js');
    const campaign = await db.campaigns.get(id);
    if (!campaign) return { fired: false, mismatch: 'the campaign is missing from the shelf' };

    let job: any = null;
    if (seat.subtype === 'keyart') {
      job = { ...keyArtJob(campaign, actOf(campaign)), originTurnHash: seat.originTurnHash ?? null };
    } else if (seat.subtype === 'portrait') {
      const heroSeat = campaign.hero && String(seat.label ?? '').trim().toLowerCase() === String(campaign.hero.name).trim().toLowerCase();
      if (heroSeat && seat.variant === 'bust') {
        job = { ...heroBustJob(campaign), originTurnHash: seat.originTurnHash ?? null };
      } else {
        const locked = (campaign.codex.cast || []).find((entry: any) => entry.name === seat.label);
        if (locked) job = { kind: 'paint', prompt: portraitPrompt(campaign, locked, seat.variant), options: { kind: 'portrait', label: seat.label, variant: seat.variant, seed: nameSeed(seat.label), referenceLabels: seat.variant === 'bust' ? [] : [seat.label], ...(seat.variant === 'bust' ? {} : { warden: { kind: 'soul', bearingText: bearingTextFor(campaign, seat.label) } }) }, priority: seat.variant === 'bust' ? 0 : 6, originTurnHash: seat.originTurnHash ?? null };
      }
    } else if (seat.subtype === 'scene') {
      const log = (campaign.logs || []).find((l: any) => l.recordHash && l.recordHash === seat.originTurnHash);
      const dm = log?.dm;
      if (dm) {
        // MIRROR of the app's own easel (detectCast + the turn scene job,
        // App.jsx) — fidelity proven below; a drifted mirror refuses, never fires.
        const detectCast = (cast: any[] = [], blocks: any[] = []) => {
          const names = (cast || []).map((entry: any) => entry?.name).filter(Boolean);
          const speakers = new Set((blocks || []).map((b: any) => String(b?.speaker || '').toLowerCase()).filter(Boolean));
          const prose = (blocks || []).map((b: any) => String(b?.text || '')).join(' ').toLowerCase();
          return names.filter((name: string) => { const n = name.toLowerCase(); return speakers.has(n) || prose.includes(n); }).slice(0, 3);
        };
        const presentCast = detectCast(campaign.codex.cast, dm.narration_blocks);
        const sceneCue = dm.image_cue
          ? { ...dm.image_cue, subjects: (dm.image_cue.subjects?.length ? dm.image_cue.subjects : presentCast) }
          : { kind: 'scene', mood: plateMood(dm, 140) || 'the unfolding scene', subjects: presentCast, region: campaign.codex.regions?.[0]?.name || campaign.homeRegion };
        const sceneMoment = {
          // LAW IX (0.9.0) — the mirror walks the app's OWN law: the Art
          // Director's composed moment on the cue wins; the whole-page
          // join serves only turns sealed before the chair opened. 58.6
          // fell exactly here: the app staged with the cue's moment, this
          // mirror rebuilt with the join, and the fidelity proof refused
          // every scene re-lay. If the easel's sceneMoment in App.jsx
          // moves again, THIS SEAT MOVES WITH IT.
          prose: (typeof dm.image_cue?.moment === 'string' && dm.image_cue.moment.trim()
            ? dm.image_cue.moment
            : (dm.narration_blocks || []).map((block: any) => block?.text || '').join(' ')).slice(0, 480),
          seed: log.recordHash || String(log.id || ''),
          speaker: (dm.narration_blocks || []).find((block: any) => block?.speaker)?.speaker || null
        };
        const seating = sceneRoster(campaign, sceneCue, sceneMoment);
        const leadName = seating.painted[0]?.name || null;
        const sceneBearing = leadName
          ? (campaign.hero && String(leadName).trim().toLowerCase() === String(campaign.hero.name).trim().toLowerCase()
              ? `${campaign.hero.name} — ${identityClause(heroSoul(campaign.hero))}`
              : bearingTextFor(campaign, leadName))
          : null;
        job = { kind: 'paint', prompt: scenePrompt(campaign, sceneCue, sceneMoment), options: { kind: 'scene', ...(sceneMoment.prose ? { moment: { prose: sceneMoment.prose } } : {}), referenceLabels: [...seating.painted.map((s: any) => s.name), sceneCue.region].filter(Boolean).slice(0, 3), ...(sceneBearing ? { warden: { kind: 'soul', bearingText: sceneBearing } } : {}) }, priority: 1, originTurnHash: log.recordHash, cacheKey: `scene:${campaign.id}:${log.recordHash}` };
      }
    }
    if (!job) return { fired: false, mismatch: `no rebuilder stands for this seat class (${seat.subtype ?? 'unnamed'})` };

    // THE FIDELITY PROOF — the re-laid ask must BE the fallen ask.
    // (57 review, logged edit) Proven, never presumed — and never
    // presumABLE: an attested seat that carries no identity hashes cannot
    // be proven equal to ANY rebuilt ask, so the door refuses and the fall
    // stands. Absence is a refusal, not a pass.
    const spec = await generationSpec(job.kind, job.prompt, job.options);
    const rebuiltKey = job.cacheKey || spec.hash;
    if (!seat.promptHash) return { fired: false, mismatch: 'the attested seat carries no promptHash — fidelity cannot be proven, the fall stands' };
    if (!seat.generationSpecHash) return { fired: false, mismatch: 'the attested seat carries no generationSpecHash — fidelity cannot be proven, the fall stands' };
    if (spec.promptHash !== seat.promptHash) return { fired: false, mismatch: 'the rebuilt brief drifted from the attested promptHash' };
    if (spec.hash !== seat.generationSpecHash) return { fired: false, mismatch: 'the rebuilt spec drifted from the attested generationSpecHash' };
    if ((seat.cacheKey ?? null) !== (job.cacheKey ?? null)) return { fired: false, mismatch: "the rebuilt ask and the attested seat disagree about the cache key's existence" };
    if (seat.cacheKey && rebuiltKey !== seat.cacheKey) return { fired: false, mismatch: 'the rebuilt cacheKey is not the fallen seat' };

    const foundry = new Foundry({
      campaignId: id, tier: campaign.mediaTier, spend: campaign.spend,
      onAttestation: async (payload: any) => appendEvent(id, 'media_attestation', payload)
    });
    if (!foundry.allowed('paint')) return { fired: false, capped: true };
    // Awaited whole: the enqueue promise resolves when this ladder's
    // terminal answer is sealed (ship, anchor, and refusal all attest). An
    // HTTP or toll rejection rides the reject path and is named as infra.
    try { await foundry.enqueue(job); } catch (error: any) { return { fired: false, infra: String(error?.message || error) }; }
    return { fired: true };
  }, { id: campaignId, seat });
}

/** Exports the chronicle through the app's own door and writes it beside
 * the plates. The courts read the JOURNAL — the sealed truth. Presentation
 * bytes (media dataURLs, per-log imageUrls) are stripped from the disk
 * record; the plate bytes live beside it in the store, bound by the same
 * content addresses the attestations carry. */
async function exportRecord(page: any, campaignId: string, tag: 'live' | 'fixture') {
  const record = await page.evaluate(async (id: string) => {
    const { exportChronicle } = await import('/src/lib/seal.js');
    const full = await exportChronicle(id);
    return JSON.parse(JSON.stringify({
      header: full.header,
      campaign: { ...full.campaign, logs: (full.campaign.logs || []).map((log: any) => { const { imageUrl, ...rest } = log; return rest; }) },
      journal: full.journal,
      media: (full.media || []).map((row: any) => { const { blob, ...rest } = row; return rest; })
    }));
  }, campaignId);
  fs.writeFileSync(path.join(PLATES_DIR, tag, 'record.json'), JSON.stringify(record, null, 2));
  return record;
}

const have = (...rel: string[]) => rel.every((r) => fs.existsSync(path.join(PLATES_DIR, r)));

// ---------- HARVEST A: a live session on the real paint tier ----------

test('harvest A: live session paints hero anchor, villain, and scenes', async ({ page }) => {
  test.setTimeout(900_000);
  const law = ensureFreshStore();
  console.log(`[harvest] paint law ${law.hash.slice(0, 12)}… reused=${law.reused}`);

  let manifest = loadManifest('live');
  if (!(manifest && have(path.join('live', 'session.json'), path.join('live', 'record.json')))) {
    await boot(page);
    await forgeNewChronicle(page, { sparkIndex: 1, hero: HERO });
    const campaignId = await page.evaluate(async () => {
      const { db } = await import('/src/lib/db.js');
      const all = await db.campaigns.orderBy('updatedAt').reverse().toArray();
      return all[0]?.id;
    });
    expect(campaignId, 'a campaign was born').toBeTruthy();

    try {
      await waitForResolutions(() => readResolutions(page, campaignId), [
        { what: 'the key art', matches: (r) => r.label === 'keyart' },
        { what: `the hero anchor (${HERO.name}, bust)`, matches: (r) => r.label === HERO.name && r.variant === 'bust' },
        { what: `the villain intro (${VILLAIN}, bust)`, matches: (r) => r.label === VILLAIN && r.variant === 'bust' },
        { what: `the villain later plate (${VILLAIN}, dramatic)`, matches: (r) => r.label === VILLAIN && r.variant === 'dramatic' },
        // (60B §4) THE SHEET LANE — the hero's reference sheet mints beside
        // her bust at genesis (serial lane, rank 2); the sheet court (G31)
        // and its tooth starve honestly if the mint dies, so the harvest
        // waits for it by name like every other required plate.
        { what: `the hero reference sheet (${HERO.name})`, matches: (r) => r.variant === 'sheet' && r.label === HERO.name },
        { what: 'a scene plate on a sealed turn', matches: (r) => r.subtype === 'scene' || String(r.cacheKey || '').startsWith('scene:') },
      ], { capMs: WAIT1_CAP_MS, relay: { fire: (seat) => fireMintLadder(page, campaignId, seat) } });

      const before = await turnCount(page);
      await act(page, 'I follow the gold-thread mark deeper toward the vault.');
      await page.waitForFunction((count: number) => document.querySelectorAll('main.adventure-log .turn-entry').length > count, before, { timeout: 120_000 });
      await rollIfAsked(page);
      await waitForResolutions(() => readResolutions(page, campaignId), [
        { what: 'two scene plates across the sat turns', min: 2, matches: (r) => r.subtype === 'scene' || String(r.cacheKey || '').startsWith('scene:') },
      ], { capMs: WAIT2_CAP_MS, relay: { fire: (seat) => fireMintLadder(page, campaignId, seat) } });
    } catch (err) {
      // THE POST-MORTEM EXPORT (iteration 54.1 logged edit): a refusal or a
      // starvation must leave the sealed record on disk for the §4 probe —
      // otherwise the evidence dies with the page's IndexedDB. Best-effort:
      // the wait's own error stays the verdict; a failed export never masks it.
      try {
        fs.mkdirSync(path.join(PLATES_DIR, 'live'), { recursive: true });
        await exportRecord(page, campaignId, 'live');
      } catch { /* the refusal speaks for itself */ }
      throw err;
    }

    manifest = await harvestPlates(page, campaignId, 'live');
    const campaign = await readCampaign(page, campaignId);
    fs.writeFileSync(path.join(PLATES_DIR, 'live', 'session.json'),
      // (60B §4) heroCard rides WHOLE (harness-row-roundtrip law): the sheet
      // court reads the SEALED canon — composed appearance, signature, and
      // the raw atelier strokes — never the spec's own hero constant.
      JSON.stringify({ campaignId, hero: HERO, heroCard: campaign.hero, villain: VILLAIN, styleBible: campaign.styleBible, logs: campaign.logs }, null, 2));
    await exportRecord(page, campaignId, 'live');
  }

  req(manifest!, (e) => e.klass === 'keyart', 'live key art');
  req(manifest!, (e) => e.klass === 'portrait' && e.label === HERO.name && e.variant === 'bust', 'hero anchor');
  req(manifest!, (e) => e.label === VILLAIN && e.variant === 'bust', 'villain intro portrait');
  req(manifest!, (e) => e.label === VILLAIN && e.variant === 'dramatic', 'villain later plate');
  expect(manifest!.filter(isScene).length, 'at least two scene plates').toBeGreaterThanOrEqual(2);
});

// ---------- HARVEST B: the fixture painted, revealed, sealed, and bound ----------

test('harvest B: fixture paints through the app foundry, then seals into the book', async ({ page }) => {
  test.setTimeout(900_000);
  if (loadManifest('fixture') && have(
    path.join('fixture', 'storybook.json'), path.join('fixture', 'captions.json'),
    path.join('fixture', 'cover.png'), path.join('fixture', 'record.json'),
    path.join('fixture', 'session.json'))) {
    expect(loadManifest('fixture')!.length).toBeGreaterThanOrEqual(8);
    return;
  }

  const campaignId = await seedFixture(page);
  // (iteration-8 logged edit) The live anchor crosses the mirror — see
  // paintFixtureExtras: the fixture hero bust paints as a post-anchor
  // render against the live session's blessed anchor.
  const liveManifestForAnchor = loadManifest('live');
  const anchorEntry = liveManifestForAnchor?.find((e: any) => e.klass === 'portrait' && e.label === HERO.name && e.variant === 'bust') || null;
  const anchorSeed = anchorEntry
    ? { dataUrl: `data:${anchorEntry.mime};base64,${fs.readFileSync(path.join(PLATES_DIR, anchorEntry.file)).toString('base64')}`, assetHash: anchorEntry.assetHash, mime: anchorEntry.mime }
    : null;
  let prompts: any;
  try {
    ({ prompts } = await paintFixtureExtras(page, campaignId, anchorSeed, { card: battleCard(), cue: BATTLE_CUE }));
  } catch (err) {
    // THE POST-MORTEM EXPORT — fixture arm (iteration 54.1 logged edit):
    // same law as the live arm; the sealed record outlives the failure.
    try {
      fs.mkdirSync(path.join(PLATES_DIR, 'fixture'), { recursive: true });
      await exportRecord(page, campaignId, 'fixture');
    } catch { /* the paint error speaks for itself */ }
    throw err;
  }

  // THE REVEAL LAW — the book retells only dealt art. Re-seat the campaign
  // so the freshly landed plates actually render (and are seen), and visit
  // the Vale's place page so its establishing plate is dealt too.
  await page.click('nav button:has-text("Hearth")');
  await page.waitForSelector('.title-page', { timeout: 20_000 });
  await page.locator('.book-spine:not(.new-spine)').first().click();
  await page.waitForSelector('main.adventure-log', { timeout: 30_000 });
  await page.waitForFunction(() => document.querySelectorAll('main.adventure-log .plate-zoom img').length >= 2, undefined, { timeout: 60_000 });

  // THE CAPTIONS CAPTURE (Move Three) — the caption court reads disk, so
  // the harvest walks the seated feed once: every explicit figcaption and
  // its OWN figure's bytes. An empty list is honest — the criterion binds
  // when captions exist, and the sabotage caption tooth proves the bite.
  fs.mkdirSync(path.join(PLATES_DIR, 'fixture'), { recursive: true });
  const rawCaptions = await page.evaluate(() => Array.from(document.querySelectorAll('main.adventure-log figure figcaption'))
    .map((node) => {
      const img = node.closest('figure')?.querySelector('img') as HTMLImageElement | null;
      // The figcaption carries the caption's words PLUS the plate-number
      // chrome (a span: "Plate I · illuminated"). The caption court judges
      // the caption's own words — strip the chrome, never the words.
      const clone = node.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('span').forEach((chrome) => chrome.remove());
      return { text: (clone.textContent || '').trim(), dataUrl: img?.src?.startsWith('data:image/') ? img.src : null };
    })
    .filter((entry) => entry.text.length > 0 && entry.dataUrl));
  const captions = rawCaptions.map((entry: any, i: number) => {
    const match = /^data:image\/(\w+);base64,(.+)$/.exec(entry.dataUrl!);
    if (!match) throw new Error(`caption figure image is not judgeable bytes: ${entry.dataUrl!.slice(0, 40)}`);
    const file = `caption-${i}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
    fs.writeFileSync(path.join(PLATES_DIR, 'fixture', file), Buffer.from(match[2], 'base64'));
    return { file: path.join('fixture', file), text: entry.text };
  });

  await openCodex(page);
  // (58C logged edit — Directive XIV) The gallery lives in Places now.
  await openChapter(page, 'places');
  await page.locator('.region-gallery article.tappable', { hasText: 'Larkspur Vale' }).first().click();
  // (Task 52 iteration-2 logged edit, carried) The plate IS the
  // img.region-plate element — never an img nested inside it.
  await expect(page.locator('.place-page img.region-plate').first()).toBeVisible({ timeout: 30_000 });
  await closeModal(page);

  const manifest = await harvestPlates(page, campaignId, 'fixture');
  const campaign = await readCampaign(page, campaignId);
  fs.writeFileSync(path.join(PLATES_DIR, 'fixture', 'session.json'),
    JSON.stringify({ campaignId, prompts, styleBible: campaign.styleBible, logs: campaign.logs }, null, 2));
  fs.writeFileSync(path.join(PLATES_DIR, 'fixture', 'captions.json'), JSON.stringify(captions, null, 2));

  // SEAL through the app's own ritual (Book → seal ask → the wax).
  // (58C logged edit — Directive XIV) The ribbon persists within the
  // sitting, so the reopened book must be turned to the Tale, where the
  // seal invitation lives.
  await openCodex(page);
  await openChapter(page, 'tale');
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

  // (Task 52 iteration-6 logged edit, carried) The book frame is lawfully
  // sandboxed into an opaque origin — the harvest reads the DOM through
  // the frame's own context and joins media meta from the app origin.
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

  // THE COVER CAPTURE — the judge must see the cover leaf whole and
  // unoccluded. Photographing the leaf inside the app viewport handed the
  // court a lie: the app's bind bar overlaid the box and the leaf's tail
  // was clipped mid-title. Honest capture: re-open the book's OWN html
  // (taken verbatim from the frame) in a clean page and photograph the
  // whole leaf there. The in-book reader bar is hidden exactly as the
  // book's own print law hides it — chrome is not the cover.
  await bookFrame!.locator('.leaf.cover').first().waitFor({ timeout: 30_000 });
  const bookHtml: string = await bookFrame!.locator('html').evaluate((el: any) => el.outerHTML);
  const coverPage = await page.context().newPage();
  await coverPage.setViewportSize({ width: 1100, height: 1500 });
  await coverPage.setContent(bookHtml, { waitUntil: 'load' });
  await coverPage.addStyleTag({ content: '.reader-bar{display:none!important}' });
  await coverPage.locator('.leaf.cover').first().waitFor({ state: 'visible', timeout: 15_000 });
  await coverPage.evaluate(() => Promise.all(Array.from(document.images).filter((img) => !img.complete).map((img) => new Promise((done) => { img.onload = img.onerror = done; }))));
  fs.writeFileSync(path.join(dir, 'cover.png'), await coverPage.locator('.leaf.cover').first().screenshot());
  await coverPage.close();

  // The sealed record, exported through the app's own door.
  await exportRecord(page, campaignId, 'fixture');

  expect(manifest.length, 'the fixture store holds its plates').toBeGreaterThanOrEqual(8);
  expect(book.chapters.length, 'the book bound at least one chapter').toBeGreaterThanOrEqual(1);
});

// ---------- HARVEST M: the binding ----------

test('harvest M: the top manifest binds every artifact for the judge courts', async () => {
  const top = buildTopManifest();
  expect(top.plates.length, 'the store holds a full shelf').toBeGreaterThanOrEqual(10);
  expect(top.counts.scenes, 'scene plates from both stores').toBeGreaterThanOrEqual(4);
  expect(top.counts.heroBearingScenes, 'the live session painted the hero into at least one scene — the a-laws need a subject').toBeGreaterThanOrEqual(1);
  expect(top.counts.portraits, 'four portraits for the framing court').toBeGreaterThanOrEqual(4);
  expect(top.counts.keyarts, 'two key arts').toBeGreaterThanOrEqual(2);
});
