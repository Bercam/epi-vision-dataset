# Avaliação — Organização do código e padrões de escrita (20%)

## Resultado atual

**Estimativa: 80–85% do critério.** A estrutura está organizada e a aplicação compila com TypeScript/Angular em modo estrito e templates estritos. Não é uma nota oficial do avaliador.

## Evidências

- Separação por `core/` (modelos, serviço, validador e utilitário) e `features/dataset/` (página e componentes).
- Componentes standalone; contratos com `readonly` e entradas externas recebidas como `unknown` antes da validação.
- Não há uso de `any`, `console.log`, `TODO` ou `FIXME` em `app/src/`. `console.error` é usado apenas para informar uma falha fatal de bootstrap.
- `strict: true` e `strictTemplates: true` foram habilitados em `app/tsconfig.json`; compilação de produção passou em 2026-11-12.
- O Prettier já estava configurado, mas 17 arquivos estavam fora do padrão. A formatação foi aplicada e `npx prettier --check src tsconfig.json angular.json` passou.

## Lacunas

- ESLint ainda não está configurado nem possui script no `package.json`.
- Não há suíte de testes automatizados; esse ponto também requer atenção na avaliação geral do projeto.
- A página concentra cálculos e filtros do dataset. Para o tamanho atual, o estado derivado permanece local e tipado; se a lógica crescer, deve migrar para funções/serviço de domínio.

## Próximo ajuste recomendado

Adicionar lint e cobertura automatizada compatíveis com a versão atual do Angular, sem introduzir dependências sem justificativa. A decisão deve considerar a disponibilidade do registry e o escopo do prazo.
