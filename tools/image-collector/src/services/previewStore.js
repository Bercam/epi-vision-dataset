import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '../errors.js';

export function createPreviewStore({ tempDir, ttlMs, logger }) {
  const entries = new Map();
  let timer = null;

  async function ensureTempDir() {
    await fs.mkdir(tempDir, { recursive: true });
  }

  async function allocate(extension) {
    await ensureTempDir();
    const token = crypto.randomUUID().replace(/-/g, '');
    const safeExtension = String(extension ?? '').match(/^\.[a-z0-9]+$/i) ? extension.toLowerCase() : '.bin';
    const tempPath = path.join(tempDir, `preview_${token}${safeExtension}`);
    return { token, tempPath };
  }

  function register(token, data) {
    const now = Date.now();
    entries.set(token, {
      ...data,
      token,
      createdAt: now,
      expiresAt: now + ttlMs,
    });
  }

  function get(token) {
    const entry = entries.get(token);
    if (!entry) {
      throw new AppError('PREVIEW_NOT_FOUND', 'Pré-visualização não encontrada. Extraia a URL novamente.');
    }
    if (entry.expiresAt <= Date.now()) {
      entries.delete(token);
      fs.unlink(entry.tempPath).catch(() => {});
      throw new AppError('PREVIEW_EXPIRED', 'A pré-visualização expirou. Extraia a URL novamente.');
    }
    return entry;
  }

  async function discard(token) {
    const entry = entries.get(token);
    if (!entry) {
      return false;
    }
    entries.delete(token);
    await fs.unlink(entry.tempPath).catch((error) => {
      if (error.code !== 'ENOENT') {
        logger?.warn?.('preview_temp_cleanup_failed', { token, error });
      }
    });
    return true;
  }

  async function cleanupExpired() {
    const now = Date.now();
    const expired = [...entries.values()].filter((entry) => entry.expiresAt <= now);
    for (const entry of expired) {
      entries.delete(entry.token);
      await fs.unlink(entry.tempPath).catch(() => {});
    }
    if (expired.length > 0) {
      logger?.info?.('preview_cleanup', { removed: expired.length });
    }
  }

  function start() {
    if (timer) {
      return;
    }
    timer = setInterval(() => {
      cleanupExpired().catch((error) => logger?.warn?.('preview_cleanup_failed', { error }));
    }, Math.min(Math.max(ttlMs, 60_000), 5 * 60_000));
    timer.unref?.();
  }

  async function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    for (const entry of entries.values()) {
      await fs.unlink(entry.tempPath).catch(() => {});
    }
    entries.clear();
  }

  return {
    allocate,
    register,
    get,
    discard,
    cleanupExpired,
    start,
    stop,
    size: () => entries.size,
  };
}
