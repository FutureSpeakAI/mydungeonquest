// ------------------------------------------------------------
// THE TROVE (Directive VI) — named possessions and per-holder coin,
// replayed pure from the sealed record. A thing exists because an
// item_add sealed it; it changes hands because an item_transfer sealed
// the passage; it leaves play because an item_remove sealed the honest
// reason. Coin moves only by sealed purse operations, clamped at zero
// by the same law the reducer applies. Citations come from replay, so
// the Codex can point at the exact journal row behind every hand and
// every coin. Redacted rows contribute NOTHING — journal strikes
// outrank snapshot flags. Pure, deterministic, keyless.
// ------------------------------------------------------------
const canon = (value) => String(value || '').trim().toLowerCase();
export const ITEM_KINDS = ['weapon', 'tool', 'keepsake', 'treasure', 'document'];
export const ITEM_OPS_PER_TURN = 3;
export const PURSE_OPS_PER_TURN = 2;

// The forge seed, as the journal reads it: chain link zero, cited to
// turn zero, by the forge's own words. initCodex seeds codex.trove from
// the same hero sheet, so working memory and journal agree from the
// first word. A hero forged without a keepsake begins with an empty
// trove — an absence, honestly recorded.
function seedItems(campaign) {
  const keepsake = String(campaign?.hero?.keepsake || '').trim();
  if (!keepsake) return [];
  const holder = String(campaign?.hero?.name || '').trim().slice(0, 60);
  return [{
    name: keepsake.slice(0, 60), kind: 'keepsake', holder, note: null,
    status: 'held', chain: [{ holder, since: 0, by: 'carried from the forge' }],
    removedTurn: null, removedReason: null
  }];
}

// Replays the record into items with full provenance chains: every hand
// the thing has passed through, since which journal row, by what words.
// The same counting law as the reducer — at most three item operations a
// turn, adds first, then transfers, then removes — so fold and replay
// agree on every unstruck record.
export function troveOf(campaign) {
  const items = seedItems(campaign);
  const held = (name) => items.find((item) => canon(item.name) === canon(name) && item.status === 'held');
  (campaign?.logs || []).forEach((log, index) => {
    if (log.redacted) return;
    const story = log?.dm?.story || {};
    const gloss = String(log.player || log.deed || '').slice(0, 90);
    let budget = ITEM_OPS_PER_TURN;
    for (const add of story.item_add || []) {
      if (budget <= 0) break;
      budget -= 1;
      const name = String(add?.name || '').trim().slice(0, 60);
      if (!name || held(name)) continue;
      const holder = String(add?.holder || '').trim().slice(0, 60);
      items.push({
        name, kind: ITEM_KINDS.includes(add?.kind) ? add.kind : 'keepsake', holder,
        note: add?.note ? String(add.note).trim().slice(0, 90) : null,
        status: 'held', chain: [{ holder, since: index, by: gloss }],
        removedTurn: null, removedReason: null
      });
    }
    for (const move of story.item_transfer || []) {
      if (budget <= 0) break;
      budget -= 1;
      const item = held(move?.name);
      const to = String(move?.to || '').trim().slice(0, 60);
      if (!item || !to || canon(item.holder) !== canon(move?.from) || canon(move?.from) === canon(to)) continue;
      item.holder = to;
      item.chain = [...item.chain, { holder: to, since: index, by: gloss }];
    }
    for (const drop of story.item_remove || []) {
      if (budget <= 0) break;
      budget -= 1;
      const item = held(drop?.name);
      if (!item || canon(item.holder) !== canon(drop?.holder)) continue;
      item.status = 'gone';
      item.removedTurn = index;
      item.removedReason = drop?.reason ? String(drop.reason).trim().slice(0, 90) : null;
    }
  });
  return items;
}

// Folds one holder's coin in played order with the reducer's own clamp
// law — a movement below zero holds at zero and the entry says so.
export function purseOf(campaign, holder) {
  const who = canon(holder);
  let coin = 0;
  const entries = [];
  (campaign?.logs || []).forEach((log, index) => {
    if (log.redacted) return;
    for (const move of (log?.dm?.story?.purse || []).slice(0, PURSE_OPS_PER_TURN)) {
      const target = String(move?.holder || '').trim();
      const delta = Math.trunc(Number(move?.delta) || 0);
      const reason = String(move?.reason || '').trim();
      if (!target || !delta || !reason || canon(target) !== who) continue;
      const next = coin + delta;
      const clamped = next < 0;
      coin = Math.max(0, next);
      entries.push({ turn: index, delta, reason: reason.slice(0, 90), clamped });
    }
  });
  return { holder: String(holder || ''), coin, entries };
}

export const heldBy = (campaign, holder) => troveOf(campaign)
  .filter((item) => item.status === 'held' && canon(item.holder) === canon(holder));
