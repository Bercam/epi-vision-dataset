import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CocoDataset } from '../../../core/models/coco-dataset.model';
import { DatasetPage } from './dataset-page';

interface DatasetPageHarness {
  dataset: WritableSignal<CocoDataset | null>;
  imageUrls: WritableSignal<ReadonlyMap<string, string>>;
  selectedImageId: WritableSignal<number | null>;
  selectCategory(categoryId: number | null): void;
}

const dataset: CocoDataset = {
  images: [
    { id: 1, file_name: 'scene-a.jpg', width: 100, height: 80 },
    { id: 2, file_name: 'scene-b.jpg', width: 120, height: 90 },
  ],
  categories: [
    { id: 1, name: 'pessoa' },
    { id: 2, name: 'capacete' },
    { id: 3, name: 'colete' },
    { id: 4, name: 'sem_capacete' },
  ],
  annotations: [
    { id: 1, image_id: 1, category_id: 1, bbox: [10, 10, 40, 50], area: 2000, iscrowd: 0 },
    { id: 2, image_id: 1, category_id: 2, bbox: [20, 10, 15, 12], area: 180, iscrowd: 0 },
    { id: 3, image_id: 2, category_id: 1, bbox: [15, 5, 30, 60], area: 1800, iscrowd: 0 },
  ],
};

function toFileList(files: File[]): FileList {
  const fileList = [...files] as File[] & { item(index: number): File | null };
  fileList.item = (index) => fileList[index] ?? null;
  return fileList as unknown as FileList;
}

