import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_ROOT = path.resolve(TOOL_ROOT, '..', '..');

function numberFromEnv(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Variável de ambiente ${name} inválida: ${raw}`);
  }
  return value;
}

export function loadConfig(overrides = {}) {
  const datasetRoot = path.resolve(overrides.datasetRoot ?? process.env.DATASET_ROOT ?? path.join(PROJECT_ROOT, 'dataset'));
  const sourcesDir = path.join(datasetRoot, 'sources');

  const config = {
    projectRoot: PROJECT_ROOT,
    toolRoot: TOOL_ROOT,
    datasetRoot,
    imagesDir: path.join(datasetRoot, 'images'),
    sourcesDir,
    recordsDir: path.join(sourcesDir, 'records'),
    csvPath: path.join(sourcesDir, 'image_sources.csv'),
    tempDir: path.join(datasetRoot, '.tmp'),
    annotationsDir: path.join(datasetRoot, 'annotations'),
    yoloDir: path.join(datasetRoot, 'annotations', 'yolo'),
    publicDir: path.join(TOOL_ROOT, 'public'),
    host: overrides.host ?? process.env.HOST ?? '127.0.0.1',
    port: numberFromEnv('PORT', 3000, { min: 0, max: 65535 }),
    maxImageBytes: numberFromEnv('MAX_IMAGE_BYTES', 25 * 1024 * 1024, { min: 1024 }),
    maxHtmlBytes: numberFromEnv('MAX_HTML_BYTES', 5 * 1024 * 1024, { min: 1024 }),
    maxJsonBytes: numberFromEnv('MAX_JSON_BYTES', 2 * 1024 * 1024, { min: 1024 }),
    requestTimeoutMs: numberFromEnv('REQUEST_TIMEOUT_MS', 20_000, { min: 1000 }),
    previewTtlMs: numberFromEnv('PREVIEW_TTL_MS', 30 * 60 * 1000, { min: 60_000 }),
    maxRedirects: numberFromEnv('MAX_REDIRECTS', 5, { min: 0, max: 10 }),
    minHostIntervalMs: numberFromEnv('MIN_HOST_INTERVAL_MS', 1_000, { min: 0, max: 60_000 }),
    userAgent:
      overrides.userAgent ??
      process.env.IMAGE_COLLECTOR_USER_AGENT ??
      'ConcertLabDatasetCollector/1.0 (local dataset tool)',
    logLevel: overrides.logLevel ?? process.env.LOG_LEVEL ?? 'info',
    pexelsApiKey: overrides.pexelsApiKey ?? process.env.PEXELS_API_KEY ?? '',
    unsplashAccessKey: overrides.unsplashAccessKey ?? process.env.UNSPLASH_ACCESS_KEY ?? '',
    allowPrivateHosts: overrides.allowPrivateHosts ?? false,
    rateLimit: overrides.rateLimit ?? { windowMs: 60_000, max: 30 },
  };

  return config;
}
