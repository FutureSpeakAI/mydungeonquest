import sharp from 'sharp';
// @ts-ignore — the engine ships untyped ESM.
import { boxBrief, validateBox, clampBox } from 'fatescript/magnifier';
import { judge } from './vision';

// ============================================================
// THE CONTROL LAW (Task 61 resumed, LOOP_LOG) — a constructed control
// must verify its own lie before it may seat. 61.7 proved the old way
// fragile: a fixed-ratio behead of the CURRENT hero art kept the whole
// face when a fresh composition seated the head lower, the caption lie
// went half-true, and an honest judge passed it — a false red charged
// to the instrument, not the work.
//
// The cure, ledgered at the halt and landed here: derive the crop from
// the DETECTED face box (the magnifier's stage-one instrument, the same
// engine door the repaint warden walks), so the crop provably removes
// what the prose claims — on ANY composition. Every construct returns
// an attestation carrying its geometric proof; the callers persist them
// in the calibration table and speak them in the run log. A control
// that cannot prove its lie is re-forged on the spot from the paint-
// and-probe budget (never from a seat) where a lawful re-forge exists,
// and where none exists the tooth is invalid until it can lie — spoken,
// never silent.
// ============================================================

export interface ControlAttestation {
  control: string;
  mode: 'behead' | 'crown' | 'crown-reforged-behead' | 'crown-claim-probed';
  probes: number;
  box: { left: number; top: number; width: number; height: number };
  line: number; // behead: crop top px; crown: band bottom px
  proof: string;
  at: string;
}

// The shared claim for the behead pair — ONE seat (mirrors-one-seat law):
// the beheaded control and its attested dual carry this SAME sentence,
// aimed at the face the box-derived crop provably removes — never at a
// mark whose anatomy floats with the painter's whim (the 61.7 lesson).
export const WHOLE_FACE_CLAIM = 'Her whole face is in view — eyes and brow plainly visible.';

const MARGIN = (h: number) => Math.max(8, Math.round(h * 0.02));
const MIN_STRIP = 16;

/** Stage one on the CURRENT art: box the head and shoulders, engine
 * wording, engine validation, engine padding. Two sittings at most —
 * the second under a fresh salt — then the spoken invalid. Judge calls
 * ride the vision cache (bytes+id+protocol), so a settled box replays
 * byte-stable across teeth and runs until the art itself changes. */
async function stageOneRect(args: { bytes: Buffer; idSeed: string; criterion: string; label: string }) {
  const { bytes, idSeed, criterion, label } = args;
  const meta = await sharp(bytes).metadata();
  const width = meta.width || 1;
  const height = meta.height || 1;
  for (let probe = 1; probe <= 2; probe += 1) {
    const verdict = await judge({
      id: probe === 1 ? `${idSeed}-clbox` : `${idSeed}-clbox-r2`,
      protocol: 'p2',
      criterion,
      images: [bytes],
      question: boxBrief(),
      schema: { found: 'boolean', x: 'number 0..1', y: 'number 0..1', w: 'number 0..1', h: 'number 0..1' },
    });
    const box = validateBox(verdict);
    if (box) {
      // padding: 0 — the engine's DEFAULT padding serves stage-two
      // magnification of small mark boxes; on a bust whose head-and-
      // shoulders box already spans most of the plate it devours the
      // whole frame (61.8: 0.08−pad→0, 0.93+pad→1, exactly full-frame,
      // four spoken invalids). The control law wants the STATED box —
      // it carries its own margin at the crop/band lines.
      const rect = clampBox({ box, width, height, padding: 0 });
      return { rect, width, height, probes: probe };
    }
    console.log(`[control-law] ${label}: stage one boxed nothing (probe ${probe} of 2)${probe === 1 ? ' — re-probing under a fresh salt' : ''}`);
  }
  throw new Error(
    `[control-law] ${label}: stage one boxed no head-and-shoulders on the current art after 2 probes — ` +
    `the control cannot prove its lie, and a tooth whose control cannot be made to lie is invalid until it can (THE CONTROL LAW).`
  );
}

/** The behead: crop strictly BELOW the padded face box, so the whole
 * face — eyes, brow, gaze — is provably removed on any composition.
 * The lie to aim at it: claims about the face, never about marks whose
 * anatomy floats with the painter's whim (the 61.7 lesson). */
