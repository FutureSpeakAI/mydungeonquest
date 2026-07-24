import { listOf, rowsOf } from './rows.js';
// THE NAME ROAD (Directive XXI): alias resolution and the ledger's one
// seal ride from names.js — this reducer grows no resolver of its own.
import { aliasIndex, resolveByClaims, sealAlias } from './names.js';
// ------------------------------------------------------------
// THE CHARACTER CARD — one living card per soul, the hero included.
//
// THE CARD LAW: a card is DERIVED STATE, produced by this pure reducer
// replaying the validated turn log. The model never writes a card; only
// ops move it. Identity locks at first introduction; state, ties, and
// chronicle accrue lawfully; rebuilding from the same log is byte-identical
// (that determinism is gated). No imports beyond the standard library —
// safe for the headless bench and the browser alike.
//
// THE ALIAS LEDGER (Directive XXI): one soul, many names, one card.
// known_as rides the card as an append-ordered, case-blind-deduped
// ledger, folded purely from cast_update.known_as_add ops; the ledger
// is born on first seal, so a pre-alias log replays byte-identical.
// ------------------------------------------------------------

const canon = (name) => String(name || '').trim().toLowerCase();
const firstName = (name) => canon(name).split(/\s+/)[0] || '';
const gloss = (text, n = 90) => String(text || '').replace(/\s+/g, ' ').trim().slice(0, n);

const KIN_WORDS = /\b(mother|father|grandmother|grandfather|sister|brother|daughter|son|wife|husband|aunt|uncle|niece|nephew|cousin|granddam)\b/;

function blankCard(name, turn) {
  return {
    name,
    identity: { name, role: '', canon: { visual: '', voice: '' }, gender: null, age_band: null, timbre: null, introduced_turn: turn },
    state: { status: 'active', bond: 0, last_seen: null, goal: '', lastActive: null },
    chronicle: [],
    ties: [],
    firstWords: null,
    lastWords: null
  };
}

function matchSpeaker(speaker, cards) {
  const key = canon(speaker);
  if (!key) return null;
  const names = Object.keys(cards);
  const exact = names.find((n) => n === key);
  if (exact) return exact;
  // The hero is a card like everyone else; a bare first name reaches its
  // soul only when exactly one card can claim it — ambiguity touches nobody.
  const byFirst = names.filter((n) => firstName(n) === key);
  if (byFirst.length === 1) return byFirst[0];
  // THE NAME ROAD (XXI): a sealed epithet reaches its one soul — the
  // road answers, this surface never grows its own resolver. A
  // deliberate seal outranks a bare-first ambiguity; a contested or
  // unsealed name still touches nobody.
  const owner = resolveByClaims(speaker, aliasIndex(Object.values(cards)));
  return owner && cards[canon(owner)] ? canon(owner) : null;
}

function addTie(card, to, type, why, turn) {
  const existing = card.ties.find((t) => t.to === to && t.type === type);
  if (existing) { existing.why = why; existing.turn = turn; return; }
  card.ties.push({ to, type, why, turn });
}

// THE FOLD'S OWN SEATS (Directive XX, Law VI — the Waypost Law): the
// reducer is split into a state, a per-entry step, and a finish, so a
// checkpoint may carry the state and resume it — ONE body of law, walked
// whole by buildCards and in stretches by the waypost. No behavior moved.
function ensureCard(state, name, turn) {
  const key = canon(name);
  // Names must be strings (the witness law): a nameless or rotten name
  // births a GHOST card — writable, never registered, never shown — so
  // junk proves nothing and no caller ever crashes on a refused birth.
  if (!key || typeof name !== 'string') return blankCard('', turn);
  if (!state.cards[key]) { state.cards[key] = blankCard(String(name).trim(), turn); state.order.push(key); }
  return state.cards[key];
}

export function cardsState(hero = null) {
  const state = { cards: {}, order: [], turnCursor: -1 };
  if (hero?.name) {
    const heroCard = ensureCard(state, hero.name, 0);
    heroCard.identity.role = `${hero.ancestry || ''} ${hero.className || hero.class || ''}`.trim() || 'the hero';
    heroCard.identity.canon = { visual: gloss(`${hero.bearing || ''} ${hero.mark ? `Mark: ${hero.mark}.` : ''}`, 360), voice: gloss(hero.pronouns || '', 60) };
    heroCard.identity.gender = hero.presentation || null;
    heroCard.identity.hero = true;
  }
  return state;
}

