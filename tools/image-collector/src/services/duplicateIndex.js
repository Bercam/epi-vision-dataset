import fs from 'node:fs/promises';
import path from 'node:path';
import { createMutex } from '../util/mutex.js';
import { sha256File } from '../image/hash.js';

export function createDuplicateIndex({ imagesDir, catalog, logger }) {
  const mutex = createMutex();
  const hashCache = new Map();
  const byHash = new Map();
  let built = false;

  async function scanFile(fileName) {
    const filePath = path.join(imagesDir, fileName);
    const stat = await fs.stat(filePath);
    const cached = hashCache.get(fileName);
    if (cached && cached.size === stat.size && cached.mtimeMs === stat.mtimeMs) {
      return cached.sha256;
    }
    const sha256 = await sha256File(filePath);
    hashCache.set(fileName, { size: stat.size, mtimeMs: stat.mtimeMs, sha256 });
    return sha256;
  }

  async function build() {
    const records = await catalog.listRecords();
    byHash.clear();

    for (const record of records) {
      if (record.sha256 && record.file_name) {
        if (!byHash.has(record.sha256.toLowerCase())) {
          byHash.set(record.sha256.toLowerCase(), {
            fileName: record.file_name,
            record,
            untracked: false,
          });
        }
      }
    }

    let files = [];
    try {
      const entries = await fs.readdir(imagesDir, { withFileTypes: true });
      files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger?.warn?.('duplicate_scan_failed', { error });
      }
    }

    for (const fileName of files) {
      try {
        const sha256 = await scanFile(fileName);
        const existing = byHash.get(sha256);
        if (!existing) {
          const record = records.find((item) => item.file_name === fileName) ?? null;
          byHash.set(sha256, { fileName, record, untracked: !record });
        }
      } catch (error) {
        logger?.warn?.('duplicate_file_hash_failed', { fileName, error });
      }
    }

    built = true;
    logger?.info?.('duplicate_index_built', { hashes: byHash.size, files: files.length });
  }

  async function ensureBuilt() {
    if (built) {
      return;
    }
    await mutex(async () => {
      if (!built) {
        await build();
      }
    });
  }

  async function find(sha256) {
    if (!sha256) {
      return null;
    }
    await ensureBuilt();
    return byHash.get(sha256.toLowerCase()) ?? null;
  }

  async function add(fileName, sha256) {
    if (!fileName || !sha256) {
      return;
    }
    await ensureBuilt();
    const key = sha256.toLowerCase();
    const existing = byHash.get(key);
    if (!existing) {
      byHash.set(key, { fileName, record: null, untracked: false });
    }
  }

  async function refresh() {
    await mutex(async () => {
      built = false;
      await build();
    });
  }

  return { find, add, refresh, ensureBuilt };
}
