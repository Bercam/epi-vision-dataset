const CATEGORY_COLORS: Readonly<Record<string, string>> = {
  pessoa: '#34845a',
  capacete: '#d99a25',
  colete: '#397eae',
  sem_capacete: '#d6534b',
};

export function categoryColor(name: string): string {
  return CATEGORY_COLORS[name.trim().toLocaleLowerCase()] ?? '#66776e';
}