export function foldCardEntry(state, entry, hero = null) {
  const cards = state.cards;
  const order = state.order;
  const ensure = (name, turn) => ensureCard(state, name, turn);
  {
    const turn = Number.isInteger(entry.turn) ? entry.turn : state.turnCursor + 1;
    state.turnCursor = turn;
    const dm = entry.dm || {};
    const story = dm.story || {};

    for (const soul of listOf(story.cast_add)) {
      const key = canon(soul.name);
      if (cards[key]) continue; // identity is immutable — a second add changes nothing
      const card = ensure(soul.name, turn);
      card.identity.role = gloss(soul.role, 60);
      card.identity.canon = { visual: gloss(soul.visual, 360), voice: gloss(soul.voice, 180) };
      const vc = soul.voice_card || {};
      card.identity.gender = ['feminine', 'masculine', 'neutral'].includes(String(vc.gender || '').toLowerCase()) ? String(vc.gender).toLowerCase() : null;
      card.identity.age_band = ['child', 'young', 'adult', 'elder'].includes(String(vc.age || '').toLowerCase()) ? String(vc.age).toLowerCase() : null;
      card.identity.timbre = vc.timbre ? gloss(vc.timbre, 24) : null;
      card.state.goal = gloss(soul.goal, 120);
      card.chronicle.push({ turn, gloss: `Entered the tale — ${card.identity.role || 'unnamed role'}` });
      // Kin ties from the soul's OWN station: "her mother" binds to the hero;
      // "sister of <name>" binds to that soul when it is already known.
      const kin = KIN_WORDS.exec(canon(soul.role));
      if (kin) {
        const role = canon(soul.role);
        const named = order.find((n) => n !== key && role.includes(n));
        const toHero = hero?.name && (/(her|his|their|the hero)\b/.test(role) || role.includes(canon(hero.name)) || role.includes(firstName(hero.name)));
        if (named) addTie(card, cards[named].name, 'kin', kin[1], turn);
        else if (toHero) addTie(card, String(hero.name).trim(), 'kin', kin[1], turn);
      }
      if (card.identity.role.toLowerCase().includes('villain') || soul.role === 'villain') {
        if (hero?.name) addTie(card, String(hero.name).trim(), 'enemy', 'the villain of this tale', turn);
      }
    }

    for (const patch of listOf(story.cast_update)) {
      const key = canon(patch.name);
      // THE NAME ROAD (XXI): an op may address the soul by any sealed
      // name — exact keys answer first (their standing law), then the
      // road's epithet hop; a name nobody sealed still moves nobody.
      const owner = cards[key] ? null : resolveByClaims(patch.name, aliasIndex(Object.values(cards)));
      const card = cards[key] || (owner ? cards[canon(owner)] : undefined);
      if (!card) continue;
      card.state.lastActive = turn; // an op that moves a soul marks them active
      if (patch.status && card.state.status !== 'dead') {
        const status = String(patch.status).trim().toLowerCase();
        if (status !== card.state.status) {
          card.state.status = status;
          card.chronicle.push({ turn, gloss: status === 'dead' ? `Fell${patch.last_seen ? ` — ${gloss(patch.last_seen, 70)}` : ''}` : `Now ${status}` });
        }
      }
      const delta = Math.trunc(Number(patch.bond_delta) || 0);
      if (delta !== 0) {
        card.state.bond = Math.max(0, Math.min(4, card.state.bond + delta));
        card.chronicle.push({ turn, gloss: gloss(patch.bond_reason || (delta > 0 ? 'Grew closer' : 'Drew away'), 80) });
        if (hero?.name && card.state.bond >= 3) addTie(card, String(hero.name).trim(), 'ally', 'a bond proven in play', turn);
      }
      if (patch.fact_add) card.chronicle.push({ turn, gloss: gloss(patch.fact_add, 90) });
      if (patch.last_seen) card.state.last_seen = gloss(patch.last_seen, 100);
      // THE ALIAS LEDGER (XXI): one epithet per op rides the card through
      // the one seal — append-ordered, case-blind deduped, the soul's own
      // name a quiet no-op. A true seal writes one chronicle line; a
      // re-seal returns the same ledger and writes nothing, so replays
      // stay byte-stable.
      if (typeof patch.known_as_add === 'string' && patch.known_as_add.trim()) {
        const before = card.known_as;
        card.known_as = sealAlias(card.known_as, patch.known_as_add, card.name);
        if (card.known_as !== before) card.chronicle.push({ turn, gloss: `Came to be called \u201C${gloss(patch.known_as_add, 60)}\u201D` });
      }
    }

    const seenThisTurn = new Set();
    for (const block of listOf(dm.narration_blocks)) {
      if (!block?.speaker) continue;
      const key = matchSpeaker(block.speaker, cards);
      if (!key || !cards[key]) continue;
      const card = cards[key];
      if (card.state.status === 'dead') continue; // the dead do not speak — defensively held here too
      card.state.lastActive = turn; // speaking marks a soul active in the scene
      if (!seenThisTurn.has(key)) {
        seenThisTurn.add(key);
        card.chronicle.push({ turn, gloss: `Spoke — \u201C${gloss(block.text, 48)}\u201D` });
      }
      const words = { turn, text: gloss(block.text, 120) };
      if (!card.firstWords) card.firstWords = words;
      card.lastWords = words;
    }
    // Copresence: souls who share a scene are tied by it.
    const present = [...seenThisTurn];
    for (let a = 0; a < present.length; a += 1) for (let b = a + 1; b < present.length; b += 1) {
      const one = cards[present[a]], two = cards[present[b]];
      const prior = one.ties.find((t) => t.to === two.name && t.type === 'met');
      const count = prior ? Number(/\d+/.exec(prior.why)?.[0] || 1) + 1 : 1;
      addTie(one, two.name, 'met', `crossed paths ${count} time${count > 1 ? 's' : ''}`, turn);
      addTie(two, one.name, 'met', `crossed paths ${count} time${count > 1 ? 's' : ''}`, turn);
    }
  }
}

// The reducer. `hero` seeds the player's own card; `entries` is the turn log
// in order — each { turn?, player?, dm? } where dm is a VALIDATED dm_turn.
export function buildCards({ hero = null, entries = [] } = {}) {
  const state = cardsState(hero);
  for (const entry of entries) foldCardEntry(state, entry, hero);
  return finishCards(state);
}

// The finish — the fold's public face, byte-identical however the state
// was walked: whole from the first row, or resumed from a waypost's
// carried stretch.
export function finishCards(state) {
  return { cards: state.cards, order: state.order.map((key) => state.cards[key].name) };
}

// Convenience for the client: a campaign's own log is its entry list.
export function cardsForCampaign(campaign) {
  return buildCards({ hero: campaign?.hero || null, entries: rowsOf(campaign?.logs) });
}
