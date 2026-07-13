import { BOOK_FONT_CSS } from './bookFonts.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function buildStorybook({ campaign, journal, media = [] }) {
  const redacted = new Set(journal.filter((r) => r.type === 'redaction').map((r) => r.payload.targetRecordHash));
  const turns = journal.filter((r) => r.type === 'turn' && !redacted.has(r.recordHash));
  const paints = media.filter((m) => m.kind === 'paint' && m.dataUrl);
  const latestByLabel = (name) => paints.filter((m) => String(m.label || '').includes(name)).sort((a, b) => b.createdAt - a.createdAt)[0]?.dataUrl || null;

  // The cover wears the world's latest key art, full-bleed.
  const keyArt = paints.filter((m) => m.label === 'keyart').sort((a, b) => b.createdAt - a.createdAt)[0]?.dataUrl || null;

  // A film strip of the journey: every scene, region and world plate the story
  // painted, in the order it happened — portraits sit in the cast gallery, not here.
  const seen = new Set();
  const keyframes = paints
    .filter((m) => m.variant !== 'bust')
    .sort((a, b) => a.createdAt - b.createdAt)
    .filter((m) => (seen.has(m.assetHash) ? false : seen.add(m.assetHash)))
    .slice(0, 30);

  const strip = keyframes.length
    ? `<section class="reel-page"><h2>The Reel</h2><div class="film-strip">${keyframes.map((m) => `<figure class="frame"><img src="${m.dataUrl}" alt="a painted beat"></figure>`).join('')}</div></section>`
    : '';

  const annals = turns.map((turn, index) => `<section class="chapter"><h2>${index + 1}. ${esc(turn.payload.dm?.cinematic?.title || 'A Turn of the Road')}</h2><p class="player">${esc(turn.payload.player)}</p>${(turn.payload.dm?.narration_blocks || []).map((b) => `<p>${b.speaker ? `<strong>${esc(b.speaker)}:</strong> ` : ''}${esc(b.text)}</p>`).join('')}</section>`).join('');
  const cast = (campaign.codex?.cast || []).map((soul) => `<article class="plate">${latestByLabel(soul.name) ? `<img src="${latestByLabel(soul.name)}" alt="${esc(soul.name)}">` : ''}<h3>${esc(soul.name)}</h3><p class="role">${esc(soul.role)}</p><p>${esc(soul.visual)}</p></article>`).join('');
  const regions = (campaign.codex?.regions || []).map((region) => `<article class="plate">${latestByLabel(region.name) ? `<img src="${latestByLabel(region.name)}" alt="${esc(region.name)}">` : ''}<h3>${esc(region.name)}</h3><p class="role">${esc(region.state)}</p><p>${esc(region.visual)}</p></article>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(campaign.title)} — Storybook</title><style>
  ${BOOK_FONT_CSS}
  @page{size:Letter;margin:.7in .65in .75in .8in}*{box-sizing:border-box}
  body{margin:0;background:#e9dfc8;color:#211914;font:13pt 'Crimson Pro',Georgia,serif;line-height:1.55}
  h1,h2,h3{font-family:'Cinzel','Crimson Pro',Georgia,serif;letter-spacing:.03em;font-weight:700}
  h1{font-size:40pt;margin:.2in 0}h2{border-bottom:1px solid #9f7438;padding-bottom:.12in}h3{margin-bottom:0}
  .cover{position:relative;min-height:9.1in;display:flex;flex-direction:column;justify-content:flex-end;text-align:center;page-break-after:always;overflow:hidden;color:#f6ecd4;padding:.7in .6in;border-radius:2px;${keyArt ? `background:linear-gradient(180deg,rgba(12,10,18,.15),rgba(12,10,18,.55) 55%,rgba(12,10,18,.92)),url('${keyArt}') center/cover;` : 'background:#1a1622;border:3px double #9f7438;'}}
  .cover .sigil{font-size:54pt;color:#e7c583;text-shadow:0 2px 14px rgba(0,0,0,.6)}
  .cover h1{color:#fbf3df;font-size:46pt;text-shadow:0 3px 20px rgba(0,0,0,.7);margin:.1in 0}
  .cover .byline{letter-spacing:.14em;text-transform:uppercase;font-size:11pt;color:#e7c583}
  .epigraph{font-style:italic;max-width:5in;margin:.28in auto 0;color:#efe4cb;text-shadow:0 1px 8px rgba(0,0,0,.6)}
  .chapter{page-break-before:always}.player{font-style:italic;color:#633}
  .reel-page{page-break-before:always}
  .film-strip{display:flex;flex-wrap:wrap;gap:.14in;background:#161018;padding:.2in .16in;border-radius:4px;border-top:.06in dashed #a98a4e;border-bottom:.06in dashed #a98a4e}
  .film-strip .frame{margin:0;flex:1 1 2.3in;min-width:2.1in;background:#0c0a12;padding:.05in;border-radius:2px;break-inside:avoid}
  .film-strip .frame img{width:100%;height:1.7in;object-fit:cover;display:block;border-radius:1px}
  .plates{display:grid;grid-template-columns:1fr 1fr;gap:.25in}
  .plate{break-inside:avoid;border:1px solid #b79a6a;padding:.18in;background:#f4ecd9}
  .plate img{width:100%;max-height:3.2in;object-fit:cover;border-radius:2px;margin-bottom:.1in}
  .role{text-transform:uppercase;letter-spacing:.12em;font-size:9pt;color:#795b2a}
  .seal{font-family:monospace;font-size:8pt;word-break:break-all;border-top:2px solid #9f7438;padding-top:.2in}.small{font-size:9pt}</style></head><body>
  <section class="cover"><div class="sigil">${esc(campaign.hero?.sigil || '✦')}</div><h1>${esc(campaign.title)}</h1><p class="byline">${esc(campaign.hero?.name)} · ${esc(campaign.codex?.spine?.label)}</p><p class="epigraph">${esc(campaign.codex?.arc?.style_bible || campaign.styleBible || '')}</p></section>
  <section><h2>The Covenant</h2><p>${esc(campaign.covenant)}</p><h2>The Half-Lit Design</h2><p>${esc(campaign.codex?.arc?.evil_plot || 'The design remained hidden.')}</p></section>
  ${strip}
  <section class="chapter"><h2>Dramatis Personae</h2><div class="plates">${cast}</div></section>
  <section class="chapter"><h2>The World’s Wounds</h2><div class="plates">${regions}</div></section>
  <section class="chapter"><h2>The Memoir</h2>${(campaign.codex?.memoir || []).map((line) => `<p>${esc(line)}</p>`).join('') || '<p>No memoir was written.</p>'}</section>
  ${annals}
  <section class="chapter"><h2>Colophon & Seal</h2><p>Built locally by MyDungeon.Quest — Cinematic Edition.</p><p class="seal">Turns: ${journal.length}<br>Head hash: ${esc(campaign.headHash || 'unsealed')}<br>Signature status: ${esc(campaign.signatureStatus || 'hash-only')}</p><p class="small">This work includes material compatible with the Systems Reference Document 5.1, licensed under Creative Commons Attribution 4.0 International.</p></section>
  </body></html>`;
}
