import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { sha256Buffer } from '../src/image/hash.js';
import { createSilentLogger } from '../src/logger.js';
import { createCatalog } from '../src/services/catalog.js';
import { createDuplicateIndex } from '../src/services/duplicateIndex.js';
import { makeTempDir, removeTempDir } from './helpers/fixtures.js';

async function setup(t) {
  const root = await makeTempDir();
  t.after(() => removeTempDir(root));
  const imagesDir = path.join(root, 'images');
  await fs.mkdir(imagesDir, { recursive: true });
  const catalog = createCatalog({
    csvPath: path.join(root, 'sources', 'image_sources.csv'),
    recordsDir: path.join(root, 'sources', 'records'),
    logger: createSilentLogger(),
  });
  const duplicateIndex = createDuplicateIndex({ imagesDir, catalog, logger: createSilentLogger() });
  return { root, imagesDir, catalog, duplicateIndex };
}

test('duplicate index finds records by CSV hash', async (t) => {
  const { catalog, duplicateIndex } = await setup(t);
  const sha = sha256Buffer(Buffer.from('catalog-bytes'));
  await catalog.append({ file_name: 'image_001.jpg', sha256: sha, source_url: 'https://example.com' });
  const found = await duplicateIndex.find(sha);
  assert.equal(found.fileName, 'image_001.jpg');
  assert.equal(found.untracked, false);
  assert.equal(found.record.file_name, 'image_001.jpg');
  assert.equal(await duplicateIndex.find('0'.repeat(64)), null);
  assert.equal(await duplicateIndex.find(''), null);
});

test('duplicate index finds untracked files and added hashes', async (t) => {
  const { imagesDir, duplicateIndex } = await setup(t);
  const bytes = Buffer.from('untracked-file-bytes');
  const sha = sha256Buffer(bytes);
  await fs.writeFile(path.join(imagesDir, 'image_001.png'), bytes);
  const found = await duplicateIndex.find(sha);
  assert.equal(found.fileName, 'image_001.png');
  assert.equal(found.untracked, true);
  assert.equal(found.record, null);

  await duplicateIndex.add('image_002.png', 'f'.repeat(64));
  const added = await duplicateIndex.find('F'.repeat(64));
  assert.equal(added.fileName, 'image_002.png');
});
