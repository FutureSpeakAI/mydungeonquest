import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronRight, Download, Dices, Feather, FileUp, HeartPulse, Menu, MessageCircleWarning, Pause, Play, Plus, ScrollText, Settings as SettingsIcon, Shield, Sparkles, Swords, X } from 'lucide-react';
import { WorldForge, HeroForge } from './components/Forge.jsx';
import DiceOverlay from './components/DiceOverlay.jsx';
import Cinematic from './components/Cinematic.jsx';
import Ceremony from './components/Ceremony.jsx';
import ChroniclePage from './components/ChroniclePage.jsx';
import { CharacterSheet, Codex, Settings, Storybook } from './components/Overlays.jsx';
import { buildChronicleRequest, claimChapterClose, validateChroniclePassage } from './lib/chronicler.js';
import { applyStateUpdates, createHero, heroRoll, rollInitiative } from './lib/rules.js';
import { ACT_NAMES, actInfo, applyStoryUpdates, chapterInfo, initCodex, requestSeal, romanNumeral, storyBlock } from './lib/story.js';
import { makeEntropy, validateDmTurn } from './lib/protocol.js';
import { campaignJournal, db, listCampaigns, saveCampaign } from './lib/db.js';
import { exportChronicle, forkChronicle, importChronicle, makeEnvelope } from './lib/seal.js';
import { recallScenes, rememberScene } from './lib/memory.js';
import { Foundry } from './lib/cinema/foundry.js';
import { portraitPrompt, regionPrompt, scenePrompt } from './lib/cinema/prompts.js';
import { KEYART_LABEL, actOf, heroBustJob, keyArtJob, nameSeed } from './lib/cinema/prologue.js';
import { proceduralArtDataUrl } from './lib/cinema/procedural.js';
import { beatKeys, briefUpcomingBeat } from './lib/cinema/lookahead.js';
import { stopAllSound } from './lib/cinema/audioDirector.js';
import { playUiSfx } from './lib/cinema/uiSfx.js';
import { playNarration, stopNarration, subscribeNarration, toggleNarration } from './lib/cinema/narrator.js';
import { downloadQuestAudio } from './lib/cinema/questaudio.js';
import { buildStorybook } from './lib/storybook.js';
import { slugify } from './lib/canonical.js';

const DEFAULT_SETTINGS = { reduceMotion: false, haptics: true, narrator: false, textScale: 1, mediaTier: 'illuminated' };

// One act, one light: the interstitial cards wear their own three-hex wash —
// steady gold for the world as it was, bruised iron as it unravels, ember and
// bright leaf for the world remade.
const ACT_PALETTES = {
  1: ['#0d0b14', '#35534b', '#d4a24e'],
  2: ['#0d0b14', '#4c465e', '#b8541f'],
  3: ['#0d0b14', '#63352f', '#e8c56a']
};

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

