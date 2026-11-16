import { describe, expect, it } from 'vitest';
import { normalizeFileName } from './file-name';

describe('normalizeFileName', () => {
  it('keeps simple names and lowercases them', () => {
    expect(normalizeFileName('Scene-A.JPG')).toBe('scene-a.jpg');
  });

  it('strips POSIX and Windows directories', () => {
    expect(normalizeFileName('dataset/images/Scene-A.JPG')).toBe('scene-a.jpg');
    expect(normalizeFileName('C:\\dataset\\images\\Scene-A.JPG')).toBe('scene-a.jpg');
  });

  it('keeps the last segment of a path with mixed separators', () => {
    expect(normalizeFileName('dataset\\images/Scene-A.JPG')).toBe('scene-a.jpg');
  });
});
