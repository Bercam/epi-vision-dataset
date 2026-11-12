import assert from 'node:assert/strict';
import test from 'node:test';
import { genericExtractor } from '../src/platforms/generic.js';
import { pexelsExtractor } from '../src/platforms/pexels.js';
import { unsplashExtractor } from '../src/platforms/unsplash.js';
import { wikimediaExtractor } from '../src/platforms/wikimedia.js';
import { classifyUrl, parseHttpUrl } from '../src/util/url.js';
import { createFakeHttpClient, fakeHttpResponse } from './helpers/fixtures.js';

const config = {
  maxHtmlBytes: 1024 * 1024,
  maxJsonBytes: 1024 * 1024,
  maxImageBytes: 1024 * 1024,
  pexelsApiKey: '',
  unsplashAccessKey: '',
};

function htmlResponse(url, html) {
  return fakeHttpResponse(url, Buffer.from(html), 'text/html; charset=utf-8');
}

test('generic extractor handles a direct image URL without extra requests', async () => {
  const url = parseHttpUrl('https://example.com/photos/worker.png');
  const metadata = await genericExtractor.extract({
    url,
    kind: classifyUrl(url).kind,
    httpClient: createFakeHttpClient({}),
    config,
  });
  assert.equal(metadata.kind, 'direct');
  assert.equal(metadata.directImageUrl, 'https://example.com/photos/worker.png');
  assert.equal(metadata.originalFilename, 'worker.png');
  assert.equal(metadata.title, 'worker');
  assert.ok(metadata.missingFields.includes('author'));
  assert.ok(metadata.missingFields.includes('license'));
});

test('generic extractor reads Open Graph metadata from a page', async () => {
  const pageUrl = 'https://example.com/gallery/worker';
  const imageUrl = 'https://cdn.example.com/images/worker.jpg';
  const html = `
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:title" content="Worker with helmet">
    <meta name="author" content="Jane Doe">
    <link rel="license" href="https://creativecommons.org/licenses/by/4.0/" title="CC BY 4.0">
    <link rel="canonical" href="${pageUrl}">`;
  const httpClient = createFakeHttpClient({
    [pageUrl]: htmlResponse(pageUrl, html),
  });
  const metadata = await genericExtractor.extract({
    url: parseHttpUrl(pageUrl),
    kind: 'page',
    httpClient,
    config,
  });
  assert.equal(metadata.platform, 'generic');
  assert.equal(metadata.sourcePageUrl, pageUrl);
  assert.equal(metadata.directImageUrl, imageUrl);
  assert.equal(metadata.title, 'Worker with helmet');
  assert.equal(metadata.author, 'Jane Doe');
  assert.equal(metadata.license, 'CC BY 4.0');
  assert.equal(metadata.licenseUrl, 'https://creativecommons.org/licenses/by/4.0/');
});

test('Pexels extractor rejects search and collection pages', async () => {
  for (const pageUrl of [
    'https://www.pexels.com/search/construction%20worker/',
    'https://www.pexels.com/collections/workers-123456/',
  ]) {
    await assert.rejects(
      () =>
        pexelsExtractor.extract({
          url: parseHttpUrl(pageUrl),
          kind: 'page',
          httpClient: createFakeHttpClient({}),
          config,
        }),
      { code: 'UNSUPPORTED_URL' },
    );
  }
});

test('Pexels extractor uses public page metadata when no API key is configured', async () => {
  const pageUrl = 'https://www.pexels.com/photo/worker-123456/';
  const html = `
    <meta property="og:image" content="https://images.pexels.com/photos/123456/pexels-photo-123456.jpeg?w=1200">
    <meta property="og:title" content="Worker on site">
    <meta name="author" content="Photographer Name">
    <link rel="license" href="https://www.pexels.com/license/" title="Pexels License">`;
  const httpClient = createFakeHttpClient({ [pageUrl]: htmlResponse(pageUrl, html) });
  const metadata = await pexelsExtractor.extract({
    url: parseHttpUrl(pageUrl),
    kind: 'page',
    httpClient,
    config,
  });
  assert.equal(metadata.platform, 'pexels');
  assert.equal(metadata.author, 'Photographer Name');
  assert.equal(metadata.title, 'Worker on site');
  assert.equal(metadata.license, 'Pexels License');
  assert.equal(metadata.licenseUrl, 'https://www.pexels.com/license/');
  assert.equal(metadata.directImageUrl, 'https://images.pexels.com/photos/123456/pexels-photo-123456.jpeg');
  assert.ok(metadata.warnings.some((warning) => warning.code === 'official_api_not_configured'));
});

