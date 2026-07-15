// THE COMMONS GATE (engine floor) — the Commons Law holds or this file
// turns the build red. The shelf itself is the house's; what the engine
// composes for it is judged here.
import assert from 'node:assert/strict';
import { escapeHtml, pickTurningPoint, composeShareCard, renderShareCardHtml, shelfModel, forkGenesis } from '../src/shareCard.js';
import { fixtureCodex, fixtureEntries } from './fixtures.mjs';

const entries = fixtureEntries();

// The turning point is the boldest deed that landed — DC first, the
// earliest on a tie — and its quote is verbatim from the sealed turn.
const turning = pickTurningPoint(entries);
assert.equal(turning.entry.id, 'e3');
assert.equal(turning.dc, 18);
assert.equal(turning.quote, 'Stone gives way; the lantern gutters, and holds.');
const tied = [...entries, { ...entries[2], id: 'e5', resolution: { kind: 'd20', total: 30, dc: 18, success: true } }];
assert.equal(pickTurningPoint(tied).entry.id, 'e3', 'the earliest wins the tie');

// A struck row never leaves the table, whatever its glory; ticks and
// annals never compete; a failure is not a turning point.
const glorious = { ...entries[2], id: 'e6', redacted: true, resolution: { kind: 'd20', total: 30, dc: 30, success: true } };
assert.equal(pickTurningPoint([...entries, glorious]).entry.id, 'e3');
assert.equal(pickTurningPoint([{ ...entries[3] }]), null, 'a failed deed is not the moment');

// The card: verbatim or absent, the strict door for plates, the credit line.
const card = composeShareCard({ worldTitle: 'The Ashen Vale', taleTitle: 'The Ford', chapterLabel: 'Chapter II', entries, plate: 'data:image/png;base64,AAAA' });
assert.equal(card.quote, 'Stone gives way; the lantern gutters, and holds.');
assert.equal(card.plate, 'data:image/png;base64,AAAA');
assert.equal(card.credit, 'Made with FateScript');
assert.equal(composeShareCard({ entries, plate: 'https://example.com/plate.png' }).plate, null, 'only attested plates walk the strict door');
assert.equal(JSON.stringify(card), JSON.stringify(composeShareCard({ worldTitle: 'The Ashen Vale', taleTitle: 'The Ford', chapterLabel: 'Chapter II', entries, plate: 'data:image/png;base64,AAAA' })), 'the same record composes the same card');

// The shelf shows text as text: a soul named <script> walks the shelf inert.
const hostile = composeShareCard({ worldTitle: `<script>alert(1)</script>`, entries, plate: null });
const html = renderShareCardHtml(hostile);
assert.ok(!html.includes('<script'), 'no live markup crosses the boundary');
assert.ok(html.includes('&lt;script&gt;'), 'the hostile name renders as text');
assert.ok(renderShareCardHtml(card).includes('\u201cStone gives way; the lantern gutters, and holds.\u201d'));
assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');

// The shelf model strikes every secret and honors every struck row —
// present, marked, and silent.
const codex = fixtureCodex();
const struck = [...entries]; struck[1] = { ...struck[1], redacted: true };
const shelf = shelfModel({ worldTitle: 'The Ashen Vale', taleTitle: 'The Ford', covenant: 'No fire may be quenched by command.', cast: codex.cast, entries: struck });
assert.ok(shelf.cast.every((soul) => !soul.secret || soul.secret.includes('struck')), 'no secret leaves the table');
assert.ok(!JSON.stringify(shelf).includes('buried the old king'), 'the secret\u2019s words are gone, not dressed up');
const struckRow = shelf.passages[1];
assert.equal(struckRow.struck, true);
assert.equal(struckRow.text, '[struck from the record]');
assert.equal(shelf.passages.length, entries.length, 'struck rows stand in their place');

// A fork carries the covenant and the world's shape — never the journal,
// never a secret — and the credit seals into the child's genesis.
const genesis = forkGenesis({ worldTitle: 'The Ashen Vale', covenant: 'No fire may be quenched by command.', regions: codex.regions, shelfUrl: 'https://mydungeon.quest/shelf/ashen-vale' });
assert.equal(genesis.covenant, 'No fire may be quenched by command.');
assert.equal(genesis.regions[0].name, 'Harrow Ford');
assert.ok(genesis.forkedFrom.includes('/shelf/ashen-vale'));
assert.ok(genesis.note.startsWith('Forked from'));
assert.ok(!JSON.stringify(genesis).includes('Mira'), 'souls do not cross a fork');
assert.ok(!JSON.stringify(genesis).includes('secret'), 'secrets do not cross a fork');

console.log('PASS \u2014 the commons gate (floor): the turning point is chosen the same way twice, quotes are verbatim or absent, plates walk the strict door, secrets and struck rows are honored in public, a <script>-named soul is inert, and a fork carries the covenant \u2014 never the journal.');
