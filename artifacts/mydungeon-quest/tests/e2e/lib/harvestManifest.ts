import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { GAME_ROOT } from './vision';

// ------------------------------------------------------------
// THE HARVEST MANIFEST — Move Three's binding law. One harvest project
// mints every artifact into test-results/harvest/ and writes ONE top
// manifest binding file → role, subjects, prose, region, state. Judge
// courts call preflightManifest(<project>) before sitting: a missing
// artifact is a loud, NAMED refusal — never a silent skip, never a
// repaint. Tooth 8 proves every preflight can bite.
//
// The store lives under the PAINT LAW's hash: prompts, foundry, the
// unlettered clause, and the warden ruling ladder. If any of those
// change, the plates are dead bytes and the store is razed.
// ------------------------------------------------------------

export const HARVEST_DIR = path.join(GAME_ROOT, 'test-results', 'harvest');
export const TOP_MANIFEST = path.join(HARVEST_DIR, 'manifest.json');

export function sha256Hex(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** THE PAGE'S WHOLE BREATH (60.1, LOOP_LOG): a storybook plate is judged
 * beside its chapter's WHOLE retelling (capped only to bound the ask),
 * never an opening slice. The stretch opens where it opens and the paint
 * falls where it falls: two sittings at the same seat — 58.7's dark bell,
 * 60.1's dawn-against-night — proved a 200-character opening manufactures
 * contradictions the book never wrote (the counted 60.1 plate paints the
 * banked hearth and blue shadow the retelling reaches by its second day).
 * The pinned question's own words ("whose retelling begins with the text
 * quoted below") stay true under the longer quote; the pinned texts are
 * untouched. ONE seat: the calibration bench and the G16b court both
 * read this function — the slice law must never live twice. */
export function pageProse(chapterProse: unknown): string {
  return String(chapterProse).slice(0, 4000);
}

// ---------- the paint law ----------

const LAW_SOURCES = [
  path.join(GAME_ROOT, 'src', 'lib', 'cinema', 'prompts.js'),
  path.join(GAME_ROOT, 'src', 'lib', 'cinema', 'foundry.js'),
  path.resolve(GAME_ROOT, '..', '..', 'packages', 'engine', 'src', 'unlettered.js'),
  path.resolve(GAME_ROOT, '..', '..', 'packages', 'engine', 'src', 'warden.js'),
  // (54B §3) The magnifier IS the warden's eye now — its texts, padding,
  // and clamp math are paint law; changing the instrument razes the store.
  path.resolve(GAME_ROOT, '..', '..', 'packages', 'engine', 'src', 'magnifier.js'),
  // The book court reads captures OF the book — layout law changes must
  // raze them too, or a stale storybook.json testifies about old code.
  path.join(GAME_ROOT, 'src', 'lib', 'storybook.js'),
  // (60B §4) THE ONE ROAD and THE SHEET LANE are paint law now: the
  // sheet grid, the silence clause, the ratio law, and the mint-job
  // shapes all steer what the foundry paints. A moved road kills the
  // store; the next harvest repaints under the standing law.
  path.join(GAME_ROOT, 'src', 'lib', 'plateroad.js'),
  path.join(GAME_ROOT, 'src', 'lib', 'sheets.js'),
  // (0.9.0 review round, amended after 58.4/58.5) The paint law covers the
  // PLATES and their captures — nothing else. Prose freshness is the PROSE
  // store's law (proseLawHash below): widening THIS hash to prose sources
  // razed the standing store on every writer's-room change, and each full
  // repaint re-rolled every judge sitting fresh — two sittings, two
  // different courts crossed, tooth 13's own bench included. The standing
  // store IS the stability mechanism; prose honesty is bought with a
  // cheap fresh mock walk (G24w), never with fresh paint dice.
];

export function paintLawHash(): string {
  return sha256Hex(Buffer.concat(LAW_SOURCES.map((p) => fs.readFileSync(p))));
}

/** Razes the store when the paint law changed; keeps it when it holds.
 * Call at the top of harvest A — everything downstream reuses lawfully. */
export function ensureFreshStore(): { reused: boolean; hash: string } {
  const hash = paintLawHash();
  const lawFile = path.join(HARVEST_DIR, 'paint-law.json');
  const stored = fs.existsSync(lawFile)
    ? (JSON.parse(fs.readFileSync(lawFile, 'utf8')).hash as string)
    : null;
  if (stored === hash) return { reused: true, hash };
  fs.rmSync(HARVEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(HARVEST_DIR, { recursive: true });
  fs.writeFileSync(lawFile, JSON.stringify({
    hash, at: new Date().toISOString(),
    note: 'sha256 over the paint law (prompts, foundry, unlettered, warden, magnifier, storybook). A changed paint law kills the plate store; the next harvest repaints from zero. Prose freshness is the prose store\u2019s own law \u2014 see proseLawHash.'
  }, null, 2));
  return { reused: false, hash };
}

// ---------- the prose law (0.9.0, THE WRITER'S ROOM — review round) ----------
// The architect's catch was real: G24 judging sessions frozen under old
// prose law is a stale court. But the answer is NOT razing the plate
// store — it is a SECOND store with its own law. The prose store holds
// one cheap mock walk's session record; it razes when any writer's-room
// law changes and costs seconds to reseed, because mock prose is
// deterministic and the walk never waits on paint. Paint dice and prose
// freshness never touch each other again.

export const PROSE_STORE_DIR = path.join(GAME_ROOT, 'test-results', 'prose-store');

const PROSE_LAW_SOURCES = [
  path.join(GAME_ROOT, 'server', 'room.js'),
  path.join(GAME_ROOT, 'server', 'artDirector.js'),
  path.join(GAME_ROOT, 'server', 'dm.js'),
  path.join(GAME_ROOT, 'src', 'lib', 'systemPrompt.js'),
  path.resolve(GAME_ROOT, '..', '..', 'packages', 'engine', 'src', 'mockDm.js'),
  path.resolve(GAME_ROOT, '..', '..', 'packages', 'engine', 'src', 'protocol.js'),
];

export function proseLawHash(): string {
  return sha256Hex(Buffer.concat(PROSE_LAW_SOURCES.map((p) => fs.readFileSync(p))));
}

/** Razes the prose store when the writer's-room law changed; keeps it
 * when it holds. Call at the top of G24w — the walk reseeds only when
 * the law moved, and the court always judges sessions born under the
 * law it enforces. */
export function ensureFreshProse(): { reused: boolean; hash: string } {
  const hash = proseLawHash();
  const lawFile = path.join(PROSE_STORE_DIR, 'prose-law.json');
  const sessionFile = path.join(PROSE_STORE_DIR, 'session.json');
  const stored = fs.existsSync(lawFile)
    ? (JSON.parse(fs.readFileSync(lawFile, 'utf8')).hash as string)
    : null;
  if (stored === hash && fs.existsSync(sessionFile)) return { reused: true, hash };
  fs.rmSync(PROSE_STORE_DIR, { recursive: true, force: true });
  fs.mkdirSync(PROSE_STORE_DIR, { recursive: true });
  fs.writeFileSync(lawFile, JSON.stringify({
    hash, at: new Date().toISOString(),
    note: 'sha256 over the writer\u2019s-room law (room, artDirector, dm, systemPrompt, mockDm, protocol). A changed law kills the prose store; G24w reseeds it with one fresh mock walk \u2014 no paint waits, no judge dice.'
  }, null, 2));
  return { reused: false, hash };
}

// ---------- the top manifest ----------

export interface AttestationRef { i: number; recordHash: string | null }

/** (0.6.3 §2.4) A plate's terminal answer, read from the sealed record.
 * Every plate on disk is FULFILLED, bound to the attestation that minted
 * it; the test-planted anchor seed alone is SEEDED — its minting
 * attestation lives in the LIVE record it crossed from. */
export type PlateResolution =
  | { state: 'fulfilled'; assetHash: string; attestation: AttestationRef }
  | { state: 'seeded'; assetHash: string; attestation: null; note: string };

/** (0.6.3 §2.4) A paint ask the sealed record REFUSED. No media row
 * exists, by law — the record alone testifies. Role-classified so the
 * courts' door law can refuse BY NAME when a required class was refused. */
export interface Refusal {
  tag: 'live' | 'fixture'; role: string;
  cacheKey: string | null; label: string | null; variant: string | null; subtype: string | null;
  assetHash: string | null; originTurnHash: string | null;
  /** 'refused' — text sighted twice, bytes dropped; 'anchored' — likeness
   * fell twice, the blessed anchor stood in and no distinct row minted. */
  terminal: 'refused' | 'anchored';
  reason: string | null; attestation: AttestationRef;
}

export interface TopPlate {
  file: string; tag: 'live' | 'fixture'; role: string;
  klass: string; label: string | null; variant: string | null;
  assetHash: string | null; cacheKey: string | null; sha256: string;
  subjects: string[]; heroBearing: boolean;
  /** (56C) THE HONEST FRAME — the painter's own cue, carried verbatim for
   * the closure court: cueSubjects is the cue's subject list (null when the
   * row has no cue), crowd its granted allowance, heroFirst whether the
   * cue's FIRST subject is the hero. subjects/heroBearing keep their
   * G17b-era meanings untouched. */
  cueSubjects: string[] | null; crowd: string | null; heroFirst: boolean;
  prose: string | null; region: string | null; state: string | null;
  resolution: PlateResolution;
}

export interface TopManifest {
  builtAt: string; paintLawHash: string;
  hero: { name: string; mark: string; presentation: string };
  villain: string;
  plates: TopPlate[];
  /** (0.6.3 §2.4) Every refusal the two sealed records hold — the honest
   * history of asks that died, beside the plates that lived. */
  refusals: Refusal[];
  files: {
    sessionLive: string; recordLive: string;
    sessionFixture: string; recordFixture: string;
    storybook: string; captions: string; cover: string;
  };
  counts: { plates: number; scenes: number; heroBearingScenes: number; portraits: number; keyarts: number; refusals: number; anchored: number };
}

const FILES: TopManifest['files'] = {
  sessionLive: path.join('live', 'session.json'),
  recordLive: path.join('live', 'record.json'),
  sessionFixture: path.join('fixture', 'session.json'),
  recordFixture: path.join('fixture', 'record.json'),
  storybook: path.join('fixture', 'storybook.json'),
  captions: path.join('fixture', 'captions.json'),
  cover: path.join('fixture', 'cover.png'),
};

/** Builds and writes the top manifest from the two per-tag stores.
 * Verifies every plate's content address (sha256 of the bytes on disk
 * === the assetHash the record attests) — a mismatch is store
 * corruption and fails the build by file name. */
export function buildTopManifest(): TopManifest {
  const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(HARVEST_DIR, rel), 'utf8'));
  for (const [key, rel] of Object.entries(FILES)) {
    if (!fs.existsSync(path.join(HARVEST_DIR, rel))) {
      throw new Error(`top manifest build: harvest artifact missing — ${key} (${rel})`);
    }
  }
  for (const tag of ['live', 'fixture']) {
    if (!fs.existsSync(path.join(HARVEST_DIR, tag, 'manifest.json'))) {
      throw new Error(`top manifest build: harvest artifact missing — the ${tag} plate manifest`);
    }
  }

  const sessionLive = readJson(FILES.sessionLive);
  const sessionFixture = readJson(FILES.sessionFixture);
  // (0.6.3 §2.4) THE SEALED RECORDS SPEAK — every plate binds to the
  // attestation that minted it, and every refusal the records hold rides
  // into the manifest, role-classified, for the courts' door law.
  const recordJournals: Record<'live' | 'fixture', any[]> = {
    live: readJson(FILES.recordLive).journal || [],
    fixture: readJson(FILES.recordFixture).journal || [],
  };
  const paintAttestations = (tag: 'live' | 'fixture') => recordJournals[tag]
    .filter((row: any) => row?.type === 'media_attestation' && row.payload?.kind === 'paint');
  const hero = sessionLive.hero;
  const villain: string = sessionLive.villain;
  const lc = (value: unknown) => String(value || '').toLowerCase();

  const roleOf = (tag: 'live' | 'fixture', entry: any): string => {
    const ck = String(entry.cacheKey || '');
    // (60B §4) THE SHEET ROLES — the reference sheets ride their own klass
    // (harness classify learned the arm in the same cut); the hero's own
    // sheet carries a named role for the sheet court's door law, every
    // other sheet rides the family role and is judged beside it.
    if (entry.klass === 'sheet') {
      return entry.label === hero.name ? 'hero-sheet' : 'sheet';
    }
    if (entry.klass === 'keyart') return 'keyart';
    if (entry.klass === 'scene') {
      // (56C) The frame courts' deterministic seats ride their own roles so
      // the standing scene courts (G16a's moment law, the counts) see
      // exactly the plates they always saw.
      if (ck.endsWith(':duchy-pair-1')) return 'duchy-pair-1';
      if (ck.endsWith(':duchy-pair-2')) return 'duchy-pair-2';
      if (ck.endsWith(':hero-first-scene')) return 'hero-first-scene';
      // (Task 57) The species seat rides its own role, so the standing
      // scene courts see exactly the plates they always saw.
      if (ck.endsWith(':battle-species')) return 'battle-species';
      return 'scene';
    }
    if (tag === 'live') {
      if (entry.klass === 'portrait' && entry.label === hero.name && entry.variant === 'bust') return 'hero-anchor';
      if (entry.label === villain && entry.variant === 'bust') return 'villain-intro';
      if (entry.label === villain && entry.variant === 'dramatic') return 'villain-later';
    } else {
      // (iteration-8 logged edit) The live anchor seeded across the mirror
      // rides its own role — it is the imported blessing, not the fixture's
      // painted bust, and must never masquerade as one while a painted bust
      // exists. See the promote law below for the drift-drift case.
      if (ck.endsWith(':anchor-seed')) return 'anchor-seed';
      if (entry.klass === 'portrait' && entry.label === hero.name && entry.variant === 'bust') return 'hero-bust-fixture';
      if (entry.label === 'Edda' && entry.variant === 'bust') return 'edda-bust';
      if (entry.klass === 'region') {
        if (ck.endsWith(':vale-2')) return 'vale-second';
        if (ck.endsWith(':vale-wounded')) return 'vale-wounded';
        if (ck.endsWith(':vale-blighted')) return 'vale-blighted';
        if (!ck.startsWith('proving:')) return 'vale-establishing';
      }
    }
    return entry.klass || 'plate';
  };

  const stateOf = (role: string): string | null => (
    role === 'vale-establishing' || role === 'vale-second' ? 'thriving'
      : role === 'vale-wounded' ? 'wounded'
        : role === 'vale-blighted' ? 'blighted'
          : null
  );

  const plates: TopPlate[] = [];
  for (const tag of ['live', 'fixture'] as const) {
    const session = tag === 'live' ? sessionLive : sessionFixture;
    const entries = readJson(path.join(tag, 'manifest.json')) as any[];
    for (const entry of entries) {
      const bytes = fs.readFileSync(path.join(HARVEST_DIR, entry.file));
      const digest = sha256Hex(bytes);
      if (entry.assetHash && digest !== entry.assetHash) {
        throw new Error(`top manifest build: plate bytes do not match their content address — ${entry.file} (sha256 ${digest.slice(0, 12)}… vs assetHash ${String(entry.assetHash).slice(0, 12)}…)`);
      }
      const role = roleOf(tag, entry);
      const minted = paintAttestations(tag).find((row: any) =>
        row.payload?.assetHash === entry.assetHash && row.payload?.warden?.warden !== 'refused');
      const isSeed = String(entry.cacheKey || '').endsWith(':anchor-seed');
      if (!minted && !isSeed) {
        throw new Error(`top manifest build: plate ${entry.file} carries no paint attestation in the ${tag} sealed record — a provenance hole, not a plate`);
      }
      const resolution: PlateResolution = minted
        ? { state: 'fulfilled', assetHash: String(entry.assetHash), attestation: { i: minted.i, recordHash: minted.recordHash ?? null } }
        : { state: 'seeded', assetHash: String(entry.assetHash), attestation: null, note: 'seeded across the mirror from the live store — its minting attestation lives in the live record' };
      const log = (session.logs || []).find((row: any) =>
        (row.imageAssetHash && row.imageAssetHash === entry.assetHash)
        || (row.recordHash && String(entry.cacheKey || '').endsWith(`:${row.recordHash}`)));
      const speakers: string[] = (log?.narrations || []).map((block: any) => block.speaker).filter(Boolean);
      const cueSubjects: string[] = log?.imageCue?.subjects || [];
      // G17b parity with the monolith: fixture scenes bind their SPEAKERS,
      // live scenes bind the painter's own cue. Hero-bearing follows the
      // painter's brief alone — the cue is what the foundry was told.
      const subjects = role === 'scene' ? (tag === 'fixture' ? [...new Set(speakers)] : cueSubjects) : [];
      const heroBearing = role === 'scene' && cueSubjects.some((name) => lc(name).includes(lc(hero.name)));
      // (56C) The cue carried verbatim for the frame courts — null when the
      // row holds no cue (fixture scene-log plates, portraits, regions).
      const cueList: string[] | null = log?.imageCue?.subjects ? cueSubjects : null;
      const heroFirst = !!cueList && cueList.length > 0 && lc(cueList[0]).includes(lc(hero.name));
      plates.push({
        file: entry.file, tag, role,
        klass: entry.klass, label: entry.label ?? null, variant: entry.variant ?? null,
        assetHash: entry.assetHash ?? null, cacheKey: entry.cacheKey ?? null, sha256: digest,
        subjects, heroBearing,
        cueSubjects: cueList, crowd: log?.imageCue?.crowd ?? null, heroFirst,
        prose: role === 'scene' ? (log?.narrations?.[0]?.text || null) : null,
        region: entry.klass === 'region' ? (entry.label ?? null) : (log?.imageCue?.region ?? null),
        state: stateOf(role),
        resolution,
      });
    }
  }

  // (iteration-8 logged edit) THE NEVER-A-STRANGER PROMOTE: when the
  // fixture's hero bust drifted twice, the app's warden lane shipped the
  // anchor itself — the store then holds no painted bust, and the seeded
  // anchor row IS the plate the player saw. Promote it to the fixture-bust
  // role so the courts judge exactly what shipped. When a painted bust
  // exists, the seed keeps its own role and never masquerades.
  if (!plates.some((p) => p.role === 'hero-bust-fixture')) {
    const seeded = plates.find((p) => p.role === 'anchor-seed');
    if (seeded) seeded.role = 'hero-bust-fixture';
  }

  // (0.6.3 §2.4) The refusals ledger — role-classified from the payload's
  // own identity (the attestation carries the ask's name since 0.6.3).
  const refusalKlass = (payload: any): string => {
    // (60B §4) A refused SHEET ask must die under its own name — without
    // this arm it classed 'region' and the sheet court's door would say
    // "missing" where the honest word is REFUSED.
    if (payload?.subtype === 'sheet' || payload?.variant === 'sheet' || String(payload?.cacheKey || '').startsWith('sheet:')) return 'sheet';
    if (payload?.subtype === 'scene' || String(payload?.cacheKey || '').startsWith('scene:') || String(payload?.cacheKey || '').startsWith('proving-scene:')) return 'scene';
    if (payload?.subtype === 'keyart' || payload?.label === 'keyart') return 'keyart';
    if (payload?.subtype === 'portrait' || ['bust', 'full-figure', 'dramatic'].includes(String(payload?.variant))) return 'portrait';
    if (payload?.subtype === 'region' || payload?.label) return 'region';
    return 'unknown';
  };
  const refusals: Refusal[] = [];
  for (const tag of ['live', 'fixture'] as const) {
    for (const row of paintAttestations(tag)) {
      // (iteration 54.2 logged edit) The ledger carries BOTH terminal
      // non-deliveries: REFUSED (text sighted twice — bytes dropped) and
      // ANCHORED (likeness fell twice — the blessed anchor stood in, no
      // distinct row minted). The courts' door law names each honestly.
      const wardenState = row.payload?.warden?.warden;
      const terminal: 'refused' | 'anchored' | null =
        wardenState === 'refused' ? 'refused' : wardenState === 'fallback' ? 'anchored' : null;
      if (!terminal) continue;
      const payload = row.payload;
      const pseudo = { cacheKey: payload.cacheKey ?? null, label: payload.label ?? null, variant: payload.variant ?? null, klass: refusalKlass(payload) };
      refusals.push({
        tag, role: roleOf(tag, pseudo), terminal,
        cacheKey: payload.cacheKey ?? null, label: payload.label ?? null, variant: payload.variant ?? null, subtype: payload.subtype ?? null,
        assetHash: payload.assetHash ?? null, originTurnHash: payload.originTurnHash ?? null,
        reason: payload.warden?.reason ?? null,
        attestation: { i: row.i, recordHash: row.recordHash ?? null },
      });
    }
  }

  const manifest: TopManifest = {
    builtAt: new Date().toISOString(),
    paintLawHash: paintLawHash(),
    hero: { name: hero.name, mark: hero.mark, presentation: hero.presentation },
    villain,
    plates,
    refusals,
    files: FILES,
    counts: {
      plates: plates.length,
      scenes: plates.filter((p) => p.role === 'scene').length,
      heroBearingScenes: plates.filter((p) => p.role === 'scene' && p.heroBearing).length,
      portraits: plates.filter((p) => p.klass === 'portrait').length,
      keyarts: plates.filter((p) => p.role === 'keyart').length,
      refusals: refusals.filter((r) => r.terminal === 'refused').length,
      anchored: refusals.filter((r) => r.terminal === 'anchored').length,
    },
  };
  fs.writeFileSync(TOP_MANIFEST, JSON.stringify(manifest, null, 2));
  return manifest;
}