// Which named cast members appear this turn — as a speaker or by name in the
// prose. Used to anchor a scene plate's appearance canon and sealed reference
// portraits so the same face/clothing carries across scenes. Case-insensitive;
// returns canonical cast names (capped) that scenePrompt can match exactly.
function detectCast(cast = [], blocks = []) {
  const names = (cast || []).map((entry) => entry?.name).filter(Boolean);
  const speakers = new Set((blocks || []).map((b) => String(b?.speaker || '').toLowerCase()).filter(Boolean));
  const prose = (blocks || []).map((b) => String(b?.text || '')).join(' ').toLowerCase();
  return names.filter((name) => {
    const n = name.toLowerCase();
    return speakers.has(n) || prose.includes(n);
  }).slice(0, 3);
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
  const [paintingImages, setPaintingImages] = useState({});
  const [audioBusy, setAudioBusy] = useState(false);
  const [status, setStatus] = useState('✦ The table is set.');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const settingsRef = useRef(DEFAULT_SETTINGS); settingsRef.current = settings;
  const [bookHtml, setBookHtml] = useState('');
  const logEndRef = useRef(null);
  // When a cinematic card fires on a sealed turn, its narration waits here
  // until the card closes — the music phrase and the voice never share the
  // stage (THE SOUND LAW).
  const pendingNarrationRef = useRef(null);
  // When a turn crosses an act boundary, the act interstitial waits its turn
  // here: DM's card first, then the act turns, then the voice.
  const pendingActRef = useRef(null);
  // The Sealing rises on its own only once per campaign per session — after
  // that, the retired composer's button reopens it at will.
  const ceremonyShownRef = useRef(new Set());

  const refreshShelf = useCallback(async () => setCampaigns(await listCampaigns()), []);
  useEffect(() => { refreshShelf(); db.settings.get('care').then((row) => { if (!row) return; const { score: _score, voice: _voice, ...kept } = row.value || {}; const value = { ...DEFAULT_SETTINGS, ...kept }; if (value.mediaTier === 'cinema') value.mediaTier = 'illuminated'; setSettings(value); }); }, [refreshShelf]);
  useEffect(() => { if (flow === 'table') logEndRef.current?.scrollIntoView({ behavior: settings.reduceMotion ? 'auto' : 'smooth' }); }, [current?.logs?.length, flow, settings.reduceMotion]);
  // Follow the prose as it streams in: as each chunk of the weaving turn arrives,
  // keep the newest text in view (instant, so rapid updates don't fight a smooth
  // animation) — older narration rises off the top like a live podcast transcript.
  useEffect(() => { if (flow === 'table' && weaving != null) logEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' }); }, [weaving, flow]);
  useEffect(() => { document.documentElement.style.setProperty('--text-scale', settings.textScale); }, [settings.textScale]);
  // Silence everything — narrator, music, effects — when leaving the table or
  // switching chronicles. The next screen begins in silence, as the Law demands.
  useEffect(() => {
    if (flow !== 'table') { stopNarration(); stopAllSound(); }
    return () => { stopNarration(); stopAllSound(); };
  }, [flow, current?.id]);

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
    // turns the DM chooses to flag. Crucially, detect which cast members appear
    // this turn (as speakers or by name in the prose): scenePrompt keys each
    // subject's appearance canon AND its sealed reference portrait off the cue's
    // subjects, so without them every fallback turn would paint faces from
    // scratch — the root of the cross-scene inconsistency.
    const presentCast = detectCast(campaign.codex.cast, dm.narration_blocks);
    const sceneCue = dm.image_cue
      ? { ...dm.image_cue, subjects: (dm.image_cue.subjects?.length ? dm.image_cue.subjects : presentCast) }
      : {
          kind: 'scene',
          mood: dm.narration_blocks?.[0]?.text?.slice(0, 140) || 'the unfolding scene',
          subjects: presentCast,
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
      // THE SOUND LAW: one short phrase for the card — a musical sentence with
      // an ending, played once by the Director while the card is up. Never a
      // bed, never under a voice. No ambience wallpaper, no pre-spoken line:
      // the narration itself reads the dialogue in the character's cast voice
      // after the card closes.
      jobs.push({ kind: 'music', prompt: `A short orchestral phrase for ${dm.cinematic.type} — "${dm.cinematic.subtitle}". One musical sentence, eight to twelve seconds, ending cleanly and resolving toward silence. Restrained, cinematic, PG-13. No vocals.`, priority: 4, cacheKey: keys.score, options: { durationSeconds: 10 } });
    }
    briefUpcomingBeat(campaign, foundry, campaign.codex.beatIndex);
    const clearPainting = (logId) => setPaintingImages((prev) => { if (!prev[logId]) return prev; const next = { ...prev }; delete next[logId]; return next; });
    for (const job of jobs) {
      // The scene plate is painting: show a shimmer over the procedural stand-in
      // until the illuminated image lands (or the job resolves without one).
      if (job.logId && job.kind === 'paint') setPaintingImages((prev) => ({ ...prev, [job.logId]: true }));
      foundry.enqueue({ ...job, originTurnHash: turnRecord.recordHash }).then(async (asset) => {
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
      }).catch(() => {
        // A paint rejection must clear the shimmer, or the turn's plate is stuck
        // "painting…" forever with no image ever arriving.
        if (job.logId && job.kind === 'paint') clearPainting(job.logId);
      });
    }
  }, []);

  const playTurn = useCallback(async (base, player, resolution = null, visiblePlayer = player) => {
    if (!base || base.readOnly || base.completed) return base;
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
                else if (eventName === 'retract') setWeaving('✦ The Dungeon Master reconsiders the telling…');
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
      // The cast snapshot is taken BEFORE this turn's updates apply, so a
      // soul may speak its dying words in the very turn that kills it — and
      // the dead of earlier turns cannot be given dialogue at all.
      const validation = validateDmTurn(dm, entropy, { cast: base.codex.cast });
      if (!validation.ok) throw new Error(validation.errors.join('; '));
      let codex = applyStoryUpdates(base.codex, dm.story, { turn: base.turnNumber || 0 });
      if (dm.state_updates?.chronicle_add) codex.chronicle = [...codex.chronicle, String(dm.state_updates.chronicle_add).slice(0, 260)];
      const heroBeforeLevel = base.hero.level;
      const hero = applyStateUpdates(base.hero, dm.state_updates);
      const combat = applyCombat(base.combat, dm.combat, hero);
      // Combat opens: one drawn blade, one accent, through the Director — it
      // yields (and is dropped) if the narrator already holds the stage.
      if (combat?.active && !base.combat?.active) playUiSfx(base, 'sword');
      const log = { id: crypto.randomUUID(), player: visiblePlayer, sent: player, dm, ts: Date.now(), resolution: null, redacted: false, beatIndex: codex.beatIndex };
      // A completing turn strands no die: the tale that just ended has no
      // roll left to make.
      let next = { ...base, hero, codex, combat, logs: [...base.logs, log], pendingRoll: codex.completed ? null : dm.roll_request, turnNumber: (base.turnNumber || 0) + 1, completed: codex.completed };
      await saveCampaign(next);
      const record = await seal(base.id, 'turn', { player, visiblePlayer, dm, stateAfter: { hero, combat }, storyAfter: codex, entropy, resolution });
      const sealed = await db.campaigns.get(base.id);
      next = { ...next, headHash: sealed.headHash, turnCount: sealed.turnCount, signatureStatus: sealed.signatureStatus };
      next.logs[next.logs.length - 1].recordHash = record.recordHash;
      await rememberScene(base.id, next.turnNumber, { player, narration: dm.narration_blocks[0]?.text || '', chronicle: dm.state_updates?.chronicle_add || '', recordHash: record.recordHash });
      await saveCampaign(next); setCurrent(next); await refreshShelf();
      setStatus('✦ The turn is sealed.');
      // THE ACT TURNS — when this turn crossed an act boundary, a full-bleed
      // interstitial presents it: "Act II — the world unravelling." It waits
      // for the DM's own card (if any), and the voice waits for both.
      const prevAct = base.codex.spine.beats[base.codex.beatIndex]?.act || 1;
      const nowAct = codex.spine.beats[codex.beatIndex]?.act || 1;
      const actName = ACT_NAMES[nowAct] || ACT_NAMES[1];
      const actCard = nowAct > prevAct ? {
        cinematic: { type: 'act', title: `Act ${romanNumeral(nowAct)}`, subtitle: `${actName[0].toUpperCase()}${actName.slice(1)}.`, palette: ACT_PALETTES[nowAct] || ACT_PALETTES[1] },
        dialogue_cue: null, campaign: next, turnRecordHash: record.recordHash, beatIndex: next.codex.beatIndex
      } : null;
      // THE SOUND LAW at the turn boundary: when a cinematic card fires, its
      // music phrase owns the stage first — the narration is staged and begins
      // only when the card closes. Otherwise the voice starts at once.
      const sealedLog = next.logs[next.logs.length - 1];
      if (dm.cinematic || actCard) {
        pendingNarrationRef.current = settingsRef.current.narrator ? { campaign: next, log: sealedLog } : null;
        if (dm.cinematic) {
          pendingActRef.current = actCard;
          setCinematic({ ...dm, campaign: next, turnRecordHash: record.recordHash, beatIndex: next.codex.beatIndex });
        } else {
          setCinematic(actCard);
        }
      } else if (settingsRef.current.narrator) {
        playNarration(next, sealedLog);
      }
      if (hero.level > heroBeforeLevel) setOverlay('level');
      queueMedia(next, record, dm, log.id);
      // THE CHRONICLER at the chapter's close — when this turn advanced the
      // beat (or the tale completed), the closed chapter is retold from its
      // sealed turns, fire-and-forget: the table never waits on the reteller.
      if (codex.beatIndex > base.codex.beatIndex) chronicleChapterClose(next, base.codex.beatIndex);
      else if (codex.completed && !base.codex.completed) chronicleChapterClose(next, codex.beatIndex);
      return next;
    } catch (error) {
      console.error(error); setStatus(`The road snagged: ${error.message}`); return base;
    } finally { setBusy(false); setWeaving(null); }
  }, [queueMedia, refreshShelf]);

  // THE CHRONICLER'S COURT, client side — ask /api/retell for the chapter's
  // "tale so far" page, judge it AGAIN with the shared validator (trust no
  // wire), and only a lawful real-provider passage is sealed as written into
  // the journal ('chronicle_page') and hung in the feed. A decline seals
  // NOTHING: mock prose under a wax stamp would be a forgery — keyless tables
  // let the storybook bind the raw sealed text at binding time instead.
  // Failures never snag the table. (Function declaration: hoisted above
  // playTurn's closure on purpose.)
  async function chronicleChapterClose(campaign, closedBeatIndex) {
    if (campaign.readOnly || campaign.chroniclePages?.some((page) => page.beatIndex === closedBeatIndex)) return;
    // The claim is synchronous — taken before any await — so two racing
    // chapter-close paths in this session cannot both seal a page; across
    // sessions the persisted chroniclePages guard above holds.
    if (!claimChapterClose(campaign.id, closedBeatIndex)) return;
    try {
      const request = buildChronicleRequest(campaign, closedBeatIndex);
      if (!request) return;
      const response = await fetch('/api/retell', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request.body) });
      const data = response.ok ? await response.json() : { declined: true };
      if (data.declined || !data.passage) return;
      const verdict = validateChroniclePassage(data.passage, request.context);
      if (!verdict.ok) { console.warn('[chronicler] unlawful passage refused:', verdict.errors); return; }
      const page = { ...data.passage, beatIndex: closedBeatIndex, afterLogId: request.afterLogId, chapter: request.body.chapter, provider: data.provider, raw: false };
      const record = await seal(campaign.id, 'chronicle_page', page);
      setCurrent((prev) => {
        if (!prev || prev.id !== campaign.id) return prev;
        if ((prev.chroniclePages || []).some((p) => p.beatIndex === closedBeatIndex)) return prev; // belt: never hang a duplicate page
        const next = { ...prev, chroniclePages: [...(prev.chroniclePages || []), { ...page, recordHash: record.recordHash }] };
        saveCampaign(next);
        return next;
      });
    } catch (error) {
      console.warn('[chronicler] the page was not written:', error.message);
    }
  }

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
      mediaTier: settings.mediaTier, spend: { images: 0, music: 0 }, createdAt: Date.now(), updatedAt: Date.now()
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
    playUiSfx(current, 'die'); // one die on parchment — dropped if a voice holds the stage
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
    try { const restored = await importChronicle(JSON.parse(await file.text())); await refreshShelf(); setCurrent(restored.mediaTier === 'cinema' ? { ...restored, mediaTier: 'illuminated' } : restored); setFlow('table'); }
    catch (error) { setStatus(`Restore failed: ${error.message}`); }
  };

  const openStorybook = async (size = 'Letter') => {
    playUiSfx(current, 'page'); // the book opens (or rebinds): one page turn
    const journal = await campaignJournal(current.id);
    const mediaRows = await db.media.where('campaignId').equals(current.id).toArray();
    const media = await Promise.all(mediaRows.map(async (row) => ({ ...row, dataUrl: row.blob ? await blobToDataUrl(row.blob) : null })));
    const html = buildStorybook({ campaign: current, journal, media, pageSize: size }); setBookHtml(html); setOverlay('storybook');
  };

  const bindPdf = async () => {
    const response = await fetch('/api/bind-pdf', { method: 'POST', headers: { 'Content-Type': 'text/html' }, body: bookHtml });
    if (!response.ok) { setStatus((await response.json()).error || 'PDF binding failed'); return; }
    downloadBlob(await response.blob(), `${current.title.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.storybook.pdf`);
  };

  // THE PODCAST FORGE — compile the episode script from the sealed record
  // (the Chronicler's retellings + the cast's own lines, verbatim), voice it,
  // and let the sequencer bind it: voices with breathing gaps, stings only
  // BETWEEN sections, chapter markers, the key art as cover. THE SOUND LAW
  // holds in the mix; a keyless table declines honestly and keeps the book.
  const downloadAudio = async () => {
    if (audioBusy || !current) return;
    setAudioBusy(true);
    try {
      const blob = await downloadQuestAudio(current, (message) => setStatus(message));
      downloadBlob(blob, `${slugify(current.title)}.podcast.mp3`);
      setStatus('✦ Your episode is forged — sealed, and true.');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setAudioBusy(false);
    }
  };

  // SEAL THE TALE — the honored early ending. The request is recorded in the
  // codex; from the next turn the DM is steered into the denouement through
  // the [STORY] directives, and the tale completes when those turns have
  // breathed. Nothing is written to the journal here — the seal itself waits
  // for the ceremony.
  const confirmSeal = async () => {
    const codex = requestSeal(current.codex, current.turnNumber || 0);
    if (codex === current.codex) { setOverlay(null); return; }
    const next = { ...current, codex };
    await saveCampaign(next); setCurrent(next); setOverlay(null);
    setStatus('✦ The denouement begins — the road turns home.');
  };

  // THE PRESS — the journal's final block signs the whole chronicle. One wax
  // accent (in a gap), one 'sealing' event carrying the tale's true counts,
  // and the campaign remembers when its wax took the sigil.
  const pressSeal = async () => {
    if (!current || current.sealedAt || current.readOnly) return;
    playUiSfx(current, 'seal');
    const journal = await campaignJournal(current.id);
    await seal(current.id, 'sealing', {
      turns: journal.filter((r) => r.type === 'turn').length,
      rolls: journal.filter((r) => r.type === 'resolution' && r.payload && r.payload.total != null).length,
      completed_at: Date.now()
    });
    const sealedRow = await db.campaigns.get(current.id);
    const next = { ...current, sealedAt: Date.now(), headHash: sealedRow.headHash, turnCount: sealedRow.turnCount, signatureStatus: sealedRow.signatureStatus };
    await saveCampaign(next); setCurrent(next); await refreshShelf();
  };

  // THE SEALING rises by itself exactly once per campaign per session, after
  // the final card has left the stage and the turn has settled.
  useEffect(() => {
    if (flow !== 'table' || !current?.completed || current?.sealedAt || current?.readOnly || cinematic || busy) return;
    if (ceremonyShownRef.current.has(current.id)) return;
    ceremonyShownRef.current.add(current.id);
    setOverlay('sealing');
  }, [flow, current?.completed, current?.sealedAt, current?.readOnly, current?.id, cinematic, busy]);

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
  if (flow === 'title') return <TitleScreen campaigns={campaigns} reduceMotion={settings.reduceMotion} mediaTier={settings.mediaTier} onNew={() => setFlow('world')} onOpen={(campaign, opts) => { if (campaign.mediaTier === 'cinema') { campaign = { ...campaign, mediaTier: 'illuminated' }; saveCampaign(campaign).catch(() => {}); } setCurrent(campaign); setFlow('table'); if (opts?.keepsakes && campaign.sealedAt) setOverlay('sealing'); /* a finished book opens straight to its keepsakes */ }} onRestore={restoreFile} status={status} />;
  if (!current) return null;

  const chapter = chapterInfo(current.codex);
  const act = actInfo(current.codex);
  const nearEnd = !current.completed && !current.codex.sealing && current.codex.beatIndex >= current.codex.spine.beats.length - 3;

  return <div className={`app-shell${current.combat?.active ? ' under-arms' : ''}`}>
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
      <div className={`campaign-mast ${keyArtUrl ? 'has-keyart' : ''}`} style={keyArtUrl ? { backgroundImage: `linear-gradient(180deg,rgba(13,11,20,.12),rgba(13,11,20,.5) 55%,rgba(13,11,20,.97)),url("${keyArtUrl}")` } : undefined}><span>{current.codex.spine.label} · Act {act.numeral} · Chapter {chapter.numeral} of {chapter.countNumeral}</span><h1>{chapter.title}</h1><p>{chapter.goal}</p></div>
      {(() => {
        // THE FOLIO COUNT — plates are numbered the way a folio numbers its
        // engravings: only turns that actually show a plate advance the
        // numeral, so "Plate IV" is the fourth picture in the book, not the
        // fourth turn. (Mirrors LogEntry's own showScene test exactly.)
        let plateNo = 0;
        return current.logs.map((log) => {
          const showsPlate = !log.redacted && Boolean(log.imageUrl || log.videoPosterUrl || log.dm?.image_cue || paintingImages[log.id]);
          const plateNumeral = showsPlate ? romanNumeral(++plateNo) : null;
          const entry = log.redacted
            ? <div className="redacted-line" key={log.id}>⊘ A scene was removed from active canon by the player.</div>
            : <LogEntry key={log.id} log={log} campaign={current} painting={Boolean(paintingImages[log.id])} plateNumeral={plateNumeral} />;
          // The Chronicler's sealed pages hang in the feed exactly where their
          // chapters closed — "the tale so far", as written, never re-derived.
          const pages = (current.chroniclePages || []).filter((page) => page.afterLogId === log.id)
            .map((page) => <ChroniclePage key={`page-${page.recordHash || page.beatIndex}`} page={page} />);
          return pages.length ? [entry, ...pages] : entry;
        });
      })()}
      {busy && (weaving
        ? <article className="turn-entry weaving"><div className="narration">{weaving.split('\n\n').filter(Boolean).map((paragraph, i) => <p key={i} className={i === 0 ? 'dropcap' : ''}>{paragraph}</p>)}</div></article>
        : <div className="streaming"><span/>The Dungeon Master considers…</div>)}
      <div ref={logEndRef}/>
    </main>
    {!current.readOnly && current.codex.sealing && !current.completed && <div className="near-end denouement"><span>✦ The denouement — the road turns home.</span></div>}
    {!current.readOnly && nearEnd && <div className="near-end"><span>✦ The final chapters draw near.</span><button onClick={() => setOverlay('seal-ask')}>Seal the Tale</button></div>}
    {!current.readOnly && !current.completed && <Composer campaign={current} busy={busy} onSubmit={submit} onSuggestion={submit} onRoll={resolveRoll} onXCard={redactLast} />}
    {!current.readOnly && current.completed && <section className="tale-told"><span>✦ Your tale is told.</span><button onClick={() => setOverlay('sealing')}>{current.sealedAt ? 'Open the keepsakes' : 'Seal the chronicle'}</button></section>}
    <footer className="seal-status"><span>{status}</span></footer>
    {diceResult && <DiceOverlay result={diceResult} haptics={settings.haptics} onDone={() => setDiceResult(null)} />}
    {cinematic && <Cinematic cinematic={cinematic.cinematic} dialogue={cinematic.dialogue_cue} campaign={cinematic.campaign} reduceMotion={settings.reduceMotion} turnRecordHash={cinematic.turnRecordHash} beatIndex={cinematic.beatIndex ?? cinematic.campaign.codex.beatIndex} onClose={() => { if (cinematic.__closed) return; cinematic.__closed = true; /* one-shot latch: the 9s auto-close racing a tap (or any double fire) must not consume the chain twice — every card object is a fresh local spread, never sealed canon */ setCinematic(null); const actNext = pendingActRef.current; if (actNext) { pendingActRef.current = null; setCinematic(actNext); return; } const pending = pendingNarrationRef.current; pendingNarrationRef.current = null; if (pending) playNarration(pending.campaign, pending.log); }} />}
    {overlay === 'sheet' && <CharacterSheet campaign={current} onClose={() => setOverlay(null)} onExport={exportCurrent} />}
    {overlay === 'codex' && <Codex campaign={current} onClose={() => setOverlay(null)} onReplay={(dm) => { setOverlay(null); setCinematic({ ...dm, campaign: current }); }} onSealTale={current.readOnly || current.completed || current.codex.sealing ? null : () => setOverlay('seal-ask')} />}
    {overlay === 'settings' && <Settings campaign={current} settings={{...settings,mediaTier:current.mediaTier}} onChange={persistSettings} onDownloadAudio={downloadAudio} audioBusy={audioBusy} onClose={() => setOverlay(null)} />}
    {overlay === 'storybook' && <Storybook html={bookHtml} onClose={() => setOverlay(null)} onPdf={bindPdf} onHtml={() => downloadBlob(new Blob([bookHtml], {type:'text/html'}), `${current.title}.storybook.html`)} onSize={openStorybook} />}
    {overlay === 'level' && <div className="ritual"><Sparkles/><span>Level {current.hero.level}</span><h2>The story has made you larger.</h2><button onClick={()=>setOverlay(null)}>Accept the new name fate gives you</button></div>}
    {overlay === 'seal-ask' && <div className="ritual seal-ask"><span className="ritual-wax">{current.hero.sigil}</span><h2>End the tale with honor?</h2><p>The next few turns become the denouement — farewells, consequences, the road home. Then the wax presses, and the tale is bound.</p><div className="ritual-row"><button className="secondary-button" onClick={() => setOverlay(null)}>Not yet</button><button onClick={confirmSeal}>Seal the Tale</button></div></div>}
    {overlay === 'sealing' && <Ceremony campaign={current} onPressSeal={pressSeal} onStorybook={() => { setOverlay(null); openStorybook(); }} onExport={exportCurrent} onPodcast={downloadAudio} audioBusy={audioBusy} onClose={() => setOverlay(null)} />}
    {current.hero.hp <= 0 && <Epitaph campaign={current} onIntervene={async()=>{const hero={...current.hero,hp:Math.max(1,Math.floor(current.hero.maxHp/2)),deathTouched:true};const next={...current,hero};await seal(current.id,'resolution',{type:'fates_intervention',hp:hero.hp,deathTouched:true});await saveCampaign(next);setCurrent(next);}} />}
  </div>;
}

