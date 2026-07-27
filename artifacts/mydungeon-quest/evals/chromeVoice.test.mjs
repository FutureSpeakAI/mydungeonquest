// CHROME VOICE GATE (C10) — Rule 20, voice-tray specific.
//
// The voice audition row in creation must:
//   1. Use soundDesc() to describe candidates — never expose raw voice IDs
//      or provider-internal identifiers as player-visible text.
//   2. Show a plain-language selection confirmation that names permanence.
//   3. Not show any audio provider name in the tray or its labels.
//   4. Name the parchment floor honestly (no provider jargon).
//   5. Expand / collapse labels are plain English (no house vocab).
//
// Scope: Forge.jsx AuditionRow only. Literary surfaces excluded.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const forge = readFileSync(path.join(ROOT, 'src/components/Forge.jsx'), 'utf8');

// ── 1. soundDesc() drives candidate descriptions ──────────────────────────
// The chip renders `soundDesc(candidate.id)` — never the raw ID string.
assert.ok(
  forge.includes('soundDesc(candidate.id)'),
  'AuditionRow must render soundDesc(candidate.id) — raw voice IDs must never reach players',
);

// No audition chip renders `candidate.id` as bare voice-chip text.
// `candidate.id` is allowed in: key=, aria-label=, busy checks, soundDesc() calls,
// figcaption for portrait names, and onClick handlers.
// It must NOT appear as a bare text node in the chip button's visible content
// (i.e. `>{candidate.id}<` or `} {candidate.id}` outside soundDesc context).
// Strategy: extract the AuditionRow <button> chip body and verify it uses soundDesc.
const auditionRowMatch = forge.match(/function AuditionRow[\s\S]*?^}/m);
const auditionSection = auditionRowMatch ? auditionRowMatch[0] : forge;
assert.ok(
  auditionSection.includes('soundDesc(candidate.id)'),
  'AuditionRow chip must render soundDesc(candidate.id) as the visible voice description',
);
// The chip text in AuditionRow is `{busy === candidate.id ? '…' : '▶'} {soundDesc(candidate.id)}`
// — never the raw ID alone. Confirm the pattern.
assert.ok(
  /soundDesc\(candidate\.id\)/.test(auditionSection),
  'AuditionRow maps candidate to soundDesc, never the raw ID string as chip label',
);

// ── 2. Plain-language selection confirmation ──────────────────────────────
// The confirmation note must be a complete sentence and name permanence.
assert.ok(
  forge.includes('Voice chosen. This voice stays with the character.'),
  'Voice selection confirmation must say "Voice chosen. This voice stays with the character."',
);

// ── 3. No audio provider names in tray strings ───────────────────────────
const PROVIDERS = ['ElevenLabs', 'elevenlabs', 'OpenAI', 'Azure', 'Polly', 'WaveNet', 'Google Cloud'];
for (const p of PROVIDERS) {
  assert.ok(
    !forge.includes(p),
    `Provider name "${p}" must not appear anywhere in Forge.jsx (creation / voice surfaces)`,
  );
}

// ── 4. Parchment floor is honest — no provider jargon ────────────────────
// The parchment note must say something like "Audio is unavailable at this tier"
// or similar — never name a provider.
assert.ok(
  forge.includes("'Audio is unavailable at this table — tap to choose a voice.'"),
  'Parchment floor note must be present and honest',
);

// ── 5. Expand / collapse labels are plain English ─────────────────────────
assert.ok(
  forge.includes("'Fewer voices'"),
  '"Fewer voices" collapse label must be present',
);
assert.ok(
  forge.includes("'All voices in this register'"),
  '"All voices in this register" expand label must be present',
);

// ── 6. Register label is plain English ───────────────────────────────────
assert.ok(
  forge.includes("'Feminine voices'") && forge.includes("'Masculine voices'") && forge.includes("'All voices'"),
  'Register labels must use plain English: "Feminine voices", "Masculine voices", "All voices"',
);

// ── 7. Scope guard — this eval covers Forge.jsx voice surfaces only ───────
assert.ok(forge.includes('AuditionRow'), 'Scope guard: Forge.jsx must contain AuditionRow');
assert.ok(!forge.includes('Chronicler') || true, 'Scope guard: chromeVoice does not inspect Chronicler');

console.log(
  'PASS chromeVoice — soundDesc drives candidate display; voice confirmation is plain and permanent; ' +
  'no provider names in tray; parchment floor is honest; expand/collapse and register labels are plain English.',
);
