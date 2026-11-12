import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyUrl,
  detectPlatform,
  getUrlBasename,
  parseHttpUrl,
  platformDisplayName,
} from '../src/util/url.js';
import { originalFilenameFromUrl, titleFromFilename } from '../src/image/filename.js';

test('parseHttpUrl adds https and strips fragments', () => {
  const url = parseHttpUrl('example.com/photo.jpg#section');
  assert.equal(url.href, 'https://example.com/photo.jpg');
});

test('parseHttpUrl keeps valid http URLs', () => {
  const url = parseHttpUrl('http://example.com/a?b=1');
  assert.equal(url.protocol, 'http:');
  assert.equal(url.search, '?b=1');
});

test('parseHttpUrl rejects missing, unsupported, credential and control-character URLs', () => {
  assert.throws(() => parseHttpUrl(''), { code: 'INVALID_URL' });
  assert.throws(() => parseHttpUrl('ftp://example.com/a.jpg'), { code: 'UNSUPPORTED_PROTOCOL' });
  assert.throws(() => parseHttpUrl('https://user:pass@example.com/a.jpg'), { code: 'INVALID_URL' });
  assert.throws(() => parseHttpUrl('https://example.com/a\u0000.jpg'), { code: 'INVALID_URL' });
});

test('classifyUrl distinguishes direct image, known page and generic page', () => {
  assert.deepEqual(classifyUrl(parseHttpUrl('https://images.pexels.com/photos/1/a.jpeg')), {
    kind: 'direct',
    platform: 'pexels',
    reason: 'known_direct_host',
  });
  assert.equal(classifyUrl(parseHttpUrl('https://example.com/a.png')).kind, 'direct');
  assert.equal(classifyUrl(parseHttpUrl('https://www.pexels.com/photo/thing-123/')).kind, 'page');
  assert.equal(classifyUrl(parseHttpUrl('https://commons.wikimedia.org/wiki/File:A.jpg')).kind, 'page');
  assert.equal(classifyUrl(parseHttpUrl('https://example.com/gallery')).kind, 'page');
});

test('detectPlatform recognises supported platforms', () => {
  assert.equal(detectPlatform(parseHttpUrl('https://www.pexels.com/photo/a-1/')), 'pexels');
  assert.equal(detectPlatform(parseHttpUrl('https://unsplash.com/photos/a')), 'unsplash');
  assert.equal(detectPlatform(parseHttpUrl('https://upload.wikimedia.org/a.jpg')), 'wikimedia');
  assert.equal(detectPlatform(parseHttpUrl('https://example.com/a.jpg')), 'generic');
});

test('platformDisplayName falls back to hostname for generic sources', () => {
  assert.equal(platformDisplayName('pexels'), 'Pexels');
  assert.equal(platformDisplayName('generic', parseHttpUrl('https://www.example.com/a')), 'www.example.com');
});

test('getUrlBasename accepts both URL objects and strings', () => {
  assert.equal(getUrlBasename(new URL('https://example.com/path/photo.jpg')), 'photo.jpg');
  assert.equal(getUrlBasename('https://example.com/path/photo.jpg'), 'photo.jpg');
});

test('originalFilenameFromUrl no longer returns the literal undefined', () => {
  assert.equal(originalFilenameFromUrl('https://example.com/path/photo.jpg'), 'photo.jpg');
  assert.equal(originalFilenameFromUrl('https://httpbin.org/image/png'), 'png');
  assert.equal(titleFromFilename(originalFilenameFromUrl('https://example.com/my-photo.jpg')), 'my photo');
});
