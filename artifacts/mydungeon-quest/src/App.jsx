import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronRight, DoorOpen, Download, Dices, Feather, FileUp, Flame, HeartPulse, Menu, MessageCircleWarning, Pause, Play, Plus, ScrollText, Settings as SettingsIcon, Shield, Sparkles, Swords, X } from 'lucide-react';
import { WorldForge, HeroForge, clearForgeDrafts } from './components/Forge.jsx';
import DiceOverlay from './components/DiceOverlay.jsx';
import Cinematic from './components/Cinematic.jsx';
import Ceremony from './components/Ceremony.jsx';
import ChroniclePage from './components/ChroniclePage.jsx';
import { TickDivider, PendingPage, SuggestionRow, RecapCard } from './components/Sequence.jsx';
import { packClock, interludeRow, bandNotes } from './lib/clockAtTable.js';
import { anchoredWindow } from './lib/historyWindow.js';
import { orderFeed, recapFor } from 'fatescript/sequencing';
import { useToll } from './patron/toll.jsx';
import { CharacterSheet, Settings, Storybook, useGallery } from './components/Overlays.jsx';
import { Book } from './components/Book.jsx';
import { tableOf } from 'fatescript/table';
import { buildChronicleRequest, claimChapterClose, validateChroniclePassage } from 'fatescript/chronicler';
import { applyCast, applyMilestone, applyStateUpdates, companionRoll, createHero, foldDeathSave, heroRoll, milestoneLevel } from 'fatescript/rules';
import { ACT_NAMES, actInfo, applyPartyMilestone, applyStoryUpdates, chapterInfo, initCodex, requestSeal, romanNumeral, storyBlock } from 'fatescript/story';
import { makeEntropy, validateDmTurn } from 'fatescript/protocol';
// THE ARMORY (XVIII): the derived-AC settle and the attack governance
// ride from the engine's one seat; the calendar fold stamps the rest.
import { governAttackRoll, settleAc } from 'fatescript/armory';
// THE GRIMOIRE (XVIII): the caster's line, the spell rows, and the picking
// door ride from the one library — the app never re-declares a table.
import { SPELL_TABLE, casterLineOf, knownCountsFor, maxSpellLevelFor, spellClauseFor, spellRowFor, validateSpellPicks } from 'fatescript/grimoire';
import { calendarOf } from 'fatescript/calendar';
import { applyCombat } from './lib/combat.js';
import { censusNote, unrecordedSouls } from 'fatescript/census';
import { burnCampaign, campaignJournal, db, listCampaigns, saveCampaign, unburnSpine } from './lib/db.js';
import { exportChronicle, forkChronicle, importChronicle, makeEnvelope } from './lib/seal.js';
import { reconcileLegacyPurse } from './lib/reconcile.js';
import { teachOnce } from './lib/teaching.js';
import { sealLegacy, openNextVolume } from './lib/saga.js';
import { beginGenesis } from './lib/genesis.js';
import { riteOpen, riteWalk } from './lib/threshold.js';
import { ThresholdRite } from './components/Threshold.jsx';
import { composeAppearance, composeSignature } from './lib/atelier.js';
import { chronicleActClose, memoryLadder } from './lib/memoir.js';
import { greetReturning } from './lib/ravens.js';
import { fetchSeasons, skyNoteFor } from './lib/sky.js';
import { RavenNotice } from './components/RavenNotice.jsx';
import { buildBriefing } from 'fatescript/graph';
import { roomForTurn } from './lib/scriptorium.js';
import { pourPlan, pourInterval } from './lib/pour.js';
import { tellCourt } from './lib/tells.js';
import { tickUpdates, tickLogEntry } from 'fatescript/livingWorld';
import { recallScenes, rememberScene } from './lib/memory.js';
import { isProving, seedProvingCampaign } from './lib/proving.js';
import { Foundry } from './lib/cinema/foundry.js';
import { heroSoul, identityClause, plateMood, portraitPrompt, regionPrompt, scenePrompt, sceneRoster, bearingTextFor } from './lib/cinema/prompts.js';
import { markRevealed, listReveals } from './lib/reveals.js';
import { KEYART_LABEL, actOf, heroBustJob, keyArtJob, nameSeed } from './lib/cinema/prologue.js';
import { proceduralArtDataUrl } from './lib/cinema/procedural.js';
import { beatKeys, briefUpcomingBeat } from './lib/cinema/lookahead.js';
import { stopAllSound } from './lib/cinema/audioDirector.js';
import { playUiSfx } from './lib/cinema/uiSfx.js';
import { playNarration, primeNarration, stopNarration, subscribeNarration, toggleNarration } from './lib/cinema/narrator.js';
import { castHeroVoice } from 'fatescript/cinema/casting';
import { downloadQuestAudio } from './lib/cinema/questaudio.js';
import { buildStorybook } from './lib/storybook.js';
import { slugify } from 'fatescript/canonical';
import { PatronDoor } from './patron/door.jsx';
import { burnFromVault, nudgeVault, subscribeVault, syncShelf, listVaultShelf, restoreFromVault, redirectSpine, onSpineForked, onVaultSession } from './lib/vault.js';
import { settleTollReturn, tollAllows, TollNotice } from './patron/toll.jsx';
import { rememberRefusedPour, reportTollRefusal, setPourContext, tollRefusal } from './patron/tollNotice.js';
import { admitPlate, cueCourt, easelOrder, emptyFrameLine, groundFixtures, movedItems, propLawCheck, renderableTurn, seatingPlan } from './lib/plateroad.js';
import { heroSheetJob, sheetJobs } from './lib/sheets.js';

const DEFAULT_SETTINGS = { reduceMotion: false, haptics: true, narrator: false, textScale: 1, mediaTier: 'illuminated' };
// Task #50 — the recap greets a RETURN to the table, never the first seat,
// and only once per SITTING. A sitting is the tab's lifetime: sessionStorage,
// so a mid-sitting reload stays quiet and closing the tab forgets. Never
// sealed, never synced, never exported.
const sittingSet = (key) => {
  try { return new Set(JSON.parse(sessionStorage.getItem(key) || '[]')); } catch { return new Set(); }
};
const sittingMark = (key, set, id) => {
  set.add(id);
  try { sessionStorage.setItem(key, JSON.stringify([...set])); } catch { /* private mode never blocks the table */ }
};
const SEATED = sittingSet('mdq:seated');
const RECAP_SEEN = sittingSet('mdq:recap-seen');

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
    // A forked spine redirects late seals — never append to a deleted name.
    campaignId = redirectSpine(campaignId);
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
  // Every seal nudges the vault — a debounced whisper, never a spinner storm.
  run.then(() => nudgeVault(campaignId), () => {});
  return run;
}

// THE COMBAT FOLD moved whole to src/lib/combat.js (Task 57, Section 3) so
// the proving seed folds scripted battles through the SAME primitive this
// table folds — one fold, two callers, zero drift.

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

// THE MILESTONE PICKING SURFACE (XVIII, Article IV) — the ceremony is the
// second and last place learning seals: the tables say how many are owed
// at the new level, the player says which, the ONE door (validateSpellPicks)
// says whether. A non-caster, or a level owing nothing, keeps the old
// one-button rite byte for byte.
function LevelRitual({ hero, onAccept }) {
  const [picks, setPicks] = useState([]);
  const known = Array.isArray(hero.spells) ? hero.spells : [];
  const ceilings = knownCountsFor(hero.caster, hero.level);
  const owedCantrips = Math.max(0, ceilings.cantrips - known.filter((key) => SPELL_TABLE[key]?.level === 0).length);
  const owedSpells = Math.max(0, ceilings.spells - known.filter((key) => (SPELL_TABLE[key]?.level ?? 0) >= 1).length);
  if (owedCantrips === 0 && owedSpells === 0) {
    return <div className="ritual"><Sparkles/><span>Level {hero.level}</span><h2>The story has made you larger.</h2><button onClick={() => onAccept([])}>Accept the new name fate gives you</button></div>;
  }
  const table = hero.caster === 'energy' ? 'full' : hero.caster;
  const reachable = maxSpellLevelFor(hero.caster, hero.level);
  const rows = Object.entries(SPELL_TABLE).filter(([key, row]) => row.archetypes.includes(table) && row.level <= reachable && !known.includes(key));
  const heldCantrips = picks.filter((key) => SPELL_TABLE[key]?.level === 0).length;
  const heldSpells = picks.filter((key) => (SPELL_TABLE[key]?.level ?? 0) >= 1).length;
  const toggle = (key) => setPicks((held) => held.includes(key) ? held.filter((k) => k !== key) : [...held, key]);
  const verdict = picks.length ? validateSpellPicks({ archetype: hero.caster, level: hero.level, known, picks }) : { ok: true, errors: [] };
  const exact = heldCantrips === owedCantrips && heldSpells === owedSpells && verdict.ok;
  return <div className="ritual grimoire-ritual"><Sparkles/><span>Level {hero.level}</span><h2>The story has made you larger — and the book opens.</h2>
    <p className="fine-print">The tables owe you {owedCantrips} {owedCantrips === 1 ? 'cantrip' : 'cantrips'} and {owedSpells} {owedSpells === 1 ? 'spell' : 'spells'} up to the {reachable === 1 ? 'first' : reachable === 2 ? 'second' : 'third'} circle. Mechanics from tables, flavor from the tale.</p>
    <div className="spell-pick-grid">
      {owedCantrips > 0 && <div><b>Cantrips ({heldCantrips}/{owedCantrips})</b>{rows.filter(([, row]) => row.level === 0).map(([key, row]) => <label key={key} className={`spell-pick${picks.includes(key) ? ' picked' : ''}`}><input type="checkbox" checked={picks.includes(key)} onChange={() => toggle(key)} /><span>{key}</span><small>{row.school}</small></label>)}</div>}
      {owedSpells > 0 && <div><b>Spells ({heldSpells}/{owedSpells})</b>{rows.filter(([, row]) => row.level >= 1).map(([key, row]) => <label key={key} className={`spell-pick${picks.includes(key) ? ' picked' : ''}`}><input type="checkbox" checked={picks.includes(key)} onChange={() => toggle(key)} /><span>{key} · L{row.level}</span><small>{row.school}{row.concentration ? ' · concentration' : ''}</small></label>)}</div>}
    </div>
    {verdict.errors.length > 0 && <p className="fine-print">{verdict.errors[0]}</p>}
    <button disabled={!exact} onClick={() => onAccept(picks)}>Seal the learning</button>
  </div>;
}

