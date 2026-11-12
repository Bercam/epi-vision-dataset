import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CocoCategory } from '../../../core/models/coco-dataset.model';
import { categoryColor } from '../../../core/utils/category-colors';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  selector: 'app-dataset-statistics',
  templateUrl: './dataset-statistics.html',
  styleUrl: './dataset-statistics.scss',
})
export class DatasetStatistics {
  readonly categories = input.required<readonly CocoCategory[]>();
  readonly annotationCounts = input.required<ReadonlyMap<number, number>>();
  readonly imageCount = input.required<number>();
  readonly annotationCount = input.required<number>();
  readonly averagePerImage = input.required<number>();

  protected color(name: string): string {
    return categoryColor(name);
  }
}
