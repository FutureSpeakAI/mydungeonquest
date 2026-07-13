import { BOOK_FONT_CSS } from './bookFonts.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));

export function buildStorybook({ campaign, journal, media = [] }) {
  const redacted = new Set(journal.filter((r) => r.type === 'redaction').map((r) => r.payload.targetRecordHash));
  const turns = journal.filter((r) => r.type === 'turn' && !redacted.has(r.recordHash));
  const attestations = journal.filter((r) => r.type === 'media_attestation');
  const mediaMap = new Map(media.map((item) => [item.assetHash, item.dataUrl || item.blob || null]));
  const portraitFor = (name) => {
    const record = attestations.find((r) => r.payload.kind === 'paint' && String(r.payload.label || '').includes(name));
    return record ? mediaMap.get(record.payload.assetHash) : null;
  };
  const latestBy = (pred) => media.filter((m) => m.dataUrl && pred(m)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0]?.dataUrl || null;
  const coverArt = latestBy((m) => m.label === 'keyart');
  const keyframes = media.filter((m) => m.dataUrl && m.kind === 'scene' && m.label !== 'keyart').sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  const annals = turns.map((turn, index) => `<section class="chapter"><h2>${index + 1}. ${esc(turn.payload.dm?.cinematic?.title || 'A Turn of the Road')}</h2><p class="player">${esc(turn.payload.player)}</p>${(turn.payload.dm?.narration_blocks || []).map((b) => `<p>${b.speaker ? `<strong>${esc(b.speaker)}:</strong> ` : ''}${esc(b.text)}</p>`).join('')}</section>`).join('');
  const cast = (campaign.codex?.cast || []).map((soul) => `<article class="plate">${portraitFor(soul.name) ? `<img src="${portraitFor(soul.name)}" alt="${esc(soul.name)}">` : ''}<h3>${esc(soul.name)}</h3><p class="role">${esc(soul.role)}</p><p>${esc(soul.visual)}</p></article>`).join('');
  const regions = (campaign.codex?.regions || []).map((region) => `<article class="plate"><h3>${esc(region.name)}</h3><p class="role">${esc(region.state)}</p><p>${esc(region.visual)}</p></article>`).join('');
  const filmstrip = keyframes.length
    ? `<section class="chapter reel"><h2>The Reel</h2><p class="reel-caption">Every beat the Chronicler paused to paint.</p><div class="filmstrip">${keyframes.map((k) => `<figure class="frame"><img src="${k.dataUrl}" alt="a painted beat"></figure>`).join('')}</div></section>`
    : '';

  const cover = coverArt
    ? `<section class="cover art" style="background-image:url('${coverArt}')"><div class="scrim"></div><div class="cover-body"><div class="sigil">${esc(campaign.hero?.sigil || '✦')}</div><h1>${esc(campaign.title)}</h1><p class="byline">${esc(campaign.hero?.name)} · ${esc(campaign.codex?.spine?.label)}</p><p class="epigraph">${esc(campaign.codex?.arc?.style_bible || campaign.styleBible || '')}</p></div></section>`
    : `<section class="cover plain"><div class="sigil">${esc(campaign.hero?.sigil || '✦')}</div><h1>${esc(campaign.title)}</h1><p class="byline">${esc(campaign.hero?.name)} · ${esc(campaign.codex?.spine?.label)}</p><p class="epigraph">${esc(campaign.codex?.arc?.style_bible || campaign.styleBible || '')}</p></section>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(campaign.title)} — Storybook</title><style>
  ${BOOK_FONT_CSS}
  @page{size:Letter;margin:.7in .65in .75in .8in}
  *{box-sizing:border-box}
  html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{margin:0;background:#e9dfc8;color:#211914;font:13.5pt/1.62 'Crimson Pro',Georgia,serif}
  h1,h2,h3{font-family:'Cinzel',Georgia,serif;letter-spacing:.03em;font-weight:700}
  h1{font-size:38pt;margin:.2in 0}
  h2{font-size:20pt;border-bottom:1px solid #9f7438;padding-bottom:.12in}
  h3{margin-bottom:0;font-size:14pt}
  p{margin:.1in 0}
  strong{font-weight:600}
  .cover{position:relative;min-height:9in;display:flex;flex-direction:column;justify-content:flex-end;text-align:center;page-break-after:always;overflow:hidden}
  .cover.plain{justify-content:center;border:3px double #9f7438;padding:.5in;background:#f0e6cf}
  .cover.art{background-size:cover;background-position:center;color:#f4ead1;padding:.7in}
  .cover .scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(12,9,15,.22),rgba(12,9,15,.5) 52%,rgba(12,9,15,.9))}
  .cover .cover-body{position:relative}
  .sigil{font-size:56pt;color:#e8c877;line-height:1}
  .cover.plain .sigil{color:#9f7438}
  .cover h1{text-shadow:0 3px 20px rgba(0,0,0,.55);margin:.12in 0}
  .cover.plain h1{text-shadow:none}
  .byline{font-family:'Cinzel',Georgia,serif;text-transform:uppercase;letter-spacing:.14em;font-size:10pt}
  .epigraph{font-style:italic;max-width:5in;margin:.28in auto 0}
  .chapter{page-break-before:always}
  .player{font-style:italic;color:#6a3330}
  .plates{display:grid;grid-template-columns:1fr 1fr;gap:.25in}
  .plate{break-inside:avoid;border:1px solid #b79a6a;padding:.18in;background:#f4ecd9}
  .plate img{width:100%;max-height:3.2in;object-fit:cover}
  .role{text-transform:uppercase;letter-spacing:.12em;font-size:9pt;color:#795b2a;font-family:'Cinzel',Georgia,serif}
  .reel-caption{font-style:italic;color:#795b2a;margin-top:-.04in}
  .filmstrip{position:relative;display:flex;flex-wrap:wrap;gap:.14in;justify-content:center;background:#0c0a0e;padding:.34in .16in;border-radius:2px}
  .filmstrip:before,.filmstrip:after{content:"";position:absolute;left:.12in;right:.12in;height:.12in;background:repeating-linear-gradient(90deg,#efe6cf 0 .1in,transparent .1in .26in)}
  .filmstrip:before{top:.1in}
  .filmstrip:after{bottom:.1in}
  .frame{break-inside:avoid;width:2.55in;margin:0;padding:.04in;background:#000;border:1px solid #241c15}
  .frame img{display:block;width:100%;height:1.5in;object-fit:cover}
  .colophon{font-family:'Cinzel',Georgia,serif;text-align:center;letter-spacing:.06em;border-top:2px solid #9f7438;padding-top:.22in;margin-top:.3in}
  .small{font-size:9pt;font-family:'Crimson Pro',Georgia,serif;letter-spacing:0;color:#5c4a34}
  </style></head><body>
  ${cover}
  <section><h2>The Covenant</h2><p>${esc(campaign.covenant)}</p><h2>The Half-Lit Design</h2><p>${esc(campaign.codex?.arc?.evil_plot || 'The design remained hidden.')}</p></section>
  <section class="chapter"><h2>Dramatis Personae</h2><div class="plates">${cast}</div></section>
  <section class="chapter"><h2>The World’s Wounds</h2><div class="plates">${regions}</div></section>
  ${filmstrip}
  <section class="chapter"><h2>The Memoir</h2>${(campaign.codex?.memoir || []).map((line) => `<p>${esc(line)}</p>`).join('') || '<p>No memoir was written.</p>'}</section>
  ${annals}
  <section class="chapter"><h2>Colophon &amp; Seal</h2><p class="colophon">Bound by MyDungeon.Quest — Cinematic Edition<br>${turns.length} chapters walked · sealed and yours alone</p><p class="small">This work includes material compatible with the Systems Reference Document 5.1, licensed under Creative Commons Attribution 4.0 International.</p></section>
  </body></html>`;
}
