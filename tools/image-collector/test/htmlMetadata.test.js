import assert from 'node:assert/strict';
import test from 'node:test';
import { parseHtmlMetadata } from '../src/metadata/htmlMetadata.js';
import { collectJsonLdMetadata, extractJsonLd } from '../src/metadata/jsonLd.js';

test('parseHtmlMetadata extracts Open Graph, author, canonical and license link', () => {
  const html = `
    <html><head>
      <title>Fallback title</title>
      <meta property="og:image" content="/images/photo.jpg">
      <meta property="og:title" content="Worker in a helmet">
      <meta property="og:description" content="Construction site">
      <meta property="og:site_name" content="Example Gallery">
      <meta name="author" content="Jane Doe">
      <meta property="article:published_time" content="2024-05-01T10:00:00Z">
      <link rel="canonical" href="https://example.com/gallery/photo">
      <link rel="license" href="https://creativecommons.org/licenses/by/4.0/" title="CC BY 4.0">
    </head></html>`;
  const result = parseHtmlMetadata(html, 'https://example.com/gallery/photo');
  assert.equal(result.imageUrl, 'https://example.com/images/photo.jpg');
  assert.equal(result.title, 'Worker in a helmet');
  assert.equal(result.description, 'Construction site');
  assert.equal(result.author, 'Jane Doe');
  assert.equal(result.siteName, 'Example Gallery');
  assert.equal(result.canonicalUrl, 'https://example.com/gallery/photo');
  assert.equal(result.license, 'CC BY 4.0');
  assert.equal(result.licenseUrl, 'https://creativecommons.org/licenses/by/4.0/');
  assert.equal(result.publishedTime, '2024-05-01T10:00:00Z');
  assert.ok(result.metadataSources.includes('open_graph'));
});

test('parseHtmlMetadata falls back to Twitter image and title', () => {
  const html = `
    <meta name="twitter:image" content="https://cdn.example.com/twitter.jpg">
    <meta name="twitter:title" content="Twitter title">
    <meta name="twitter:description" content="Twitter description">`;
  const result = parseHtmlMetadata(html, 'https://example.com/page');
  assert.equal(result.imageUrl, 'https://cdn.example.com/twitter.jpg');
  assert.equal(result.title, 'Twitter title');
  assert.equal(result.description, 'Twitter description');
  assert.ok(result.metadataSources.includes('twitter_card'));
});

test('parseHtmlMetadata reports a missing image', () => {
  const result = parseHtmlMetadata('<html><head><title>Nothing</title></head></html>', 'https://example.com/');
  assert.equal(result.imageUrl, '');
  assert.ok(result.warnings.some((warning) => warning.code === 'image_metadata_missing'));
});

test('generic license anchor text is not treated as a license name', () => {
  const html = `
    <meta property="og:image" content="https://images.example.com/photo.jpg">
    <meta property="og:title" content="Worker on site">
    <a href="/license/">License</a>`;
  const result = parseHtmlMetadata(html, 'https://www.pexels.com/photo/worker-123456/');
  assert.equal(result.license, '');
  assert.equal(result.licenseUrl, 'https://www.pexels.com/license/');
  assert.ok(result.warnings.some((warning) => warning.code === 'license_requires_manual_verification'));
});

test('ambiguous license anchor text such as "Free" is not treated as a license name', () => {
  const html = `
    <meta property="og:image" content="https://images.example.com/photo.jpg">
    <a href="/license/">Free</a>`;
  const result = parseHtmlMetadata(html, 'https://www.pexels.com/photo/worker-123456/');
  assert.equal(result.license, '');
  assert.equal(result.licenseUrl, 'https://www.pexels.com/license/');
});

test('named license anchor text is still used as the license name', () => {
  const html = `
    <meta property="og:image" content="https://images.example.com/photo.jpg">
    <a href="/license/">Pexels License</a>`;
  const result = parseHtmlMetadata(html, 'https://www.pexels.com/photo/worker-123456/');
  assert.equal(result.license, 'Pexels License');
  assert.equal(result.licenseUrl, 'https://www.pexels.com/license/');
});

test('JSON-LD license URL is not replaced by copyrightNotice', () => {
  const html = `<script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "ImageObject",
      "name": "Photo",
      "creator": { "@type": "Person", "name": "Jannis Brandt" },
      "copyrightNotice": "Jannis Brandt",
      "license": "https://unsplash.com/license",
      "contentUrl": "https://images.example.com/photo.jpg"
    }
  </script>`;
  const nodes = extractJsonLd(html);
  const result = collectJsonLdMetadata(nodes, 'https://example.com/photo');
  assert.equal(result.author, 'Jannis Brandt');
  assert.equal(result.license, '');
  assert.equal(result.licenseUrl, 'https://unsplash.com/license');
  assert.equal(result.imageUrl, 'https://images.example.com/photo.jpg');
});

test('JSON-LD object license uses name and URL', () => {
  const html = `<script type="application/ld+json">
    {
      "@type": "ImageObject",
      "license": { "name": "CC BY 4.0", "url": "https://creativecommons.org/licenses/by/4.0/" },
      "contentUrl": "https://example.com/photo.jpg"
    }
  </script>`;
  const result = collectJsonLdMetadata(extractJsonLd(html), 'https://example.com/photo');
  assert.equal(result.license, 'CC BY 4.0');
  assert.equal(result.licenseUrl, 'https://creativecommons.org/licenses/by/4.0/');
});

test('parseHtmlMetadata combines OG image with JSON-LD author and license', () => {
  const html = `
    <meta property="og:image" content="https://example.com/photo.jpg">
    <meta property="og:title" content="Page title">
    <script type="application/ld+json">
      { "@type": "ImageObject", "author": { "name": "Author Name" }, "license": "https://example.com/license" }
    </script>`;
  const result = parseHtmlMetadata(html, 'https://example.com/page');
  assert.equal(result.author, 'Author Name');
  assert.equal(result.licenseUrl, 'https://example.com/license');
  assert.equal(result.license, '');
});
