import fs from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '../errors.js';
import { createMutex } from '../util/mutex.js';
import { escapeCsvCell, parseCsv, rowsToObjects } from '../util/csv.js';

export const REQUIRED_COLUMNS = [
  'file_name',
  'source_name',
  'source_url',
  'direct_image_url',
  'author',
  'title',
  'license',
  'license_url',
  'width',
  'height',
  'file_size',
  'sha256',
  'download_date',
  'download_status',
  'annotation_status',
  'notes',
];

function emptyRecord() {
  return Object.fromEntries(REQUIRED_COLUMNS.map((column) => [column, '']));
}

function normalizeRecord(record) {
  const normalized = emptyRecord();
  for (const column of REQUIRED_COLUMNS) {
    normalized[column] = record[column] === undefined || record[column] === null ? '' : String(record[column]);
  }
  return normalized;
}

function sidecarPath(recordsDir, fileName) {
  const stem = path.basename(fileName, path.extname(fileName));
  return path.join(recordsDir, `${stem}.json`);
}

export function createCatalog({ csvPath, recordsDir, logger }) {
  const writeMutex = createMutex();
  let migrationBackupDone = false;

  async function ensureDirectories() {
    await fs.mkdir(path.dirname(csvPath), { recursive: true });
    await fs.mkdir(recordsDir, { recursive: true });
  }

  async function read() {
    await ensureDirectories();
    let text;
    try {
      text = await fs.readFile(csvPath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { header: [...REQUIRED_COLUMNS], extraColumns: [], records: [], needsMigration: false };
      }
      throw new AppError('CATALOG_WRITE_FAILED', 'Não foi possível ler o catálogo CSV.', { cause: error });
    }

    let parsed;
    try {
      parsed = rowsToObjects(parseCsv(text));
    } catch (error) {
      throw new AppError('CATALOG_WRITE_FAILED', 'O catálogo CSV existente não pôde ser interpretado.', { cause: error });
    }

    const extraColumns = parsed.header.filter((column) => !REQUIRED_COLUMNS.includes(column) && column !== '');
    const records = parsed.records.map((record) => {
      const normalized = normalizeRecord(record);
      for (const column of extraColumns) {
        normalized[column] = record[column] ?? '';
      }
      return normalized;
    });
    const needsMigration = parsed.header.some((column) => !REQUIRED_COLUMNS.includes(column) && column !== '');

    return {
      header: [...REQUIRED_COLUMNS, ...extraColumns],
      extraColumns,
      records,
      needsMigration: parsed.header.length > 0 && parsed.header.join(',') !== [...REQUIRED_COLUMNS, ...extraColumns].join(','),
      hadLegacyHeader: needsMigration || parsed.header.some((column) => !REQUIRED_COLUMNS.includes(column)),
    };
  }

  async function backupOnce() {
    if (migrationBackupDone) {
      return;
    }
    migrationBackupDone = true;
    try {
      await fs.access(csvPath);
    } catch {
      return;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${csvPath}.bak-${stamp}`;
    try {
      await fs.copyFile(csvPath, backupPath);
      logger?.info?.('catalog_backup_created', { backupPath });
    } catch (error) {
      logger?.warn?.('catalog_backup_failed', { error });
    }
  }

  function serialise(header, records) {
    const lines = [header.map((column) => escapeCsvCell(column, { formulaSafe: false })).join(',')];
    for (const record of records) {
      lines.push(header.map((column) => escapeCsvCell(record[column] ?? '', { formulaSafe: false })).join(','));
    }
    return `${lines.join('\n')}\n`;
  }

  async function write(records, extraColumns = []) {
    return writeMutex(async () => {
      await ensureDirectories();
      const header = [...REQUIRED_COLUMNS, ...extraColumns];
      const text = serialise(header, records);
      await backupOnce();
      const tempPath = path.join(path.dirname(csvPath), `.image_sources.${process.pid}.${Date.now()}.tmp`);
      const handle = await fs.open(tempPath, 'w');
      try {
        await handle.writeFile(text, 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      try {
        await fs.rename(tempPath, csvPath);
      } catch (error) {
        await fs.unlink(tempPath).catch(() => {});
        throw new AppError('CATALOG_WRITE_FAILED', 'Não foi possível atualizar o catálogo CSV.', { cause: error });
      }
    });
  }

  async function append(record, extraColumns = []) {
    return writeMutex(async () => {
      const current = await read();
      const normalized = normalizeRecord(record);
      for (const column of current.extraColumns) {
        normalized[column] = record[column] ?? '';
      }
      const records = [...current.records, normalized];
      const header = [...REQUIRED_COLUMNS, ...current.extraColumns];
      const text = serialise(header, records);
      await backupOnce();
      const tempPath = path.join(path.dirname(csvPath), `.image_sources.${process.pid}.${Date.now()}.tmp`);
      const handle = await fs.open(tempPath, 'w');
      try {
        await handle.writeFile(text, 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      try {
        await fs.rename(tempPath, csvPath);
      } catch (error) {
        await fs.unlink(tempPath).catch(() => {});
        throw new AppError('CATALOG_WRITE_FAILED', 'Não foi possível atualizar o catálogo CSV.', { cause: error });
      }
      return normalized;
    });
  }

  async function update(fileName, changes) {
    return writeMutex(async () => {
      const current = await read();
      const index = current.records.findIndex((record) => record.file_name === fileName);
      if (index === -1) {
        throw new AppError('NOT_FOUND', 'Registro não encontrado no catálogo.');
      }
      const allowed = new Set([
        'source_url',
        'author',
        'title',
        'license',
        'license_url',
        'notes',
        'annotation_status',
        'download_status',
      ]);
      const updated = { ...current.records[index] };
      for (const [key, value] of Object.entries(changes)) {
        if (allowed.has(key)) {
          updated[key] = value === undefined || value === null ? '' : String(value);
        }
      }
      const records = [...current.records];
      records[index] = updated;
      const header = [...REQUIRED_COLUMNS, ...current.extraColumns];
      const text = serialise(header, records);
      if (current.needsMigration || current.hadLegacyHeader) {
        await backupOnce();
      }
      const tempPath = path.join(path.dirname(csvPath), `.image_sources.${process.pid}.${Date.now()}.tmp`);
      const handle = await fs.open(tempPath, 'w');
      try {
        await handle.writeFile(text, 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      try {
        await fs.rename(tempPath, csvPath);
      } catch (error) {
        await fs.unlink(tempPath).catch(() => {});
        throw new AppError('CATALOG_WRITE_FAILED', 'Não foi possível atualizar o catálogo CSV.', { cause: error });
      }
      return updated;
    });
  }

  async function readSidecar(fileName) {
    try {
      const text = await fs.readFile(sidecarPath(recordsDir, fileName), 'utf8');
      return JSON.parse(text);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      logger?.warn?.('sidecar_read_failed', { fileName, error });
      return null;
    }
  }

  async function writeSidecar(fileName, data) {
    await ensureDirectories();
    const target = sidecarPath(recordsDir, fileName);
    const tempPath = `${target}.${process.pid}.${Date.now()}.tmp`;
    const handle = await fs.open(tempPath, 'w');
    try {
      await handle.writeFile(`${JSON.stringify(data, null, 2)}\n`, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      await fs.rename(tempPath, target);
    } catch (error) {
      await fs.unlink(tempPath).catch(() => {});
      throw new AppError('CATALOG_WRITE_FAILED', 'Não foi possível gravar os metadados complementares.', { cause: error });
    }
  }

  async function findRecord(fileName) {
    const current = await read();
    return current.records.find((record) => record.file_name === fileName) ?? null;
  }

  async function findBySha256(sha256) {
    if (!sha256) {
      return null;
    }
    const current = await read();
    return current.records.find((record) => record.sha256.toLowerCase() === sha256.toLowerCase()) ?? null;
  }

  async function listRecords() {
    const current = await read();
    return current.records;
  }

  return {
    read,
    write,
    append,
    update,
    readSidecar,
    writeSidecar,
    findRecord,
    findBySha256,
    listRecords,
    ensureDirectories,
    requiredColumns: REQUIRED_COLUMNS,
  };
}
