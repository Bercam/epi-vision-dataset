import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { createSilentLogger } from '../src/logger.js';
import { createCatalog, REQUIRED_COLUMNS } from '../src/services/catalog.js';
import { makeTempDir, removeTempDir } from './helpers/fixtures.js';

async function setup(t) {
  const root = await makeTempDir();
  t.after(() => removeTempDir(root));
  const csvPath = path.join(root, 'sources', 'image_sources.csv');
  const recordsDir = path.join(root, 'sources', 'records');
  const catalog = createCatalog({ csvPath, recordsDir, logger: createSilentLogger() });
  return { root, csvPath, recordsDir, catalog };
}

function record(overrides = {}) {
  return {
    file_name: 'image_001.jpg',
    source_name: 'Pexels',
    source_url: 'https://example.com/photo',
    direct_image_url: 'https://example.com/photo.jpg',
    author: 'Author',
    title: 'Title',
    license: 'CC BY 4.0',
    license_url: 'https://creativecommons.org/licenses/by/4.0/',
    width: '100',
    height: '50',
    file_size: '1234',
    sha256: 'a'.repeat(64),
    download_date: '2024-01-01T00:00:00.000Z',
    download_status: 'downloaded',
    annotation_status: 'pending',
    notes: '',
    ...overrides,
  };
}

test('catalog append writes the exact required CSV header', async (t) => {
  const { csvPath, catalog } = await setup(t);
  await catalog.append(record());
  const text = await fs.readFile(csvPath, 'utf8');
  assert.equal(text.split('\n')[0], REQUIRED_COLUMNS.join(','));
  assert.ok(text.includes('image_001.jpg'));
});

test('catalog reads legacy CSV and preserves placeholder rows', async (t) => {
  const { csvPath, catalog } = await setup(t);
  await fs.mkdir(path.dirname(csvPath), { recursive: true });
  await fs.writeFile(
    csvPath,
    'file_name,source_name,source_url,license,author,notes\nimage_001.jpg,,,,,\nimage_002.jpg,,,,,\n',
    'utf8',
  );
  const before = await catalog.read();
  assert.equal(before.records.length, 2);
  assert.equal(before.records[0].file_name, 'image_001.jpg');
  assert.equal(before.records[0].author, '');
  assert.equal(before.needsMigration, true);

  await catalog.append(record({ file_name: 'image_003.jpg', sha256: 'b'.repeat(64) }));
  const after = await catalog.read();
  assert.equal(after.records.length, 3);
  assert.equal(after.records[0].file_name, 'image_001.jpg');
  assert.equal(after.records[2].file_name, 'image_003.jpg');
});

test('catalog update changes only allowed fields', async (t) => {
  const { catalog } = await setup(t);
  await catalog.append(record());
  const updated = await catalog.update('image_001.jpg', {
    author: 'New Author',
    annotation_status: 'approved',
    sha256: 'should-not-change',
  });
  assert.equal(updated.author, 'New Author');
  assert.equal(updated.annotation_status, 'approved');
  assert.equal(updated.sha256, 'a'.repeat(64));
  await assert.rejects(() => catalog.update('missing.jpg', { author: 'x' }), { code: 'NOT_FOUND' });
});

test('catalog writes and reads sidecar JSON', async (t) => {
  const { catalog, recordsDir } = await setup(t);
  await catalog.append(record());
  await catalog.writeSidecar('image_001.jpg', { schema_version: 1, image: { sha256: 'a'.repeat(64) } });
  const sidecar = await catalog.readSidecar('image_001.jpg');
  assert.equal(sidecar.schema_version, 1);
  assert.equal(sidecar.image.sha256, 'a'.repeat(64));
  assert.ok((await fs.stat(path.join(recordsDir, 'image_001.json'))).isFile());
  assert.equal(await catalog.readSidecar('missing.jpg'), null);
});

test('catalog find helpers locate records by file name and sha256', async (t) => {
  const { catalog } = await setup(t);
  await catalog.append(record());
  assert.equal((await catalog.findRecord('image_001.jpg')).author, 'Author');
  assert.equal((await catalog.findBySha256('A'.repeat(64))).file_name, 'image_001.jpg');
  assert.equal(await catalog.findRecord('missing.jpg'), null);
  assert.equal(await catalog.findBySha256(''), null);
});

test('catalog preserves extra legacy columns during append', async (t) => {
  const { csvPath, catalog } = await setup(t);
  await fs.mkdir(path.dirname(csvPath), { recursive: true });
  await fs.writeFile(
    csvPath,
    'file_name,source_name,source_url,license,author,notes,legacy_extra\nimage_001.jpg,,,,,,keep-me\n',
    'utf8',
  );
  await catalog.append(record({ file_name: 'image_002.jpg', sha256: 'c'.repeat(64) }));
  const text = await fs.readFile(csvPath, 'utf8');
  assert.ok(text.split('\n')[0].endsWith(',legacy_extra'));
  assert.ok(text.includes('keep-me'));
});
