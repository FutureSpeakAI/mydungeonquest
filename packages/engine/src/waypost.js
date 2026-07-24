// THE WAYPOST LAW (Directive XX, Law VI) — replay is truth; the waypost is
// a proven shortcut. Every stride of sealed turns the game may seal a
// checkpoint row carrying each covered pure fold's cursor state. A reader
// resumes from it ONLY when the checkpoint proves itself (digest, state
// hash) AND stands against the living record (last covered row's id and
// sealed hash, the struck set, the hero's canon). Any disagreement is a
// silent refusal: the full walk stands in, and the full walk is always law.
//
// These seats are pure — no clock, no randomness, no store. The stride is
// the GAME'S law; the engine folds and resumes at any cut point.
import { canonicalize, sha256 } from './canonical.js';
import { rowsOf } from './rows.js';
import { cardsState, foldCardEntry, finishCards } from './cards.js';
import { presenceState, foldPresenceRow } from './presence.js';
import { worldClock, clockShape, packOf } from './clock.js';
import { tellsState, foldTellEntry, finishTells } from './tells.js';
import { standingShiftRows } from './story.js';

export const WAYPOST_VERSION = 1;
export const WAYPOST_STRIDE = 25;
export const WAYPOST_FOLDS = ['cards', 'presence', 'clock', 'tells', 'standings'];

// One blank set of fold states — the same seats the whole walks use.
function blankFolds(hero) {
  return {
    hero: hero ?? null,
    cards: cardsState(hero),
    presence: presenceState({ hero }),
    clockHours: 0,
    tells: tellsState(),
    standings: []
  };
}

// One row through every covered fold, each behind its own lawful door:
// cards take only what the rows door admits, presence and tells take the
// raw row at its absolute index, the clock sums through the clock's own
// walk (one seat, no mirrored arithmetic), and standings fold dm.story
// through the codex court's own arm — struck rows INCLUDED, exactly as
// the living codex never unwinds a shift.
function foldRowInto(folds, log, index) {
  if (rowsOf([log]).length) foldCardEntry(folds.cards, log, folds.hero);
  foldPresenceRow(folds.presence, log, index);
  folds.clockHours += worldClock([log]).totalHours;
  foldTellEntry(folds.tells, log, index);
  const dm = log && typeof log === 'object' ? log.dm : null;
  const story = dm && typeof dm === 'object' && dm.story && typeof dm.story === 'object' && !Array.isArray(dm.story) ? dm.story : null;
  if (story) {
    const shifted = standingShiftRows(story, { turn: Number.isInteger(log?.turn) ? log.turn : null });
    folds.standings.push(...shifted.rows);
  }
}

// The finish — every fold's public face, byte-identical however walked.
function finishFolds(folds) {
  const clock = clockShape(folds.clockHours);
  return {
    cards: finishCards(folds.cards),
    presence: serializePresence(folds.presence),
    travel: { ground: folds.presence.ground, stands: folds.presence.stands.map((s) => ({ ...s })) },
    clock,
    pack: packOf(clock),
    tells: finishTells(folds.tells),
    standings: folds.standings.map((r) => ({ ...r }))
  };
}

// Presence state to plain rows and back — arrays of pairs in insertion
// order, so a revived walk seats every soul exactly where it stood.
function serializePresence(state) {
  return {
    known: [...state.known],
    heroName: state.heroName,
    regions: [...state.regions],
    souls: [...state.souls].map(([key, soul]) => [key, {
      name: soul.name,
      last: soul.last && typeof soul.last === 'object' ? { ...soul.last } : null,
      stood: [...soul.stood].map(([g, v]) => [g, { ...v }])
    }]),
    party: [...state.party].map(([key, p]) => [key, { ...p }]),
    ground: state.ground,
    stands: state.stands.map((s) => ({ ...s }))
  };
}

// Born fail-closed (the witness law): every list behind Array.isArray,
// rot revives to nothing rather than to a crash.
function revivePresence(serial = {}) {
  const souls = new Map();
  for (const row of (Array.isArray(serial.souls) ? serial.souls : [])) {
    if (!Array.isArray(row) || row.length < 2 || !row[1] || typeof row[1] !== 'object') continue;
    const soul = row[1];
    souls.set(row[0], {
      name: soul.name,
      last: soul.last && typeof soul.last === 'object' ? { ...soul.last } : null,
      stood: new Map((Array.isArray(soul.stood) ? soul.stood : []).map(([g, v]) => [g, { ...v }]))
    });
  }
  return {
    known: new Map(Array.isArray(serial.known) ? serial.known : []),
    heroName: typeof serial.heroName === 'string' ? serial.heroName : '',
    regions: new Set(Array.isArray(serial.regions) ? serial.regions : []),
    souls,
    party: new Map((Array.isArray(serial.party) ? serial.party : []).map(([k, p]) => [k, { ...p }])),
    ground: typeof serial.ground === 'string' ? serial.ground : null,
    stands: (Array.isArray(serial.stands) ? serial.stands : []).map((s) => ({ ...s }))
  };
}

function serializeFolds(folds) {
  return {
    cards: structuredClone({ cards: folds.cards.cards, order: folds.cards.order, turnCursor: folds.cards.turnCursor }),
    presence: serializePresence(folds.presence),
    clockHours: folds.clockHours,
    tells: { corpus: folds.tells.corpus, offenders: folds.tells.offenders.map((o) => ({ ...o })) },
    standings: folds.standings.map((r) => ({ ...r }))
  };
}

