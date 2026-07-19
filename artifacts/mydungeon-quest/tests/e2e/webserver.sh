#!/usr/bin/env bash
# THE PROVING LOOP webserver (Task 52).
# The suite's app server runs KEYLESS for the DM (mock narrator — deterministic),
# doorless for auth (no Clerk → hallway mode, unmetered), and silent for speech
# (no ElevenLabs), while KEEPING the paint keys (GEMINI/OPENAI) so plates are
# painted live for the machine-vision criteria. The vision judge's ANTHROPIC
# key lives in the TEST process only — never in the app server.
set -euo pipefail
cd "$(dirname "$0")/../.."

# Generous rate limits: the harvest session paints a dozen plates in one
# sitting; the suite must not trip the abuse valves meant for strangers.
export RATE_LIMIT_MEDIA_MAX=500
export RATE_LIMIT_DM_MAX=500
export PORT=5199
export INTERNAL_API_PORT=5198

# The DM must be the deterministic mock narrator (the letter's fixtures and
# cadence laws depend on it); with ANTHROPIC absent the provider picker would
# otherwise fall through to OPENAI/GEMINI — a live, non-deterministic DM.
# Paint stays live on its own keys. This is provider SELECTION, not a downgrade.
export DM_PROVIDER=mock

exec env -u ANTHROPIC_API_KEY -u ELEVENLABS_API_KEY \
  -u CLERK_SECRET_KEY -u CLERK_PUBLISHABLE_KEY -u VITE_CLERK_PUBLISHABLE_KEY \
  -u PAINT_PROVIDER -u SPEAK_PROVIDER -u MUSIC_PROVIDER -u SFX_PROVIDER \
  -u VAULT_STAGE_PATRON \
  node scripts/dev.mjs
