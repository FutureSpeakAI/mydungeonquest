import { BOOK_FONT_CSS } from './bookFonts.js';
import { ACT_NAMES, romanNumeral } from './story.js';

// ------------------------------------------------------------
// THE STORYBOOK, second binding (the Experience Cut, Phase 4).
// One compiler, three lives for the same HTML:
//   1. the page-turn reader (self-contained script; screen only;
//      skipped for the PDF binder via navigator.webdriver),
//   2. print — Letter or A5 @page CSS for /api/bind-pdf,
//   3. the standalone keepsake — book + EMBEDDED PROOF (the
//      hash-chained journal in verifier format) in a single file.
// The book model: cover (wax seal) → covenant → dramatis
// personae (one-line fates) → one chapter per spine beat: opener
// plate, the Chronicler's sealed retelling with an illuminated
// drop cap (or, honestly, the raw sealed record when no lawful
// page exists — the book always exists), dice in the margins,
// portraits at entrances → wounds, reel, memoir → the seal page.
// Every image is a data: URI; keyless plates are procedural.
// ------------------------------------------------------------

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

// THE BINDER'S DOOR, strict: only base64 image data URIs may enter the book.
// Media rows can arrive from imported chronicles, and a crafted blob MIME can
// smuggle quotes into a data URL (`data:image/png" onerror=…`) — so nothing
// is trusted: no match, no plate. The procedural plate stands in instead.
const DATA_IMAGE = /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[A-Za-z0-9+/=]+$/;
const safeDataUrl = (value) => (typeof value === 'string' && DATA_IMAGE.test(value) ? value : null);

const PAGE_RULES = {
  Letter: '@page{size:Letter;margin:.7in .65in .75in .8in}',
  A5: '@page{size:A5;margin:13mm 12mm 15mm 14mm}'
};

const ACT_TINTS = { 1: '#9f7438', 2: '#7d3b2e', 3: '#5b4a72' };

const dateWord = (ms) => (Number.isFinite(ms) && ms > 0 ? new Date(ms).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null);

// One line per soul for the dramatis personae — the fates.
function fateLine(soul) {
  if (soul.status === 'dead') {
    const memorial = (soul.known_facts || []).find((fact) => /fell|fall|died|slain|drown|lost/i.test(fact));
    return memorial || 'Fallen — the tale keeps the name.';
  }
  if (soul.status === 'missing') return 'Lost to the road.';
  const why = (soul.bond_arc || []).slice(-1)[0]?.why;
  return why ? `Walks the tale — “${why}”` : 'Walks the tale still.';
}

const initials = (name) => String(name || '?').split(/\s+/).map((part) => part[0] || '').join('').slice(0, 3).toUpperCase();

// The illuminated drop cap: the first LETTER of the passage steps forward;
// leading quote marks and such stay in the small text before it.
function dropcapped(text) {
  const raw = String(text || '');
  const at = raw.search(/[A-Za-z]/);
  if (at < 0) return esc(raw);
  return `${esc(raw.slice(0, at))}<span class="dropcap">${esc(raw[at])}</span>${esc(raw.slice(at + 1))}`;
}

