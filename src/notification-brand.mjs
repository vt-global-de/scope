import { deflateSync } from "node:zlib";

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const value of buffer) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function roundedRectangleContains(x, y, left, top, right, bottom, radius) {
  const closestX = Math.max(left + radius, Math.min(x, right - radius));
  const closestY = Math.max(top + radius, Math.min(y, bottom - radius));
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

function segmentDistance(x, y, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const position = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));
  return Math.hypot(x - (x1 + position * dx), y - (y1 + position * dy));
}

function sampleLogo(x, y) {
  if (!roundedRectangleContains(x, y, 0, 0, 64, 64, 15)) return [0, 0, 0, 0];
  let color = [13, 20, 23, 255];
  const radius = Math.hypot(x - 32, y - 32);
  if (Math.abs(radius - 16) <= 1.5
    || segmentDistance(x, y, 8, 32, 19, 32) <= 1.5
    || segmentDistance(x, y, 45, 32, 56, 32) <= 1.5
    || segmentDistance(x, y, 32, 8, 32, 19) <= 1.5
    || segmentDistance(x, y, 32, 45, 32, 56) <= 1.5) color = [64, 196, 207, 255];
  if (Math.abs(radius - 9) <= 1 || radius <= 3) color = [231, 239, 241, 255];
  return color;
}

export function createNotificationIconPng(size = 128) {
  const supersampling = 4;
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const totals = [0, 0, 0, 0];
      for (let sampleY = 0; sampleY < supersampling; sampleY += 1) {
        for (let sampleX = 0; sampleX < supersampling; sampleX += 1) {
          const sourceX = (x + (sampleX + 0.5) / supersampling) * 64 / size;
          const sourceY = (y + (sampleY + 0.5) / supersampling) * 64 / size;
          const sample = sampleLogo(sourceX, sourceY);
          sample.forEach((value, index) => { totals[index] += value; });
        }
      }
      const offset = (y * size + x) * 4;
      totals.forEach((value, index) => { pixels[offset + index] = Math.round(value / supersampling ** 2); });
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const scanlines = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const rowOffset = y * (size * 4 + 1);
    scanlines[rowOffset] = 0;
    pixels.copy(scanlines, rowOffset + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    pngSignature,
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(scanlines, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}
