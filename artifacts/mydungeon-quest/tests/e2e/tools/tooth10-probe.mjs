// ============================================================
// TOOTH 10's PROBE (0.9.0) — the Editor's rubric calibration, run
// in the server's own module world (the spec shells out here so the
// courts' ESM never meets the spec loader). Deterministic, keyless,
// no dice: two planted-awful pages must each draw ≥2 flags and a
// revise verdict carrying one pinned reason PER flag; a clean page
// must draw no flag and ship. Perfect separation or the tooth is
// red. Prints ONE JSON object on stdout.
// ============================================================
import { createHash } from 'node:crypto';
import { EDITOR_RUBRIC, editorPrePass, mockEditor } from '../../../server/room.js';

const sit = (turn, court) => {
  const flags = editorPrePass(turn, court);
  const verdict = mockEditor(flags);
  return { flags, verdict: verdict.verdict, reasons: verdict.reasons };
};

// BITE ONE — echo + cliche. The prior page and the draft share an
// eleven-word run verbatim (the echo court needs eight), and three
// lexicon phrases crowd well past two hits per thousand characters.
const priorPage = 'The lantern light fell across the wet stones of the old bridge and held there, steady as a kept promise, while the river worked below.';
const awfulEcho = {
  narration_blocks: [{ text: 'You come back the way you came, and the lantern light fell across the wet stones of the old bridge as if nothing had moved. A chill ran down your spine at the stillness. The air was thick with old smoke, and your heart pounding in your ears drowned the river out.', speaker: null }],
  suggestions: ['Cross the bridge before the light dies', 'Ask the ferryman about the smoke', 'Turn back for the vale road']
};
const biteOne = sit(awfulEcho, { priorPages: [priorPage], priorSuggestions: [] });

// BITE TWO — sameness + measure. Two roads carry the same folded token
// set (order is no disguise to a set), and a three-block page lands
// outside the lean band [1,2].
const awfulSame = {
  narration_blocks: [
    { text: 'The gate stands where the map said it would, iron-braced and patient.', speaker: null },
    { text: 'Frost rims the hinges though the season argues otherwise.', speaker: null },
    { text: 'Somewhere behind the wall, a bell counts something that is not hours.', speaker: null }
  ],
  suggestions: ['Take the north road to the bridge', 'To the bridge take the north road', 'Wait for the bell to finish']
};
const biteTwo = sit(awfulSame, { intent: { measure: 'lean' }, priorPages: [], priorSuggestions: [] });

// THE CLEAN CONTROL — fresh prose, distinct roads, a page inside its
// lean band. The rubric must let it ship untouched.
const cleanPage = {
  narration_blocks: [
    { text: 'The waystation keeps its one lamp trimmed, and the ledger inside is open to a page someone left mid-sentence.', speaker: null },
    { text: 'Outside, the orchard rows walk downhill into mist.', speaker: null }
  ],
  suggestions: ['Read the interrupted ledger line', 'Follow the orchard rows down', 'Bar the door and wait for morning']
};
const clean = sit(cleanPage, { intent: { measure: 'lean' }, priorPages: [priorPage], priorSuggestions: ['Cross the bridge before the light dies'] });

process.stdout.write(JSON.stringify({
  rubricSha256: createHash('sha256').update(EDITOR_RUBRIC, 'utf8').digest('hex'),
  bites: [
    { name: 'echo+cliche', ...biteOne },
    { name: 'sameness+measure', ...biteTwo }
  ],
  clean
}, null, 2));
