import fs from 'node:fs/promises';
import http from 'node:http';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { createHttpClient } from './http/httpClient.js';
import { createCatalog } from './services/catalog.js';
import { createStorage } from './services/storage.js';
import { createDuplicateIndex } from './services/duplicateIndex.js';
import { createPreviewStore } from './services/previewStore.js';
import { createClassifier } from './services/classifier.js';
import { createPipeline } from './services/pipeline.js';
import { createRequestHandler } from './server/app.js';

async function main() {
  const config = loadConfig();
  const logger = createLogger({ level: config.logLevel });

  const httpClient = createHttpClient({
    logger,
    userAgent: config.userAgent,
    timeoutMs: config.requestTimeoutMs,
    maxRedirects: config.maxRedirects,
    minHostIntervalMs: config.minHostIntervalMs,
    allowPrivateHosts: config.allowPrivateHosts,
  });
  const catalog = createCatalog({
    csvPath: config.csvPath,
    recordsDir: config.recordsDir,
    logger,
  });
  const storage = createStorage({ imagesDir: config.imagesDir, logger });
  const duplicateIndex = createDuplicateIndex({
    imagesDir: config.imagesDir,
    catalog,
    logger,
  });
  const previewStore = createPreviewStore({
    tempDir: config.tempDir,
    ttlMs: config.previewTtlMs,
    logger,
  });
  const classifier = createClassifier();
  const pipeline = createPipeline({
    config,
    logger,
    httpClient,
    catalog,
    storage,
    duplicateIndex,
    previewStore,
    classifier,
  });

  await catalog.ensureDirectories();
  await storage.ensureDirectories();
  await fs.mkdir(config.tempDir, { recursive: true });
  await fs.mkdir(config.annotationsDir, { recursive: true });
  await fs.mkdir(config.yoloDir, { recursive: true });
  await fs.access(config.publicDir);

  const handler = createRequestHandler({ config, logger, pipeline, previewStore });
  const server = http.createServer(handler);
  server.on('clientError', (error, socket) => {
    logger?.warn?.('client_error', { error });
    if (socket.writable) {
      socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, () => {
      server.off('error', reject);
      resolve();
    });
  });
  previewStore.start();

  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : config.port;
  const displayHost = config.host === '0.0.0.0' || config.host === '::' ? 'localhost' : config.host;
  logger.info('server_started', {
    url: `http://${displayHost}:${actualPort}`,
    datasetRoot: config.datasetRoot,
    pexelsApiConfigured: Boolean(config.pexelsApiKey),
    unsplashApiConfigured: Boolean(config.unsplashAccessKey),
  });
  if (config.host !== '127.0.0.1' && config.host !== 'localhost' && config.host !== '::1') {
    logger.warn('server_exposed_without_auth', {
      message: 'O servidor não possui autenticação. Use HOST=127.0.0.1 em ambiente local.',
    });
  }

  let shuttingDown = false;
  async function shutdown(signal, exitCode = 0) {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info('server_shutdown_started', { signal });
    await new Promise((resolve) => server.close(resolve));
    await previewStore.stop();
    logger.info('server_shutdown_completed', { signal });
    process.exit(exitCode);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', (error) => {
    logger.error('uncaught_exception', { error });
    shutdown('uncaughtException', 1);
  });
  process.on('unhandledRejection', (error) => {
    logger.error('unhandled_rejection', { error });
    shutdown('unhandledRejection', 1);
  });
}

main().catch((error) => {
  const logger = createLogger({ level: process.env.LOG_LEVEL ?? 'info' });
  logger.error('server_start_failed', { error });
  process.exit(1);
});
