// ---------------------------------------------------------------------------
// OPENING FLOW (B2 — The first sixty seconds)
// Named progress labels shown inside the streaming indicator during genesis.
// Exported so evals can verify the label set without touching the rite law.
// Pure; no browser surface; keyless-safe.
// ---------------------------------------------------------------------------

// THE FOUR NAMED STEPS — shown in order as the pipeline advances.
// Each label is plain speech: what the world is doing, not a percentage.
export const GENESIS_LABELS = [
  'Building your world.',
  'Painting the opening scene.',
  'Casting voices.',
  'Preparing your first chapter.',
];

// Step-key → label map. App drives the key; the map returns the word.
export const GENESIS_STEP_LABELS = {
  world:   GENESIS_LABELS[0],
  scene:   GENESIS_LABELS[1],
  voices:  GENESIS_LABELS[2],
  chapter: GENESIS_LABELS[3],
};

// PAINT BUDGET — how long the scene-paint gets before the player sees
// the plain-language "slow art" notice. Generous enough for real AI
// paint queues, short enough that no one stares at a shimmer for half
// a minute without knowing why.
export const PAINT_BUDGET_MS = 28_000;

// The exact message shown when paint exceeds its budget.
export const OVER_BUDGET_MESSAGE =
  'The artwork is taking longer than usual. Your story will start without it and the illustration will appear when it is ready.';
