import { expect, test } from '@playwright/test';
import { act, boot, closeModal, openSheet, rollIfAsked, seedFixture, turnCount } from './lib/harness';

// (54C §3.2) THE FIRST WORD BOUND — measured AFTER the cure and pinned with
// stated headroom. Post-cure solo measurements (two runs): dm on the wire
// at +160ms and +203ms after the Begin tap, first narration byte at sample
// 1 (~250ms) both times — against 21.5s solo / >30s contended before the
// cure. Pin: 12s ≈ 48× the solo median, 2.5× tighter than the 30s window
// the criterion always owned, sized so full-suite contention (fresh judge
// calls sharing the server) can never flake a lawful run. The bar may only
// tighten from here — never widen.
const FIRST_WORD_PINNED_MS = 12_000;

// G5 THE TABLE LOOP — narration streams, suggestions offer roads, a custom
// action lands, the roll shows its die and its deed, the sheet knows the
// blood. G6 — ticks with phrases, at most four whispers, one recap per
// sitting, stillness for those who ask.

test('G5 the prologue streams and the loop turns', async ({ page }) => {
  test.setTimeout(300_000);
  // (54C §3.2) THE WIRE LEDGER — every /api/dm and /api/paint request is
  // recorded at initiation, live off the page itself, so the first-word law
  // is asserted on the network, not inferred from pixels. Each paint's lane
  // mark (body.kind) is kept for the record, and settlements are counted so
  // the forge's ephemeral preview lane can be drained before the tap.
  const wire: Array<{ kind: 'dm' | 'paint'; at: number; lane: string }> = [];
  const paintLedger = { initiated: 0, settled: 0 };
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/api/dm')) wire.push({ kind: 'dm', at: Date.now(), lane: 'dm' });
    else if (url.includes('/api/paint')) {
      let lane = 'unmarked';
      try { lane = String(JSON.parse(request.postData() || '{}').kind || 'unmarked'); } catch { /* lane stays unmarked */ }
      wire.push({ kind: 'paint', at: Date.now(), lane });
      paintLedger.initiated += 1;
    }
  });
  const settle = (request: { url(): string }) => { if (request.url().includes('/api/paint')) paintLedger.settled += 1; };
  page.on('requestfinished', settle);
  page.on('requestfailed', settle);
  await boot(page);
  await page.click('.new-spine');
  await page.waitForSelector('.spark-card');
  await page.locator('.spark-card').nth(0).click();
  await page.click('button:has-text("Forge the hero")');
  await page.waitForSelector('.audition-chip', { timeout: 20_000 });
  await page.locator('.audition-chip').first().click();
  // (54C) THE FORGE LANE DRAINS FIRST — the forge paints ephemeral previews
  // (keyart, portrait) as ritual while the player writes. That lane is
  // pre-genesis work, not genesis work; iteration 54C.3 caught a preview
  // straggler initiating 77ms after the tap and reading as a false paint.
  // The court lets every pre-tap paint settle and holds a quiet beat (to
  // outlast any debounce) so that EVERY paint after the tap is genesis-lane
  // by construction — which makes the first-word assertion absolute.
  {
    const quiesceStart = Date.now();
    for (;;) {
      if (paintLedger.initiated === paintLedger.settled) {
        await page.waitForTimeout(900);
        if (paintLedger.initiated === paintLedger.settled) break;
      } else {
        await page.waitForTimeout(250);
      }
      expect(Date.now() - quiesceStart, `the forge preview lane drains inside 45s (initiated=${paintLedger.initiated}, settled=${paintLedger.settled})`).toBeLessThan(45_000);
    }
  }
  const begunAt = Date.now();
  await page.click('button:has-text("Begin the chronicle")');

  // THE STREAM — sample from the Begin tap itself (iteration-1 logged edit:
  // the old window opened only after the first narration PAINTED, mid-stream,
  // and a fast mock could show <3 rises inside it). The criterion is
  // unchanged — at least three observed rises — the window now simply covers
  // the whole stream, 0 → first chunk included.
  const samples: number[] = [];
  for (let i = 0; i < 120; i += 1) {
    const length = await page.evaluate(() => {
      const nodes = document.querySelectorAll('main.adventure-log .turn-entry .narration');
      let total = 0;
      nodes.forEach((node) => { total += (node.textContent || '').length; });
      return total;
    });
    samples.push(length);
    // The stream has settled: narration exists and hasn't grown for 12 samples.
    if (length > 0 && samples.length >= 12 && samples[samples.length - 12] === length) break;
    await page.waitForTimeout(250);
  }
  await page.waitForSelector('main.adventure-log .turn-entry .narration', { timeout: 60_000 });
  // (54B §5) The 54.6 stall — twelve all-zero samples — could not say
  // WHICH half died: transport (no first byte) or growth (a stream that
  // starts and freezes). The assertion is SPLIT so a red names its phase.
  // The bound is the window the criterion always owned (120 × 250ms);
  // neither half is softer than the old law — together they imply it.
  const firstByteIndex = samples.findIndex((length) => length > 0);
  console.log(`[g05] first narration byte at sample ${firstByteIndex} (~${firstByteIndex * 250}ms of ${samples.length * 250}ms sampled)`);
  expect(firstByteIndex, `§5 first byte: narration must begin inside the sampling window (head=${samples.slice(0, 12).join(',')})`).toBeGreaterThanOrEqual(0);
  let rises = 0;
  for (let i = 1; i < samples.length; i += 1) if (samples[i] > samples[i - 1]) rises += 1;
  expect(rises, `§5 growth: narration length rose across samples (saw ${rises} rises; head=${samples.slice(0, 12).join(',')})`).toBeGreaterThanOrEqual(3);

  // (54C §1) THE FIRST WORD ON THE WIRE — with the forge lane drained, every
  // paint after the tap is genesis-lane by construction, so the law is
  // absolute: the first /api/dm precedes EVERY /api/paint, no exceptions,
  // no payload pardons. Violators are named with their lane marks.
  const genesisWire = wire.filter((entry) => entry.at >= begunAt);
  const firstPour = genesisWire.find((entry) => entry.kind === 'dm');
  const firstPaint = genesisWire.find((entry) => entry.kind === 'paint');
  expect(firstPour, '§(54C) the pour left the page').toBeTruthy();
  expect(firstPaint, '§(54C) the genesis easel was kicked in parallel — this tier paints').toBeTruthy();
  const paintsBeforePour = genesisWire.filter((entry) => entry.kind === 'paint' && entry.at < firstPour!.at);
  expect(paintsBeforePour.length, `§(54C) no paint precedes the first word — saw [${paintsBeforePour.map((entry) => `${entry.lane}@+${entry.at - begunAt}ms`).join(', ')}] before dm@+${firstPour!.at - begunAt}ms`).toBe(0);
  console.log(`[g05][54C] wire: dm@+${firstPour!.at - begunAt}ms, first paint ${firstPaint!.lane}@+${firstPaint!.at - begunAt}ms, first byte ~${firstByteIndex * 250}ms`);

  // (54C §3.2) The pinned first-byte bound — the stream must begin inside
  // FIRST_WORD_PINNED_MS, under whatever contention the run carries.
  expect(firstByteIndex * 250, `§(54C) the first word arrives inside the pinned ${FIRST_WORD_PINNED_MS}ms (saw ~${firstByteIndex * 250}ms)`).toBeLessThanOrEqual(FIRST_WORD_PINNED_MS);

  // Suggestions — at least three roads offered.
  await page.waitForSelector('.suggestions button', { timeout: 120_000 });
  expect(await page.locator('.suggestions button').count()).toBeGreaterThanOrEqual(3);

  // A custom action echoes as the player's line.
  const before = await turnCount(page);
  await act(page, 'I study the gold-thread mark on the door.');
  await page.waitForFunction(
    (count) => document.querySelectorAll('main.adventure-log .turn-entry').length > count,
    before,
    { timeout: 120_000 }
  );
  await expect(page.locator('.player-line', { hasText: 'gold-thread mark' }).first()).toBeVisible();

  // The roll — die, total, and the deed stamp within honest bounds.
  const rolled = await rollIfAsked(page);
  if (rolled) {
    const stamp = (await page.locator('.roll-stamp').last().textContent()) || '';
    const match = stamp.match(/(\d+)/g);
    expect(match, `roll stamp shows numbers: "${stamp}"`).toBeTruthy();
    const deed = page.locator('.player-line.deed').last();
    if (await deed.isVisible().catch(() => false)) {
      expect(((await deed.textContent()) || '').trim().length).toBeGreaterThan(0);
    }
  }

  // The sheet knows the blood.
  await openSheet(page);
  await expect(page.locator('.stat-ribbon').first()).toContainText(/\d+\s*\/\s*\d+\s*HP/);
  await closeModal(page);

  // (54C §3.3) THE EASEL SETTLES, THE ORDER HOLDS — wait for genesis media
  // to fully land (no plate still painting; at least one illuminated), then
  // re-read G14a over the LIVE feed: within every turn group the player's
  // line leads, the words precede the Listen control, and the plate sits
  // BELOW them both. A late plate that shoved a paragraph falls here.
  await page.waitForFunction(() => {
    const panels = Array.from(document.querySelectorAll('main.adventure-log .turn-entry .illustration-panel'));
    if (!panels.length) return false;
    const stillPainting = panels.some((panel) => panel.className.includes('painting'));
    const illuminated = Array.from(document.querySelectorAll('main.adventure-log .illustration-panel figcaption'))
      .some((node) => (node.textContent || '').includes('illuminated'));
    return !stillPainting && illuminated;
  }, { timeout: 180_000 });
  const groups: string[][] = await page.evaluate(() =>
    Array.from(document.querySelectorAll('main.adventure-log .turn-entry')).map((entry) =>
      Array.from(entry.children).map((child) => String((child as HTMLElement).className || child.tagName).split(/\s+/)[0]))
  );
  expect(groups.length, 'the live feed still holds every turn group after the easel settled').toBeGreaterThanOrEqual(2);
  for (const [index, parts] of groups.entries()) {
    const seat = (token: string) => parts.indexOf(token);
    if (seat('player-line') !== -1 && seat('narration') !== -1) {
      expect(seat('player-line'), `group ${index}: the player's line leads [${parts.join(', ')}]`).toBeLessThan(seat('narration'));
    }
    if (seat('narration') !== -1 && seat('narrate-button') !== -1) {
      expect(seat('narration'), `group ${index}: words before Listen [${parts.join(', ')}]`).toBeLessThan(seat('narrate-button'));
    }
    if (seat('illustration-panel') !== -1 && seat('narration') !== -1) {
      expect(seat('narration'), `group ${index}: the plate sits below the words [${parts.join(', ')}]`).toBeLessThan(seat('illustration-panel'));
      if (seat('narrate-button') !== -1) {
        expect(seat('narrate-button'), `group ${index}: the plate sits below Listen too [${parts.join(', ')}]`).toBeLessThan(seat('illustration-panel'));
      }
    }
  }
});

