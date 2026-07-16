// ------------------------------------------------------------
// THE SALON'S LOCKBOX — dependency-free Fernet, for the Tell Me A
// Story corpus (google-deepmind/tell_me_a_story, Apache-2.0 keys,
// CC-BY 4.0 data). The publishers encrypted the stories so scrapers
// would not eat them and published the keys so readers could. This
// module is the reader: RSA-OAEP-SHA256 unwraps the symmetric key,
// and Fernet (AES-128-CBC + HMAC-SHA256, spec-standard) opens the
// files. Pure node:crypto — the house takes no dependency to read a
// gift. Encrypt is exported for one reason only: the gate proves the
// roundtrip on fixtures without touching the corpus.
// ------------------------------------------------------------
import crypto from 'node:crypto';
import fs from 'node:fs';

// The published private key opens the published symmetric key.
export function unwrapKey(pemPath, skeyPath) {
  const pem = fs.readFileSync(pemPath);
  const wrapped = fs.readFileSync(skeyPath);
  const unwrapped = crypto.privateDecrypt(
    { key: pem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    wrapped
  ).toString('utf8').trim();
  if (!/^[A-Za-z0-9_-]{43}=$/.test(unwrapped)) throw new Error('the unwrapped key is not fernet-shaped — the lockbox refuses');
  return unwrapped;
}

const splitKey = (fernetKey) => {
  const raw = Buffer.from(fernetKey, 'base64url');
  if (raw.length !== 32) throw new Error('a fernet key is thirty-two bytes or it is not a key');
  return { sign: raw.subarray(0, 16), enc: raw.subarray(16, 32) };
};

// Decrypt one Fernet token. Version byte checked, HMAC verified in
// constant time, then AES-128-CBC with PKCS7 unpadding.
export function fernetDecrypt(token, fernetKey) {
  const { sign, enc } = splitKey(fernetKey);
  const raw = Buffer.from(String(token).trim(), 'base64url');
  if (raw.length < 1 + 8 + 16 + 32 || raw[0] !== 0x80) throw new Error('not a fernet token');
  const body = raw.subarray(0, raw.length - 32);
  const mac = raw.subarray(raw.length - 32);
  const expected = crypto.createHmac('sha256', sign).update(body).digest();
  if (!crypto.timingSafeEqual(expected, mac)) throw new Error('the seal does not match — the token was tampered with or the key is wrong');
  const iv = raw.subarray(9, 25);
  const ciphertext = raw.subarray(25, raw.length - 32);
  const decipher = crypto.createDecipheriv('aes-128-cbc', enc, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// Encrypt — FOR FIXTURES ONLY. The gate proves the roundtrip with
// this; nothing else in the house has any business sealing tokens.
export function fernetEncrypt(payload, fernetKey, { iv = crypto.randomBytes(16), timestamp = Math.floor(Date.now() / 1000) } = {}) {
  const { sign, enc } = splitKey(fernetKey);
  const cipher = crypto.createCipheriv('aes-128-cbc', enc, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(payload)), cipher.final()]);
  const ts = Buffer.alloc(8);
  ts.writeBigUInt64BE(BigInt(timestamp));
  const body = Buffer.concat([Buffer.from([0x80]), ts, iv, ciphertext]);
  const mac = crypto.createHmac('sha256', sign).update(body).digest();
  return Buffer.concat([body, mac]).toString('base64url');
}
