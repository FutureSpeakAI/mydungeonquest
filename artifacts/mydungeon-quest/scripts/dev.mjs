import { spawn } from 'node:child_process';

// The artifact's assigned PORT is claimed by the Vite dev server (it is the
// only port routed through Replit's proxy). The Express API server runs on
// a fixed internal-only port that Vite's dev proxy forwards `/api` to.
const internalApiPort = process.env.INTERNAL_API_PORT || '3001';

const children = [
  spawn(process.execPath, ['server/index.js'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development', PORT: internalApiPort },
  }),
  spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite'], {
    stdio: 'inherit',
    env: { ...process.env, INTERNAL_API_PORT: internalApiPort },
  }),
];

const shutdown = () => {
  for (const child of children) child.kill('SIGTERM');
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
for (const child of children) child.on('exit', (code) => {
  if (code && code !== 0) process.exitCode = code;
});
