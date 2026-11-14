import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dataset-import-panel',
  standalone: true,
  templateUrl: './dataset-import-panel.html',
  styleUrl: './dataset-import-panel.scss',
})
export class DatasetImportPanel {
  readonly isLoading = input(false);
  readonly errorMessage = input<string | null>(null);
  readonly missingImageCount = input(0);
  readonly cocoFileName = input<string | null>(null);
  readonly selectedImageCount = input<number | null>(null);
  readonly cocoSelected = output<File>();
  readonly imagesSelected = output<readonly File[]>();

  protected readonly imageCountLabel = computed(() => {
    const count = this.selectedImageCount();
    if (count === null) return null;

    return count === 1 ? '1 imagem selecionada' : `${count} imagens selecionadas`;
  });

  onCocoSelected(event: Event): void {
    const inputElement = event.currentTarget;
    if (!(inputElement instanceof HTMLInputElement)) return;

    const file = inputElement.files?.item(0);
    inputElement.value = '';
    if (file) this.cocoSelected.emit(file);
  }

  onImagesSelected(event: Event): void {
    const inputElement = event.currentTarget;
    if (!(inputElement instanceof HTMLInputElement)) return;

    const files = Array.from(inputElement.files ?? []);
    inputElement.value = '';
    this.imagesSelected.emit(files);
  }
}
