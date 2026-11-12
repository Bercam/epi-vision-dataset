import { AppError } from '../errors.js';
import { originalFilenameFromUrl, titleFromFilename } from '../image/filename.js';
import { parseHtmlMetadata } from '../metadata/htmlMetadata.js';
import { addWarning, buildMetadata, isHtmlContentType, isImageContentType } from './common.js';

function directMetadata({ url, directImageUrl, originalFilename = '', warnings = [], extra = {} }) {
  const filename = originalFilename || originalFilenameFromUrl(directImageUrl);
  const title = titleFromFilename(filename);
  const derivedTitleWarning = title
    ? [{ code: 'title_from_filename', message: 'O título foi derivado do nome do arquivo.' }]
    : [];
  return buildMetadata({
    platform: 'generic',
    platformName: url.hostname.replace(/^www\./, ''),
    submittedUrl: url.href,
    kind: 'direct',
    sourcePageUrl: '',
    directImageUrl,
    author: '',
    title,
    description: '',
    license: '',
    licenseUrl: '',
    originalFilename: filename,
    metadataSources: [],
    warnings: [
      { code: 'source_page_unavailable', message: 'URL direta sem página de origem identificável.' },
      { code: 'direct_image_metadata_limited', message: 'Metadados de autoria e licença não estão disponíveis apenas pela URL direta.' },
      ...derivedTitleWarning,
      ...warnings,
    ],
    extra,
  });
}

function looksResized(imageUrl) {
  try {
    const url = new URL(imageUrl);
    return ['w', 'h', 'width', 'height', 'fit', 'crop', 'resize', 'q', 'quality', 'dpr'].some((key) =>
      url.searchParams.has(key),
    );
  } catch {
    return false;
  }
}

export const genericExtractor = {
  id: 'generic',
  displayName: 'Generic web page',

  async extract({ url, kind, httpClient, config }) {
    if (kind === 'direct') {
      const filename = originalFilenameFromUrl(url.href);
      return directMetadata({ url, directImageUrl: url.href, originalFilename: filename });
    }

    const response = await httpClient.request(url.href, {
      maxBytes: config.maxImageBytes,
      headers: { accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8' },
    });

    if (isImageContentType(response.contentType)) {
      const filename = originalFilenameFromUrl(response.finalUrl);
      return directMetadata({
        url,
        directImageUrl: response.finalUrl,
        originalFilename: filename,
        warnings: [
          {
            code: 'url_resolved_to_direct_image',
            message: 'A URL informada apontava diretamente para uma imagem, não para uma página.',
          },
        ],
      });
    }

    if (!isHtmlContentType(response.contentType)) {
      throw new AppError(
        'UNSUPPORTED_PLATFORM',
        'A URL não aponta para uma imagem nem para uma página HTML com metadados reconhecíveis.',
      );
    }
    if (response.body.length > config.maxHtmlBytes) {
      throw new AppError('DOWNLOAD_TOO_LARGE', 'A página HTML excede o limite permitido.');
    }

    const html = response.body.toString('utf8');
    const meta = parseHtmlMetadata(html, response.finalUrl);
    if (!meta.imageUrl) {
      throw new AppError(
        'UNSUPPORTED_PLATFORM',
        'Nenhuma imagem foi encontrada nos metadados públicos desta página. Use uma URL direta de imagem ou uma página compatível (Pexels, Unsplash, Wikimedia Commons).',
      );
    }

    const warnings = [...meta.warnings];
    if (looksResized(meta.imageUrl)) {
      addWarning(
        warnings,
        'direct_image_url_may_be_resized',
        'A URL da imagem contém parâmetros de redimensionamento; a resolução original não pôde ser confirmada.',
      );
    }
    if (meta.canonicalUrl && meta.canonicalUrl !== response.finalUrl) {
      addWarning(warnings, 'canonical_url_differs', 'A página informou uma URL canônica diferente da URL acessada.');
    }

    return buildMetadata({
      platform: 'generic',
      platformName: meta.siteName || url.hostname.replace(/^www\./, ''),
      submittedUrl: url.href,
      kind: 'page',
      sourcePageUrl: meta.canonicalUrl || response.finalUrl,
      directImageUrl: meta.imageUrl,
      author: meta.author,
      title: meta.title,
      description: meta.description,
      license: meta.license,
      licenseUrl: meta.licenseUrl,
      originalFilename: originalFilenameFromUrl(meta.imageUrl),
      publishedTime: meta.publishedTime,
      metadataSources: meta.metadataSources,
      warnings,
      extra: {
        canonicalUrl: meta.canonicalUrl,
        siteName: meta.siteName,
        resolvedPageUrl: response.finalUrl,
      },
    });
  },
};
