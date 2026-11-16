import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CocoAnnotation, CocoCategory, CocoImage } from '../../../core/models/coco-dataset.model';
import { ImageFullscreenViewer } from './image-fullscreen-viewer';

const image: CocoImage = { id: 1, file_name: 'scene-a.jpg', width: 100, height: 80 };

const categories: readonly CocoCategory[] = [
  { id: 1, name: 'pessoa' },
  { id: 2, name: 'capacete' },
  { id: 3, name: 'colete' },
  { id: 4, name: 'sem_capacete' },
];

const annotations: readonly CocoAnnotation[] = [
  { id: 1, image_id: 1, category_id: 1, bbox: [10, 10, 40, 50], area: 2000, iscrowd: 0 },
  { id: 2, image_id: 1, category_id: 2, bbox: [20, 10, 15, 12], area: 180, iscrowd: 0 },
];

describe('ImageFullscreenViewer', () => {
  let fixture: ComponentFixture<ImageFullscreenViewer> | null = null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ImageFullscreenViewer] }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    fixture = null;
    document.body.style.overflow = '';
  });

  function render(
    hiddenCategoryIds: readonly number[] = [],
  ): ComponentFixture<ImageFullscreenViewer> {
    const created = TestBed.createComponent(ImageFullscreenViewer);
    created.componentRef.setInput('image', image);
    created.componentRef.setInput('imageUrl', 'blob:scene-a');
    created.componentRef.setInput('annotations', annotations);
    created.componentRef.setInput('categories', categories);
    created.componentRef.setInput('initialHiddenCategoryIds', hiddenCategoryIds);
    created.componentRef.setInput('position', 2);
    created.componentRef.setInput('total', 5);
    created.detectChanges();
    fixture = created;
    return created;
  }

  function filterOptions(root: HTMLElement): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>('.filter-option')];
  }

  function boxes(root: HTMLElement): NodeListOf<Element> {
    return root.querySelectorAll('.bounding-box');
  }

  it('renders the dialog, position, annotated image, and class filters', () => {
    const root = render().nativeElement as HTMLElement;

    expect(root.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');
    expect(root.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toContain(
      'scene-a.jpg',
    );
    expect(root.querySelector('.viewer-position')?.textContent?.trim()).toBe('2 / 5');
    expect(root.querySelector('.viewer-canvas image')?.getAttribute('href')).toBe('blob:scene-a');
    expect(boxes(root)).toHaveLength(2);

    const options = filterOptions(root);
    expect(
      options.map((option) => option.querySelector('.filter-name')?.textContent?.trim()),
    ).toEqual(['pessoa', 'capacete']);
    expect(
      options.map((option) => option.querySelector('.filter-count')?.textContent?.trim()),
    ).toEqual(['1', '1']);
    expect(
      options.map((option) => option.querySelector<HTMLInputElement>('input')?.checked),
    ).toEqual([true, true]);
  });

  it('hides and restores a class when its checkbox is toggled', () => {
    const root = render().nativeElement as HTMLElement;
    const pessoaInput = filterOptions(root)[0]?.querySelector<HTMLInputElement>('input');
    if (!pessoaInput) throw new Error('O checkbox da classe pessoa não foi renderizado.');

    pessoaInput.checked = false;
    pessoaInput.dispatchEvent(new Event('change'));
    fixture?.detectChanges();

    expect(boxes(root)).toHaveLength(1);
    expect(root.querySelector('.viewer-footer')?.textContent).toContain('1 de 2 anot.');

    pessoaInput.checked = true;
    pessoaInput.dispatchEvent(new Event('change'));
    fixture?.detectChanges();

    expect(boxes(root)).toHaveLength(2);
  });

  it('removes and restores all classes with the bulk buttons', () => {
    const root = render().nativeElement as HTMLElement;
    const actions = [...root.querySelectorAll<HTMLButtonElement>('.filter-action')];
    const markAll = actions.find((button) => button.textContent?.includes('Marcar tudo'));
    const clearAll = actions.find((button) => button.textContent?.includes('Tirar tudo'));
    if (!markAll || !clearAll) throw new Error('Os botões de marcar/limpar tudo não apareceram.');

    clearAll.click();
    fixture?.detectChanges();

    expect(boxes(root)).toHaveLength(0);
    expect(
      filterOptions(root).map((option) => option.querySelector<HTMLInputElement>('input')?.checked),
    ).toEqual([false, false]);

    markAll.click();
    fixture?.detectChanges();

    expect(boxes(root)).toHaveLength(2);
  });

  it('applies the bulk buttons to classes absent from the current image', () => {
    const created = render();
    const root = created.nativeElement as HTMLElement;
    const actions = [...root.querySelectorAll<HTMLButtonElement>('.filter-action')];
    const markAll = actions.find((button) => button.textContent?.includes('Marcar tudo'));
    const clearAll = actions.find((button) => button.textContent?.includes('Tirar tudo'));
    if (!markAll || !clearAll) throw new Error('Os botões de marcar/limpar tudo não apareceram.');

    clearAll.click();
    created.detectChanges();

    // The next image only contains "colete", a class that is absent from the current image.
    created.componentRef.setInput('image', { ...image, id: 2, file_name: 'scene-b.jpg' });
    created.componentRef.setInput('annotations', [
      { id: 3, image_id: 2, category_id: 3, bbox: [5, 5, 20, 20], area: 400, iscrowd: 0 },
    ] satisfies CocoAnnotation[]);
    created.detectChanges();

    expect(boxes(root)).toHaveLength(0);
    expect(
      filterOptions(root).map((option) => option.querySelector<HTMLInputElement>('input')?.checked),
    ).toEqual([false]);

    markAll.click();
    created.detectChanges();

    expect(boxes(root)).toHaveLength(1);
    expect(
      filterOptions(root).map((option) => option.querySelector<HTMLInputElement>('input')?.checked),
    ).toEqual([true]);
  });

  it('starts with the classes hidden by the initial filter', () => {
    const root = render([1]).nativeElement as HTMLElement;

    expect(boxes(root)).toHaveLength(1);
    expect(
      filterOptions(root).map((option) => option.querySelector<HTMLInputElement>('input')?.checked),
    ).toEqual([false, true]);
  });

  it('keeps the class selection when navigating to another image', () => {
    const created = render();
    const root = created.nativeElement as HTMLElement;
    const pessoaInput = filterOptions(root)[0]?.querySelector<HTMLInputElement>('input');
    if (!pessoaInput) throw new Error('O checkbox da classe pessoa não foi renderizado.');

    pessoaInput.checked = false;
    pessoaInput.dispatchEvent(new Event('change'));
    created.detectChanges();

    created.componentRef.setInput('image', { ...image, id: 2, file_name: 'scene-b.jpg' });
    created.detectChanges();

    const pessoaAfterNavigation = filterOptions(root)[0]?.querySelector<HTMLInputElement>('input');
    expect(pessoaAfterNavigation?.checked).toBe(false);
  });

  it('emits navigation and close events from the keyboard', () => {
    const component = render().componentInstance;
    let previous = 0;
    let next = 0;
    let closed = 0;
    component.previous.subscribe(() => previous++);
    component.next.subscribe(() => next++);
    component.closed.subscribe(() => closed++);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(previous).toBe(1);
    expect(next).toBe(1);
    expect(closed).toBe(1);
  });

  it('ignores arrow keys combined with browser modifiers', () => {
    const component = render().componentInstance;
    let next = 0;
    component.next.subscribe(() => next++);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true }));

    expect(next).toBe(0);
  });

  it('focuses the close button and traps Tab navigation inside the dialog', () => {
    const root = render().nativeElement as HTMLElement;
    const closeButton = root.querySelector<HTMLButtonElement>('.viewer-button');
    const nextButton = root.querySelector<HTMLButtonElement>('.viewer-nav-next');

    expect(document.activeElement).toBe(closeButton);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }));
    expect(document.activeElement).toBe(nextButton);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(document.activeElement).toBe(closeButton);
  });

  it('locks body scrolling and restores focus when destroyed', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'abrir';
    document.body.appendChild(trigger);
    trigger.focus();

    document.body.style.overflow = 'auto';
    const created = render();
    expect(document.body.style.overflow).toBe('hidden');

    created.destroy();
    fixture = null;

    expect(document.body.style.overflow).toBe('auto');
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});
