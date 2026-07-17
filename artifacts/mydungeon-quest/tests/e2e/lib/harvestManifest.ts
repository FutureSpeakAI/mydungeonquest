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

// ---------- the paint law ----------

const LAW_SOURCES = [
  path.join(GAME_ROOT, 'src', 'lib', 'cinema', 'prompts.js'),
  path.join(GAME_ROOT, 'src', 'lib', 'cinema', 'foundry.js'),
  path.resolve(GAME_ROOT, '..', '..', 'packages', 'engine', 'src', 'unlettered.js'),
  path.resolve(GAME_ROOT, '..', '..', 'packages', 'engine', 'src', 'warden.js'),
  // The book court reads captures OF the book — layout law changes must
  // raze them too, or a stale storybook.json testifies about old code.
  path.join(GAME_ROOT, 'src', 'lib', 'storybook.js'),
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
    note: 'sha256 over prompts.js + foundry.js + unlettered.js + warden.js — the paint law. A changed law kills the store; the next harvest repaints from zero.'
  }, null, 2));
  return { reused: false, hash };
}

// ---------- the top manifest ----------

export interface TopPlate {
  file: string; tag: 'live' | 'fixture'; role: string;
  klass: string; label: string | null; variant: string | null;
  assetHash: string | null; cacheKey: string | null; sha256: string;
  subjects: string[]; heroBearing: boolean;
  prose: string | null; region: string | null; state: string | null;
}

export interface TopManifest {
  builtAt: string; paintLawHash: string;
  hero: { name: string; mark: string; presentation: string };
  villain: string;
  plates: TopPlate[];
  files: {
    sessionLive: string; recordLive: string;
    sessionFixture: string; recordFixture: string;
    storybook: string; captions: string; cover: string;
  };
  counts: { plates: number; scenes: number; heroBearingScenes: number; portraits: number; keyarts: number };
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
  const hero = sessionLive.hero;
  const villain: string = sessionLive.villain;
  const lc = (value: unknown) => String(value || '').toLowerCase();

  const roleOf = (tag: 'live' | 'fixture', entry: any): string => {
    const ck = String(entry.cacheKey || '');
    if (entry.klass === 'keyart') return 'keyart';
    if (entry.klass === 'scene') return 'scene';
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
      plates.push({
        file: entry.file, tag, role,
        klass: entry.klass, label: entry.label ?? null, variant: entry.variant ?? null,
        assetHash: entry.assetHash ?? null, cacheKey: entry.cacheKey ?? null, sha256: digest,
        subjects, heroBearing,
        prose: role === 'scene' ? (log?.narrations?.[0]?.text || null) : null,
        region: entry.klass === 'region' ? (entry.label ?? null) : (log?.imageCue?.region ?? null),
        state: stateOf(role),
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

  const manifest: TopManifest = {
    builtAt: new Date().toISOString(),
    paintLawHash: paintLawHash(),
    hero: { name: hero.name, mark: hero.mark, presentation: hero.presentation },
    villain,
    plates,
    files: FILES,
    counts: {
      plates: plates.length,
      scenes: plates.filter((p) => p.role === 'scene').length,
      heroBearingScenes: plates.filter((p) => p.role === 'scene' && p.heroBearing).length,
      portraits: plates.filter((p) => p.klass === 'portrait').length,
      keyarts: plates.filter((p) => p.role === 'keyart').length,
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
  | 'g16-captions' | 'g17-framing' | 'g18-storybook';

export const JUDGE_PROJECTS: JudgeProject[] = [
  'g09-character', 'g10-environment', 'g11-style',
  'g16-captions', 'g17-framing', 'g18-storybook',
];

interface Need {
  what: string;
  ok(manifest: TopManifest): boolean;
  doctor(manifest: TopManifest): void;
}

const onDisk = (plate: TopPlate) => fs.existsSync(path.join(HARVEST_DIR, plate.file));

const roleNeed = (role: string): Need => ({
  what: `role "${role}"`,
  ok: (m) => m.plates.some((p) => p.role === role && onDisk(p)),
  doctor: (m) => { m.plates = m.plates.filter((p) => p.role !== role); },
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
    },
    fileNeed('recordLive', 'the exported live record'),
  ],
  'g10-environment': [
    roleNeed('vale-establishing'),
    roleNeed('vale-second'),
    roleNeed('vale-wounded'),
    roleNeed('vale-blighted'),
  ],
  'g11-style': [
    roleNeed('vale-establishing'),
    {
      what: 'a fixture scene plate',
      ok: (m) => m.plates.some((p) => p.tag === 'fixture' && p.role === 'scene' && onDisk(p)),
      doctor: (m) => { m.plates = m.plates.filter((p) => !(p.tag === 'fixture' && p.role === 'scene')); },
    },
    fileNeed('sessionFixture', 'the fixture session (the style bible)'),
    {
      what: 'ten plates in the store',
      ok: (m) => m.plates.filter(onDisk).length >= 10,
      doctor: (m) => { m.plates = m.plates.slice(0, 3); },
    },
  ],
  'g16-captions': [
    fileNeed('storybook', 'the storybook capture'),
    fileNeed('captions', 'the captions capture'),
    {
      what: 'three scene plates bound to their moments',
      ok: (m) => m.plates.filter((p) => p.role === 'scene' && p.prose && onDisk(p)).length >= 3,
      doctor: (m) => { for (const p of m.plates) p.prose = null; },
    },
  ],
  'g17-framing': [
    {
      what: 'four portraits',
      ok: (m) => m.plates.filter((p) => p.klass === 'portrait' && onDisk(p)).length >= 4,
      doctor: (m) => { m.plates = m.plates.filter((p) => p.klass !== 'portrait'); },
    },
    {
      what: 'two key arts',
      ok: (m) => m.plates.filter((p) => p.role === 'keyart' && onDisk(p)).length >= 2,
      doctor: (m) => { m.plates = m.plates.filter((p) => p.role !== 'keyart'); },
    },
    {
      what: 'two subject-bearing scenes',
      ok: (m) => m.plates.filter((p) => p.role === 'scene' && p.subjects.length > 0 && onDisk(p)).length >= 2,
      doctor: (m) => { for (const p of m.plates) p.subjects = []; },
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
    if (!need.ok(m)) {
      throw new Error(`${project} preflight: harvest artifact missing — ${need.what}; the harvest project must mint it before this court sits`);
    }
  }
  return m;
}

/** Tooth 8's scalpel: break exactly the FIRST need of a project in a
 * deep clone, and name what was broken so the bite can be verified. */
export function doctorFirstNeed(project: JudgeProject, manifest: TopManifest): { manifest: TopManifest; what: string } {
  const clone: TopManifest = JSON.parse(JSON.stringify(manifest));
  const need = NEEDS[project][0];
  need.doctor(clone);
  return { manifest: clone, what: need.what };
}
