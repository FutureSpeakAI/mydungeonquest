// THE ICONS PRESS — renders the Icosahedron Rose into every raster the house
// needs: web manifest icons (plain + maskable) and the Android shell's set.
// Deterministic house work through the same Playwright Chromium the book
// binder uses — no new tools, no live keys, run whenever the mark changes:
//   npm run render-icons
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const INK = '#0d0b14';

// Same resolution ladder as the binder's press (server/index.js).
function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (existsSync('/usr/bin/chromium')) return '/usr/bin/chromium';
  for (const dir of String(process.env.PATH || '').split(':')) {
    if (dir && existsSync(join(dir, 'chromium'))) return join(dir, 'chromium');
    if (dir && existsSync(join(dir, 'chromium-browser'))) return join(dir, 'chromium-browser');
  }
  return null;
}

const raw = await readFile(join(root, 'public/icon.svg'), 'utf8');
const svg = raw.replace('<svg ', '<svg style="display:block;width:100%;height:100%" ');

const { chromium } = await import('playwright');
const executablePath = chromiumExecutable();
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const page = await browser.newPage();

// scale — how much of the square the mark occupies (maskable safe zone is
// the inner 80%; Android adaptive foregrounds are read at the inner ~66%).
async function render({ out, size, scale = 1, background = null }) {
  const inner = Math.round(size * scale);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;background:${background || 'transparent'};display:grid;place-items:center;overflow:hidden">` +
    `<div style="width:${inner}px;height:${inner}px">${svg}</div></body></html>`,
    { waitUntil: 'load' }
  );
  const bytes = await page.screenshot({ clip: { x: 0, y: 0, width: size, height: size }, omitBackground: !background });
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, bytes);
  console.log(`✦ ${out.replace(`${root}/`, '')} — ${size}px${background ? ' on ink' : ' transparent'}`);
}

// The web manifest's set.
const webIcons = join(root, 'public/icons');
await render({ out: join(webIcons, 'icon-192.png'), size: 192 });
await render({ out: join(webIcons, 'icon-512.png'), size: 512 });
await render({ out: join(webIcons, 'icon-maskable-192.png'), size: 192, scale: 0.78, background: INK });
await render({ out: join(webIcons, 'icon-maskable-512.png'), size: 512, scale: 0.78, background: INK });

// The Android shell's set (only when the shell stands).
const shellAssets = join(root, '..', 'mobile', 'assets', 'images');
if (existsSync(join(root, '..', 'mobile'))) {
  await render({ out: join(shellAssets, 'icon.png'), size: 1024, scale: 0.92, background: INK });
  await render({ out: join(shellAssets, 'adaptive-icon.png'), size: 1024, scale: 0.6 });
  await render({ out: join(shellAssets, 'splash-icon.png'), size: 512, scale: 0.9 });
  await render({ out: join(shellAssets, 'favicon.png'), size: 48, scale: 0.92, background: INK });
} else {
  console.log('… shell assets skipped (no mobile artifact beside this one)');
}

await browser.close();
console.log('The press is clean.');
