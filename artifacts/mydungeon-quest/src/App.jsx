import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronRight, Download, Dices, Feather, FileUp, HeartPulse, Menu, MessageCircleWarning, Pause, Play, Plus, ScrollText, Settings as SettingsIcon, Shield, Sparkles, Swords } from 'lucide-react';
import { WorldForge, HeroForge } from './components/Forge.jsx';
import DiceOverlay from './components/DiceOverlay.jsx';
import Cinematic from './components/Cinematic.jsx';
import { CharacterSheet, Codex, Settings, Storybook } from './components/Overlays.jsx';
import { applyStateUpdates, createHero, heroRoll, rollInitiative } from './lib/rules.js';
import { applyStoryUpdates, initCodex, storyBlock } from './lib/story.js';
import { makeEntropy, validateDmTurn } from './lib/protocol.js';
import { campaignJournal, db, listCampaigns, saveCampaign } from './lib/db.js';
import { exportChronicle, forkChronicle, importChronicle, makeEnvelope } from './lib/seal.js';
import { recallScenes, rememberScene } from './lib/memory.js';
import { Foundry } from './lib/cinema/foundry.js';
import { cinematicPrompt, portraitPrompt, regionPrompt, scenePrompt } from './lib/cinema/prompts.js';
import { KEYART_LABEL, actOf, heroBustJob, keyArtJob, nameSeed } from './lib/cinema/prologue.js';
import { proceduralArtDataUrl } from './lib/cinema/procedural.js';
import { beatKeys, briefUpcomingBeat } from './lib/cinema/lookahead.js';
import { setScoreState, startScore, stopScore } from './lib/cinema/score.js';
import { speakBlocks, stopSpeaking } from './lib/cinema/voice.js';
import { playNarration, stopNarration, subscribeNarration, toggleNarration } from './lib/cinema/narrator.js';
import { downloadQuestAudio } from './lib/cinema/questaudio.js';
import { buildStorybook } from './lib/storybook.js';
import { slugify } from './lib/canonical.js';

const DEFAULT_SETTINGS = { reduceMotion: false, haptics: true, score: true, voice: false, narrator: false, textScale: 1, mediaTier: 'illuminated' };

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
}

// Replicates seal.js signerFor, but opens no transaction so the key-gen crypto
// stays outside any IndexedDB transaction scope.
async function ensureSigner(campaignId) {
  const existing = await db.keys.get(campaignId);
  if (existing) return existing;
  try {
    const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify']);
    let publicJwk = null;
    try { publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey); } catch { /* browser-specific */ }
    const record = { campaignId, algorithm: 'Ed25519', privateKey: pair.privateKey, publicKey: pair.publicKey, publicJwk, signed: true };
    await db.keys.put(record);
    return record;
  } catch {
    const record = { campaignId, algorithm: 'SHA-256', signed: false, publicJwk: null };
    await db.keys.put(record);
    return record;
  }
}

// SEAL — seal.js's appendEvent awaits crypto.subtle *inside* a Dexie rw
// transaction, which real IndexedDB premature-commits ("Transaction committed
// too early", seen the moment a rich media tier fires several attestations
// around a turn). We rebuild the identical record through the engine's own
// exported makeEnvelope, running every async (crypto) step OUTSIDE the
// transaction and writing only synchronous Dexie ops inside it. Seals are
// chained so the head hash never forks under concurrent attestations.
let __sealChain = Promise.resolve();
function seal(campaignId, type, payload) {
  const attempt = async () => {
    const campaign = await db.campaigns.get(campaignId);
    if (!campaign) throw new Error('Campaign not found');
    const signer = await ensureSigner(campaignId);
    const i = campaign.turnCount || 0;
    const record = await makeEnvelope({ type, i, prevHash: campaign.headHash || null, payload, signer });
    await db.transaction('rw', db.campaigns, db.journal, async () => {
      await db.journal.put({ campaignId, ...record });
      await db.campaigns.update(campaignId, { headHash: record.recordHash, turnCount: i + 1, signatureStatus: signer.signed ? 'signed' : 'hash-only', updatedAt: Date.now() });
    });
    return record;
  };
  const run = __sealChain.then(attempt);
  __sealChain = run.then(() => {}, () => {});
  return run;
}

function applyCombat(current, update, hero) {
  if (!update) return current;
  if (update.op === 'end') return null;
  const next = current ? structuredClone(current) : { active: true, round: 1, enemies: [], order: [] };
  for (const enemy of update.enemy_add || []) if (!next.enemies.some((e) => e.id === enemy.id)) next.enemies.push(enemy);
  for (const patch of update.enemy_update || []) {
    const enemy = next.enemies.find((e) => e.id === patch.id); if (!enemy) continue;
    enemy.hp = Math.max(0, Math.min(enemy.maxHp, enemy.hp + Number(patch.hp_delta || 0)));
    if (patch.zone) enemy.zone = patch.zone;
  }
  next.enemies = next.enemies.filter((enemy) => !(update.enemy_remove || []).includes(enemy.id));
  next.round += Number(update.round_delta || 0);
  if (update.op === 'start') next.order = rollInitiative(hero, next.enemies);
  return next;
}

