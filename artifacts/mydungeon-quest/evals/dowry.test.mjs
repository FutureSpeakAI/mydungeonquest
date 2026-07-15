// ---- THE STORE DOWRY (Android trust papers & the hardened manifest) ----
//
// Judged headless, keyless, no server spawned. Laws under judgment:
//   1. Trust papers are honest-empty: no chalked fingerprints, no statement.
//      Never a placeholder, never a guess.
//   2. Chalked fingerprints are answered exactly: one or many, comma-drawn,
//      whitespace forgiven, package name defaulted or overridden.
//   3. The manifest is store-worthy: stable id at the root, portrait bearing,
//      standalone display, and a full set of pressed PNG icons — plain and
//      maskable, 192 and 512 — each one a real PNG on the shelf.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { assetlinksFor, DEFAULT_ANDROID_PACKAGE } from '../server/dowry.js';

// ---- 1. honest-empty -------------------------------------------------------
assert.deepEqual(assetlinksFor({}), [], 'no fingerprints, no statement');
assert.deepEqual(assetlinksFor({ ANDROID_CERT_SHA256: '' }), [], 'empty chalk is no chalk');
assert.deepEqual(assetlinksFor({ ANDROID_CERT_SHA256: '  , ,  ' }), [], 'commas alone are no chalk');

// ---- 2. chalked fingerprints answered exactly ------------------------------
{
  const one = assetlinksFor({ ANDROID_CERT_SHA256: 'AA:BB:CC' });
  assert.equal(one.length, 1, 'one statement for the house');
  assert.deepEqual(one[0].relation, ['delegate_permission/common.handle_all_urls'], 'the relation Google reads');
  assert.equal(one[0].target.namespace, 'android_app');
  assert.equal(one[0].target.package_name, DEFAULT_ANDROID_PACKAGE, 'package defaults to the house name');
  assert.deepEqual(one[0].target.sha256_cert_fingerprints, ['AA:BB:CC']);
}
{
  const many = assetlinksFor({ ANDROID_CERT_SHA256: ' AA:BB , CC:DD ,EE:FF ' });
  assert.deepEqual(
    many[0].target.sha256_cert_fingerprints,
    ['AA:BB', 'CC:DD', 'EE:FF'],
    'many prints, whitespace forgiven',
  );
}
{
  const named = assetlinksFor({ ANDROID_CERT_SHA256: 'AA', ANDROID_PACKAGE_NAME: 'quest.mydungeon.other' });
  assert.equal(named[0].target.package_name, 'quest.mydungeon.other', 'package override honored');
}
// The whole answer must be lawful JSON when served.
assert.doesNotThrow(() => JSON.stringify(assetlinksFor({ ANDROID_CERT_SHA256: 'AA' })));

// ---- 3. the manifest is store-worthy ---------------------------------------
const manifestPath = new URL('../public/manifest.webmanifest', import.meta.url);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

assert.equal(manifest.id, '/', 'a stable id at the root');
assert.equal(manifest.scope, '/', 'the scope is the whole house');
assert.equal(manifest.start_url, '/', 'the door is the front door');
assert.equal(manifest.display, 'standalone', 'no browser furniture');
assert.equal(manifest.orientation, 'portrait', 'portrait bearing');
assert.equal(manifest.background_color, '#0d0b14', 'ink behind the first paint');
assert.equal(manifest.theme_color, '#0d0b14', 'ink above the fold');

const icons = manifest.icons || [];
const pngs = icons.filter((i) => i.type === 'image/png');
for (const purpose of ['any', 'maskable']) {
  for (const size of ['192x192', '512x512']) {
    assert.ok(
      pngs.some((i) => i.purpose === purpose && i.sizes === size),
      `a ${purpose} PNG at ${size} is on the manifest`,
    );
  }
}

// Every pressed PNG the manifest promises must truly sit on the shelf.
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
for (const icon of pngs) {
  const file = readFileSync(new URL(`../public${icon.src}`, import.meta.url));
  assert.ok(file.subarray(0, 4).equals(PNG_MAGIC), `${icon.src} is a true PNG`);
  assert.ok(file.length > 1000, `${icon.src} is no empty press`);
}

console.log('dowry: PASS — trust papers honest-empty, chalked prints answered, manifest store-worthy.');
