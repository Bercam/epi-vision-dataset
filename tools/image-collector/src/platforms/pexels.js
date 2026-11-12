import { AppError } from '../errors.js';
import { originalFilenameFromUrl } from '../image/filename.js';
import { parseHtmlMetadata } from '../metadata/htmlMetadata.js';
import { isHtmlContentType } from './common.js';
import { addWarning, buildMetadata, mergePageMetadata, safeJsonParse } from './common.js';

function extractPhotoId(url) {
  const pageMatch = url.pathname.match(/\/photo\/(?:.*-)?(\d+)\/?$/i);
  if (pageMatch) {
    return pageMatch[1];
  }
  const directMatch = url.pathname.match(/\/photos\/(\d+)\//i);
  return directMatch ? directMatch[1] : '';
}

function deriveOriginalUrl(value) {
  try {
    const url = new URL(value);
    if (url.hostname === 'images.pexels.com' && /^\/photos\/\d+\//.test(url.pathname)) {
      url.search = '';
      url.hash = '';
      return url.href;
    }
  } catch {
    // Keep the original value when it is not a URL.
  }
  return value;
}

function describeUpstream(error) {
  const status = error?.details?.upstreamStatus;
  if (!status) {
    return '';
  }
  if (status === 429) {
    return ' (HTTP 429 do Pexels; aguarde alguns minutos antes de tentar novamente)';
  }
  if (status === 403) {
    return ' (HTTP 403 do Pexels; possível bloqueio temporário anti-bot, aguarde alguns minutos ou configure PEXELS_API_KEY)';
  }
  return ` (HTTP ${status} do Pexels)`;
}

async function fetchApiPhoto(photoId, httpClient, config) {
  const response = await httpClient.request(`https://api.pexels.com/v1/photos/${photoId}`, {
    maxBytes: config.maxJsonBytes,
    headers: {
      authorization: config.pexelsApiKey,
      accept: 'application/json',
    },
  });
  return safeJsonParse(response.body.toString('utf8'), 'Resposta da API do Pexels');
}

async function fetchPageMetadata(pageUrl, httpClient, config) {
  const response = await httpClient.request(pageUrl, {
    maxBytes: config.maxHtmlBytes,
    headers: { accept: 'text/html,application/xhtml+xml' },
  });
  if (!isHtmlContentType(response.contentType)) {
    throw new AppError('UNSUPPORTED_PLATFORM', 'A página do Pexels não retornou HTML.');
  }
  return parseHtmlMetadata(response.body.toString('utf8'), response.finalUrl);
}

export const pexelsExtractor = {
  id: 'pexels',
  displayName: 'Pexels',

  async extract({ url, kind, httpClient, config, logger }) {
    const photoId = extractPhotoId(url);
    if (kind === 'page' && !photoId) {
      throw new AppError(
        'UNSUPPORTED_URL',
        'Esta página do Pexels não é uma foto individual (busca, coleção ou perfil). Envie a URL de uma foto no formato https://www.pexels.com/photo/... ou o link direto da imagem.',
      );
    }
    const warnings = [];
    let apiData = null;
    let pageMetadata = null;
    let apiError = null;
    let pageError = null;

    if (config.pexelsApiKey && photoId) {
      try {
        apiData = await fetchApiPhoto(photoId, httpClient, config);
      } catch (error) {
        apiError = error;
        logger?.warn?.('pexels_api_failed', { error, photoId });
      }
    } else if (photoId) {
      addWarning(
        warnings,
        'official_api_not_configured',
        'PEXELS_API_KEY não configurada; usando metadados públicos da página. A API oficial é mais confiável.',
      );
    }

    const pageUrl = kind === 'page' ? url.href : apiData?.url || '';
    if (pageUrl) {
      try {
        pageMetadata = await fetchPageMetadata(pageUrl, httpClient, config);
      } catch (error) {
        pageError = error;
        logger?.warn?.('pexels_page_metadata_failed', { error, pageUrl });
      }
    }

    if (!apiData && !pageMetadata) {
      if (kind === 'direct') {
        const directImageUrl = deriveOriginalUrl(url.href);
        return buildMetadata({
          platform: 'pexels',
          platformName: 'Pexels',
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
              message: 'URL direta do Pexels sem página de origem; autoria e licença exigem verificação manual.',
            },
          ],
          extra: { photoId, apiUsed: false },
        });
      }
      throw new AppError(
        'FETCH_FAILED',
        `Não foi possível obter metadados da página do Pexels${describeUpstream(pageError ?? apiError)}. Verifique a URL ou configure PEXELS_API_KEY.`,
        { cause: pageError ?? apiError },
      );
    }

    if (apiError) {
      addWarning(warnings, 'pexels_api_failed', 'A API do Pexels falhou; foram usados metadados públicos da página.');
    }
    if (pageError && apiData) {
      addWarning(
        warnings,
        'pexels_page_metadata_unavailable',
        'A página do Pexels não pôde ser lida; licença e demais campos podem exigir verificação manual.',
      );
    }

    const apiDirectUrl = deriveOriginalUrl(
      apiData?.src?.original || apiData?.src?.large2x || apiData?.src?.large || '',
    );
    const pageDirectUrl = pageMetadata?.imageUrl ? deriveOriginalUrl(pageMetadata.imageUrl) : '';
    const directImageUrl = apiDirectUrl || pageDirectUrl || (kind === 'direct' ? deriveOriginalUrl(url.href) : '');

    const base = {
      platform: 'pexels',
      platformName: 'Pexels',
      submittedUrl: url.href,
      kind,
      sourcePageUrl: apiData?.url || pageMetadata?.canonicalUrl || (kind === 'page' ? url.href : ''),
      directImageUrl,
      author: apiData?.photographer || '',
      title: apiData?.alt || '',
      description: apiData?.alt || '',
      license: '',
      licenseUrl: '',
      originalFilename: originalFilenameFromUrl(directImageUrl),
      publishedTime: '',
      metadataSources: [...(apiData ? ['pexels_api'] : []), ...(pageMetadata?.metadataSources ?? [])],
      warnings,
      extra: {
        photoId,
        apiUsed: Boolean(apiData),
        photographerUrl: apiData?.photographer_url ?? '',
      },
    };

    const merged = pageMetadata ? mergePageMetadata(base, pageMetadata) : base;
    return buildMetadata(merged);
  },
};
