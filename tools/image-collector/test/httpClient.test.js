import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import zlib from 'node:zlib';
import { createHttpClient } from '../src/http/httpClient.js';
import { createSilentLogger } from '../src/logger.js';

async function startServer(t) {
  let flakyAttempts = 0;
  let limitedAttempts = 0;
  const server = http.createServer((req, res) => {
    switch (req.url) {
      case '/ok':
        res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('hello');
        return;
      case '/flaky':
        flakyAttempts += 1;
        if (flakyAttempts <= 2) {
          res.writeHead(503, { 'content-type': 'text/plain' });
          res.end('temporarily unavailable');
          return;
        }
        res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
        res.end(`recovered after ${flakyAttempts} attempts`);
        return;
      case '/limited':
        limitedAttempts += 1;
        if (limitedAttempts <= 1) {
          res.writeHead(429, { 'content-type': 'text/plain', 'retry-after': '0' });
          res.end('slow down');
          return;
        }
        res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
        res.end(`recovered after ${limitedAttempts} attempts`);
        return;
      case '/always-503':
        res.writeHead(503, { 'content-type': 'text/plain' });
        res.end('unavailable');
        return;
      case '/json':
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end('{"ok":true}');
        return;
      case '/redirect':
        res.writeHead(302, { location: '/ok' });
        res.end();
        return;
      case '/loop':
        res.writeHead(307, { location: '/loop' });
        res.end();
        return;
      case '/missing':
        res.writeHead(404, { 'content-type': 'text/plain', 'retry-after': '3' });
        res.end('not found');
        return;
      case '/large':
        res.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': '2000' });
        res.end(Buffer.alloc(2000, 0x41));
        return;
      case '/gzip': {
        const compressed = zlib.gzipSync(Buffer.from('compressed body'));
        res.writeHead(200, {
          'content-type': 'text/plain; charset=utf-8',
          'content-encoding': 'gzip',
          'content-length': compressed.length,
        });
        res.end(compressed);
        return;
      }
      default:
        res.writeHead(404);
        res.end('unknown');
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

function createClient(overrides = {}) {
  return createHttpClient({
    logger: createSilentLogger(),
    allowPrivateHosts: true,
    timeoutMs: 5_000,
    maxRedirects: 3,
    retryBaseDelayMs: 1,
    maxRetryDelayMs: 1,
    minHostIntervalMs: 0,
    ...overrides,
  });
}

test('http client returns body, headers, content type and final URL', async (t) => {
  const base = await startServer(t);
  const client = createClient();

  const response = await client.request(`${base}/ok`);
  assert.equal(response.status, 200);
  assert.equal(response.body.toString('utf8'), 'hello');
  assert.match(response.contentType, /^text\/plain/);
  assert.equal(response.finalUrl, `${base}/ok`);

  const json = await client.request(`${base}/json`, { maxBytes: 1024 });
  assert.equal(json.body.toString('utf8'), '{"ok":true}');
});

test('http client follows redirects and reports the final URL', async (t) => {
  const base = await startServer(t);
  const client = createClient();

  const response = await client.request(`${base}/redirect`);
  assert.equal(response.status, 200);
  assert.equal(response.body.toString('utf8'), 'hello');
  assert.equal(response.finalUrl, `${base}/ok`);
});

test('http client rejects redirect loops', async (t) => {
  const base = await startServer(t);
  const client = createClient({ maxRedirects: 1 });

  await assert.rejects(() => client.request(`${base}/loop`), { code: 'FETCH_FAILED' });
});

test('http client surfaces upstream HTTP errors with details', async (t) => {
  const base = await startServer(t);
  const client = createClient();

  await assert.rejects(() => client.request(`${base}/missing`), (error) => {
    assert.equal(error.code, 'HTTP_ERROR');
    assert.equal(error.details.upstreamStatus, 404);
    assert.equal(error.details.retryAfter, '3');
    return true;
  });
});

test('http client retries transient upstream failures', async (t) => {
  const base = await startServer(t);
  const client = createClient();

  const response = await client.request(`${base}/flaky`);
  assert.equal(response.status, 200);
  assert.equal(response.body.toString('utf8'), 'recovered after 3 attempts');

  const limited = await client.request(`${base}/limited`);
  assert.equal(limited.status, 200);
  assert.equal(limited.body.toString('utf8'), 'recovered after 2 attempts');
});

test('http client stops retrying and reports the upstream status', async (t) => {
  const base = await startServer(t);
  const client = createClient({ maxRetries: 2 });

  await assert.rejects(() => client.request(`${base}/always-503`), (error) => {
    assert.equal(error.code, 'HTTP_ERROR');
    assert.equal(error.details.upstreamStatus, 503);
    assert.match(error.message, /HTTP 503/);
    return true;
  });
});

test('http client does not retry non-retryable statuses', async (t) => {
  const base = await startServer(t);
  const client = createClient();

  await assert.rejects(() => client.request(`${base}/missing`), (error) => {
    assert.equal(error.details.upstreamStatus, 404);
    return true;
  });
});

test('http client spaces repeated requests to the same host', async (t) => {
  const base = await startServer(t);
  const client = createClient({ minHostIntervalMs: 120 });

  const startedAt = Date.now();
  await client.request(`${base}/ok`);
  await client.request(`${base}/json`);
  const elapsed = Date.now() - startedAt;
  assert.ok(elapsed >= 100, `expected at least 100ms of spacing, got ${elapsed}ms`);
});

test('http client enforces the byte limit before and during download', async (t) => {
  const base = await startServer(t);
  const client = createClient();

  await assert.rejects(() => client.request(`${base}/large`, { maxBytes: 100 }), {
    code: 'DOWNLOAD_TOO_LARGE',
  });
});

test('http client decompresses gzip responses', async (t) => {
  const base = await startServer(t);
  const client = createClient();

  const response = await client.request(`${base}/gzip`);
  assert.equal(response.body.toString('utf8'), 'compressed body');
});

test('http client blocks private addresses, unusual ports and credentials', async () => {
  const client = createClient({ allowPrivateHosts: false });

  await assert.rejects(() => client.request('http://127.0.0.1/'), { code: 'BLOCKED_HOST' });
  await assert.rejects(() => client.request('http://10.0.0.5/'), { code: 'BLOCKED_HOST' });
  await assert.rejects(() => client.request('http://example.com:8080/'), { code: 'BLOCKED_HOST' });
  await assert.rejects(() => client.request('http://user:pass@example.com/'), { code: 'INVALID_URL' });
  await assert.rejects(() => client.request('ftp://example.com/file'), { code: 'UNSUPPORTED_PROTOCOL' });
  await assert.rejects(() => client.request('not a url'), { code: 'INVALID_URL' });
});

test('http client blocks hostnames that resolve to private addresses', async () => {
  const client = createClient({
    allowPrivateHosts: false,
    lookup: async () => [{ address: '192.168.0.10', family: 4 }],
  });

  await assert.rejects(() => client.request('https://example.com/'), { code: 'BLOCKED_HOST' });
});

test('http client resolves public addresses through the injected lookup', async () => {
  const seen = [];
  const client = createClient({
    allowPrivateHosts: false,
    lookup: async (hostname) => {
      seen.push(hostname);
      return [{ address: '93.184.216.34', family: 4 }];
    },
  });

  const addresses = await client.resolveTarget(new URL('https://example.com/photo.png'));
  assert.deepEqual(addresses, [{ address: '93.184.216.34', family: 4 }]);
  assert.deepEqual(seen, ['example.com']);
});
