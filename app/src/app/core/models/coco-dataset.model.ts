export interface CocoDataset {
  readonly images: readonly CocoImage[];
  readonly annotations: readonly CocoAnnotation[];
  readonly categories: readonly CocoCategory[];
}

export interface CocoImage {
  readonly id: number;
  readonly file_name: string;
  readonly width: number;
  readonly height: number;
}

export interface CocoAnnotation {
  readonly id: number;
  readonly image_id: number;
  readonly category_id: number;
  readonly bbox: readonly [number, number, number, number];
  readonly area: number;
  readonly iscrowd: number;
}

export interface CocoCategory {
  readonly id: number;
  readonly name: string;
  readonly supercategory?: string;
}

export const REQUIRED_CLASSES = [
  'pessoa',
  'capacete',
  'colete',
  'sem_capacete',
] as const;

export type DatasetClass = (typeof REQUIRED_CLASSES)[number];
