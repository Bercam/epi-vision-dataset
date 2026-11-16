/**
 * Reduz um caminho ou nome de arquivo ao nome base em minúsculas, usado para
 * relacionar as imagens do COCO aos arquivos escolhidos no navegador.
 */
export function normalizeFileName(fileName: string): string {
  const baseName = fileName.split(/[\\/]/).pop() ?? fileName;
  return baseName.toLowerCase();
}
