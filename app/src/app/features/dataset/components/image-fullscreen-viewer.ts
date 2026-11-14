import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import { CocoAnnotation, CocoCategory, CocoImage } from '../../../core/models/coco-dataset.model';
import { categoryColor } from '../../../core/utils/category-colors';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-image-fullscreen-viewer',
  standalone: true,
  templateUrl: './image-fullscreen-viewer.html',
  styleUrl: './image-fullscreen-viewer.scss',
})
export class ImageFullscreenViewer implements AfterViewInit, OnDestroy {
  readonly image = input.required<CocoImage>();
  readonly imageUrl = input<string | null>(null);
  readonly annotations = input<readonly CocoAnnotation[]>([]);
  readonly categories = input<readonly CocoCategory[]>([]);
  readonly initialHiddenCategoryIds = input<readonly number[]>([]);
  readonly position = input(0);
  readonly total = input(0);

  readonly closed = output<void>();
  readonly previous = output<void>();
  readonly next = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLElement>>('dialog');
  private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');

  private readonly previouslyFocused: HTMLElement | null;
  private readonly previousBodyOverflow: string | null;

  constructor() {
    const active = typeof document === 'undefined' ? null : document.activeElement;
    this.previouslyFocused =
      active instanceof HTMLElement && active !== document.body ? active : null;

    if (typeof document === 'undefined') {
      this.previousBodyOverflow = null;
      return;
    }

    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this.onKeydown);
  }

  protected readonly categoryById = computed(
    () => new Map(this.categories().map((category) => [category.id, category])),
  );

  protected readonly hiddenCategoryIds = linkedSignal<ReadonlySet<number>>(
    () => new Set(this.initialHiddenCategoryIds()),
  );

  protected readonly categoryFilters = computed(() => {
    const counts = new Map<number, number>();
    for (const annotation of this.annotations()) {
      counts.set(annotation.category_id, (counts.get(annotation.category_id) ?? 0) + 1);
    }

    const hidden = this.hiddenCategoryIds();
    return this.categories()
      .filter((category) => counts.has(category.id))
      .map((category) => {
        const count = counts.get(category.id) ?? 0;
        return {
          category,
          count,
          visible: !hidden.has(category.id),
          label: `${category.name} (${count} ${count === 1 ? 'anotação' : 'anotações'})`,
        };
      });
  });

  protected readonly visibleAnnotations = computed(() => {
    const hidden = this.hiddenCategoryIds();
    return this.annotations().filter((annotation) => !hidden.has(annotation.category_id));
  });

  protected setCategoryVisibility(categoryId: number, visible: boolean): void {
    this.hiddenCategoryIds.update((hidden) => {
      const next = new Set(hidden);
      if (visible) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  protected showAllCategories(): void {
    const presentIds = new Set(this.annotations().map((annotation) => annotation.category_id));
    this.hiddenCategoryIds.update((hidden) => {
      const next = new Set(hidden);
      for (const categoryId of presentIds) next.delete(categoryId);
      return next;
    });
  }

  protected hideAllCategories(): void {
    const presentIds = this.annotations().map((annotation) => annotation.category_id);
    this.hiddenCategoryIds.update((hidden) => new Set([...hidden, ...presentIds]));
  }

  protected categoryColor(name: string): string {
    return categoryColor(name);
  }

  ngAfterViewInit(): void {
    this.closeButton().nativeElement.focus();
  }

  ngOnDestroy(): void {
    if (typeof document === 'undefined') return;

    document.removeEventListener('keydown', this.onKeydown);
    document.body.style.overflow = this.previousBodyOverflow ?? '';
    this.previouslyFocused?.focus();
  }

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closed.emit();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous.emit();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next.emit();
      return;
    }

    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  };

  private trapFocus(event: KeyboardEvent): void {
    const dialog = this.dialog().nativeElement;
    const focusable = [
      ...dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ];
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    const outside = !(active instanceof Node) || !dialog.contains(active);

    if (event.shiftKey && (active === first || outside)) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && (active === last || outside)) {
      event.preventDefault();
      first.focus();
    }
  }
}
