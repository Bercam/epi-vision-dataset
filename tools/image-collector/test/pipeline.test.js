import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { loadConfig } from '../src/config.js';
import { AppError } from '../src/errors.js';
import { createSilentLogger } from '../src/logger.js';
import { createCatalog, REQUIRED_COLUMNS } from '../src/services/catalog.js';
import { createClassifier } from '../src/services/classifier.js';
import { createDuplicateIndex } from '../src/services/duplicateIndex.js';
import { createPipeline } from '../src/services/pipeline.js';
import { createPreviewStore } from '../src/services/previewStore.js';
import { createStorage } from '../src/services/storage.js';
import {
  createFakeHttpClient,
  fakeHttpResponse,
  makePng,
  makeTempDir,
  removeTempDir,
} from './helpers/fixtures.js';

const IMAGE_URL = 'https://images.example.com/photos/worker-safety.png';

function record(overrides = {}) {
  return {
    file_name: 'image_001.png',
    source_name: 'example.com',
    source_url: 'https://example.com/photo',
    direct_image_url: IMAGE_URL,
    author: 'Author',
    title: 'Title',
    license: 'CC BY 4.0',
    license_url: 'https://creativecommons.org/licenses/by/4.0/',
    width: '4',
    height: '3',
    file_size: '1234',
    sha256: 'a'.repeat(64),
    download_date: '2024-01-01T00:00:00.000Z',
    download_status: 'downloaded',
    annotation_status: 'pending',
    notes: '',
    ...overrides,
  };
}

async function setup(t, { catalogOverride } = {}) {
  const root = await makeTempDir();
  t.after(() => removeTempDir(root));

  const config = loadConfig({ datasetRoot: root, logLevel: 'silent' });
  const logger = createSilentLogger();
  const catalog = createCatalog({ csvPath: config.csvPath, recordsDir: config.recordsDir, logger });
  const storage = createStorage({ imagesDir: config.imagesDir, logger });
  const duplicateIndex = createDuplicateIndex({ imagesDir: config.imagesDir, catalog, logger });
  const previewStore = createPreviewStore({
    tempDir: config.tempDir,
    ttlMs: config.previewTtlMs,
    logger,
  });
  const png = makePng(4, 3);
  const httpClient = createFakeHttpClient({
    [IMAGE_URL]: fakeHttpResponse(IMAGE_URL, png, 'image/png'),
  });

  const pipelineCatalog = catalogOverride ? catalogOverride(catalog) : catalog;
  const pipeline = createPipeline({
    config,
    logger,
    httpClient,
    catalog: pipelineCatalog,
    storage,
    duplicateIndex,
    previewStore,
    classifier: createClassifier(),
    now: () => new Date('2025-05-06T07:08:09.000Z'),
  });

  await catalog.ensureDirectories();
  await storage.ensureDirectories();
  t.after(() => previewStore.stop());

  return { root, config, catalog, storage, duplicateIndex, previewStore, pipeline, png };
}

test('extract downloads, validates, hashes and previews a direct image', async (t) => {
  const { config, previewStore, pipeline, png } = await setup(t);

  const preview = await pipeline.extract({ url: IMAGE_URL });

  assert.equal(preview.status, 'ready');
  assert.equal(preview.duplicate, null);
  assert.equal(preview.image.format, 'png');
  assert.equal(preview.image.mimeType, 'image/png');
  assert.equal(preview.image.width, 4);
  assert.equal(preview.image.height, 3);
  assert.equal(preview.image.fileSize, png.length);
  assert.match(preview.image.sha256, /^[a-f0-9]{64}$/);
  assert.equal(preview.image.originalFilename, 'worker-safety.png');
  assert.equal(preview.image.directImageUrl, IMAGE_URL);
  assert.equal(preview.image.previewUrl, `/api/previews/${preview.token}/image`);
  assert.equal(preview.metadata.platform, 'generic');
  assert.equal(preview.metadata.sourcePageUrl, '');
  assert.equal(preview.metadata.title, 'worker safety');
  assert.deepEqual(preview.metadata.missingFields, ['source_url', 'author', 'license']);
  assert.ok(preview.metadata.warnings.some((warning) => warning.code === 'title_from_filename'));
  assert.equal(preview.classification.status, 'manual_review_required');
  assert.equal(previewStore.size(), 1);

  const entry = previewStore.get(preview.token);
  assert.deepEqual(await fs.readFile(entry.tempPath), png);
  assert.equal(path.dirname(entry.tempPath), config.tempDir);
});

