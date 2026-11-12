import { cleanString, firstNonEmpty, stripHtml } from '../util/text.js';
import { resolveUrl } from '../util/url.js';

function asArray(value) {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function typeNames(node) {
  return asArray(node?.['@type']).map((value) => String(value).toLowerCase());
}

function looksLikeUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

export function extractJsonLd(html) {
  const scripts = [];
  const pattern = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const raw = match[1]
      .replace(/^\s*<!--/, '')
      .replace(/-->\s*$/, '')
      .trim();
    if (!raw) {
      continue;
    }
    try {
      scripts.push(JSON.parse(raw));
    } catch {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start !== -1 && end > start) {
        try {
          scripts.push(JSON.parse(raw.slice(start, end + 1)));
        } catch {
          // Ignore malformed JSON-LD blocks. The caller records a warning.
        }
      }
    }
  }
  return scripts;
}

export function flattenJsonLd(nodes) {
  const result = [];
  const visit = (node) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== 'object') {
      return;
    }
    result.push(node);
    if (node['@graph']) {
      visit(node['@graph']);
    }
    if (node.mainEntity) {
      visit(node.mainEntity);
    }
    if (node.itemListElement) {
      visit(node.itemListElement);
    }
  };
  visit(nodes);
  return result;
}

export function extractName(value) {
  if (typeof value === 'string') {
    return cleanString(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const name = extractName(item);
      if (name) {
        return name;
      }
    }
    return '';
  }
  if (value && typeof value === 'object') {
    return firstNonEmpty(
      extractName(value.name),
      extractName(value.headline),
      extractName(value['@id']),
      extractName(value.url),
    );
  }
  return '';
}

export function extractUrl(value) {
  if (typeof value === 'string') {
    return looksLikeUrl(value) ? value.trim() : '';
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = extractUrl(item);
      if (url) {
        return url;
      }
    }
    return '';
  }
  if (value && typeof value === 'object') {
    return firstNonEmpty(
      extractUrl(value.contentUrl),
      extractUrl(value.url),
      extractUrl(value['@id']),
      extractUrl(value.thumbnailUrl),
    );
  }
  return '';
}

export function extractLicense(value) {
  if (typeof value === 'string') {
    return looksLikeUrl(value) ? { license: '', licenseUrl: value.trim() } : { license: cleanString(value), licenseUrl: '' };
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = extractLicense(item);
      if (result.license || result.licenseUrl) {
        return result;
      }
    }
    return { license: '', licenseUrl: '' };
  }
  if (value && typeof value === 'object') {
    const url = extractUrl(value);
    const name = firstNonEmpty(extractName(value.name), extractName(value.title));
    return { license: name, licenseUrl: url };
  }
  return { license: '', licenseUrl: '' };
}

function findBestImageNode(nodes) {
  const candidates = nodes.filter((node) => {
    const types = typeNames(node);
    return types.some((type) =>
      ['imageobject', 'photograph', 'creativework', 'article', 'newsarticle', 'blogposting'].includes(type),
    );
  });

  for (const node of candidates) {
    if (extractUrl(node.contentUrl) || extractUrl(node.image) || extractUrl(node.thumbnailUrl)) {
      return node;
    }
  }
  return null;
}

export function collectJsonLdMetadata(nodes, pageUrl) {
  const flat = flattenJsonLd(nodes);
  const imageNode = findBestImageNode(flat);
  const firstImage = flat.find((node) => extractUrl(node.image) || extractUrl(node.contentUrl));
  const node = imageNode ?? firstImage ?? flat[0] ?? {};

  const imageCandidate = firstNonEmpty(
    extractUrl(node.contentUrl),
    extractUrl(node.image),
    extractUrl(node.thumbnailUrl),
    extractUrl(node.url),
  );
  const imageUrl = imageCandidate ? resolveUrl(pageUrl, imageCandidate) : '';

  const author = firstNonEmpty(
    extractName(node.author),
    extractName(node.creator),
    extractName(node.creditText),
  );
  const title = firstNonEmpty(extractName(node.name), extractName(node.headline));
  const description = stripHtml(firstNonEmpty(extractName(node.description), extractName(node.caption)));
  const licenseData = extractLicense(node.license);
  const license = firstNonEmpty(licenseData.license, stripHtml(extractName(node.usageTerms)));
  const licenseUrl = firstNonEmpty(licenseData.licenseUrl, extractUrl(node.license));

  return {
    title,
    description,
    imageUrl,
    author,
    license,
    licenseUrl,
    datePublished: firstNonEmpty(node.datePublished, node.uploadDate),
    siteName: firstNonEmpty(extractName(node.publisher), extractName(node.sourceOrganization)),
    hasData: Boolean(title || description || imageUrl || author || license || licenseUrl),
  };
}
