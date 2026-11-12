import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { loadConfig } from '../src/config.js';
import { AppError } from '../src/errors.js';
import { createSilentLogger } from '../src/logger.js';
import { createRequestHandler } from '../src/server/app.js';
import { makePng, makeTempDir, removeTempDir } from './helpers/fixtures.js';

const TOKEN = 'a'.repeat(32);

function record(overrides = {}) {
  return {
    file_name: 'image_001.png',
    source_name: 'example.com',
    source_url: 'https://example.com/photo',
    direct_image_url: 'https://images.example.com/photo.png',
    author: 'Author',
    title: 'Title',
    license: 'CC BY 4.0',
    license_url: 'https://creativecommons.org/licenses/by/4.0/',
    width: '4',
    height: '3',
    file_size: '123',
    sha256: 'b'.repeat(64),
    download_date: '2024-01-01T00:00:00.000Z',
    download_status: 'downloaded',
    annotation_status: 'pending',
    notes: '',
    thumbnailUrl: '/dataset/images/image_001.png',
    details: null,
    licenseNeedsReview: false,
    ...overrides,
  };
}

function request(port, { method = 'GET', path: requestPath = '/', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, method, path: requestPath, headers },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }),
        );
      },
    );
    req.on('error', reject);
    if (body !== undefined) {
      req.write(body);
    }
    req.end();
  });
}

function jsonBody(value) {
  return {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  };
}

function parseJson(response) {
  return JSON.parse(response.body.toString('utf8'));
}

async function setup(t) {
  const root = await makeTempDir();
  t.after(() => removeTempDir(root));

  const imagePath = path.join(root, 'image_001.png');
  const png = makePng(4, 3);
  await fs.writeFile(imagePath, png);

  const config = loadConfig({
    datasetRoot: root,
    logLevel: 'silent',
    rateLimit: { windowMs: 60_000, max: 1000 },
  });
  const logger = createSilentLogger();
  const records = [record()];
  const calls = { extract: [], confirm: [], update: [], discard: [] };

  const pipeline = {
    async extract({ url }) {
      calls.extract.push(url);
      return {
        token: TOKEN,
        status: 'ready',
        duplicate: null,
        image: {
          format: 'png',
          mimeType: 'image/png',
          width: 4,
          height: 3,
          fileSize: png.length,
          sha256: 'b'.repeat(64),
          originalFilename: 'photo.png',
          directImageUrl: 'https://images.example.com/photo.png',
          previewUrl: `/api/previews/${TOKEN}/image`,
        },
        metadata: {
          platform: 'generic',
          platformName: 'example.com',
          sourcePageUrl: '',
          directImageUrl: 'https://images.example.com/photo.png',
          author: '',
          title: 'photo',
          license: '',
          licenseUrl: '',
          missingFields: ['source_url', 'author', 'license'],
          warnings: [],
        },
        classification: { suggestions: {}, status: 'manual_review_required', method: 'none' },
      };
    },
    async confirm({ token, metadata, classification }) {
      calls.confirm.push({ token, metadata, classification });
      if (token !== TOKEN) {
        throw new AppError('PREVIEW_NOT_FOUND', 'Pré-visualização não encontrada.');
      }
      const updated = { ...records[0], ...(metadata ?? {}) };
      records[0] = updated;
      return { record: updated, image: { sha256: 'b'.repeat(64) } };
    },
    async listRecords() {
      return records;
    },
    async updateRecord(fileName, changes) {
      calls.update.push({ fileName, changes });
      if (fileName !== records[0].file_name) {
        throw new AppError('NOT_FOUND', 'Registro não encontrado no catálogo.');
      }
      if (changes.annotation_status && !['pending', 'in_review', 'approved', 'rejected'].includes(changes.annotation_status)) {
        throw new AppError('VALIDATION_ERROR', 'Status de anotação inválido.');
      }
      records[0] = { ...records[0], ...changes };
      return records[0];
    },
    async getImagePath(fileName) {
      if (fileName !== 'image_001.png') {
        throw new AppError('NOT_FOUND', 'Imagem não encontrada.');
      }
      return imagePath;
    },
    getPreview(token) {
      if (token !== TOKEN) {
        throw new AppError('PREVIEW_NOT_FOUND', 'Pré-visualização não encontrada.');
      }
      return { tempPath: imagePath, image: { mimeType: 'image/png' } };
    },
    async discardPreview(token) {
      calls.discard.push(token);
      return true;
    },
  };

  const previewStore = { size: () => 1 };
  const handler = createRequestHandler({ config, logger, pipeline, previewStore });
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();

  return { root, png, records, calls, port };
}

test('health, config and static UI endpoints respond with security headers', async (t) => {
  const { port } = await setup(t);

  const health = await request(port, { path: '/api/health' });
  assert.equal(health.status, 200);
  assert.equal(parseJson(health).ok, true);
  assert.match(health.headers['content-security-policy'], /default-src 'self'/);
  assert.equal(health.headers['x-content-type-options'], 'nosniff');
  assert.equal(health.headers['x-frame-options'], 'DENY');

  const config = await request(port, { path: '/api/config' });
  assert.equal(config.status, 200);
  const configBody = parseJson(config);
  assert.ok(configBody.supportedPlatforms.some((platform) => platform.id === 'pexels'));
  assert.ok(configBody.supportedPlatforms.some((platform) => platform.id === 'wikimedia'));
  assert.equal(configBody.api.pexels, false);

  const index = await request(port, { path: '/' });
  assert.equal(index.status, 200);
  assert.match(index.headers['content-type'], /text\/html/);
  assert.match(index.body.toString('utf8'), /<html/i);
});

