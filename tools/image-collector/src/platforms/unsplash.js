import { AppError } from '../errors.js';
import { originalFilenameFromUrl } from '../image/filename.js';
import { parseHtmlMetadata } from '../metadata/htmlMetadata.js';
import { addWarning, buildMetadata, isHtmlContentType, mergePageMetadata, safeJsonParse } from './common.js';

function extractPhotoId(url) {
  const match = url.pathname.match(/\/photos\/(?:.*-)?([A-Za-z0-9_-]{6,})\/?$/);
  return match ? match[1] : '';
}

function deriveOriginalUrl(value) {
  try {
    const url = new URL(value);
    if (url.hostname === 'images.unsplash.com') {
      url.search = '';
      url.hash = '';
      return url.href;
    }
  } catch {
    // Keep the original value when it is not a URL.
  }
  return value;
}

async function fetchApiPhoto(photoId, httpClient, config) {
  const response = await httpClient.request(`https://api.unsplash.com/photos/${photoId}`, {
    maxBytes: config.maxJsonBytes,
    headers: {
      authorization: `Client-ID ${config.unsplashAccessKey}`,
      accept: 'application/json',
    },
  });
  return safeJsonParse(response.body.toString('utf8'), 'Resposta da API do Unsplash');
}

async function fetchPageMetadata(pageUrl, httpClient, config) {
  const response = await httpClient.request(pageUrl, {
    maxBytes: config.maxHtmlBytes,
    headers: { accept: 'text/html,application/xhtml+xml' },
  });
  if (!isHtmlContentType(response.contentType)) {
    throw new AppError('UNSUPPORTED_PLATFORM', 'A página do Unsplash não retornou HTML.');
  }
  return parseHtmlMetadata(response.body.toString('utf8'), response.finalUrl);
}

export const unsplashExtractor = {
  id: 'unsplash',
  displayName: 'Unsplash',

  async extract({ url, kind, httpClient, config, logger }) {
    const photoId = extractPhotoId(url);
    const warnings = [];
    let apiData = null;
    let pageMetadata = null;
    let apiError = null;
    let pageError = null;

    if (config.unsplashAccessKey && photoId) {
      try {
        apiData = await fetchApiPhoto(photoId, httpClient, config);
      } catch (error) {
        apiError = error;
        logger?.warn?.('unsplash_api_failed', { error, photoId });
      }
    } else if (photoId) {
      addWarning(
        warnings,
        'official_api_not_configured',
        'UNSPLASH_ACCESS_KEY não configurada; usando metadados públicos da página. A API oficial é mais confiável.',
      );
    }

    const pageUrl = kind === 'page' ? url.href : apiData?.links?.html || '';
    if (pageUrl) {
      try {
        pageMetadata = await fetchPageMetadata(pageUrl, httpClient, config);
      } catch (error) {
        pageError = error;
        logger?.warn?.('unsplash_page_metadata_failed', { error, pageUrl });
      }
    }

    if (!apiData && !pageMetadata) {
      if (kind === 'direct') {
        const directImageUrl = deriveOriginalUrl(url.href);
        return buildMetadata({
          platform: 'unsplash',
          platformName: 'Unsplash',
          submittedUrl: url.href,
          kind,
          sourcePageUrl: '',
          directImageUrl,
          author: '',
          title: '',
          description: '',
          license: '',
          licenseUrl: '',
          originalFilename: originalFilenameFromUrl(directImageUrl),
          metadataSources: [],
          warnings: [
            ...warnings,
            {
              code: 'direct_image_metadata_limited',
              message: 'URL direta do Unsplash sem página de origem; autoria e licença exigem verificação manual.',
            },
          ],
          extra: { photoId, apiUsed: false },
        });
      }
      throw new AppError(
        'FETCH_FAILED',
        'Não foi possível obter metadados da página do Unsplash. Verifique a URL ou configure UNSPLASH_ACCESS_KEY.',
        { cause: pageError ?? apiError },
      );
    }

    if (apiError) {
      addWarning(warnings, 'unsplash_api_failed', 'A API do Unsplash falhou; foram usados metadados públicos da página.');
    }
    if (pageError && apiData) {
      addWarning(
        warnings,
        'unsplash_page_metadata_unavailable',
        'A página do Unsplash não pôde ser lida; licença e demais campos podem exigir verificação manual.',
      );
    }

    const apiDirectUrl = deriveOriginalUrl(apiData?.urls?.raw || apiData?.urls?.full || apiData?.urls?.regular || '');
    const pageDirectUrl = pageMetadata?.imageUrl ? deriveOriginalUrl(pageMetadata.imageUrl) : '';
    const directImageUrl = apiDirectUrl || pageDirectUrl || (kind === 'direct' ? deriveOriginalUrl(url.href) : '');

    const base = {
      platform: 'unsplash',
      platformName: 'Unsplash',
      submittedUrl: url.href,
      kind,
      sourcePageUrl: apiData?.links?.html || pageMetadata?.canonicalUrl || (kind === 'page' ? url.href : ''),
      directImageUrl,
      author: apiData?.user?.name || '',
      title: apiData?.alt_description || apiData?.description || '',
      description: apiData?.description || apiData?.alt_description || '',
      license: '',
      licenseUrl: '',
      originalFilename: originalFilenameFromUrl(directImageUrl),
      publishedTime: apiData?.created_at || '',
      metadataSources: [...(apiData ? ['unsplash_api'] : []), ...(pageMetadata?.metadataSources ?? [])],
      warnings,
      extra: {
        photoId,
        apiUsed: Boolean(apiData),
        photographerUrl: apiData?.user?.links?.html ?? '',
      },
    };

    const merged = pageMetadata ? mergePageMetadata(base, pageMetadata) : base;
    return buildMetadata(merged);
  },
};
