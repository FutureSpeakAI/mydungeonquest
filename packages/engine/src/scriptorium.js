// ------------------------------------------------------------
// THE SCRIPTORIUM — the Scriptorium Law (Directive VI).
//
// Adapted from DeepMind's Agents' Room (Huot et al., arXiv 2410.02603):
// narrative generation improves when the work is DECOMPOSED into
// specialized subtasks instead of asked of one model in one pass. The
// house takes the decomposition and leaves the authority: four scribes
// — PLOT, CHARACTER, SETTING, CONFLICT — each receive a brief scoped to
// their one domain, and each writes PLANS, never prose. Their output is
// a scratchpad and a handful of directives the context pack serves to
// the DM. THE ROOM PLANS; THE DOOR SPEAKS — One Door is not amended
// here, it is fed.
//
// This is also half the answer to StoryScope (arXiv 2604.03136), which
// showed AI fiction is detectable by its structure and suggested
// explicit narrative planning as the bridge. The other half is already
// the architecture: in this house the player, the dice, the committed
// entropy, the spine, and the ticks author the structure. The model
// narrates locally. A detector hunting single-pass machine plotting
// finds a human at the wheel.
//
// The Floor: mockRoom below is the keyless room — a deterministic plan
// derived from the record alone, honest and labeled, so every gate and
// every keyless fork can convene the scriptorium for free.
// ------------------------------------------------------------

export const SCRIBES = ['plot', 'character', 'setting', 'conflict'];

const clean = (value, cap = 120) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, cap);
const canon = (name) => clean(name).toLowerCase();

const ROOM_LAW = 'You plan; you do not narrate. Write to the scratchpad in notes and ops; the door speaks alone.';

// Who the room leans toward: the active, non-villain soul the table has
// fed least — same deterministic taste as the ticks, so the world and
// the room agree on who is owed attention.
export function starvedSoul(codex, cards = {}) {
  const souls = (codex?.cast || []).filter((soul) => soul.status === 'active' && soul.role !== 'villain');
  if (!souls.length) return null;
  const lastActive = (soul) => cards[canon(soul.name)]?.state?.lastActive ?? soul.introduced_turn ?? 0;
  return [...souls].sort((a, b) => lastActive(a) - lastActive(b) || (b.bond ?? 0) - (a.bond ?? 0) || a.name.localeCompare(b.name))[0];
}

const pressedRegion = (codex) => (codex?.regions || []).find((region) => region.state && region.state !== 'thriving') || (codex?.regions || [])[0] || null;
const villainOf = (codex) => (codex?.cast || []).find((soul) => soul.role === 'villain') || null;

// One brief per scribe, scoped hard to its domain. The brief carries the
// room law verbatim; a scribe that narrates has left the room.
export function scribeBrief(scribe, { codex, cards = {}, clock = null } = {}) {
  const soul = starvedSoul(codex, cards);
  const region = pressedRegion(codex);
  const villain = villainOf(codex);
  const beat = codex?.spine?.beats?.[codex?.beatIndex] || null;
  const heads = {
    plot: `THE PLOT SCRIBE. Your domain is the beat and the threads — nothing else. The tale stands at beat ${codex?.beatIndex ?? 0}${beat ? ` (${clean(beat.label || beat, 60)})` : ''}. Plan what advances, and name one raised thread that must NOT resolve yet — human tales keep loose ends, and the next volume inherits them.`,
    character: `THE CHARACTER SCRIBE. Your domain is the souls — nothing else. ${soul ? `${soul.name} is owed attention: their goal — ${clean(soul.goal, 80) || 'unspoken'} — has waited longest.` : 'No soul waits; plan the next introduction instead.'} Plan agency: souls act on their goals whether or not the hero is watching.`,
    setting: `THE SETTING SCRIBE. Your domain is the ground — nothing else. ${region ? `${region.name} stands ${clean(region.state, 30) || 'unrecorded'}.` : 'No region is yet recorded.'}${clock ? ` The clock reads day ${clock.day}, hour ${clock.hour}.` : ''} Plan the pressure of place and hour on the coming scene.`,
    conflict: `THE CONFLICT SCRIBE. Your domain is the opposition — nothing else. ${villain ? `${villain.name} advances: ${clean(villain.goal, 80) || 'design unrecorded'}.` : 'The opposition is not yet named.'} Plan escalation with VARIANCE — spikes and lulls, not a steady climb; a story that only rises reads machine-made.`
  };
  if (!heads[scribe]) throw new Error(`no such scribe sits in this room: ${scribe}`);
  return `${heads[scribe]} ${ROOM_LAW}`;
}

// The keyless room: a deterministic plan from the record alone. Real
// scribes (model-backed) are a wiring phase; the Floor convenes for free.
export function mockRoom({ codex, cards = {}, clock = null } = {}) {
  const soul = starvedSoul(codex, cards);
  const region = pressedRegion(codex);
  const villain = villainOf(codex);
  const scratchpad = {
    plot: `Advance the standing beat; keep one raised thread open on purpose.`,
    character: soul ? `Feed ${soul.name}: let their goal (${clean(soul.goal, 60) || 'unspoken'}) move a step, on-screen or off.` : 'Introduce the next soul the tale needs.',
    setting: region ? `Let ${region.name} (${clean(region.state, 30)}) press on the scene.` : 'Ground the scene in a named place.',
    conflict: villain ? `${villain.name}'s design advances one stride — this chapter a lull or a spike, never a glide.` : 'Name the opposition.'
  };
  const directives = [
    scratchpad.plot,
    scratchpad.character,
    scratchpad.setting,
    scratchpad.conflict
  ].map((line) => clean(line, 180));
  return { scratchpad, directives };
}

// The court that keeps the door singular: the room's output may carry no
// prose machinery — no narration blocks, no speakers, no smuggled
// paragraphs dressed as directives.
export function assertRoomSilent(plan = {}) {
  const errors = [];
  const forbidden = new Set(['narration_blocks', 'speaker', 'text', 'dialogue_cue']);
  const walk = (node, path = 'plan') => {
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if (forbidden.has(key)) errors.push(`the room tried to speak: ${path}.${key} — the door speaks alone`);
      walk(value, `${path}.${key}`);
    }
  };
  walk(plan);
  for (const line of plan.directives || []) {
    if (typeof line !== 'string') errors.push('a directive that is not a plain string');
    else if (line.length > 200) errors.push('a directive long enough to be smuggled prose');
  }
  return { ok: errors.length === 0, errors };
}
