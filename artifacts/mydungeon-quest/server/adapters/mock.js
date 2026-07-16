import { createHash } from 'node:crypto';

function hash(value) { return createHash('sha256').update(value).digest('hex'); }
function svgBytes(label, prompt, width = 1280, height = 720) {
  const id = hash(`${label}:${prompt}`);
  const a = `#${id.slice(0, 6)}`;
  const b = `#${id.slice(6, 12)}`;
  const safe = String(prompt).replace(/[<>&]/g, '').slice(0, 140);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><filter id="n"><feTurbulence baseFrequency=".8" numOctaves="3" seed="${parseInt(id.slice(0,4),16)}"/><feBlend mode="soft-light" in2="SourceGraphic"/></filter></defs>
  <rect width="100%" height="100%" fill="#0d0b14"/><circle cx="${width*.75}" cy="${height*.25}" r="${height*.22}" fill="${a}" opacity=".45"/><path d="M0 ${height*.72} Q ${width*.24} ${height*.34} ${width*.48} ${height*.68} T ${width} ${height*.55} V${height}H0Z" fill="url(#g)" opacity=".72"/><rect width="100%" height="100%" filter="url(#n)" opacity=".18"/><text x="60" y="${height-110}" fill="#e9dfc8" font-family="serif" font-size="34">${label}</text><text x="60" y="${height-58}" fill="#d4a24e" font-family="serif" font-size="20">${safe}</text></svg>`;
  return Buffer.from(svg);
}

function wavTone({ seconds = 2, frequency = 220, volume = 0.15 }) {
  const sampleRate = 22050;
  const samples = Math.floor(sampleRate * seconds);
  const dataSize = samples * 2;
  const out = Buffer.alloc(44 + dataSize);
  out.write('RIFF', 0); out.writeUInt32LE(36 + dataSize, 4); out.write('WAVE', 8);
  out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
  out.writeUInt32LE(sampleRate, 24); out.writeUInt32LE(sampleRate * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34);
  out.write('data', 36); out.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples; i += 1) {
    const envelope = Math.min(1, i / 800) * Math.min(1, (samples - i) / 1800);
    const harmonic = Math.sin(2 * Math.PI * frequency * i / sampleRate) + 0.32 * Math.sin(2 * Math.PI * frequency * 1.5 * i / sampleRate);
    out.writeInt16LE(Math.max(-32767, Math.min(32767, harmonic * volume * envelope * 32767)), 44 + i * 2);
  }
  return out;
}

export const mockAdapter = {
  name: 'mock',
  capabilities: { configured: true, supportsReferences: true, maxReferenceImages: 3, supportsSeed: true, includesAudio: false, asynchronous: false },
  // THE FLOOR HAS NO EYES (Directive VI, Phase 13) — and says so. The
  // route answers floor:true before ever calling this; it exists so the
  // adapter plan is complete and the honesty is inspectable.
  async see() { return { floor: true, text: '', provider: 'mock', model: 'no-eyes' }; },
  async paint({ prompt, kind = 'scene', references = [] }) {
    const anchored = references.length ? ` ⚓${hash(references.map((ref) => ref.assetHash || ref.data || '').join('|')).slice(0, 6)}` : '';
    return { bytes: svgBytes(`MOCK ${kind.toUpperCase()}${anchored}`, prompt, kind === 'portrait' ? 768 : 1280, kind === 'portrait' ? 1024 : 720), mime: 'image/svg+xml', provider: 'mock', model: 'procedural-svg', seed: hash(prompt).slice(0, 12), usage: { cost: 0 } };
  },
  async speak({ text }) { return { bytes: wavTone({ seconds: Math.max(1.5, Math.min(5, text.length / 25)), frequency: 180 + parseInt(hash(text).slice(0,2), 16) }), mime: 'audio/wav', provider: 'mock', model: 'procedural-tone', seed: hash(text).slice(0, 12), usage: { cost: 0 } }; },
  async music({ prompt }) { return { bytes: wavTone({ seconds: 8, frequency: 110 + parseInt(hash(prompt).slice(0,2), 16) / 3, volume: .11 }), mime: 'audio/wav', provider: 'mock', model: 'procedural-stinger', seed: hash(prompt).slice(0, 12), usage: { cost: 0 } }; },
  async sfx({ prompt }) { return { bytes: wavTone({ seconds: 2.5, frequency: 70 + parseInt(hash(prompt).slice(0,2), 16) / 4, volume: .12 }), mime: 'audio/wav', provider: 'mock', model: 'procedural-impact', seed: hash(prompt).slice(0, 12), usage: { cost: 0 } }; }
};
