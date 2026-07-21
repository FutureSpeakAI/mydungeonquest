// THE DESK (Task 60 §2) — the seal's pure half, one seat for both repos.
// The pen (makeEnvelope) and the eye (verifyJournal, verifySignatures,
// verifyChronicle) live here; the table's seal door re-speaks them and
// keeps only its database half (key custody, transactions, import).
// The law of the desk: a chronicle is believed only when every record
// re-hashes byte for byte, every link holds, the head seal matches the
// journal's last word, and — when the tale claims a signature — every
// record's seal verifies against the public key that rode the header.
// A forger who re-hashes a tampered record only moves the break down
// the chain; one who re-hashes the tail meets the head seal; one who
// re-writes the head seal meets the signature he cannot mint. Refusals
// speak the door's own words, so the desk and the door are one voice.
// No database, no browser, no provider: node's own webcrypto suffices,
// and a keyless machine can sit this desk.
import { canonicalize, sha256, bytesToBase64, base64ToBytes } from './canonical.js';
import { validateSagaManifest } from './saga.js';

export async function makeEnvelope({ type, i, prevHash = null, payload, ts = Date.now(), signer = null }) {
  const unsigned = { type, i, prevHash, payload, ts };
  const recordHash = await sha256(canonicalize(unsigned));
  let signature = null;
  if (signer?.signed && signer.privateKey) {
    const sig = await crypto.subtle.sign({ name: 'Ed25519' }, signer.privateKey, new TextEncoder().encode(recordHash));
    signature = bytesToBase64(new Uint8Array(sig));
  }
  return { ...unsigned, recordHash, signature };
}

export async function verifyJournal(journal) {
  const results = [];
  let previous = null;
  for (const record of Array.isArray(journal) ? journal : []) {
    const hash = await sha256(canonicalize({ type: record.type, i: record.i, prevHash: record.prevHash, payload: record.payload, ts: record.ts }));
    const ok = hash === record.recordHash && record.prevHash === previous;
    results.push({ i: record.i, ok, expected: hash, actual: record.recordHash });
    previous = record.recordHash;
  }
  return results;
}

export async function verifySignatures(journal, publicKeyJwk) {
  if (!publicKeyJwk || typeof publicKeyJwk !== 'object') {
    return { ok: false, i: null, reason: 'no public key rode the header — a signed chronicle cannot be believed without one' };
  }
  let key;
  try {
    key = await crypto.subtle.importKey('jwk', publicKeyJwk, { name: 'Ed25519' }, false, ['verify']);
  } catch {
    return { ok: false, i: null, reason: 'the header\u2019s public key cannot be read' };
  }
  for (const record of Array.isArray(journal) ? journal : []) {
    const seat = Number.isFinite(record?.i) ? record.i : null;
    if (typeof record?.signature !== 'string' || !record.signature) {
      return { ok: false, i: seat, reason: `record ${seat ?? '?'} carries no signature on a signed chronicle` };
    }
    let holds = false;
    try {
      holds = await crypto.subtle.verify({ name: 'Ed25519' }, key, base64ToBytes(record.signature), new TextEncoder().encode(record.recordHash));
    } catch {
      holds = false;
    }
    if (!holds) {
      return { ok: false, i: seat, reason: `the signature does not hold at record ${seat ?? '?'} — this chronicle has been altered` };
    }
  }
  return { ok: true, i: null, reason: null };
}