export default function App() {
  const [campaigns, setCampaigns] = useState([]);
  const [current, setCurrent] = useState(null);
  const [flow, setFlow] = useState('title');
  const [worldDraft, setWorldDraft] = useState(null);
  const [overlay, setOverlay] = useState(null);
  const [cinematic, setCinematic] = useState(null);
  const [diceResult, setDiceResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [weaving, setWeaving] = useState(null);
  const [renderingVideos, setRenderingVideos] = useState({});
  const [paintingImages, setPaintingImages] = useState({});
  const [audioBusy, setAudioBusy] = useState(false);
  const [status, setStatus] = useState('✦ The table is set.');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const settingsRef = useRef(DEFAULT_SETTINGS); settingsRef.current = settings;
  const [bookHtml, setBookHtml] = useState('');
  const logEndRef = useRef(null);

  const refreshShelf = useCallback(async () => setCampaigns(await listCampaigns()), []);
  useEffect(() => { refreshShelf(); db.settings.get('care').then((row) => row && setSettings({ ...DEFAULT_SETTINGS, ...row.value })); }, [refreshShelf]);
  useEffect(() => { if (flow === 'table') logEndRef.current?.scrollIntoView({ behavior: settings.reduceMotion ? 'auto' : 'smooth' }); }, [current?.logs?.length, flow, settings.reduceMotion]);
  // Follow the prose as it streams in: as each chunk of the weaving turn arrives,
  // keep the newest text in view (instant, so rapid updates don't fight a smooth
  // animation) — older narration rises off the top like a live podcast transcript.
  useEffect(() => { if (flow === 'table' && weaving != null) logEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' }); }, [weaving, flow]);
  useEffect(() => { document.documentElement.style.setProperty('--text-scale', settings.textScale); }, [settings.textScale]);
  useEffect(() => {
    if (flow === 'table' && settings.score && current) { startScore(current.title || 'chronicle'); return () => { stopScore(); stopSpeaking(); }; }
    stopScore();
  }, [flow, settings.score, current?.id]); // eslint-disable-line
  // Silence the narrator when leaving the table or switching chronicles.
  useEffect(() => { if (flow !== 'table') stopNarration(); return () => stopNarration(); }, [flow, current?.id]);

  const persistSettings = async (next) => {
    setSettings(next); await db.settings.put({ key: 'care', value: next });
    if (current && next.mediaTier !== current.mediaTier) {
      const updated = { ...current, mediaTier: next.mediaTier }; setCurrent(updated); await saveCampaign(updated);
    }
  };

  const queueMedia = useCallback(async (campaign, turnRecord, dm, logId) => {
    if (campaign.mediaTier === 'parchment') return;
    const foundry = new Foundry({
      campaignId: campaign.id, tier: campaign.mediaTier, spend: campaign.spend,
      onAttestation: async (payload) => seal(campaign.id, 'media_attestation', payload)
    });
    const jobs = [];
    // The cover evolves with the story: the key art repaints once per act
    // (cache-keyed by act), darker as the stakes rise. Genesis reuses the
    // plate painted during the Prologue Render.
    jobs.push(keyArtJob(campaign, actOf(campaign)));
    // Every turn earns a scene plate. The DM often returns a null image_cue, so
    // synthesize one from the opening narration and the active region — the point
    // of the illuminated tier is that each beat is painted, not just the rare
    // turns the DM chooses to flag.
    const sceneCue = dm.image_cue || {
      kind: 'scene',
      mood: dm.narration_blocks?.[0]?.text?.slice(0, 140) || 'the unfolding scene',
      subjects: [],
      region: campaign.codex.regions?.[0]?.name || campaign.homeRegion
    };
    jobs.push({ kind: 'paint', prompt: scenePrompt(campaign, sceneCue), options: { kind: 'scene', referenceLabels: [...(sceneCue.subjects || []), sceneCue.region].filter(Boolean).slice(0, 3) }, priority: 1, logId });
    for (const soul of dm.story?.cast_add || []) {
      const locked = campaign.codex.cast.find((entry) => entry.name === soul.name);
      if (locked) for (const variant of ['bust','full-figure','dramatic']) jobs.push({ kind: 'paint', prompt: portraitPrompt(campaign, locked, variant), options: { kind: 'portrait', label: soul.name, variant, seed: nameSeed(soul.name), referenceLabels: variant === 'bust' ? [] : [soul.name] }, priority: variant === 'bust' ? 2 : 6 });
    }
    if (dm.story?.world?.region_add) {
      const region = campaign.codex.regions.find((entry) => entry.name === dm.story.world.region_add.name);
      if (region) jobs.push({ kind: 'paint', prompt: regionPrompt(campaign, region), options: { kind: 'region', label: region.name, seed: nameSeed(region.name) }, priority: 3 });
    }
    if (dm.story?.world?.region_update) {
      // The land sickens without moving: the degraded plate is anchored
      // to the original, so geography holds while the weather turns.
      const region = campaign.codex.regions.find((entry) => entry.name === dm.story.world.region_update.name);
      if (region) jobs.push({ kind: 'paint', prompt: regionPrompt(campaign, region), options: { kind: 'region', label: region.name, seed: nameSeed(region.name), referenceLabels: [region.name] }, priority: 3 });
    }
    if (dm.cinematic) {
      const keys = beatKeys(campaign.id, campaign.codex.beatIndex);
      // The beat's score and ambience underscore the narration at every media
      // tier (they become the ducked bed of the audiobook); only the cinematic
      // FILM itself is reserved for the cinema tier.
      jobs.push({ kind: 'music', prompt: `A 20 second cinematic stinger for ${dm.cinematic.type}; ${dm.cinematic.subtitle}`, priority: 4, cacheKey: keys.score });
      jobs.push({ kind: 'sfx', prompt: `A restrained PG-13 ambience and impact for ${dm.cinematic.type}`, priority: 4 });
      if (dm.dialogue_cue) jobs.push({ kind: 'speak', prompt: dm.dialogue_cue.line, options: { text: dm.dialogue_cue.line }, priority: 1 });
      if (campaign.mediaTier === 'cinema') {
        const prompt = cinematicPrompt(campaign, dm.cinematic, dm.image_cue || {});
        const villainSoul = campaign.codex.cast.find((soul) => soul.role === 'villain');
        jobs.push({ kind: 'video', prompt, priority: 2, cacheKey: keys.film, options: { kind: 'beat-film', label: dm.cinematic.title, referenceLabels: [...(dm.image_cue?.subjects || []), villainSoul?.name].filter(Boolean).slice(0, 2) }, logId });
      }
    }
    briefUpcomingBeat(campaign, foundry, campaign.codex.beatIndex);
    const clearRendering = (logId) => setRenderingVideos((prev) => { if (!prev[logId]) return prev; const next = { ...prev }; delete next[logId]; return next; });
    const clearPainting = (logId) => setPaintingImages((prev) => { if (!prev[logId]) return prev; const next = { ...prev }; delete next[logId]; return next; });
    for (const job of jobs) {
      // A cinematic film (Veo) can take minutes; flag its turn as rendering so
      // the story view shows a placeholder until the asset resolves or degrades.
      if (job.logId && job.kind === 'video') setRenderingVideos((prev) => ({ ...prev, [job.logId]: true }));
      // The scene plate is painting: show a shimmer over the procedural stand-in
      // until the illuminated image lands (or the job resolves without one).
      if (job.logId && job.kind === 'paint') setPaintingImages((prev) => ({ ...prev, [job.logId]: true }));
      foundry.enqueue({ ...job, originTurnHash: turnRecord.recordHash }).then(async (asset) => {
        if (job.logId && job.kind === 'video') clearRendering(job.logId);
        if (job.logId && job.kind === 'paint') clearPainting(job.logId);
        if (!asset) return;
        if (job.logId && job.kind === 'paint' && asset.mime.startsWith('image/')) {
          const dataUrl = await blobToDataUrl(asset.blob);
          setCurrent((prev) => {
            if (!prev || prev.id !== campaign.id) return prev;
            const logs = prev.logs.map((log) => log.id === job.logId ? { ...log, imageUrl: dataUrl, imageAssetHash: asset.assetHash } : log);
            const next = { ...prev, logs, spend: foundry.spend };
            saveCampaign(next); return next;
          });
        }
        // A cinematic can be a real video/mp4 clip (Veo) or, on the mock
        // provider, a posterOnly still. Attach whichever we got to its turn's
        // log so the story view renders a playable film (or a keyframe).
        if (job.logId && job.kind === 'video') {
          const dataUrl = await blobToDataUrl(asset.blob);
          const isVideo = asset.mime.startsWith('video/');
          const degraded = Boolean(asset.degraded);
          setCurrent((prev) => {
            if (!prev || prev.id !== campaign.id) return prev;
            const logs = prev.logs.map((log) => log.id === job.logId
              ? { ...log, ...(isVideo ? { videoUrl: dataUrl } : { videoPosterUrl: dataUrl }), videoAssetHash: asset.assetHash, videoDegraded: degraded }
              : log);
            const next = { ...prev, logs, spend: foundry.spend };
            saveCampaign(next); return next;
          });
        }
      }).catch(() => {
        // A genuine video rejection (timeout after ~6min of polling, network
        // error, or spend cap after enqueue). The degraded animatic fallback
        // resolves with an asset above, so this only fires on true failures.
        // Replace the rendering spinner with a permanent note rather than
        // letting the placeholder silently vanish with no film and no reason.
        if (job.logId && job.kind === 'video') {
          clearRendering(job.logId);
          setCurrent((prev) => {
            if (!prev || prev.id !== campaign.id) return prev;
            const logs = prev.logs.map((log) => log.id === job.logId ? { ...log, videoFailed: true } : log);
            const next = { ...prev, logs };
            saveCampaign(next); return next;
          });
        }
      });
    }
  }, []);

  const playTurn = useCallback(async (base, player, resolution = null, visiblePlayer = player) => {
    if (!base || base.readOnly) return base;
    setBusy(true); setStatus('The Dungeon Master is reading the road…');
    try {
      const entropy = makeEntropy();
      const memory = await recallScenes(base.id, player, base.turnNumber || 0);
      const story = storyBlock(base.codex);
      // The DM keeps its own memory now: prior turns ride along as a
      // real conversation, so prose has continuity — and the stable
      // prefix caches on the server side.
      const history = base.logs.filter((entry) => !entry.redacted).slice(-15).flatMap((entry) => [
        { role: 'user', content: entry.sent || entry.player || 'Continue.' },
        { role: 'assistant', content: (entry.dm?.narration_blocks || []).map((block) => block.text).join('\n\n') }
      ]).filter((message) => message.content);
      const payload = {
        campaign: { id: base.id, title: base.title, covenant: base.covenant, tone: base.tone, lines: base.lines, veils: base.veils, styleBible: base.styleBible, homeRegion: base.homeRegion },
        spine: { label: base.codex.spine.label, beats: base.codex.spine.beats },
        history, hero: base.hero, state: { hero: base.hero, combat: base.combat },
        story, memory, entropy, player, resolution, turn: base.turnNumber || 0, genesis: (base.turnNumber || 0) === 0
      };
      const response = await fetch('/api/dm?stream=1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`The Dungeon Master could not be reached (${response.status}).`);
      let body = null;
      if ((response.headers.get('content-type') || '').includes('event-stream')) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '', eventName = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl;
          while ((nl = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, nl).trim(); buffer = buffer.slice(nl + 1);
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            else if (line.startsWith('data:')) {
              try {
                const data = JSON.parse(line.slice(5));
                if (eventName === 'narration' && typeof data.text === 'string') setWeaving(data.text);
                else if (eventName === 'turn') body = data;
              } catch { /* keep reading */ }
            }
          }
        }
      } else {
        body = await response.json();
      }
      if (!body?.turn) throw new Error('The stream ended before the turn arrived.');
      const dm = body.turn;
      const validation = validateDmTurn(dm, entropy);
      if (!validation.ok) throw new Error(validation.errors.join('; '));
      let codex = applyStoryUpdates(base.codex, dm.story);
      if (dm.state_updates?.chronicle_add) codex.chronicle = [...codex.chronicle, String(dm.state_updates.chronicle_add).slice(0, 260)];
      const heroBeforeLevel = base.hero.level;
      const hero = applyStateUpdates(base.hero, dm.state_updates);
      const combat = applyCombat(base.combat, dm.combat, hero);
      const log = { id: crypto.randomUUID(), player: visiblePlayer, sent: player, dm, ts: Date.now(), resolution: null, redacted: false, beatIndex: codex.beatIndex };
      let next = { ...base, hero, codex, combat, logs: [...base.logs, log], pendingRoll: dm.roll_request, turnNumber: (base.turnNumber || 0) + 1, completed: codex.completed };
      await saveCampaign(next);
      const record = await seal(base.id, 'turn', { player, visiblePlayer, dm, stateAfter: { hero, combat }, storyAfter: codex, entropy, resolution });
      const sealed = await db.campaigns.get(base.id);
      next = { ...next, headHash: sealed.headHash, turnCount: sealed.turnCount, signatureStatus: sealed.signatureStatus };
      next.logs[next.logs.length - 1].recordHash = record.recordHash;
      await rememberScene(base.id, next.turnNumber, { player, narration: dm.narration_blocks[0]?.text || '', chronicle: dm.state_updates?.chronicle_add || '', recordHash: record.recordHash });
      await saveCampaign(next); setCurrent(next); await refreshShelf();
      setStatus('✦ The turn is sealed.');
      const beatAct = next.codex.spine.beats[next.codex.beatIndex]?.act || 1;
      const villain = next.codex.cast.find((soul) => soul.role === 'villain');
      setScoreState({
        act: beatAct, combat: Boolean(next.combat?.active),
        hpFrac: hero.maxHp ? hero.hp / hero.maxHp : 1, blight: next.codex.blight,
        villain: Boolean(villain && dm.narration_blocks.some((block) => block.text.includes(villain.name.split(' ')[0])))
      });
      // The narrator (AI podcast voice) supersedes the device voice when on, and
      // auto-plays the freshly sealed turn like the next segment of an audiobook.
      const sealedLog = next.logs[next.logs.length - 1];
      if (settingsRef.current.narrator) playNarration(next, sealedLog);
      else if (settingsRef.current.voice && !dm.cinematic) speakBlocks(dm.narration_blocks, next.codex.cast);
      if (dm.cinematic) setCinematic({ ...dm, campaign: next, turnRecordHash: record.recordHash, beatIndex: next.codex.beatIndex });
      if (hero.level > heroBeforeLevel) setOverlay('level');
      queueMedia(next, record, dm, log.id);
      return next;
    } catch (error) {
      console.error(error); setStatus(`The road snagged: ${error.message}`); return base;
    } finally { setBusy(false); setWeaving(null); }
  }, [queueMedia, refreshShelf]);

  // THE PROLOGUE RENDER — before Chapter I opens, the world's key art and the
  // hero's permanent bust anchor are painted and sealed, so the first
  // impression at the table is a painted world, not a gradient.
  const prologueRender = async (campaign) => {
    if (campaign.mediaTier === 'parchment') return campaign;
    setStatus('Painting your world…');
    const foundry = new Foundry({
      campaignId: campaign.id, tier: campaign.mediaTier, spend: campaign.spend,
      onAttestation: async (payload) => seal(campaign.id, 'media_attestation', payload)
    });
    const [keyArt] = await Promise.all([
      foundry.enqueue({ ...keyArtJob(campaign, actOf(campaign)), originTurnHash: null }).catch(() => null),
      foundry.enqueue({ ...heroBustJob(campaign), originTurnHash: null }).catch(() => null)
    ]);
    if (keyArt) {
      const next = { ...campaign, keyArtHash: keyArt.assetHash, spend: foundry.spend };
      setCurrent(next); await saveCampaign(next); return next;
    }
    return campaign;
  };

  const beginCampaign = async (heroInput) => {
    const id = crypto.randomUUID();
    const hero = { ...createHero(heroInput), bearing: (heroInput.bearing || '').slice(0, 200) };
    const codex = initCodex(worldDraft.spineId);
    const campaign = {
      id, title: worldDraft.title, covenant: worldDraft.covenant, tone: worldDraft.tone,
      lines: worldDraft.lines, veils: worldDraft.veils, styleBible: worldDraft.styleBible, homeRegion: worldDraft.homeRegion,
      spineId: worldDraft.spineId, hero, codex, logs: [], combat: null, pendingRoll: null,
      turnNumber: 0, turnCount: 0, headHash: null, signatureStatus: 'pending', completed: false, readOnly: false, keyArtHash: null,
      mediaTier: settings.mediaTier, spend: { images: 0, videos: 0, music: 0 }, createdAt: Date.now(), updatedAt: Date.now()
    };
    await saveCampaign(campaign); setCurrent(campaign); setFlow('table');
    const started = await prologueRender(campaign);
    await playTurn(started, 'Begin the chronicle.', null, null);
  };

  const submit = async (text) => {
    const clean = text.trim(); if (!clean || busy || current.pendingRoll) return;
    await playTurn(current, clean);
  };

  const resolveRoll = async () => {
    if (!current.pendingRoll || busy) return;
    const result = heroRoll(current.hero, current.pendingRoll);
    setDiceResult(result);
    const resolutionRecord = await seal(current.id, 'resolution', result);
    const sealed = await db.campaigns.get(current.id);
    const logs = current.logs.map((log, index) => index === current.logs.length - 1 ? { ...log, resolution: result } : log);
    const next = { ...current, logs, pendingRoll: null, headHash: sealed.headHash, turnCount: sealed.turnCount };
    await saveCampaign(next); setCurrent(next);
    setTimeout(() => playTurn(next, `Resolve ${current.pendingRoll.label}.`, result, null), 950);
  };

  const redactLast = async () => {
    const target = [...current.logs].reverse().find((log) => !log.redacted && log.recordHash);
    if (!target || busy || current.readOnly) return;
    await seal(current.id, 'redaction', { targetRecordHash: target.recordHash, scope: 'active_canon' });
    await db.memories.where('campaignId').equals(current.id).filter((row) => row.recordHash === target.recordHash).delete();
    const logs = current.logs.map((log) => log.id === target.id ? { ...log, redacted: true } : log);
    const sealed = await db.campaigns.get(current.id);
    const next = { ...current, logs, headHash: sealed.headHash, turnCount: sealed.turnCount };
    await saveCampaign(next); setCurrent(next);
    await playTurn(next, '[X-CARD REDIRECT: the prior scene is outside active canon; redirect safely without asking why.]', null, null);
  };

  const exportCurrent = async () => {
    const data = await exportChronicle(current.id);
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `${current.title.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.chronicle.json`);
  };

  const restoreFile = async (file) => {
    try { const restored = await importChronicle(JSON.parse(await file.text())); await refreshShelf(); setCurrent(restored); setFlow('table'); }
    catch (error) { setStatus(`Restore failed: ${error.message}`); }
  };

  const openStorybook = async () => {
    const journal = await campaignJournal(current.id);
    const mediaRows = await db.media.where('campaignId').equals(current.id).toArray();
    const media = await Promise.all(mediaRows.map(async (row) => ({ ...row, dataUrl: row.blob ? await blobToDataUrl(row.blob) : null })));
    const html = buildStorybook({ campaign: current, journal, media }); setBookHtml(html); setOverlay('storybook');
  };

  const bindPdf = async () => {
    const response = await fetch('/api/bind-pdf', { method: 'POST', headers: { 'Content-Type': 'text/html' }, body: bookHtml });
    if (!response.ok) { setStatus((await response.json()).error || 'PDF binding failed'); return; }
    downloadBlob(await response.blob(), `${current.title.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.storybook.pdf`);
  };

  // THE BOUND AUDIOBOOK — generate any missing narration, then stitch the whole
  // quest (with its music bed ducked under the voice) into one downloadable file.
  const downloadAudio = async () => {
    if (audioBusy || !current) return;
    setAudioBusy(true);
    try {
      const blob = await downloadQuestAudio(current, (message) => setStatus(message));
      downloadBlob(blob, `${slugify(current.title)}.quest.mp3`);
      setStatus('✦ Your chronicle, read aloud, is bound.');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setAudioBusy(false);
    }
  };

  const regionStripRef = useRef(null);
  const logScrollRef = useRef(null);
  useEffect(() => {
    const el = logScrollRef.current; if (!el) return;
    const onScroll = () => { if (regionStripRef.current) regionStripRef.current.style.backgroundPositionY = `${Math.round(el.scrollTop * 0.28)}px`; };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [current?.id]);
  const activeRegion = current?.codex?.regions?.[0];
  const regionArt = useMemo(() => current ? proceduralArtDataUrl(`${current.id}:${activeRegion?.state || 'unknown'}`, activeRegion?.name || current.homeRegion, ['#0d0b14', current.codex.blight > 2 ? '#63352f' : '#35534b', '#d4a24e']) : '', [current, activeRegion]);
  const [regionPlate, setRegionPlate] = useState(null);
  useEffect(() => {
    let url = null, alive = true;
    (async () => {
      if (!current || !activeRegion) { setRegionPlate(null); return; }
      const rows = await db.media.where('campaignId').equals(current.id).toArray();
      const plate = rows.filter((row) => row.kind === 'paint' && row.label === activeRegion.name && row.blob).sort((a, b) => b.createdAt - a.createdAt)[0];
      if (plate && alive) { url = URL.createObjectURL(plate.blob); setRegionPlate(url); } else if (alive) setRegionPlate(null);
    })();
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [current?.id, activeRegion?.name, activeRegion?.state, current?.logs?.length]); // eslint-disable-line

  const [keyArtUrl, setKeyArtUrl] = useState(null);
  useEffect(() => {
    let url = null, alive = true;
    (async () => {
      if (!current) { setKeyArtUrl(null); return; }
      const rows = await db.media.where('campaignId').equals(current.id).toArray();
      const art = rows.filter((row) => row.kind === 'paint' && row.label === KEYART_LABEL && row.blob).sort((a, b) => b.createdAt - a.createdAt)[0];
      if (art && alive) { url = URL.createObjectURL(art.blob); setKeyArtUrl(url); } else if (alive) setKeyArtUrl(null);
    })();
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [current?.id, current?.keyArtHash, current?.logs?.length]); // eslint-disable-line

  // THE LIVING SEAL — the wax presses closed each time a turn is sealed into
  // the chain (its head hash changes). Tapping it opens the bound chronicle.
  const [sealPulse, setSealPulse] = useState(0);
  const lastSealRef = useRef({ id: null, hash: null });
  useEffect(() => {
    if (!current) { lastSealRef.current = { id: null, hash: null }; return; }
    const prev = lastSealRef.current;
    if (prev.id === current.id && prev.hash && current.headHash && prev.hash !== current.headHash) setSealPulse((n) => n + 1);
    lastSealRef.current = { id: current.id, hash: current.headHash };
  }, [current?.id, current?.headHash]);

  if (flow === 'world') return <WorldForge mediaTier={settings.mediaTier} onBack={() => setFlow('title')} onContinue={(world) => { setWorldDraft(world); setFlow('hero'); }} />;
  if (flow === 'hero') return <HeroForge world={worldDraft} mediaTier={settings.mediaTier} onBack={() => setFlow('world')} onBegin={beginCampaign} />;
  if (flow === 'title') return <TitleScreen campaigns={campaigns} onNew={() => setFlow('world')} onOpen={(campaign) => { setCurrent(campaign); setFlow('table'); }} onRestore={restoreFile} status={status} />;
  if (!current) return null;

  return <div className="app-shell">
    <div ref={regionStripRef} className="region-strip" data-blight={current.codex.blight} style={(() => { const d = Math.min(0.55 + current.codex.blight * 0.08, 0.94); return { backgroundImage: `linear-gradient(90deg,rgba(13,11,20,${d}),rgba(13,11,20,${(d * 0.55).toFixed(2)}),rgba(13,11,20,${d})),url("${regionPlate || regionArt}")` }; })()}>
      <span>{activeRegion?.name || current.homeRegion}</span><small>{activeRegion?.state || 'unmapped'} · blight {current.codex.blight}/5</small>
    </div>
    <header className="table-header">
      <button className="sigil-button" onClick={() => setOverlay('sheet')}><span>{current.hero.sigil}</span><div><b>{current.hero.name}</b><small>Level {current.hero.level} {current.hero.className}</small></div></button>
      <div className="header-stats"><span><HeartPulse/> {current.hero.hp}/{current.hero.maxHp}</span><span><Shield/> {current.hero.ac}</span><span className="desktop-stat">{current.hero.gold} gold</span></div>
      <nav><button onClick={() => setOverlay('codex')}><BookOpen/><span>Codex</span></button><button onClick={() => setOverlay('settings')}><SettingsIcon/><span>Care</span></button><button className="wax-seal" onClick={openStorybook} title="The bound chronicle and its seal" aria-label="Open the bound chronicle"><span key={sealPulse} className="wax-emboss">{current.hero.sigil}</span></button></nav>
    </header>
    {current.readOnly && <div className="read-only-banner"><Shield/> This restored chronicle verifies as an artifact but cannot impersonate its original device. <button onClick={async()=>{const fork=await forkChronicle(current);setCurrent(fork);}}>Create a signed continuation</button></div>}
    {current.combat?.active && <CombatBanner combat={current.combat} />}
    <main ref={logScrollRef} className="adventure-log" role="log" aria-live="polite">
      <div className={`campaign-mast ${keyArtUrl ? 'has-keyart' : ''}`} style={keyArtUrl ? { backgroundImage: `linear-gradient(180deg,rgba(13,11,20,.12),rgba(13,11,20,.5) 55%,rgba(13,11,20,.97)),url("${keyArtUrl}")` } : undefined}><span>{current.codex.spine.label} · Beat {current.codex.beatIndex + 1}/{current.codex.spine.beats.length}</span><h1>{current.codex.spine.beats[current.codex.beatIndex]?.title}</h1><p>{current.codex.spine.beats[current.codex.beatIndex]?.goal}</p></div>
      {current.logs.map((log) => log.redacted ? <div className="redacted-line" key={log.id}>⊘ A scene was removed from active canon by the player.</div> : <LogEntry key={log.id} log={log} campaign={current} rendering={Boolean(renderingVideos[log.id])} painting={Boolean(paintingImages[log.id])} />)}
      {busy && (weaving
        ? <article className="turn-entry weaving"><div className="narration">{weaving.split('\n\n').filter(Boolean).map((paragraph, i) => <p key={i} className={i === 0 ? 'dropcap' : ''}>{paragraph}</p>)}</div></article>
        : <div className="streaming"><span/>The Dungeon Master considers…</div>)}
      <div ref={logEndRef}/>
    </main>
    {!current.readOnly && <Composer campaign={current} busy={busy} onSubmit={submit} onSuggestion={submit} onRoll={resolveRoll} onXCard={redactLast} />}
    <footer className="seal-status"><span>{status}</span></footer>
    {diceResult && <DiceOverlay result={diceResult} haptics={settings.haptics} onDone={() => setDiceResult(null)} />}
    {cinematic && <Cinematic cinematic={cinematic.cinematic} dialogue={cinematic.dialogue_cue} campaign={cinematic.campaign} reduceMotion={settings.reduceMotion} score={settings.score} voiceOn={settings.voice} turnRecordHash={cinematic.turnRecordHash} beatIndex={cinematic.beatIndex ?? cinematic.campaign.codex.beatIndex} onClose={() => setCinematic(null)} />}
    {overlay === 'sheet' && <CharacterSheet campaign={current} onClose={() => setOverlay(null)} onExport={exportCurrent} />}
    {overlay === 'codex' && <Codex campaign={current} onClose={() => setOverlay(null)} onReplay={(dm) => { setOverlay(null); setCinematic({ ...dm, campaign: current }); }} />}
    {overlay === 'settings' && <Settings campaign={current} settings={{...settings,mediaTier:current.mediaTier}} onChange={persistSettings} onDownloadAudio={downloadAudio} audioBusy={audioBusy} onClose={() => setOverlay(null)} />}
    {overlay === 'storybook' && <Storybook html={bookHtml} onClose={() => setOverlay(null)} onPdf={bindPdf} onHtml={() => downloadBlob(new Blob([bookHtml], {type:'text/html'}), `${current.title}.storybook.html`)} />}
    {overlay === 'level' && <div className="ritual"><Sparkles/><span>Level {current.hero.level}</span><h2>The story has made you larger.</h2><button onClick={()=>setOverlay(null)}>Accept the new name fate gives you</button></div>}
    {current.hero.hp <= 0 && <Epitaph campaign={current} onIntervene={async()=>{const hero={...current.hero,hp:Math.max(1,Math.floor(current.hero.maxHp/2)),deathTouched:true};const next={...current,hero};await seal(current.id,'resolution',{type:'fates_intervention',hp:hero.hp,deathTouched:true});await saveCampaign(next);setCurrent(next);}} />}
  </div>;
}

function TitleScreen({ campaigns, onNew, onOpen, onRestore }) {
  const input = useRef(null);
  const bundled = ['drowned', 'frontier', 'gate', 'mountain'].map((n) => `${import.meta.env.BASE_URL}keyart/${n}.jpg`);
  const [bgIndex, setBgIndex] = useState(0);
  const [attract, setAttract] = useState(false);
  const [covers, setCovers] = useState({});

  // Each chronicle card wears its own key art. Load the latest keyart plate per save.
  useEffect(() => {
    let urls = [], alive = true;
    (async () => {
      const out = {};
      for (const c of campaigns) {
        const rows = await db.media.where('campaignId').equals(c.id).toArray();
        const art = rows.filter((r) => r.kind === 'paint' && r.label === KEYART_LABEL && r.blob).sort((a, b) => b.createdAt - a.createdAt)[0];
        if (art) { const u = URL.createObjectURL(art.blob); urls.push(u); out[c.id] = u; }
      }
      if (alive) setCovers(out); else urls.forEach(URL.revokeObjectURL);
    })();
    return () => { alive = false; urls.forEach(URL.revokeObjectURL); };
  }, [campaigns]);

  // The Face is never still: bundled key art cycles behind the title, faster once attract mode wakes.
  useEffect(() => { const t = setInterval(() => setBgIndex((i) => (i + 1) % bundled.length), attract ? 6500 : 11000); return () => clearInterval(t); }, [attract, bundled.length]);

  // Thirty seconds of stillness and the title turns into an attract reel.
  useEffect(() => {
    let timer; const reset = () => { setAttract(false); clearTimeout(timer); timer = setTimeout(() => setAttract(true), 30000); };
    reset();
    const events = ['pointermove', 'pointerdown', 'keydown', 'touchstart', 'wheel'];
    for (const ev of events) window.addEventListener(ev, reset, { passive: true });
    return () => { clearTimeout(timer); for (const ev of events) window.removeEventListener(ev, reset); };
  }, []);

  const bgSrc = bundled[bgIndex];
  return <main className={`title-page cinematic ${attract ? 'attract' : ''}`}>
    <div className="title-bg" key={bgSrc} style={{ backgroundImage: `url("${bgSrc}")` }} aria-hidden/>
    <div className="title-veil" aria-hidden/>
    <section className="title-hero">
      <div className="title-sigil">✦</div>
      <span className="eyebrow">Cinematic Edition</span>
      <h1>MyDungeon<span>.Quest</span></h1>
      <p>Any world. Any hero. One legend — painted as you live it.</p>
      <button className="primary-button big" onClick={onNew}>Begin your legend</button>
    </section>
    {!attract && <section className="shelf">
      <header><div><span className="eyebrow">Chronicle Shelf</span><h2>Your sealed worlds</h2></div><button className="secondary-button" onClick={() => input.current.click()}><FileUp/> Restore</button><input ref={input} type="file" accept=".json,.chronicle.json" hidden onChange={(e) => e.target.files[0] && onRestore(e.target.files[0])}/></header>
      <div className="shelf-grid">{campaigns.length ? campaigns.map((c) => <button className="chronicle-card" data-cover={covers[c.id] ? 'art' : 'plain'} key={c.id} onClick={() => onOpen(c)} style={covers[c.id] ? { backgroundImage: `linear-gradient(180deg,rgba(13,11,20,.06),rgba(13,11,20,.55) 45%,rgba(13,11,20,.95)),url("${covers[c.id]}")` } : undefined}>
        <span className="seal-badge"><Shield size={12}/>{c.completed ? 'complete' : 'sealed'}</span>
        <div className="card-foot"><h3>{c.title}</h3><p>{c.hero?.name} · {c.codex?.spine?.label}</p><span className="card-cta">{c.completed ? '✦ Complete' : 'Continue'} <ChevronRight size={15}/></span></div>
      </button>) : <div className="empty-shelf"><Feather/><h3>Your shelf is empty</h3><p>The first world is not patient. Begin your legend.</p></div>}</div>
    </section>}
    <footer className="title-footer">Yours alone · Plays offline · Every turn sealed</footer>
  </main>;
}

// The per-turn "Listen" control. Any turn can be read aloud on demand; the
// button mirrors the single shared narrator so only one turn plays at a time.
function NarrationButton({ campaign, log }) {
  const [state, setState] = useState({ id: null, playing: false });
  useEffect(() => subscribeNarration(setState), []);
  const active = state.id === log.id && state.playing;
  if (!log.dm?.narration_blocks?.length) return null;
  return <button type="button" className={`narrate-button ${active ? 'playing' : ''}`} onClick={() => toggleNarration(campaign, log)} aria-label={active ? 'Pause narration' : 'Read this turn aloud'} title="Read this turn aloud">
    {active ? <Pause/> : <Play/>}<span>{active ? 'Narrating' : 'Listen'}</span>
  </button>;
}

function LogEntry({ log, campaign, rendering, painting }) {
  const cue = log.dm.image_cue;
  // Every turn shows a plate: the DM's cue mood when present, otherwise the
  // opening line of narration. The procedural plate stands in until (or unless)
  // the painted scene arrives.
  const mood = cue?.mood || log.dm.narration_blocks?.[0]?.text?.slice(0, 90) || 'the scene';
  const art = proceduralArtDataUrl(`${campaign.id}:${log.id}`, mood, log.dm.cinematic?.palette || ['#0d0b14','#4c465e','#d4a24e']);
  const showScene = Boolean(log.imageUrl || cue || painting);
  const cinematicTitle = log.dm.cinematic?.title || 'Cinematic';
  const hasFilm = log.videoUrl || log.videoPosterUrl;
  // A real video/mp4 clip can fail to decode (unsupported codec, corrupt data).
  // When it does, fall back to the painted keyframe still — the video poster,
  // the scene still, or the procedural plate — so cinema-tier players never see
  // a blank black box.
  const [filmFailed, setFilmFailed] = useState(false);
  const keyframeStill = log.videoPosterUrl || log.imageUrl || art || proceduralArtDataUrl(`${campaign.id}:${log.id}:keyframe`, log.dm.cinematic?.subtitle || cinematicTitle, log.dm.cinematic?.palette || ['#0d0b14','#4c465e','#d4a24e']);
  const showFilm = log.videoUrl && !filmFailed;
  return <article className="turn-entry">
    {log.player && <div className="player-line"><span>You</span><p>{log.player}</p></div>}
    {log.dm.cinematic && <div className="beat-line"><span>✦</span><b>{log.dm.cinematic.title}</b><small>{log.dm.cinematic.subtitle}</small></div>}
    {showScene && <figure className={`illustration-panel full-bleed ${!log.imageUrl && painting ? 'painting' : ''}`}><img src={log.imageUrl || art} alt={mood}/><figcaption>{mood}{log.imageUrl ? <span>illuminated</span> : <span>{painting ? 'painting…' : 'procedural plate'}</span>}</figcaption></figure>}
    <div className="narration">{log.dm.narration_blocks.map((block,i)=><p key={i} className={i===0?'dropcap':''}>{block.speaker && <strong>{block.speaker}</strong>}{block.text}</p>)}</div>
    <NarrationButton campaign={campaign} log={log} />
    {rendering && !hasFilm && !log.videoFailed && <figure className="illustration-panel full-bleed cinematic-rendering" aria-live="polite">
      <div className="rendering-stage"><span className="rendering-spinner" aria-hidden/><b>Rendering cinematic…</b><small>“{cinematicTitle}” is being filmed. This can take a few minutes.</small></div>
      <figcaption>{cinematicTitle}<span>rendering</span></figcaption>
    </figure>}
    {log.videoFailed && !hasFilm && <figure className="illustration-panel full-bleed cinematic-rendering cinematic-failed" aria-live="polite">
      <div className="rendering-stage"><span className="rendering-mark" aria-hidden>⌁</span><b>The cinematic could not be filmed this time</b><small>“{cinematicTitle}” failed to render. Your turn is sealed and the story continues.</small></div>
      <figcaption>{cinematicTitle}<span>unfilmed</span></figcaption>
    </figure>}
    {hasFilm && <figure className="illustration-panel full-bleed">
      {showFilm
        ? <video src={log.videoUrl} poster={log.videoPosterUrl || undefined} controls playsInline loop muted preload="metadata" aria-label={cinematicTitle}
            onError={() => setFilmFailed(true)} />
        : <img src={keyframeStill} alt={log.dm.cinematic?.title || 'cinematic keyframe'} />}
      <figcaption>{cinematicTitle}{showFilm ? (log.videoDegraded ? <span>procedural animatic</span> : <span>cinematic film</span>) : <span>keyframe</span>}</figcaption>
    </figure>}
    {log.resolution && <div className={`roll-stamp ${log.resolution.outcome.includes('success')?'success':'failure'}`}><Dices/><span>{log.resolution.selectedDie} → {log.resolution.total}</span><b>{log.resolution.outcome.replaceAll('_',' ')}</b></div>}
  </article>;
}

function Composer({ campaign, busy, onSubmit, onSuggestion, onRoll, onXCard }) {
  const [text,setText]=useState(''); const pending=campaign.pendingRoll;
  const send=()=>{if(text.trim()){onSubmit(text);setText('');}};
  const latest=[...campaign.logs].reverse().find((l)=>!l.redacted);
  return <section className="composer-wrap">
    {latest?.dm?.suggestions && !pending && <div className="suggestions">{latest.dm.suggestions.map((s)=><button key={s} disabled={busy} onClick={()=>onSuggestion(s)}>{s}</button>)}</div>}
    {pending ? <button className="roll-button" onClick={onRoll} disabled={busy}><Dices/><span><small>{pending.kind} · DC {pending.dc ?? 'hidden'}</small>{pending.label}</span><b>Roll {pending.die}</b></button> : <div className="composer"><button className="x-card" onClick={onXCard} disabled={busy} title="Remove the last scene from active canon"><MessageCircleWarning/></button><textarea value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder="What do you do?" rows="1" disabled={busy}/><button onClick={send} disabled={busy||!text.trim()}><Feather/></button></div>}
  </section>;
}

function CombatBanner({ combat }) {
  return <section className="combat-banner"><div><Swords/><span>Round {combat.round}</span></div><div className="initiative">{combat.order.map((entry)=><span className={entry.hero?'hero':''} key={entry.id}>{entry.name} <b>{entry.total}</b></span>)}</div><div className="enemy-bars">{combat.enemies.map((enemy)=><span key={enemy.id}><i style={{width:`${enemy.hp/enemy.maxHp*100}%`}}/><b>{enemy.name}</b><small>{enemy.zone} · {enemy.hp}/{enemy.maxHp}</small></span>)}</div></section>;
}

function Epitaph({ campaign, onIntervene }) {
  return <div className="epitaph"><span>{campaign.hero.sigil}</span><p>An epitaph waits, but fate has not yet closed its hand.</p><h1>{campaign.hero.name}</h1>{!campaign.hero.deathTouched && <button onClick={onIntervene}>Invoke Fate’s Intervention</button>}</div>;
}