export function loadTopManifest(): TopManifest | null {
  return fs.existsSync(TOP_MANIFEST) ? JSON.parse(fs.readFileSync(TOP_MANIFEST, 'utf8')) : null;
}

export function rolePlate(manifest: TopManifest, role: string): TopPlate {
  const plate = manifest.plates.find((p) => p.role === role);
  if (!plate) throw new Error(`top manifest holds no plate for role "${role}"`);
  return plate;
}

export function topBytes(plate: TopPlate): Buffer {
  return fs.readFileSync(path.join(HARVEST_DIR, plate.file));
}

// ---------- the preflight law (and tooth 8's doctor) ----------

export type JudgeProject =
  | 'g09-character' | 'g10-environment' | 'g11-style'
  | 'g16-captions' | 'g17-framing' | 'g18-storybook' | 'g22-frame'
  | 'g23-battle' | 'g31-sheet';

export const JUDGE_PROJECTS: JudgeProject[] = [
  'g09-character', 'g10-environment', 'g11-style',
  'g16-captions', 'g17-framing', 'g18-storybook', 'g22-frame',
  // (57 review, logged edit) g23-battle was in the NEEDS ledger but not
  // enrolled here, so the union lied and tooth 8's doctor walk skipped the
  // battle court's manifest. Enrolled now — the walk grew STRICTER.
  'g23-battle',
  // (60B §4) THE SHEET COURT — enrolled at birth, so tooth 8 doctors its
  // first need and tooth 9's starvation law covers a refused sheet mint
  // from the court's first sitting.
  'g31-sheet',
];

