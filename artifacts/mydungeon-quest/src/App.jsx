import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronRight, Download, Dices, Feather, FileUp, HeartPulse, Menu, MessageCircleWarning, Plus, ScrollText, Settings as SettingsIcon, Shield, Sparkles, Swords } from 'lucide-react';
import { WorldForge, HeroForge } from './components/Forge.jsx';
import DiceOverlay from './components/DiceOverlay.jsx';
import Cinematic from './components/Cinematic.jsx';
import { CharacterSheet, Codex, Settings, Storybook } from './components/Overlays.jsx';
import { applyStateUpdates, createHero, heroRoll, rollInitiative } from './lib/rules.js';
import { applyStoryUpdates, initCodex, storyBlock } from './lib/story.js';
import { makeEntropy, validateDmTurn } from './lib/protocol.js';
import { campaignJournal, db, listCampaigns, saveCampaign } from './lib/db.js';
import { appendEvent, exportChronicle, forkChronicle, importChronicle } from './lib/seal.js';
import { recallScenes, rememberScene } from './lib/memory.js';
import { Foundry } from './lib/cinema/foundry.js';
import { cinematicPrompt, portraitPrompt, regionPrompt, scenePrompt } from './lib/cinema/prompts.js';
import { proceduralArtDataUrl } from './lib/cinema/procedural.js';
import { beatKeys, briefUpcomingBeat } from './lib/cinema/lookahead.js';
import { keyArtKey, keyArtPrompt } from './lib/cinema/prologue.js';
import { setScoreState, startScore, stopScore } from './lib/cinema/score.js';
import { speakBlocks, stopSpeaking } from './lib/cinema/voice.js';
import { buildStorybook } from './lib/storybook.js';

