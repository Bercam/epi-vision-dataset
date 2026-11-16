import { expect, Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface CocoImage {
  readonly id: number;
  readonly file_name: string;
  readonly width: number;
  readonly height: number;
}

export interface CocoCategory {
  readonly id: number;
  readonly name: string;
}

export interface CocoAnnotation {
  readonly id: number;
  readonly image_id: number;
  readonly category_id: number;
  readonly bbox: readonly [number, number, number, number];
  readonly area: number;
  readonly iscrowd: number;
}

export interface CocoDataset {
  readonly images: readonly CocoImage[];
  readonly categories: readonly CocoCategory[];
  readonly annotations: readonly CocoAnnotation[];
}

export const DATASET_DIR = resolve(__dirname, '../../../dataset');
export const SCREENSHOTS_DIR = resolve(__dirname, '../../../docs/screenshots');

export const cocoPath = join(DATASET_DIR, 'annotations_coco.json');
export const dataset: CocoDataset = JSON.parse(readFileSync(cocoPath, 'utf8')) as CocoDataset;

export const imagePaths = readdirSync(join(DATASET_DIR, 'images'))
  .filter((name) => name.toLowerCase().endsWith('.jpg'))
  .sort()
  .map((name) => join(DATASET_DIR, 'images', name));

const categoryIdByName = new Map(
  dataset.categories.map((category) => [category.name, category.id]),
);
const imageById = new Map(dataset.images.map((image) => [image.id, image]));

export function annotationsForImage(fileName: string): readonly CocoAnnotation[] {
  const image = dataset.images.find((candidate) => candidate.file_name === fileName);
  if (!image) throw new Error(`Imagem ausente no COCO real: ${fileName}`);
  return dataset.annotations.filter((annotation) => annotation.image_id === image.id);
}

export function annotationsForCategory(categoryName: string): readonly CocoAnnotation[] {
  const categoryId = categoryIdByName.get(categoryName);
  if (categoryId === undefined) throw new Error(`Classe ausente no COCO real: ${categoryName}`);
  return dataset.annotations.filter((annotation) => annotation.category_id === categoryId);
}

export function imageCountForCategory(categoryName: string): number {
  return new Set(annotationsForCategory(categoryName).map((annotation) => annotation.image_id))
    .size;
}

export function imageName(imageId: number): string {
  const image = imageById.get(imageId);
  if (!image) throw new Error(`Imagem ausente no COCO real: ${imageId}`);
  return image.file_name;
}

export async function loadRealCoco(page: Page): Promise<void> {
  await page.locator('#coco-file').setInputFiles(cocoPath);
  await expect(page.locator('.summary-item strong').first()).toHaveText(
    String(dataset.images.length),
  );
}

export async function loadRealImages(page: Page): Promise<void> {
  await page.locator('#image-files').setInputFiles(imagePaths);
  await expect(page.locator('.thumbnail img')).toHaveCount(dataset.images.length);
}

export async function selectGalleryImage(page: Page, fileName: string): Promise<void> {
  await page.locator('.image-card').filter({ hasText: fileName }).click();
  await expect(page.locator('.preview-meta strong')).toHaveText(fileName);
}