interface Need {
  what: string;
  ok(manifest: TopManifest): boolean;
  doctor(manifest: TopManifest): void;
  /** (0.6.3 §2.5) The refused paint class that starves this need — needs
   * with no paint dependency (pure captures) carry none. */
  paint?: { role?: string; subtype?: 'scene' | 'portrait' | 'keyart' | 'region' | 'any'; tag?: 'live' | 'fixture' };
}

/** Does a sealed refusal starve this need? Role beats subtype; subtype
 * 'any' means any refused paint ask starves it. */
const refusalHits = (need: Need, refusal: Refusal): boolean => {
  const paint = need.paint;
  if (!paint) return false;
  if (paint.tag && refusal.tag !== paint.tag) return false;
  if (paint.role && refusal.role !== paint.role) return false;
  if (paint.subtype && paint.subtype !== 'any') {
    const klass = refusal.subtype === 'scene' || String(refusal.cacheKey || '').startsWith('scene:') ? 'scene'
      : refusal.subtype === 'keyart' || refusal.label === 'keyart' ? 'keyart'
        : refusal.subtype === 'portrait' || ['bust', 'full-figure', 'dramatic'].includes(String(refusal.variant)) ? 'portrait'
          : refusal.subtype === 'region' ? 'region' : 'unknown';
    if (klass !== paint.subtype) return false;
  }
  return true;
};