test('Unsplash extractor does not use copyrightNotice as the license name', async () => {
  const pageUrl = 'https://unsplash.com/photos/photo-abc123';
  const html = `
    <meta property="og:image" content="https://images.unsplash.com/photo-1?w=1200">
    <meta property="og:title" content="Photo by Photographer on Unsplash">
    <script type="application/ld+json">
      {
        "@type": "ImageObject",
        "author": { "name": "Photographer" },
        "copyrightNotice": "Photographer",
        "license": "https://unsplash.com/license",
        "contentUrl": "https://images.unsplash.com/photo-1"
      }
    </script>`;
  const httpClient = createFakeHttpClient({ [pageUrl]: htmlResponse(pageUrl, html) });
  const metadata = await unsplashExtractor.extract({
    url: parseHttpUrl(pageUrl),
    kind: 'page',
    httpClient,
    config,
  });
  assert.equal(metadata.author, 'Photographer');
  assert.equal(metadata.license, '');
  assert.equal(metadata.licenseUrl, 'https://unsplash.com/license');
  assert.ok(metadata.missingFields.includes('license'));
  assert.equal(metadata.directImageUrl, 'https://images.unsplash.com/photo-1');
});

test('Pexels direct image URL is normalised and metadata is limited', async () => {
  const url = parseHttpUrl('https://images.pexels.com/photos/987/pexels-photo-987.jpeg?auto=compress&w=800');
  const metadata = await pexelsExtractor.extract({
    url,
    kind: 'direct',
    httpClient: createFakeHttpClient({}),
    config,
  });
  assert.equal(metadata.directImageUrl, 'https://images.pexels.com/photos/987/pexels-photo-987.jpeg');
  assert.equal(metadata.author, '');
  assert.equal(metadata.license, '');
  assert.ok(metadata.missingFields.includes('author'));
  assert.ok(metadata.warnings.some((warning) => warning.code === 'direct_image_metadata_limited'));
});

test('Wikimedia extractor maps MediaWiki imageinfo into dataset metadata', async () => {
  const pageUrl = 'https://commons.wikimedia.org/wiki/File:Example.jpg';
  const httpClient = {
    async request(url) {
      assert.ok(url.startsWith('https://commons.wikimedia.org/w/api.php'));
      return fakeHttpResponse(
        url,
        Buffer.from(
          JSON.stringify({
            query: {
              pages: [
                {
                  title: 'File:Example.jpg',
                  imageinfo: [
                    {
                      url: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg',
                      descriptionurl: pageUrl,
                      canonicaltitle: 'File:Example.jpg',
                      width: 172,
                      height: 178,
                      size: 1234,
                      mime: 'image/jpeg',
                      extmetadata: {
                        LicenseShortName: { value: 'CC BY-SA 4.0' },
                        LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' },
                        Artist: { value: '<a href="#">Example Author</a>' },
                        ObjectName: { value: 'Example image' },
                        ImageDescription: { value: 'A description' },
                        AttributionRequired: { value: 'true' },
                        Copyrighted: { value: 'false' },
                      },
                    },
                  ],
                },
              ],
            },
          }),
        ),
        'application/json',
      );
    },
  };
  const metadata = await wikimediaExtractor.extract({
    url: parseHttpUrl(pageUrl),
    kind: 'page',
    httpClient,
    config,
  });
  assert.equal(metadata.platform, 'wikimedia');
  assert.equal(metadata.author, 'Example Author');
  assert.equal(metadata.title, 'Example image');
  assert.equal(metadata.description, 'A description');
  assert.equal(metadata.license, 'CC BY-SA 4.0');
  assert.equal(metadata.licenseUrl, 'https://creativecommons.org/licenses/by-sa/4.0/');
  assert.equal(metadata.directImageUrl, 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg');
  assert.ok(metadata.warnings.some((warning) => warning.code === 'attribution_required'));
  assert.ok(!metadata.warnings.some((warning) => warning.code === 'copyrighted_material'));
});
