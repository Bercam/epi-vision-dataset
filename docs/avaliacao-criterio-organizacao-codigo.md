# Avaliação — Organização do código e padrões de escrita (20%)

## Resultado atual

**Estimativa: 92–96% do critério.** A estrutura está organizada, a aplicação compila com TypeScript/Angular em modo estrito e templates estritos, ESLint e Prettier passam, e há suíte unitária e E2E. Não é uma nota oficial do avaliador.

## Evidências

- Separação por `core/` (modelos, serviço, validador e utilitários) e `features/dataset/` (página e componentes).
- Todos os oito componentes (`App`, `DatasetPage`, importação, estatísticas, filtro, galeria, prévia e tela cheia) declaram `standalone: true` explicitamente; contratos usam `readonly` e entradas externas são recebidas como `unknown` antes da validação.
- Não há uso de `any`, `console.log`, `TODO` ou `FIXME` em `app/src/`. `console.error` é usado apenas para informar uma falha fatal de bootstrap.
- `strict: true` e `strictTemplates: true` foram habilitados em `app/tsconfig.json`; compilação de produção passou em 2026-11-16.
- O Prettier já estava configurado, mas 17 arquivos estavam fora do padrão. A formatação foi aplicada e `npx prettier --check "src/**/*.{ts,html,scss}" "e2e/**/*.ts"` passou.
- `normalizeFileName` foi extraído para `core/utils/file-name.ts` e reutilizado pelo serviço, pela página e pela galeria, eliminando três cópias da mesma regra.
- O runner oficial `@angular/build:unit-test` foi configurado com Vitest; `npm test` passou com **40 testes em 6 arquivos**, cobrindo validação COCO, leitura do JSON, ciclo de vida das URLs de imagem, filtragem pura, normalização de nomes, inputs de upload em ambas as ordens, confirmação visual, erros amigáveis, imagens ausentes, contagem apenas de arquivos de imagem, estatísticas, filtro de classe na página e a tela cheia (teclado, foco, rolagem, duplo clique, wrap-around e visibilidade por classe, inclusive classes ausentes na imagem).
- `npm run e2e` passou com **9 testes Playwright em Chromium** contra o dataset real, cobrindo carregamento, estatísticas, upload, miniaturas, filtro por classe, cores das caixas, tela cheia, teclado, erros e estados vazios.
- `angular-eslint` 22, ESLint 10 e regras recomendadas para TypeScript, templates e acessibilidade estão configurados; `npm run lint` passou.
- `npm audit` reportou zero vulnerabilidades após atualização para ESLint 10 e override restrito da dependência `minimatch` vulnerável; build, lint e testes passaram com essa resolução.

## Lacunas

- Os E2E rodam apenas em Chromium; não há execução cross-browser nem em dispositivos físicos.
- A página concentra cálculos e filtros do dataset. Para o tamanho atual, o estado derivado permanece local e tipado; se a lógica crescer, deve migrar para funções/serviço de domínio.

## Próximo ajuste recomendado

Validar o layout em dispositivos reais e considerar um segundo navegador nos E2E; não há necessidade de reestruturar a página no tamanho atual.
