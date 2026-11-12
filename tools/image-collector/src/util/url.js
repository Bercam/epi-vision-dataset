import path from 'node:path';
import { AppError } from '../errors.js';
import { cleanString } from './text.js';

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.avif',
  '.bmp',
  '.tif',
  '.tiff',
  '.svg',
]);

const PAGE_HOSTS = new Set([
  'pexels.com',
  'www.pexels.com',
  'unsplash.com',
  'www.unsplash.com',
  'commons.wikimedia.org',
]);

const DIRECT_HOSTS = new Set([
  'images.pexels.com',
  'images.unsplash.com',
  'upload.wikimedia.org',
]);

function hostMatches(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function detectPlatform(url) {
  const host = url.hostname.toLowerCase();
  if (hostMatches(host, 'pexels.com')) {
    return 'pexels';
  }
  if (hostMatches(host, 'unsplash.com')) {
    return 'unsplash';
  }
  if (hostMatches(host, 'wikimedia.org') || hostMatches(host, 'wikipedia.org')) {
    return 'wikimedia';
  }
  return 'generic';
}

export function platformDisplayName(platform, url) {
  switch (platform) {
    case 'pexels':
      return 'Pexels';
    case 'unsplash':
      return 'Unsplash';
    case 'wikimedia':
      return 'Wikimedia Commons';
    case 'generic':
      return url ? url.hostname : 'Generic web source';
    default:
      return platform;
  }
}

export function parseHttpUrl(input) {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) {
    throw new AppError('INVALID_URL', 'Informe uma URL de imagem ou de página.');
  }
  if (raw.length > 2048) {
    throw new AppError('INVALID_URL', 'A URL excede o limite de 2048 caracteres.');
  }
  if (/[\u0000-\u001f\u007f]/.test(raw)) {
    throw new AppError('INVALID_URL', 'A URL contém caracteres de controle inválidos.');
  }

  let candidate = raw;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
    if (/^[\w.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(candidate)) {
      candidate = `https://${candidate}`;
    } else {
      throw new AppError('INVALID_URL', 'A URL precisa incluir um esquema http:// ou https://.');
    }
  }

  let url;
  try {
    url = new URL(candidate);
  } catch (error) {
    throw new AppError('INVALID_URL', 'A URL informada não pôde ser interpretada.', { cause: error });
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new AppError('UNSUPPORTED_PROTOCOL', 'Somente URLs http:// e https:// são aceitas.');
  }
  if (!url.hostname) {
    throw new AppError('INVALID_URL', 'A URL não contém um domínio válido.');
  }
  if (url.username || url.password) {
    throw new AppError('INVALID_URL', 'URLs com credenciais embutidas não são aceitas.');
  }

  url.hash = '';
  return url;
}

export function classifyUrl(url) {
  const host = url.hostname.toLowerCase();
  const pathname = url.pathname || '/';
  const extension = path.extname(pathname).toLowerCase();
  const platform = detectPlatform(url);

  if (DIRECT_HOSTS.has(host)) {
    return { kind: 'direct', platform, reason: 'known_direct_host' };
  }
  if (PAGE_HOSTS.has(host) || (platform === 'wikimedia' && pathname.startsWith('/wiki/'))) {
    return { kind: 'page', platform, reason: 'known_page_host' };
  }
  if (IMAGE_EXTENSIONS.has(extension)) {
    return { kind: 'direct', platform, reason: 'image_extension' };
  }
  return { kind: 'page', platform, reason: 'generic_page' };
}

export function isImageExtension(extension) {
  return IMAGE_EXTENSIONS.has(String(extension ?? '').toLowerCase());
}

export function resolveUrl(baseUrl, maybeRelative) {
  if (typeof maybeRelative !== 'string' || maybeRelative.trim() === '') {
    return '';
  }
  try {
    return new URL(maybeRelative.trim(), baseUrl).href;
  } catch {
    return '';
  }
}

export function getUrlBasename(url) {
  try {
    const parsed = typeof url === 'string' ? new URL(url) : url;
    const pathname = decodeURIComponent(parsed.pathname);
    const base = path.basename(pathname);
    return cleanString(base, { maxLength: 255 });
  } catch {
    return '';
  }
}

export function stripQuery(url) {
  try {
    const copy = new URL(url);
    copy.search = '';
    copy.hash = '';
    return copy.href;
  } catch {
    return '';
  }
}

export function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sourceHostLabel(url) {
  return url.hostname.replace(/^www\./, '');
}
