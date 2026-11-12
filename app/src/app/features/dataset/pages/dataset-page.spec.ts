import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

describe('DatasetPage class filter', () => {
  let fixture: ComponentFixture<DatasetPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DatasetPage] }).compileComponents();
    fixture = TestBed.createComponent(DatasetPage);
  });

  afterEach(() => fixture.destroy());

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
});
