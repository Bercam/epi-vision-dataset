import { genericExtractor } from './generic.js';
import { pexelsExtractor } from './pexels.js';
import { unsplashExtractor } from './unsplash.js';
import { wikimediaExtractor } from './wikimedia.js';

const EXTRACTORS = {
  generic: genericExtractor,
  pexels: pexelsExtractor,
  unsplash: unsplashExtractor,
  wikimedia: wikimediaExtractor,
};

export function getExtractor(platform) {
  return EXTRACTORS[platform] ?? genericExtractor;
}

export function supportedPlatforms() {
  return Object.values(EXTRACTORS).map((extractor) => ({
    id: extractor.id,
    name: extractor.displayName,
  }));
}
