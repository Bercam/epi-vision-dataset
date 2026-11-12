import path from 'node:path';
import { cleanString } from '../util/text.js';
import { getUrlBasename } from '../util/url.js';

const FORMAT_EXTENSIONS = {
  jpeg: '.jpg',
  png: '.png',
  webp: '.webp',
  gif: '.gif',
};

export function extensionForFormat(format) {
  return FORMAT_EXTENSIONS[format] ?? '';
}

export function filenameFromContentDisposition(header) {
  if (typeof header !== 'string' || header.trim() === '') {
    return '';
  }
  const extended = header.match(/filename\*\s*=\s*([^;]+)/i);
  if (extended) {
    let value = extended[1].trim().replace(/^"|"$/g, '');
    const parts = value.split("''");
    if (parts.length === 2) {
      value = parts[1];
    }
    try {
      value = decodeURIComponent(value);
    } catch {
      // Keep the raw value when percent-decoding fails.
    }
    return sanitizeOriginalFilename(value);
  }
  const simple = header.match(/filename\s*=\s*("([^"]*)"|'([^']*)'|([^;]+))/i);
  if (simple) {
    return sanitizeOriginalFilename(simple[2] ?? simple[3] ?? simple[4] ?? '');
  }
  return '';
}

export function sanitizeOriginalFilename(value) {
  const base = path.basename(String(value ?? '').replace(/\\/g, '/'));
  return cleanString(base, { maxLength: 255 })
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[<>:"|?*]/g, '_')
    .trim();
}

export function originalFilenameFromUrl(url) {
  return sanitizeOriginalFilename(getUrlBasename(url));
}

export function titleFromFilename(filename) {
  if (!filename) {
    return '';
  }
  const base = path.basename(filename);
  const withoutExtension = base.slice(0, base.length - path.extname(base).length);
  return cleanString(withoutExtension.replace(/[-_]+/g, ' '), { maxLength: 300 });
}

export function standardFileName(index, extension) {
  const padded = String(index).padStart(Math.max(3, String(index).length), '0');
  return `image_${padded}${extension}`;
}