export function buildStorybook({ campaign, journal, media = [], reveals = [], pageSize = 'Letter' }) {
  // THE SHELF DOOR: only this adventure's own art may bind. Rows tagged for
  // another campaign (imports, crafted files) are refused outright; untagged
  // rows are legacy export shapes and pass. Then every plate passes the
  // binder's strict door once, here — downstream code only ever sees lawful
  // data:image URIs (and esc() belts them in attributes).
  const shelf = media.filter((m) => m.campaignId == null || m.campaignId === campaign.id);
  const paints = shelf.filter((m) => m.kind === 'paint' && safeDataUrl(m.dataUrl));
  const byHash = new Map();
  for (const m of paints) if (m.assetHash && !byHash.has(m.assetHash)) byHash.set(m.assetHash, m);

  // THE ORIGINAL FACE: the hero's first bust is anchored by stable hash on
  // the campaign (heroBustHash) — renaming the hero never orphans it. Elder
  // tales without the anchor fall back to the OLDEST bust for the label (the
  // anchor law's own choice), never the latest take.
  const heroBust = (campaign.heroBustHash && byHash.get(campaign.heroBustHash)) || null;
  const isHeroName = (name) => String(campaign.hero?.name || '') !== '' && String(campaign.hero?.name) === String(name);
  const latestByLabel = (name) => {
    if (isHeroName(name) && heroBust) return heroBust.dataUrl;
    return paints.filter((m) => String(m.label || '').includes(name)).sort((a, b) => b.createdAt - a.createdAt)[0]?.dataUrl || null;
  };
  const bustFor = (name) => {
    if (isHeroName(name) && heroBust) return heroBust.dataUrl;
    const mine = paints.filter((m) => String(m.label || '').includes(name));
    mine.sort((a, b) => ((a.variant === 'bust' ? 0 : 1) - (b.variant === 'bust' ? 0 : 1)) || (a.createdAt - b.createdAt));
    return mine[0]?.dataUrl || null;
  };
  const keyArt = paints.filter((m) => m.label === 'keyart').sort((a, b) => b.createdAt - a.createdAt)[0]?.dataUrl || null;

  // REDACTION IS JOURNAL LAW FIRST, snapshot flag second. The sealed record's
  // redaction events strike turn ordinals (turn record k ↔ logs[k]); a log's
  // own `redacted` flag is the advisory belt. A turn binds only if NEITHER
  // court struck it — so a struck turn cannot ride back in on a snapshot
  // whose flag went missing.
  const turnRecords = (journal || []).filter((record) => record.type === 'turn');
  const struckHashes = new Set((journal || []).filter((record) => record.type === 'redaction').map((record) => record.payload?.targetRecordHash).filter(Boolean));
  const struckOrdinals = new Set(turnRecords.map((record, ordinal) => (struckHashes.has(record.recordHash) ? ordinal : -1)).filter((ordinal) => ordinal >= 0));
  const isBound = (log, turn) => !log.redacted && !struckOrdinals.has(turn);

  const logs = Array.isArray(campaign.logs) ? campaign.logs : [];

  // THE SEEN LAW (the retelling binds what was LIVED): the reel and the
  // chapter plates draw only from art the seen ledger proves was actually
  // dealt at the table — a plate rendered in the transcript, or a cover
  // dealt on a card. Failed takes, background jobs and alternate versions
  // never reach the book. A plate first shown on a turn later struck follows
  // its turn out (redaction outranks observation). An elder tale with NO
  // ledger binds the old way — an empty ledger there means "before the
  // ledger was kept", not "nothing was seen".
  const ordinalOfLog = new Map(logs.map((log, i) => [log.id, i]));
  const marks = (Array.isArray(reveals) ? reveals : []).filter((r) => r && r.assetHash && (r.campaignId == null || r.campaignId === campaign.id));
  const seenAt = new Map(); // assetHash -> { ts, bound, logTurn, cardBeat } — first showing wins
  for (const mark of marks) {
    const logTurn = mark.kind === 'plate' && mark.context?.logId != null ? (ordinalOfLog.get(mark.context.logId) ?? null) : null;
    const bound = mark.kind === 'card' ? true : (logTurn == null ? true : isBound(logs[logTurn] || {}, logTurn));
    const prior = seenAt.get(mark.assetHash);
    if (!prior || mark.ts < prior.ts) seenAt.set(mark.assetHash, { ts: mark.ts, bound, logTurn, cardBeat: mark.kind === 'card' ? (mark.context?.beatIndex ?? null) : null });
  }
  const ledgerLive = seenAt.size > 0;

  // The journey's plates in the order they were actually SEEN (or, for an
  // elder ledgerless tale, the order they were painted) — the reel.
  const dedupe = (list) => { const had = new Set(); return list.filter((m) => m && (had.has(m.assetHash) ? false : had.add(m.assetHash))); };
  const frames = ledgerLive
    ? dedupe([...seenAt.entries()].filter(([, mark]) => mark.bound).sort((a, b) => a[1].ts - b[1].ts).map(([hash]) => byHash.get(hash))).filter((m) => m.variant !== 'bust')
    : dedupe(paints.filter((m) => m.variant !== 'bust').sort((a, b) => a.createdAt - b.createdAt));
  const openerPool = frames.filter((m) => m.label !== 'keyart');

  // ---- the chapters: the tale's own stretches, in PLAYED order ----------
  // A chapter is a contiguous run of turns sharing a spine beat. Beat
  // bookkeeping that jumps backward (a revisited beat, a corrected ledger)
  // must never reshuffle the reading order — the book reads as the table
  // lived it, first turn to last.
  const pages = Array.isArray(campaign.chroniclePages) ? campaign.chroniclePages : [];
  const beats = campaign.codex?.spine?.beats || [];
  const runs = [];
  logs.forEach((log, turn) => {
    const beatIndex = log.beatIndex ?? 0;
    const last = runs[runs.length - 1];
    if (last && last.beatIndex === beatIndex) last.positions.push({ log, turn });
    else runs.push({ beatIndex, positions: [{ log, turn }] });
  });

  // A Chronicler page binds to the stretch it actually retells — and only if
  // it can PROVE its citations: citeless pages are never used, and a page
  // falls WHOLE when any turn it cites was struck by either court.
  const pageFor = (run) => {
    const from = run.positions[0].turn, to = run.positions[run.positions.length - 1].turn;
    return pages.find((page) => {
      if (page.beatIndex !== run.beatIndex) return false;
      const cf = page.cites?.from_turn, ct = page.cites?.to_turn;
      if (!Number.isInteger(cf) || !Number.isInteger(ct) || cf > ct) return false;
      if (ct < from || cf > to) return false;
      for (let t = cf; t <= ct; t++) { const cited = logs[t]; if (!cited || !isBound(cited, t)) return false; }
      return true;
    }) || null;
  };

  // THE SEATED PLATE: a chapter opens on art FIRST SHOWN during its own
  // stretch — a plate dealt on one of its turns, or a cover dealt for its
  // beat (covers seat with the beat's first stretch). Nothing seen in the
  // stretch → the honest procedural plate. A ledgerless elder tale seats
  // plates in paint order, one per chapter — never the old even-spread that
  // landed early art on late chapters.
  const firstRunOfBeat = new Map();
  runs.forEach((run, i) => { if (!firstRunOfBeat.has(run.beatIndex)) firstRunOfBeat.set(run.beatIndex, i); });
  const plateFor = (run, runAt) => {
    if (!ledgerLive) return openerPool[runAt]?.dataUrl || null;
    const from = run.positions[0].turn, to = run.positions[run.positions.length - 1].turn;
    const candidates = [...seenAt.entries()].filter(([hash, mark]) => {
      if (!mark.bound) return false;
      const row = byHash.get(hash);
      if (!row || row.variant === 'bust' || row.label === 'keyart') return false;
      if (mark.logTurn != null) return mark.logTurn >= from && mark.logTurn <= to;
      if (mark.cardBeat != null) return mark.cardBeat === run.beatIndex && firstRunOfBeat.get(run.beatIndex) === runAt;
      return false;
    }).sort((a, b) => a[1].ts - b[1].ts);
    return candidates.length ? byHash.get(candidates[0][0]).dataUrl : null;
  };

  const chapters = runs.map((run, runAt) => {
    const beat = beats[run.beatIndex] || {};
    const act = beat.act || 1;
    // The chapter WINDOW spans every sealed position of this stretch (redacted
    // positions count for the span so entrances are not lost)…
    const span = { from: run.positions[0]?.turn ?? 0, to: run.positions[run.positions.length - 1]?.turn ?? 0 };
    // …but struck CONTENT never reaches the book, whichever court struck it.
    const entries = run.positions.filter(({ log, turn }) => isBound(log, turn));
    const page = pageFor(run);
    const plate = plateFor(run, runAt);
    const entrances = (campaign.codex?.cast || []).filter((soul) => Number.isInteger(soul.introduced_turn) && soul.introduced_turn >= span.from && soul.introduced_turn <= span.to);
    // Dice for the margin: the Chronicler's sealed moments when a page
    // exists; otherwise the chapter's own notable sealed totals.
    const dice = page
      ? (page.dice_moments || [])
      : entries.filter(({ log }) => Number.isInteger(log.resolution?.total) && (log.resolution.total >= 18 || log.resolution.total <= 3)).slice(0, 3).map(({ log, turn }) => ({ turn, total: log.resolution.total, label: `sealed at turn ${turn}` }));
    return { beatIndex: run.beatIndex, numeral: romanNumeral(runAt + 1), title: beat.title || 'A Turn of the Road', act, page, plate, entries, entrances, dice };
  });

  const chapterLeaves = chapters.map((chapter) => {
    const margin = [
      ...chapter.dice.map((moment) => `<figure class="die-note"><b>${Number(moment.total)}</b><figcaption>Here the die showed ${Number(moment.total)} — ${esc(moment.label)}.</figcaption></figure>`),
      ...chapter.entrances.map((soul) => `<figure class="entrance">${bustFor(soul.name) ? `<img src="${esc(bustFor(soul.name))}" alt="${esc(soul.name)}">` : `<span class="procedural-portrait">${esc(initials(soul.name))}</span>`}<figcaption>${esc(soul.name)} enters the tale</figcaption></figure>`)
    ].join('');
    const prose = chapter.page
      ? `<div class="retelling"><p>${dropcapped(chapter.page.passage)}</p></div>
         <p class="provenance">${chapter.page.raw ? 'the sealed text, bound as written' : 'retold by the Chronicler · sealed as written'} · turns ${Number(chapter.page.cites?.from_turn ?? 0)}–${Number(chapter.page.cites?.to_turn ?? 0)}</p>`
      : `<p class="raw-note">No Chronicler spoke for this chapter — its sealed words stand as written.</p>
         ${chapter.entries.map(({ log }) => `${log.player ? `<p class="player">“${esc(log.player)}”</p>` : ''}${(log.dm?.narration_blocks || []).map((block) => `<p>${block.speaker ? `<strong>${esc(block.speaker)}:</strong> ` : ''}${esc(block.text)}</p>`).join('')}`).join('')}`;
    return `<section class="leaf chapter act-${chapter.act}" style="--tint:${ACT_TINTS[chapter.act] || ACT_TINTS[1]}">
      ${chapter.plate ? `<figure class="chapter-plate"><img src="${esc(chapter.plate)}" alt="a painted plate of the journey"></figure>` : '<div class="procedural-plate">✦</div>'}
      <header class="chapter-head"><span class="eyebrow">Chapter ${chapter.numeral} · Act ${romanNumeral(chapter.act)} — ${esc(ACT_NAMES[chapter.act] || 'the road beyond')}</span><h2>${esc(chapter.title)}</h2></header>
      <div class="folio"><div class="folio-prose">${prose}</div><aside class="folio-margin">${margin}</aside></div>
    </section>`;
  }).join('');

  // ---- front & back matter ----------------------------------------------
  const revealed = campaign.completed || ((campaign.codex?.beatIndex ?? 0) >= (campaign.codex?.spine?.revealIdx ?? Number.MAX_SAFE_INTEGER));
  // The hero LEADS the dramatis personae, wearing the ORIGINAL forge bust —
  // found by the stable key (oldest-bust label fallback for elder tales), so
  // a renamed hero still wears their own first face. No lawful face → the
  // sigil, never a borrowed portrait.
  const heroName = campaign.hero?.name || 'The Hero';
  const heroFace = bustFor(heroName);
  const heroPlate = `<article class="plate hero-lead">${heroFace ? `<img src="${esc(heroFace)}" alt="${esc(heroName)}">` : `<div class="procedural-portrait large">${esc(campaign.hero?.sigil || initials(heroName))}</div>`}<h3>${esc(heroName)}</h3><p class="role">the hero</p><p class="fate">The soul whose legend this chronicle records.</p></article>`;
  const cast = heroPlate + (campaign.codex?.cast || []).map((soul) => `<article class="plate">${latestByLabel(soul.name) ? `<img src="${esc(latestByLabel(soul.name))}" alt="${esc(soul.name)}">` : `<div class="procedural-portrait large">${esc(initials(soul.name))}</div>`}<h3>${esc(soul.name)}</h3><p class="role">${esc(soul.role)}</p><p class="fate">${esc(fateLine(soul))}</p></article>`).join('');
  const regions = (campaign.codex?.regions || []).map((region) => `<article class="plate">${latestByLabel(region.name) ? `<img src="${esc(latestByLabel(region.name))}" alt="${esc(region.name)}">` : ''}<h3>${esc(region.name)}</h3><p class="role">${esc(region.state)}</p><p>${esc(region.visual)}</p></article>`).join('');
  const strip = frames.length
    ? `<section class="leaf reel-page"><h2>The Reel</h2><div class="film-strip">${frames.slice(0, 30).map((m) => `<figure class="frame"><img src="${esc(m.dataUrl)}" alt="a painted beat"></figure>`).join('')}</div></section>`
    : '';

  const begun = dateWord(campaign.createdAt);
  const closed = campaign.sealedAt ? `Sealed ${dateWord(campaign.sealedAt)}` : (dateWord(campaign.updatedAt) ? `Last written ${dateWord(campaign.updatedAt)}` : null);
  const slug = String(campaign.title || 'tale').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

  // The embedded proof: the hash-chained journal in the exact shape the
  // notary at /verify.html accepts — the keepsake carries its own evidence.
  // (Text only; art is attested inside the chain by hash, not by bytes.)
  const proof = JSON.stringify({
    header: {
      format: 'mydungeon.chronicle', version: 1, campaignId: campaign.id, title: campaign.title,
      exportedAt: journal[journal.length - 1]?.ts ?? null, headHash: campaign.headHash || null,
      publicKeyJwk: null, signatureStatus: campaign.signatureStatus || 'hash-only', embeddedBy: 'storybook'
    },
    journal
  }).replace(/</g, '\\u003c');

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(campaign.title)} — Storybook</title><style>
  ${BOOK_FONT_CSS}
  ${PAGE_RULES[pageSize] || PAGE_RULES.Letter}*{box-sizing:border-box}
  body{margin:0;background:#e9dfc8;color:#211914;font:${pageSize === 'A5' ? '11pt' : '13pt'} 'Crimson Pro',Georgia,serif;line-height:1.55}
  h1,h2,h3{font-family:'Cinzel','Crimson Pro',Georgia,serif;letter-spacing:.03em;font-weight:700}
  h1{font-size:40pt;margin:.2in 0}h2{border-bottom:1px solid var(--tint,#9f7438);padding-bottom:.12in}h3{margin-bottom:0}
  .leaf{padding:0 0 .3in}
  .cover{position:relative;min-height:${pageSize === 'A5' ? '7.2in' : '9.1in'};display:flex;flex-direction:column;justify-content:flex-end;text-align:center;page-break-after:always;overflow:hidden;color:#f6ecd4;padding:.7in .6in;border-radius:2px;${keyArt ? `background:linear-gradient(180deg,rgba(12,10,18,.15),rgba(12,10,18,.55) 55%,rgba(12,10,18,.92)),url('${keyArt}') center/cover;` : 'background:#1a1622;border:3px double #9f7438;'}}
  .cover h1{color:#fbf3df;font-size:${pageSize === 'A5' ? '32pt' : '46pt'};text-shadow:0 3px 20px rgba(0,0,0,.7);margin:.1in 0}
  .cover .byline{letter-spacing:.14em;text-transform:uppercase;font-size:11pt;color:#e7c583}
  .epigraph{font-style:italic;max-width:5in;margin:.28in auto 0;color:#efe4cb;text-shadow:0 1px 8px rgba(0,0,0,.6)}
  .wax{width:1.15in;height:1.15in;margin:0 auto .25in;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:34pt;color:#f2d9a4;background:radial-gradient(circle at 35% 30%,#a03030,#6d1a1a 62%,#571111);box-shadow:inset 0 2px 8px rgba(255,220,160,.25),inset 0 -6px 14px rgba(0,0,0,.5),0 3px 10px rgba(0,0,0,.45);transform:rotate(-4deg)}
  .wax.large{width:1.5in;height:1.5in;font-size:44pt}
  .chapter{page-break-before:always}
  .chapter-plate{margin:0 0 .22in}.chapter-plate img{width:100%;max-height:3.4in;object-fit:cover;border-radius:3px;display:block}
  .procedural-plate{height:2.6in;border-radius:3px;background:linear-gradient(160deg,#241a2e,#0f0b16 70%);border:1px solid #9f7438;display:flex;align-items:center;justify-content:center;color:#d4a24e;font-size:30pt;margin-bottom:.22in}
  .chapter-head .eyebrow{letter-spacing:.16em;text-transform:uppercase;font-size:9pt;color:var(--tint,#9f7438)}
  .chapter-head h2{margin-top:.06in}
  .folio{display:flex;gap:.3in}.folio-prose{flex:1 1 auto;min-width:0}.folio-margin{flex:0 0 1.5in;border-left:1px solid var(--tint,#9f7438);padding-left:.18in;font-size:9.5pt;color:#5c4a30}
  .retelling p{text-align:justify}
  .dropcap{float:left;font-family:'Cinzel',Georgia,serif;font-size:44pt;line-height:.82;padding:.04in .1in 0 0;color:var(--tint,#9f7438)}
  .provenance{margin-top:.18in;padding-top:.08in;border-top:1px solid var(--tint,#9f7438);font-size:9pt;letter-spacing:.08em;text-transform:uppercase;color:#795b2a}
  .raw-note{font-style:italic;color:#795b2a}
  .player{font-style:italic;color:#633}
  .die-note{margin:0 0 .2in;break-inside:avoid}.die-note b{display:block;font-family:'Cinzel',Georgia,serif;font-size:19pt;color:var(--tint,#9f7438);font-variant-numeric:tabular-nums}
  .entrance{margin:0 0 .2in;break-inside:avoid}.entrance img{width:100%;border-radius:50%;aspect-ratio:1;object-fit:cover;border:2px solid var(--tint,#9f7438)}
  .procedural-portrait{display:flex;align-items:center;justify-content:center;width:1in;height:1in;border-radius:50%;background:#241a2e;color:#d4a24e;border:2px solid #9f7438;font-family:'Cinzel',Georgia,serif}
  .procedural-portrait.large{width:100%;height:2.4in;border-radius:2px}
  .reel-page{page-break-before:always}
  .film-strip{display:flex;flex-wrap:wrap;gap:.14in;background:#161018;padding:.2in .16in;border-radius:4px;border-top:.06in dashed #a98a4e;border-bottom:.06in dashed #a98a4e}
  .film-strip .frame{margin:0;flex:1 1 2.3in;min-width:2.1in;background:#0c0a12;padding:.05in;border-radius:2px;break-inside:avoid}
  .film-strip .frame img{width:100%;height:1.7in;object-fit:cover;display:block;border-radius:1px}
  .plates{display:grid;grid-template-columns:1fr 1fr;gap:.25in}
  .plate{break-inside:avoid;border:1px solid #b79a6a;padding:.18in;background:#f4ecd9}
  .plate img{width:100%;max-height:3.2in;object-fit:cover;border-radius:2px;margin-bottom:.1in}
  .role{text-transform:uppercase;letter-spacing:.12em;font-size:9pt;color:#795b2a}
  .fate{font-style:italic}
  .gated{font-style:italic;color:#795b2a}
  .seal-page{page-break-before:always;text-align:center}
  .seal-page dl{display:inline-grid;grid-template-columns:auto auto;gap:.06in .3in;text-align:left;font-size:9.5pt;font-variant-numeric:tabular-nums}
  .seal-page dt{letter-spacing:.1em;text-transform:uppercase;font-size:8pt;color:#795b2a;align-self:center}
  .seal-page dd{margin:0;font-family:monospace;word-break:break-all}
  .verify-statement{max-width:5.4in;margin:.14in auto}
  .proof-button{font:11px system-ui;letter-spacing:.06em;background:none;border:1px solid #9f7438;color:#6d4f1e;border-radius:3px;padding:.5em 1em;cursor:pointer}
  .small{font-size:9pt}
  /* -------- the page-turn reader (screen only; progressive) -------- */
  html.book-reader .leaf{display:none}
  html.book-reader .leaf.open{display:block;min-height:96vh}
  html.book-reader .leaf.turning{animation:pagein .55s ease}
  @keyframes pagein{from{opacity:0;transform:perspective(1200px) rotateY(-7deg);transform-origin:left center}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion: reduce){html.book-reader .leaf.turning{animation:none}}
  .reader-bar{position:fixed;left:0;right:0;bottom:0;display:flex;gap:.7rem;align-items:center;justify-content:center;padding:.45rem .8rem;background:rgba(20,15,26,.93);color:#e7c583;font:12px/1.2 system-ui;border-top:1px solid #9f7438;letter-spacing:.08em}
  .reader-bar .turn{background:none;border:1px solid #9f7438;color:#e7c583;border-radius:50%;width:30px;height:30px;font-size:15px;cursor:pointer}
  .reader-bar .progress{position:absolute;top:-2px;left:0;height:2px;background:#d4a24e;width:0;transition:width .4s ease}
  @media print{.reader-bar,.proof-button{display:none!important}.leaf,html.book-reader .leaf{display:block!important}}
  </style></head><body>
  <section class="leaf cover"><div class="wax">${esc(campaign.hero?.sigil || '✦')}</div><h1>${esc(campaign.title)}</h1><p class="byline">${esc(campaign.hero?.name)} · ${esc(campaign.codex?.spine?.label)}</p><p class="epigraph">${esc(campaign.codex?.arc?.style_bible || campaign.styleBible || '')}</p>${closed ? `<p class="byline small">${esc(closed)}</p>` : ''}</section>
  <section class="leaf"><h2>The Covenant</h2><p>${esc(campaign.covenant)}</p><h2>The Half-Lit Design</h2><p class="${revealed ? '' : 'gated'}">${revealed ? esc(campaign.codex?.arc?.evil_plot || 'The design remained hidden.') : 'The page refuses to hold the whole shape. Revelation must be earned.'}</p></section>
  <section class="leaf chapter"><h2>Dramatis Personae</h2><div class="plates">${cast}</div></section>
  ${chapterLeaves}
  <section class="leaf chapter"><h2>The World’s Wounds</h2><div class="plates">${regions}</div></section>
  ${strip}
  <section class="leaf chapter"><h2>The Memoir</h2>${(campaign.codex?.memoir || []).map((line) => `<p>${esc(line)}</p>`).join('') || '<p>No memoir was written.</p>'}</section>
  <section class="leaf seal-page"><div class="wax large">${esc(campaign.hero?.sigil || '✦')}</div><h2>Sealed, and true</h2>
    <p class="verify-statement">Every turn of this tale is hash-chained on the device that lived it — nothing here was rewritten after the wax took. The proof rides inside this very file; present it to the notary at <strong>/verify.html</strong> and the chain will speak for itself.</p>
    <dl><dt>Begun</dt><dd>${esc(begun || '—')}</dd><dt>${campaign.sealedAt ? 'Sealed' : 'Last written'}</dt><dd>${esc((campaign.sealedAt ? dateWord(campaign.sealedAt) : dateWord(campaign.updatedAt)) || '—')}</dd><dt>Records</dt><dd>${journal.length}</dd><dt>Head hash</dt><dd>${esc(campaign.headHash || 'unsealed')}</dd><dt>Signature</dt><dd>${esc(campaign.signatureStatus || 'hash-only')}</dd></dl>
    <p><button class="proof-button" id="save-proof">Save the proof (.chronicle.json)</button></p>
    <p class="small">Built locally by MyDungeon.Quest — Cinematic Edition. This work includes material compatible with the Systems Reference Document 5.1, licensed under Creative Commons Attribution 4.0 International.</p>
  </section>
  <script type="application/json" id="chronicle-proof">${proof}</script>
  <script id="book-reader">(function(){
  if (navigator.webdriver) return; /* the binder prints; the reader is for readers */
  var leaves=[].slice.call(document.querySelectorAll('.leaf'));
  if(leaves.length<2)return;
  document.documentElement.classList.add('book-reader');
  var at=0,total=leaves.length,quiet=false;
  try{quiet=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
  var bar=document.createElement('nav');bar.className='reader-bar';
  bar.innerHTML='<i class="progress"></i><button class="turn back" aria-label="Previous page">‹</button><span class="folio-count"></span><button class="turn fore" aria-label="Next page">›</button>';
  document.body.appendChild(bar);
  var count=bar.querySelector('.folio-count'),progress=bar.querySelector('.progress');
  function show(n){n=Math.max(0,Math.min(total-1,n));var was=leaves[at];at=n;var leaf=leaves[at];
    for(var i=0;i<total;i++){leaves[i].classList.remove('open','turning');}
    leaf.classList.add('open');
    if(!quiet&&was!==leaf){leaf.classList.add('turning');setTimeout(function(){leaf.classList.remove('turning');},600);}
    count.textContent='page '+(at+1)+' of '+total;progress.style.width=((at+1)/total*100)+'%';
    window.scrollTo(0,0);}
  bar.querySelector('.back').addEventListener('click',function(){show(at-1);});
  bar.querySelector('.fore').addEventListener('click',function(){show(at+1);});
  window.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key==='PageDown'){show(at+1);}if(e.key==='ArrowLeft'||e.key==='PageUp'){show(at-1);}});
  var save=document.getElementById('save-proof');
  if(save)save.addEventListener('click',function(){var node=document.getElementById('chronicle-proof');if(!node)return;
    var blob=new Blob([node.textContent],{type:'application/json'});var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download='${slug}.chronicle.json';document.body.appendChild(a);a.click();a.remove();});
  show(0);
  })();</script>
  </body></html>`;
}
