import { describe, expect, it } from 'vitest';
import { CocoDataset, REQUIRED_CLASSES } from '../models/coco-dataset.model';
import { validateCocoDataset } from './coco-dataset.validator';

function makeDataset(): CocoDataset {
  return {
    images: [{ id: 1, file_name: 'scene.jpg', width: 100, height: 80 }],
    annotations: [
      { id: 1, image_id: 1, category_id: 1, bbox: [10, 10, 20, 15], area: 300, iscrowd: 0 },
    ],
    categories: REQUIRED_CLASSES.map((name, index) => ({ id: index + 1, name })),
  };
}

describe('validateCocoDataset', () => {
  it('accepts a well-formed COCO dataset with the required classes', () => {
    const result = validateCocoDataset(makeDataset());

    expect(result.errors).toEqual([]);
    expect(result.dataset?.images).toHaveLength(1);
    expect(result.dataset?.annotations).toHaveLength(1);
  });

  it('rejects a non-object JSON value', () => {
    expect(validateCocoDataset(null).errors).toContain('O conteúdo precisa ser um objeto JSON.');
  });

  it('rejects a missing required class', () => {
    const dataset = makeDataset();
    const result = validateCocoDataset({ ...dataset, categories: dataset.categories.slice(1) });

    expect(result.dataset).toBeNull();
    expect(result.errors).toContain(
      'O dataset precisa conter exatamente as quatro classes obrigatórias.',
    );
  });

  it('rejects a bounding box outside the image dimensions', () => {
    const dataset = makeDataset();
    const [annotation] = dataset.annotations;
    const result = validateCocoDataset({
      ...dataset,
      annotations: [{ ...annotation, bbox: [90, 10, 20, 15], area: 300 }],
    });

    expect(result.dataset).toBeNull();
    expect(result.errors).toContain('A caixa da anotação 1 está fora dos limites da imagem.');
  });

  it('rejects duplicate image IDs', () => {
    const dataset = makeDataset();
    const result = validateCocoDataset({
      ...dataset,
      images: [...dataset.images, { ...dataset.images[0], file_name: 'other.jpg' }],
    });

    expect(result.dataset).toBeNull();
    expect(result.errors).toContain('Há IDs de imagem duplicados.');
  });
});