export async function selfVerifyingBehead(args: { bytes: Buffer; idSeed: string; criterion: string; label: string }): Promise<{ bytes: Buffer; attest: ControlAttestation }> {
  const { rect, width, height, probes } = await stageOneRect(args);
  const cropTop = rect.top + rect.height + MARGIN(height);
  if (cropTop > height - MIN_STRIP) {
    throw new Error(
      `[control-law] ${args.label}: the padded face box reaches ${rect.top + rect.height}px of ${height}px — ` +
      `no lawful strip survives below it, the behead cannot prove its lie on this art (THE CONTROL LAW).`
    );
  }
  const bytes = await sharp(args.bytes)
    .extract({ left: 0, top: cropTop, width, height: height - cropTop })
    .png().toBuffer();
  const proof = `face box [${rect.top}..${rect.top + rect.height}]px of ${height}px lies wholly above the crop line ${cropTop}px — the crop provably removes the whole face`;
  const attest: ControlAttestation = { control: args.label, mode: 'behead', probes, box: rect, line: cropTop, proof, at: new Date().toISOString() };
  console.log(`[control-law] ${args.label}: ${proof} (probes=${probes}) — lie PROVEN, the control seats`);
  return { bytes, attest };
}

/** The crown band: keep only what lies strictly ABOVE the padded face
 * box top — background and crown, zero subject anatomy — so a claim of
 * anything worn ON the subject (a mark, a face) is provably a lie.
 * Where the head rides the very crown of the plate no such band exists:
 * strict callers (whose lie NEEDS the subject absent) get the spoken
 * invalid; lenient callers are re-forged on the spot into a behead —
 * attested, and the caller re-aims its prose to the face. */
export async function selfVerifyingCrownBand(args: { bytes: Buffer; idSeed: string; criterion: string; label: string; strict?: boolean }): Promise<{ bytes: Buffer; mode: 'crown' | 'crown-reforged-behead' | 'crown-claim-probed'; attest: ControlAttestation }> {
  const { rect, width, height, probes } = await stageOneRect(args);
  const bandBottom = rect.top - MARGIN(height);
  if (bandBottom >= MIN_STRIP) {
    const bytes = await sharp(args.bytes)
      .extract({ left: 0, top: 0, width, height: bandBottom })
      .png().toBuffer();
    const proof = `the band [0..${bandBottom}]px stops above the padded face box top ${rect.top}px of ${height}px — the band provably holds no subject anatomy`;
    const attest: ControlAttestation = { control: args.label, mode: 'crown', probes, box: rect, line: bandBottom, proof, at: new Date().toISOString() };
    console.log(`[control-law] ${args.label}: ${proof} (probes=${probes}) — lie PROVEN, the control seats`);
    return { bytes, mode: 'crown', attest };
  }
  if (args.strict) {
    // THE CLAIM-PROBED CROWN (61.10 rehearsals, LOOP_LOG): where the
    // face-box arithmetic refuses — a generous stage-one box riding the
    // frame top (a bow tip, stray hair: the detector's prerogative) —
    // the band may still prove its lie by DIRECT EVIDENCE: crop a
    // candidate sliver from the very top and claim-probe it, two
    // sittings, BOTH must attest no part of the subject, fail-closed on
    // malformed answers (the witness law). The settled stage-one box is
    // never touched; a band no probe can clean leaves the spoken
    // invalid standing — the construct's own failure, cured from the
    // paint-and-probe budget, never charged to the court.
    for (const cand of [Math.round(height * 0.12), Math.round(height * 0.08)]) {
      if (cand < MIN_STRIP) continue;
      const sliver = await sharp(args.bytes)
        .extract({ left: 0, top: 0, width, height: cand })
        .png().toBuffer();
      const confs: number[] = [];
      let clean = true;
      for (let probe = 1; probe <= 2 && clean; probe += 1) {
        const verdict = await judge({
          id: `${args.idSeed}-clcrown-${cand}${probe === 2 ? '-r2' : ''}`,
          protocol: 'p2',
          criterion: args.criterion,
          images: [sliver],
          question: 'This image is a horizontal sliver cropped from the very top of a larger painting. Looking only at what is plainly visible, is any part of a person or humanoid figure visible — body, face, head, hair, skin, hands, clothing, or carried equipment such as a bow, arrows, a quiver, or a strap? Sky, trees, branches, buildings, and empty background are not a person. Answer ONLY with JSON of the form {"found": true, "confidence": 0.0}.',
          schema: { found: 'boolean', confidence: 'number 0..1' },
        });
        if (!verdict || verdict.found !== false) { clean = false; break; }
        confs.push(typeof verdict.confidence === 'number' ? verdict.confidence : -1);
      }
      if (!clean) {
        console.log(`[control-law] ${args.label}: candidate band [0..${cand}]px not proven subject-free — the probe saw the subject or spoke malformed; the next candidate speaks`);
        continue;
      }
      const proof = `the band [0..${cand}]px was claim-probed twice (conf ${confs.join(', ')}) and holds no part of the subject — provably subject-free by direct evidence where the face-box arithmetic refused (box top ${rect.top}px of ${height}px)`;
      const attest: ControlAttestation = { control: args.label, mode: 'crown-claim-probed', probes: probes + 2, box: rect, line: cand, proof, at: new Date().toISOString() };
      console.log(`[control-law] ${args.label}: ${proof} — lie PROVEN, the control seats`);
      return { bytes: sliver, mode: 'crown-claim-probed', attest };
    }
    throw new Error(
      `[control-law] ${args.label}: the padded face box begins at ${rect.top}px of ${height}px — ` +
      `no crown band clears it, no claim-probed candidate proved subject-free, and this tooth's lie needs the subject provably absent; ` +
      `the control cannot prove its lie on this art (THE CONTROL LAW).`
    );
  }
  console.log(`[control-law] ${args.label}: no crown band clears the face box (top ${rect.top}px) — RE-FORGED into a behead from the probe budget`);
  const reforged = await selfVerifyingBehead(args);
  return {
    bytes: reforged.bytes,
    mode: 'crown-reforged-behead',
    attest: { ...reforged.attest, mode: 'crown-reforged-behead', proof: `${reforged.attest.proof} (re-forged: no crown band cleared the face box)` },
  };
}

