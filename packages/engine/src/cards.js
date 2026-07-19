import { rowsOf } from './rows.js';
// ------------------------------------------------------------
// THE CHARACTER CARD — one living card per soul, the hero included.
//
// THE CARD LAW: a card is DERIVED STATE, produced by this pure reducer
// replaying the validated turn log. The model never writes a card; only
// ops move it. Identity locks at first introduction; state, ties, and
// chronicle accrue lawfully; rebuilding from the same log is byte-identical
// (that determinism is gated). No imports beyond the standard library —
// safe for the headless bench and the browser alike.
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
  return byFirst.length === 1 ? byFirst[0] : null;
}

function addTie(card, to, type, why, turn) {
  const existing = card.ties.find((t) => t.to === to && t.type === type);
  if (existing) { existing.why = why; existing.turn = turn; return; }
  card.ties.push({ to, type, why, turn });
}

// The reducer. `hero` seeds the player's own card; `entries` is the turn log
// in order — each { turn?, player?, dm? } where dm is a VALIDATED dm_turn.
export function buildCards({ hero = null, entries = [] } = {}) {
  const cards = {};
  const order = [];
  const ensure = (name, turn) => {
    const key = canon(name);
    // Names must be strings (the witness law): a nameless or rotten name
    // births a GHOST card — writable, never registered, never shown — so
    // junk proves nothing and no caller ever crashes on a refused birth.
    if (!key || typeof name !== 'string') return blankCard('', turn);
    if (!cards[key]) { cards[key] = blankCard(String(name).trim(), turn); order.push(key); }
    return cards[key];
  };

  if (hero?.name) {
    const heroCard = ensure(hero.name, 0);
    heroCard.identity.role = `${hero.ancestry || ''} ${hero.className || hero.class || ''}`.trim() || 'the hero';
    heroCard.identity.canon = { visual: gloss(`${hero.bearing || ''} ${hero.mark ? `Mark: ${hero.mark}.` : ''}`, 360), voice: gloss(hero.pronouns || '', 60) };
    heroCard.identity.gender = hero.presentation || null;
    heroCard.identity.hero = true;
  }

  let turnCursor = -1;
  for (const entry of entries) {
    const turn = Number.isInteger(entry.turn) ? entry.turn : turnCursor + 1;
    turnCursor = turn;
    const dm = entry.dm || {};
    const story = dm.story || {};

    for (const soul of story.cast_add || []) {
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

    for (const patch of story.cast_update || []) {
      const key = canon(patch.name);
      const card = cards[key];
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
    }

    const seenThisTurn = new Set();
    for (const block of dm.narration_blocks || []) {
      if (!block?.speaker) continue;
      const key = matchSpeaker(block.speaker, cards);
      if (!key || !cards[key]) continue;
      const card = cards[key];
      if (card.state.status === 'dead') continue; // the dead do not speak — defensively held here too
      card.state.lastActive = turn; // speaking marks a soul active in the scene
      if (!seenThisTurn.has(key)) {
        seenThisTurn.add(key);
        card.chronicle.push({ turn, gloss: `Spoke — “${gloss(block.text, 48)}”` });
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

  return { cards, order: order.map((key) => cards[key].name) };
}

// Convenience for the client: a campaign's own log is its entry list.
export function cardsForCampaign(campaign) {
  return buildCards({ hero: campaign?.hero || null, entries: rowsOf(campaign?.logs) });
}
