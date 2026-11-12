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

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatasetImportPanel, DatasetGallery, ImagePreview],
  selector: 'app-dataset-page',
  templateUrl: './dataset-page.html',
  styleUrl: './dataset-page.scss',
})
export class DatasetPage implements OnDestroy {
  private readonly loader = inject(DatasetLoaderService);

  protected readonly dataset = signal<CocoDataset | null>(null);
  protected readonly imageUrls = signal<ReadonlyMap<string, string>>(new Map());
  protected readonly selectedImageId = signal<number | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly hasImageSelection = signal(false);

  protected readonly annotationCounts = computed(() => {
    const counts = new Map<number, number>();
    for (const annotation of this.dataset()?.annotations ?? []) {
      counts.set(annotation.image_id, (counts.get(annotation.image_id) ?? 0) + 1);
    }
    return counts;
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

  protected readonly selectedImageUrl = computed(() => {
    const image = this.selectedImage();
    return image ? this.imageUrls().get(this.loader.normalizeFileName(image.file_name)) ?? null : null;
  });

  protected readonly selectedAnnotations = computed(() => {
    const id = this.selectedImageId();
    return id === null ? [] : this.annotationsByImage().get(id) ?? [];
  });

  protected readonly missingImageCount = computed(() => {
    const dataset = this.dataset();
    if (!dataset || !this.hasImageSelection()) return 0;
    const urls = this.imageUrls();
    return dataset.images.filter(
      (image) => !urls.has(this.loader.normalizeFileName(image.file_name)),
    ).length;
  });

  protected async loadCocoFile(file: File): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const dataset = await this.loader.loadJsonFile(file);
      this.dataset.set(dataset);
      this.selectedImageId.set(dataset.images[0]?.id ?? null);
    } catch (error: unknown) {
      this.dataset.set(null);
      this.selectedImageId.set(null);
      this.errorMessage.set(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar esse arquivo. Confira o JSON e tente novamente.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  protected registerImages(files: readonly File[]): void {
    this.hasImageSelection.set(true);
    this.imageUrls.set(this.loader.registerImageFiles(files));
  }

  protected selectImage(image: CocoImage): void {
    this.selectedImageId.set(image.id);
  }

  protected imageUrl(image: CocoImage): string | null {
    return this.imageUrls().get(this.loader.normalizeFileName(image.file_name)) ?? null;
  }

  ngOnDestroy(): void {
    this.loader.releaseImageUrls();
  }
}
