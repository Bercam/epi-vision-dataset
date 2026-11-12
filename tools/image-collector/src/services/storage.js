import fs from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '../errors.js';
import { standardFileName } from '../image/filename.js';

const STANDARD_NAME_PATTERN = /^image_(\d+)\.(jpg|jpeg|png|webp|gif)$/i;

function parseStandardName(fileName) {
  const match = String(fileName ?? '').match(STANDARD_NAME_PATTERN);
  if (!match) {
    return null;
  }
  return { index: Number.parseInt(match[1], 10), extension: `.${match[2].toLowerCase()}` };
}

export function createStorage({ imagesDir, logger }) {
  async function ensureDirectories() {
    await fs.mkdir(imagesDir, { recursive: true });
  }

  async function listImageFiles() {
    await ensureDirectories();
    const entries = await fs.readdir(imagesDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && STANDARD_NAME_PATTERN.test(entry.name))
      .map((entry) => entry.name);
  }

  async function allocateFileName({ extension, records = [] }) {
    await ensureDirectories();
    const files = await listImageFiles();
    const usedIndices = new Set();
    const placeholderIndices = new Set();
    const allRowIndices = new Set();

    for (const fileName of files) {
      const parsed = parseStandardName(fileName);
      if (parsed) {
        usedIndices.add(parsed.index);
      }
    }

    for (const record of records) {
      const parsed = parseStandardName(record.file_name);
      if (!parsed) {
        continue;
      }
      allRowIndices.add(parsed.index);
      const isPlaceholder =
        !record.sha256 &&
        !record.source_url &&
        !record.direct_image_url &&
        !files.includes(record.file_name);
      if (isPlaceholder && parsed.extension === extension) {
        placeholderIndices.add(parsed.index);
      }
    }

    const candidates = [...placeholderIndices].sort((a, b) => a - b);
    for (const index of candidates) {
      if (!usedIndices.has(index)) {
        return {
          fileName: standardFileName(index, extension),
          index,
          reusedPlaceholder: true,
        };
      }
    }

    let index = 1;
    while (usedIndices.has(index) || allRowIndices.has(index)) {
      index += 1;
    }
    return { fileName: standardFileName(index, extension), index, reusedPlaceholder: false };
  }

  async function moveIntoPlace({ tempPath, fileName }) {
    const safeName = path.basename(fileName);
    if (!STANDARD_NAME_PATTERN.test(safeName)) {
      throw new AppError('CONFIRM_CONFLICT', 'Nome de arquivo padronizado inválido.');
    }
    const resolvedDir = path.resolve(imagesDir);
    const finalPath = path.join(resolvedDir, safeName);
    if (path.dirname(finalPath) !== resolvedDir) {
      throw new AppError('CONFIRM_CONFLICT', 'Destino de arquivo inválido.');
    }
    try {
      await fs.copyFile(tempPath, finalPath, fs.constants.COPYFILE_EXCL);
    } catch (error) {
      if (error.code === 'EEXIST') {
        throw new AppError('CONFIRM_CONFLICT', 'O arquivo de destino já existe; nada foi sobrescrito.');
      }
      throw new AppError('CATALOG_WRITE_FAILED', 'Não foi possível gravar a imagem no dataset.', { cause: error });
    }
    logger?.debug?.('image_copied_into_dataset', { fileName: safeName });
    return finalPath;
  }

  async function removeFile(fileName) {
    const safeName = path.basename(String(fileName ?? ''));
    if (!STANDARD_NAME_PATTERN.test(safeName)) {
      return;
    }
    await fs.unlink(path.join(imagesDir, safeName)).catch((error) => {
      if (error.code !== 'ENOENT') {
        logger?.warn?.('image_rollback_failed', { fileName: safeName, error });
      }
    });
  }

  async function getImagePath(fileName) {
    const safeName = path.basename(String(fileName ?? ''));
    if (!STANDARD_NAME_PATTERN.test(safeName)) {
      throw new AppError('NOT_FOUND', 'Imagem não encontrada.');
    }
    const filePath = path.join(imagesDir, safeName);
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        throw new AppError('NOT_FOUND', 'Imagem não encontrada.');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('NOT_FOUND', 'Imagem não encontrada.', { cause: error });
    }
    return filePath;
  }

  return {
    ensureDirectories,
    listImageFiles,
    allocateFileName,
    moveIntoPlace,
    removeFile,
    getImagePath,
    parseStandardName,
  };
}
