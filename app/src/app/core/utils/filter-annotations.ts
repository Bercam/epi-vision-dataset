import { CocoAnnotation } from '../models/coco-dataset.model';

export function filterAnnotationsByCategory(
  annotations: readonly CocoAnnotation[],
  categoryId: number | null,
): readonly CocoAnnotation[] {
  if (categoryId === null) return annotations;
  return annotations.filter((annotation) => annotation.category_id === categoryId);
}
