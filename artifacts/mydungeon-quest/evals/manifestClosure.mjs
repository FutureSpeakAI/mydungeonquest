// evals/manifestClosure.mjs — THE MANIFEST CLOSURE, one seat.
//
// The entry's synchronous closure walk over dist/.vite/manifest.json:
// the entry chunks plus every chunk statically imported from them,
// transitively, and the raw byte weight of that set on disk. The lean
// door and the web-of-souls seating court both read THIS fold and no
// other — a law mirrored across files WILL drift, so the walk lives
// here once (the one-seat lesson), and the two pins that judge its
// number cross-point each other in their own headers.
import { statSync } from 'node:fs';
import path from 'node:path';

export function entryClosureOf(manifest) {
  const entryKeys = Object.keys(manifest).filter((k) => manifest[k].isEntry);
  const closure = new Set();
  const stack = [...entryKeys];
  while (stack.length) {
    const key = stack.pop();
    if (closure.has(key)) continue;
    closure.add(key);
    for (const imported of manifest[key].imports ?? []) stack.push(imported);
  }
  return { entryKeys, closure };
}

export function closureBytesOf(manifest, closure, dist) {
  let bytes = 0;
  for (const key of closure) bytes += statSync(path.join(dist, manifest[key].file)).size;
  return bytes;
}