const onDisk = (plate: TopPlate) => fs.existsSync(path.join(HARVEST_DIR, plate.file));

const roleNeed = (role: string): Need => ({
  what: `role "${role}"`,
  ok: (m) => m.plates.some((p) => p.role === role && onDisk(p)),
  doctor: (m) => { m.plates = m.plates.filter((p) => p.role !== role); },
  paint: { role },
});

// (56C) The frame courts' deterministic seats — scene-klass paints minted
// into the fixture store by the harness; any refused fixture-tag scene ask
// starves them honestly (their roles are cacheKey-derived, so the refusal
// ledger knows them only by their class).
const harnessSceneNeed = (role: string): Need => ({
  what: `role "${role}"`,
  ok: (m) => m.plates.some((p) => p.role === role && onDisk(p)),
  doctor: (m) => { m.plates = m.plates.filter((p) => p.role !== role); },
  paint: { subtype: 'scene', tag: 'fixture' },
});

const fileNeed = (key: keyof TopManifest['files'], label: string): Need => ({
  what: `${label} (${key})`,
  ok: (m) => !!m.files[key] && fs.existsSync(path.join(HARVEST_DIR, m.files[key])),
  doctor: (m) => { m.files[key] = path.join('__doctored__', 'absent'); },
});

const NEEDS: Record<JudgeProject, Need[]> = {
  'g09-character': [
    roleNeed('hero-anchor'),
    roleNeed('hero-bust-fixture'),
    roleNeed('villain-intro'),
    roleNeed('villain-later'),
    roleNeed('edda-bust'),
    {
      what: 'a hero-bearing scene plate',
      ok: (m) => m.plates.some((p) => p.role === 'scene' && p.heroBearing && onDisk(p)),
      doctor: (m) => { for (const p of m.plates) p.heroBearing = false; },
      paint: { subtype: 'scene', tag: 'live' },
    },
    fileNeed('recordLive', 'the exported live record'),
  ],
  'g10-environment': [
    roleNeed('vale-establishing'),
    roleNeed('vale-second'),
    roleNeed('vale-wounded'),
    roleNeed('vale-blighted'),
  ],
  'g22-frame': [
    harnessSceneNeed('duchy-pair-1'),
    harnessSceneNeed('duchy-pair-2'),
    harnessSceneNeed('hero-first-scene'),
    fileNeed('sessionLive', 'the live session (the hero card)'),
    fileNeed('sessionFixture', 'the fixture session (the sealed fixture canon and the painted briefs)'),
  ],
  // (Task 57) THE BATTLE COURT's seats — the species plate and the brief
  // ledger. Enrolled in JUDGE_PROJECTS, so tooth 8 doctors its first need
  // and tooth 9 starves its paint class automatically, like every court.
  'g23-battle': [
    harnessSceneNeed('battle-species'),
    fileNeed('sessionFixture', 'the fixture session (the battle brief and the species rider)'),
  ],
  // (60B §4) THE SHEET COURT's seats — the hero's sheet and her anchor
  // (the attire pair's two grounds), and both sealed sessions (the hero
  // card's canon, the captions, the cast visuals). Enrolled in
  // JUDGE_PROJECTS, so tooth 8 doctors the first need and tooth 9's
  // starvation law knows a refused sheet mint by its own class.
  'g31-sheet': [
    roleNeed('hero-sheet'),
    roleNeed('hero-anchor'),
    fileNeed('sessionLive', 'the live session (the sealed hero card and the plate captions)'),
    fileNeed('sessionFixture', 'the fixture session (the sealed cast canon)'),
  ],
  'g11-style': [
    roleNeed('vale-establishing'),
    {
      what: 'a fixture scene plate',
      ok: (m) => m.plates.some((p) => p.tag === 'fixture' && p.role === 'scene' && onDisk(p)),
      doctor: (m) => { m.plates = m.plates.filter((p) => !(p.tag === 'fixture' && p.role === 'scene')); },
      paint: { subtype: 'scene', tag: 'fixture' },
    },
    fileNeed('sessionFixture', 'the fixture session (the style bible)'),
    {
      what: 'ten plates in the store',
      ok: (m) => m.plates.filter(onDisk).length >= 10,
      doctor: (m) => { m.plates = m.plates.slice(0, 3); },
      paint: { subtype: 'any' },
    },
  ],
  'g16-captions': [
    fileNeed('storybook', 'the storybook capture'),
    fileNeed('captions', 'the captions capture'),
    {
      what: 'three scene plates bound to their moments',
      ok: (m) => m.plates.filter((p) => p.role === 'scene' && p.prose && onDisk(p)).length >= 3,
      doctor: (m) => { for (const p of m.plates) p.prose = null; },
      paint: { subtype: 'scene' },
    },
  ],
  'g17-framing': [
    {
      what: 'four portraits',
      ok: (m) => m.plates.filter((p) => p.klass === 'portrait' && onDisk(p)).length >= 4,
      doctor: (m) => { m.plates = m.plates.filter((p) => p.klass !== 'portrait'); },
      paint: { subtype: 'portrait' },
    },
    {
      what: 'two key arts',
      ok: (m) => m.plates.filter((p) => p.role === 'keyart' && onDisk(p)).length >= 2,
      doctor: (m) => { m.plates = m.plates.filter((p) => p.role !== 'keyart'); },
      paint: { subtype: 'keyart' },
    },
    {
      what: 'two subject-bearing scenes',
      ok: (m) => m.plates.filter((p) => p.role === 'scene' && p.subjects.length > 0 && onDisk(p)).length >= 2,
      doctor: (m) => { for (const p of m.plates) p.subjects = []; },
      paint: { subtype: 'scene' },
    },
  ],
  'g18-storybook': [
    fileNeed('storybook', 'the storybook capture'),
    fileNeed('cover', 'the cover capture'),
    fileNeed('recordFixture', 'the sealed fixture record'),
  ],
};

