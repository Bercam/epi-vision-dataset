# Avaliação — Organização do código e padrões de escrita (20%)

## Resultado atual

**Estimativa: 90–95% do critério.** A estrutura está organizada, a aplicação compila com TypeScript/Angular em modo estrito e templates estritos, ESLint e Prettier passam, e há uma suíte unitária inicial. Não é uma nota oficial do avaliador.

## Evidências

- Separação por `core/` (modelos, serviço, validador e utilitário) e `features/dataset/` (página e componentes).
- Todos os oito componentes (`App`, `DatasetPage`, importação, estatísticas, filtro, galeria, prévia e tela cheia) declaram `standalone: true` explicitamente; contratos usam `readonly` e entradas externas são recebidas como `unknown` antes da validação.
- Não há uso de `any`, `console.log`, `TODO` ou `FIXME` em `app/src/`. `console.error` é usado apenas para informar uma falha fatal de bootstrap.
- `strict: true` e `strictTemplates: true` foram habilitados em `app/tsconfig.json`; compilação de produção passou em 2026-11-13.
- O Prettier já estava configurado, mas 17 arquivos estavam fora do padrão. A formatação foi aplicada e `npx prettier --check "src/**/*.{ts,html,scss}"` passou.
- O runner oficial `@angular/build:unit-test` foi configurado com Vitest; `npm test` passou com **35 testes em 5 arquivos**, cobrindo validação COCO, leitura do JSON, ciclo de vida das URLs de imagem, filtragem pura, inputs de upload em ambas as ordens, confirmação visual, erros amigáveis, imagens ausentes, estatísticas, filtro de classe na página e a tela cheia (teclado, foco, rolagem, duplo clique, wrap-around e visibilidade por classe).
- `angular-eslint` 22, ESLint 10 e regras recomendadas para TypeScript, templates e acessibilidade estão configurados; `npm run lint` passou.
- `npm audit` reportou zero vulnerabilidades após atualização para ESLint 10 e override restrito da dependência `minimatch` vulnerável; build, lint e testes passaram com essa resolução.

## Lacunas

- A suíte cobre os fluxos principais, mas ainda não há testes E2E em navegador real nem verificação visual automatizada de layout.
- A página concentra cálculos e filtros do dataset. Para o tamanho atual, o estado derivado permanece local e tipado; se a lógica crescer, deve migrar para funções/serviço de domínio.

## Próximo ajuste recomendado

Adicionar testes E2E dos fluxos principais em navegador real, sem substituir a suíte unitária atual.
