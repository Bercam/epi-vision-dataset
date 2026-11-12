import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CocoAnnotation, CocoCategory, CocoImage } from '../../../core/models/coco-dataset.model';

const CATEGORY_COLORS: Readonly<Record<string, string>> = {
  pessoa: '#34845a',
  capacete: '#d99a25',
  colete: '#397eae',
  sem_capacete: '#d6534b',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-image-preview',
  templateUrl: './image-preview.html',
  styleUrl: './image-preview.scss',
})
export class ImagePreview {
  readonly image = input<CocoImage | null>(null);
  readonly imageUrl = input<string | null>(null);
  readonly annotations = input<readonly CocoAnnotation[]>([]);
  readonly categories = input<readonly CocoCategory[]>([]);
  readonly annotationCount = input(0);

  protected readonly categoryById = computed(
    () => new Map(this.categories().map((category) => [category.id, category])),
  );

  protected readonly visibleCategories = computed(() => {
    const visibleIds = new Set(this.annotations().map((annotation) => annotation.category_id));
    return this.categories().filter((category) => visibleIds.has(category.id));
  });

  protected categoryColor(name: string): string {
    return CATEGORY_COLORS[name] ?? '#66776e';
  }
}