/** The judge courts' door law: every artifact this project needs exists
 * on disk, or the court refuses to sit — loudly, BY NAME. */
export function preflightManifest(project: JudgeProject, manifest?: TopManifest): TopManifest {
  const m = manifest ?? loadTopManifest();
  if (!m) {
    throw new Error(`${project} preflight: harvest artifact missing — the top manifest (test-results/harvest/manifest.json); the harvest project must run first`);
  }
  for (const need of NEEDS[project]) {
    if (need.ok(m)) continue;
    // (0.6.3 §2.5) When the need is short AND the sealed records hold a
    // refusal of its paint class, the court says REFUSED — the honest
    // name for an ask that died — never "missing", never a skip.
    // (iteration 54.2 logged edit) The door law names the terminal honestly:
    // REFUSED (text sighted twice) and ANCHORED (likeness fell twice — the
    // anchor stood in, no distinct plate minted) are different deaths, and
    // calling an anchored ask "refused" would be a lie at the door.
    // (57.4 logged edit) The door once named only the FIRST fallen member
    // of a short need — and the live record's honest anchored full-figure
    // eclipsed tooth 8b's planted refusal: the door spoke of a sister seat
    // and never said the refusal's name. A short need now names EVERY
    // fallen member of its class, refused members leading (the harder
    // death heads the message). The 54.2 death-names are unchanged; there
    // are simply no more eclipses. No assertion weakened — the tooth's
    // demands stand verbatim and the door under it grew more honest.
    const fallen = (m.refusals || []).filter((r) => refusalHits(need, r));
    if (fallen.length) {
      const describe = (r: Refusal) => `(${r.subtype || r.role}, label=${r.label ?? '—'}, variant=${r.variant ?? '—'}, cacheKey=${r.cacheKey ?? '—'}, attestation #${r.attestation.i}${r.reason ? `; reason: ${r.reason}` : ''})`;
      const refused = fallen.filter((r) => r.terminal !== 'anchored');
      const anchored = fallen.filter((r) => r.terminal === 'anchored');
      if (refused.length) {
        throw new Error(`${project} preflight: harvest artifact REFUSED — ${need.what}; the sealed ${refused[0].tag} record refused this ask ${refused.map(describe).join(' and ')}${anchored.length ? `; and beside it ${anchored.length === 1 ? 'a sister ask' : 'sister asks'} of the same class fell to the blessed anchor ${anchored.map(describe).join(' and ')}` : ''} — a refused required plate is a game defect; this court will not paper it over`);
      }
      throw new Error(`${project} preflight: harvest artifact ANCHORED — ${need.what}; the sealed ${anchored[0].tag} record shows ${anchored.length === 1 ? 'this ask' : 'these asks'} fell to ${anchored.length === 1 ? 'its' : 'the'} blessed anchor ${anchored.map(describe).join(' and ')} — no distinct plate was minted; a required plate that ships its anchor is a game defect; this court will not paper it over`);
    }
    throw new Error(`${project} preflight: harvest artifact missing — ${need.what}; the harvest project must mint it before this court sits`);
  }
  return m;
}

