// Generates every PWA / iOS / Android icon and splash screen from one SVG design.
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';

const OUT = process.argv[2];
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'splash'), { recursive: true });

const BG = '#0A0A0A';
const grad = (id) => `
  <defs>
    <linearGradient id="${id}" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#F58529"/>
      <stop offset="0.5" stop-color="#DD2A7B"/>
      <stop offset="1" stop-color="#8134AF"/>
    </linearGradient>
  </defs>`;

// Glyph drawn in a 100x100 box: ascending bars + rising trend line ("MetricFlow")
const glyph = `
  <g fill="#fff">
    <rect x="22" y="60" width="14" height="18" rx="3.5"/>
    <rect x="43" y="47" width="14" height="31" rx="3.5"/>
    <rect x="64" y="34" width="14" height="44" rx="3.5"/>
  </g>
  <path d="M20 46 L38 31 L52 38 L74 18" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="78" cy="15" r="6" fill="#fff"/>`;

// mode: 'rounded' (transparent corners), 'full' (full-bleed square), 'maskable' (full-bleed, glyph in safe zone)
function iconSvg(size, mode) {
  const glyphScale = mode === 'maskable' ? 0.56 : mode === 'full' ? 0.66 : 0.70;
  const g = 100 * glyphScale;
  const off = (100 - g) / 2;
  const bg = mode === 'rounded'
    ? `<rect x="0" y="0" width="100" height="100" rx="22" fill="url(#g)"/>`
    : `<rect x="0" y="0" width="100" height="100" fill="url(#g)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${grad('g')}${bg}
  <g transform="translate(${off} ${off}) scale(${glyphScale})">${glyph}</g></svg>`;
}

function splashSvg(w, h) {
  const icon = Math.round(Math.min(w, h) * 0.28);
  const x = (w - icon) / 2, y = (h - icon) / 2 - icon * 0.25;
  const fs_ = Math.round(icon * 0.2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${BG}"/>
  <svg x="${x}" y="${y}" width="${icon}" height="${icon}" viewBox="0 0 100 100">${grad('s')}
    <rect width="100" height="100" rx="22" fill="url(#s)"/>
    <g transform="translate(15 15) scale(0.7)">${glyph}</g>
  </svg>
  <text x="${w / 2}" y="${y + icon + fs_ * 2.1}" text-anchor="middle" fill="#fff" font-family="-apple-system, Helvetica, Arial, sans-serif" font-weight="700" font-size="${fs_}">MetricFlow</text>
</svg>`;
}

// iOS splash screens (portrait, device px) — width, height, css width, css height, dpr
const IOS = [
  [2048, 2732, 1024, 1366, 2], [1668, 2388, 834, 1194, 2], [1640, 2360, 820, 1180, 2],
  [1668, 2224, 834, 1112, 2], [1620, 2160, 810, 1080, 2], [1536, 2048, 768, 1024, 2],
  [1488, 2266, 744, 1133, 2],
  [1320, 2868, 440, 956, 3], [1206, 2622, 402, 874, 3],
  [1290, 2796, 430, 932, 3], [1179, 2556, 393, 852, 3], [1284, 2778, 428, 926, 3],
  [1170, 2532, 390, 844, 3], [1125, 2436, 375, 812, 3], [1242, 2688, 414, 896, 3],
  [828, 1792, 414, 896, 2], [1242, 2208, 414, 736, 3], [750, 1334, 375, 667, 2],
  [640, 1136, 320, 568, 2],
];

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();

async function render(svg, w, h, file, transparent = false) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.screenshot({ path: file, omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } });
}

const icons = [
  ['icons/pwa-64x64.png', 64, 'rounded'],
  ['icons/pwa-192x192.png', 192, 'rounded'],
  ['icons/pwa-512x512.png', 512, 'rounded'],
  ['icons/maskable-icon-192x192.png', 192, 'maskable'],
  ['icons/maskable-icon-512x512.png', 512, 'maskable'],
  ['icons/apple-touch-icon-180x180.png', 180, 'full'],
  ['apple-touch-icon.png', 180, 'full'],
  ['icons/favicon-32x32.png', 32, 'rounded'],
  ['icons/favicon-16x16.png', 16, 'rounded'],
];
for (const [file, size, mode] of icons) {
  await render(iconSvg(size, mode), size, size, path.join(OUT, file), mode === 'rounded');
}
fs.writeFileSync(path.join(OUT, 'favicon.svg'), iconSvg(64, 'rounded'));
fs.writeFileSync(path.join(OUT, 'icons', 'icon-source.svg'), iconSvg(512, 'rounded'));

const links = [];
for (const [w, h, cw, ch, dpr] of IOS) {
  const p = `splash/apple-splash-${w}-${h}.png`;
  await render(splashSvg(w, h), w, h, path.join(OUT, p));
  links.push(`    <link rel="apple-touch-startup-image" media="screen and (device-width: ${cw}px) and (device-height: ${ch}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)" href="/${p}" />`);
}
fs.writeFileSync(path.join(path.dirname(path.resolve(OUT)), 'splash-links.html'), links.join('\n'));
await browser.close();
console.log('ok');
