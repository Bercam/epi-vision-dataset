import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { createSilentLogger } from '../src/logger.js';
import { createStorage } from '../src/services/storage.js';
import { makeTempDir, removeTempDir } from './helpers/fixtures.js';

async function setup(t) {
  const root = await makeTempDir();
  t.after(() => removeTempDir(root));
  const imagesDir = path.join(root, 'images');
  const storage = createStorage({ imagesDir, logger: createSilentLogger() });
  await storage.ensureDirectories();
  return { root, imagesDir, storage };
}

test('allocateFileName reuses a matching legacy placeholder slot', async (t) => {
  const { storage } = await setup(t);
  const allocation = await storage.allocateFileName({
    extension: '.jpg',
    records: [{ file_name: 'image_001.jpg', sha256: '', source_url: '', direct_image_url: '' }],
  });
  assert.equal(allocation.fileName, 'image_001.jpg');
  assert.equal(allocation.reusedPlaceholder, true);
});

test('allocateFileName skips placeholders with a different extension and used files', async (t) => {
  const { imagesDir, storage } = await setup(t);
  await fs.writeFile(path.join(imagesDir, 'image_001.jpg'), 'x');
  const allocation = await storage.allocateFileName({
    extension: '.png',
    records: [
      { file_name: 'image_001.jpg', sha256: '', source_url: '', direct_image_url: '' },
      { file_name: 'image_002.jpg', sha256: '', source_url: '', direct_image_url: '' },
    ],
  });
  assert.equal(allocation.fileName, 'image_003.png');
});

test('moveIntoPlace copies without overwriting and removeFile cleans up', async (t) => {
  const { root, imagesDir, storage } = await setup(t);
  const tempPath = path.join(root, 'temp.png');
  await fs.writeFile(tempPath, 'image-bytes');
  const finalPath = await storage.moveIntoPlace({ tempPath, fileName: 'image_001.png' });
  assert.equal(await fs.readFile(finalPath, 'utf8'), 'image-bytes');
  await assert.rejects(
    () => storage.moveIntoPlace({ tempPath, fileName: 'image_001.png' }),
    { code: 'CONFIRM_CONFLICT' },
  );
  assert.equal(await fs.readFile(path.join(imagesDir, 'image_001.png'), 'utf8'), 'image-bytes');
  await storage.removeFile('image_001.png');
  await assert.rejects(() => fs.stat(path.join(imagesDir, 'image_001.png')), { code: 'ENOENT' });
});

test('getImagePath validates standard names and file existence', async (t) => {
  const { imagesDir, storage } = await setup(t);
  await fs.writeFile(path.join(imagesDir, 'image_001.jpg'), 'x');
  assert.equal(await storage.getImagePath('image_001.jpg'), path.join(imagesDir, 'image_001.jpg'));
  await assert.rejects(() => storage.getImagePath('image_002.jpg'), { code: 'NOT_FOUND' });
  await assert.rejects(() => storage.getImagePath('package.json'), { code: 'NOT_FOUND' });
});

test('listImageFiles only reports standard image names', async (t) => {
  const { imagesDir, storage } = await setup(t);
  await fs.writeFile(path.join(imagesDir, 'image_001.jpg'), 'x');
  await fs.writeFile(path.join(imagesDir, 'notes.txt'), 'x');
  assert.deepEqual(await storage.listImageFiles(), ['image_001.jpg']);
});
