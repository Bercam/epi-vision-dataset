import assert from 'node:assert/strict';
import test from 'node:test';
import zlib from 'node:zlib';
import { validateImage } from '../src/image/validateImage.js';
import { makeGif, makeJpeg, makePng, makeWebp } from './helpers/fixtures.js';

test('validateImage recognises PNG, JPEG, GIF and WebP', () => {
  assert.deepEqual(validateImage(makePng(12, 7)), {
    format: 'png',
    mimeType: 'image/png',
    extension: '.png',
    width: 12,
    height: 7,
  });
  assert.deepEqual(validateImage(makeJpeg(8, 6)), {
    format: 'jpeg',
    mimeType: 'image/jpeg',
    extension: '.jpg',
    width: 8,
    height: 6,
  });
  assert.deepEqual(validateImage(makeGif(3, 4)), {
    format: 'gif',
    mimeType: 'image/gif',
    extension: '.gif',
    width: 3,
    height: 4,
  });
  assert.deepEqual(validateImage(makeWebp(10, 20)), {
    format: 'webp',
    mimeType: 'image/webp',
    extension: '.webp',
    width: 10,
    height: 20,
  });
});

test('validateImage rejects corrupt PNG data', () => {
  const png = makePng(4, 3);
  const corrupted = Buffer.from(png);
  corrupted[corrupted.length - 5] ^= 0xff;
  assert.throws(() => validateImage(corrupted), { code: 'INVALID_IMAGE' });
  assert.throws(() => validateImage(png.subarray(0, 20)), { code: 'INVALID_IMAGE' });
});

test('validateImage rejects a JPEG without EOI', () => {
  const jpeg = makeJpeg();
  assert.throws(() => validateImage(jpeg.subarray(0, jpeg.length - 2)), { code: 'INVALID_IMAGE' });
});

test('validateImage rejects unsupported formats with descriptive errors', () => {
  const avif = Buffer.alloc(32);
  avif.writeUInt32BE(28, 0);
  avif.write('ftyp', 4, 'ascii');
  avif.write('avif', 8, 'ascii');
  assert.throws(() => validateImage(Buffer.from('BM' + 'x'.repeat(20))), { code: 'UNSUPPORTED_FORMAT' });
  assert.throws(() => validateImage(avif), { code: 'UNSUPPORTED_FORMAT' });
  assert.throws(() => validateImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), {
    code: 'UNSUPPORTED_FORMAT',
  });
  assert.throws(() => validateImage(Buffer.from('not an image at all')), { code: 'INVALID_IMAGE' });
  assert.throws(() => validateImage(Buffer.alloc(3)), { code: 'INVALID_IMAGE' });
});

test('validateImage rejects a PNG with a bad CRC', () => {
  const png = makePng(2, 2);
  const copy = Buffer.from(png);
  copy[30] ^= 0xff;
  assert.throws(() => validateImage(copy), { code: 'INVALID_IMAGE' });
});

test('validateImage rejects truncated WebP and GIF payloads', () => {
  assert.throws(() => validateImage(makeWebp().subarray(0, 18)), { code: 'INVALID_IMAGE' });
  assert.throws(() => validateImage(makeGif().subarray(0, 10)), { code: 'INVALID_IMAGE' });
});

test('validateImage does not mutate the original buffer', () => {
  const png = makePng(2, 2);
  const before = zlib.crc32(png);
  validateImage(png);
  assert.equal(zlib.crc32(png), before);
});
