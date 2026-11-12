import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { createSilentLogger } from '../src/logger.js';
import { createPreviewStore } from '../src/services/previewStore.js';
import { makeTempDir, removeTempDir } from './helpers/fixtures.js';

async function setup(t, ttlMs = 60_000) {
  const root = await makeTempDir();
  t.after(() => removeTempDir(root));
  const tempDir = path.join(root, '.tmp');
  const store = createPreviewStore({ tempDir, ttlMs, logger: createSilentLogger() });
  return { root, tempDir, store };
}

test('preview store allocates a token and registers data', async (t) => {
  const { tempDir, store } = await setup(t);
  const allocation = await store.allocate('.png');
  assert.match(allocation.token, /^[a-f0-9]{32}$/);
  assert.ok(allocation.tempPath.startsWith(tempDir));
  await fs.writeFile(allocation.tempPath, 'bytes');
  store.register(allocation.token, { tempPath: allocation.tempPath, image: { width: 1 } });
  assert.equal(store.get(allocation.token).image.width, 1);
  assert.equal(store.size(), 1);
  assert.equal(await store.discard(allocation.token), true);
  assert.equal(store.size(), 0);
  await assert.rejects(() => fs.stat(allocation.tempPath), { code: 'ENOENT' });
});

test('preview store rejects missing and expired tokens', async (t) => {
  const { tempDir, store } = await setup(t, -1);
  const allocation = await store.allocate('.jpg');
  await fs.writeFile(allocation.tempPath, 'bytes');
  store.register(allocation.token, { tempPath: allocation.tempPath });
  assert.throws(() => store.get('0'.repeat(32)), { code: 'PREVIEW_NOT_FOUND' });
  assert.throws(() => store.get(allocation.token), { code: 'PREVIEW_EXPIRED' });
  assert.equal(store.size(), 0);
});

test('preview store cleanup removes expired temp files', async (t) => {
  const { store } = await setup(t, -1);
  const allocation = await store.allocate('.png');
  await fs.writeFile(allocation.tempPath, 'bytes');
  store.register(allocation.token, { tempPath: allocation.tempPath });
  await store.cleanupExpired();
  assert.equal(store.size(), 0);
});
