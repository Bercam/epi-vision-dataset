import { afterEach, describe, expect, it, vi } from 'vitest';
import { CocoDataset, REQUIRED_CLASSES } from '../models/coco-dataset.model';
import { DatasetLoaderService } from './dataset-loader.service';

function makeDataset(): CocoDataset {
  return {
    images: [{ id: 1, file_name: 'scene.jpg', width: 100, height: 80 }],
    annotations: [
      { id: 1, image_id: 1, category_id: 1, bbox: [10, 10, 20, 15], area: 300, iscrowd: 0 },
    ],
    categories: REQUIRED_CLASSES.map((name, index) => ({ id: index + 1, name })),
  };
}

describe('DatasetLoaderService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads a valid COCO JSON file', async () => {
    const service = new DatasetLoaderService();
    const file = new File([JSON.stringify(makeDataset())], 'annotations.json', {
      type: 'application/json',
    });

    await expect(service.loadJsonFile(file)).resolves.toEqual(makeDataset());
  });

  it('returns a friendly error for invalid JSON', async () => {
    const service = new DatasetLoaderService();
    const file = new File(['{invalid'], 'annotations.json', { type: 'application/json' });

    await expect(service.loadJsonFile(file)).rejects.toThrow(
      'Não foi possível ler o arquivo. Confira se ele contém um JSON válido.',
    );
  });

  it('releases replaced and remaining object URLs when filenames collide', () => {
    const createObjectURL = vi
      .fn()
      .mockReturnValueOnce('blob:first')
      .mockReturnValueOnce('blob:last');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    const service = new DatasetLoaderService();
    const first = new File(['first'], 'Scene.jpg', { type: 'image/jpeg' });
    const duplicate = new File(['duplicate'], 'scene.JPG', { type: 'image/jpeg' });
    const ignored = new File(['metadata'], 'notes.txt', { type: 'text/plain' });

    const urls = service.registerImageFiles([first, duplicate, ignored]);

    expect(urls).toEqual(new Map([['scene.jpg', 'blob:last']]));
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:first');

    service.releaseImageUrls();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:last');
  });
});