// The dye vat: each chronicle's spine takes a deterministic house dye from its
// id, so the shelf reads as a collected library — no two neighbors alike by
// accident, and every rebuild binds the same book in the same leather.
const SPINE_DYES = ['#4a2b33', '#33463b', '#2e3350', '#54331f', '#3a2f45', '#463b28'];
const dyeOf = (id) => SPINE_DYES[Math.abs([...String(id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % SPINE_DYES.length];

function TitleScreen({ campaigns, onNew, onOpen, onRestore, reduceMotion, mediaTier }) {
  const input = useRef(null);
  const bundled = ['drowned', 'frontier', 'gate', 'mountain'].map((n) => `${import.meta.env.BASE_URL}keyart/${n}.jpg`);
  const [bgIndex, setBgIndex] = useState(0);
  const [attract, setAttract] = useState(false);
  const [plaque, setPlaque] = useState('');

  // THE ARRIVAL (Phase 6) — a cold open, once per sitting: darkness; one
  // candle lights; the title warms in; the shelf rises beneath. Any touch
  // skips straight to the set table, and reduced motion never waits at all.
  const prefersStill = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const arrivedBefore = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('mdq:arrived');
  const [arrival, setArrival] = useState(reduceMotion || prefersStill || arrivedBefore ? 'set' : 'dark');
  useEffect(() => {
    if (arrival === 'set') { try { sessionStorage.setItem('mdq:arrived', '1'); } catch { /* private mode keeps no memory */ } return undefined; }
    // Settings hydrate from IndexedDB after mount: if a persisted "reduce
    // motion" arrives mid-staging, the curtain drops that instant — the
    // player asked for stillness and the arrival owes them a set table now.
    if (reduceMotion) { setArrival('set'); return undefined; }
    const timers = [['candle', 450], ['title', 1500], ['set', 3100]].map(([stage, at]) => setTimeout(() => setArrival(stage), at));
    const skip = () => setArrival('set');
    window.addEventListener('pointerdown', skip); window.addEventListener('keydown', skip);
    return () => { timers.forEach(clearTimeout); window.removeEventListener('pointerdown', skip); window.removeEventListener('keydown', skip); };
  }, [arrival === 'set', reduceMotion]); // eslint-disable-line
  // First touch earns one page-turn, then quiet — through the Director, so a
  // keyless table's first touch is (correctly) silence.
  const touchedRef = useRef(false);
  const firstTouch = () => { if (touchedRef.current) return; touchedRef.current = true; playUiSfx({ id: 'the-arrival', mediaTier: mediaTier || 'illuminated' }, 'page'); };

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
  const arrivalClass = arrival === 'set' ? '' : `arrival-${arrival}`;
  return <main className={`title-page cinematic ${arrivalClass} ${attract ? 'attract' : ''}`}>
    <div className="title-bg" key={bgSrc} style={{ backgroundImage: `url("${bgSrc}")` }} aria-hidden/>
    <div className="title-veil" aria-hidden/>
    <div className="title-embers" aria-hidden>{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>
    <section className="title-hero">
      <div className="candle" aria-hidden="true"><span className="halo"/><span className="flame"/><span className="stem"/></div>
      <span className="eyebrow">Cinematic Edition</span>
      <h1>MyDungeon<span>.Quest</span></h1>
      <p>A tale that is actually yours.</p>
      <button className="primary-button big" onClick={() => { firstTouch(); onNew(); }}>Begin your legend</button>
    </section>
    {!attract && <section className="shelf">
      <header><div><span className="eyebrow">The Chronicle Shelf</span><h2>Every tale you have lived</h2></div><button className="secondary-button" onClick={() => input.current.click()}><FileUp/> Return a tale</button><input ref={input} type="file" accept=".json,.chronicle.json" hidden onChange={(e) => e.target.files[0] && onRestore(e.target.files[0])}/></header>
      <div className="book-wall">
        <div className="book-row">
          {campaigns.map((c) => {
            const waxed = Boolean(c.sealedAt || c.completed);
            const label = `${c.title} — ${c.hero?.name || 'a hero'}${c.completed ? (c.sealedAt ? ', told and sealed' : ', told') : ', still being lived'}`;
            const engrave = () => setPlaque(`${c.title} — ${c.hero?.name || 'a hero'} · ${c.codex?.spine?.label || 'a spine'}${c.sealedAt ? ' · opens to its keepsakes' : c.completed ? ' · told, awaiting the wax' : ''}`);
            return <button key={c.id} className="book-spine" style={{ '--dye': dyeOf(c.id), height: `${158 + Math.min(26, c.turnCount || 0)}px` }}
              aria-label={label} title={label}
              onMouseEnter={engrave} onFocus={engrave} onMouseLeave={() => setPlaque('')} onBlur={() => setPlaque('')}
              onClick={() => { firstTouch(); onOpen(c, { keepsakes: Boolean(c.sealedAt) }); }}>
              <span className="spine-bands" aria-hidden><i/><i/><i/></span>
              <span className="spine-title">{c.title}</span>
              {waxed ? <span className="spine-wax" aria-hidden>{c.hero?.sigil || '✦'}</span> : <span className="spine-foot" aria-hidden>✦</span>}
            </button>;
          })}
          <button className="book-spine new-spine" style={{ height: '158px' }} onClick={() => { firstTouch(); onNew(); }} aria-label="Begin a new legend"
            onMouseEnter={() => setPlaque('An empty binding, waiting for a life.')} onFocus={() => setPlaque('An empty binding, waiting for a life.')} onMouseLeave={() => setPlaque('')} onBlur={() => setPlaque('')}>
            <span className="spine-bands" aria-hidden><i/><i/><i/></span>
            <span className="spine-title">Begin a legend</span>
            <span className="spine-foot" aria-hidden><Plus size={14}/></span>
          </button>
        </div>
        <div className="shelf-plank" aria-hidden/>
        <p className="shelf-plaque">{plaque || (campaigns.length ? 'Draw a spine from the shelf.' : 'The shelf waits for its first book.')}</p>
      </div>
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

export function LogEntry({ log, campaign, painting, plateNumeral = null }) {
  const cue = log.dm.image_cue;
  // Every turn shows a plate: the DM's cue mood when present, otherwise the
  // opening line of narration. The procedural plate stands in until (or unless)
  // the painted scene arrives.
  const mood = cue?.mood || log.dm.narration_blocks?.[0]?.text?.slice(0, 90) || 'the scene';
  const art = proceduralArtDataUrl(`${campaign.id}:${log.id}`, mood, log.dm.cinematic?.palette || ['#0d0b14','#4c465e','#d4a24e']);
  // Chronicles sealed before films were retired may carry a painted keyframe
  // poster on their film turns. Sealed history is immutable, so render that
  // poster as the turn's still rather than pretending the turn had no art.
  const still = log.imageUrl || log.videoPosterUrl || null;
  const showScene = Boolean(still || cue || painting);
  // Tap-to-expand for painted stills: the plate opens a full-screen lightbox
  // so the art can actually be studied — faces, costume, brushwork — instead
  // of living only inside the log column.
  const [expandedSrc, setExpandedSrc] = useState(null);
  const closeRef = useRef(null);
  useEffect(() => {
    if (!expandedSrc) return undefined;
    // Minimal focus management for a one-control dialog: focus moves to the
    // close button on open, Tab stays on it (nothing beneath is reachable by
    // keyboard while the lightbox claims aria-modal), Escape closes, and focus
    // returns to whatever opened it.
    const opener = document.activeElement;
    const onKey = (event) => {
      if (event.key === 'Escape') setExpandedSrc(null);
      if (event.key === 'Tab') { event.preventDefault(); closeRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      if (opener && document.contains(opener)) opener.focus?.();
    };
  }, [expandedSrc]);
  return <article className="turn-entry">
    {log.player && <div className="player-line"><span>You</span><p>{log.player}</p></div>}
    {log.dm.cinematic && <div className="beat-line"><span>✦</span><b>{log.dm.cinematic.title}</b><small>{log.dm.cinematic.subtitle}</small></div>}
    {/* Reading order is deliberate: the words land first, the Listen control is
        available immediately, and the painted plate slots in BELOW the text —
        so a paint that finishes mid-read never shoves the paragraph you're on. */}
    <div className="narration">{log.dm.narration_blocks.map((block,i)=><p key={i} className={i===0?'dropcap':''}>{block.speaker && <strong>{block.speaker}</strong>}{block.text}</p>)}</div>
    <NarrationButton campaign={campaign} log={log} />
    {showScene && <figure className={`illustration-panel full-bleed ${!still && painting ? 'painting' : ''}`}>
      <button type="button" className="plate-zoom" onClick={() => setExpandedSrc(still || art)} aria-label="Expand the illustration"><img src={still || art} alt={mood}/></button>
      {/* The folio speaks: a numbered engraving, as a printed book would caption it. */}
      <figcaption>{mood}<span>{plateNumeral && <b className="plate-no">Plate {plateNumeral} · </b>}{still ? 'illuminated' : (painting ? 'painting…' : 'procedural plate')}</span></figcaption>
    </figure>}
    {log.resolution && <div className={`roll-stamp ${log.resolution.outcome.includes('success')?'success':'failure'}`}><Dices/><span>{log.resolution.selectedDie} → {log.resolution.total}</span><b>{log.resolution.outcome.replaceAll('_',' ')}</b></div>}
    {expandedSrc && <div className="plate-lightbox" role="dialog" aria-modal="true" aria-label="Illustration, expanded" onClick={() => setExpandedSrc(null)}>
      <img src={expandedSrc} alt={mood}/>
      <button type="button" ref={closeRef} className="lightbox-close" aria-label="Close the illustration" onClick={() => setExpandedSrc(null)}><X/></button>
    </div>}
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
