// THE SALON GATE — the lockbox opens or this file turns the build red.
// Offline and keyless by construction: the vendored keys are real, the
// roundtrip is proven on fixtures, and the corpus itself is never
// required — only respected.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unwrapKey, fernetDecrypt, fernetEncrypt } from './fernet.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

// The published private key opens the published symmetric key — with no
// network and no dependency.
const key = unwrapKey(path.join(here, 'keys', 'private_key.pem'), path.join(here, 'keys', 'skey.key'));
assert.match(key, /^[A-Za-z0-9_-]{43}=$/, 'the unwrapped key is fernet-shaped');

// The roundtrip holds on a corpus-shaped fixture, deterministically.
const fixture = JSON.stringify({ example_id: 'fixture-1', inputs: 'Write a story about a ford that remembers.', targets: 'The river forgot; the stones did not.' });
const iv = Buffer.alloc(16, 7);
const token = fernetEncrypt(fixture, key, { iv, timestamp: 1700000000 });
assert.equal(token, fernetEncrypt(fixture, key, { iv, timestamp: 1700000000 }), 'the same seal seals the same way');
assert.equal(fernetDecrypt(token, key).toString('utf8'), fixture, 'what was sealed is what is opened');

// A tampered token is refused by the seal, not by luck.
const raw = Buffer.from(token, 'base64url');
raw[raw.length - 40] ^= 0xff;
assert.throws(() => fernetDecrypt(raw.toString('base64url'), key), /seal does not match/);

// The corpus is untracked by law: the authors sealed it against
// scrapers, and this house keeps it out of git, zips, and prompts.
const ignore = fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8');
assert.ok(ignore.includes('tools/salon/corpus/'), 'the corpus never enters the record');

// If the salon has been stocked locally, the shelves hold what the
// paper published — otherwise this court adjourns honestly.
const corpusDir = path.join(here, 'corpus');
if (fs.existsSync(corpusDir)) {
  for (const file of fs.readdirSync(corpusDir).filter((name) => name.endsWith('.jsonl'))) {
    const first = JSON.parse(fs.readFileSync(path.join(corpusDir, file), 'utf8').split('\n')[0]);
    assert.ok('example_id' in first && 'inputs' in first && 'targets' in first, `${file} is shaped as published`);
  }
}

console.log('PASS \u2014 the salon gate: the published keys unwrap with zero dependencies, the fernet seal roundtrips deterministically and refuses tampering, and the corpus stays untracked \u2014 read, respected, never committed.');
