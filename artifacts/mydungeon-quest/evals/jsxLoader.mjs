// A minimal ESM load hook that transpiles the app's .jsx modules on the fly so
// the headless eval harness (plain `node`) can import React components without a
// bundler. JSX uses the automatic runtime, matching @vitejs/plugin-react in dev
// (the components never `import React`), so classic-runtime "React is not
// defined" crashes cannot sneak in here.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

export async function load(url, context, nextLoad) {
  if (url.endsWith('.jsx')) {
    const source = await readFile(fileURLToPath(url), 'utf8');
    const { code } = await transform(source, { loader: 'jsx', jsx: 'automatic', format: 'esm', sourcefile: url });
    return { format: 'module', source: code, shortCircuit: true };
  }
  return nextLoad(url, context);
}