// Revive NEVER hands the checkpoint's own objects to the resumed walk —
// the checkpoint stays sealed evidence; the walk gets fresh copies.
function reviveFolds(checkpoint, hero) {
  const serial = checkpoint && typeof checkpoint === 'object' && checkpoint.folds && typeof checkpoint.folds === 'object' ? checkpoint.folds : {};
  const cardsSerial = serial.cards && typeof serial.cards === 'object' ? serial.cards : {};
  return {
    hero: hero ?? null,
    cards: structuredClone({
      cards: cardsSerial.cards && typeof cardsSerial.cards === 'object' ? cardsSerial.cards : {},
      order: Array.isArray(cardsSerial.order) ? cardsSerial.order : [],
      turnCursor: Number.isInteger(cardsSerial.turnCursor) ? cardsSerial.turnCursor : -1
    }),
    presence: revivePresence(serial.presence && typeof serial.presence === 'object' ? serial.presence : {}),
    clockHours: Number.isFinite(serial.clockHours) ? serial.clockHours : 0,
    tells: {
      corpus: typeof serial.tells?.corpus === 'string' ? serial.tells.corpus : '',
      offenders: Array.isArray(serial.tells?.offenders) ? serial.tells.offenders.map((o) => ({ ...o })) : []
    },
    standings: Array.isArray(serial.standings) ? serial.standings.map((r) => ({ ...r })) : []
  };
}

// The full walk — the truth the waypost must match, and the reader every
// gate compares against. Same seats, first row to last.
export function walkFolds({ hero = null, entries = [] } = {}) {
  const rows = Array.isArray(entries) ? entries : [];
  const folds = blankFolds(hero);
  rows.forEach((log, i) => foldRowInto(folds, log, i));
  return finishFolds(folds);
}

// Seal a checkpoint over a covered stretch (the record's head slice,
// verbatim rows). Deterministic and serializable: identity pins the last
// covered row by its own id and sealed hash, carries the covered struck
// set and the hero's canon, and the digest and state hash bind it all.
export async function foldCheckpoint({ hero = null, entries = [] } = {}) {
  const rows = Array.isArray(entries) ? entries : [];
  const folds = blankFolds(hero);
  rows.forEach((log, i) => foldRowInto(folds, log, i));
  const serial = serializeFolds(folds);
  const struck = [];
  rows.forEach((log, i) => { if (log?.redacted) struck.push(i); });
  const last = rows.length ? rows[rows.length - 1] : null;
  const identity = {
    v: WAYPOST_VERSION,
    rows: rows.length,
    turn: Number.isInteger(last?.turn) ? last.turn : null,
    lastLogId: typeof last?.id === 'string' ? last.id : null,
    head: typeof last?.recordHash === 'string' ? last.recordHash : null,
    heroCanon: canonicalize(hero ?? null),
    struck
  };
  const digest = await sha256(canonicalize(identity));
  const stateHash = await sha256(canonicalize(serial));
  return { ...identity, digest, stateHash, folds: serial };
}

// The record court (sync, cheap — sits before EVERY resumed read): does
// this checkpoint still describe the living record? Any disagreement —
// fewer rows than covered, a different row seated at the cut, a strike
// at or behind the waypost, another hero's canon — and it does not stand.
export function checkpointStands(checkpoint, { hero = null, entries = [] } = {}) {
  const cp = checkpoint;
  if (!cp || typeof cp !== 'object' || Array.isArray(cp)) return false;
  if (cp.v !== WAYPOST_VERSION) return false;
  if (!Number.isInteger(cp.rows) || cp.rows < 1) return false;
  const logs = Array.isArray(entries) ? entries : [];
  if (logs.length < cp.rows) return false;
  const last = logs[cp.rows - 1];
  if (!last || typeof last !== 'object') return false;
  if ((cp.lastLogId ?? null) !== (typeof last.id === 'string' ? last.id : null)) return false;
  if ((cp.head ?? null) !== (typeof last.recordHash === 'string' ? last.recordHash : null)) return false;
  if (cp.heroCanon !== canonicalize(hero ?? null)) return false;
  if (!Array.isArray(cp.struck)) return false;
  const struckNow = [];
  for (let i = 0; i < cp.rows; i += 1) { if (logs[i]?.redacted) struckNow.push(i); }
  if (canonicalize(cp.struck) !== canonicalize(struckNow)) return false;
  if (!cp.folds || typeof cp.folds !== 'object' || Array.isArray(cp.folds)) return false;
  return true;
}

// The proof court (async — sits once at hydrate): is the checkpoint
// internally whole? The digest re-derives from its own identity claims;
// the state hash re-derives from the carried folds. A bent claim or a
// bent fold and it proves nothing. (The journal's own seal — row hash
// and signature — guards the envelope; this guards the payload.)
export async function checkpointProves(checkpoint) {
  const cp = checkpoint;
  if (!cp || typeof cp !== 'object' || Array.isArray(cp)) return false;
  const identity = { v: cp.v, rows: cp.rows, turn: cp.turn, lastLogId: cp.lastLogId, head: cp.head, heroCanon: cp.heroCanon, struck: cp.struck };
  try {
    if ((await sha256(canonicalize(identity))) !== cp.digest) return false;
    if ((await sha256(canonicalize(cp.folds))) !== cp.stateHash) return false;
  } catch {
    return false;
  }
  return true;
}

// Resume: revive the carried states and fold ONLY the rows after the cut,
// each at its true absolute index. Byte-identical to the full walk over
// the whole record — that is the law the twin proves, and the reader
// only ever arrives here through the two courts above.
export function resumeFolds(checkpoint, entriesAfter = [], { hero = null } = {}) {
  const folds = reviveFolds(checkpoint, hero);
  const tail = Array.isArray(entriesAfter) ? entriesAfter : [];
  const base = Number.isInteger(checkpoint?.rows) ? checkpoint.rows : 0;
  tail.forEach((log, i) => foldRowInto(folds, log, base + i));
  return finishFolds(folds);
}
