// ------------------------------------------------------------
// THE LIVE SMITH (Directive XIII §5) — one court for /api/smith.
// The dice in both forge doors call here on the illuminated tier. One
// model call deals a strict-schema candidate set at the pinned
// temperature; every candidate is judged (validator + sweeps) before it
// is shown; refused candidates are discarded and redrawn (two redraws at
// most); an empty bench means the MOCK smith answers — the forge degrades,
// it never errors. Keyless, the mock smith answers directly: same
// contract, same shapes, deterministic in (seed, scope, field, locked).
// ------------------------------------------------------------
import {
  mockSmith, validateCandidate, validateCandidateSet, smithToolSchema,
  CANDIDATE_COUNT, SMITH_FIELDS
} from 'fatescript/smith';
// (58B review) The settled tables ride the ask as DATA when the calling
// is not locked, so the live smith can copy a calling's body exactly.
import { CLASSES, BEARINGS, BACKGROUNDS } from 'fatescript/forgeRolls';
import { spendAllowed, recordSpend, logLine } from './watchtower.js';

const SMITH_MODEL = () => process.env.SMITH_MODEL || process.env.DM_MODEL || 'claude-sonnet-4-6';
const SMITH_BUDGET_MS = Number(process.env.SMITH_TIMEOUT_MS || 30000);
const MAX_REDRAWS = 2;

// LISTLESS LEGISLATION: the law below names contracts, never example
// values — the locked remainder rides as data in the user message.
const SMITH_LAW = [
  'You are the smith of a PG-13 storybook tabletop tale. You deal ready answers a player may adopt, redraw, or overwrite — the player\u2019s own words always outrank yours.',
  'Deal exactly the asked number of candidates through the tool, and nothing outside the tool.',
  'Each candidate answers the WHOLE ask: every unlocked key, no locked key, no stranger key.',
  'The locked remainder is settled law: candidates must agree with it in spirit and letter, and must never restate, echo into their own keys, or contradict it.',
  'Candidates are distinct from one another — three different roads, not one road three times.',
  'Write in plain, warm, concrete language fit for the rating. Never demand that anything be recognizable, legible, labeled, or lettered.',
  // (58B.3) The bounds sentence. The schema's stated limits proved
  // ADVISORY to the model unless the law binds them — six over-fence
  // candidates in one probe. Listless: names the schema's own contract.
  'Every bound the tool schema declares is binding law — lengths and counts included. When in doubt, deal SHORTER and SIMPLER; an answer past a stated bound is refused whole.',
  // (58B review) The one-body sentence — listless: names the contract,
  // no rider names, no example values.
  'A dealt calling brings its own settled body with it: every companion value the settled tables give that calling rides exactly as the tables give it, never invented, never borrowed from another calling.'
].join(' ');

function smithUserMessage({ scope, field, locked, seed }) {
  const ask = scope === 'field' ? `Deal candidates for the single field "${field}".` : `Deal whole-${scope} candidates.`;
  // (58B.3) The hard-wall line rides the ASK as well as the law: models
  // weight the user message heavily, and the fence proved advisory when
  // it rode the schema alone. Names the contract, never a value.
  // (58B review) When a calling may be DEALT (hero scope, or a className
  // respin, with no calling locked), the settled tables ride as DATA so
  // the smith can copy a calling's body byte-exact — the court refuses
  // an invented body whole. Locked callings need no table: the schema
  // itself deals their body as settled law.
  const dealsCalling = (scope === 'hero' || (scope === 'field' && field === 'className')) && !(locked ?? {}).className;
  const table = dealsCalling
    ? `\nThe settled callings and their bodies (copy the dealt calling's body exactly):\n${JSON.stringify(CLASSES.map((c) => ({ ...c, bearing: BEARINGS[c.className], background: BACKGROUNDS[c.className] })))}`
    : '';
  return `${ask}\nEvery stated character bound is a hard wall — land comfortably under it.${table}\nTable seed: ${seed}\nThe locked remainder (settled, untouchable):\n${JSON.stringify(locked ?? {}, null, 2)}`;
}

function withBudget(promise, ms) {
  let timer;
  const gate = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`smith timed out after ${ms}ms`)), ms); });
  return Promise.race([promise, gate]).finally(() => clearTimeout(timer));
}