/** Tooth 8's scalpel: break exactly ONE need of a project in a deep
 * clone, and name what was broken so the bite can be verified.
 * (56B.3 logged re-aim) The scalpel used to cut NEEDS[project][0]
 * unconditionally. When the sealed live record HONESTLY explains that
 * need's hole — a REFUSED or ANCHORED attestation from a real paint
 * event — the preflight rightly answers with the record's word (tooth
 * 8b's own law: REFUSED never masquerades as missing), and the
 * missing-by-name message is unreachable: the tooth then fails on
 * truthful evidence, not a dull blade. The scalpel now probes the
 * needs IN ORDER and cuts the FIRST whose hole the record does NOT
 * explain, so the missing law is proven on a clean wound. If every
 * hole is record-explained it falls back to the first need and the
 * tooth fails honestly — such a store carries defects the courts must
 * surface, and no doctoring should paper that over. */
export function doctorFirstNeed(project: JudgeProject, manifest: TopManifest): { manifest: TopManifest; what: string } {
  let fallback: { manifest: TopManifest; what: string } | null = null;
  for (const need of NEEDS[project]) {
    const clone: TopManifest = JSON.parse(JSON.stringify(manifest));
    need.doctor(clone);
    if (!fallback) fallback = { manifest: clone, what: need.what };
    try {
      preflightManifest(project, clone);
      continue; // the doctoring drew no blood — probe the next need
    } catch (error: any) {
      if (String(error?.message || '').includes(`${project} preflight: harvest artifact missing`)) {
        return { manifest: clone, what: need.what };
      }
      continue; // the record explains this hole — probe the next need
    }
  }
  return fallback!;
}