const DEFAULT_SETTINGS = { reduceMotion: false, haptics: true, score: true, voice: false, textScale: 1, mediaTier: 'parchment' };

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
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
  const [status, setStatus] = useState('✦ The table is set.');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const settingsRef = useRef(DEFAULT_SETTINGS); settingsRef.current = settings;
  const [bookHtml, setBookHtml] = useState('');
  const [keyArtUrl, setKeyArtUrl] = useState(null);
  const logEndRef = useRef(null);
  const regionStripRef = useRef(null);

  const refreshShelf = useCallback(async () => setCampaigns(await listCampaigns()), []);
  useEffect(() => { refreshShelf(); db.settings.get('care').then((row) => row && setSettings({ ...DEFAULT_SETTINGS, ...row.value })); }, [refreshShelf]);
  useEffect(() => { if (flow === 'table') logEndRef.current?.scrollIntoView({ behavior: settings.reduceMotion ? 'auto' : 'smooth' }); }, [current?.logs?.length, flow, settings.reduceMotion]);
  useEffect(() => {
    if (flow !== 'table' || settings.reduceMotion) return;
    const onScroll = () => { if (regionStripRef.current) regionStripRef.current.style.backgroundPositionY = `calc(50% + ${window.scrollY * 0.28}px)`; };
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [flow, settings.reduceMotion, current?.id]);
  useEffect(() => { document.documentElement.style.setProperty('--text-scale', settings.textScale); }, [settings.textScale]);
  useEffect(() => {
    if (flow === 'table' && settings.score && current) { startScore(current.title || 'chronicle'); return () => { stopScore(); stopSpeaking(); }; }
    stopScore();
  }, [flow, settings.score, current?.id]); // eslint-disable-line

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
      onAttestation: async (payload) => appendEvent(campaign.id, 'media_attestation', payload)
    });
    const jobs = [];
    const act = campaign.codex.spine.beats[campaign.codex.beatIndex]?.act || 1;
    if (act > 1) jobs.push({ kind: 'paint', prompt: keyArtPrompt(campaign, act), cacheKey: keyArtKey(campaign.id, act), options: { kind: 'scene', label: 'keyart' }, priority: 6 });
    if (dm.image_cue) jobs.push({ kind: 'paint', prompt: scenePrompt(campaign, dm.image_cue), options: { kind: 'scene' }, priority: 1, logId });
    for (const soul of dm.story?.cast_add || []) {
      const locked = campaign.codex.cast.find((entry) => entry.name === soul.name);
      if (locked) for (const variant of ['bust','full-figure','dramatic']) jobs.push({ kind: 'paint', prompt: portraitPrompt(campaign, locked, variant), options: { kind: 'portrait', label: soul.name, variant }, priority: variant === 'bust' ? 2 : 6 });
    }
    if (dm.story?.world?.region_add) {
      const region = campaign.codex.regions.find((entry) => entry.name === dm.story.world.region_add.name);
      if (region) jobs.push({ kind: 'paint', prompt: regionPrompt(campaign, region), options: { kind: 'region', label: region.name }, priority: 3 });
    }
    if (dm.cinematic && campaign.mediaTier === 'cinema') {
      const prompt = cinematicPrompt(campaign, dm.cinematic, dm.image_cue || {});
      const keys = beatKeys(campaign.id, campaign.codex.beatIndex);
      jobs.push({ kind: 'video', prompt, priority: 2, cacheKey: keys.film, options: { kind: 'beat-film', label: dm.cinematic.title } });
      jobs.push({ kind: 'music', prompt: `A 20 second cinematic stinger for ${dm.cinematic.type}; ${dm.cinematic.subtitle}`, priority: 4, cacheKey: keys.score });
      jobs.push({ kind: 'sfx', prompt: `A restrained PG-13 ambience and impact for ${dm.cinematic.type}`, priority: 4 });
      if (dm.dialogue_cue) jobs.push({ kind: 'speak', prompt: dm.dialogue_cue.line, options: { text: dm.dialogue_cue.line }, priority: 1 });
    }
    briefUpcomingBeat(campaign, foundry, campaign.codex.beatIndex);
    for (const job of jobs) {
      foundry.enqueue({ ...job, originTurnHash: turnRecord.recordHash }).then(async (asset) => {
        if (!asset) return;
        if (asset.mime.startsWith('image/') && job.options?.label === 'keyart') {
          setCurrent((prev) => { if (!prev || prev.id !== campaign.id) return prev; const next = { ...prev, keyArtHash: asset.assetHash }; saveCampaign(next); return next; });
        }
        if (job.logId && asset.mime.startsWith('image/')) {
          const dataUrl = await blobToDataUrl(asset.blob);
          setCurrent((prev) => {
            if (!prev || prev.id !== campaign.id) return prev;
            const logs = prev.logs.map((log) => log.id === job.logId ? { ...log, imageUrl: dataUrl, imageAssetHash: asset.assetHash } : log);
            const next = { ...prev, logs, spend: foundry.spend };
            saveCampaign(next); return next;
          });
        }
      }).catch(() => {});
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
      const log = { id: crypto.randomUUID(), player: visiblePlayer, sent: player, dm, ts: Date.now(), resolution: null, redacted: false };
      let next = { ...base, hero, codex, combat, logs: [...base.logs, log], pendingRoll: dm.roll_request, turnNumber: (base.turnNumber || 0) + 1, completed: codex.completed };
      await saveCampaign(next);
      const record = await appendEvent(base.id, 'turn', { player, visiblePlayer, dm, stateAfter: { hero, combat }, storyAfter: codex, entropy, resolution });
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
      if (settingsRef.current.voice && !dm.cinematic) speakBlocks(dm.narration_blocks, next.codex.cast);
      if (dm.cinematic) setCinematic({ ...dm, campaign: next, turnRecordHash: record.recordHash, beatIndex: next.codex.beatIndex });
      if (hero.level > heroBeforeLevel) setOverlay('level');
      queueMedia(next, record, dm, log.id);
      return next;
    } catch (error) {
      console.error(error); setStatus(`The road snagged: ${error.message}`); return base;
    } finally { setBusy(false); setWeaving(null); }
  }, [queueMedia, refreshShelf]);

  const beginCampaign = async (heroInput) => {
    const id = worldDraft.id || crypto.randomUUID();
    const hero = createHero(heroInput);
    const codex = initCodex(worldDraft.spineId);
    const campaign = {
      id, title: worldDraft.title, covenant: worldDraft.covenant, tone: worldDraft.tone,
      lines: worldDraft.lines, veils: worldDraft.veils, styleBible: worldDraft.styleBible, homeRegion: worldDraft.homeRegion,
      spineId: worldDraft.spineId, hero, codex, logs: [], combat: null, pendingRoll: null,
      turnNumber: 0, turnCount: 0, headHash: null, signatureStatus: 'pending', completed: false, readOnly: false, keyArtHash: null,
      mediaTier: settings.mediaTier, spend: { images: 0, videos: 0, music: 0 }, createdAt: Date.now(), updatedAt: Date.now()
    };
    await saveCampaign(campaign); setCurrent(campaign); setFlow('table');
    const prologueArt = await db.media.where('cacheKey').equals(keyArtKey(id, 1)).first();
    if (prologueArt) { campaign.keyArtHash = prologueArt.assetHash; await saveCampaign(campaign); setCurrent({ ...campaign }); }
    await playTurn(campaign, 'Begin the chronicle.', null, null);
  };

  const submit = async (text) => {
    const clean = text.trim(); if (!clean || busy || current.pendingRoll) return;
    await playTurn(current, clean);
  };

  const resolveRoll = async () => {
    if (!current.pendingRoll || busy) return;
    const result = heroRoll(current.hero, current.pendingRoll);
    setDiceResult(result);
    const resolutionRecord = await appendEvent(current.id, 'resolution', result);
    const sealed = await db.campaigns.get(current.id);
    const logs = current.logs.map((log, index) => index === current.logs.length - 1 ? { ...log, resolution: result } : log);
    const next = { ...current, logs, pendingRoll: null, headHash: sealed.headHash, turnCount: sealed.turnCount };
    await saveCampaign(next); setCurrent(next);
    setTimeout(() => playTurn(next, `Resolve ${current.pendingRoll.label}.`, result, null), 950);
  };

  const redactLast = async () => {
    const target = [...current.logs].reverse().find((log) => !log.redacted && log.recordHash);
    if (!target || busy || current.readOnly) return;
    await appendEvent(current.id, 'redaction', { targetRecordHash: target.recordHash, scope: 'active_canon' });
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

  useEffect(() => {
    let url = null, alive = true;
    (async () => {
      if (!current) { setKeyArtUrl(null); return; }
      const rows = await db.media.where('campaignId').equals(current.id).toArray();
      const art = rows.filter((row) => row.label === 'keyart' && row.blob).sort((a, b) => b.createdAt - a.createdAt)[0];
      if (art && alive) { url = URL.createObjectURL(art.blob); setKeyArtUrl(url); } else if (alive) setKeyArtUrl(null);
    })();
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [current?.id, current?.keyArtHash]); // eslint-disable-line

  if (flow === 'world') return <WorldForge mediaTier={settings.mediaTier} onBack={() => setFlow('title')} onContinue={(world) => { setWorldDraft(world); setFlow('hero'); }} />;
  if (flow === 'hero') return <HeroForge world={worldDraft} mediaTier={settings.mediaTier} onBack={() => setFlow('world')} onBegin={beginCampaign} />;
  if (flow === 'title') return <TitleScreen campaigns={campaigns} onNew={() => setFlow('world')} onOpen={(campaign) => { setCurrent(campaign); setFlow('table'); }} onRestore={restoreFile} status={status} />;
  if (!current) return null;

  return <div className="app-shell">
    <div className="region-strip" ref={regionStripRef} style={{ backgroundImage: `linear-gradient(90deg,rgba(13,11,20,.94),rgba(13,11,20,.48),rgba(13,11,20,.92)),url("${regionPlate || regionArt}")` }}>
      <span>{activeRegion?.name || current.homeRegion}</span><small>{activeRegion?.state || 'unmapped'} · blight {current.codex.blight}/5</small>
    </div>
    <header className="table-header">
      <button className="sigil-button" onClick={() => setOverlay('sheet')}><span>{current.hero.sigil}</span><div><b>{current.hero.name}</b><small>Level {current.hero.level} {current.hero.className}</small></div></button>
      <div className="header-stats"><span><HeartPulse/> {current.hero.hp}/{current.hero.maxHp}</span><span><Shield/> {current.hero.ac}</span><span className="desktop-stat">{current.hero.gold} gold</span></div>
      <nav><WaxSeal count={current.logs.length} onOpen={openStorybook} /><button onClick={() => setOverlay('codex')}><BookOpen/><span>Codex</span></button><button onClick={openStorybook}><ScrollText/><span>Book</span></button><button onClick={() => setOverlay('settings')}><SettingsIcon/><span>Care</span></button></nav>
    </header>
    {current.readOnly && <div className="read-only-banner"><Shield/> This restored chronicle verifies as an artifact but cannot impersonate its original device. <button onClick={async()=>{const fork=await forkChronicle(current);setCurrent(fork);}}>Create a signed continuation</button></div>}
    {current.combat?.active && <CombatBanner combat={current.combat} />}
    <main className="adventure-log" role="log" aria-live="polite">
      <div className={`campaign-mast${keyArtUrl ? ' has-keyart' : ''}`} style={keyArtUrl ? { backgroundImage: `linear-gradient(180deg,rgba(13,11,20,.34),rgba(13,11,20,.82) 74%,var(--ink)),url("${keyArtUrl}")` } : undefined}><span>{current.codex.spine.label} · Beat {current.codex.beatIndex + 1}/{current.codex.spine.beats.length}</span><h1>{current.codex.spine.beats[current.codex.beatIndex]?.title}</h1><p>{current.codex.spine.beats[current.codex.beatIndex]?.goal}</p></div>
      {current.logs.map((log) => log.redacted ? <div className="redacted-line" key={log.id}>⊘ A scene was removed from active canon by the player.</div> : <LogEntry key={log.id} log={log} campaign={current} />)}
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
    {overlay === 'settings' && <Settings campaign={current} settings={{...settings,mediaTier:current.mediaTier}} onChange={persistSettings} onClose={() => setOverlay(null)} />}
    {overlay === 'storybook' && <Storybook html={bookHtml} onClose={() => setOverlay(null)} onPdf={bindPdf} onHtml={() => downloadBlob(new Blob([bookHtml], {type:'text/html'}), `${current.title}.storybook.html`)} />}
    {overlay === 'level' && <div className="ritual"><Sparkles/><span>Level {current.hero.level}</span><h2>The story has made you larger.</h2><button onClick={()=>setOverlay(null)}>Accept the new name fate gives you</button></div>}
    {current.hero.hp <= 0 && <Epitaph campaign={current} onIntervene={async()=>{const hero={...current.hero,hp:Math.max(1,Math.floor(current.hero.maxHp/2)),deathTouched:true};const next={...current,hero};await appendEvent(current.id,'resolution',{type:'fates_intervention',hp:hero.hp,deathTouched:true});await saveCampaign(next);setCurrent(next);}} />}
  </div>;
}

const KEYART = ['drowned', 'mountain', 'frontier', 'gate'].map((n) => `${import.meta.env.BASE_URL}keyart/${n}.jpg`);
const ATTRACT_LINES = [
  'Write any world. Walk it alone.',
  'Every road remembers who walked it.',
  'The design stays hidden until you earn it.',
  'Your legend, sealed turn by turn.'
];
const bundledCover = (id) => KEYART[Math.abs([...String(id)].reduce((h, ch) => ((h << 5) - h + ch.charCodeAt(0)) | 0, 0)) % KEYART.length];

// Loads each saved chronicle's own painted key art (when the Foundry has made
// one) so its shelf card wears its cover; falls back to a bundled painting.
function useShelfCovers(campaigns) {
  const [covers, setCovers] = useState({});
  useEffect(() => {
    let alive = true; const urls = [];
    (async () => {
      const map = {};
      for (const c of campaigns) {
        const rows = await db.media.where('campaignId').equals(c.id).toArray();
        const art = rows.filter((r) => r.label === 'keyart' && r.blob).sort((a, b) => b.createdAt - a.createdAt)[0];
        if (art) { const u = URL.createObjectURL(art.blob); urls.push(u); map[c.id] = u; }
      }
      if (alive) setCovers(map);
    })();
    return () => { alive = false; urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [campaigns.map((c) => `${c.id}:${c.keyArtHash || ''}`).join(',')]); // eslint-disable-line
  return covers;
}

function TitleScreen({ campaigns, onNew, onOpen, onRestore }) {
  const input = useRef(null);
  const [idx, setIdx] = useState(0);
  const covers = useShelfCovers(campaigns);
  useEffect(() => { const t = setInterval(() => setIdx((i) => (i + 1) % KEYART.length), 7000); return () => clearInterval(t); }, []);
  return <main className="title-page cinematic">
    <div className="title-backdrop" aria-hidden="true">{KEYART.map((src, i) => <div key={src} className={`kb-layer${i === idx ? ' active' : ''}`} style={{ backgroundImage: `url("${src}")` }}/>)}<div className="title-veil"/></div>
    <div className="stars"/>
    <section className="title-hero">
      <div className="title-sigil">✦</div>
      <span className="eyebrow">Cinematic Edition</span>
      <h1>MyDungeon<span>.Quest</span></h1>
      <p className="attract-line" key={idx}>{ATTRACT_LINES[idx]}</p>
      <button className="primary-button hero-cta" onClick={onNew}><Swords/> Begin your legend</button>
    </section>
    {campaigns.length > 0 && <section className="shelf">
      <header><div><span className="eyebrow">Chronicle Shelf</span><h2>Your sealed worlds</h2></div><button className="secondary-button" onClick={() => input.current.click()}><FileUp/> Restore</button></header>
      <div className="shelf-grid">{campaigns.map((c) => <button className="chronicle-card has-cover" key={c.id} onClick={() => onOpen(c)} style={{ backgroundImage: `linear-gradient(180deg,rgba(15,12,20,.1),rgba(15,12,20,.66) 52%,rgba(15,12,20,.95)),url("${covers[c.id] || bundledCover(c.id)}")` }}><div className="card-sigil">{c.hero?.sigil || '✦'}</div><span className="seal-badge"><Shield size={12}/>{({ signed: 'sealed', 'hash-only': 'sealed' })[c.signatureStatus] || 'unsealed'}</span><h3>{c.title}</h3><p>{c.hero?.name} · {c.codex?.spine?.label}</p><footer><span>{c.turnCount || 0} records</span><span>{c.completed ? '✦ complete' : 'continue'} <ChevronRight size={15}/></span></footer></button>)}</div>
    </section>}
    <input ref={input} type="file" accept=".json,.chronicle.json" hidden onChange={(e) => e.target.files[0] && onRestore(e.target.files[0])} />
    <footer className="title-footer">{campaigns.length === 0 ? <button className="link-restore" onClick={() => input.current.click()}>Restore a sealed chronicle</button> : 'Yours alone · Plays offline · Every turn sealed'}</footer>
  </main>;
}

function LogEntry({ log, campaign }) {
  const cue = log.dm.image_cue;
  const art = cue ? proceduralArtDataUrl(`${campaign.id}:${log.id}`, cue.mood, log.dm.cinematic?.palette || ['#0d0b14','#4c465e','#d4a24e']) : null;
  return <article className="turn-entry">
    {log.player && <div className="player-line"><span>You</span><p>{log.player}</p></div>}
    {log.dm.cinematic && <div className="beat-line"><span>✦</span><b>{log.dm.cinematic.title}</b><small>{log.dm.cinematic.subtitle}</small></div>}
    <div className="narration">{log.dm.narration_blocks.map((block,i)=><p key={i} className={i===0?'dropcap':''}>{block.speaker && <strong>{block.speaker}</strong>}{block.text}</p>)}</div>
    {cue && <figure className="illustration-panel"><img src={log.imageUrl || art} alt={cue.mood}/><figcaption>{cue.mood}{log.imageUrl ? <span>illuminated</span> : <span>procedural plate</span>}</figcaption></figure>}
    {log.resolution && <div className={`roll-stamp ${log.resolution.outcome.includes('success')?'success':'failure'}`}><Dices/><span>{log.resolution.selectedDie} → {log.resolution.total}</span><b>{log.resolution.outcome.replaceAll('_',' ')}</b></div>}
  </article>;
}

// A wax stamp in the header. Each time a turn is committed the seal presses
// closed with a brief flash; tapping it opens the bound chronicle.
function WaxSeal({ count, onOpen }) {
  const [pressing, setPressing] = useState(false);
  const prev = useRef(count);
  useEffect(() => {
    if (count > prev.current) { setPressing(true); prev.current = count; const t = setTimeout(() => setPressing(false), 950); return () => clearTimeout(t); }
    prev.current = count;
  }, [count]);
  return <button className={`wax-seal${pressing ? ' pressing' : ''}`} onClick={onOpen} aria-label="Open the bound chronicle" title="The bound chronicle">
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <circle className="wax-blob" cx="20" cy="20" r="15.5"/>
      <circle className="wax-rim" cx="20" cy="20" r="11.5"/>
      <path className="wax-emboss" d="M20 11l2.7 6.5 7 .5-5.3 4.6 1.7 6.8L20 31.5l-6.1 3.5 1.7-6.8-5.3-4.6 7-.5z"/>
    </svg>
  </button>;
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
