const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, drawFn) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }
  const compressed = zlib.deflateSync(rawData);

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crcBuf]);
  }
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([header, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

function renderIconPixel(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  // Background rounded rect #0f172a
  const margin = 0.08;
  if (nx < margin || nx > 1 - margin || ny < margin || ny > 1 - margin) {
    return [15, 23, 42, 0]; // Transparent outer edge
  }

  // TV Screen outer box
  const tvLeft = 0.16, tvRight = 0.84, tvTop = 0.20, tvBottom = 0.70;
  const isScreenBorder = (
    (nx >= tvLeft && nx <= tvRight && (Math.abs(ny - tvTop) < 0.02 || Math.abs(ny - tvBottom) < 0.02)) ||
    (ny >= tvTop && ny <= tvBottom && (Math.abs(nx - tvLeft) < 0.02 || Math.abs(nx - tvRight) < 0.02))
  );

  if (isScreenBorder) {
    return [59, 130, 246, 255]; // Blue neon border #3b82f6
  }

  // TV Screen inner
  if (nx > tvLeft && nx < tvRight && ny > tvTop && ny < tvBottom) {
    // Play triangle in the middle
    const cx = 0.5, cy = 0.45;
    const px = nx - cx, py = ny - cy;
    if (px >= -0.10 && px <= 0.12 && Math.abs(py) <= (0.12 - px * 0.5)) {
      return [96, 165, 250, 255]; // Light blue play symbol
    }
    return [30, 41, 59, 255]; // Dark slate screen background
  }

  // TV Stand
  if (ny > 0.70 && ny < 0.78 && Math.abs(nx - 0.5) < 0.04) {
    return [148, 163, 184, 255]; // Stand neck
  }
  if (ny >= 0.78 && ny < 0.83 && Math.abs(nx - 0.5) < 0.22) {
    return [148, 163, 184, 255]; // Stand base
  }

  // Body container background
  return [15, 23, 42, 255];
}

const icon192 = createPng(192, 192, renderIconPixel);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), icon192);

const icon512 = createPng(512, 512, renderIconPixel);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), icon512);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#0f172a"/>
  <rect x="70" y="80" width="372" height="260" rx="20" fill="#1e293b" stroke="#3b82f6" stroke-width="12"/>
  <polygon points="230,160 320,210 230,260" fill="#60a5fa"/>
  <rect x="236" y="340" width="40" height="50" fill="#94a3b8"/>
  <rect x="176" y="390" width="160" height="20" rx="10" fill="#94a3b8"/>
</svg>`;
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svg);

console.log('Icons generated successfully.');
