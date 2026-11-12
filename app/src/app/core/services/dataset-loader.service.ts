import { Injectable } from '@angular/core';
import { CocoDataset } from '../models/coco-dataset.model';
import { validateCocoDataset } from '../validators/coco-dataset.validator';

@Injectable({ providedIn: 'root' })
export class DatasetLoaderService {
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
}
