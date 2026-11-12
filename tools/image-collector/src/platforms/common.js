import { AppError } from '../errors.js';
import { cleanString, firstNonEmpty } from '../util/text.js';
import { isHttpUrl } from '../util/url.js';

export function isHtmlContentType(contentType) {
  return /^(text\/html|application\/xhtml\+xml)\b/i.test(String(contentType ?? ''));
}

export function isImageContentType(contentType) {
  return /^image\//i.test(String(contentType ?? ''));
}

export function safeJsonParse(text, label = 'JSON') {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new AppError('FETCH_FAILED', `${label} inválido recebido do servidor remoto.`, { cause: error });
  }
}

export function addWarning(warnings, code, message) {
  if (!warnings.some((warning) => warning.code === code)) {
    warnings.push({ code, message });
  }
}

export function dedupeWarnings(warnings) {
  const seen = new Set();
  return warnings.filter((warning) => {
    const key = warning.code;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function buildMetadata({
  platform,
  platformName,
  submittedUrl,
  kind,
  sourcePageUrl = '',
  directImageUrl = '',
  author = '',
  title = '',
  description = '',
  license = '',
  licenseUrl = '',
  originalFilename = '',
  publishedTime = '',
  metadataSources = [],
  warnings = [],
  extra = {},
}) {
  const result = {
    platform,
    platformName,
    submittedUrl,
    kind,
    sourcePageUrl: cleanString(sourcePageUrl, { maxLength: 2048 }),
    directImageUrl: cleanString(directImageUrl, { maxLength: 2048 }),
    author: cleanString(author, { maxLength: 300 }),
    title: cleanString(title, { maxLength: 500 }),
    description: cleanString(description, { maxLength: 2000 }),
    license: cleanString(license, { maxLength: 300 }),
    licenseUrl: cleanString(licenseUrl, { maxLength: 2048 }),
    originalFilename: cleanString(originalFilename, { maxLength: 255 }),
    publishedTime: cleanString(publishedTime, { maxLength: 100 }),
    metadataSources: [...new Set(metadataSources.filter(Boolean))],
    warnings: dedupeWarnings(warnings),
    missingFields: [],
    extra: extra && typeof extra === 'object' ? extra : {},
  };

  if (result.sourcePageUrl && !isHttpUrl(result.sourcePageUrl)) {
    result.sourcePageUrl = '';
    addWarning(result.warnings, 'source_url_invalid', 'A URL da página de origem recebida é inválida.');
  }
  if (result.directImageUrl && !isHttpUrl(result.directImageUrl)) {
    result.directImageUrl = '';
    addWarning(result.warnings, 'direct_image_url_invalid', 'A URL direta da imagem recebida é inválida.');
  }
  if (result.licenseUrl && !isHttpUrl(result.licenseUrl)) {
    result.licenseUrl = '';
    addWarning(result.warnings, 'license_url_invalid', 'A URL da licença recebida é inválida.');
  }

  const required = [
    ['source_url', result.sourcePageUrl, 'Página de origem não identificada; verificação manual necessária.'],
    ['author', result.author, 'Autor não identificado; verificação manual necessária.'],
    ['title', result.title, 'Título não identificado; verificação manual necessária.'],
    ['license', result.license, 'Licença não identificada; verificação manual obrigatória.'],
  ];
  for (const [field, value, message] of required) {
    if (!value) {
      result.missingFields.push(field);
      addWarning(result.warnings, `${field}_missing`, message);
    }
  }
  if (result.license && !result.licenseUrl) {
    result.missingFields.push('license_url');
    addWarning(result.warnings, 'license_url_missing', 'Licença identificada sem URL de referência.');
  }
  if (!result.directImageUrl) {
    throw new AppError('UNSUPPORTED_PLATFORM', 'Nenhuma URL direta de imagem foi encontrada para esta página.');
  }
  if (!result.originalFilename) {
    addWarning(result.warnings, 'original_filename_unavailable', 'Nome original do arquivo não identificado.');
  }

  return result;
}

export function mergePageMetadata(base, pageMetadata) {
  return {
    ...base,
    author: firstNonEmpty(base.author, pageMetadata.author),
    title: firstNonEmpty(base.title, pageMetadata.title),
    description: firstNonEmpty(base.description, pageMetadata.description),
    license: firstNonEmpty(base.license, pageMetadata.license),
    licenseUrl: firstNonEmpty(base.licenseUrl, pageMetadata.licenseUrl),
    metadataSources: [...new Set([...(base.metadataSources ?? []), ...(pageMetadata.metadataSources ?? [])])],
    warnings: dedupeWarnings([...(base.warnings ?? []), ...(pageMetadata.warnings ?? [])]),
  };
}
