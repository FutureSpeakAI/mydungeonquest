// ------------------------------------------------------------
// G14 — THE ORDER CHECKER. A pure function over an extracted feed
// structure, so the sabotage tooth (Section 5.6) can bite it with a
// deliberately shuffled synthetic fixture. No DOM here: the harness
// extracts, this file judges.
// ------------------------------------------------------------

export interface TurnParts {
  /** DOM order of the parts present inside one turn group. */
  order: Array<'player' | 'roll' | 'deed' | 'narration' | 'suggestions'>;
  turn: number | null; // turn citation stamped on the group, if any
  speakers: string[]; // attributed speaker labels in this group's narration
}

export interface FeedRow {
  kind: 'recap' | 'page' | 'page-pending' | 'tick' | 'redacted' | 'turn';
  turn?: TurnParts;
  chapterRoman?: string | null; // for 'page' rows
}

const CANON_ORDER = ['player', 'roll', 'deed', 'narration', 'suggestions'] as const;

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
function romanIndex(numeral: string | null | undefined): number {
  const at = ROMAN.indexOf(String(numeral || '').trim());
  return at === -1 ? Number.NaN : at;
}

export interface FeedCheckInput {
  rows: FeedRow[];
  /** soul name (lowercased) → turn it was introduced (from the seeded codex). */
  introducedBy?: Record<string, number>;
  heroName?: string;
}

/** Returns a list of violations; an empty list is a lawful feed. */
export function checkFeedOrder({ rows, introducedBy = {}, heroName = '' }: FeedCheckInput): string[] {
  const violations: string[] = [];
  const hero = heroName.trim().toLowerCase();

  // (c) The recap card, when present, is first — and only ever first.
  rows.forEach((row, index) => {
    if (row.kind === 'recap' && index !== 0) violations.push(`recap card at index ${index} — mid-feed recap`);
  });

  // (a) Within any single turn group the DOM order is canonical.
  for (const row of rows) {
    if (row.kind !== 'turn' || !row.turn) continue;
    const seen = row.turn.order.map((part) => CANON_ORDER.indexOf(part));
    for (let i = 1; i < seen.length; i += 1) {
      if (seen[i] < seen[i - 1]) {
        violations.push(`turn ${row.turn.turn}: part "${row.turn.order[i]}" renders before "${row.turn.order[i - 1]}"`);
      }
    }
    const counts = row.turn.order.reduce<Record<string, number>>((acc, part) => ({ ...acc, [part]: (acc[part] || 0) + 1 }), {});
    for (const part of ['player', 'roll', 'deed', 'suggestions']) {
      if ((counts[part] || 0) > 1) violations.push(`turn ${row.turn.turn}: duplicate "${part}" part`);
    }
  }

  // (b) Turn citations strictly increase; no duplicates; no two adjacent
  // ticks without a turn between them.
  let lastTurn = -Infinity;
  for (const row of rows) {
    if (row.kind !== 'turn' || row.turn?.turn == null) continue;
    if (row.turn.turn <= lastTurn) violations.push(`turn stamp ${row.turn.turn} does not increase past ${lastTurn}`);
    lastTurn = row.turn.turn;
  }
  for (let i = 1; i < rows.length; i += 1) {
    if (rows[i].kind === 'tick' && rows[i - 1].kind === 'tick') {
      violations.push(`adjacent tick dividers at index ${i - 1}/${i} with no turn between them`);
    }
  }

  // (d) The pending page placeholder sits only at a chapter boundary —
  // adjacent to a bound chapter page or at the feed's end, never wedged
  // between two ordinary turns.
  rows.forEach((row, index) => {
    if (row.kind !== 'page-pending') return;
    const prev = rows[index - 1]?.kind;
    const next = rows[index + 1]?.kind;
    const boundary = prev === 'page' || next === 'page' || next === undefined || next === 'recap';
    if (!boundary && prev === 'turn' && next === 'turn') {
      violations.push(`pending page at index ${index} sits between two ordinary turns`);
    }
  });

  // (e) Chapter headers ascend in roman order.
  let lastRoman = -1;
  for (const row of rows) {
    if (row.kind !== 'page' || !row.chapterRoman) continue;
    const at = romanIndex(row.chapterRoman);
    if (Number.isNaN(at)) violations.push(`unreadable chapter numeral "${row.chapterRoman}"`);
    else if (at <= lastRoman) violations.push(`chapter ${row.chapterRoman} does not ascend past ${ROMAN[lastRoman]}`);
    else lastRoman = at;
  }

  // (g) Every attributed speaker exists in the Codex at that point.
  for (const row of rows) {
    if (row.kind !== 'turn' || !row.turn) continue;
    for (const speaker of row.turn.speakers) {
      const name = speaker.trim().toLowerCase();
      if (!name || name === hero || name === 'narrator' || name === 'dm') continue;
      const introduced = introducedBy[name];
      if (introduced === undefined) {
        violations.push(`turn ${row.turn.turn}: speaker "${speaker}" has no introduction card at all`);
      } else if (row.turn.turn != null && introduced > row.turn.turn) {
        violations.push(`turn ${row.turn.turn}: speaker "${speaker}" speaks before their introduction on turn ${introduced}`);
      }
    }
  }

  return violations;
}
