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
  const annals = turns.map((turn, index) => `<section class="chapter"><h2>${index + 1}. ${esc(turn.payload.dm?.cinematic?.title || 'A Turn of the Road')}</h2><p class="player">${esc(turn.payload.player)}</p>${(turn.payload.dm?.narration_blocks || []).map((b) => `<p>${b.speaker ? `<strong>${esc(b.speaker)}:</strong> ` : ''}${esc(b.text)}</p>`).join('')}</section>`).join('');
  const cast = (campaign.codex?.cast || []).map((soul) => `<article class="plate">${portraitFor(soul.name) ? `<img src="${portraitFor(soul.name)}" alt="${esc(soul.name)}">` : ''}<h3>${esc(soul.name)}</h3><p class="role">${esc(soul.role)}</p><p>${esc(soul.visual)}</p></article>`).join('');
  const regions = (campaign.codex?.regions || []).map((region) => `<article class="plate"><h3>${esc(region.name)}</h3><p class="role">${esc(region.state)}</p><p>${esc(region.visual)}</p></article>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(campaign.title)} — Storybook</title><style>
  @page{size:Letter;margin:.7in .65in .75in .8in}*{box-sizing:border-box}body{margin:0;background:#e9dfc8;color:#211914;font:13pt Georgia,serif;line-height:1.5}h1,h2,h3{font-family:Georgia,serif;letter-spacing:.04em}h1{font-size:38pt;margin:.2in 0}h2{border-bottom:1px solid #9f7438;padding-bottom:.12in}h3{margin-bottom:0}.cover{min-height:8.4in;display:flex;flex-direction:column;justify-content:center;text-align:center;page-break-after:always;border:3px double #9f7438;padding:.5in}.sigil{font-size:72pt;color:#9f7438}.epigraph{font-style:italic;max-width:5in;margin:.3in auto}.chapter{page-break-before:always}.player{font-style:italic;color:#633}.plates{display:grid;grid-template-columns:1fr 1fr;gap:.25in}.plate{break-inside:avoid;border:1px solid #b79a6a;padding:.18in;background:#f4ecd9}.plate img{width:100%;max-height:3.2in;object-fit:cover}.role{text-transform:uppercase;letter-spacing:.12em;font-size:9pt;color:#795b2a}.seal{font-family:monospace;font-size:8pt;word-break:break-all;border-top:2px solid #9f7438;padding-top:.2in}.small{font-size:9pt}</style></head><body>
  <section class="cover"><div class="sigil">${esc(campaign.hero?.sigil || '✦')}</div><h1>${esc(campaign.title)}</h1><p>${esc(campaign.hero?.name)} · ${esc(campaign.codex?.spine?.label)}</p><p class="epigraph">${esc(campaign.codex?.arc?.style_bible || campaign.styleBible || '')}</p></section>
  <section><h2>The Covenant</h2><p>${esc(campaign.covenant)}</p><h2>The Half-Lit Design</h2><p>${esc(campaign.codex?.arc?.evil_plot || 'The design remained hidden.')}</p></section>
  <section class="chapter"><h2>Dramatis Personae</h2><div class="plates">${cast}</div></section>
  <section class="chapter"><h2>The World’s Wounds</h2><div class="plates">${regions}</div></section>
  <section class="chapter"><h2>The Memoir</h2>${(campaign.codex?.memoir || []).map((line) => `<p>${esc(line)}</p>`).join('') || '<p>No memoir was written.</p>'}</section>
  ${annals}
  <section class="chapter"><h2>Colophon & Seal</h2><p>Built locally by MyDungeon.Quest — Cinematic Edition.</p><p class="seal">Turns: ${journal.length}<br>Head hash: ${esc(campaign.headHash || 'unsealed')}<br>Signature status: ${esc(campaign.signatureStatus || 'hash-only')}</p><p class="small">This work includes material compatible with the Systems Reference Document 5.1, licensed under Creative Commons Attribution 4.0 International.</p></section>
  </body></html>`;
}
