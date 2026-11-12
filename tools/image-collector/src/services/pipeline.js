import fs from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '../errors.js';
import { filenameFromContentDisposition, originalFilenameFromUrl, titleFromFilename } from '../image/filename.js';
import { sha256Buffer, sha256File } from '../image/hash.js';
import { validateImage } from '../image/validateImage.js';
import { getExtractor } from '../platforms/index.js';
import { addWarning, dedupeWarnings } from '../platforms/common.js';
import { cleanString, firstNonEmpty, truncate } from '../util/text.js';
import { classifyUrl, parseHttpUrl, platformDisplayName } from '../util/url.js';
import { createMutex } from '../util/mutex.js';
import { normaliseClassification, emptyClassification } from './classifier.js';

const ANNOTATION_STATUSES = new Set(['pending', 'in_review', 'approved', 'rejected']);

function recomputeMissingFields(metadata) {
  const missing = [];
  if (!metadata.sourcePageUrl) {
    missing.push('source_url');
  }
  if (!metadata.author) {
    missing.push('author');
  }
  if (!metadata.title) {
    missing.push('title');
  }
  if (!metadata.license) {
    missing.push('license');
  }
  if (metadata.license && !metadata.licenseUrl) {
    missing.push('license_url');
  }
  metadata.missingFields = missing;

  const resolvedCodes = [];
  if (metadata.sourcePageUrl) resolvedCodes.push('source_url_missing');
  if (metadata.author) resolvedCodes.push('author_missing');
  if (metadata.title) resolvedCodes.push('title_missing');
  if (metadata.license) resolvedCodes.push('license_missing');
  if (metadata.licenseUrl) resolvedCodes.push('license_url_missing');
  metadata.warnings = metadata.warnings.filter((warning) => !resolvedCodes.includes(warning.code));
}

function buildNotes({ metadata, missingFields, userNotes }) {
  const parts = [];
  if (userNotes) {
    parts.push(truncate(userNotes, 1200));
  }
  if (missingFields.length > 0) {
    parts.push(`manual_verification_required: ${missingFields.join(', ')}`);
  }
  if (metadata.originalFilename) {
    parts.push(`original_filename: ${metadata.originalFilename}`);
  }
  const notableWarnings = [
    'license_requires_manual_verification',
    'attribution_required',
    'copyrighted_material',
    'direct_image_url_may_be_resized',
    'title_from_filename',
    'author_from_credit',
    'license_name_from_usage_terms',
    'source_page_unavailable',
    'direct_image_metadata_limited',
    'official_api_not_configured',
    'pexels_api_failed',
    'unsplash_api_failed',
    'wikimedia_api_failed',
    'pexels_page_metadata_unavailable',
    'unsplash_page_metadata_unavailable',
    'canonical_url_differs',
    'url_resolved_to_direct_image',
    'original_filename_unavailable',
    'json_ld_unusable',
    'content_type_mismatch',
  ];
  const codes = metadata.warnings
    .map((warning) => warning.code)
    .filter((code) => notableWarnings.includes(code));
  if (codes.length > 0) {
    parts.push(`warnings: ${[...new Set(codes)].join(', ')}`);
  }
  return truncate(parts.join('; '), 2000);
}

function sidecarFromRecord(record, now) {
  return {
    schema_version: 1,
    file_name: record.file_name,
    created_at: record.download_date || now().toISOString(),
    source: {
      platform: '',
      platform_name: record.source_name,
      submitted_url: '',
      source_page_url: record.source_url,
      direct_image_url: record.direct_image_url,
      metadata_sources: [],
      published_time: '',
      extra: {},
    },
    image: {
      format: '',
      mime_type: '',
      width: Number(record.width) || 0,
      height: Number(record.height) || 0,
      file_size: Number(record.file_size) || 0,
      sha256: record.sha256,
      original_filename: '',
      local_filename: record.file_name,
    },
    extraction: {
      kind: '',
      extracted_at: '',
      warnings: [],
      missing_fields: [],
    },
    classification: {
      values: emptyClassification(),
      status: 'manual_review_required',
      method: 'none',
      note: 'Nenhum modelo local de visão computacional está configurado.',
      reviewed_at: null,
    },
    catalog: {
      download_status: record.download_status,
      annotation_status: record.annotation_status,
      notes: record.notes,
    },
  };
}

