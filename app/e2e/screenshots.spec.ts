import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  SCREENSHOTS_DIR,
  loadRealCoco,
  loadRealImages,
  selectGalleryImage,
} from './support/dataset';

const ALL_CLASSES_IMAGE = 'glenov-brankovic-DWp5nUqTn6E-unsplash.jpg';

mkdirSync(SCREENSHOTS_DIR, { recursive: true });

test.describe('@screenshots documentation captures', () => {
  test.use({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });

  test('captures the desktop flow', async ({ page }) => {
    await page.goto('/');
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '01-estado-inicial.png') });

    await loadRealCoco(page);
    await loadRealImages(page);
    await expect(page.locator('.thumbnail img').first()).toHaveAttribute('src', /^blob:/);
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '02-dataset-carregado.png') });

    await selectGalleryImage(page, ALL_CLASSES_IMAGE);
    await page.locator('.workspace').scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '03-galeria-e-preview.png') });

    await page.locator('.expand-button').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '04-tela-cheia.png') });
  });
});

test.describe('@screenshots mobile capture', () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

  test('captures the mobile gallery', async ({ page }) => {
    await page.goto('/');
    await loadRealCoco(page);
    await loadRealImages(page);
    await expect(page.locator('.thumbnail img').first()).toHaveAttribute('src', /^blob:/);
    await page.locator('.gallery-panel').scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(SCREENSHOTS_DIR, '05-mobile-galeria.png') });
  });
});
