// ---- THE WEB OF SOULS TWIN (Directive XX, Article Five, Law XIV) ----
// The engine's own court over the pure builder: the web is drawn from
// the ChronicleGraph alone — deterministic and byte-stable on repeat
// walks; every node and edge citation resolving to sealed turns that
// actually establish what is claimed; under a fixture reveals seat an
// unrevealed secret and an unrevealed tie provably ABSENT from the
// emitted bytes themselves (a secret is PLANTED and the bytes proven
// clean); an aliased soul emitting ONE node through the one road; the
// dead marked in their rest; the never-met absent; struck turns
// feeding nothing; junk failing closed. ADVERSARIAL SEATING: the
// withheld soul is log-born with real ties (no positional luck — only
// the reveals seat can hold him out), and the planted tokens ride
// lanes the builder walks past (op secrets, codex bait), so a leak of
// any class trips the byte court.
// Convicted red at birth (standing law): (α) the node filter unseated
// — the withheld soul walked into the bytes; (β) the edge gate
// unseated — a strand reached toward the unmet. Both reds observed,
// then the law restored and the court greened.
import assert from 'node:assert/strict';
import { buildSoulsWeb } from '../src/soulsWeb.js';

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
};

const dmEnvelope = (over = {}) => ({
  narration_blocks: [], suggestions: [], roll_request: null, state_updates: null,
  combat: null, cinematic: null, story: null, image_cue: null, dialogue_cue: null,
  time_advance: null, entropy_use: [], ...over
});

// The fixture tale, six sealed turns and one struck one:
//   t1 Mira enters (her op carries a PLANTED secret the cards fold must drop)
//   t2 Tam enters as "brother of Mira" — the kin strand
//   t3 Brannoc the villain enters and speaks — log-born, tied to the
//      hero, and WITHHELD by the fixture reveals seat; Mira shares his
//      scene, so a SEATED soul carries a met tie TOWARD the withheld
//      one — only the edge gate can hold that strand out (the
//      unrevealed tie, seated adversarially)
//   t4 Mira and Tam share the scene (met) and Mira's bond crosses to ally
//   t5 Edda enters; Mira is sealed an epithet, "The Rowan Witch"
//   t6 Edda falls; the epithet itself speaks — the road must land it on Mira
//   t7 REDACTED — a soul the seat would admit, struck from the record
function fixtureWorld() {
  return {
    hero: { name: 'Aldric', className: 'Warden' },
    codex: {
      arc: { evil_plot: 'DESIGN-TOKEN-7M2K drinks the valley dry' },
      cast: [{ name: 'Brannoc', role: 'villain', secret: 'BAIT-SECRET-3F0Z' }]
    },
    logs: [
      { id: 'e1', turn: 1, redacted: false, dm: dmEnvelope({ story: { cast_add: [{ name: 'Mira', role: 'healer', visual: 'Grey-eyed', voice: 'Warm', goal: 'mend the well', secret: 'SECRET-RING-9Q4X' }] } }) },
      { id: 'e2', turn: 2, redacted: false, dm: dmEnvelope({ story: { cast_add: [{ name: 'Tam', role: 'brother of Mira', visual: 'Wiry', voice: 'Quick', goal: 'map the road' }] } }) },
      { id: 'e3', turn: 3, redacted: false, dm: dmEnvelope({ narration_blocks: [{ speaker: 'Brannoc', text: 'The vale is already mine.' }, { speaker: 'Mira', text: 'The vale answers to no crown.' }], story: { cast_add: [{ name: 'Brannoc', role: 'villain', visual: 'Crowned in wax', voice: 'Cold', goal: 'drain the vale' }] } }) },
      { id: 'e4', turn: 4, redacted: false, dm: dmEnvelope({ narration_blocks: [{ speaker: 'Mira', text: 'Hold the lantern high.' }, { speaker: 'Tam', text: 'The ford is watching us.' }], story: { cast_update: [{ name: 'Mira', bond_delta: 3, bond_reason: 'Stood between the hero and the arch' }] } }) },
      { id: 'e5', turn: 5, redacted: false, dm: dmEnvelope({ story: { cast_add: [{ name: 'Edda', role: 'lantern-bearer', visual: 'Ash in her braid', voice: 'Low', goal: 'carry the light' }], cast_update: [{ name: 'Mira', known_as_add: 'The Rowan Witch' }] } }) },
      { id: 'e6', turn: 6, redacted: false, dm: dmEnvelope({ narration_blocks: [{ speaker: 'The Rowan Witch', text: 'The well remembers.' }], story: { cast_update: [{ name: 'Edda', status: 'dead', last_seen: 'the ford, at rest' }] } }) },
      { id: 'e7', turn: 7, redacted: true, dm: dmEnvelope({ story: { cast_add: [{ name: 'Struckborn', role: 'ally of Aldric', visual: 'Never seen', voice: 'Never heard', goal: 'never sealed' }] } }) }
    ]
  };
}

// The fixture reveals seat — the wiki's own answer, handed in whole.
// Brannoc is log-born and tied, yet WITHHELD; Struckborn is admitted by
// the seat yet struck from the record; the epithet is no name at all.
const KNOWN = new Set(['aldric', 'mira', 'tam', 'edda', 'struckborn']);

// ---- 1. The walk itself, deep-frozen: the builder mutates nothing ----
const world = deepFreeze(fixtureWorld());
const web = buildSoulsWeb(world, { known: KNOWN });

// ---- 2. Byte-stable on repeat walks — the same tale, the same bytes ----
const again = buildSoulsWeb(JSON.parse(JSON.stringify(fixtureWorld())), { known: new Set(KNOWN) });
assert.equal(JSON.stringify(web), JSON.stringify(again), 'two walks of the same record weave byte-identical webs');