async function anthropicCandidates({ scope, field, locked, seed }, note) {
  const request = {
    model: SMITH_MODEL(),
    // (58B.3) Three whole-world candidates can lawfully carry ~2000
    // characters of covenant EACH: 2000 tokens truncates the tool JSON
    // mid-set and the bench empties silently. Headroom is cheap; a
    // truncated deal is invisible.
    max_tokens: 4000,
    // (58B.3 lesson) `temperature` is DEPRECATED for this model family —
    // Anthropic 400s the parameter outright (July 2026), which emptied
    // the bench and silently seated the floor. The model governs its own
    // dial; SMITH_TEMPERATURE remains the floor's pinned dial and the
    // house's declared preference, never a claimed request parameter.
    system: [{ type: 'text', text: SMITH_LAW }],
    messages: [{ role: 'user', content: [{ type: 'text', text: smithUserMessage({ scope, field, locked, seed }) + (note ? `\n${note}` : '') }] }],
    tools: [{ name: 'smith_candidates', description: 'The only valid smith answer: the full candidate set.', input_schema: smithToolSchema(scope, field, locked) }],
    tool_choice: { type: 'tool', name: 'smith_candidates' }
  };
  const response = await withBudget(fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(request)
  }), SMITH_BUDGET_MS);
  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${await response.text()}`);
  const json = await response.json();
  const set = json.content?.find((item) => item.type === 'tool_use' && item.name === 'smith_candidates')?.input?.candidates;
  return Array.isArray(set) ? set : [];
}

// The public shape of a smith ask — index.js validates the envelope, this
// court judges the goods. Returns a lawful, already-validated result and
// NEVER throws for provider trouble: the mock floor is the answer of last
// resort, marked honestly as such.
export async function smithCandidates({ scope, field = null, locked = {}, seed = 0 }) {
  const floor = () => mockSmith({ scope, field, locked, seed });
  if (!process.env.ANTHROPIC_API_KEY) return floor();
  if (!(await spendAllowed('anthropic'))) { logLine('smith', 'ceiling reached — the mock smith answers'); return floor(); }
  const lawful = [];
  const seen = new Set();
  const refusals = [];
  let redraws = 0;
  let discarded = 0;
  try {
    for (let call = 0; call <= MAX_REDRAWS && lawful.length < CANDIDATE_COUNT; call += 1) {
      if (call > 0) redraws += 1;
      // (58B.3) Redraws carry the court's refusals BY NAME, as data — a
      // fresh deal that cannot see why the last fell keeps falling the
      // same way. Reasons are engine-authored strings riding the user
      // message, never the law string: listless legislation holds.
      const note = call > 0 ? `A previous set fell short: deal a FRESH set, fully lawful, distinct from anything you dealt before.${refusals.length ? `\nThe court refused earlier candidates, by name — answer these exactly:\n${[...new Set(refusals)].slice(-8).join('\n')}` : ''}` : '';
      const dealt = await anthropicCandidates({ scope, field, locked, seed }, note);
      for (const candidate of dealt) {
        const verdict = validateCandidate(scope, field, candidate, locked);
        const bytes = JSON.stringify(candidate);
        if (verdict.ok && !seen.has(bytes)) { seen.add(bytes); lawful.push(candidate); }
        else if (!verdict.ok) { discarded += 1; refusals.push(...verdict.errors); logLine('smith', `candidate refused: ${verdict.errors.join('; ')}`); }
        if (lawful.length >= CANDIDATE_COUNT) break;
      }
    }
  } catch (error) {
    logLine('smith', `live smith failed: ${error.message}`);
  }
  if (lawful.length < CANDIDATE_COUNT) { logLine('smith', `bench empty after ${redraws} redraw(s) — the mock smith answers`); return floor(); }
  const candidates = lawful.slice(0, CANDIDATE_COUNT);
  const verdict = validateCandidateSet(scope, field, candidates, locked);
  if (!verdict.ok) { logLine('smith', `final set refused: ${verdict.errors.join('; ')}`); return floor(); }
  recordSpend('anthropic');
  // temperature is honest-null on the live seat: the model family refused
  // the dial, so no value is CLAIMED (toll-house precedent: honest-null,
  // never a guess). The mock floor still declares its own 0.9.
  return { scope, field, seed, provider: 'anthropic', model: SMITH_MODEL(), temperature: null, redraws, discarded, candidates };
}

// Envelope law for the route: scope named, field lawful when asked,
// locked a plain object, seed a finite number. Strangers get a plain no.
export function validSmithAsk(body) {
  if (!body || typeof body !== 'object') return 'the ask must be an object';
  if (!['world', 'hero', 'field'].includes(body.scope)) return 'scope must name world, hero, or field';
  if (body.scope === 'field' && !SMITH_FIELDS.includes(body.field)) return 'that field owns no die';
  if (body.locked != null && (typeof body.locked !== 'object' || Array.isArray(body.locked))) return 'locked must be a plain object';
  if (body.seed != null && !Number.isFinite(Number(body.seed))) return 'seed must be a number';
  return null;
}
