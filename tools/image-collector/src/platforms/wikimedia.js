import path from 'node:path';
import { AppError } from '../errors.js';
import { originalFilenameFromUrl, titleFromFilename } from '../image/filename.js';
import { cleanString, firstNonEmpty, stripHtml } from '../util/text.js';
import { addWarning, buildMetadata, safeJsonParse } from './common.js';

function parseWikimediaTarget(url) {
  const host = url.hostname.toLowerCase();
  if (host === 'upload.wikimedia.org') {
    const segments = url.pathname.split('/').filter(Boolean);
    const wikiIndex = segments.indexOf('wikipedia');
    const wiki = wikiIndex !== -1 ? segments[wikiIndex + 1] : 'commons';
    const fileName = decodeURIComponent(segments[segments.length - 1] || '');
    if (!fileName) {
      throw new AppError('UNSUPPORTED_PLATFORM', 'Não foi possível identificar o arquivo na URL do Wikimedia.');
    }
    const apiHost = wiki === 'commons' ? 'commons.wikimedia.org' : `${wiki}.wikipedia.org`;
    return {
      apiHost,
      fileTitle: `File:${fileName}`,
      sourcePageUrl: `https://${apiHost}/wiki/File:${encodeURIComponent(fileName)}`,
      directImageUrl: url.href,
      originalFilename: fileName,
    };
  }

  if (!host.endsWith('wikimedia.org') && !host.endsWith('wikipedia.org')) {
    throw new AppError('UNSUPPORTED_PLATFORM', 'A URL não pertence ao Wikimedia Commons ou à Wikipédia.');
  }

  let title = url.searchParams.get('title') ?? '';
  if (!title && url.pathname.startsWith('/wiki/')) {
    title = decodeURIComponent(url.pathname.slice('/wiki/'.length));
  }
  title = title.replace(/_/g, ' ').trim();
  if (!/^file:/i.test(title)) {
    throw new AppError(
      'UNSUPPORTED_PLATFORM',
      'A página do Wikimedia deve ser uma página de arquivo (File:). Páginas de artigos não são suportadas.',
    );
  }

  const normalizedTitle = `File:${title.slice(5).trim()}`;
  const fileName = normalizedTitle.slice(5);
  return {
    apiHost: host,
    fileTitle: normalizedTitle,
    sourcePageUrl: url.href,
    directImageUrl: '',
    originalFilename: fileName,
  };
}

function extValue(extmetadata, key) {
  return stripHtml(extmetadata?.[key]?.value ?? '');
}

function buildApiUrl(apiHost, fileTitle) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata|canonicaltitle',
    redirects: '1',
    titles: fileTitle,
  });
  return `https://${apiHost}/w/api.php?${params.toString()}`;
}

async function fetchImageInfo({ apiHost, fileTitle, httpClient, config }) {
  const response = await httpClient.request(buildApiUrl(apiHost, fileTitle), {
    maxBytes: config.maxJsonBytes,
    headers: { accept: 'application/json' },
  });
  const data = safeJsonParse(response.body.toString('utf8'), 'Resposta da API do Wikimedia');
  const pages = data?.query?.pages;
  const page = Array.isArray(pages) ? pages[0] : pages ? Object.values(pages)[0] : null;
  if (!page || page.missing) {
    throw new AppError('NOT_FOUND', 'Arquivo não encontrado no Wikimedia Commons.');
  }
  const imageInfo = page.imageinfo?.[0];
  if (!imageInfo) {
    throw new AppError('NOT_FOUND', 'A API do Wikimedia não retornou informações da imagem.');
  }
  return { page, imageInfo };
}

