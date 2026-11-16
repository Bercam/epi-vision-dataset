import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { CocoAnnotation, CocoDataset, CocoImage } from '../../../core/models/coco-dataset.model';
import { DatasetLoaderService } from '../../../core/services/dataset-loader.service';
import { DatasetImportPanel } from '../components/dataset-import-panel';
import { DatasetGallery } from '../components/dataset-gallery';
import { ImagePreview } from '../components/image-preview';
import { ImageFullscreenViewer } from '../components/image-fullscreen-viewer';
import { ClassFilter } from '../components/class-filter';
import { DatasetStatistics } from '../components/dataset-statistics';
import { filterAnnotationsByCategory } from '../../../core/utils/filter-annotations';
import { normalizeFileName } from '../../../core/utils/file-name';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatasetImportPanel,
    DatasetGallery,
    ImagePreview,
    ImageFullscreenViewer,
    ClassFilter,
    DatasetStatistics,
  ],
  selector: 'app-dataset-page',
  standalone: true,
  templateUrl: './dataset-page.html',
  styleUrl: './dataset-page.scss',
})
export class DatasetPage implements OnDestroy {
  private readonly loader = inject(DatasetLoaderService);

  protected readonly dataset = signal<CocoDataset | null>(null);
  protected readonly imageUrls = signal<ReadonlyMap<string, string>>(new Map());
  protected readonly selectedImageId = signal<number | null>(null);
  protected readonly selectedCategoryId = signal<number | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly hasImageSelection = signal(false);
  protected readonly isFullscreen = signal(false);
  protected readonly datasetFileName = signal<string | null>(null);
  protected readonly selectedImageCount = signal<number | null>(null);

  protected readonly annotationCounts = computed(() => {
    const counts = new Map<number, number>();
    for (const annotation of this.dataset()?.annotations ?? []) {
      counts.set(annotation.image_id, (counts.get(annotation.image_id) ?? 0) + 1);
    }
    return counts;
  });

  protected readonly annotationCountsByCategory = computed(() => {
    const counts = new Map<number, number>();
    for (const annotation of this.dataset()?.annotations ?? []) {
      counts.set(annotation.category_id, (counts.get(annotation.category_id) ?? 0) + 1);
    }
    return counts;
  });

  protected readonly averageAnnotationsPerImage = computed(() => {
    const dataset = this.dataset();
    if (!dataset || dataset.images.length === 0) return 0;
    return dataset.annotations.length / dataset.images.length;
  });

  protected readonly galleryEmptyMessage = computed(() =>
    this.selectedCategoryId() === null
      ? 'Este dataset não contém imagens cadastradas.'
      : 'Nenhuma imagem possui anotações desta classe.',
  );

  protected readonly imageCountsByCategory = computed(() => {
    const imageIdsByCategory = new Map<number, Set<number>>();
    for (const annotation of this.dataset()?.annotations ?? []) {
      const imageIds = imageIdsByCategory.get(annotation.category_id) ?? new Set<number>();
      imageIds.add(annotation.image_id);
      imageIdsByCategory.set(annotation.category_id, imageIds);
    }
    return new Map(
      [...imageIdsByCategory].map(([categoryId, imageIds]) => [categoryId, imageIds.size]),
    );
  });

  protected readonly filteredImages = computed(() => {
    const dataset = this.dataset();
    const categoryId = this.selectedCategoryId();
    if (!dataset || categoryId === null) return dataset?.images ?? [];
    const imageIds = new Set(
      dataset.annotations
        .filter((annotation) => annotation.category_id === categoryId)
        .map((annotation) => annotation.image_id),
    );
    return dataset.images.filter((image) => imageIds.has(image.id));
  });

  protected readonly annotationsByImage = computed(() => {
    const grouped = new Map<number, CocoAnnotation[]>();
    for (const annotation of this.dataset()?.annotations ?? []) {
      const annotations = grouped.get(annotation.image_id) ?? [];
      annotations.push(annotation);
      grouped.set(annotation.image_id, annotations);
    }
    return grouped;
  });