test('confirm persists the image, exact CSV columns and a sidecar JSON record', async (t) => {
  const { config, catalog, storage, previewStore, pipeline, png } = await setup(t);
  const preview = await pipeline.extract({ url: IMAGE_URL });

  const result = await pipeline.confirm({ token: preview.token });

  assert.equal(result.record.file_name, 'image_001.png');
  assert.equal(result.record.source_name, 'images.example.com');
  assert.equal(result.record.source_url, '');
  assert.equal(result.record.direct_image_url, IMAGE_URL);
  assert.equal(result.record.author, '');
  assert.equal(result.record.title, 'worker safety');
  assert.equal(result.record.license, '');
  assert.equal(result.record.license_url, '');
  assert.equal(result.record.width, '4');
  assert.equal(result.record.height, '3');
  assert.equal(result.record.file_size, String(png.length));
  assert.equal(result.record.sha256, preview.image.sha256);
  assert.equal(result.record.download_date, '2025-05-06T07:08:09.000Z');
  assert.equal(result.record.download_status, 'downloaded_metadata_pending');
  assert.equal(result.record.annotation_status, 'pending');
  assert.match(result.record.notes, /manual_verification_required: source_url, author, license/);
  assert.match(result.record.notes, /original_filename: worker-safety\.png/);

  const csv = await fs.readFile(config.csvPath, 'utf8');
  assert.equal(csv.split('\n')[0], REQUIRED_COLUMNS.join(','));
  assert.equal(csv.trim().split('\n').length, 2);
  assert.deepEqual(await fs.readFile(path.join(config.imagesDir, 'image_001.png')), png);
  assert.deepEqual(await storage.listImageFiles(), ['image_001.png']);

  const sidecar = await catalog.readSidecar('image_001.png');
  assert.equal(sidecar.file_name, 'image_001.png');
  assert.equal(sidecar.image.sha256, preview.image.sha256);
  assert.equal(sidecar.image.format, 'png');
  assert.equal(sidecar.image.original_filename, 'worker-safety.png');
  assert.equal(sidecar.source.direct_image_url, IMAGE_URL);
  assert.equal(sidecar.extraction.kind, 'direct');
  assert.deepEqual(sidecar.extraction.missing_fields, ['source_url', 'author', 'license']);
  assert.equal(sidecar.classification.status, 'manual_review_required');
  assert.equal(sidecar.catalog.download_status, 'downloaded_metadata_pending');

  assert.equal(previewStore.size(), 0);
});

test('a second extraction of the same bytes is flagged and confirm rejects it', async (t) => {
  const { config, previewStore, pipeline } = await setup(t);
  const first = await pipeline.extract({ url: IMAGE_URL });
  await pipeline.confirm({ token: first.token });

  const second = await pipeline.extract({ url: IMAGE_URL });
  assert.equal(second.status, 'duplicate');
  assert.equal(second.duplicate.fileName, 'image_001.png');
  assert.equal(second.duplicate.untracked, false);

  await assert.rejects(() => pipeline.confirm({ token: second.token }), { code: 'DUPLICATE_IMAGE' });

  const files = await fs.readdir(config.imagesDir);
  assert.deepEqual(files, ['image_001.png']);
  const csv = await fs.readFile(config.csvPath, 'utf8');
  assert.equal(csv.trim().split('\n').length, 2);
  await pipeline.discardPreview(second.token);
  assert.equal(previewStore.size(), 0);
});

test('confirm applies human metadata edits and classification suggestions', async (t) => {
  const { catalog, pipeline } = await setup(t);
  const preview = await pipeline.extract({ url: IMAGE_URL });

  const result = await pipeline.confirm({
    token: preview.token,
    metadata: {
      source_url: 'https://example.com/photos/worker-safety',
      author: 'Maria Silva',
      title: 'Trabalhador com capacete',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      notes: 'Revisado manualmente.',
    },
    classification: {
      people_visible: true,
      safety_helmets_visible: true,
      reflective_vests_visible: false,
    },
  });

  assert.equal(result.record.source_url, 'https://example.com/photos/worker-safety');
  assert.equal(result.record.author, 'Maria Silva');
  assert.equal(result.record.title, 'Trabalhador com capacete');
  assert.equal(result.record.license, 'CC BY 4.0');
  assert.equal(result.record.license_url, 'https://creativecommons.org/licenses/by/4.0/');
  assert.equal(result.record.download_status, 'downloaded');
  assert.match(result.record.notes, /^Revisado manualmente\./);
  assert.doesNotMatch(result.record.notes, /manual_verification_required/);

  const sidecar = await catalog.readSidecar('image_001.png');
  assert.equal(sidecar.source.source_page_url, 'https://example.com/photos/worker-safety');
  assert.deepEqual(sidecar.extraction.missing_fields, []);
  assert.equal(sidecar.classification.status, 'human_supplied');
  assert.equal(sidecar.classification.method, 'human_review');
  assert.equal(sidecar.classification.values.people_visible, true);
  assert.equal(sidecar.classification.values.safety_helmets_visible, true);
  assert.equal(sidecar.classification.values.reflective_vests_visible, false);
  assert.equal(sidecar.classification.values.construction_environment, null);
  assert.equal(sidecar.classification.reviewed_at, '2025-05-06T07:08:09.000Z');
});