export const wikimediaExtractor = {
  id: 'wikimedia',
  displayName: 'Wikimedia Commons',

  async extract({ url, kind, httpClient, config, logger }) {
    const target = parseWikimediaTarget(url);
    const warnings = [];

    let page;
    let imageInfo;
    try {
      ({ page, imageInfo } = await fetchImageInfo({
        apiHost: target.apiHost,
        fileTitle: target.fileTitle,
        httpClient,
        config,
      }));
    } catch (error) {
      if (kind === 'direct' && target.directImageUrl) {
        logger?.warn?.('wikimedia_api_failed', { error, fileTitle: target.fileTitle });
        const fallbackTitle = titleFromFilename(target.originalFilename);
        return buildMetadata({
          platform: 'wikimedia',
          platformName: 'Wikimedia Commons',
          submittedUrl: url.href,
          kind,
          sourcePageUrl: target.sourcePageUrl,
          directImageUrl: target.directImageUrl,
          author: '',
          title: fallbackTitle,
          description: '',
          license: '',
          licenseUrl: '',
          originalFilename: target.originalFilename,
          metadataSources: [],
          warnings: [
            {
              code: 'wikimedia_api_failed',
              message: 'A API do Wikimedia não pôde ser consultada; autoria e licença exigem verificação manual.',
            },
            ...(fallbackTitle
              ? [{ code: 'title_from_filename', message: 'O título foi derivado do nome do arquivo.' }]
              : []),
          ],
          extra: { fileTitle: target.fileTitle, apiUsed: false },
        });
      }
      throw error;
    }

    const extmetadata = imageInfo.extmetadata ?? {};
    const license = firstNonEmpty(
      extValue(extmetadata, 'LicenseShortName'),
      extValue(extmetadata, 'UsageTerms'),
      extValue(extmetadata, 'License'),
    );
    const licenseUrl = firstNonEmpty(extValue(extmetadata, 'LicenseUrl'), extValue(extmetadata, 'LicenseUrl'));
    const artist = firstNonEmpty(extValue(extmetadata, 'Artist'), extValue(extmetadata, 'Attribution'));
    const credit = extValue(extmetadata, 'Credit');
    const author = firstNonEmpty(artist, credit);
    if (!artist && credit) {
      addWarning(warnings, 'author_from_credit', 'O autor foi inferido do campo Credit; confirme a atribuição.');
    }
    if (extValue(extmetadata, 'LicenseShortName') === '' && license) {
      addWarning(warnings, 'license_name_from_usage_terms', 'A licença foi preenchida a partir dos termos de uso.');
    }

    const objectName = extValue(extmetadata, 'ObjectName');
    const description = extValue(extmetadata, 'ImageDescription');
    const originalFilename =
      cleanString(imageInfo.canonicaltitle, { maxLength: 255 }).replace(/^File:/i, '') ||
      target.originalFilename ||
      originalFilenameFromUrl(imageInfo.url ?? '');
    const title = objectName || titleFromFilename(originalFilename);
    if (!objectName && title) {
      addWarning(warnings, 'title_from_filename', 'O título foi derivado do nome do arquivo.');
    }

    const attributionRequired = String(extValue(extmetadata, 'AttributionRequired')).toLowerCase() === 'true';
    if (attributionRequired) {
      addWarning(warnings, 'attribution_required', 'A licença exige atribuição ao autor e à fonte.');
    }
    const copyrighted = String(extValue(extmetadata, 'Copyrighted')).toLowerCase() === 'true';
    if (copyrighted) {
      addWarning(warnings, 'copyrighted_material', 'O arquivo é marcado como protegido por direitos autorais; revise o uso.');
    }

    return buildMetadata({
      platform: 'wikimedia',
      platformName: 'Wikimedia Commons',
      submittedUrl: url.href,
      kind,
      sourcePageUrl: imageInfo.descriptionurl || target.sourcePageUrl,
      directImageUrl: imageInfo.url || target.directImageUrl,
      author,
      title,
      description,
      license,
      licenseUrl,
      originalFilename,
      publishedTime: extValue(extmetadata, 'DateTimeOriginal'),
      metadataSources: ['wikimedia_api'],
      warnings,
      extra: {
        fileTitle: target.fileTitle,
        canonicalTitle: imageInfo.canonicaltitle ?? page.title ?? '',
        credit,
        usageTerms: extValue(extmetadata, 'UsageTerms'),
        attributionRequired,
        copyrighted,
        mime: imageInfo.mime ?? '',
        reportedWidth: imageInfo.width ?? null,
        reportedHeight: imageInfo.height ?? null,
        reportedSize: imageInfo.size ?? null,
        apiUsed: true,
      },
    });
  },
};
