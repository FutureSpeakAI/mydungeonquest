// ------------------------------------------------------------
// THE TABLE LAW (Directive XIV) — the play surface carries the feed,
// the composer, the dice, and EXACTLY FOUR chips, a closed set folded
// pure from the sealed record: the day and its watch, the standing
// ground, the party's faces, the hero's health. Everything else lives
// in the book. The initiative tracker's presence is bound to the
// sealed combat state's own flag and nothing else. The fold returns
// these four chips always — a fifth chip requires amending the
// directive, and this fold refuses to grow one by accident: the set
// below is the whole law.
// ------------------------------------------------------------
import { calendarOf, watchOf } from './calendar.js';
import { travelRecord, partyOf } from './presence.js';

const canon = (name) => String(name ?? '').trim().toLowerCase();

export const CHIP_ORDER = ['calendar', 'ground', 'party', 'health'];

export function tableOf(campaign) {
  const logs = Array.isArray(campaign?.logs) ? campaign.logs : [];
  const { day, hours } = calendarOf(logs);
  const watch = watchOf(hours);
  const { ground } = travelRecord(campaign);
  const region = ground
    ? (campaign?.codex?.regions || []).find((entry) => canon(entry?.name) === canon(ground)) || null
    : null;
  const groundName = region?.name ?? ground ?? null;
  const party = partyOf(campaign);
  const hero = campaign?.hero || {};
  const measured = Number.isFinite(hero.hp) && Number.isFinite(hero.maxHp);
  const chips = [
    { id: 'calendar', day, watch, words: `Day ${day} · ${watch}` },
    { id: 'ground', name: groundName, state: groundName ? (region?.state || 'unmapped') : null, words: groundName ?? 'The tale has not yet set a scene' },
    { id: 'party', members: party.map((member) => ({ name: member.name })), words: party.length ? party.map((member) => member.name).join(' · ') : 'The hero travels alone' },
    { id: 'health', hp: measured ? hero.hp : null, maxHp: measured ? hero.maxHp : null, words: measured ? `${hero.hp}/${hero.maxHp}` : 'unmeasured' }
  ];
  return { chips, tracker: Boolean(campaign?.combat?.active) };
}
