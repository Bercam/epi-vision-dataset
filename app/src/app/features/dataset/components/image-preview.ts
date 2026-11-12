import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CocoImage } from '../../../core/models/coco-dataset.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-image-preview',
  templateUrl: './image-preview.html',
  styleUrl: './image-preview.scss',
})
export class ImagePreview {
  readonly image = input<CocoImage | null>(null);
  readonly imageUrl = input<string | null>(null);
  readonly annotationCount = input(0);
}
