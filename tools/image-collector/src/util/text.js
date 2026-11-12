const NAMED_ENTITIES = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

export function decodeHtmlEntities(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith('#x')) {
      const code = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(code) ? safeFromCodePoint(code, match) : match;
    }
    if (lower.startsWith('#')) {
      const code = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(code) ? safeFromCodePoint(code, match) : match;
    }
    return NAMED_ENTITIES[lower] ?? match;
  });
}

function safeFromCodePoint(code, fallback) {
  try {
    return String.fromCodePoint(code);
  } catch {
    return fallback;
  }
}

export function stripHtml(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return collapseWhitespace(decodeHtmlEntities(value.replace(/<[^>]*>/g, ' ')));
}

export function collapseWhitespace(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanString(value, { maxLength = 2000 } = {}) {
  if (typeof value !== 'string') {
    return '';
  }
  return collapseWhitespace(value).slice(0, maxLength);
}

export function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }
  return '';
}

export function truncate(value, maxLength) {
  const text = String(value ?? '');
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function toIsoDate(value = new Date()) {
  return value.toISOString();
}
