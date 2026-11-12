import { cleanString, decodeHtmlEntities, firstNonEmpty, stripHtml } from '../util/text.js';
import { resolveUrl } from '../util/url.js';
import { collectJsonLdMetadata, extractJsonLd } from './jsonLd.js';

function parseAttributes(tag) {
  const attributes = {};
  const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match;
  while ((match = pattern.exec(tag)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? '';
    attributes[name] = decodeHtmlEntities(value);
  }
  return attributes;
}

function extractTags(html, tagName) {
  const tags = [];
  const pattern = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  let match;
  while ((match = pattern.exec(html)) !== null) {
    tags.push(parseAttributes(match[0]));
  }
  return tags;
}

function extractTitleTag(html) {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]) : '';
}

function extractCanonical(html, pageUrl) {
  const links = extractTags(html, 'link');
  const canonical = links.find((link) => String(link.rel ?? '').toLowerCase().split(/\s+/).includes('canonical'));
  return canonical?.href ? resolveUrl(pageUrl, canonical.href) : '';
}

const GENERIC_LICENSE_LABELS = new Set([
  'license',
  'licence',
  'licença',
  'licencia',
  'license terms',
  'termos de licença',
  'usage terms',
  'termos de uso',
  'terms',
  'termos',
]);

function isGenericLicenseLabel(text) {
  return GENERIC_LICENSE_LABELS.has(String(text ?? '').trim().toLowerCase());
}

// Anchor text is only trustworthy as a license name when it actually names a license.
// Generic call-to-action labels ("License", "Free", "Terms") point to the license page but
// do not identify the license, so the name must stay empty and be verified by a human.
function looksLikeLicenseName(text) {
  const value = String(text ?? '').trim();
  if (value.length < 2 || isGenericLicenseLabel(value)) {
    return false;
  }
  return (
    /creative commons|cc[- ]?(by|0)|public domain|©|copyright|copyleft|\d\.\d/i.test(value) ||
    /\b(pexels|unsplash|pixabay|wikimedia commons)\s+licen[cs]e\b/i.test(value) ||
    /\b(mit|apache|gpl|lgpl|mozilla|odbl)\b/i.test(value)
  );
}

function extractLicenseLink(html, pageUrl) {
  const links = extractTags(html, 'link');
  const relLicense = links.find((link) => String(link.rel ?? '').toLowerCase().split(/\s+/).includes('license'));
  if (relLicense?.href) {
    return {
      license: cleanString(relLicense.title),
      licenseUrl: resolveUrl(pageUrl, relLicense.href),
      source: 'link_rel_license',
    };
  }

  const anchors = [];
  const pattern = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const attributes = parseAttributes(match[0]);
    const text = stripHtml(match[1]);
    if (!attributes.href || !text) {
      continue;
    }
    const href = attributes.href.toLowerCase();
    const lowerText = text.toLowerCase();
    const looksLikeLicense =
      href.includes('/license') ||
      href.includes('creativecommons.org/licenses') ||
      lowerText === 'license' ||
      lowerText === 'licença' ||
      lowerText === 'licencia' ||
      lowerText.endsWith(' license') ||
      lowerText.endsWith(' licença');
    if (looksLikeLicense) {
      anchors.push({ text, url: resolveUrl(pageUrl, attributes.href) });
    }
  }

  if (anchors.length > 0) {
    const informative = anchors.filter((anchor) => looksLikeLicenseName(anchor.text));
    const preferred =
      informative.find((anchor) => /creativecommons|pexels|unsplash/i.test(anchor.url)) ?? informative[0];
    if (preferred) {
      return { license: preferred.text, licenseUrl: preferred.url, source: 'anchor_text' };
    }
    return { license: '', licenseUrl: anchors[0].url, source: 'anchor_text_generic' };
  }

  return { license: '', licenseUrl: '', source: '' };
}

function metaValue(meta, keys) {
  for (const key of keys) {
    const found = meta.find((entry) => String(entry.property ?? entry.name ?? entry.itemprop ?? '').toLowerCase() === key);
    if (found?.content) {
      return found.content;
    }
  }
  return '';
}

export function parseHtmlMetadata(html, pageUrl) {
  const meta = extractTags(html, 'meta');
  const warnings = [];
  const sources = [];

  const ogImage = firstNonEmpty(
    metaValue(meta, ['og:image:secure_url']),
    metaValue(meta, ['og:image:url']),
    metaValue(meta, ['og:image']),
  );
  const twitterImage = metaValue(meta, ['twitter:image', 'twitter:image:src']);
  const jsonLdScripts = extractJsonLd(html);
  const jsonLd = collectJsonLdMetadata(jsonLdScripts, pageUrl);

  const imageCandidate = firstNonEmpty(ogImage, twitterImage, jsonLd.imageUrl);
  const imageUrl = imageCandidate ? resolveUrl(pageUrl, imageCandidate) : '';

  const title = firstNonEmpty(
    metaValue(meta, ['og:title']),
    metaValue(meta, ['twitter:title']),
    jsonLd.title,
    extractTitleTag(html),
  );
  const description = firstNonEmpty(
    metaValue(meta, ['og:description']),
    metaValue(meta, ['twitter:description']),
    metaValue(meta, ['description']),
    jsonLd.description,
  );
  const author = firstNonEmpty(
    jsonLd.author,
    metaValue(meta, ['author']),
    metaValue(meta, ['article:author']),
    metaValue(meta, ['twitter:creator']),
  );
  const licenseLink = extractLicenseLink(html, pageUrl);
  const license = firstNonEmpty(licenseLink.license, jsonLd.license);
  const licenseUrl = firstNonEmpty(licenseLink.licenseUrl, jsonLd.licenseUrl);
  const siteName = firstNonEmpty(metaValue(meta, ['og:site_name']), jsonLd.siteName);
  const canonicalUrl = extractCanonical(html, pageUrl);
  const publishedTime = firstNonEmpty(metaValue(meta, ['article:published_time']), jsonLd.datePublished);

  if (ogImage) sources.push('open_graph');
  if (twitterImage) sources.push('twitter_card');
  if (jsonLd.hasData) sources.push('json_ld');
  if (!ogImage && !twitterImage && !jsonLd.imageUrl) {
    const imageSrc = extractTags(html, 'link').find((link) => String(link.rel ?? '').toLowerCase() === 'image_src');
    if (imageSrc?.href) {
      sources.push('link_image_src');
      return {
        title,
        description,
        imageUrl: resolveUrl(pageUrl, imageSrc.href),
        author,
        license,
        licenseUrl,
        siteName,
        canonicalUrl,
        publishedTime,
        metadataSources: sources,
        warnings,
      };
    }
    warnings.push({ code: 'image_metadata_missing', message: 'Nenhuma imagem foi encontrada nos metadados da página.' });
  }
  if (jsonLdScripts.length > 0 && !jsonLd.hasData) {
    warnings.push({ code: 'json_ld_unusable', message: 'JSON-LD encontrado, mas sem campos utilizáveis.' });
  }
  if (!author) {
    warnings.push({ code: 'author_missing', message: 'Autor não encontrado nos metadados públicos.' });
  }
  if (!license) {
    warnings.push({
      code: 'license_requires_manual_verification',
      message: 'Licença não encontrada na página; verificação manual obrigatória.',
    });
  } else if (!licenseUrl) {
    warnings.push({ code: 'license_url_missing', message: 'Licença encontrada sem URL de referência.' });
  }

  return {
    title,
    description,
    imageUrl,
    author,
    license,
    licenseUrl,
    siteName,
    canonicalUrl,
    publishedTime,
    metadataSources: sources,
    warnings,
  };
}