test('confirm rejects invalid metadata overrides without touching the dataset', async (t) => {
  const { config, previewStore, pipeline } = await setup(t);
  const preview = await pipeline.extract({ url: IMAGE_URL });

  await assert.rejects(
    () => pipeline.confirm({ token: preview.token, metadata: { licenseUrl: 'javascript:alert(1)' } }),
    { code: 'VALIDATION_ERROR' },
  );
  await assert.rejects(
    () => pipeline.confirm({ token: preview.token, metadata: { author: 42 } }),
    { code: 'VALIDATION_ERROR' },
  );

  assert.deepEqual(await fs.readdir(config.imagesDir), []);
  assert.equal(previewStore.size(), 1);
});

test('confirm rolls the image back when the CSV append fails', async (t) => {
  const { config, storage, previewStore, pipeline } = await setup(t, {
    catalogOverride: (catalog) => ({
      ...catalog,
      append: async () => {
        throw new AppError('CATALOG_WRITE_FAILED', 'Falha simulada de catálogo.');
      },
    }),
  });
  const preview = await pipeline.extract({ url: IMAGE_URL });

  await assert.rejects(() => pipeline.confirm({ token: preview.token }), { code: 'CATALOG_WRITE_FAILED' });
  assert.deepEqual(await storage.listImageFiles(), []);
  assert.equal(previewStore.size(), 1);
  await pipeline.discardPreview(preview.token);
  assert.deepEqual(await fs.readdir(config.imagesDir), []);
});

test('updateRecord recomputes download status and creates a missing sidecar', async (t) => {
  const { catalog, pipeline } = await setup(t);
  await catalog.append(
    record({
      source_url: '',
      author: '',
      title: 'Legacy title',
      license: '',
      license_url: '',
      download_status: 'downloaded_metadata_pending',
      notes: 'manual_verification_required: source_url, author, license',
    }),
  );

  const updated = await pipeline.updateRecord('image_001.png', {
    source_url: 'https://example.com/photo',
    author: 'Ana Souza',
    license: 'CC0 1.0',
    license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    annotation_status: 'in_review',
  });

  assert.equal(updated.source_url, 'https://example.com/photo');
  assert.equal(updated.author, 'Ana Souza');
  assert.equal(updated.license, 'CC0 1.0');
  assert.equal(updated.download_status, 'downloaded');
  assert.equal(updated.annotation_status, 'in_review');

  const sidecar = await catalog.readSidecar('image_001.png');
  assert.ok(sidecar);
  assert.equal(sidecar.file_name, 'image_001.png');
  assert.equal(sidecar.image.sha256, 'a'.repeat(64));
  assert.equal(sidecar.source.source_page_url, 'https://example.com/photo');
  assert.equal(sidecar.catalog.download_status, 'downloaded');
  assert.equal(sidecar.catalog.annotation_status, 'in_review');
  assert.deepEqual(sidecar.extraction.missing_fields, []);

  const reverted = await pipeline.updateRecord('image_001.png', { license: '' });
  assert.equal(reverted.download_status, 'downloaded_metadata_pending');
});

test('updateRecord validates fields, URLs and annotation status', async (t) => {
  const { catalog, pipeline } = await setup(t);
  await catalog.append(record());

  await assert.rejects(
    () => pipeline.updateRecord('image_001.png', { license_url: 'ftp://example.com/license' }),
    { code: 'VALIDATION_ERROR' },
  );
  await assert.rejects(
    () => pipeline.updateRecord('image_001.png', { source_url: 'javascript:alert(1)' }),
    { code: 'VALIDATION_ERROR' },
  );
  await assert.rejects(
    () => pipeline.updateRecord('image_001.png', { annotation_status: 'done' }),
    { code: 'VALIDATION_ERROR' },
  );
  await assert.rejects(() => pipeline.updateRecord('image_001.png', { author: 7 }), {
    code: 'VALIDATION_ERROR',
  });
  await assert.rejects(() => pipeline.updateRecord('missing.png', { author: 'x' }), {
    code: 'NOT_FOUND',
  });
});

test('listRecords exposes thumbnails, sidecar details and license review flags', async (t) => {
  const { catalog, pipeline } = await setup(t);
  await catalog.append(
    record({ license: '', license_url: '', download_status: 'downloaded_metadata_pending' }),
  );
  await catalog.writeSidecar('image_001.png', { schema_version: 1, marker: 'sidecar' });

  const records = await pipeline.listRecords();
  assert.equal(records.length, 1);
  assert.equal(records[0].file_name, 'image_001.png');
  assert.equal(records[0].thumbnailUrl, '/dataset/images/image_001.png');
  assert.equal(records[0].details.marker, 'sidecar');
  assert.equal(records[0].licenseNeedsReview, true);
});