describe('DatasetPage class filter', () => {
  let fixture: ComponentFixture<DatasetPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DatasetPage] }).compileComponents();
    fixture = TestBed.createComponent(DatasetPage);
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
  });

  it('filters gallery images and preview boxes to the selected class', () => {
    const component = fixture.componentInstance as unknown as DatasetPageHarness;
    component.dataset.set(dataset);
    component.imageUrls.set(new Map([['scene-a.jpg', 'blob:unit-test']]));
    component.selectedImageId.set(2);
    fixture.detectChanges();

    component.selectCategory(2);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.image-card')).toHaveLength(1);
    expect(root.querySelector('.image-card-name')?.textContent).toContain('scene-a.jpg');
    expect(root.querySelector('.preview-counter')?.textContent).toContain('1 anot.');
    expect(root.querySelectorAll('.bounding-box')).toHaveLength(1);
  });

  it('loads COCO and image files through visible inputs when images are selected first', async () => {
    const createObjectURL = vi.fn(() => 'blob:uploaded-scene');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    const root = fixture.nativeElement as HTMLElement;
    const jsonInput = root.querySelector<HTMLInputElement>('#coco-file');
    const imagesInput = root.querySelector<HTMLInputElement>('#image-files');
    if (!jsonInput || !imagesInput) throw new Error('Os campos de upload não foram renderizados.');

    const image = new File(['image-bytes'], 'scene.jpg', { type: 'image/jpeg' });
    const imageFiles = toFileList([image]);
    Object.defineProperty(imagesInput, 'files', { configurable: true, value: imageFiles });
    imagesInput.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();

    const coco = {
      images: [{ id: 1, file_name: 'scene.jpg', width: 100, height: 80 }],
      annotations: [
        { id: 1, image_id: 1, category_id: 1, bbox: [5, 6, 20, 25], area: 500, iscrowd: 0 },
      ],
      categories: [
        { id: 1, name: 'pessoa' },
        { id: 2, name: 'capacete' },
        { id: 3, name: 'colete' },
        { id: 4, name: 'sem_capacete' },
      ],
    };
    const json = new File([JSON.stringify(coco)], 'annotations.json', { type: 'application/json' });
    const jsonFiles = toFileList([json]);
    Object.defineProperty(jsonInput, 'files', { configurable: true, value: jsonFiles });
    jsonInput.dispatchEvent(new Event('change', { bubbles: true }));

    await fixture.whenStable();
    fixture.detectChanges();

    expect(createObjectURL).toHaveBeenCalledWith(image);
    expect(jsonInput.value).toBe('');
    expect(imagesInput.value).toBe('');
    expect(root.querySelectorAll('.image-card')).toHaveLength(1);
    expect(root.querySelector('.image-card-name')?.textContent).toContain('scene.jpg');
    expect(root.querySelector('.thumbnail img')?.getAttribute('src')).toBe('blob:uploaded-scene');
    expect(root.querySelector('.annotation-layer image')?.getAttribute('href')).toBe(
      'blob:uploaded-scene',
    );
    expect(root.querySelectorAll('.bounding-box')).toHaveLength(1);
    expect(root.querySelector('.warning-notice')).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  it('loads COCO and image files through visible inputs when COCO is selected first', async () => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:uploaded-scene'),
      revokeObjectURL: vi.fn(),
    });

    const root = fixture.nativeElement as HTMLElement;
    const jsonInput = root.querySelector<HTMLInputElement>('#coco-file');
    const imagesInput = root.querySelector<HTMLInputElement>('#image-files');
    if (!jsonInput || !imagesInput) throw new Error('Os campos de upload não foram renderizados.');

    const coco = {
      images: [{ id: 1, file_name: 'scene.jpg', width: 100, height: 80 }],
      annotations: [],
      categories: [
        { id: 1, name: 'pessoa' },
        { id: 2, name: 'capacete' },
        { id: 3, name: 'colete' },
        { id: 4, name: 'sem_capacete' },
      ],
    };
    const json = new File([JSON.stringify(coco)], 'annotations.json', { type: 'application/json' });
    Object.defineProperty(jsonInput, 'files', { configurable: true, value: toFileList([json]) });
    jsonInput.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.querySelectorAll('.image-card')).toHaveLength(1);
    expect(root.querySelector('.thumbnail img')).toBeNull();

    const image = new File(['image-bytes'], 'scene.jpg', { type: 'image/jpeg' });
    Object.defineProperty(imagesInput, 'files', { configurable: true, value: toFileList([image]) });
    imagesInput.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();

    expect(root.querySelector('.thumbnail img')?.getAttribute('src')).toBe('blob:uploaded-scene');
    expect(root.querySelector('.warning-notice')).toBeNull();
  });

  it('shows a friendly alert when an invalid COCO file is selected', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const jsonInput = root.querySelector<HTMLInputElement>('#coco-file');
    if (!jsonInput) throw new Error('O campo de upload COCO não foi renderizado.');

    const invalidJson = new File(['{invalid'], 'annotations.json', { type: 'application/json' });
    Object.defineProperty(jsonInput, 'files', {
      configurable: true,
      value: toFileList([invalidJson]),
    });
    jsonInput.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível ler o arquivo. Confira se ele contém um JSON válido.',
    );
    expect(root.querySelector('.dataset-summary')).toBeNull();
  });

  it('warns when a selected image does not match a COCO filename', async () => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:unmatched-image'),
      revokeObjectURL: vi.fn(),
    });

    const root = fixture.nativeElement as HTMLElement;
    const jsonInput = root.querySelector<HTMLInputElement>('#coco-file');
    const imagesInput = root.querySelector<HTMLInputElement>('#image-files');
    if (!jsonInput || !imagesInput) throw new Error('Os campos de upload não foram renderizados.');

    const coco = {
      images: [{ id: 1, file_name: 'expected.jpg', width: 100, height: 80 }],
      annotations: [],
      categories: [
        { id: 1, name: 'pessoa' },
        { id: 2, name: 'capacete' },
        { id: 3, name: 'colete' },
        { id: 4, name: 'sem_capacete' },
      ],
    };
    const json = new File([JSON.stringify(coco)], 'annotations.json', { type: 'application/json' });
    Object.defineProperty(jsonInput, 'files', { configurable: true, value: toFileList([json]) });
    jsonInput.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();

    const wrongImage = new File(['image-bytes'], 'different.jpg', { type: 'image/jpeg' });
    Object.defineProperty(imagesInput, 'files', {
      configurable: true,
      value: toFileList([wrongImage]),
    });
    imagesInput.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();

    expect(root.querySelector('.warning-notice')?.textContent).toContain(
      'Não encontrei 1 imagem(ns)',
    );
    expect(root.querySelector('.thumbnail img')).toBeNull();
  });
});
