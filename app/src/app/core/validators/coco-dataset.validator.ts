import {
  CocoAnnotation,
  CocoCategory,
  CocoDataset,
  CocoImage,
  REQUIRED_CLASSES,
} from '../models/coco-dataset.model';

export interface CocoValidationResult {
  readonly dataset: CocoDataset | null;
  readonly errors: readonly string[];
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoundingBox(
  value: unknown,
): value is [number, number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every(isFiniteNumber)
  );
}

function hasUniqueIds<T extends { readonly id: number }>(items: readonly T[]): boolean {
  return new Set(items.map((item) => item.id)).size === items.length;
}

export function validateCocoDataset(input: unknown): CocoValidationResult {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return { dataset: null, errors: ['O conteúdo precisa ser um objeto JSON.'] };
  }

  const rawImages: unknown = input['images'];
  const rawAnnotations: unknown = input['annotations'];
  const rawCategories: unknown = input['categories'];

  if (!Array.isArray(rawImages) || !Array.isArray(rawAnnotations) || !Array.isArray(rawCategories)) {
    return {
      dataset: null,
      errors: ['O JSON precisa conter listas de imagens, anotações e categorias.'],
    };
  }

  const images: CocoImage[] = [];
  rawImages.forEach((value: unknown, index: number) => {
    if (
      !isRecord(value) ||
      !isPositiveInteger(value['id']) ||
      typeof value['file_name'] !== 'string' ||
      value['file_name'].trim().length === 0 ||
      !isPositiveInteger(value['width']) ||
      !isPositiveInteger(value['height'])
    ) {
      errors.push(`A imagem ${index + 1} tem campos ausentes ou inválidos.`);
      return;
    }

    images.push({
      id: value['id'],
      file_name: value['file_name'],
      width: value['width'],
      height: value['height'],
    });
  });

  const categories: CocoCategory[] = [];
  rawCategories.forEach((value: unknown, index: number) => {
    if (
      !isRecord(value) ||
      !isPositiveInteger(value['id']) ||
      typeof value['name'] !== 'string' ||
      value['name'].trim().length === 0 ||
      !REQUIRED_CLASSES.includes(value['name'] as (typeof REQUIRED_CLASSES)[number]) ||
      (value['supercategory'] !== undefined && typeof value['supercategory'] !== 'string')
    ) {
      errors.push(`A categoria ${index + 1} tem campos ausentes ou inválidos.`);
      return;
    }

    categories.push({
      id: value['id'],
      name: value['name'],
      ...(typeof value['supercategory'] === 'string'
        ? { supercategory: value['supercategory'] }
        : {}),
    });
  });

  const annotations: CocoAnnotation[] = [];
  rawAnnotations.forEach((value: unknown, index: number) => {
    if (
      !isRecord(value) ||
      !isPositiveInteger(value['id']) ||
      !isPositiveInteger(value['image_id']) ||
      !isPositiveInteger(value['category_id']) ||
      !isBoundingBox(value['bbox']) ||
      !isFiniteNumber(value['area']) ||
      value['area'] <= 0 ||
      (value['iscrowd'] !== 0 && value['iscrowd'] !== 1)
    ) {
      errors.push(`A anotação ${index + 1} tem campos ausentes ou inválidos.`);
      return;
    }

    annotations.push({
      id: value['id'],
      image_id: value['image_id'],
      category_id: value['category_id'],
      bbox: value['bbox'],
      area: value['area'],
      iscrowd: value['iscrowd'],
    });
  });

  if (errors.length > 0) {
    return { dataset: null, errors };
  }

  if (images.length === 0 || annotations.length === 0 || categories.length === 0) {
    errors.push('O dataset precisa ter imagens, anotações e categorias.');
  }

  if (!hasUniqueIds(images)) errors.push('Há IDs de imagem duplicados.');
  if (!hasUniqueIds(annotations)) errors.push('Há IDs de anotação duplicados.');
  if (!hasUniqueIds(categories)) errors.push('Há IDs de categoria duplicados.');
  if (new Set(images.map((image) => image.file_name)).size !== images.length) {
    errors.push('Há nomes de imagem duplicados.');
  }
  if (new Set(categories.map((category) => category.name)).size !== categories.length) {
    errors.push('Há nomes de categoria duplicados.');
  }
  if (categories.length !== REQUIRED_CLASSES.length) {
    errors.push('O dataset precisa conter exatamente as quatro classes obrigatórias.');
  }

  const imageById = new Map(images.map((image) => [image.id, image]));
  const categoryIds = new Set(categories.map((category) => category.id));
  const categoryNames = new Set(categories.map((category) => category.name));

  REQUIRED_CLASSES.forEach((className) => {
    if (!categoryNames.has(className)) errors.push(`A classe obrigatória "${className}" não existe.`);
  });

  annotations.forEach((annotation) => {
    const image = imageById.get(annotation.image_id);
    if (!image) {
      errors.push(`A anotação ${annotation.id} referencia uma imagem inexistente.`);
    }
    if (!categoryIds.has(annotation.category_id)) {
      errors.push(`A anotação ${annotation.id} referencia uma categoria inexistente.`);
    }
    const [x, y, width, height] = annotation.bbox;
    if (
      width <= 0 ||
      height <= 0 ||
      x < 0 ||
      y < 0 ||
      (image !== undefined && (x + width > image.width || y + height > image.height))
    ) {
      errors.push(`A caixa da anotação ${annotation.id} está fora dos limites da imagem.`);
    }
    if (Math.abs(annotation.area - width * height) > 1) {
      errors.push(`A área da anotação ${annotation.id} não corresponde à caixa.`);
    }
  });

  if (errors.length > 0) return { dataset: null, errors };

  return {
    dataset: { images, annotations, categories },
    errors: [],
  };
}
