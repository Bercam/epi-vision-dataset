import { Injectable } from '@angular/core';
import { CocoDataset } from '../models/coco-dataset.model';
import { validateCocoDataset } from '../validators/coco-dataset.validator';

@Injectable({ providedIn: 'root' })
export class DatasetLoaderService {
  private readonly imageUrls = new Map<string, string>();

  async loadJsonFile(file: File): Promise<CocoDataset> {
    let parsed: unknown;

    try {
      parsed = JSON.parse(await file.text()) as unknown;
    } catch {
      throw new Error('Não foi possível ler o arquivo. Confira se ele contém um JSON válido.');
    }

    const result = validateCocoDataset(parsed);
    if (!result.dataset) {
      throw new Error(result.errors[0] ?? 'O arquivo não contém um dataset válido.');
    }

    return result.dataset;
  }

  registerImageFiles(files: readonly File[]): ReadonlyMap<string, string> {
    this.releaseImageUrls();

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;

      const key = this.normalizeFileName(file.name);
      const previousUrl = this.imageUrls.get(key);
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      this.imageUrls.set(key, URL.createObjectURL(file));
    }

    return new Map(this.imageUrls);
  }

  releaseImageUrls(): void {
    this.imageUrls.forEach((url) => URL.revokeObjectURL(url));
    this.imageUrls.clear();
  }

  normalizeFileName(fileName: string): string {
    return fileName.split(/[\\/]/).pop()?.toLocaleLowerCase() ?? fileName.toLocaleLowerCase();
  }
}
