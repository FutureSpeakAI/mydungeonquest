#!/usr/bin/env node
// ------------------------------------------------------------
// THE SALON — `npm run salon` — fetches and opens the Tell Me A
// Story corpus (Huot et al., Agents' Room, ICLR 2025; CC-BY 4.0)
// into tools/salon/corpus/, which is UNTRACKED BY LAW: the corpus
// was encrypted to stay out of scrapes, so it never enters git, a
// zip, or a prompt wholesale. It exists here for one purpose — a
// shelf of human-written stories the house can calibrate the DM's
// prose against, on your machine, with your eyes. Offline, this
// script refuses honestly and tells you so; it never mocks a corpus.
// ------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unwrapKey, fernetDecrypt } from './fernet.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const corpusDir = path.join(here, 'corpus');
const SPLITS = ['train', 'validation', 'test'];
const SOURCE = 'https://storage.googleapis.com/tell-me-a-story';

const fetchSplit = async (split) => {
  const url = `${SOURCE}/tell-me-a-story-${split}_encrypted.jsonl`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
};

const main = async () => {
  fs.mkdirSync(corpusDir, { recursive: true });
  const key = unwrapKey(path.join(here, 'keys', 'private_key.pem'), path.join(here, 'keys', 'skey.key'));
  let shelved = 0;
  for (const split of SPLITS) {
    const out = path.join(corpusDir, `${split}.jsonl`);
    if (fs.existsSync(out)) {
      const rows = fs.readFileSync(out, 'utf8').trim().split('\n').length;
      console.log(`the ${split} shelf already holds ${rows} stories — leaving it be`);
      shelved += 1;
      continue;
    }
    try {
      const sealed = await fetchSplit(split);
      const open = fernetDecrypt(sealed.toString('utf8'), key);
      fs.writeFileSync(out, open);
      const rows = open.toString('utf8').trim().split('\n');
      const first = JSON.parse(rows[0]);
      if (!('example_id' in first && 'inputs' in first && 'targets' in first)) throw new Error('the corpus is not shaped as published');
      console.log(`opened the ${split} shelf — ${rows.length} prompt-and-story pairs`);
      shelved += 1;
    } catch (error) {
      console.log(`could not reach the ${split} shelf (${error.message}) — the salon runs dry offline; run again with a network, nothing is mocked`);
    }
  }
  console.log(shelved === SPLITS.length ? 'the salon is stocked. the corpus stays untracked — read it, never commit it.' : `shelves stocked: ${shelved}/${SPLITS.length}.`);
};

main().catch((error) => { console.error(`the salon refuses: ${error.message}`); process.exit(1); });
