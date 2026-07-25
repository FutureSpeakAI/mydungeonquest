import { judgeProposals } from 'fatescript/dowryDoor';
import { withClock } from './clock.js';

// ------------------------------------------------------------
// /api/dowry — the illuminated reader over dowry pages (Directive XX,
// Article Five, Law XV), built like the Chronicler's harness but
// smaller still: one forced tool call, the ENGINE's own dowry court
// judging every proposal server-side (the same seams the table walks),
// one guided repair, and an honest decline at the floor — the client's
// keyless reader is the engine's deterministic floor, labeled as such.
//
// TEXT ONLY: the dowry takes plain pages — text and markdown. A page
// carrying control bytes is refused at this door; PDFs and binaries
// are named in the chronicle as a deferral, not smuggled in as bytes.
//
// NO INVENTION: the tool schema demands a verbatim citation per
// proposal and voice cards ONLY from identity the pages themselves
// state — and the judge refuses whatever the model invented anyway.
// ------------------------------------------------------------

const MAX_PAGES = 8;
const MAX_PAGE_CHARS = 200000;
const CONTROL_BYTES = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;

// The tool schema is what the model actually sees: every enum, bound,
// and required key the judge enforces must be declared here, or the
// model emits valid-but-rejected proposals and the harness burns its
// one repair (the schema-mirror law).
export const dowryToolSchema = {
  type: 'object', additionalProperties: false, required: ['proposals'],
  properties: {
    proposals: {
      type: 'array', maxItems: 60,
      items: {
        type: 'object', additionalProperties: false, required: ['kind', 'op', 'citation'],
        properties: {
          kind: { type: 'string', enum: ['cast', 'region', 'fact'], description: 'cast = a soul; region = a place; fact = one truth about a soul already proposed or standing.' },
          op: {
            type: 'object', additionalProperties: false, required: ['name'],
            properties: {
              name: { type: 'string', maxLength: 80, description: 'The page\u2019s own name for the soul or place — never invented, never merged.' },
              role: { type: 'string', maxLength: 40, description: 'Only if the page states it. Never "villain".' },
              visual: { type: 'string', maxLength: 360, description: 'The page\u2019s own descriptive words. Do not embellish.' },
              fact_add: { type: 'string', maxLength: 160, description: 'fact ops only: the truth, in the page\u2019s own words.' },
              voice_card: {
                type: 'object', additionalProperties: false,
                properties: {
                  gender: { type: 'string', enum: ['feminine', 'masculine', 'neutral'] },
                  age_band: { type: 'string', enum: ['child', 'young', 'adult', 'elder'] },
                  timbre: { type: 'string', maxLength: 24 }
                },
                description: 'ONLY from identity the page STATES (\u201cthe old woman\u201d, \u201cthe boy\u201d). Omit entirely when the page is silent — neutral defaults are the player\u2019s to amend, never yours to guess.'
              }
            }
          },
          citation: {
            type: 'object', additionalProperties: false, required: ['source', 'quote'],
            properties: {
              source: { type: 'string', maxLength: 80, description: 'The exact page name, as given.' },
              quote: { type: 'string', maxLength: 400, description: 'ONE line of the page, VERBATIM — byte for byte, including its bullet mark. A paraphrase is refused by the no-invention law. The quoted line must itself CONTAIN the proposal\u2019s exact name — a quote grounds only what it names; a true line about one thing cannot propose another.' }
            }
          }
        }
      }
    }
  }
};

const MODEL = () => process.env.DOWRY_MODEL || process.env.DM_MODEL || 'claude-sonnet-4-6';
const BUDGET_MS = () => Number(process.env.DOWRY_TIMEOUT_MS || 90000);

function buildDowryPrompt(pages) {
  return [
    'You are the Dowry Reader of MyDungeon.Quest: a careful archivist reading a player\u2019s pages from an elder table (session notes, dead campaign records, homebrew lore) so their world can be carried into a new tale.',
    'Propose ordinary story operations — souls (cast), places (region), single truths (fact) — via ONE propose_dowry tool call.',
    'THE NO-INVENTION LAW: every proposal must cite ONE line of a page VERBATIM (byte for byte), and the cited line must itself NAME the soul, place, or fact-subject it grounds — the proposal\u2019s exact name must appear within the quoted words, or the court refuses it. Propose only what the pages plainly state. Never merge two names into one soul, never invent a role, a look, or a voice the page does not state. When a page states identity ("the old woman", "a boy of nine"), you may seat a voice_card from those stated words alone; when the page is silent, OMIT voice_card entirely.',
    'Facts attach to a soul you have proposed in this same reading, or to a soul the pages name plainly. The player will bless or refuse each proposal; propose honestly and let refusal do its work.',
    'THE PAGES:',
    ...pages.map((page) => `=== ${page.name} ===\n${page.text}`)
  ].join('\n\n');
}