// ============================================================
// THE CLAIM PROBE (61.8 ruling) — a calibration tooth whose known-good
// ground is a FRESH-PAINTED plate has CONSTRUCTED that ground: the
// paint may wander off its sealed canon, and 61.8 proved it (tooth 16's
// good sit refused fresh bytes). Under the ruling the whole pairing is
// control-class and gains self-verification: the claim proves itself on
// the CURRENT bytes before any counted sit. Distinct wording, the
// Control Law's own probe protocol, two sittings at most, then the
// spoken invalid — a refusal here is the construct's own failure,
// cured from the paint-and-probe budget, never charged to the court.
// ============================================================

export interface PresenceAttestation {
  control: string;
  probes: number;
  found: true;
  confidence: number;
  proof: string;
  at: string;
}

export async function selfVerifyingPresence(args: { bytes: Buffer; canon: string; idSeed: string; criterion: string; label: string }): Promise<PresenceAttestation> {
  const { bytes, canon, idSeed, criterion, label } = args;
  let last: any = null;
  for (let probe = 1; probe <= 2; probe += 1) {
    const verdict = await judge({
      id: probe === 1 ? `${idSeed}-clpresence` : `${idSeed}-clpresence-r2`,
      protocol: 'p2',
      criterion,
      images: [bytes],
      question: `A creature is described by this sealed canon: ${canon}. Looking only at what is plainly visible in this image, does at least one creature answer that canon in kind and form? Independent stagings lawfully vary pose, count, camera angle, lighting, and background; such variance is never absence. Answer ONLY with JSON of the form {"found": true, "confidence": 0.0}.`,
      schema: { found: 'boolean', confidence: 'number 0..1' },
    });
    last = verdict;
    if (verdict && verdict.found === true) {
      const attest: PresenceAttestation = {
        control: label,
        probes: probe,
        found: true,
        confidence: typeof verdict.confidence === 'number' ? verdict.confidence : -1,
        proof: `the sealed canon stands on the current bytes (probe ${probe}, conf ${typeof verdict.confidence === 'number' ? verdict.confidence : '?'})`,
        at: new Date().toISOString(),
      };
      console.log(`[control-law] ${label}: ${attest.proof} — claim PROVEN, the ground seats`);
      return attest;
    }
  }
  throw new Error(`[control-law] ${label}: two sittings could not prove the sealed canon on the current bytes (last: ${JSON.stringify(last)}) — the construct refuses to seat; re-forge the paint from the probe budget (the control's own failure, never the court's)`);
}
