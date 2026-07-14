// A minimal ESM load hook that transpiles the app's .jsx modules on the fly so
// the headless eval harness (plain `node`) can import React components without a
// bundler. JSX uses the automatic runtime, matching @vitejs/plugin-react in dev
// (the components never `import React`), so classic-runtime "React is not
// defined" crashes cannot sneak in here.
//
// Vite also injects `import.meta.env` at build time; the harness mirrors the
// dev-server values (BASE_URL '/', DEV true) so components that read them —
// the title screen's bundled key-art paths, the service-worker gate — behave
// exactly as they do in the preview, minus the bundler.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const viteEnv = {
  'import.meta.env.BASE_URL': "'/'",
  'import.meta.env.PROD': 'false',
  'import.meta.env.DEV': 'true',
  // The harness is a keyless build by law: no publishable key, no door.
  'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': "''",
  'import.meta.env.VITE_CLERK_PROXY_URL': "''",
};

export async function load(url, context, nextLoad) {
  if (url.endsWith('.jsx')) {
    const source = await readFile(fileURLToPath(url), 'utf8');
    const { code } = await transform(source, { loader: 'jsx', jsx: 'automatic', format: 'esm', sourcefile: url, define: viteEnv });
    return { format: 'module', source: code, shortCircuit: true };
  }
  return nextLoad(url, context);
}
