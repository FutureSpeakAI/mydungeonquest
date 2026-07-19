import { expect, test, type BrowserContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { seedFixture } from './lib/harness';
import { GAME_ROOT } from './lib/vision';
import { raiseCommonsHouse, type CommonsHouse } from './lib/commonsServer';

// ============================================================
// G29 — THE COMMONS (Directive XV §VI). One tale walks the whole road:
// seeded and sealed on a device → mirrored to a REAL vault through the
// staging seam → published as a living page → read by a GUEST whose own
// browser re-verifies the bytes → restored onto a second device through
// the desk court → revoked into an honest tombstone.
//
// The court's own laws:
//   - The struck turn's words appear NOWHERE on the public page — yet the
//     raw record still carries them (the chain is the law; redaction is
//     an honest strike, never a rewrite).
//   - The seen ledger NEVER rides: the raw record knows no 'reveals'.
//   - The badge is earned in the reader's browser on the verbatim bytes,
//     not declared by the server.
//   - Revocation answers 410 at every door, and the page refuses whole.
// ============================================================

const FIXTURE = JSON.parse(fs.readFileSync(path.join(GAME_ROOT, 'tests', 'e2e', 'fixtures', 'commons-tale.json'), 'utf8'));
// The commons plate, minted deterministic — its name is hardcoded so the
// court can poll the shelf for exactly this byte-run.
const PLATE_SHA = 'fd4194186c6ec8d914de76cdeee1e86aa73fece99769e843271be6fe1cc414c4';
const KEPT = 'The lantern answers the dark with a steady gold';
const STRUCK = 'true name is Ilvane Moor'; // apostrophe-free, quote-form-proof
const PORT = 5193;
const API_PORT = 5192;

test.describe('G29 — THE COMMONS', () => {
  test('a sealed tale mirrors, publishes, verifies in a guest\u2019s browser, restores, and revokes honestly', async ({ browser }) => {
    test.setTimeout(420_000);
    const house: CommonsHouse = await raiseCommonsHouse({ port: PORT, apiPort: API_PORT, court: 'g29', patron: 'g29-commons-court' });
    const contexts: BrowserContext[] = [];
    try {
      // ---------------------------------------------- the author's device
      const ctxA = await browser.newContext();
      contexts.push(ctxA);
      const pageA = await ctxA.newPage();
      // The seed door only exists on the proving road (?proving=1), and the
      // arrival curtain is skipped the same way the rig's own boot() does.
      await pageA.addInitScript(() => { try { sessionStorage.setItem('mdq:arrived', '1'); } catch { /* private mode */ } });
      await pageA.goto(`${house.base}/?proving=1`, { waitUntil: 'domcontentloaded' });
      await pageA.waitForSelector('.title-page', { timeout: 45_000 });

      // Sweep the staged patron's shelf from prior sittings — one living
      // page per tale is the law, and this court must own its 409s.
      const mine = await pageA.request.get(`${house.base}/api/publish/mine`);
      expect(mine.status(), 'the staged patron owns a shelf — the seam is standing').toBe(200);
      for (const page of (await mine.json()).pages ?? []) {
        if (!page.revokedAt) await pageA.request.post(`${house.base}/api/publish/${page.publishId}/revoke`);
      }

      const campaignId = await seedFixture(pageA, { sealed: true, boot: false, source: FIXTURE });

      // ------------------------------------------- the mirror fills, live
      await expect
        .poll(async () => {
          const answer = await pageA.request.get(`${house.base}/api/vault/campaign/${campaignId}/journal?from=0`);
          if (!answer.ok()) return `door:${answer.status()}`;
          const { records } = await answer.json();
          if (!Array.isArray(records) || !records.length) return 'empty';
          return records.some((record: any) => record?.type === 'sealing') ? 'sealed' : `records:${records.length}`;
        }, { timeout: 120_000, intervals: [2_500] })
        .toBe('sealed');
      await expect
        .poll(async () => {
          const answer = await pageA.request.post(`${house.base}/api/vault/media-missing`, { data: { hashes: [PLATE_SHA] } });
          if (!answer.ok()) return `door:${answer.status()}`;
          const { missing } = await answer.json();
          return Array.isArray(missing) ? missing.length : 'unreadable';
        }, { timeout: 120_000, intervals: [2_500] })
        .toBe(0);

      // ------------------------------------------------- publish the tale
      await pageA.getByRole('button', { name: /keepsake/i }).click();
      const publishButton = pageA.getByTestId('publish-tale');
      await expect(publishButton, 'the commons panel stands ready on a live, named, sealed table').toBeEnabled({ timeout: 60_000 });
      await publishButton.click();
      const link = pageA.getByTestId('publish-url');
      await expect(link, 'the living page answers with its address').toBeVisible({ timeout: 60_000 });
      const href = await link.getAttribute('href');
      const publishId = href?.match(/\/t\/([A-Za-z0-9_-]+)\/?$/)?.[1];
      expect(publishId, `the address names the page (${href})`).toBeTruthy();

      // -------------------------------------- the guest reads and RE-JUDGES
      const ctxGuest = await browser.newContext();
      contexts.push(ctxGuest);
      const pageGuest = await ctxGuest.newPage();
      await pageGuest.goto(`${house.base}/t/${publishId}`, { waitUntil: 'domcontentloaded' });
      const badge = pageGuest.getByTestId('desk-badge');
      await expect(badge, 'the badge is EARNED in the guest\u2019s own browser').toHaveAttribute('data-verdict', 'true', { timeout: 90_000 });
      await expect(badge).toContainText(/This tale is true/);

      // The book renders the kept sentence; the struck sentence is felled
      // from page AND book; the plate hangs.
      const book = pageGuest.frameLocator('iframe.public-book');
      await expect(book.locator('body')).toContainText(KEPT, { timeout: 60_000 });
      expect(await pageGuest.content()).not.toContain(STRUCK);
      expect(await book.locator('body').innerText()).not.toContain(STRUCK);

      await pageGuest.getByRole('button', { name: /episodes/i }).click();
      await expect(pageGuest.getByTestId('episode-item')).toHaveCount(7); // eight turns, one struck
      expect(await pageGuest.content()).not.toContain(STRUCK);
      const plates = pageGuest.locator('[data-testid="episode-item"] img');
      await expect(plates.first(), 'the seeded plate hangs on its own turn').toBeVisible({ timeout: 30_000 });
      await expect
        .poll(async () => plates.first().evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBeGreaterThan(0);

      // The tab's face reads "Dramatis personae" — the court holds the
      // stable instrument (testid), not a guessed accessible name.
      await pageGuest.getByTestId('tab-cast').click();
      const cast = pageGuest.getByTestId('public-cast');
      await expect(cast).toBeVisible();
      for (const soul of ['Wren', 'Edlyn', 'The Tidewife', 'Brother Halm']) {
        await expect(cast, `${soul} stands in the dramatis personae`).toContainText(soul);
      }

      // The raw record: struck words STAND in the chain (an honest strike,
      // never a rewrite) — and the seen ledger never rides.
      const rawAnswer = await pageGuest.request.get(`${house.base}/api/public/tale/${publishId}/record`);
      expect(rawAnswer.status()).toBe(200);
      const raw = await rawAnswer.text();
      expect(raw, 'the chain keeps the struck turn\u2019s bytes').toContain(STRUCK);
      expect(raw, 'the kept verse rides too').toContain(KEPT);
      expect(raw, 'the seen ledger NEVER rides to the commons').not.toContain('"reveals"');

      // ------------------------------------- the second device: restore
      const ctxB = await browser.newContext();
      contexts.push(ctxB);
      const pageB = await ctxB.newPage();
      await pageB.addInitScript(() => { try { sessionStorage.setItem('mdq:arrived', '1'); } catch { /* private mode */ } });
      await pageB.goto(`${house.base}/`, { waitUntil: 'domcontentloaded' });
      await pageB.waitForSelector('.title-page', { timeout: 45_000 });
      // The shelf honestly accumulates a spine per iteration's walk (each
      // run mints a fresh campaign under the same staged patron) — the
      // court holds ITS OWN tale by the instrument, never by title.
      const spine = pageB.locator(`.vault-shelf .vault-spine[data-campaign="${campaignId}"]`);
      await expect(spine, 'the away tale stands on the vault shelf').toBeVisible({ timeout: 60_000 });
      await spine.click();
      await pageB.waitForSelector('main.adventure-log', { timeout: 90_000 });
      await pageB.getByRole('button', { name: /keepsake/i }).click();
      await expect(pageB.locator('.verify-wax'), 'the restored spine re-verifies at the desk').toContainText(/This tale is true/, { timeout: 60_000 });

      // ------------------------------------------------ revoke: tombstone
      pageA.on('dialog', (dialog) => dialog.accept());
      await pageA.getByTestId('revoke-tale').click();
      await expect(pageA.getByTestId('publish-tale'), 'the panel returns to ready — the tale may stand anew').toBeVisible({ timeout: 60_000 });

      const ctxLate = await browser.newContext();
      contexts.push(ctxLate);
      const pageLate = await ctxLate.newPage();
      await pageLate.goto(`${house.base}/t/${publishId}`, { waitUntil: 'domcontentloaded' });
      await expect(pageLate.getByTestId('tale-tombstone'), 'the tombstone speaks plainly').toBeVisible({ timeout: 60_000 });
      expect(await pageLate.content()).not.toContain(KEPT);
      const goneRecord = await pageLate.request.get(`${house.base}/api/public/tale/${publishId}/record`);
      expect(goneRecord.status(), 'the record door answers 410 — gone, and honestly gone').toBe(410);
      const goneAsset = await pageLate.request.get(`${house.base}/api/public/tale/${publishId}/asset/${PLATE_SHA}`);
      expect(goneAsset.status(), 'the plate door answers 410 with its page').toBe(410);
    } finally {
      for (const ctx of contexts) await ctx.close().catch(() => {});
      await house.douse();
    }
  });
});