function normaliseOverrideMetadata(value) {
  if (value === undefined || value === null) {
    return {};
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError('VALIDATION_ERROR', 'Os metadados revisados devem ser um objeto.');
  }
  const result = {};
  const stringFields = {
    source_url: 2048,
    author: 300,
    title: 500,
    license: 300,
    license_url: 2048,
    notes: 2000,
  };
  for (const [field, maxLength] of Object.entries(stringFields)) {
    if (value[field] === undefined) {
      continue;
    }
    if (value[field] !== null && typeof value[field] !== 'string') {
      throw new AppError('VALIDATION_ERROR', `O campo ${field} deve ser texto.`);
    }
    result[field] = cleanString(value[field] ?? '', { maxLength });
  }
  if (value.sourceUrl !== undefined && result.source_url === undefined) {
    result.source_url = cleanString(value.sourceUrl ?? '', { maxLength: 2048 });
  }
  if (value.licenseUrl !== undefined && result.license_url === undefined) {
    result.license_url = cleanString(value.licenseUrl ?? '', { maxLength: 2048 });
  }
  for (const [field, label] of [
    ['source_url', 'A URL da página de origem'],
    ['license_url', 'A URL da licença'],
  ]) {
    if (!result[field]) {
      continue;
    }
    try {
      const url = new URL(result[field]);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('unsupported protocol');
      }
    } catch {
      throw new AppError('VALIDATION_ERROR', `${label} deve ser http:// ou https://.`);
    }
  }
  return result;
}

