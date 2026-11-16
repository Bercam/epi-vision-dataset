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

  it('renders dataset totals, average, and annotation counts by class', () => {
    const component = fixture.componentInstance as unknown as DatasetPageHarness;
    component.dataset.set(dataset);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const statisticCards = [...root.querySelectorAll<HTMLElement>('.statistics-grid .stat-card')];
    expect(statisticCards.map((card) => card.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      expect.stringContaining('2'),
      expect.stringContaining('3'),
      expect.stringContaining('1.5'),
    ]);

    const classRows = [...root.querySelectorAll<HTMLElement>('.class-breakdown .class-row')];
    expect(classRows).toHaveLength(4);
    expect(classRows.map((row) => row.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      expect.stringContaining('pessoa 2'),
      expect.stringContaining('capacete 1'),
      expect.stringContaining('colete 0'),
      expect.stringContaining('sem_capacete 0'),
    ]);
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

  function openFullscreen(root: HTMLElement): void {
    const button = root.querySelector<HTMLButtonElement>('.expand-button');
    if (!button) throw new Error('O botão de tela cheia não foi renderizado.');
    button.click();
    fixture.detectChanges();
  }

  function setUpGallery(): HTMLElement {
    const component = fixture.componentInstance as unknown as DatasetPageHarness;
    component.dataset.set(dataset);
    component.imageUrls.set(
      new Map([
        ['scene-a.jpg', 'blob:scene-a'],
        ['scene-b.jpg', 'blob:scene-b'],
      ]),
    );
    component.selectedImageId.set(1);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('opens the fullscreen viewer and closes it with Escape', () => {
    const root = setUpGallery();
    openFullscreen(root);

    expect(root.querySelector('.viewer-dialog')).not.toBeNull();
    expect(root.querySelector('.viewer-position')?.textContent?.trim()).toBe('1 / 2');
    expect(root.querySelector('.viewer-title h2')?.textContent).toContain('scene-a.jpg');
    expect(document.body.style.overflow).toBe('hidden');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(root.querySelector('.viewer-dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('navigates fullscreen images with arrow keys and wraps around', () => {
    const root = setUpGallery();
    openFullscreen(root);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(root.querySelector('.viewer-position')?.textContent?.trim()).toBe('2 / 2');
    expect(root.querySelector('.viewer-title h2')?.textContent).toContain('scene-b.jpg');
    expect(root.querySelector('.viewer-canvas image')?.getAttribute('href')).toBe('blob:scene-b');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(root.querySelector('.viewer-position')?.textContent?.trim()).toBe('1 / 2');
    expect(root.querySelector('.viewer-title h2')?.textContent).toContain('scene-a.jpg');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    fixture.detectChanges();
    expect(root.querySelector('.viewer-position')?.textContent?.trim()).toBe('2 / 2');
    expect(root.querySelector('.viewer-title h2')?.textContent).toContain('scene-b.jpg');
  });

  it('keeps fullscreen navigation inside the active class filter', () => {
    const root = setUpGallery();
    const component = fixture.componentInstance as unknown as DatasetPageHarness;

    component.selectCategory(2);
    fixture.detectChanges();
    openFullscreen(root);

    expect(root.querySelector('.viewer-position')?.textContent?.trim()).toBe('1 / 1');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();

    expect(root.querySelector('.viewer-position')?.textContent?.trim()).toBe('1 / 1');
    expect(root.querySelector('.viewer-title h2')?.textContent).toContain('scene-a.jpg');
  });

  it('opens the fullscreen viewer for a gallery card on double-click', () => {
    const root = setUpGallery();
    const cards = root.querySelectorAll<HTMLButtonElement>('.image-card');
    if (!cards[1]) throw new Error('O segundo cartão da galeria não foi renderizado.');

    cards[1].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    fixture.detectChanges();

    expect(root.querySelector('.viewer-dialog')).not.toBeNull();
    expect(root.querySelector('.viewer-title h2')?.textContent).toContain('scene-b.jpg');
    expect(root.querySelector('.viewer-position')?.textContent?.trim()).toBe('2 / 2');
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('opens the fullscreen viewer for the selected image on preview double-click', () => {
    const root = setUpGallery();
    const canvas = root.querySelector<HTMLElement>('.preview-canvas');
    if (!canvas) throw new Error('A pré-visualização não foi renderizada.');

    canvas.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    fixture.detectChanges();

    expect(root.querySelector('.viewer-dialog')).not.toBeNull();
    expect(root.querySelector('.viewer-title h2')?.textContent).toContain('scene-a.jpg');
    expect(root.querySelector('.viewer-position')?.textContent?.trim()).toBe('1 / 2');
  });

  function uploadJson(root: HTMLElement, file: File): Promise<void> {
    const jsonInput = root.querySelector<HTMLInputElement>('#coco-file');
    if (!jsonInput) throw new Error('O campo de upload COCO não foi renderizado.');

    Object.defineProperty(jsonInput, 'files', { configurable: true, value: toFileList([file]) });
    jsonInput.dispatchEvent(new Event('change', { bubbles: true }));
    return fixture.whenStable();
  }

  function uploadImages(root: HTMLElement, files: File[]): void {
    const imagesInput = root.querySelector<HTMLInputElement>('#image-files');
    if (!imagesInput) throw new Error('O campo de upload de imagens não foi renderizado.');

    Object.defineProperty(imagesInput, 'files', {
      configurable: true,
      value: toFileList(files),
    });
    imagesInput.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
  }

  it('confirms the selected JSON file name after a successful load', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const json = new File([JSON.stringify(dataset)], 'annotations.json', {
      type: 'application/json',
    });

    await uploadJson(root, json);
    fixture.detectChanges();

    const jsonCard = root.querySelector<HTMLElement>('.upload-card');
    expect(jsonCard?.classList.contains('confirmed')).toBe(true);
    expect(jsonCard?.querySelector('.upload-confirmation')?.textContent).toContain(
      'annotations.json',
    );
    expect(jsonCard?.querySelector('.upload-action')?.textContent?.trim()).toBe('Trocar JSON');
  });

  it('confirms how many images were selected with singular and plural labels', () => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
      revokeObjectURL: vi.fn(),
    });

    const root = fixture.nativeElement as HTMLElement;
    const imageCards = root.querySelectorAll<HTMLElement>('.upload-card');
    const imageCard = imageCards[1];
    if (!imageCard) throw new Error('O cartão de imagens não foi renderizado.');

    uploadImages(root, [new File(['a'], 'scene-a.jpg', { type: 'image/jpeg' })]);

    expect(imageCard.classList.contains('confirmed')).toBe(true);
    expect(imageCard.querySelector('.upload-confirmation')?.textContent).toContain(
      '1 imagem selecionada',
    );
    expect(imageCard.querySelector('.upload-action')?.textContent?.trim()).toBe('Trocar imagens');

    uploadImages(root, [
      new File(['a'], 'scene-a.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'scene-b.jpg', { type: 'image/jpeg' }),
    ]);

    expect(imageCard.querySelector('.upload-confirmation')?.textContent).toContain(
      '2 imagens selecionadas',
    );

    uploadImages(root, []);
    expect(imageCard.querySelector('.upload-confirmation')?.textContent).toContain(
      '2 imagens selecionadas',
    );
  });

  it('counts only selected files that are images', () => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
      revokeObjectURL: vi.fn(),
    });

    const root = fixture.nativeElement as HTMLElement;
    const imageCard = root.querySelectorAll<HTMLElement>('.upload-card')[1];
    if (!imageCard) throw new Error('O cartão de imagens não foi renderizado.');

    uploadImages(root, [
      new File(['a'], 'scene-a.jpg', { type: 'image/jpeg' }),
      new File(['not an image'], 'notes.txt', { type: 'text/plain' }),
    ]);

    expect(imageCard.querySelector('.upload-confirmation')?.textContent).toContain(
      '1 imagem selecionada',
    );
  });

  it('clears the JSON confirmation when the next file is invalid', async () => {
    const root = fixture.nativeElement as HTMLElement;
    const validJson = new File([JSON.stringify(dataset)], 'annotations.json', {
      type: 'application/json',
    });

    await uploadJson(root, validJson);
    fixture.detectChanges();
    expect(root.querySelector('.upload-confirmation')).not.toBeNull();

    const invalidJson = new File(['{invalid'], 'broken.json', { type: 'application/json' });
    await uploadJson(root, invalidJson);
    fixture.detectChanges();

    const jsonCard = root.querySelector<HTMLElement>('.upload-card');
    expect(jsonCard?.classList.contains('confirmed')).toBe(false);
    expect(jsonCard?.querySelector('.upload-confirmation')).toBeNull();
    expect(jsonCard?.querySelector('.upload-action')?.textContent?.trim()).toBe('Escolher JSON');
    expect(root.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('starts fullscreen filters from the active class and reveals all classes on demand', () => {
    const root = setUpGallery();
    const component = fixture.componentInstance as unknown as DatasetPageHarness;

    component.selectCategory(2);
    fixture.detectChanges();
    openFullscreen(root);

    const viewer = root.querySelector<HTMLElement>('.viewer-dialog');
    if (!viewer) throw new Error('A visualização em tela cheia não foi renderizada.');

    expect(viewer.querySelectorAll('.bounding-box')).toHaveLength(1);

    const options = [...viewer.querySelectorAll<HTMLElement>('.filter-option')];
    expect(
      options.map((option) => option.querySelector('.filter-name')?.textContent?.trim()),
    ).toEqual(['pessoa', 'capacete']);
    expect(
      options.map((option) => option.querySelector<HTMLInputElement>('input')?.checked),
    ).toEqual([false, true]);

    const markAll = [...viewer.querySelectorAll<HTMLButtonElement>('.filter-action')].find(
      (button) => button.textContent?.includes('Marcar tudo'),
    );
    if (!markAll) throw new Error('O botão Marcar tudo não foi renderizado.');
    markAll.click();
    fixture.detectChanges();

    expect(viewer.querySelectorAll('.bounding-box')).toHaveLength(2);
  });
});
