import { describe, expect, it } from 'vitest';
import { CocoAnnotation } from '../models/coco-dataset.model';
import { filterAnnotationsByCategory } from './filter-annotations';

const annotations: readonly CocoAnnotation[] = [
  { id: 1, image_id: 7, category_id: 1, bbox: [0, 0, 10, 10], area: 100, iscrowd: 0 },
  { id: 2, image_id: 7, category_id: 2, bbox: [5, 5, 6, 6], area: 36, iscrowd: 0 },
  { id: 3, image_id: 7, category_id: 2, bbox: [20, 20, 8, 8], area: 64, iscrowd: 0 },
];

describe('filterAnnotationsByCategory', () => {
  it('returns every annotation when no class is selected', () => {
    expect(filterAnnotationsByCategory(annotations, null)).toBe(annotations);
  });

  it('keeps only annotations from the selected class', () => {
    expect(filterAnnotationsByCategory(annotations, 2).map(({ id }) => id)).toEqual([2, 3]);
  });

  it('returns an empty list when the selected class has no annotations', () => {
    expect(filterAnnotationsByCategory(annotations, 4)).toEqual([]);
  });
});