async function anthropicProposals(pages, repair = null) {
  const messages = [{ role: 'user', content: [{ type: 'text', text: buildDowryPrompt(pages) }] }];
  if (repair) {
    messages.push({ role: 'assistant', content: [{ type: 'tool_use', id: 'dowry_repair', name: 'propose_dowry', input: repair.raw }] });
    messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: 'dowry_repair', is_error: true, content: `The rules client REJECTED proposals from that reading. Citations must be VERBATIM lines of the pages; collisions and unlawful ops are refused. Fix ONLY these violations and resend the complete corrected propose_dowry call:\n- ${repair.errors.join('\n- ')}` }] });
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL(), max_tokens: 4000, messages,
      tools: [{ name: 'propose_dowry', description: 'The only valid Dowry Reader response.', input_schema: dowryToolSchema }],
      tool_choice: { type: 'tool', name: 'propose_dowry' }
    })
  });
  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${await response.text()}`);
  const json = await response.json();
  const call = json.content?.find((item) => item.type === 'tool_use' && item.name === 'propose_dowry')?.input;
  if (!call) throw new Error('Anthropic returned no propose_dowry tool call');
  return call;
}

function pagesLawful(pages) {
  if (!Array.isArray(pages) || !pages.length) return 'the dowry needs at least one page on the table';
  if (pages.length > MAX_PAGES) return 'the table holds eight pages — bring the rest to another dowry';
  for (const page of pages) {
    if (!page || typeof page !== 'object' || Array.isArray(page)) return 'a page must carry a name and its text';
    if (typeof page.name !== 'string' || !page.name.trim() || page.name.length > 80) return 'every page needs a name of its own (80 characters at most)';
    if (typeof page.text !== 'string' || !page.text.trim()) return 'a page without words is no page';
    if (page.text.length > MAX_PAGE_CHARS) return 'a page that long will not fit the table — split it before the next telling';
    if (CONTROL_BYTES.test(page.text)) return 'the dowry takes plain pages only — this one is not text';
  }
  return null;
}

// Proposals ride WHOLE from the model to the judge — top-level id and
// blessed are seated here; the op itself is never rebuilt field by
// field, so anything unlawful meets the court instead of a launderer.
const normalize = (rows) => (Array.isArray(rows) ? rows : [])
  .filter((row) => row && typeof row === 'object' && !Array.isArray(row))
  .map((row, index) => ({ id: `dowry-i${index}`, kind: row.kind, op: row.op, citation: row.citation, blessed: false }));

export async function getDowryProposals(body = {}) {
  const refusal = pagesLawful(body.pages);
  if (refusal) return { declined: true, provider: 'none', proposals: [], error: refusal };
  if (!process.env.ANTHROPIC_API_KEY) return { declined: true, provider: 'none', proposals: [] };
  const pages = body.pages.map((page) => ({ name: page.name.trim(), text: page.text }));
  const court = { cast: [], regions: [], hero: null, pages };
  try {
    const raw = await withClock(anthropicProposals(pages), BUDGET_MS(), 'the dowry reader overran the pen\u2019s clock');
    let rows = normalize(raw.proposals);
    let verdicts = judgeProposals(rows, court);
    if (verdicts.some((verdict) => !verdict.ok)) {
      // ONE guided repair — the court's own words ride back whole.
      const errors = verdicts.flatMap((verdict) => verdict.errors);
      const mended = await withClock(anthropicProposals(pages, { raw, errors }), BUDGET_MS(), 'the dowry repair overran the pen\u2019s clock');
      rows = normalize(mended.proposals);
      verdicts = judgeProposals(rows, court);
    }
    const proposals = rows.filter((_, index) => verdicts[index].ok);
    // THE STRICT DOOR: this judge never turns playersHand — a reader's
    // invention (a name the cited line never wrote) dies HERE, before
    // the player ever sees it. And honestly: a reading the court
    // refused WHOLE is a decline, not an empty triumph — the client
    // falls to the floor and labels it.
    if (!proposals.length && rows.length) return { declined: true, provider: 'none', proposals: [], error: 'the illuminated reading did not survive the court — the floor reads instead' };
    return { declined: false, provider: 'anthropic', model: MODEL(), proposals };
  } catch (error) {
    console.error('[dowry] the illuminated reader stumbled:', error.message);
    return { declined: true, provider: 'none', proposals: [] };
  }
}
