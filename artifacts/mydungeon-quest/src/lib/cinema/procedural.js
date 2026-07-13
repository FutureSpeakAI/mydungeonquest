export function proceduralArtDataUrl(seedText, title, palette = ['#0d0b14','#593a49','#d4a24e'], portrait = false) {
  let seed = 2166136261;
  for (const char of `${seedText}${title}`) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  const width = portrait ? 720 : 1280;
  const height = portrait ? 960 : 720;
  const hills = Array.from({ length: 8 }, (_, i) => {
    const x = (seed * (i + 11) % width);
    const y = height * (.42 + ((seed >>> (i % 16)) % 36) / 100);
    const r = 80 + ((seed * (i + 3)) % 220);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${palette[i % 3]}" opacity="${.08 + i*.025}"/>`;
  }).join('');
  const safeTitle = String(title || '').replace(/[<>&]/g, '').slice(0, 90);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><radialGradient id="r"><stop stop-color="${palette[1]}"/><stop offset="1" stop-color="${palette[0]}"/></radialGradient><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" seed="${seed % 1000}"/><feBlend mode="overlay" in2="SourceGraphic"/></filter></defs><rect width="100%" height="100%" fill="url(#r)"/>${hills}<path d="M0 ${height*.8} Q${width*.2} ${height*.42} ${width*.44} ${height*.76} T${width} ${height*.58} V${height}H0Z" fill="${palette[0]}" opacity=".8"/><path d="M${width*.5} ${height*.25}l28 60 66 8-48 45 13 65-59-32-59 32 13-65-48-45 66-8z" fill="none" stroke="${palette[2]}" stroke-width="6" opacity=".75"/><rect width="100%" height="100%" filter="url(#noise)" opacity=".14"/><text x="50%" y="90%" text-anchor="middle" fill="#e9dfc8" font-family="serif" font-size="${portrait ? 28 : 34}" letter-spacing="6">${safeTitle}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
