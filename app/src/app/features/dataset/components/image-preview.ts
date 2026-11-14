import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CocoAnnotation, CocoCategory, CocoImage } from '../../../core/models/coco-dataset.model';
import { categoryColor } from '../../../core/utils/category-colors';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-image-preview',
  standalone: true,
  templateUrl: './image-preview.html',
  styleUrl: './image-preview.scss',
})
export class ImagePreview {
  readonly image = input<CocoImage | null>(null);
  readonly imageUrl = input<string | null>(null);
  readonly annotations = input<readonly CocoAnnotation[]>([]);
  readonly categories = input<readonly CocoCategory[]>([]);
  readonly annotationCount = input(0);
  readonly datasetLoaded = input(false);
  readonly expand = output<void>();

  protected readonly categoryById = computed(
    () => new Map(this.categories().map((category) => [category.id, category])),
  );

  protected readonly visibleCategories = computed(() => {
    const visibleIds = new Set(this.annotations().map((annotation) => annotation.category_id));
    return this.categories().filter((category) => visibleIds.has(category.id));
  });

  protected categoryColor(name: string): string {
    return categoryColor(name);
  }

  protected requestExpand(): void {
    if (this.imageUrl()) {
      this.expand.emit();
    }
  }
}