export async function verifyChronicle(data) {
  if (!data || typeof data !== 'object' || data.header?.format !== 'mydungeon.chronicle' || !Array.isArray(data.journal)) {
    return { ok: false, reason: 'not a chronicle — the desk reads only mydungeon.chronicle envelopes', verdicts: [] };
  }
  const verdicts = await verifyJournal(data.journal);
  const broken = verdicts.find((verdict) => !verdict.ok);
  if (broken) {
    return { ok: false, reason: `the seal is broken at record ${broken.i} — this chronicle has been altered`, verdicts };
  }
  const trueHead = data.journal.length ? data.journal[data.journal.length - 1].recordHash : null;
  if ((data.header.headHash || null) !== trueHead) {
    return { ok: false, reason: 'the head seal does not match the journal — this chronicle has been altered', verdicts };
  }
  // THE DOWNGRADE DOOR (the architect's sitting, Task 60 §4): a forger who
  // tampers, re-hashes the chain, and re-crowns the head still cannot mint
  // signatures — so his last move is to claim the tale was never signed.
  // While the envelope itself carries the evidence — a public key in the
  // header or ink on any record — the claim is refused and the court sits.
  // A tale with no claim and no evidence remains an honest unsigned tale:
  // that door stays open, and what walks through it is seated as unsigned,
  // never as signed.
  const claimsSigned = data.header.signatureStatus === 'signed';
  const evidence = Boolean(data.header.publicKeyJwk) || data.journal.some((record) => typeof record?.signature === 'string' && record.signature.length > 0);
  if (!claimsSigned && evidence) {
    return { ok: false, reason: 'the chronicle carries signature evidence but claims none — a downgraded seal is refused', verdicts };
  }
  if (claimsSigned) {
    const signed = await verifySignatures(data.journal, data.header.publicKeyJwk || null);
    if (!signed.ok) return { ok: false, reason: signed.reason, verdicts };
  }
  return { ok: true, reason: null, verdicts };
}

// THE SAGA AT THE DESK (Task 64, Article II) — the desk walks a whole saga
// the way it walks a chain. The manifest passes its court; every chronicle
// verifies whole; every head matches the seal the manifest binds; and every
// volume past the first cites its elder's head in its genesis — the FIRST
// word of its journal, or the walk refuses by name (which volume, which
// citation). A manifest whose first volume claims the root (index 0) may
// not carry a genesis citation — a saga cannot begin before its manifest
// tells. Elder sagas bound mid-chain (base index > 0) keep that door open.
export async function verifySaga({ manifest, chronicles } = {}) {
  const court = validateSagaManifest(manifest);
  if (!court.ok) return { ok: false, reason: court.errors[0], errors: court.errors, volumes: [] };
  const rows = Array.isArray(chronicles) ? chronicles : [];
  if (rows.length !== manifest.volumes.length) {
    return { ok: false, reason: `the manifest binds ${manifest.volumes.length} volume(s) but ${rows.length} chronicle(s) came to the desk`, errors: [], volumes: [] };
  }
  const volumes = [];
  for (let seat = 0; seat < rows.length; seat += 1) {
    const bound = manifest.volumes[seat];
    const name = `volume ${seat + 1} (${bound.title})`;
    const verdict = await verifyChronicle(rows[seat]);
    if (!verdict.ok) return { ok: false, reason: `${name}: ${verdict.reason}`, errors: [], volumes };
    if ((rows[seat].header?.headHash || null) !== bound.headHash) {
      return { ok: false, reason: `${name} does not match the manifest's head seal — the manifest binds a different telling`, errors: [], volumes };
    }
    const genesis = (rows[seat].journal || []).find((record) => record?.type === 'genesis') || null;
    if (seat === 0) {
      if (genesis && bound.index === 0) {
        return { ok: false, reason: `the manifest's first volume carries a genesis citation — the saga begins earlier than the manifest tells`, errors: [], volumes };
      }
    } else {
      if (!genesis) return { ok: false, reason: `${name} carries no genesis citation — the chain cannot be walked`, errors: [], volumes };
      if (genesis.i !== 0) return { ok: false, reason: `${name}'s genesis citation is not its first word`, errors: [], volumes };
      const cited = genesis.payload?.priorVolume?.headHash || null;
      if (cited !== manifest.volumes[seat - 1].headHash) {
        return { ok: false, reason: `${name} does not cite volume ${seat}'s head seal — the chain breaks between ${manifest.volumes[seat - 1].title} and ${bound.title}`, errors: [], volumes };
      }
    }
    volumes.push({ index: bound.index, title: bound.title, ok: true });
  }
  return { ok: true, reason: null, errors: [], volumes };
}
