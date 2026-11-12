export const CLASSIFICATION_FIELDS = [
  'people_visible',
  'safety_helmets_visible',
  'reflective_vests_visible',
  'people_without_helmets_visible',
  'construction_environment',
  'industrial_environment',
];

export function emptyClassification() {
  return Object.fromEntries(CLASSIFICATION_FIELDS.map((field) => [field, null]));
}

export function normaliseClassification(value) {
  const result = emptyClassification();
  if (!value || typeof value !== 'object') {
    return result;
  }
  for (const field of CLASSIFICATION_FIELDS) {
    if (value[field] === true || value[field] === false) {
      result[field] = value[field];
    }
  }
  return result;
}

export function createClassifier() {
  return {
    classify() {
      return {
        suggestions: emptyClassification(),
        status: 'manual_review_required',
        method: 'none',
        note: 'Nenhum modelo local de visão computacional está configurado. As características visuais devem ser revisadas por uma pessoa.',
      };
    },
  };
}
