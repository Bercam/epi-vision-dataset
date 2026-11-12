import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function crc32(buffer) {
  if (typeof zlib.crc32 === 'function') {
    return zlib.crc32(buffer) >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

export function makePng(width = 4, height = 3) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const pixels = zlib.deflateSync(Buffer.alloc((width * 3 + 1) * height));
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', pixels),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

export function makeJpeg(width = 8, height = 6) {
  const sof = Buffer.from([
    0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x00, 0x00, 0x00, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11,
    0x01,
  ]);
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  const sos = Buffer.from([
    0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00,
  ]);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    sof,
    sos,
    Buffer.from([0x00, 0x11, 0x22, 0x33]),
    Buffer.from([0xff, 0xd9]),
  ]);
}

export function makeGif(width = 2, height = 2) {
  const buffer = Buffer.alloc(14);
  buffer.write('GIF89a', 0, 'ascii');
  buffer.writeUInt16LE(width, 6);
  buffer.writeUInt16LE(height, 8);
  buffer[10] = 0x00;
  buffer[11] = 0x00;
  buffer[12] = 0x00;
  buffer[13] = 0x3b;
  return buffer;
}

export function makeWebp(width = 10, height = 20) {
  const buffer = Buffer.alloc(30);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(22, 4);
  buffer.write('WEBP', 8, 'ascii');
  buffer.write('VP8X', 12, 'ascii');
  buffer.writeUInt32LE(10, 16);
  buffer.writeUIntLE(width - 1, 24, 3);
  buffer.writeUIntLE(height - 1, 27, 3);
  return buffer;
}

export async function makeTempDir(prefix = 'image-collector-test-') {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function removeTempDir(directory) {
  await fs.rm(directory, { recursive: true, force: true });
}

export function fakeHttpResponse(url, body, contentType) {
  return {
    status: 200,
    headers: { 'content-type': contentType },
    body,
    finalUrl: url,
    contentType,
  };
}

export function createFakeHttpClient(routes) {
  return {
    async request(url, options = {}) {
      const handler = routes[url] ?? routes[String(url)];
      if (!handler) {
        const error = new Error(`Unexpected URL in fake HTTP client: ${url}`);
        error.code = 'FETCH_FAILED';
        throw error;
      }
      const result = typeof handler === 'function' ? await handler(url, options) : handler;
      if (result instanceof Error) {
        throw result;
      }
      return result;
    },
  };
}