/** Tooth 8b's scalpel (0.6.3 §5): for a project with a paint-dependent
 * need, break that need in a deep clone AND plant a matching refusal in
 * the clone's ledger — the preflight must then refuse with the REFUSED
 * message, BY NAME, never the missing one. Returns null for capture-only
 * projects (their bite is proven by the missing pass). */
export function doctorRefusedNeed(project: JudgeProject, manifest: TopManifest): { manifest: TopManifest; what: string } | null {
  const need = NEEDS[project].find((n) => n.paint);
  if (!need) return null;
  const clone: TopManifest = JSON.parse(JSON.stringify(manifest));
  need.doctor(clone);
  const paint = need.paint!;
  const subtype = paint.subtype && paint.subtype !== 'any' ? paint.subtype
    : paint.role === 'keyart' ? 'keyart'
      : paint.role === 'scene' ? 'scene'
        : paint.role && paint.role.startsWith('vale-') ? 'region' : 'portrait';
  clone.refusals = [...(clone.refusals || []), {
    tag: paint.tag ?? 'fixture',
    role: paint.role ?? subtype,
    cacheKey: `doctored:${project}:${paint.role ?? subtype}`,
    label: subtype === 'keyart' ? 'keyart' : 'Doctored Ask',
    variant: subtype === 'portrait' ? 'bust' : null,
    subtype,
    assetHash: 'doctored-refused-bytes',
    originTurnHash: null,
    terminal: 'refused',
    reason: 'tooth 8b — a doctored refusal planted in a manifest clone',
    attestation: { i: -1, recordHash: 'doctored' },
  }];
  return { manifest: clone, what: need.what };
}
