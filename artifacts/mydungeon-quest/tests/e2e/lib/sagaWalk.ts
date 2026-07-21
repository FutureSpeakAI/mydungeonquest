import type { Page } from '@playwright/test';

/**
 * THE SAGA WALK — the proven doors of the volume road, in ONE seat (the
 * mirrors law: G35's courts and the teeth walk these same bytes; a second
 * copy would drift). Every device here is the app's OWN manner:
 *
 *  - a continued elder opens straight to its keepsakes (no knock owed);
 *  - a live successor's table hangs NO keepsake door — sealing an
 *    unstarted tale means staging `completed` (the doom-court device) and
 *    walking the tale-told wax the app itself hangs;
 *  - the worded-successor wait polls with one-shot evaluates, never
 *    waitForFunction with an async predicate + interval polling (that
 *    pairing resolves an unawaited promise handle — jsonValue() reads
 *    null while the row stands lawful in the record).
 */

/** Walks to the keepsakes panel. A continued elder opens straight to its
 * keepsakes (the shelf's own manner for finished books with successors);
 * a first visit needs the tale-told knock. Several .keepsakes nodes may
 * seat inside the risen ceremony — a bare locator.waitFor() strict-throws
 * on plurality and lies "absent"; the court takes the first, always. */
export async function openKeepsakes(page: Page) {
  const keeps = page.locator('.keepsakes').first();
  try {
    await keeps.waitFor({ timeout: 8_000 });
  } catch {
    await page.locator('button', { hasText: /keepsake/i }).first().click({ timeout: 15_000 });
    await keeps.waitFor({ timeout: 15_000 });
  }
}

/** Waits on the RECORD for the forged successor to seat with its genesis
 * first word poured (the mock DM answers keyless; pours dispatch before
 * any paint). Returns the successor's id; refuses by name on the deadline. */
export async function waitForWordedSuccessor(page: Page, elderId: string, timeoutMs = 120_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let vol2Id: string | null = null;
  while (!vol2Id && Date.now() < deadline) {
    vol2Id = await page.evaluate(async (elder: string) => {
      const { db } = await import('/src/lib/db.js');
      const all = await db.campaigns.toArray();
      const next = all.find((c: any) => c.id !== elder && c.saga && Array.isArray(c.saga.volumes) && c.saga.volumes.length > 0 && !c.sealedAt);
      if (!next) return null;
      const worded = (Array.isArray(next.logs) ? next.logs : []).some((l: any) => l && l.dm && l.recordHash && !l.kind);
      return worded ? next.id : null;
    }, elderId);
    if (!vol2Id) await page.waitForTimeout(1_000);
  }
  if (!vol2Id) throw new Error(`no worded successor seated within ${timeoutMs}ms — the volume door never poured its first word`);
  return vol2Id;
}

/** Seals the volume through the same wax the first one wore — the app's
 * own press. A live table hangs no seal door before its time, so the court
 * stages the tale completed (the doom-court device), reopens the spine, and
 * walks the tale-told door. The ceremony may auto-rise for a completed
 * tale (the milestone surface) — both doors are the app's own. */
export async function sealCurrentVolume(page: Page, id: string) {
  await page.evaluate(async (campaignId: string) => {
    const { db } = await import('/src/lib/db.js');
    const row = await db.campaigns.get(campaignId);
    row.completed = true;
    await db.campaigns.put(row);
  }, id);
  await page.reload();
  await page.waitForSelector('.title-page', { timeout: 45_000 });
  await page.locator('.book-spine:not(.new-spine)', { hasText: '— Volume' }).first().click();
  await page.waitForSelector('main.adventure-log', { timeout: 30_000 });
  const press = page.locator('.press-seal');
  try {
    await press.waitFor({ timeout: 8_000 }); // the ceremony rose on its own
  } catch {
    await page.locator('.tale-told button', { hasText: 'Seal the chronicle' }).click();
    await press.waitFor({ timeout: 15_000 });
  }
  await press.click();
  await page.waitForSelector('.keepsakes.next-volume', { timeout: 60_000 });
}
