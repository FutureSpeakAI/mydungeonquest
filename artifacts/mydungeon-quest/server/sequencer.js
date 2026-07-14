import { spawn } from 'node:child_process';

// ------------------------------------------------------------
// THE SEQUENCER (the Experience Cut, Phase 5) — the lawful half
// of the Podcast Forge that lives at the ffmpeg boundary. It
// turns a mix PLAN (voice / gap / sting items, already proven
// sequential by assertLawfulPlan) into a filter graph that is
// incapable of overlap: every item becomes one link in a single
// concat chain — silence is generated, voices are loudness-
// normalized to podcast level (-16 LUFS), stings a shade lower
// (-19) — and NOTHING here knows how to mix two sounds at once.
// The words amix and amerge do not appear in this file except in
// this sentence, as a warning to whoever reaches for them.
// ------------------------------------------------------------

const NORM = 'aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo';

// THE REF LAW — a ref names a file in the binder's temp room, so it passes
// one strict gate: a lowercase letter, then up to 31 letters/digits/hyphens.
// No dots, no slashes, no way out of the room.
export const LAWFUL_REF = /^[a-z][a-z0-9-]{0,31}$/;

export function buildSequencerArgs({ items, files, out, coverFile = null, metaFile = null }) {
  const inputs = [];
  const labels = [];
  const parts = [];
  let gapCount = 0;
  for (const item of items) {
    if (item.type === 'gap') {
      const seconds = (Math.max(1, item.ms | 0) / 1000).toFixed(3);
      const label = `g${gapCount++}`;
      parts.push(`aevalsrc=0:d=${seconds}:s=44100,${NORM}[${label}]`);
      labels.push(`[${label}]`);
      continue;
    }
    if (item.type !== 'voice' && item.type !== 'sting') throw new Error(`unknown item type "${item.type}"`);
    const file = files[item.ref];
    if (!file) throw new Error(`no file for ref "${item.ref}"`);
    const index = inputs.length; // each USE is its own input — a reused sting is simply read twice
    inputs.push(file);
    const loudness = item.type === 'sting' ? -19 : -16;
    parts.push(`[${index}:a]${NORM},loudnorm=I=${loudness}:TP=-1.5:LRA=11[i${index}]`);
    labels.push(`[i${index}]`);
  }
  if (!labels.length) throw new Error('an empty plan cannot be sequenced');
  const filter = `${parts.join(';')};${labels.join('')}concat=n=${labels.length}:v=0:a=1[mix]`;

  const args = ['-y'];
  for (const file of inputs) args.push('-i', file);
  let nextInput = inputs.length;
  let coverIndex = -1;
  let metaIndex = -1;
  if (coverFile) { coverIndex = nextInput++; args.push('-i', coverFile); }
  if (metaFile) { metaIndex = nextInput++; args.push('-f', 'ffmetadata', '-i', metaFile); }
  args.push('-filter_complex', filter, '-map', '[mix]');
  if (coverIndex >= 0) args.push('-map', `${coverIndex}:v`, '-c:v', 'mjpeg', '-disposition:v', 'attached_pic', '-metadata:s:v', 'title=Album cover');
  if (metaIndex >= 0) args.push('-map_metadata', String(metaIndex));
  args.push('-id3v2_version', '3', '-ac', '2', '-ar', '44100', '-b:a', '160k', out);
  return { args, filter, inputCount: inputs.length };
}

// Chapter markers, computed on the same timeline the concat chain plays:
// each item's true duration in order (gaps are known; audio is probed).
// ffmetadata escaping: =, ;, #, backslash and newline must be escaped.
export function buildChapterMetadata(chapters, itemDurationsMs) {
  const escapeMeta = (value) => String(value).replace(/([=;#\\\n])/g, '\\$1');
  const total = itemDurationsMs.reduce((sum, ms) => sum + ms, 0);
  const marks = chapters
    .map((chapter) => ({ title: chapter.title, start: itemDurationsMs.slice(0, chapter.beforeItem).reduce((sum, ms) => sum + ms, 0) }))
    .sort((a, b) => a.start - b.start);
  let text = ';FFMETADATA1\n';
  marks.forEach((mark, at) => {
    const end = at + 1 < marks.length ? marks[at + 1].start : total;
    text += `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${Math.round(mark.start)}\nEND=${Math.round(end)}\ntitle=${escapeMeta(mark.title)}\n`;
  });
  return text;
}

// True duration of one clip, in milliseconds — markers are garnish, so the
// caller may treat a probe failure as "skip the markers", never "fail the bind".
export function probeDurationMs(file) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    proc.stdout.on('data', (chunk) => { out += chunk.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      const ms = Math.round(parseFloat(out) * 1000);
      if (code === 0 && Number.isFinite(ms)) resolve(ms);
      else reject(new Error('probe failed'));
    });
  });
}
