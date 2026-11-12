import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CocoCategory } from '../../../core/models/coco-dataset.model';
import { categoryColor } from '../../../core/utils/category-colors';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-class-filter',
  templateUrl: './class-filter.html',
  styleUrl: './class-filter.scss',
})
export class ClassFilter {
  readonly categories = input.required<readonly CocoCategory[]>();
  readonly imageCounts = input.required<ReadonlyMap<number, number>>();
  readonly totalImageCount = input.required<number>();
  readonly selectedCategoryId = input<number | null>(null);
  readonly categorySelected = output<number | null>();

  protected color(name: string): string {
    return categoryColor(name);
  }
}