  protected readonly selectedImage = computed(() => {
    const id = this.selectedImageId();
    return this.dataset()?.images.find((image) => image.id === id) ?? null;
  });

  protected readonly fullscreenPosition = computed(() => {
    const images = this.filteredImages();
    const index = images.findIndex((image) => image.id === this.selectedImageId());
    return index < 0 ? 0 : index + 1;
  });

  protected readonly selectedImageUrl = computed(() => {
    const image = this.selectedImage();
    return image ? (this.imageUrls().get(normalizeFileName(image.file_name)) ?? null) : null;
  });

  protected readonly selectedAnnotations = computed(() => {
    const id = this.selectedImageId();
    if (id === null) return [];

    return filterAnnotationsByCategory(
      this.annotationsByImage().get(id) ?? [],
      this.selectedCategoryId(),
    );
  });

  protected readonly allAnnotationsForSelectedImage = computed(() => {
    const id = this.selectedImageId();
    return id === null ? [] : (this.annotationsByImage().get(id) ?? []);
  });

  protected readonly fullscreenInitialHiddenCategoryIds = computed(() => {
    const selectedCategoryId = this.selectedCategoryId();
    if (selectedCategoryId === null) return [];

    return (this.dataset()?.categories ?? [])
      .filter((category) => category.id !== selectedCategoryId)
      .map((category) => category.id);
  });

  protected readonly missingImageCount = computed(() => {
    const dataset = this.dataset();
    if (!dataset || !this.hasImageSelection()) return 0;
    const urls = this.imageUrls();
    return dataset.images.filter((image) => !urls.has(normalizeFileName(image.file_name))).length;
  });

  protected async loadCocoFile(file: File): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.isFullscreen.set(false);
    this.datasetFileName.set(null);

    try {
      const dataset = await this.loader.loadJsonFile(file);
      this.dataset.set(dataset);
      this.datasetFileName.set(file.name);
      this.selectedCategoryId.set(null);
      this.selectedImageId.set(dataset.images[0]?.id ?? null);
    } catch (error: unknown) {
      this.dataset.set(null);
      this.selectedCategoryId.set(null);
      this.selectedImageId.set(null);
      this.errorMessage.set(
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível carregar esse arquivo. Confira o JSON e tente novamente.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  protected registerImages(files: readonly File[]): void {
    if (files.length === 0) return;

    const imageUrls = this.loader.registerImageFiles(files);
    this.hasImageSelection.set(true);
    this.imageUrls.set(imageUrls);
    this.selectedImageCount.set(imageUrls.size);
  }

  protected selectImage(image: CocoImage): void {
    this.selectedImageId.set(image.id);
  }

  protected openFullscreen(): void {
    if (this.selectedImage()) {
      this.isFullscreen.set(true);
    }
  }

  protected openImageFullscreen(image: CocoImage): void {
    if (!this.imageUrl(image)) return;

    this.selectedImageId.set(image.id);
    this.isFullscreen.set(true);
  }

  protected closeFullscreen(): void {
    this.isFullscreen.set(false);
  }

  protected showPreviousImage(): void {
    this.moveFullscreenSelection(-1);
  }

  protected showNextImage(): void {
    this.moveFullscreenSelection(1);
  }

  private moveFullscreenSelection(step: number): void {
    const images = this.filteredImages();
    if (images.length === 0) return;

    const currentIndex = images.findIndex((image) => image.id === this.selectedImageId());
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + step + images.length) % images.length;
    this.selectedImageId.set(images[nextIndex].id);
  }

  protected selectCategory(categoryId: number | null): void {
    this.selectedCategoryId.set(categoryId);
    const visibleImages = this.filteredImages();
    if (!visibleImages.some((image) => image.id === this.selectedImageId())) {
      this.selectedImageId.set(visibleImages[0]?.id ?? null);
    }
  }

  protected imageUrl(image: CocoImage): string | null {
    return this.imageUrls().get(normalizeFileName(image.file_name)) ?? null;
  }

  ngOnDestroy(): void {
    this.loader.releaseImageUrls();
  }
}