export function createPipeline({
  config,
  logger,
  httpClient,
  catalog,
  storage,
  duplicateIndex,
  previewStore,
  classifier,
  now = () => new Date(),
}) {
  const confirmMutex = createMutex();

  async function downloadImage(metadata) {
    const response = await httpClient.request(metadata.directImageUrl, {
      maxBytes: config.maxImageBytes,
      headers: {
        accept: 'image/jpeg,image/png,image/webp,image/gif,image/*;q=0.8',
      },
    });

    if (/^text\/html/i.test(response.contentType)) {
      throw new AppError(
        'INVALID_IMAGE',
        'A URL direta retornou HTML em vez de uma imagem. A página pode exigir autenticação ou bloquear o acesso.',
      );
    }

    const validated = validateImage(response.body);
    const sha256 = sha256Buffer(response.body);
    const contentDisposition = filenameFromContentDisposition(response.headers['content-disposition']);
    const originalFilename =
      contentDisposition ||
      metadata.originalFilename ||
      originalFilenameFromUrl(response.finalUrl) ||
      '';

    if (response.contentType && !response.contentType.startsWith(validated.mimeType)) {
      addWarning(
        metadata.warnings,
        'content_type_mismatch',
        `O servidor declarou ${response.contentType}, mas o arquivo foi identificado como ${validated.mimeType}.`,
      );
    }

    metadata.directImageUrl = response.finalUrl;
    metadata.originalFilename = originalFilename;
    if (!metadata.title && originalFilename) {
      metadata.title = titleFromFilename(originalFilename);
      addWarning(metadata.warnings, 'title_from_filename', 'O título foi derivado do nome do arquivo.');
    }
    metadata.warnings = metadata.warnings.filter((warning) => warning.code !== 'original_filename_unavailable');
    recomputeMissingFields(metadata);

    return {
      body: response.body,
      contentType: response.contentType,
      format: validated.format,
      mimeType: validated.mimeType,
      extension: validated.extension,
      width: validated.width,
      height: validated.height,
      fileSize: response.body.length,
      sha256,
      originalFilename,
      directImageUrl: response.finalUrl,
    };
  }

  async function extract({ url: rawUrl }) {
    const submittedAt = now();
    const url = parseHttpUrl(rawUrl);
    const classification = classifyUrl(url);
    const extractor = getExtractor(classification.platform);
    let allocation = null;

    try {
      const metadata = await extractor.extract({
        url,
        kind: classification.kind,
        httpClient,
        config,
        logger,
      });

      const downloaded = await downloadImage(metadata);
      const { body: imageBody, ...image } = downloaded;
      const duplicate = await duplicateIndex.find(image.sha256);

      allocation = await previewStore.allocate(image.extension);
      await fs.writeFile(allocation.tempPath, imageBody, { mode: 0o600 });
      const writtenHash = await sha256File(allocation.tempPath);
      if (writtenHash !== image.sha256) {
        throw new AppError('CATALOG_WRITE_FAILED', 'A verificação de integridade do arquivo temporário falhou.');
      }

      const classificationResult = classifier.classify({ metadata, image });
      const preview = {
        token: allocation.token,
        status: duplicate ? 'duplicate' : 'ready',
        duplicate: duplicate
          ? {
              fileName: duplicate.fileName,
              untracked: duplicate.untracked,
              record: duplicate.record,
            }
          : null,
        image: {
          format: image.format,
          mimeType: image.mimeType,
          width: image.width,
          height: image.height,
          fileSize: image.fileSize,
          sha256: image.sha256,
          originalFilename: image.originalFilename,
          directImageUrl: image.directImageUrl,
          previewUrl: `/api/previews/${allocation.token}/image`,
        },
        metadata: {
          ...metadata,
          platformName: metadata.platformName || platformDisplayName(metadata.platform, url),
          extractedAt: submittedAt.toISOString(),
          missingFields: metadata.missingFields,
          warnings: metadata.warnings,
        },
        classification: classificationResult,
      };

      previewStore.register(allocation.token, {
        tempPath: allocation.tempPath,
        image,
        metadata,
        classification: classificationResult,
        duplicate,
        extractedAt: submittedAt.toISOString(),
      });

      logger?.info?.('extract_completed', {
        platform: metadata.platform,
        kind: classification.kind,
        duplicate: Boolean(duplicate),
        sha256: image.sha256,
        width: image.width,
        height: image.height,
        fileSize: image.fileSize,
      });

      return preview;
    } catch (error) {
      if (allocation) {
        await previewStore.discard(allocation.token);
      }
      logger?.warn?.('extract_failed', {
        url: url.href,
        code: error.code,
        error,
      });
      throw error;
    }
  }

  async function confirm({ token, metadata: overrideMetadata, classification: overrideClassification }) {
    return confirmMutex(async () => {
      const entry = previewStore.get(token);
      const overrides = normaliseOverrideMetadata(overrideMetadata);
      const duplicate = await duplicateIndex.find(entry.image.sha256);
      if (duplicate) {
        throw new AppError('DUPLICATE_IMAGE', 'Esta imagem já existe no dataset; nenhum arquivo foi gravado.', {
          details: {
            fileName: duplicate.fileName,
            untracked: duplicate.untracked,
            record: duplicate.record,
          },
        });
      }

      const baseMetadata = entry.metadata;
      const sourcePageUrl = overrides.source_url ?? baseMetadata.sourcePageUrl;
      const author = overrides.author ?? baseMetadata.author;
      const title = overrides.title ?? baseMetadata.title;
      const license = overrides.license ?? baseMetadata.license;
      const licenseUrl = overrides.license_url ?? baseMetadata.licenseUrl;
      const missingFields = [];
      if (!sourcePageUrl) missingFields.push('source_url');
      if (!author) missingFields.push('author');
      if (!title) missingFields.push('title');
      if (!license) missingFields.push('license');
      if (license && !licenseUrl) missingFields.push('license_url');

      const notes = buildNotes({
        metadata: { ...baseMetadata, sourcePageUrl, originalFilename: entry.image.originalFilename },
        missingFields,
        userNotes: overrides.notes,
      });

      let fileName = '';
      let finalPath = '';
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const current = await catalog.read();
        const allocation = await storage.allocateFileName({
          extension: entry.image.extension,
          records: current.records,
        });
        try {
          finalPath = await storage.moveIntoPlace({ tempPath: entry.tempPath, fileName: allocation.fileName });
          fileName = allocation.fileName;
          break;
        } catch (error) {
          if (error.code === 'CONFIRM_CONFLICT' && attempt < 2) {
            continue;
          }
          throw error;
        }
      }
      if (!fileName || !finalPath) {
        throw new AppError('CONFIRM_CONFLICT', 'Não foi possível reservar um nome de arquivo único.');
      }

      const downloadDate = now().toISOString();
      const record = {
        file_name: fileName,
        source_name: baseMetadata.platformName,
        source_url: sourcePageUrl,
        direct_image_url: entry.image.directImageUrl,
        author,
        title,
        license,
        license_url: licenseUrl,
        width: String(entry.image.width),
        height: String(entry.image.height),
        file_size: String(entry.image.fileSize),
        sha256: entry.image.sha256,
        download_date: downloadDate,
        download_status: missingFields.length > 0 ? 'downloaded_metadata_pending' : 'downloaded',
        annotation_status: 'pending',
        notes,
      };

      try {
        await catalog.append(record);
      } catch (error) {
        await storage.removeFile(fileName);
        logger?.error?.('confirm_catalog_write_failed', { fileName, error });
        throw error;
      }

      const suppliedClassification = normaliseClassification(overrideClassification);
      const hasHumanClassification = Object.values(suppliedClassification).some((value) => value !== null);
      const classificationValues = hasHumanClassification
        ? suppliedClassification
        : entry.classification?.suggestions ?? emptyClassification();
      const classification = {
        values: classificationValues,
        status: hasHumanClassification ? 'human_supplied' : entry.classification?.status ?? 'manual_review_required',
        method: hasHumanClassification ? 'human_review' : entry.classification?.method ?? 'none',
        note: hasHumanClassification
          ? 'Valores informados por revisão humana. Não são anotações de ground truth.'
          : entry.classification?.note ?? '',
        reviewed_at: hasHumanClassification ? downloadDate : null,
      };

      const sidecar = {
        schema_version: 1,
        file_name: fileName,
        created_at: downloadDate,
        source: {
          platform: baseMetadata.platform,
          platform_name: baseMetadata.platformName,
          submitted_url: baseMetadata.submittedUrl,
          source_page_url: sourcePageUrl,
          direct_image_url: entry.image.directImageUrl,
          metadata_sources: baseMetadata.metadataSources,
          published_time: baseMetadata.publishedTime,
          extra: baseMetadata.extra,
        },
        image: {
          format: entry.image.format,
          mime_type: entry.image.mimeType,
          width: entry.image.width,
          height: entry.image.height,
          file_size: entry.image.fileSize,
          sha256: entry.image.sha256,
          original_filename: entry.image.originalFilename,
          local_filename: fileName,
        },
        extraction: {
          kind: baseMetadata.kind,
          extracted_at: entry.extractedAt,
          warnings: baseMetadata.warnings,
          missing_fields: missingFields,
        },
        classification,
        catalog: {
          download_status: record.download_status,
          annotation_status: record.annotation_status,
          notes: record.notes,
        },
      };

      try {
        await catalog.writeSidecar(fileName, sidecar);
      } catch (error) {
        logger?.warn?.('sidecar_write_failed', { fileName, error });
      }

      await previewStore.discard(token);
      await duplicateIndex.add(fileName, entry.image.sha256);

      logger?.info?.('confirm_completed', {
        fileName,
        platform: baseMetadata.platform,
        missingFields,
        fileSize: entry.image.fileSize,
      });

      return { record, sidecar, image: entry.image };
    });
  }

  async function listRecords() {
    const records = await catalog.listRecords();
    return Promise.all(
      records.map(async (record) => {
        const sidecar = await catalog.readSidecar(record.file_name);
        return {
          ...record,
          thumbnailUrl: record.file_name ? `/dataset/images/${encodeURIComponent(record.file_name)}` : '',
          details: sidecar,
          licenseNeedsReview: !record.license || !record.license_url,
        };
      }),
    );
  }

  async function updateRecord(fileName, changes = {}) {
    if (typeof changes !== 'object' || changes === null || Array.isArray(changes)) {
      throw new AppError('VALIDATION_ERROR', 'Alterações inválidas.');
    }
    const stringFieldLimits = {
      source_url: 2048,
      author: 300,
      title: 500,
      license: 300,
      license_url: 2048,
      notes: 2000,
    };
    const normalized = {};
    for (const [field, maxLength] of Object.entries(stringFieldLimits)) {
      if (changes[field] !== undefined) {
        if (typeof changes[field] !== 'string') {
          throw new AppError('VALIDATION_ERROR', `O campo ${field} deve ser texto.`);
        }
        normalized[field] = cleanString(changes[field], { maxLength });
      }
    }
    if (changes.sourceUrl !== undefined && normalized.source_url === undefined) {
      normalized.source_url = cleanString(changes.sourceUrl, { maxLength: 2048 });
    }
    if (changes.licenseUrl !== undefined && normalized.license_url === undefined) {
      normalized.license_url = cleanString(changes.licenseUrl, { maxLength: 2048 });
    }
    for (const [field, label] of [
      ['source_url', 'A URL da página de origem'],
      ['license_url', 'A URL da licença'],
    ]) {
      if (!normalized[field]) {
        continue;
      }
      try {
        const url = new URL(normalized[field]);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          throw new Error('unsupported protocol');
        }
      } catch {
        throw new AppError('VALIDATION_ERROR', `${label} deve ser http:// ou https://.`);
      }
    }
    if (changes.annotation_status !== undefined) {
      if (!ANNOTATION_STATUSES.has(changes.annotation_status)) {
        throw new AppError('VALIDATION_ERROR', 'Status de anotação inválido.');
      }
      normalized.annotation_status = changes.annotation_status;
    }

    let updated = await catalog.update(fileName, normalized);

    const missingFields = [];
    if (!updated.source_url) missingFields.push('source_url');
    if (!updated.author) missingFields.push('author');
    if (!updated.title) missingFields.push('title');
    if (!updated.license) missingFields.push('license');
    if (updated.license && !updated.license_url) missingFields.push('license_url');

    if (String(updated.download_status || '').startsWith('downloaded')) {
      const desired = missingFields.length > 0 ? 'downloaded_metadata_pending' : 'downloaded';
      if (desired !== updated.download_status) {
        updated = await catalog.update(fileName, { download_status: desired });
      }
    }

    let sidecar = await catalog.readSidecar(fileName);
    if (!sidecar && updated.sha256) {
      sidecar = sidecarFromRecord(updated, now);
    }
    if (sidecar) {
      if (normalized.source_url !== undefined) {
        sidecar.source = {
          ...(sidecar.source ?? {}),
          source_page_url: updated.source_url,
        };
      }
      sidecar.catalog = {
        ...(sidecar.catalog ?? {}),
        download_status: updated.download_status,
        annotation_status: updated.annotation_status,
        notes: updated.notes,
      };
      sidecar.extraction = {
        ...(sidecar.extraction ?? {}),
        missing_fields: missingFields,
      };
      if (changes.classification !== undefined) {
        const values = normaliseClassification(changes.classification);
        const hasHuman = Object.values(values).some((value) => value !== null);
        sidecar.classification = {
          values,
          status: hasHuman ? 'human_supplied' : 'manual_review_required',
          method: hasHuman ? 'human_review' : 'none',
          note: hasHuman
            ? 'Valores informados por revisão humana. Não são anotações de ground truth.'
            : 'Nenhum modelo local de visão computacional está configurado.',
          reviewed_at: hasHuman ? now().toISOString() : null,
        };
      }
      sidecar.updated_at = now().toISOString();
      try {
        await catalog.writeSidecar(fileName, sidecar);
      } catch (error) {
        logger?.warn?.('sidecar_update_failed', { fileName, error });
      }
    }
    return updated;
  }

  async function getImagePath(fileName) {
    return storage.getImagePath(fileName);
  }

  async function discardPreview(token) {
    return previewStore.discard(token);
  }

  function getPreview(token) {
    return previewStore.get(token);
  }

  return {
    extract,
    confirm,
    listRecords,
    updateRecord,
    getImagePath,
    discardPreview,
    getPreview,
  };
}