// ---- 3. The seated world: introduction order, the hero marked ----
assert.deepEqual(web.nodes.map((node) => node.name), ['Aldric', 'Mira', 'Tam', 'Edda'], 'the known souls stand in the record\u2019s own introduction order');
assert.deepEqual(web.nodes.map((node) => node.hero), [true, false, false, false], 'the hero alone wears the hero mark');
assert.equal(web.nodes.find((node) => node.name === 'Mira').bond, 3, 'bond weight rides the node');

// ---- 4. The dead render marked, in their rest ----
assert.equal(web.nodes.find((node) => node.name === 'Edda').status, 'dead', 'the fallen are marked as the record remembers them');

// ---- 5. The strands: kin, ally, met — and their citations ----
const strand = (type) => web.edges.filter((edge) => edge.type === type);
assert.deepEqual(strand('kin').map((edge) => [edge.from, edge.to, edge.cites]), [['Tam', 'Mira', [2]]], 'the kin strand cites the turn the brotherhood entered the record');
assert.deepEqual(strand('ally').map((edge) => [edge.from, edge.to, edge.cites]), [['Mira', 'Aldric', [4]]], 'the ally strand cites the turn the bond was proven');
assert.deepEqual(strand('met').map((edge) => [edge.from, edge.to, edge.cites]), [['Mira', 'Tam', [4]]], 'one shared scene, ONE met strand — a mutual tie never doubles');

// ---- 6. Every citation resolves to a sealed, unstruck turn that touches its claimants ----
const sealedTurns = new Map(fixtureWorld().logs.filter((entry) => !entry.redacted).map((entry) => [entry.turn, entry]));
const touches = (entry, name) => JSON.stringify(entry.dm).toLowerCase().includes(name.toLowerCase());
for (const node of web.nodes) {
  assert.ok(node.cites.length > 0 || node.hero, `${node.name} carries citations`);
  for (const turn of node.cites) {
    const entry = sealedTurns.get(turn);
    assert.ok(entry, `node ${node.name} cites turn ${turn} — a sealed, unstruck turn`);
    if (!node.hero) assert.ok(touches(entry, node.name) || touches(entry, 'The Rowan Witch'), `turn ${turn} actually touches ${node.name}`);
  }
}
for (const edge of web.edges) {
  assert.equal(edge.cites.length, 1, 'every strand carries its establishing turn');
  const entry = sealedTurns.get(edge.cites[0]);
  assert.ok(entry, `the ${edge.type} strand cites a sealed turn`);
}
assert.deepEqual(web.nodes.find((node) => node.name === 'Mira').cites, [1, 3, 4, 5, 6], 'Mira\u2019s page in the web cites entry, the shared scene, bond, epithet, and the epithet\u2019s own words');

// ---- 7. THE PLANTED SECRET: the bytes themselves are clean ----
const bytes = JSON.stringify(web);
for (const token of ['SECRET-RING-9Q4X', 'DESIGN-TOKEN-7M2K', 'BAIT-SECRET-3F0Z']) {
  assert.ok(!bytes.includes(token), `a planted secret (${token}) never reaches the emitted bytes — filtered at the builder, not at a surface`);
}

// ---- 8. THE UNREVEALED TIE AND THE NEVER-MET: absence, not a teaser ----
assert.ok(!bytes.includes('Brannoc'), 'the withheld soul is ABSENT from the bytes — log-born, tied, and still unseated, because only the reveals seat admits');
assert.ok(!web.edges.some((edge) => edge.type === 'enemy'), 'the unrevealed enemy strand is absent with him');
assert.ok(!bytes.includes('Struckborn'), 'a struck turn feeds nothing — the seat admits him, the record refuses him');

// ---- 9. THE ONE ROAD: an aliased soul is ONE node, under her own name ----
assert.equal(web.nodes.filter((node) => node.name === 'Mira').length, 1, 'one soul, one node');
assert.ok(!bytes.includes('The Rowan Witch'), 'the epithet mints no second node and rides no strand — the road landed her words on the ONE card');

// ---- 10. The seat is the law, not a hardcode: admit the villain, he seats ----
const wide = buildSoulsWeb(fixtureWorld(), { known: new Set([...KNOWN, 'brannoc']) });
assert.ok(wide.nodes.some((node) => node.name === 'Brannoc'), 'admitted by the seat, the villain seats');
const enemy = wide.edges.find((edge) => edge.type === 'enemy');
assert.deepEqual([enemy.from, enemy.to, enemy.why, enemy.cites], ['Brannoc', 'Aldric', 'the villain of this tale', [3]], 'the enemy strand emits whole once revealed, cited to its establishing turn');

// ---- 11. Fail-closed: junk proves nothing and never crashes ----
assert.deepEqual(buildSoulsWeb(null, { known: KNOWN }), { nodes: [], edges: [] }, 'no record, no web');
assert.deepEqual(buildSoulsWeb(world, {}), { nodes: [], edges: [] }, 'no reveals seat, no world — the web fails closed');
assert.deepEqual(buildSoulsWeb(world, { known: ['aldric'] }), { nodes: [], edges: [] }, 'a seat that is not a Set seats nobody');
assert.deepEqual(buildSoulsWeb({ hero: null, logs: [null, 7, [], 'rot'] }, { known: KNOWN }), { nodes: [], edges: [] }, 'rotten rows prove nothing');

console.log('PASS — the web of souls twin: byte-stable walks, citations resolving to the sealed turns that establish them, planted secrets absent from the emitted bytes, the withheld soul and his strand held out by the reveals seat alone, struck turns feeding nothing, one aliased soul one node through the one road, the dead marked in their rest, junk failing closed');
