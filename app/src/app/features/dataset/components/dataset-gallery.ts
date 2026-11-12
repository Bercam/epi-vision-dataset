import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CocoImage } from '../../../core/models/coco-dataset.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dataset-gallery',
  standalone: true,
  templateUrl: './dataset-gallery.html',
  styleUrl: './dataset-gallery.scss',
})
export class DatasetGallery {
  readonly images = input.required<readonly CocoImage[]>();
  readonly imageUrls = input.required<ReadonlyMap<string, string>>();
  readonly annotationCounts = input.required<ReadonlyMap<number, number>>();
  readonly selectedImageId = input<number | null>(null);
  readonly emptyMessage = input('Nenhuma imagem disponível para este filtro.');
  readonly imageSelected = output<CocoImage>();

  imageUrl(image: CocoImage): string | null {
    return this.imageUrls().get(this.normalizeFileName(image.file_name)) ?? null;
  }

  private normalizeFileName(fileName: string): string {
    return fileName.split(/[\\/]/).pop()?.toLocaleLowerCase() ?? fileName.toLocaleLowerCase();
  }
}