test('G6 ticks carry phrases, whispers stay under four, no empty rows', async ({ page }) => {
  await seedFixture(page);
  const dividers = page.locator('main.adventure-log .time-divider');
  expect(await dividers.count(), 'the fixture advanced time twice').toBeGreaterThanOrEqual(2);
  for (let i = 0; i < await dividers.count(); i += 1) {
    const phrase = ((await dividers.nth(i).locator('em').first().textContent().catch(() => '')) || (await dividers.nth(i).textContent()) || '').trim();
    expect(phrase.length, `tick ${i} carries a phrase`).toBeGreaterThan(0);
    expect(await dividers.nth(i).locator('.whispers span').count(), `tick ${i} whispers`).toBeLessThanOrEqual(4);
  }
  const emptyParagraphs = await page.locator('main.adventure-log .narration p').evaluateAll(
    (nodes) => nodes.filter((node) => !(node.textContent || '').trim()).length
  );
  expect(emptyParagraphs, 'no empty narration paragraphs').toBe(0);
});

test('G6 the recap appears once per sitting and not twice', async ({ page }) => {
  await seedFixture(page);
  // Leave for the hearth, come back: the recap greets the return… once.
  await page.click('nav button:has-text("Hearth")');
  await page.waitForSelector('.title-page', { timeout: 20_000 });
  await page.locator('.book-spine:not(.new-spine)').first().click();
  await page.waitForSelector('main.adventure-log', { timeout: 30_000 });
  expect(await page.locator('.recap-card').count(), 'one recap on return').toBe(1);

  await page.click('nav button:has-text("Hearth")');
  await page.waitForSelector('.title-page', { timeout: 20_000 });
  await page.locator('.book-spine:not(.new-spine)').first().click();
  await page.waitForSelector('main.adventure-log', { timeout: 30_000 });
  expect(await page.locator('.recap-card').count(), 'no second recap this sitting').toBe(0);
});

test('G6 reduced motion: chips carry no animation classes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedFixture(page);
  const animated = await page.locator('.suggestions button').evaluateAll(
    (nodes) => nodes.filter((node) => /chip-enter|animate|slide|fade/i.test(node.className)).map((node) => node.className)
  );
  expect(animated, `no animation classes under reduced motion: ${animated.join(' | ')}`).toEqual([]);
});
