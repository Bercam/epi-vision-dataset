import { expect, test } from '@playwright/test';
import {
  annotationsForCategory,
  annotationsForImage,
  dataset,
  imageCountForCategory,
  imageName,
  imagePaths,
  loadRealCoco,
  loadRealImages,
  selectGalleryImage,
} from './support/dataset';

const CLASS_COLORS: Readonly<Record<string, string>> = {
  pessoa: '#34845a',
  capacete: '#d99a25',
  colete: '#397eae',
  sem_capacete: '#d6534b',
};

const ALL_CLASSES_IMAGE = 'glenov-brankovic-DWp5nUqTn6E-unsplash.jpg';

const minimalDataset = {
  images: [{ id: 1, file_name: 'scene.jpg', width: 100, height: 100 }],
  categories: [
    { id: 1, name: 'pessoa' },
    { id: 2, name: 'capacete' },
    { id: 3, name: 'colete' },
    { id: 4, name: 'sem_capacete' },
  ],
  annotations: [
    { id: 1, image_id: 1, category_id: 1, bbox: [10, 10, 20, 20], area: 400, iscrowd: 0 },
  ],
};

test.describe('EPI Vision dataset explorer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('starts with an empty state and rejects invalid JSON', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Seu dataset aparecerá aqui' })).toBeVisible();
    await expect(page.locator('.gallery-panel')).toHaveCount(0);

    await page.locator('#coco-file').setInputFiles({
      name: 'broken.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{invalid'),
    });

    await expect(page.locator('.error-notice')).toContainText('JSON válido');
    await expect(page.locator('.empty-state')).toBeVisible();
  });

  test('loads the real COCO dataset with totals, statistics and filters', async ({ page }) => {
    await loadRealCoco(page);

    await expect(page.locator('.summary-item strong')).toHaveText([
      String(dataset.images.length),
      String(dataset.annotations.length),
      String(dataset.categories.length),
    ]);

    const average = (dataset.annotations.length / dataset.images.length).toFixed(2);
    await expect(page.locator('.statistics-grid .stat-card strong')).toHaveText([
      String(dataset.images.length),
      String(dataset.annotations.length),
      average,
    ]);

    await expect(page.locator('.class-row')).toHaveCount(dataset.categories.length);
    for (const category of dataset.categories) {
      const row = page
        .locator('.class-row')
        .filter({ has: page.getByText(category.name, { exact: true }) });
      await expect(row.locator('.class-count')).toHaveText(
        String(annotationsForCategory(category.name).length),
      );
    }

    await expect(page.locator('.filter-hint')).toContainText(String(dataset.images.length));
    await expect(page.locator('.gallery-grid .image-card')).toHaveCount(dataset.images.length);
    await expect(page.locator('.image-card-name').first()).toHaveText(dataset.images[0].file_name);
    await expect(page.locator('.image-card .annotation-pill').first()).toContainText(
      String(annotationsForImage(dataset.images[0].file_name).length),
    );
  });

  test('warns about missing images and then renders real thumbnails', async ({ page }) => {
    await loadRealCoco(page);

    await page.locator('#image-files').setInputFiles(imagePaths.slice(0, 2));
    await expect(page.locator('.warning-notice')).toContainText(
      `${dataset.images.length - 2} imagem(ns)`,
    );

    await loadRealImages(page);

    await expect(page.locator('.warning-notice')).toHaveCount(0);
    await expect(
      page.locator('.upload-confirmation').filter({ hasText: 'imagens selecionadas' }),
    ).toContainText(`${dataset.images.length} imagens selecionadas`);
    await expect(page.locator('.thumbnail img').first()).toHaveAttribute('src', /^blob:/);
  });

  test('filters images by class and colors the preview boxes', async ({ page }) => {
    await loadRealCoco(page);
    await loadRealImages(page);

    const category = 'sem_capacete';
    await page.locator('.filter-option').filter({ hasText: category }).click();

    const expectedImages = imageCountForCategory(category);
    await expect(page.locator('.filter-hint')).toContainText(`${expectedImages} imagens`);
    await expect(page.locator('.gallery-grid .image-card')).toHaveCount(expectedImages);

    const firstName = await page.locator('.image-card-name').first().innerText();
    await selectGalleryImage(page, firstName);

    const expectedBoxes = annotationsForImage(firstName).filter(
      (annotation) =>
        annotation.category_id === dataset.categories.find((item) => item.name === category)?.id,
    );
    await expect(page.locator('.preview-counter')).toHaveText(`${expectedBoxes.length} anot.`);

    const boxes = page.locator('.preview-panel .annotation-layer rect');
    await expect(boxes).toHaveCount(expectedBoxes.length);
    const strokes = await boxes.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('stroke')),
    );
    expect(new Set(strokes)).toEqual(new Set([CLASS_COLORS[category]]));
  });

  test('shows every class color for an image that contains all four classes', async ({ page }) => {
    await loadRealCoco(page);
    await loadRealImages(page);
    await selectGalleryImage(page, ALL_CLASSES_IMAGE);

    const expectedBoxes = annotationsForImage(ALL_CLASSES_IMAGE);
    await expect(page.locator('.preview-counter')).toHaveText(`${expectedBoxes.length} anot.`);

    const boxes = page.locator('.preview-panel .annotation-layer rect');
    await expect(boxes).toHaveCount(expectedBoxes.length);
    const strokes = await boxes.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('stroke')),
    );
    expect(new Set(strokes)).toEqual(new Set(Object.values(CLASS_COLORS)));

    await expect(page.locator('.annotation-legend .legend-item')).toHaveCount(
      dataset.categories.length,
    );
  });

  test('opens fullscreen, traps focus, navigates with arrows and closes with Escape', async ({
    page,
  }) => {
    await loadRealCoco(page);
    await loadRealImages(page);

    await page.locator('.expand-button').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.locator('.viewer-position')).toHaveText(`1 / ${dataset.images.length}`);
    await expect(page.locator('.viewer-title h2')).toHaveText(dataset.images[0].file_name);
    await expect(
      page.getByRole('button', { name: 'Fechar visualização em tela cheia' }),
    ).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.viewer-position')).toHaveText(`2 / ${dataset.images.length}`);
    await expect(page.locator('.viewer-title h2')).toHaveText(dataset.images[1].file_name);

    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.viewer-position')).toHaveText(`1 / ${dataset.images.length}`);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('.expand-button')).toBeFocused();
  });

  test('starts fullscreen filters from the active class and reveals all classes', async ({
    page,
  }) => {
    await loadRealCoco(page);
    await loadRealImages(page);

    await page.locator('.filter-option').filter({ hasText: 'sem_capacete' }).click();
    await selectGalleryImage(page, ALL_CLASSES_IMAGE);
    await page.locator('.expand-button').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /^sem_capacete/ })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: /^pessoa/ })).not.toBeChecked();
    await expect(page.getByRole('checkbox', { name: /^capacete/ })).not.toBeChecked();
    await expect(page.getByRole('checkbox', { name: /^colete/ })).not.toBeChecked();

    const visibleBoxes = page.locator('.viewer-canvas rect');
    const semCapaceteId = dataset.categories.find(
      (category) => category.name === 'sem_capacete',
    )?.id;
    const expectedVisible = annotationsForImage(ALL_CLASSES_IMAGE).filter(
      (annotation) => annotation.category_id === semCapaceteId,
    ).length;
    await expect(visibleBoxes).toHaveCount(expectedVisible);

    await page.getByRole('button', { name: 'Marcar tudo' }).click();
    await expect(visibleBoxes).toHaveCount(annotationsForImage(ALL_CLASSES_IMAGE).length);

    await page.getByRole('button', { name: 'Tirar tudo' }).click();
    await expect(visibleBoxes).toHaveCount(0);
  });

  test('shows an empty gallery when a class has no images', async ({ page }) => {
    await page.locator('#coco-file').setInputFiles({
      name: 'minimal.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(minimalDataset)),
    });
    await expect(page.locator('.summary-item strong').first()).toHaveText('1');

    await page.locator('.filter-option').filter({ hasText: 'colete' }).click();

    await expect(page.locator('.gallery-empty')).toHaveText(
      'Nenhuma imagem possui anotações desta classe.',
    );
    await expect(page.locator('.image-card')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Nenhuma imagem para exibir' })).toBeVisible();
  });
});

test.describe('EPI Vision keyboard navigation', () => {
  test('selects a gallery card and opens fullscreen with the keyboard', async ({ page }) => {
    await page.goto('/');
    await loadRealCoco(page);
    await loadRealImages(page);

    const targetName = imageName(dataset.images[5].id);
    const target = page.locator('.image-card').filter({ hasText: targetName });
    await target.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.preview-meta strong')).toHaveText(targetName);

    await page.locator('.expand-button').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('.viewer-title h2')).toHaveText(targetName);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
