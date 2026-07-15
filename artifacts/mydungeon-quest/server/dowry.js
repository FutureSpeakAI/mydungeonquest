// ---- THE STORE DOWRY (Android trust papers, answered honest) ----
//
// When the house is wrapped for Android as a trusted web activity, Google
// checks /.well-known/assetlinks.json for the signing certificate's
// fingerprints. Until the owner chalks real fingerprints into the
// environment, the honest answer is an empty list — never a guessed or
// placeholder statement.
//
//   ANDROID_CERT_SHA256   comma-separated SHA-256 signing fingerprints
//   ANDROID_PACKAGE_NAME  overrides the app's package name if it ever differs

export const DEFAULT_ANDROID_PACKAGE = 'quest.mydungeon.app';

export function assetlinksFor(env = process.env) {
  const raw = String(env.ANDROID_CERT_SHA256 || '').trim();
  if (!raw) return [];
  const prints = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (prints.length === 0) return [];
  const packageName = String(env.ANDROID_PACKAGE_NAME || '').trim() || DEFAULT_ANDROID_PACKAGE;
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: packageName,
        sha256_cert_fingerprints: prints,
      },
    },
  ];
}