test('POST /api/extract validates JSON bodies and returns the preview', async (t) => {
  const { port, calls } = await setup(t);

  const ok = await request(port, { method: 'POST', path: '/api/extract', ...jsonBody({ url: 'https://example.com/photo.png' }) });
  assert.equal(ok.status, 200);
  const body = parseJson(ok);
  assert.equal(body.token, TOKEN);
  assert.equal(body.status, 'ready');
  assert.deepEqual(calls.extract, ['https://example.com/photo.png']);

  const missing = await request(port, { method: 'POST', path: '/api/extract', ...jsonBody({}) });
  assert.equal(missing.status, 400);
  assert.equal(parseJson(missing).error.code, 'VALIDATION_ERROR');

  const wrongType = await request(port, {
    method: 'POST',
    path: '/api/extract',
    headers: { 'content-type': 'text/plain' },
    body: '{"url":"https://example.com"}',
  });
  assert.equal(wrongType.status, 400);
  assert.equal(parseJson(wrongType).error.code, 'VALIDATION_ERROR');

  const notAllowed = await request(port, { path: '/api/extract' });
  assert.equal(notAllowed.status, 405);
  assert.equal(notAllowed.headers.allow, 'POST');
});

test('POST /api/confirm validates the preview token and passes metadata through', async (t) => {
  const { port, calls } = await setup(t);

  const ok = await request(port, {
    method: 'POST',
    path: '/api/confirm',
    ...jsonBody({
      token: TOKEN,
      metadata: { author: 'Ana', license: 'CC0 1.0' },
      classification: { people_visible: true },
    }),
  });
  assert.equal(ok.status, 201);
  assert.equal(parseJson(ok).record.author, 'Ana');
  assert.equal(calls.confirm[0].token, TOKEN);
  assert.equal(calls.confirm[0].metadata.author, 'Ana');
  assert.equal(calls.confirm[0].classification.people_visible, true);

  const invalid = await request(port, {
    method: 'POST',
    path: '/api/confirm',
    ...jsonBody({ token: 'not-a-token' }),
  });
  assert.equal(invalid.status, 400);
  assert.equal(parseJson(invalid).error.code, 'VALIDATION_ERROR');

  const missing = await request(port, {
    method: 'POST',
    path: '/api/confirm',
    ...jsonBody({ token: 'c'.repeat(32) }),
  });
  assert.equal(missing.status, 404);
  assert.equal(parseJson(missing).error.code, 'PREVIEW_NOT_FOUND');
});

test('records endpoints list, read, update and reject invalid methods', async (t) => {
  const { port, calls } = await setup(t);

  const list = await request(port, { path: '/api/records' });
  assert.equal(list.status, 200);
  assert.equal(parseJson(list).records.length, 1);

  const one = await request(port, { path: '/api/records/image_001.png' });
  assert.equal(one.status, 200);
  assert.equal(parseJson(one).record.file_name, 'image_001.png');

  const updated = await request(port, {
    method: 'PATCH',
    path: '/api/records/image_001.png',
    ...jsonBody({ author: 'New Author', annotation_status: 'approved' }),
  });
  assert.equal(updated.status, 200);
  assert.equal(parseJson(updated).record.author, 'New Author');
  assert.equal(calls.update[0].fileName, 'image_001.png');

  const invalidStatus = await request(port, {
    method: 'PATCH',
    path: '/api/records/image_001.png',
    ...jsonBody({ annotation_status: 'done' }),
  });
  assert.equal(invalidStatus.status, 400);
  assert.equal(parseJson(invalidStatus).error.code, 'VALIDATION_ERROR');

  const missing = await request(port, { path: '/api/records/missing.png' });
  assert.equal(missing.status, 404);

  const wrongMethod = await request(port, { method: 'POST', path: '/api/records' });
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.allow, 'GET');
});

test('preview and dataset image endpoints stream bytes and reject traversal', async (t) => {
  const { port, png } = await setup(t);

  const preview = await request(port, { path: `/api/previews/${TOKEN}/image` });
  assert.equal(preview.status, 200);
  assert.equal(preview.headers['content-type'], 'image/png');
  assert.deepEqual(preview.body, png);

  const dataset = await request(port, { path: '/dataset/images/image_001.png' });
  assert.equal(dataset.status, 200);
  assert.deepEqual(dataset.body, png);

  const missing = await request(port, { path: '/dataset/images/package.json' });
  assert.equal(missing.status, 404);

  const traversal = await request(port, { path: '/dataset/images/..%2Fpackage.json' });
  assert.equal(traversal.status, 404);
  assert.equal(parseJson(traversal).error.code, 'NOT_FOUND');
});

test('unknown API routes and untrusted hosts/origins are rejected', async (t) => {
  const { port, calls } = await setup(t);

  const unknown = await request(port, { path: '/api/unknown' });
  assert.equal(unknown.status, 404);
  assert.equal(parseJson(unknown).error.code, 'NOT_FOUND');

  const badHost = await request(port, { path: '/api/health', headers: { host: 'evil.example' } });
  assert.equal(badHost.status, 400);
  assert.equal(parseJson(badHost).error.code, 'VALIDATION_ERROR');

  const badOrigin = await request(port, {
    method: 'POST',
    path: '/api/extract',
    headers: {
      'content-type': 'application/json',
      origin: 'http://evil.example',
    },
    body: JSON.stringify({ url: 'https://example.com/photo.png' }),
  });
  assert.equal(badOrigin.status, 400);
  assert.equal(parseJson(badOrigin).error.code, 'VALIDATION_ERROR');
  assert.deepEqual(calls.extract, []);
});
