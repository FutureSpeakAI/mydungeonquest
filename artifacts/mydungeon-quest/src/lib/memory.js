import { db } from './db.js';

const tokenize = (text) => String(text || '').toLowerCase().match(/[a-z0-9']{2,}/g) || [];

export async function rememberScene(campaignId, turn, scene) {
  await db.memories.add({ campaignId, turn, ...scene, text: `${scene.player} ${scene.narration} ${scene.chronicle || ''}`, ts: Date.now() });
}

export async function recallScenes(campaignId, query, currentTurn, limit = 4) {
  const rows = await db.memories.where('campaignId').equals(campaignId).toArray();
  const eligible = rows.filter((row) => row.turn < currentTurn - 3);
  const terms = tokenize(query);
  if (!terms.length || !eligible.length) return [];
  const docFreq = new Map();
  for (const row of eligible) for (const term of new Set(tokenize(row.text))) docFreq.set(term, (docFreq.get(term) || 0) + 1);
  const avgLen = eligible.reduce((sum, row) => sum + tokenize(row.text).length, 0) / eligible.length || 1;
  return eligible.map((row) => {
    const tokens = tokenize(row.text);
    const counts = new Map(tokens.map((term) => [term, 0]));
    for (const term of tokens) counts.set(term, (counts.get(term) || 0) + 1);
    let score = 0;
    for (const term of terms) {
      const tf = counts.get(term) || 0;
      if (!tf) continue;
      const idf = Math.log(1 + (eligible.length - (docFreq.get(term) || 0) + .5) / ((docFreq.get(term) || 0) + .5));
      score += idf * (tf * 2.2) / (tf + 1.2 * (.25 + .75 * tokens.length / avgLen));
    }
    return { ...row, score };
  }).filter((row) => row.score > 0).sort((a,b) => b.score - a.score).slice(0, limit).map(({ player, narration, chronicle, turn }) => ({ turn, player, narration, chronicle }));
}

export function compressFallback(scenes) {
  return scenes.slice(0, 8).map((scene) => `${scene.player || 'The hero acted'}; ${scene.chronicle || scene.narration || 'the road changed.'}`.slice(0, 220)).slice(0, 4);
}