export default function App() {
  const [campaigns, setCampaigns] = useState([]);
  const [current, setCurrent] = useState(null);
  const [flow, setFlow] = useState('title');
  const [worldDraft, setWorldDraft] = useState(null);
  const [overlay, setOverlay] = useState(null);
  // THE BOOK'S RIBBON (Directive XIV) — where the book lies open: chapter,
  // soul, place, pack. Held by the table so the book reopens to the same
  // page within the sitting; reset when the tale changes; never sealed,
  // never synced, never exported.
  const [bookNav, setBookNav] = useState({ chapter: 'tale', soul: null, place: null, pack: null });
  useEffect(() => { setBookNav({ chapter: 'tale', soul: null, place: null, pack: null }); }, [current?.id]);
  const [cinematic, setCinematic] = useState(null);
  const [ravenRecap, setRavenRecap] = useState(null);
  // THE SHARED SKY — the house's season feed, fetched once a sitting;
  // the fixture seasons stand when the house cannot be reached.
  const seasonsRef = useRef(null);
  useEffect(() => { fetchSeasons().then((list) => { seasonsRef.current = list; }).catch(() => {}); }, []);
  const [diceResult, setDiceResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pouringId, setPouringId] = useState(null);
  const [pourTick, setPourTick] = useState(0);
  const bumpPourTick = useCallback(() => setPourTick((tick) => tick + 1), []);
  const endPour = useCallback(() => setPouringId(null), []);
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
  // THE VAULT — quiet marks per spine, the vaulted shelf for restores, and
  // one whole-shelf sync when a signed-in table sits down.
  const [vaultMarks, setVaultMarks] = useState(new Map());
  const [vaultShelf, setVaultShelf] = useState([]);
  useEffect(() => subscribeVault(setVaultMarks), []);
  const refreshVaultShelf = useCallback(async () => setVaultShelf(await listVaultShelf()), []);
  useEffect(() => {
    syncShelf().then(refreshShelf).catch(() => {});
    refreshVaultShelf();
  }, [refreshShelf, refreshVaultShelf]);
  // Sign-in/sign-out mid-session: the shelf and the vaulted row redraw the
  // moment the door speaks — no reload asked of the player.
  useEffect(() => onVaultSession(() => { refreshShelf(); refreshVaultShelf(); }), [refreshShelf, refreshVaultShelf]);
  // When two tellings meet, this device's spine forks under a new name —
  // the open table follows it immediately so no write can chase the old one.
  const currentIdRef = useRef(null); currentIdRef.current = current?.id || null;
  useEffect(() => onSpineForked(async ({ from, to }) => {
    await refreshShelf();
    if (currentIdRef.current !== from) return;
    const next = await db.campaigns.get(to);
    if (next) setCurrent(next);
    setStatus('⑂ Two tellings met — this device keeps its own spine.');
  }), [refreshShelf]);
  const drawFromVault = useCallback(async (campaignId) => {
    try {
      const restored = await restoreFromVault(campaignId);
      // A deliberate restore recalls the name from the ashes — the player's
      // own hand outranks the pyre registry, but only once the pages are
      // truly back (a failed restore must not lift the burn guard early).
      unburnSpine(campaignId);
      await refreshShelf(); await refreshVaultShelf();
      setCurrent(restored); setFlow('table');
    } catch (error) { setStatus(`✦ The vault would not open: ${error.message}`); }
  }, [refreshShelf, refreshVaultShelf]);
  // THE PYRE — burning a tale is vault-first: local ash only after the vault
  // lets go (or has nothing to hold), so a "deleted" spine can never haunt
  // the vaulted shelf and drift back on the next sitting.
  const burnSpine = useCallback(async (campaign) => {
    try {
      const word = await burnFromVault(campaign.id);
      await burnCampaign(campaign.id);
      if (currentIdRef.current === campaign.id) setCurrent(null);
      await refreshShelf(); await refreshVaultShelf();
      setStatus(word === 'burned' ? `✦ "${campaign.title}" is burned — this shelf and the vault both.` : `✦ "${campaign.title}" is burned from this device.`);
    } catch {
      setStatus('✦ The vault would not let go — the tale stays whole until it can burn everywhere at once.');
    }
  }, [refreshShelf, refreshVaultShelf]);
  const burnVaultSpine = useCallback(async (spine) => {
    try {
      const word = await burnFromVault(spine.campaignId);
      if (word === 'dormant') { setStatus('✦ The vault is out of reach — nothing was burned.'); return; }
      await refreshVaultShelf();
      setStatus(`✦ "${spine.title}" is burned from the vault.`);
    } catch { setStatus('✦ The vault would not let go — nothing was burned.'); }
  }, [refreshVaultShelf]);
  // CLOSE THE BOOK — leave the table for the hearth. Every told page is
  // already sealed as it was lived; closing loses nothing but the chair's
  // warmth. (The header disables this while the scribe is mid-stroke, so a
  // landing turn can never chase a player onto another table.)
  const closeBook = useCallback(async () => {
    setOverlay(null); setCinematic(null); setDiceResult(null); setPouringId(null);
    pendingNarrationRef.current = null; pendingActRef.current = null;
    setPaintingImages({});
    setCurrent(null); setFlow('title');
    await refreshShelf(); refreshVaultShelf();
    setStatus('✦ The book rests on the shelf — every page kept.');
  }, [refreshShelf, refreshVaultShelf]);
  useEffect(() => { refreshShelf(); db.settings.get('care').then((row) => { if (!row) return; const { score: _score, voice: _voice, ...kept } = row.value || {}; const value = { ...DEFAULT_SETTINGS, ...kept }; if (value.mediaTier === 'cinema') value.mediaTier = 'illuminated'; setSettings(value); }); }, [refreshShelf]);
  // THE POURED-AGAIN OFFER — a refused pour that sent the patron to checkout,
  // waiting for their word (or, for an idempotent paint, already flowing).
  const [pourOffer, setPourOffer] = useState(null);
  // THE THRESHOLD RITE (XVII, Article VII) — genesis wears the house's
  // face: TRUE stages walked forward off the pipeline's own events.
  const [rite, setRite] = useState(null);
  // Pour a remembered refused intent again. Opens the intent's own table if
  // the shelf is showing (a checkout return lands on the title screen), then
  // retries by kind. Media kinds re-queue the sealed log's jobs; a refused
  // THE RAVENS — on open, the world accounts for its absence: measured
  // from the last sealed record (never a settings save), walked one
  // sealed batch per elapsed day under the engine's cap, and told as a
  // recap whose every line traces to a row sealed on this very open.
  const greetTale = useCallback(async (tale) => {
    try {
      if (!tale || tale.readOnly || tale.completed) return;
      const journal = await campaignJournal(tale.id);
      const lastSealTs = journal.length ? Number(journal[journal.length - 1].ts) || 0 : 0;
      const { campaign: walked, recap } = await greetReturning(tale, lastSealTs, { seal, save: saveCampaign, reload: (id) => db.campaigns.get(id) });
      if (recap) {
        setRavenRecap(recap);
        if (currentIdRef.current === walked.id) setCurrent(walked);
        await refreshShelf();
      }
    } catch (error) { console.error('The ravens stayed on the wire:', error); }
  }, [refreshShelf]);
  // DM turn replays the very words the innkeeper refused.
  const retryRefusedPour = async (intent) => {
    try {
      let campaign = current;
      if (intent.campaignId && campaign?.id !== intent.campaignId) {
        campaign = await db.campaigns.get(intent.campaignId);
        if (campaign?.mediaTier === 'cinema') campaign = { ...campaign, mediaTier: 'illuminated' };
        if (campaign) campaign = await reconcileLegacyPurse(campaign); // a refused pour can land a legacy tale writable too
        if (campaign) { setCurrent(campaign); setFlow('table'); }
      }
      if (!campaign) { setStatus('✦ The refused pour could not find its table again.'); return; }
      if (intent.kind === 'dm') {
        if (intent.player) await playTurn(campaign, intent.player, intent.resolution || null, intent.visiblePlayer ?? intent.player);
        return;
      }
      if (intent.kind === 'retell' && typeof intent.beatIndex === 'number') {
        await chronicleChapterClose(campaign, intent.beatIndex);
        return;
      }
      if (intent.kind === 'pdf') {
        // The book must be rebuilt before it can be bound — open it to the
        // bind button rather than pressing a stale binding blind.
        await openStorybook('Letter', campaign);
        return;
      }
      // Media kinds (paint, speak, music, sfx…): re-queue the refused log's
      // jobs against its sealed turn — the foundry's cache keeps what already
      // landed, so only the refused pour actually flows.
      const log = campaign.logs.find((entry) => entry.id === intent.logId)
        || [...campaign.logs].reverse().find((entry) => !entry.redacted && entry.dm && entry.recordHash);
      if (log?.dm) {
        queueMedia(campaign, { recordHash: log.recordHash }, log.dm, log.id);
        setStatus('✦ The refused pour flows again.');
      }
    } catch (error) {
      setStatus(`✦ The pour would not flow again: ${error.message}`);
    }
  };
  // Returning from the Stripe rooms: settle the ?toll= mark once — refresh
  // the standing server-side, wipe the mark from the bar, speak the outcome.
  // A paid return may carry the refused pour back: idempotent paints flow
  // again on their own; anything else waits for the patron's word.
  useEffect(() => {
    settleTollReturn().then((settled) => {
      if (!settled) return;
      if (settled.word) setStatus(settled.word);
      const intent = settled.retry;
      if (!intent) return;
      if (intent.kind === 'paint') { retryRefusedPour(intent); return; }
      setPourOffer(intent);
    }).catch(() => {});
  }, []); // eslint-disable-line
  // Task #50 — sequencing state: the toll tells us a real Chronicler is
  // possible (keyless tables never hold a pending seat); the recap stages
  // once per sitting from sealed material only.
  const toll = useToll();
  const [pendingRetells, setPendingRetells] = useState(() => new Set());
  const [recap, setRecap] = useState(null);
  useEffect(() => {
    if (flow !== 'table' || !current?.id) { setRecap(null); return; }
    const returning = SEATED.has(current.id);
    sittingMark('mdq:seated', SEATED, current.id);
    if (!returning || RECAP_SEEN.has(current.id)) return;
    const moment = recapFor(current);
    if (!moment) return;
    sittingMark('mdq:recap-seen', RECAP_SEEN, current.id);
    setRecap({ ...moment, campaignId: current.id });
  }, [flow, current?.id]);
  // STILLNESS FOR THOSE WHO ASK — the OS-level preference quiets the table
  // exactly like the Care toggle; either voice is enough.
  const stillness = settings.reduceMotion || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { if (flow === 'table') logEndRef.current?.scrollIntoView({ behavior: stillness ? 'auto' : 'smooth' }); }, [current?.logs?.length, flow, stillness]);
  // Follow the prose as it pours: each tick of the sealed page's pour keeps
  // the newest text in view (instant, so rapid updates don't fight a smooth
  // animation) — older narration rises off the top like a live podcast transcript.
  useEffect(() => { if (flow === 'table' && pourTick > 0) logEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' }); }, [pourTick, flow]);
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
    // THE SHARED SKY — the world's own switch: 'off' closes this sky,
    // and a closed sky is a silent one. Mirrored like the tier above.
    if (current && next.sky && next.sky !== (current.sky || 'open')) {
      const updated = { ...current, sky: next.sky }; setCurrent(updated); await saveCampaign(updated);
    }
  };

  const queueMedia = useCallback(async (campaign, turnRecord, dm, logId) => {
    if (campaign.mediaTier === 'parchment') return;
    // The ambient pour context: if a job in this batch is refused deep in the
    // foundry, the remembered intent knows which table and which log to
    // return to after the patron raises their seat.
    setPourContext({ campaignId: campaign.id, logId });
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
          mood: plateMood(dm, 140) || 'the unfolding scene',
          subjects: presentCast,
          region: campaign.codex.regions?.[0]?.name || campaign.homeRegion
        };
    // ONE TURN, ONE PAINTING — the plate is keyed to the turn's own seal, so
    // turns described in similar words never collapse onto one cached
    // painting, while the SAME turn (a reopen, a refused pour flowing again)
    // finds its own again instead of repainting. The brief carries the turn's
    // actual prose and a per-turn framing from the wheel, so variety comes
    // from composition — the subjects' appearance canon and reference
    // anchors stay wired in regardless.
    const sceneMoment = {
      // LAW IX — the Art Director names the staged moment on the cue
      // itself; the whole-page join serves replay only, for turns
      // sealed before the chair opened. THIS LAW HAS A MIRROR: the
      // mint-law re-lay door (fireMintLadder, harvest.spec.ts) rebuilds
      // this exact object to prove fidelity — move this, move the mirror.
      prose: (typeof dm.image_cue?.moment === 'string' && dm.image_cue.moment.trim()
        ? dm.image_cue.moment
        : (dm.narration_blocks || []).map((block) => block?.text || '').join(' ')).slice(0, 480),
      seed: turnRecord.recordHash || String(logId || ''),
      // The roster's first chair: the turn's first attributed voice. The
      // easel seats speaker → villain → bond, deterministic (bearing law).
      speaker: (dm.narration_blocks || []).find((block) => block?.speaker)?.speaker || null,
      // THE PAINTED SPELL (XVIII, Article VI): the cast's visual clause
      // rides its OWN field, byte for byte from the grimoire row — never
      // through prose, which slices at 480 and would tear the bytes.
      ...(spellClauseFor(dm.story) ? { spellClause: spellClauseFor(dm.story) } : {})
    };
    // Reference anchors follow the roster — the same painted-first seating
    // the scene prompt uses, so no staged soul spends a reference slot a
    // painted face needed (the drifting-face law). The first chair's locked
    // bearing rides along as the Warden's brief: post-anchor renders are
    // judged beside the anchor, and a stranger never ships (Phase 13).
    const seating = sceneRoster(campaign, sceneCue, sceneMoment);
    // THE HERO'S BEARING — she lives outside the cast wiki, so hero-led
    // scenes went unwardened from the start: her likeness and mark rode on
    // prompt obedience alone. But her canon is still a bearing. When she
    // leads the painted roster, the warden now holds the scene to HER
    // identity line — same face, and the named mark present (the brief's
    // signature law names the distinguishing feature, never lettering).
    const leadName = seating.painted[0]?.name || null;
    const sceneBearing = leadName
      ? (campaign.hero && String(leadName).trim().toLowerCase() === String(campaign.hero.name).trim().toLowerCase()
          ? `${campaign.hero.name} — ${identityClause(heroSoul(campaign.hero))}`
          : bearingTextFor(campaign, leadName))
      : null;
    // THE SLOT LAW (XVII, Article II) — the seating plan is deterministic
    // from the sealed cue: principal and ground always ride, cue subjects
    // follow, one species sheet covers every instance, a prop-lawful item
    // earns a slot. The foundry resolves each seat to its composite sheet
    // (or sealed anchor while the sheet is still minting) and binds every
    // attached image to its subject in plain words.
    const speciesInFrame = dm.story?.creature_add?.species ? [dm.story.creature_add.species] : [];
    const scenePlan = seatingPlan({
      cue: { subjects: seating.painted.map((seat) => seat.name), items: dm.image_cue?.items || [] },
      region: sceneCue.region || null,
      species: speciesInFrame
    }).plan;
    jobs.push({ kind: 'paint', prompt: scenePrompt(campaign, sceneCue, sceneMoment), options: { kind: 'scene', ...(sceneMoment.prose ? { moment: { prose: sceneMoment.prose } } : {}), referenceLabels: scenePlan.map((seat) => seat.name), seating: scenePlan, ...(sceneBearing ? { warden: { kind: 'soul', bearingText: sceneBearing } } : {}) }, priority: 1, logId, cacheKey: turnRecord.recordHash ? `scene:${campaign.id}:${turnRecord.recordHash}` : undefined });
    for (const soul of dm.story?.cast_add || []) {
      const locked = campaign.codex.cast.find((entry) => entry.name === soul.name);
      if (locked) for (const variant of ['bust','full-figure','dramatic']) jobs.push({ kind: 'paint', prompt: portraitPrompt(campaign, locked, variant), options: { kind: 'portrait', label: soul.name, variant, seed: nameSeed(soul.name), referenceLabels: variant === 'bust' ? [] : [soul.name], ...(variant === 'bust' ? {} : { warden: { kind: 'soul', bearingText: bearingTextFor(campaign, soul.name) } }) }, priority: variant === 'bust' ? 0 : 6 });
    }
    if (dm.story?.world?.region_add) {
      const region = campaign.codex.regions.find((entry) => entry.name === dm.story.world.region_add.name);
      if (region) jobs.push({ kind: 'paint', prompt: regionPrompt(campaign, region), options: { kind: 'region', label: region.name, seed: nameSeed(region.name) }, priority: 3 });
    }
    if (dm.story?.world?.region_update) {
      // The land sickens without moving: geography holds by the region's
      // own seed and canon text. When the update turns the region's STATE —
      // its season of fortune — the plate paints FRESH, never anchored to
      // the old state's pixels: an anchor drags yesterday's palette into
      // today's ruin, and the change of fortune must be unmistakable at a
      // glance. Same-state refreshes keep the anchor, so geography holds
      // exactly when nothing but detail moved.
      const region = campaign.codex.regions.find((entry) => entry.name === dm.story.world.region_update.name);
      const stateTurned = dm.story.world.region_update.state != null;
      if (region) jobs.push({ kind: 'paint', prompt: regionPrompt(campaign, region), options: { kind: 'region', label: region.name, seed: nameSeed(region.name), ...(stateTurned ? {} : { referenceLabels: [region.name] }) }, priority: 3 });
    }
    // THE REFERENCE SHEETS (XVII, Article I) — every introduction mints its
    // composite sheet beside its sealed anchor: souls, places on their
    // standing state, species, notable items. Rank 2 — after the identity
    // busts (0) and this moment's own plate (1): the sheet serves every
    // FUTURE plate and never delays the turn that introduced its subject.
    jobs.push(...sheetJobs(campaign, dm.story));
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
    // THE TOLL-HOUSE, advisory: when the last-read standing says a kind's
    // measure is spent (or was never on this table), don't send the request
    // at all — the house would only refuse it. The server clamp remains the
    // law; an unknown or dormant standing changes nothing.
    // THE BENCH FLUSHES BY RANK — identity anchors (busts, rank 0) must enter
    // the lane before the scene (rank 1) that will cite them as references.
    // Array order alone once let a turn's first scene start painting before
    // the very faces it was meant to hold existed; the lane then honored the
    // queue, but the scene was already on the easel.
    const settlements = [];
    // THE EASEL PRIORITY (XVII): the paint asks enter the wire before the
    // audio asks, deterministically — easelOrder is the one road's own sort
    // (paint class first, priority within class, declaration order on ties).
    for (const job of easelOrder(jobs.filter((entry) => tollAllows(entry.kind)))) {
      // The scene plate is painting: show a shimmer over the procedural stand-in
      // until the illuminated image lands (or the job resolves without one).
      if (job.logId && job.kind === 'paint') setPaintingImages((prev) => ({ ...prev, [job.logId]: true }));
      settlements.push(foundry.enqueue({ ...job, originTurnHash: turnRecord.recordHash }).then(async (asset) => {
        if (job.logId && job.kind === 'paint') clearPainting(job.logId);
        if (!asset) return;
        if (job.logId && job.kind === 'paint' && asset.mime.startsWith('image/')) {
          const dataUrl = await blobToDataUrl(asset.blob);
          setCurrent((prev) => {
            if (!prev || prev.id !== campaign.id) return prev;
            // THE FRESH PLATE LAW (XVII, Article III) — the plate lands with
            // its papers: the asset's own attested origin. The render door
            // (admitPlate) will hold these papers against the log's sealed
            // hash; a stand-in from another moment shows an honest empty
            // frame, never yesterday's painting.
            const logs = prev.logs.map((log) => log.id === job.logId ? { ...log, imageUrl: dataUrl, imageAssetHash: asset.assetHash, imagePapers: { assetHash: asset.assetHash, originTurnHash: asset.originTurnHash ?? null } } : log);
            const next = { ...prev, logs };
            saveCampaign(next); return next;
          });
        }
      }).catch(() => {
        // A paint rejection must clear the shimmer, or the turn's plate is stuck
        // "painting…" forever with no image ever arriving.
        if (job.logId && job.kind === 'paint') clearPainting(job.logId);
      }));
    }
    // THE METER SETTLES ONCE (54C) — after every lane in this batch lands or
    // falls, ONE delta over this foundry's construction base merges into the
    // live row. Riding the scene landing lost counts two ways: a cache-hit
    // scene resolving before uncached siblings froze the delta early, and a
    // refused or fallen scene skipped the merge entirely while siblings had
    // minted. Two foundries can count in parallel lanes at genesis, so the
    // merge is a delta, never an absolute — an absolute write here clobbered
    // the prologue easel's tally (this foundry is seeded from the sealed
    // campaign arg, BEFORE the prologue merge landed).
    Promise.allSettled(settlements).then(() => {
      const delta = {
        images: (foundry.spend?.images || 0) - (campaign.spend?.images || 0),
        music: (foundry.spend?.music || 0) - (campaign.spend?.music || 0)
      };
      if (!delta.images && !delta.music) return;
      setCurrent((prev) => {
        if (!prev || prev.id !== campaign.id) return prev;
        const next = { ...prev, spend: { images: (prev.spend?.images || 0) + delta.images, music: (prev.spend?.music || 0) + delta.music } };
        saveCampaign(next);
        return next;
      });
    });
  }, []);

  const playTurn = useCallback(async (base, player, resolution = null, visiblePlayer = player, hooks = null) => {
    if (!base || base.readOnly || base.completed) return base;
    setBusy(true); setStatus('The Dungeon Master is reading the road…');
    try {
      const entropy = makeEntropy();
      // THE LONG MEMORY — [MEMORY] drinks the ladder first: annals
      // newest-first (the freshest in full, elders as headlines), then the
      // recalled scenes. Year two remembers year one from the record alone.
      const memory = [...memoryLadder(base), ...(await recallScenes(base.id, player, base.turnNumber || 0))];
      // THE CHRONICLEGRAPH: [STORY] is a budgeted, scene-first pack — souls
      // present, their ties, the villain, the standing world — not a flat dump.
      let story;
      try { story = buildBriefing(base); } catch { story = storyBlock(base.codex); }
      // THE CLOCK AT THE TABLE — Directive VI, Phase 1: the derived world
      // clock rides the [STORY] pack, so the DM reads the same hour the
      // codex head shows. One clock, two witnesses; derived, never stored.
      story = { ...story, clock: packClock(base.logs) };
      // THE SHARED SKY — the omen rides the pack additively, like the
      // clock: a hook, never a command; a closed sky adds nothing.
      const sky = skyNoteFor(base, seasonsRef.current);
      if (sky) story = { ...story, sky };
      // THE SCRIPTORIUM — the room plans, the door speaks: the keyless
      // mock room convenes over the record, its plan is courted for
      // silence, and only a silent plan's directives ride the pack —
      // additively, like the clock and the sky. A plan that tries to
      // speak is discarded whole; One Door is fed, never amended.
      // A rider that stumbles never takes the turn down: the tale walks
      // on without its counsel, and the door still speaks.
      let room = null;
      try { room = roomForTurn(base); } catch { room = null; }
      if (room) story = { ...story, directives: [...(story.directives || []), ...room.directives] };
      // THE HUMAN HAND — the tell court: the sealed record is measured
      // (free, deterministic; struck rows stay struck), and when a tell
      // family runs hot its counter-directive rides the pack — capped
      // at three, hottest first. The court measures; it never rewrites.
      // The pressure lands on this coming turn, where pressure belongs.
      let hand = { directives: [] };
      try { hand = tellCourt(base); } catch { hand = { directives: [] }; }
      if (hand.directives.length) story = { ...story, directives: [...(story.directives || []), ...hand.directives] };
      // THE WRITERS' ROOM (Directive XI) — the standing beat's index rides
      // the pack (additive, like the clock and the sky) so the server room
      // can seat its Director cache; the carried intent rides home the same
      // way, returning the Director's word for the beat it was spoken to.
      story = { ...story, beat: { ...(story.beat || {}), index: base.codex.beatIndex } };
      if (base.roomIntent && Number.isInteger(base.roomIntent.beat_index) && base.roomIntent.beat_index === base.codex.beatIndex) {
        story = { ...story, beat_intent: base.roomIntent };
      }
      // THE EDITOR'S DOCKET (Directive XI, Law VI) — the prior turn's
      // roads ride additively so the room's sameness court holds its
      // cross-evidence; redacted pages surrender their roads with the rest.
      const priorRoads = [...base.logs].reverse().find((entry) => !entry.redacted && Array.isArray(entry.dm?.suggestions) && entry.dm.suggestions.length);
      if (priorRoads) story = { ...story, prior_suggestions: priorRoads.dm.suggestions.filter((road) => typeof road === 'string').slice(0, 6) };
      // The DM keeps its own memory now: prior turns ride along as a
      // real conversation, so prose has continuity — and the stable
      // prefix caches on the server side. Spans are the table's own clock
      // rows — sealed time, not speech — so the conversation skips them.
      // (0.9.0 review round) TWENTY ROWS, NOT FIFTEEN — the Editor's echo
      // court reads a twenty-page window (Law VI); the client must furnish
      // what the court is owed or pages sixteen-to-twenty back can never
      // convict. (Task 54) THE ANCHORED WINDOW replaces the sliding
      // slice(-20): the window start advances only in steps, never by one,
      // so between re-anchors each turn's history is a byte-stable prefix
      // of the next and the server-side prompt cache actually reads. The
      // floor never furnishes fewer than the twenty entries the court is
      // owed. A redaction lawfully invalidates the cache (rare, accepted).
      const history = anchoredWindow(base.logs.filter((entry) => !entry.redacted && entry.kind !== 'tick' && entry.kind !== 'span' && entry.kind !== 'annal')).flatMap((entry) => [
        { role: 'user', content: entry.sent || entry.player || 'Continue.' },
        { role: 'assistant', content: (entry.dm?.narration_blocks || []).map((block) => block.text).join('\n\n') }
      ]).filter((message) => message.content);
      const payload = {
        campaign: { id: base.id, title: base.title, covenant: base.covenant, tone: base.tone, lines: base.lines, veils: base.veils, styleBible: base.styleBible, homeRegion: base.homeRegion },
        spine: { label: base.codex.spine.label, beats: base.codex.spine.beats },
        // THE CASTER'S LINE (XVIII, Cache Posture §2): the casting evidence
        // seats LAST in the [STATE] block — the dynamic tail of the
        // never-cached user message, so slots may vary turn to turn while
        // the cached prefix holds byte-stable.
        history, hero: base.hero, state: { hero: base.hero, combat: base.combat, caster_line: casterLineOf(base.hero) },
        story, memory, entropy, player, resolution, turn: base.turnNumber || 0, genesis: (base.turnNumber || 0) === 0
      };
      // THE FIRST WORD (Task 54C §1): the request is initiated first, the
      // signal fires the instant it is on the wire, and only then is the
      // response awaited — so a genesis easel kicked on this signal can
      // never put paint on the wire ahead of the pour.
      const dmRequest = fetch('/api/dm?stream=1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      hooks?.onPourDispatched?.();
      const response = await dmRequest;
      if (response.status === 402) {
        // THE INNKEEPER at the table's edge — the refusal arrives in the
        // house's own voice, shown as a receipt (tally, page-turn, the raised
        // seat) rather than only a line of error text.
        const closed = await response.json().catch(() => ({}));
        reportTollRefusal(closed);
        // Remember the refused turn itself — the player's words, the die —
        // so a paid return can offer to play it again, not just apologize.
        rememberRefusedPour({ kind: 'dm', campaignId: base.id, player, visiblePlayer, resolution });
        throw new Error(closed.error || 'The innkeeper leans in: this month\'s measure is spent. The ledger turns its page on the first.');
      }
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
                // THE CURTAIN (Directive XI, Law I): the door speaks one
                // story event — the sealed turn. Heartbeat comment lines
                // never match the event/data prefixes, so they fall away
                // here without a handler.
                if (eventName === 'turn') body = data;
              } catch { /* keep reading */ }
            }
          }
        }
      } else {
        body = await response.json();
      }
      if (!body?.turn) throw new Error('The stream ended before the turn arrived.');
      const dm = body.turn;
      // THE ROOM'S WORD RIDES HOME (Directive XI) — the Director's intent
      // and the room's ledger arrive beside the sealed turn: the intent is
      // carried on the campaign row so the next pour returns it (the cache
      // that costs nothing), the ledger lands on the row and in the seal —
      // written as spent, never reconstructed.
      const beatIntent = body.beat_intent ?? null;
      const roomLedger = body.room_ledger ?? null;
      // The cast snapshot is taken BEFORE this turn's updates apply, so a
      // soul may speak its dying words in the very turn that kills it — and
      // the dead of earlier turns cannot be given dialogue at all. The
      // ground courts (Directive VII) seat from the same pre-turn record:
      // scene ?? null attests honestly that no scene stands yet. The party,
      // fixture, and speaker courts (Directive VIII) seat from `story` — the
      // SAME briefing evidence the request itself carried — so the landing
      // runs precisely the court the road ran: same turn, same entropy, the
      // same seated record byte for byte. Absent evidence leaves a court out
      // of session on BOTH benches alike, never on one.
      const landingContext = { cast: base.codex.cast, threads: base.codex.threads || [], trove: base.codex.trove || [], purses: base.codex.purses || [], regions: base.codex.regions || [], scene: base.codex.scene ?? null, hero: base.hero?.name || null };
      if (Array.isArray(story?.party_state)) landingContext.party = story.party_state.map((member) => member?.name).filter((memberName) => typeof memberName === 'string');
      if (Array.isArray(story?.presence_state)) landingContext.presence = story.presence_state;
      if (Array.isArray(story?.fixture_state)) landingContext.fixtures = story.fixture_state;
      // THE BATTLE CUT (Directive X): the bestiary and the standing
      // combatants seat the same courts the door ran — both benches alike,
      // from the same briefing evidence and the same pre-turn combat.
      if (Array.isArray(story?.bestiary_state)) landingContext.bestiary = story.bestiary_state;
      if (Array.isArray(base.combat?.enemies)) landingContext.combatants = base.combat.enemies.map((enemy) => ({ id: enemy?.id, name: enemy?.name, hp: enemy?.hp, ...(typeof enemy?.species === 'string' ? { species: enemy.species } : {}) }));
      if (Array.isArray(story?.sheet_state)) landingContext.sheets = story.sheet_state.map((row) => row?.name).filter((name) => typeof name === 'string');
      // THE CASTING LAW (XVIII, Article V): the landing bench seats the
      // same casting evidence the server judged — the hero's learned
      // list, slots, tank, and held thread; the sheeted casters from the
      // same briefing rows. Both benches alike, byte for byte.
      if (Array.isArray(base.hero?.spells)) landingContext.heroSpells = base.hero.spells;
      if (base.hero?.spellSlots && typeof base.hero.spellSlots === 'object') landingContext.casterSlots = base.hero.spellSlots;
      if (typeof base.hero?.caster === 'string') landingContext.heroCaster = base.hero.caster;
      if (base.hero?.spellEnergy && typeof base.hero.spellEnergy === 'object') landingContext.spellEnergy = base.hero.spellEnergy;
      if (typeof base.hero?.concentration === 'string' && base.hero.concentration) landingContext.concentration = base.hero.concentration;
      if (Array.isArray(story?.sheet_state)) landingContext.sheetCasters = story.sheet_state.filter((row) => Array.isArray(row?.spells));
      // THE REST LAW (XVIII, Article III): the calendar day and the rest
      // mark seat the same once-per-day court the door ran — from the SAME
      // briefing evidence (calendar_state) and the hero the request carried.
      if (Number.isInteger(story?.calendar_state?.day)) {
        landingContext.day = story.calendar_state.day;
        landingContext.lastRestDay = Number.isInteger(base.hero?.lastRestDay) ? base.hero.lastRestDay : null;
      }
      const validation = validateDmTurn(dm, entropy, landingContext);
      // THE CENSUS AT THE LANDING — Directive VI, Phase 11: the same court
      // the door ran, run once more where the turn becomes record, on the
      // same pre-turn snapshot. A stranger who survived the road is refused
      // here by name — the codex only knows what the ops declare.
      const strangers = unrecordedSouls(dm, base.codex.cast, { hero: base.hero });
      // THE IDENTITY CEILING & THE PROP LAW (XVII, Articles II & IV) — the
      // cue's own courts sit at the landing exactly as they sit in the
      // server's judgeTurn: same evidence, same refusals, both benches in
      // lockstep (the DM-turn reliability law).
      const cueBench = cueCourt(dm.image_cue);
      const propBench = propLawCheck(dm.image_cue, {
        trove: landingContext.trove,
        fixtures: groundFixtures(landingContext.fixtures || [], landingContext.scene?.region || null),
        moved: movedItems(dm.story)
      });
      if (!validation.ok || strangers.length || !cueBench.ok || !propBench.ok) {
        throw new Error([
          ...(validation.ok ? [] : validation.errors),
          ...(strangers.length ? [censusNote(strangers)] : []),
          ...cueBench.violations,
          ...propBench.refusals,
        ].join('; '));
      }
      let codex = applyStoryUpdates(base.codex, dm.story, { turn: base.turnNumber || 0, heroName: base.hero?.name, heroLevel: base.hero?.level, heroConcentration: base.hero?.concentration || null });
      if (dm.state_updates?.chronicle_add) codex.chronicle = [...codex.chronicle, String(dm.state_updates.chronicle_add).slice(0, 260)];
      // THE SWORN-THREAD BEAT (Directive XII §VI.3) — the first thread the
      // tale ever swears earns one teaching line; presentation-state only.
      if (!(base.codex.threads || []).length && (codex.threads || []).length) teachOnce(base.id, 'thread').then((line) => line && setStatus(`✦ ${line}`)).catch(() => {});
      const heroBeforeLevel = base.hero.level;
      let hero = applyStateUpdates(base.hero, dm.state_updates, { day: calendarOf(base.logs || []).day });
      // THE MILESTONE LAW (Directive XII §I) — the level is the road's own:
      // the spine's milestones move it, xp stays a kept ledger of deeds.
      // Folded HERE, at the one funnel every input path passes through, so
      // the level overlay below and the party's lockstep re-seat ride the
      // same sealed turn. A grant earlier this turn seated at the standing
      // level; the re-seat carries it to the new one in the same breath.
      const milestone = milestoneLevel(codex.spine, codex.beatIndex);
      if (milestone > hero.level) {
        hero = applyMilestone(hero, milestone);
        codex = applyPartyMilestone(codex, milestone);
      }
      // THE CASTING FOLD (XVIII, Article V): the hero's own tank spends at
      // the rules seat — exactly one slot of the spell's level, the held
      // thread honored — after the door has ruled. A refused fold returns
      // the same hero; the ledger's note is the door's business.
      const heroCastOp = dm.story?.cast_spell;
      if (heroCastOp && typeof heroCastOp === 'object' && !Array.isArray(heroCastOp) && base.hero?.name
          && String(heroCastOp.caster || '').trim().toLowerCase() === String(base.hero.name).trim().toLowerCase()) {
        const castRow = spellRowFor(heroCastOp.spell);
        if (castRow) hero = applyCast(hero, castRow, { release: heroCastOp.release === true });
      }
      // THE DERIVED TRUTH (XVIII, Article I) — the hero's AC settles from
      // the post-turn record at the one funnel every input path passes
      // through: worn table rows and DEX alone write it, never an op's
      // opinion, so an equip moves the number the very turn it lands.
      hero = settleAc(hero, codex.trove || []);
      const combat = applyCombat(base.combat, dm.combat, hero, { bestiary: codex.bestiary || [], entropy, party: (base.codex.party || []).map((member) => member?.name).filter((memberName) => typeof memberName === 'string') });
      // Combat opens: one drawn blade, one accent, through the Director — it
      // yields (and is dropped) if the narrator already holds the stage.
      if (combat?.active && !base.combat?.active) playUiSfx(base, 'sword');
      // THE DEED LINE — a turn where the player acted rather than spoke still
      // shows in sequence: the die that fell, in plain words. Derived HERE, at
      // the one funnel every input path passes through, so live rolls and
      // refused pours poured again all get it without remembering to pass it.
      // Kept apart from `player` so retellings never quote a die as speech.
      const deed = !visiblePlayer && resolution
        ? `The ${resolution.selectedDie || 'die'} falls ${resolution.total} — ${String(resolution.outcome || '').replaceAll('_', ' ')}.`
        : null;
      // The row now carries the roll the seal has always kept (additive,
      // duplicating sealed truth only) so the narrator can direct the line
      // — a dying friend sounds like one. Retellings still quote the deed,
      // never the die.
      // THE ROW'S OWN CLOCK (Task 58C) — every turn row carries its turn
      // number, as tick rows always have: citations speak turns, and the
      // log array's INDEX is not a turn once ticks ride between rows. The
      // sealed payload never includes the row object, so the stamp moves
      // no hashes; rows from before this law simply cite nothing.
      // THE QUIET TABLE (XVII) — what the log row carries to render surfaces
      // passes the whitelist; court language stays in the sealed record's
      // ledger, structurally absent here because it is never copied.
      const log = { id: crypto.randomUUID(), player: visiblePlayer, deed, sent: player, dm: renderableTurn(dm), ts: Date.now(), resolution, redacted: false, turn: base.turnNumber || 0, beatIndex: codex.beatIndex, room: roomLedger };
      // A completing turn strands no die: the tale that just ended has no
      // roll left to make.
      let next = { ...base, hero, codex, combat, logs: [...base.logs, log], pendingRoll: codex.completed ? null : dm.roll_request, turnNumber: (base.turnNumber || 0) + 1, completed: codex.completed, roomIntent: beatIntent };
      await saveCampaign(next);
      // THE POUR — the sealed page pours into its permanent seat (never a
      // provisional article): the entry is marked, the text grows in place,
      // and no node is ever swapped out from under the reader.
      setPouringId(log.id);
      const record = await seal(base.id, 'turn', { player, visiblePlayer, deed, dm, stateAfter: { hero, combat }, storyAfter: codex, entropy, resolution, room: roomLedger });
      const sealed = await db.campaigns.get(base.id);
      next = { ...next, headHash: sealed.headHash, turnCount: sealed.turnCount, signatureStatus: sealed.signatureStatus };
      next.logs[next.logs.length - 1].recordHash = record.recordHash;
      await rememberScene(base.id, next.turnNumber, { player, narration: dm.narration_blocks[0]?.text || '', chronicle: dm.state_updates?.chronicle_add || '', recordHash: record.recordHash });
      // THE LIVING WORLD — when story time passed or an act turned, the
      // world moves offscreen: bounded, budgeted, ops-only, sealed like any
      // other record. The wiki and the graph inherit it; the book and the
      // DM's conversation history do not repeat it.
      const actNow = next.codex.spine.beats[next.codex.beatIndex]?.act || 1;
      const actBefore = base.codex.spine.beats[base.codex.beatIndex]?.act || 1;
      if (!next.completed && (dm.time_advance || actNow !== actBefore)) {
        try {
          const updates = tickUpdates(next.codex, next.turnNumber - 1);
          if (updates) {
            const tickLog = tickLogEntry(updates, next.turnNumber - 1, next.codex.beatIndex);
            const ticked = applyStoryUpdates(next.codex, updates, { turn: next.turnNumber - 1, tick: true });
            next = { ...next, codex: ticked, logs: [...next.logs, tickLog] };
            await saveCampaign(next);
            const tickRecord = await seal(base.id, 'tick', { story: updates, storyAfter: ticked });
            const afterTick = await db.campaigns.get(base.id);
            next = { ...next, headHash: afterTick.headHash, turnCount: afterTick.turnCount, signatureStatus: afterTick.signatureStatus };
            next.logs[next.logs.length - 1].recordHash = tickRecord.recordHash;
            await saveCampaign(next);
          }
        } catch (error) { console.error('The living world held still:', error); }
      }
      // THE INTERLUDE'S DAY — Directive VI, Phase 1: when this turn crossed
      // an act boundary, the table seals one honest day of road between the
      // acts — a span row, silent to the DM's conversation, anchored at its
      // beat, carrying any band-crossings as raven-style notes. Derived,
      // deterministic, sealed like everything else.
      if (!next.completed && (codex.spine.beats[codex.beatIndex]?.act || 1) > (base.codex.spine.beats[base.codex.beatIndex]?.act || 1)) {
        try {
          const { row, before, after } = interludeRow(next.logs, { turn: next.turnNumber - 1, beatIndex: next.codex.beatIndex, cause: 'the act turns' });
          row.notes = bandNotes(next.codex.cast, before, after);
          next = { ...next, logs: [...next.logs, row] };
          await saveCampaign(next);
          const spanRecord = await seal(base.id, 'span', { clock_advance: row.clock_advance, cause: row.cause, notes: row.notes, beatIndex: row.beatIndex });
          const afterSpan = await db.campaigns.get(base.id);
          next = { ...next, headHash: afterSpan.headHash, turnCount: afterSpan.turnCount, signatureStatus: afterSpan.signatureStatus };
          next.logs[next.logs.length - 1].recordHash = spanRecord.recordHash;
          await saveCampaign(next);
        } catch (error) { console.error('The interlude kept no clock:', error); }
      }
      // THE CHRONICLER'S SEAT — Directive V, Phase 3: when an act closes
      // (or the tale completes), its annal is composed from the record
      // alone, held to the court, and sealed by the tick pattern. Refusal
      // is honest silence — that act simply carries no digest.
      try {
        const actAfterTurn = next.codex.spine.beats[next.codex.beatIndex]?.act || 1;
        const actAtEntry = base.codex.spine.beats[base.codex.beatIndex]?.act || 1;
        const closedAct = next.completed ? actAfterTurn : (actAfterTurn > actAtEntry ? actAtEntry : null);
        if (closedAct) {
          const chronicled = await chronicleActClose(next, closedAct, { seal, save: saveCampaign, reload: (id) => db.campaigns.get(id) });
          if (chronicled.annal) next = chronicled.campaign;
        }
      } catch (error) { console.error('The Chronicler kept silence:', error); }
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
      // THE BENCH HOLDS FOR THE ANCHORS (54C): at genesis the turn's own
      // media waits for the prologue easel to settle — the hero's bust
      // exists before the scene that would cite it, and the act's key art
      // is already minted under its cache key rather than raced by a second
      // identical ask in a parallel lane. Only the easel queues behind the
      // easel: text, narration, and the sealed turn never wait.
      if (hooks?.mediaGate) Promise.resolve(hooks.mediaGate).then(() => queueMedia(next, record, dm, log.id));
      else queueMedia(next, record, dm, log.id);
      // THE CHRONICLER at the chapter's close — when this turn advanced the
      // beat (or the tale completed), the closed chapter is retold from its
      // sealed turns, fire-and-forget: the table never waits on the reteller.
      if (codex.beatIndex > base.codex.beatIndex) chronicleChapterClose(next, base.codex.beatIndex);
      else if (codex.completed && !base.codex.completed) chronicleChapterClose(next, codex.beatIndex);
      return next;
    } catch (error) {
      console.error(error); setStatus(`The road snagged: ${error.message}`); return base;
    } finally { setBusy(false); }
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
    // THE PENDING SEAT (Task #50, amended after review) — the seat key is
    // chalked BEFORE the try so the finally can always erase the exact seat
    // it added; a key known only inside the try is out of scope at release
    // time, and a seat that cannot be released is a quill stuck writing.
    let seatKey = null;
    try {
      const request = buildChronicleRequest(campaign, closedBeatIndex);
      if (!request) return;
      // Held only when a real retelling is possible; a keyless table never
      // shows a writing row for a page that can never arrive. Released the
      // moment the court decides, page or no.
      seatKey = JSON.stringify({ beatIndex: closedBeatIndex, afterLogId: request.afterLogId });
      const holdSeat = Boolean(toll?.live);
      if (holdSeat) setPendingRetells((prev) => new Set(prev).add(seatKey));
      const response = await fetch('/api/retell', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request.body) });
      if (response.status === 402) {
        await tollRefusal(response); // the chronicle chore shows its receipt too
        rememberRefusedPour({ kind: 'retell', campaignId: campaign.id, beatIndex: closedBeatIndex });
      }
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
    } finally {
      if (seatKey) setPendingRetells((prev) => { if (!prev.size) return prev; const next = new Set(prev); next.delete(seatKey); return next; });
    }
  }

  // THE PROLOGUE RENDER — before Chapter I opens, the world's key art and the
  // hero's permanent bust anchor are painted and sealed, so the first
  // impression at the table is a painted world, not a gradient.
  const prologueRender = async (campaign) => {
    if (campaign.mediaTier === 'parchment') return campaign;
    const foundry = new Foundry({
      campaignId: campaign.id, tier: campaign.mediaTier, spend: campaign.spend,
      onAttestation: async (payload) => seal(campaign.id, 'media_attestation', payload)
    });
    const [keyArt, heroBust] = await Promise.all([
      foundry.enqueue({ ...keyArtJob(campaign, actOf(campaign)), originTurnHash: null }).catch(() => null),
      foundry.enqueue({ ...heroBustJob(campaign), originTurnHash: null }).catch(() => null)
    ]);
    // THE HERO'S SHEET (XVII, Article I) — minted beside her first bust,
    // derived from that sealed anchor, AFTER the bust has landed on the
    // shelf (a sheet enqueued in parallel could resolve before its anchor
    // exists and mint a fresh invention — the never-chained law's twin).
    // No bust, no sheet: an anchorless mint would be unlawful derivation.
    const heroSheet = heroSheetJob(campaign);
    if (heroBust && heroSheet) await foundry.enqueue({ ...heroSheet, originTurnHash: null }).catch(() => null);
    // THE STABLE FACE KEY — the hero's first bust is remembered by hash on
    // the campaign itself (exactly like the key art), so the original
    // portrait is found by identity ever after. A display-name label would
    // orphan it the day the hero is renamed.
    // THE LATE ANCHOR LANDS SOFTLY (54C) — the pour owns the campaign row
    // while this easel works, so the anchors merge into the LATEST telling
    // by functional update (the queueMedia landing's own proven pattern): a
    // stale pre-pour copy written here would clobber the sealed turn. Spend
    // merges as a delta over this easel's own base for the same reason —
    // two foundries now count in parallel lanes.
    // THE METER NEVER NEEDS A TROPHY (54C) — a refused or fallen anchor can
    // still have cost a mint, so the spend delta merges even when both
    // anchors came home null. Hashes, though, only land with an asset.
    const spent = {
      images: (foundry.spend?.images || 0) - (campaign.spend?.images || 0),
      music: (foundry.spend?.music || 0) - (campaign.spend?.music || 0)
    };
    if (keyArt || heroBust || spent.images || spent.music) {
      setCurrent((prev) => {
        if (!prev || prev.id !== campaign.id) return prev;
        const next = { ...prev, spend: { images: (prev.spend?.images || 0) + spent.images, music: (prev.spend?.music || 0) + spent.music } };
        if (keyArt) next.keyArtHash = keyArt.assetHash;
        if (heroBust) next.heroBustHash = heroBust.assetHash;
        saveCampaign(next);
        return next;
      });
    }
    return campaign;
  };

  const beginCampaign = async (heroInput) => {
    primeNarration(); // the Begin tap blesses the throat before Chapter I speaks
    const id = crypto.randomUUID();
    const hero = {
      ...createHero(heroInput), bearing: (heroInput.bearing || '').slice(0, 200),
      // THE TENOR LAW: stated identity travels with the hero forever.
      presentation: ['feminine', 'masculine', 'neutral'].includes(heroInput.presentation) ? heroInput.presentation : null,
      pronouns: (heroInput.pronouns || '').slice(0, 30) || null,
      mark: (heroInput.mark || '').slice(0, 80) || null,
      // THE POSSESSIONS CUT (Directive VI): the forge keepsake rides the
      // sheet, so the trove's journal replay and the codex seed agree.
      keepsake: (heroInput.keepsake || '').slice(0, 60) || null,
      // THE ATELIER CANON (XVII, Article VIII) — the six strokes seal as two
      // sentences the anchor and the sheet both read from this one seat; a
      // legacy hero (no strokes) seals null and composes from bearing as ever.
      appearance: composeAppearance(heroInput) || null,
      signature: composeSignature(heroInput) || null
    };
    // A voice blessed at the audition is kept; otherwise the casting session
    // reads the finished forge card — presentation included.
    hero.voiceId = heroInput.voiceId || castHeroVoice(hero);
    // The lawful init path seeds the trove from the forge keepsake,
    // cited to turn zero (Directive VI).
    const codex = initCodex(worldDraft.spineId, hero.keepsake ? { keepsake: { name: hero.keepsake, holder: hero.name } } : {});
    const campaign = {
      id, title: worldDraft.title, covenant: worldDraft.covenant, tone: worldDraft.tone,
      lines: worldDraft.lines, veils: worldDraft.veils, styleBible: worldDraft.styleBible, homeRegion: worldDraft.homeRegion,
      spineId: worldDraft.spineId, hero, codex, logs: [], combat: null, pendingRoll: null,
      turnNumber: 0, turnCount: 0, headHash: null, signatureStatus: 'pending', completed: false, readOnly: false, keyArtHash: null, heroBustHash: null,
      mediaTier: settings.mediaTier, spend: { images: 0, music: 0 }, createdAt: Date.now(), updatedAt: Date.now()
    };
    clearForgeDrafts(); // the chronicle has begun; the sitting's draft burns
    await saveCampaign(campaign); setCurrent(campaign); setFlow('table');
    // THE FIRST WORD (Task 54C §1): the pour is dispatched first; the
    // genesis easel kicks the moment the request is on the wire and takes
    // as long as it takes. Narration streams while the world is still being
    // painted, and late plates slot below their text (LogEntry's order
    // law). The sealed record is untouched — attestations bind by content;
    // arrival time is presentation, never record order.
    // THE THRESHOLD RITE (XVII, Article VII) — the rite LISTENS to the
    // pipeline's own events and never delays it: the pour's dispatch walks
    // 'word' (first-word law untouched, media gate rides the same spread),
    // the easel walks when the paint truly starts, the anchors when it
    // lands, and Chapter One when genesis stands — even a torn paint still
    // seats the table, so the finally owns the last step.
    setRite(riteOpen());
    try {
      await beginGenesis({
        pour: (hooks) => playTurn(campaign, 'Begin the chronicle.', null, null, {
          ...hooks,
          onPourDispatched: () => { hooks?.onPourDispatched?.(); setRite((r) => riteWalk(r, 'word')); }
        }),
        paint: () => { setRite((r) => riteWalk(r, 'easel')); return Promise.resolve(prologueRender(campaign)).finally(() => setRite((r) => riteWalk(r, 'anchors'))); }
      });
    } finally {
      setRite((r) => riteWalk(r, 'open'));
      setTimeout(() => setRite((r) => (r && r.stage === 'open' ? null : r)), 1600); // the rite bows out after its word — a stale timer never blows out a successor rite mid-walk
    }
  };

  const submit = async (text) => {
    const clean = text.trim(); if (!clean || busy || current.pendingRoll) return;
    primeNarration(); // the send tap blesses the throat while its grace holds
    await playTurn(current, clean);
  };

  // THE DOOM LAW (Directive X, Law VII) — a sheeted companion at zero walks
  // the saves through the SAME pending-roll door, owner-labeled: the door
  // opens itself when the stage is clear, each die lands in the open, and
  // the third failure seals through the standing grave law (fall notes ride
  // the reducer). Stable resets the count and closes the bed.
  useEffect(() => {
    if (!current || busy || current.pendingRoll || current.completed || current.readOnly) return;
    if (current.hero.hp <= 0) return; // the hero's own doom takes the stage whole
    const dying = (current.codex.party || []).find((member) => member?.sheet && member.sheet.hp <= 0 && !member.sheet.doom);
    if (!dying) return;
    const walked = (dying.sheet.deathSaves?.successes || 0) + (dying.sheet.deathSaves?.failures || 0);
    const slug = String(dying.name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setCurrent((prior) => prior && !prior.pendingRoll ? { ...prior, pendingRoll: { id: `doom-${slug}-${walked + 1}`, label: `Death save — ${dying.name}`, kind: 'death_save', die: 'd20', ability: null, skill: null, proficient: false, dc: 10, advantage: 'normal', extra_mod: 0, action_id: null, actor_id: dying.name, target_id: null } } : prior);
  }, [current, busy]);

  const resolveCompanionDoom = async (member, result) => {
    setDiceResult(result);
    playUiSfx(current, 'die'); // one die on parchment — the owner's own
    const folded = foldDeathSave(member.sheet.deathSaves, result.outcome);
    const sheet = { ...member.sheet, deathSaves: folded.verdict === 'stable' ? { successes: 0, failures: 0 } : folded.deathSaves, ...(folded.verdict !== 'pending' ? { doom: folded.verdict } : {}) };
    let codex = { ...current.codex, party: current.codex.party.map((row) => row === member ? { ...row, sheet } : row) };
    if (folded.verdict === 'dead') {
      // The seal: status dead through the standing grave law — memorial
      // fact, fall notes on held threads, the validator's watch. Permanent.
      codex = applyStoryUpdates(codex, { cast_update: [{ name: member.name, status: 'dead', last_seen: 'Fell to wounds — the third failure sealed it.' }] }, { turn: current.turnNumber });
    }
    await seal(current.id, 'resolution', { ...result, deathSaves: folded.deathSaves, verdict: folded.verdict });
    const sealed = await db.campaigns.get(current.id);
    const next = { ...current, codex, pendingRoll: null, headHash: sealed.headHash, turnCount: sealed.turnCount };
    await saveCampaign(next); setCurrent(next);
    if (folded.verdict === 'dead') setTimeout(() => playTurn(next, `Resolve Death save — ${member.name} has fallen.`, result, null), 950);
  };

  const resolveRoll = async () => {
    if (!current.pendingRoll || busy) return;
    primeNarration(); // the roll tap blesses the throat for the coming reading
    // THE FIRST-ROLL BEAT (Directive XII §VI.3) — once per campaign, presentation only.
    teachOnce(current.id, 'roll').then((line) => line && setStatus(`✦ ${line}`)).catch(() => {});
    // THE TABLE'S-DICE LAW (Directive X, Law V) — the owner's die: a pending
    // roll whose actor_id names a sheeted companion folds through the
    // companion's own sheet; every other seat stays the hero's.
    const ownerKey = (value) => String(value ?? '').trim().toLowerCase();
    const sheetRow = current.pendingRoll.actor_id && ownerKey(current.pendingRoll.actor_id) !== 'hero'
      ? (current.codex.party || []).find((member) => member?.sheet && ownerKey(member.name) === ownerKey(current.pendingRoll.actor_id))
      : null;
    if (sheetRow && current.pendingRoll.kind === 'death_save') return resolveCompanionDoom(sheetRow, companionRoll(sheetRow.name, sheetRow.sheet, current.pendingRoll));
    // THE ATTACK FOLD (XVIII, Article I) — the roll seat wears table law:
    // the equipped weapon row governs ability and proficiency, the rune
    // rides as a named modifier, and the defender's table armor overrides
    // the spoken dc. Checks and saves pass through untouched.
    const governedRoll = current.pendingRoll.kind === 'attack'
      ? governAttackRoll(current.pendingRoll, { abilities: (sheetRow ? sheetRow.sheet : current.hero).abilities, trove: current.codex.trove || [], holder: sheetRow ? sheetRow.name : current.hero.name, enemies: current.combat?.enemies || [] })
      : current.pendingRoll;
    const result = sheetRow ? companionRoll(sheetRow.name, sheetRow.sheet, governedRoll) : heroRoll(current.hero, governedRoll);
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
    primeNarration(); // the X-card tap too — its redirect turn will want a voice
    // THE X-CARD BEAT (Directive XII §VI.3) — once per campaign, presentation only.
    teachOnce(current.id, 'xcard').then((line) => line && setStatus(`✦ ${line}`)).catch(() => {});
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

  // THE DEMO SHELF'S DRAW (Directive XII §V.4) — a reference tale enters
  // through the STANDING import door, once: a prior import of the same
  // sealed head is handed back, never duplicated, so the shelf gains one
  // book no matter how many times the tale is drawn. A fresh draw fetches
  // the shipped bytes and lets importChronicle judge them whole — the door
  // verifies before it opens, and a refused seal is the caller's to speak.
  const drawDemoTale = async (entry) => {
    const standing = campaigns.find((c) => c.forkOf?.campaignId === entry.campaignId && c.forkOf?.headHash === entry.headHash);
    if (standing) return standing;
    const response = await fetch(`${import.meta.env.BASE_URL}demo-tales/${entry.file}`);
    if (!response.ok) throw new Error(`the shelf could not reach the tale (${response.status})`);
    const restored = await importChronicle(await response.json());
    await refreshShelf();
    return restored;
  };

  // TASK 52 — THE PROVING HOOK (§2), second half of the one sanctioned hook:
  // gated on ?proving=1 and absent otherwise. Seeds a fixture chronicle
  // through the REAL primitives (fold, seal, memory — see lib/proving.js)
  // and seats it at the table exactly the way a restore does.
  useEffect(() => {
    if (!isProving()) return undefined;
    window.__mdqSeed = async (fixture) => {
      const campaign = await seedProvingCampaign(fixture);
      await refreshShelf();
      setCurrent(campaign);
      setFlow('table');
      return campaign.id;
    };
    return () => { delete window.__mdqSeed; };
  }, [refreshShelf]);

  const openStorybook = async (size = 'Letter', campaign = current) => {
    playUiSfx(campaign, 'page'); // the book opens (or rebinds): one page turn
    // (57.5) The door speaks or the door opens — never silence. Every read
    // below sits under the catch: a fall at any of them used to leave the
    // seal pressed and NOTHING happening, forever, with no word to the
    // player. And one unreadable blob must not fell the whole binding: that
    // row rides with a null plate (the book seats only proven art anyway)
    // and the binding names how many plates would not read.
    try {
      const journal = await campaignJournal(campaign.id);
      const mediaRows = await db.media.where('campaignId').equals(campaign.id).toArray();
      let unread = 0;
      const media = await Promise.all(mediaRows.map(async (row) => ({ ...row, dataUrl: row.blob ? await blobToDataUrl(row.blob).catch(() => { unread += 1; return null; }) : null })));
      // The seen ledger rides along: the book retells the adventure as it was
      // actually SEEN at this table — only dealt art, seated with its own
      // chapters. (An elder tale with no ledger still binds, the old way.)
      const reveals = await listReveals(campaign.id);
      const html = buildStorybook({ campaign, journal, media, reveals, pageSize: size }); setBookHtml(html); setOverlay('storybook');
      if (unread > 0) setStatus(`The chronicle is bound, but ${unread} plate${unread === 1 ? '' : 's'} could not be read from the shelf.`);
    } catch (error) {
      setStatus(`The chronicle would not open: ${error?.message || 'the binding fell'}. Press the seal to try again.`);
    }
  };

  const bindPdf = async () => {
    const response = await fetch('/api/bind-pdf', { method: 'POST', headers: { 'Content-Type': 'text/html' }, body: bookHtml });
    if (response.status === 402) {
      await tollRefusal(response);
      rememberRefusedPour({ kind: 'pdf', campaignId: current.id });
      return;
    }
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
    // The ask is answered with the wax in reach: the denouement directives
    // arm for every turn still to come, and the ceremony rises with the
    // press under the patron's own hand — return to the table and let the
    // road turn home, or press now and bind the book as it stands. The
    // seal-ask promised the wax; the promise is kept without a dead end.
    // The ceremony rises in the same breath as the confirm — state lands
    // synchronously with the click — and the save settles behind it.
    setCurrent(next);
    setOverlay('sealing');
    setStatus('✦ The denouement begins — the road turns home.');
    await saveCampaign(next);
  };

  // THE PRESS — the journal's final block signs the whole chronicle. One wax
  // accent (in a gap), one 'sealing' event carrying the tale's true counts,
  // and the campaign remembers when its wax took the sigil.
  const pressSeal = async () => {
    if (!current || current.sealedAt || current.readOnly) return;
    playUiSfx(current, 'seal');
    const journal = await campaignJournal(current.id);
    // THE SAGA LAW: the wax writes the legacy packet first — the volume
    // closes onto the record — and the 'sealing' block stays the final
    // signature over the whole chronicle, packet included.
    await sealLegacy(current, { seal });
    await seal(current.id, 'sealing', {
      turns: journal.filter((r) => r.type === 'turn').length,
      rolls: journal.filter((r) => r.type === 'resolution' && r.payload && r.payload.total != null).length,
      completed_at: Date.now()
    });
    const sealedRow = await db.campaigns.get(current.id);
    const next = { ...current, sealedAt: Date.now(), headHash: sealedRow.headHash, turnCount: sealedRow.turnCount, signatureStatus: sealedRow.signatureStatus };
    await saveCampaign(next); setCurrent(next); await refreshShelf();
  };

  // THE ROAD ON (Saga Law) — a sealed tale hands its packet to the next
  // volume: the world door is skipped, legacy souls arrive with their
  // exact voices, the dead arrive dead, and the stated span is bridged
  // as sealed record before the first word is spoken at the new table.
  // The ref is a synchronous latch: three span buttons, one road. State
  // is too slow to bar a double tap in the same tick — the ref refuses
  // the second press before React ever re-renders, so a double tap can
  // never forge two volumes.
  const openingVolumeRef = useRef(false);
  const openNext = async (years) => {
    if (!current?.sealedAt || current.readOnly || busy) return;
    if (openingVolumeRef.current) return;
    openingVolumeRef.current = true;
    try {
      playUiSfx(current, 'seal');
      const { campaign: nextVolume, span } = await openNextVolume(current, { years, seal });
      setOverlay(null);
      setCurrent(nextVolume); setFlow('table');
      setStatus(`✦ ${span} ${nextVolume.saga.worldTitle} turns a new page.`);
      await refreshShelf();
      // THE FIRST WORD (Task 54C §1) — a next volume's opening is a genesis
      // too: the pour is dispatched first, the volume's easel kicks on the
      // wire signal, and late anchors merge softly. And a genesis wears the
      // house's face (XVII, Article VII): the same threshold rite walks the
      // same pipeline events here as at the first chronicle's door.
      setRite(riteOpen());
      try {
        await beginGenesis({
          pour: (hooks) => playTurn(nextVolume, 'Begin the chronicle.', null, null, {
            ...hooks,
            onPourDispatched: () => { hooks?.onPourDispatched?.(); setRite((r) => riteWalk(r, 'word')); }
          }),
          paint: () => { setRite((r) => riteWalk(r, 'easel')); return Promise.resolve(prologueRender(nextVolume)).finally(() => setRite((r) => riteWalk(r, 'anchors'))); }
        });
      } finally {
        setRite((r) => riteWalk(r, 'open'));
        setTimeout(() => setRite((r) => (r && r.stage === 'open' ? null : r)), 1600); // the rite bows out after its word — a stale timer never blows out a successor rite mid-walk
      }
    } finally {
      openingVolumeRef.current = false;
    }
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
  // THE TABLE LAW (Directive XIV) — the four chips fold pure from the
  // sealed record. The strip is the GROUND chip now: name and backdrop
  // follow the STANDING scene (the presence replay's own ground), never
  // the newest region card; before any scene stands, the chip says so and
  // the home region's procedural art keeps the vellum warm.
  const table = useMemo(() => current ? tableOf(current) : null, [current]);
  const gallery = useGallery(current);
  const groundChip = table ? table.chips[1] : null;
  const activeRegion = (groundChip?.name && current?.codex?.regions?.find((region) => region.name === groundChip.name)) || null;
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

  // THE POURED-AGAIN RIBBON — one quiet offer after a paid return, at the
  // shelf or at the table alike. The patron pours or lets it rest; either
  // way the offer is made once and never nags.
  const pourBanner = pourOffer ? <div className="pour-again" role="status">
    <span>✦ Your seat is raised — the pour the house refused can flow again.</span>
    <button onClick={() => { const intent = pourOffer; setPourOffer(null); retryRefusedPour(intent); }}>Pour it now</button>
    <button className="secondary-button" onClick={() => setPourOffer(null)}>Let it rest</button>
  </div> : null;

  if (flow === 'world') return <WorldForge mediaTier={settings.mediaTier} onBack={() => setFlow('title')} onContinue={(world) => { setWorldDraft(world); setFlow('hero'); }} />;
  if (flow === 'hero') return <HeroForge world={worldDraft} mediaTier={settings.mediaTier} onBack={() => setFlow('world')} onBegin={beginCampaign} />;
  if (flow === 'title') return <>{pourBanner}<TitleScreen campaigns={campaigns} vaultMarks={vaultMarks} vaultShelf={vaultShelf} onVaultRestore={drawFromVault} onBurn={burnSpine} onBurnVault={burnVaultSpine} reduceMotion={stillness} mediaTier={settings.mediaTier} onNew={() => setFlow('world')} onOpen={async (campaign, opts) => { if (campaign.mediaTier === 'cinema') { campaign = { ...campaign, mediaTier: 'illuminated' }; saveCampaign(campaign).catch(() => {}); } if (!campaign.readOnly && campaign.hero && !campaign.hero.voiceId) { /* a hero from before the casting law is cast by their forge card on open; read-only spines resolve the same answer in memory, without a write */ campaign = { ...campaign, hero: { ...campaign.hero, voiceId: castHeroVoice(campaign.hero) } }; saveCampaign(campaign).catch(() => {}); } campaign = await reconcileLegacyPurse(campaign); /* the era door's one write (§IV.5) — before the table seats, so no turn can race it */ setCurrent(campaign); setFlow('table'); greetTale(campaign); if (opts?.keepsakes && campaign.sealedAt) setOverlay('sealing'); /* a finished book opens straight to its keepsakes */ }} onRestore={restoreFile} onDemoDraw={drawDemoTale} status={status} /></>;
  if (!current) return null;

  const chapter = chapterInfo(current.codex);
  const act = actInfo(current.codex);
  const nearEnd = !current.completed && !current.codex.sealing && current.codex.beatIndex >= current.codex.spine.beats.length - 3;

  return <div className={`app-shell${current.combat?.active ? ' under-arms' : ''}`}>
    <TollNotice />
    <RavenNotice recap={ravenRecap} onClose={() => setRavenRecap(null)} />
    {pourBanner}
    {rite && <ThresholdRite rite={rite}/>}
    <div ref={regionStripRef} className="region-strip" data-chip="ground" data-blight={current.codex.blight} style={(() => { const d = Math.min(0.55 + current.codex.blight * 0.08, 0.94); return { backgroundImage: `linear-gradient(90deg,rgba(13,11,20,${d}),rgba(13,11,20,${(d * 0.55).toFixed(2)}),rgba(13,11,20,${d})),url("${regionPlate || regionArt}")` }; })()}>
      <span>{groundChip.words}</span>{groundChip.state && <small>{groundChip.state}</small>}
    </div>
    <header className="table-header">
      <button className="sigil-button" onClick={() => setOverlay('sheet')}><span>{current.hero.sigil}</span><div><b>{current.hero.name}</b><small>Level {current.hero.level} {current.hero.className}</small></div></button>
      <div className="header-chips" data-stillness={stillness ? 'true' : undefined}>
        <span className="table-chip" data-chip="calendar">{table.chips[0].words}</span>
        <span className="table-chip chip-party" data-chip="party">{table.chips[2].members.length
          ? table.chips[2].members.map((member) => gallery[member.name]
            ? <img key={member.name} className="party-face" src={gallery[member.name]} alt={member.name} title={member.name}/>
            : <i key={member.name} className="party-face" title={member.name}>{member.name.split(' ').map((part) => part[0]).join('')}</i>)
          : <em>The hero travels alone</em>}</span>
        <span className="table-chip" data-chip="health"><HeartPulse/> {table.chips[3].words}</span>
      </div>
      <nav><button onClick={closeBook} disabled={busy} title={busy ? 'The scribe is mid-stroke — the page must land first' : 'Close the book and return to the shelf'} aria-label="Close the book and return to the shelf"><DoorOpen/><span>Hearth</span></button><button onClick={() => setOverlay('codex')}><BookOpen/><span>Book</span></button><button onClick={() => setOverlay('settings')}><SettingsIcon/><span>Care</span></button><button className="wax-seal" onClick={openStorybook} title="The bound chronicle and its seal" aria-label="Open the bound chronicle"><span key={sealPulse} className="wax-emboss">{current.hero.sigil}</span></button></nav>
    </header>
    {current.readOnly && <div className="read-only-banner"><Shield/> This restored chronicle verifies as an artifact but cannot impersonate its original device. <button onClick={async()=>{const fork=await forkChronicle(current);setCurrent(fork);}}>Create a signed continuation</button></div>}
    {current.combat?.active && <CombatBanner combat={current.combat} />}
    <main ref={logScrollRef} className="adventure-log" role="log" aria-live="polite">
      <div className={`campaign-mast ${keyArtUrl ? 'has-keyart' : ''}`} style={keyArtUrl ? { backgroundImage: `linear-gradient(180deg,rgba(13,11,20,.12),rgba(13,11,20,.5) 55%,rgba(13,11,20,.97)),url("${keyArtUrl}")` } : undefined}><span>{current.codex.spine.label} · Act {act.numeral} · Chapter {chapter.numeral} of {chapter.countNumeral}</span><h1>{chapter.title}</h1><p>{chapter.goal}</p></div>
      {recap && recap.campaignId === current.id && <RecapCard recap={recap} onDismiss={() => setRecap(null)} />}
      {(() => {
        // THE FOLIO COUNT — plates are numbered the way a folio numbers its
        // engravings: only turns that actually show a plate advance the
        // numeral, so "Plate IV" is the fourth picture in the book, not the
        // fourth turn. (Mirrors LogEntry's own showScene test exactly.)
        let plateNo = 0;
        // Task #50 — the seat order: turns and ticks in sealed sequence, each
        // chapter's page anchored at its boundary (arrival time irrelevant,
        // orphans recovered), pending rows holding only seats that a page can
        // still take. Pure and gated in the engine (fatescript/sequencing); nothing is written.
        const seats = orderFeed(current.logs, current.chroniclePages || [], [...pendingRetells].map((key) => JSON.parse(key)));
        return seats.map((seat, index) => {
          if (seat.kind === 'page') return <ChroniclePage key={`page-${seat.page.recordHash || seat.page.beatIndex}`} page={seat.page} />;
          if (seat.kind === 'page-pending') return <PendingPage key={`pending-${seat.beatIndex}`} reduceMotion={stillness} />;
          if (seat.kind === 'tick' || seat.log?.kind === 'span') {
            // Ticks and spans are both sealed time, and both render as quiet
            // dividers — never an empty turn row (Directive VI, Phase 1).
            const prev = seats.slice(0, index).reverse().find((s) => s.kind === 'turn')?.log;
            return <TickDivider key={seat.log.id} log={seat.log} prevLog={prev} />;
          }
          if (seat.log?.kind === 'reconciliation') {
            // THE ERA DOOR'S ONE RECORD (Directive XII §IV.5) — spoken plainly
            // in the feed, never hidden; fail-closed if the row cannot be read.
            const moved = Number(seat.log?.dm?.story?.purse?.[0]?.delta) || 0;
            return <div className="reconciliation-line" key={seat.log.id}>⚖ The old lane’s coin was reconciled — {moved} gold seated as one sealed purse movement.</div>;
          }
          const log = seat.log;
          if (log.redacted) return <div className="redacted-line" key={log.id}>⊘ A scene was removed from active canon by the player.</div>;
          const showsPlate = Boolean(log.imageUrl || log.videoPosterUrl || log.dm?.image_cue || paintingImages[log.id]);
          const plateNumeral = showsPlate ? romanNumeral(++plateNo) : null;
          return <LogEntry key={log.id} log={log} campaign={current} painting={Boolean(paintingImages[log.id])} plateNumeral={plateNumeral} pour={log.id === pouringId} reduceMotion={stillness} onPourTick={bumpPourTick} onPourDone={endPour} />;
        });
      })()}
      {busy && <div className="streaming"><span/>The Dungeon Master considers…</div>}
      <div ref={logEndRef}/>
    </main>
    {!current.readOnly && current.codex.sealing && !current.completed && <div className="near-end denouement"><span>✦ The denouement — the road turns home.</span></div>}
    {!current.readOnly && nearEnd && <div className="near-end"><span>✦ The final chapters draw near.</span><button onClick={() => setOverlay('seal-ask')}>Seal the Tale</button></div>}
    {!current.readOnly && !current.completed && <Composer campaign={current} busy={busy} reduceMotion={stillness} onSubmit={submit} onSuggestion={submit} onRoll={resolveRoll} onXCard={redactLast} />}
    {/* A restored chronicle is a BOOK — its keepsakes (storybook, wax,
        export) are the whole point of restoring it. Only the mutating acts
        stay barred for read-only spines: the press refuses in pressSeal and
        hides in the ceremony; the next volume is gated where it renders. */}
    {(current.completed || current.sealedAt) && <section className="tale-told"><span>✦ Your tale is told.</span><button onClick={() => setOverlay('sealing')}>{current.sealedAt ? 'Open the keepsakes' : 'Seal the chronicle'}</button></section>}
    <footer className="seal-status"><span>{status}</span>{VAULT_MARKS[vaultMarks.get(current.id)?.state] && <span className="vault-mark" title={VAULT_MARKS[vaultMarks.get(current.id).state].word}>{VAULT_MARKS[vaultMarks.get(current.id).state].glyph} {VAULT_MARKS[vaultMarks.get(current.id).state].word}</span>}</footer>
    {diceResult && <DiceOverlay result={diceResult} haptics={settings.haptics} onDone={() => setDiceResult(null)} />}
    {/* THE FRESH CARD LAW — the key forces a NEW card lifecycle per card: a
        chained close (DM card → act card) batches its two setCinematic calls,
        so without it React would reuse the mounted card — same backdrop, no
        re-consult of the seen ledger, and no fresh close timer. Type differs
        across any chained pair, so the key always turns. */}
    {cinematic && <Cinematic key={`${cinematic.cinematic?.type}:${cinematic.cinematic?.title}:${cinematic.beatIndex ?? 'b'}:${cinematic.replay ? 'replay' : 'live'}`} cinematic={cinematic.cinematic} dialogue={cinematic.dialogue_cue} campaign={cinematic.campaign} reduceMotion={stillness} turnRecordHash={cinematic.turnRecordHash} beatIndex={cinematic.beatIndex ?? cinematic.campaign.codex.beatIndex} replay={Boolean(cinematic.replay)} onClose={() => { if (cinematic.__closed) return; cinematic.__closed = true; /* one-shot latch: the 9s auto-close racing a tap (or any double fire) must not consume the chain twice — every card object is a fresh local spread, never sealed canon */ setCinematic(null); const actNext = pendingActRef.current; if (actNext) { pendingActRef.current = null; setCinematic(actNext); return; } const pending = pendingNarrationRef.current; pendingNarrationRef.current = null; if (pending) playNarration(pending.campaign, pending.log); }} />}
    {overlay === 'sheet' && <CharacterSheet campaign={current} onClose={() => setOverlay(null)} onExport={exportCurrent} />}
    {overlay === 'codex' && <Book campaign={current} nav={bookNav} onNav={(part) => setBookNav((held) => ({ ...held, ...part }))} recap={recap && recap.campaignId === current.id ? recap : null} reduceMotion={stillness} onClose={() => setOverlay(null)} onReplay={(dm) => { setOverlay(null); /* a Book replay is a RE-VIEW: the reveal law neither filters nor marks it */ setCinematic({ ...dm, campaign: current, replay: true }); }} onSealTale={current.readOnly || current.completed || current.codex.sealing ? null : () => setOverlay('seal-ask')} />}
    {overlay === 'settings' && <Settings campaign={current} settings={{...settings,mediaTier:current.mediaTier}} onChange={persistSettings} onDownloadAudio={downloadAudio} audioBusy={audioBusy} onClose={() => setOverlay(null)} />}
    {overlay === 'storybook' && <Storybook html={bookHtml} onClose={() => setOverlay(null)} onPdf={bindPdf} onHtml={() => downloadBlob(new Blob([bookHtml], {type:'text/html'}), `${current.title}.storybook.html`)} onSize={openStorybook} />}
    {overlay === 'level' && <LevelRitual hero={current.hero} onAccept={async (picks) => {
      // THE PICKING SEAL (XVIII, Article IV): the surface was the door;
      // the fold is a client-applied spell_learn — the hero's list grows,
      // the ledger notes what entered the grimoire. The DM never sends
      // this op; the schema does not know it.
      if (picks.length) {
        const hero = { ...current.hero, spells: [...(current.hero.spells || []), ...picks] };
        const codex = applyStoryUpdates(current.codex, { spell_learn: { name: hero.name, spells: picks } }, { turn: current.turnNumber || 0, heroName: hero.name, heroLevel: hero.level });
        const next = { ...current, hero, codex };
        await saveCampaign(next); setCurrent(next);
      }
      setOverlay(null);
    }} />}
    {overlay === 'seal-ask' && <div className="ritual seal-ask"><span className="ritual-wax">{current.hero.sigil}</span><h2>End the tale with honor?</h2><p>The next few turns become the denouement — farewells, consequences, the road home. Then the wax presses, and the tale is bound.</p><div className="ritual-row"><button className="secondary-button" onClick={() => setOverlay(null)}>Not yet</button><button onClick={confirmSeal}>Seal the Tale</button></div></div>}
    {overlay === 'sealing' && <Ceremony campaign={current} onPressSeal={pressSeal} onStorybook={() => { setOverlay(null); openStorybook(); }} onExport={exportCurrent} onPodcast={downloadAudio} onNextVolume={current.sealedAt && !current.readOnly ? openNext : null} audioBusy={audioBusy} onClose={() => setOverlay(null)} />}
    {current.hero.hp <= 0 && !current.hero.stableAtZero && <Epitaph campaign={current} onIntervene={async()=>{const hero={...current.hero,hp:Math.max(1,Math.floor(current.hero.maxHp/2)),deathTouched:true};const next={...current,hero};await seal(current.id,'resolution',{type:'fates_intervention',hp:hero.hp,deathTouched:true});await saveCampaign(next);setCurrent(next);}} onFaceTheDark={async()=>{const hero={...current.hero,doomChosen:true};const next={...current,hero};await seal(current.id,'resolution',{type:'doom_declined'});await saveCampaign(next);setCurrent(next);}} onDeathSave={async()=>{const saves=current.hero.deathSaves||{successes:0,failures:0};const rr={id:`doom-hero-${saves.successes+saves.failures+1}`,label:'Death save',kind:'death_save',die:'d20',ability:null,skill:null,proficient:false,dc:10,advantage:'normal',extra_mod:0,action_id:null,actor_id:'hero',target_id:null};const result=heroRoll(current.hero,rr);setDiceResult(result);playUiSfx(current,'die');const folded=foldDeathSave(saves,result.outcome);const hero={...current.hero,deathSaves:folded.verdict==='stable'?{successes:0,failures:0}:folded.deathSaves,...(folded.verdict==='dead'?{dead:true}:{}),...(folded.verdict==='stable'?{stableAtZero:true}:{})};await seal(current.id,'resolution',{...result,deathSaves:folded.deathSaves,verdict:folded.verdict});const next={...current,hero};await saveCampaign(next);setCurrent(next);}} />}
  </div>;
}

// The dye vat: each chronicle's spine takes a deterministic house dye from its
// id, so the shelf reads as a collected library — no two neighbors alike by
// accident, and every rebuild binds the same book in the same leather.
const SPINE_DYES = ['#4a2b33', '#33463b', '#2e3350', '#54331f', '#3a2f45', '#463b28'];
const dyeOf = (id) => SPINE_DYES[Math.abs([...String(id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % SPINE_DYES.length];

// The vault's quiet marks — one glyph, in-brand, never a spinner storm.
const VAULT_MARKS = {
  vaulted: { glyph: '⛨', word: 'kept in the vault' },
  syncing: { glyph: '…', word: 'reaching the vault' },
  'diverged-forked': { glyph: '⑂', word: 'two tellings — this device kept its own spine' },
  error: { glyph: '◌', word: 'the vault is out of reach — the tale is safe on this device' },
};

function TitleScreen({ campaigns, vaultMarks = new Map(), vaultShelf = [], onVaultRestore, onBurn, onBurnVault, onNew, onOpen, onRestore, onDemoDraw, reduceMotion, mediaTier, status }) {
  const input = useRef(null);
  // THE PYRE'S ASKING — a burn is asked once, in ember, with honest scope:
  // what is taken (device / vault / both) is said before any match is struck.
  const [pyre, setPyre] = useState(null);
  const bundled = ['drowned', 'frontier', 'gate', 'mountain'].map((n) => `${import.meta.env.BASE_URL}keyart/${n}.jpg`);
  const [bgIndex, setBgIndex] = useState(0);
  const [attract, setAttract] = useState(false);
  const [plaque, setPlaque] = useState('');

  // THE DEMO SHELF (Directive XII §V.4) — the house's own telling: three
  // reference tales played to seal on the house's mock table and shipped
  // with the app. The manifest is read fail-closed (rows must carry a file
  // and a campaign id); an absent shelf is an absent shelf, not a fault.
  // A draw is a word, never a spinner; a refused draw speaks where the
  // patron stands.
  const [demoTales, setDemoTales] = useState([]);
  const [demoBusy, setDemoBusy] = useState(null);
  const [demoWord, setDemoWord] = useState('');
  useEffect(() => {
    let alive = true;
    fetch(`${import.meta.env.BASE_URL}demo-tales/manifest.json`)
      .then((response) => (response.ok ? response.json() : []))
      .then((list) => { if (alive && Array.isArray(list)) setDemoTales(list.filter((tale) => tale && typeof tale.file === 'string' && typeof tale.campaignId === 'string')); })
      .catch(() => { /* the shelf simply is not set out */ });
    return () => { alive = false; };
  }, []);
  const drawDemo = async (entry) => {
    if (demoBusy || typeof onDemoDraw !== 'function') return;
    setDemoBusy(entry.spineId); setDemoWord('');
    try {
      const campaign = await onDemoDraw(entry);
      firstTouch();
      await onOpen(campaign, { keepsakes: Boolean(campaign.sealedAt) });
    } catch (error) {
      setDemoWord(`The reference tale would not open: ${error.message}`);
    } finally { setDemoBusy(null); }
  };

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
      {/* The house speaks on the shelf too: a refused restore ("Restore
          failed: the seal is broken…") must say so where the patron stands —
          the door was refusing correctly but saying nothing. */}
      {status && <p className="muted shelf-status" role="status">{status}</p>}
      <div className="book-wall">
        <div className="book-row">
          {campaigns.map((c) => {
            const waxed = Boolean(c.sealedAt || c.completed);
            const label = `${c.title} — ${c.hero?.name || 'a hero'}${c.completed ? (c.sealedAt ? ', told and sealed' : ', told') : ', still being lived'}`;
            const engrave = () => setPlaque(`${c.title} — ${c.hero?.name || 'a hero'} · ${c.codex?.spine?.label || 'a spine'}${c.sealedAt ? ' · opens to its keepsakes' : c.completed ? ' · told, awaiting the wax' : ''}`);
            return <div key={c.id} className="spine-slot">
              <button className="book-spine" style={{ '--dye': dyeOf(c.id), height: `${158 + Math.min(26, c.turnCount || 0)}px` }}
                aria-label={label} title={label}
                onMouseEnter={engrave} onFocus={engrave} onMouseLeave={() => setPlaque('')} onBlur={() => setPlaque('')}
                onClick={() => { firstTouch(); onOpen(c, { keepsakes: Boolean(c.sealedAt) }); }}>
                <span className="spine-bands" aria-hidden><i/><i/><i/></span>
                <span className="spine-title">{c.title}</span>
                {VAULT_MARKS[vaultMarks.get(c.id)?.state] && <span className="spine-vault" aria-hidden title={VAULT_MARKS[vaultMarks.get(c.id).state].word}>{VAULT_MARKS[vaultMarks.get(c.id).state].glyph}</span>}
                {waxed ? <span className="spine-wax" aria-hidden>{c.hero?.sigil || '✦'}</span> : <span className="spine-foot" aria-hidden>✦</span>}
              </button>
              <button className="spine-burn" aria-label={`Burn “${c.title}” — remove this tale`} title="Burn this tale"
                onMouseEnter={() => setPlaque(`Burn “${c.title}” — ash keeps no pages.`)} onMouseLeave={() => setPlaque('')}
                onClick={(e) => { e.stopPropagation(); setPyre({ scope: 'local', title: c.title, campaign: c }); }}><Flame/></button>
            </div>;
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
      {(() => {
        // The vaulted shelf: spines kept in the vault that this device does
        // not hold — one quiet row, drawn only when there is something to draw.
        const local = new Set(campaigns.map((c) => c.id));
        const away = vaultShelf.filter((s) => !local.has(s.campaignId));
        if (!away.length) return null;
        return <div className="vault-shelf">
          <span className="eyebrow">⛨ Kept in the vault</span>
          <div className="vault-row">
            {away.map((s) => <div key={s.campaignId} className="vault-spine-slot">
              <button className="vault-spine" data-campaign={s.campaignId} onClick={() => onVaultRestore?.(s.campaignId)}
                title={`Restore "${s.title}" to this device`}>
                <b>{s.title}</b><small>{s.hero || 'a hero'} · {s.turnCount} seals{s.sealedAt ? ' · sealed' : ''}</small>
              </button>
              <button className="spine-burn" aria-label={`Burn “${s.title}” from the vault`} title="Burn the vault's copy"
                onClick={(e) => { e.stopPropagation(); setPyre({ scope: 'vault', title: s.title, spine: s }); }}><Flame/></button>
            </div>)}
          </div>
        </div>;
      })()}
      {demoTales.length > 0 && <div className="demo-shelf">
        <span className="eyebrow">✦ The house’s own telling</span>
        <p className="demo-note">Reference tales played to seal at the house’s table — they open read-only, chain-verified at the door.</p>
        <div className="vault-row">
          {demoTales.map((tale) => <button key={tale.spineId} className="vault-spine demo-spine" disabled={Boolean(demoBusy)}
            style={{ '--dye': dyeOf(tale.campaignId) }} onClick={() => drawDemo(tale)}
            title={`Open “${tale.title}” — sealed, read-only`}>
            <b>{tale.title}</b><small>{tale.hero || 'a hero'} · {tale.turns} turns · sealed</small>
            {demoBusy === tale.spineId && <small className="demo-drawing">verifying the seal…</small>}
          </button>)}
        </div>
        {demoWord && <p className="muted shelf-status" role="status">{demoWord}</p>}
      </div>}
    </section>}
    {pyre && <div className="ritual pyre-ask" role="alertdialog" aria-modal="true" aria-label={`Burn ${pyre.title}?`}>
      <Flame className="ritual-flame" size={40} aria-hidden/>
      <h2>Burn “{pyre.title}”?</h2>
      <p>{pyre.scope === 'vault'
        ? 'This takes the vault’s copy to ash. Any device that still holds the tale keeps its own pages.'
        : 'This takes the tale to ash on this device — and in the vault, if it is kept there. Every page, plate, and voice. Ash keeps no pages.'}</p>
      <div className="ritual-row">
        <button className="secondary-button" onClick={() => setPyre(null)} autoFocus>Keep the tale</button>
        <button className="danger-button" onClick={() => { const p = pyre; setPyre(null); if (p.scope === 'vault') onBurnVault?.(p.spine); else onBurn?.(p.campaign); }}><span className="burn-word">Burn it</span></button>
      </div>
    </div>}
    <footer className="title-footer">
      <span>Yours alone · Plays offline · Every turn sealed</span><PatronDoor/>
      {/* The house's small print — quiet vellum links, never louder than the fire. */}
      <span className="law-links"><a href="/welcome.html">The front gate</a> · <a href="/terms.html">House rules</a> · <a href="/privacy.html">Privacy</a></span>
    </footer>
  </main>;
}

// The per-turn "Listen" control. Any turn can be read aloud on demand; the
// button mirrors the single shared narrator so only one turn plays at a time.
function NarrationButton({ campaign, log }) {
  const [state, setState] = useState({ id: null, playing: false, blocked: false });
  useEffect(() => subscribeNarration(setState), []);
  const active = state.id === log.id && state.playing;
  // The browser refused an unprompted start: the reading is staged, and this
  // button becomes the visible invitation — the tap that accepts it both plays
  // the turn and blesses the throat for the rest of the session.
  const invited = state.id === log.id && state.blocked && !state.playing;
  if (!log.dm?.narration_blocks?.length) return null;
  return <button type="button" className={`narrate-button ${active ? 'playing' : ''} ${invited ? 'invited' : ''}`} onClick={() => toggleNarration(campaign, log)} aria-label={invited ? 'Tap to hear this turn' : active ? 'Pause narration' : 'Read this turn aloud'} title={invited ? 'Tap to hear this turn' : 'Read this turn aloud'}>
    {active ? <Pause/> : <Play/>}<span>{invited ? 'Tap to listen' : active ? 'Narrating' : 'Listen'}</span>
  </button>;
}

// THE POUR AT THE SEAT (Directive XI, Law I) — a sealed page pours into
// its permanent entry. The plan is pure (src/lib/pour.js); this hook only
// walks it on a timer. Rows that are not pouring — history, reopened
// books, the node eval harness — render the full page instantly and arm
// nothing. Under reduced motion the pour is instant and done is spoken at
// once. The DOM only ever GAINS characters and paragraphs: every step is
// a strict prefix of the next, the final step IS the sealed narration,
// and when the pour prop later drops, the render is identical bytes — no
// node is ever replaced beneath the reader.
function usePour(blocks, active, { still = false, onTick = null, onDone = null } = {}) {
  const plan = useMemo(() => pourPlan(blocks), [blocks]);
  const [step, setStep] = useState(active && !still ? 0 : plan.length);
  const doneRef = useRef(!active);
  useEffect(() => {
    if (!active) return undefined;
    if (still || step >= plan.length) {
      if (!doneRef.current) { doneRef.current = true; onDone?.(); }
      return undefined;
    }
    const timer = setTimeout(() => { setStep((current) => current + 1); onTick?.(); }, pourInterval(plan.length));
    return () => clearTimeout(timer);
  }, [active, still, step, plan, onTick, onDone]);
  if (!active || still || step >= plan.length) return blocks;
  return plan[step];
}

export function LogEntry({ log, campaign, painting, plateNumeral = null, pour = false, reduceMotion = false, onPourTick = null, onPourDone = null }) {
  const cue = log.dm.image_cue;
  const poured = usePour(log.dm.narration_blocks, pour, { still: reduceMotion, onTick: onPourTick, onDone: onPourDone });
  // Every turn shows a plate: the DM's cue mood when present, otherwise the
  // opening line of narration. The procedural plate stands in until (or unless)
  // the painted scene arrives.
  // LAW X — a sealed caption rides the cue and is preferred whole; the
  // legacy sliced caption (plateMood) serves REPLAY ONLY, for pages
  // sealed before the Art Director's chair opened.
  const mood = cue?.caption || cue?.mood || plateMood(log.dm, 90) || 'the scene';
  const art = proceduralArtDataUrl(`${campaign.id}:${log.id}`, mood, log.dm.cinematic?.palette || ['#0d0b14','#4c465e','#d4a24e']);
  // THE FRESH PLATE LAW (XVII, Article III) — a plate bearing papers walks
  // the render door: its attested origin must equal this very log's sealed
  // hash, and its caption must stand. Refused papers show an HONEST EMPTY
  // FRAME — never yesterday's painting, never a recycled stand-in. Logs
  // sealed before papers existed are grandfathered whole: immutable history
  // renders exactly as it always did (including retired-film posters).
  const verdict = log.imagePapers ? admitPlate({ turnHash: log.recordHash ?? null, attestation: log.imagePapers, caption: mood }) : null;
  const refused = Boolean(verdict && !verdict.admit);
  const still = refused ? null : (log.imageUrl || log.videoPosterUrl || null);
  const showScene = Boolean(still || cue || painting || refused);
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
  // THE PLATE MARK — the seen ledger records a painted plate the moment it
  // actually renders in the transcript (reopens included; first showing
  // wins). Fire-and-forget: the ledger is an observation, never load-bearing.
  const stillHash = !refused && log.imageAssetHash ? log.imageAssetHash : null;
  useEffect(() => {
    if (stillHash) markRevealed(campaign.id, 'plate', stillHash, { logId: log.id });
  }, [stillHash, campaign.id, log.id]);
  return <article className="turn-entry">
    {log.player && <div className="player-line"><span>You</span><p>{log.player}</p></div>}
    {/* THE DEED LINE — the player acted rather than spoke (a die cast): shown
        in sequence like their words, but marked apart, so the script reads
        whole without dressing a deed as speech. */}
    {!log.player && log.deed && <div className="player-line deed"><span>✦</span><p>{log.deed}</p></div>}
    {log.dm.cinematic && <div className="beat-line"><span>✦</span><b>{log.dm.cinematic.title}</b><small>{log.dm.cinematic.subtitle}</small></div>}
    {/* Reading order is deliberate: the words land first, the Listen control is
        available immediately, and the painted plate slots in BELOW the text —
        so a paint that finishes mid-read never shoves the paragraph you're on. */}
    <div className="narration">{poured.map((block,i)=><p key={i} className={i===0?'dropcap':''}>{block.speaker && <strong>{block.speaker}</strong>}{block.text}</p>)}</div>
    <NarrationButton campaign={campaign} log={log} />
    {showScene && <figure className={`illustration-panel full-bleed ${!still && !refused && painting ? 'painting' : ''}`}>
      {refused
        ? <div className="empty-frame" role="img" aria-label={emptyFrameLine(verdict.status)}><span className="frame-sigil" aria-hidden="true">❖</span><p>{emptyFrameLine(verdict.status)}</p></div>
        : <button type="button" className="plate-zoom" onClick={() => setExpandedSrc(still || art)} aria-label="Expand the illustration"><img src={still || art} alt={mood}/></button>}
      {/* The folio speaks: a numbered engraving, as a printed book would caption it. */}
      <figcaption>{mood}<span>{plateNumeral && <b className="plate-no">Plate {plateNumeral} · </b>}{refused ? 'empty frame' : still ? 'illuminated' : (painting ? 'painting…' : 'procedural plate')}</span></figcaption>
    </figure>}
    {log.resolution && <div className={`roll-stamp ${log.resolution.outcome.includes('success')?'success':'failure'}`}><Dices/><span>{log.resolution.selectedDie} → {log.resolution.total}</span><b>{log.resolution.outcome.replaceAll('_',' ')}</b></div>}
    {expandedSrc && <div className="plate-lightbox" role="dialog" aria-modal="true" aria-label="Illustration, expanded" onClick={() => setExpandedSrc(null)}>
      <img src={expandedSrc} alt={mood}/>
      <button type="button" ref={closeRef} className="lightbox-close" aria-label="Close the illustration" onClick={() => setExpandedSrc(null)}><X/></button>
    </div>}
  </article>;
}

// THE TABLE'S-DICE LAW (Directive X, Law V) — the owner's name rides the
// roll surface: an ask whose actor_id names a sheeted companion wears that
// companion's name and sigil beside the kind, exactly as the hero's own
// death-save button wears the hero's. Hero asks render unchanged, and an
// unknown or sheetless name adds nothing — never a guess.
function ownerTag(campaign, pending) {
  const key = (value) => String(value ?? '').trim().toLowerCase();
  if (!pending || !pending.actor_id || key(pending.actor_id) === 'hero') return '';
  const owner = (campaign.codex?.party || []).find((member) => member?.sheet && key(member.name) === key(pending.actor_id));
  return owner ? `${owner.name} ${owner.sheet.sigil} · ` : '';
}

function Composer({ campaign, busy, reduceMotion, onSubmit, onSuggestion, onRoll, onXCard }) {
  const [text,setText]=useState(''); const pending=campaign.pendingRoll;
  const send=()=>{if(text.trim()){onSubmit(text);setText('');}};
  // THE ROADS STAY OPEN — suggestions read the latest TURN, never a tick or
  // span row: a time-advancing turn appends its divider after itself, and
  // the divider must not swallow the roads the turn offered.
  const latest=[...campaign.logs].reverse().find((l)=>!l.redacted && !l.kind);
  return <section className="composer-wrap">
    {latest?.dm?.suggestions && !pending && <SuggestionRow key={latest.id} suggestions={latest.dm.suggestions} disabled={busy} onPick={onSuggestion} reduceMotion={reduceMotion} />}
    {pending ? <button className="roll-button" onClick={onRoll} disabled={busy}><Dices/><span><small>{ownerTag(campaign, pending)}{pending.kind} · DC {pending.dc ?? 'hidden'}</small>{pending.label}</span><b>Roll {pending.die}</b></button> : <div className="composer"><button className="x-card" onClick={onXCard} disabled={busy} title="Remove the last scene from active canon"><MessageCircleWarning/></button><textarea value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder="What do you do?" rows="1" disabled={busy}/><button onClick={send} disabled={busy||!text.trim()}><Feather/></button></div>}
  </section>;
}

function CombatBanner({ combat }) {
  // THE ROUND LAW (Directive X): the sealed order never reshuffles — the
  // downed and the fled keep their seats, greyed, so the table reads the
  // battle's history in its chairs. Old sealed orders without a side
  // render exactly as they always did.
  return <section className="combat-banner"><div><Swords/><span>Round {combat.round}</span></div><div className="initiative">{combat.order.map((entry)=>{
    const foe = entry.side === 'enemy' ? combat.enemies.find((e)=>e.id===entry.id) : null;
    const out = entry.side === 'enemy' && (!foe || (foe.hp ?? 0) <= 0);
    return <span className={`${entry.hero?'hero':''}${out?' out':''}`} key={entry.id}>{entry.name} <b>{entry.total}</b></span>;
  })}</div><div className="enemy-bars">{combat.enemies.map((enemy)=><span key={enemy.id}><i style={{width:`${enemy.hp/enemy.maxHp*100}%`}}/><b>{enemy.name}</b><small>{enemy.zone} · {enemy.hp}/{enemy.maxHp}</small></span>)}</div></section>;
}

// THE DOOM LAW (Directive X, Law VII) — zero is DYING, not dead. While the
// standing mercy is unspent and undeclined the epitaph waits as it always
// has; once the mercy is spent or declined the doom walk begins: death
// saves through the open door, three-and-three, each die landing on stage.
// Three successes stand stable at zero; three failures seal the epitaph
// final — no intervention, no resurrection, no take-backs.
function Epitaph({ campaign, onIntervene, onFaceTheDark, onDeathSave }) {
  const hero = campaign.hero;
  const saves = hero.deathSaves || { successes: 0, failures: 0 };
  if (hero.dead) return <div className="epitaph"><span>{hero.sigil}</span><p>The road ends here. The record keeps the name.</p><h1>{hero.name}</h1><p className="doom-tally">Three failures. The seal is permanent.</p></div>;
  const walking = hero.deathTouched || hero.doomChosen;
  return <div className="epitaph"><span>{hero.sigil}</span><p>{walking ? 'The dark leans close. Roll, and be counted.' : 'An epitaph waits, but fate has not yet closed its hand.'}</p><h1>{hero.name}</h1>
    {walking
      ? <>
          <p className="doom-tally">Death saves — successes {saves.successes} of 3 · failures {saves.failures} of 3</p>
          <button className="roll-button doom" onClick={onDeathSave}><Dices/><span><small>{hero.name} {hero.sigil} · death_save · DC 10</small>Death save</span><b>Roll d20</b></button>
        </>
      : <>
          <button onClick={onIntervene}>Invoke Fate’s Intervention</button>
          <button className="doom-decline" onClick={onFaceTheDark}>Face the dark</button>
        </>}
  </div>;
}
