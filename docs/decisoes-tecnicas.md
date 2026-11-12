# Registro de Decisões Técnicas

## 1. Objetivo

Registrar decisões de arquitetura, implementação, organização e tratamento de dados. Os registros abaixo descrevem o que já está implementado; não alteram os requisitos originais do teste.

## 2. Decisões implementadas

### ADR-001 — Dataset separado do código da aplicação

- **Status:** Implementada
- **Contexto:** Dataset e aplicação precisam permanecer organizados e verificáveis separadamente.
- **Decisão:** Manter o conjunto oficial em `dataset/` e o app Angular em `app/`. O app não mantém uma cópia das imagens em `src/assets/`.
- **Consequências:** Evita cópias divergentes. Para explorar o dataset, a pessoa seleciona o COCO JSON e as imagens no navegador.
- **Evidência:** Estrutura do repositório e fluxo de upload atual.

### ADR-002 — Upload conjunto de COCO e imagens

- **Status:** Implementada
- **Contexto:** O JSON COCO contém nomes e dimensões, mas não disponibiliza os arquivos de imagem.
- **Decisão:** Permitir selecionar o JSON e, separadamente, múltiplas imagens locais; podem ser selecionados em qualquer ordem.
- **Consequências:** O app funciona sem copiar imagens para os assets. A seleção das imagens precisa ser feita novamente após recarregar a página; as imagens ausentes são informadas pela interface.
- **Evidência:** `DatasetImportPanel` e `DatasetLoaderService`.

### ADR-003 — Validação do COCO em runtime

- **Status:** Implementada
- **Contexto:** O arquivo carregado é entrada externa e interfaces TypeScript não validam dados em runtime.
- **Decisão:** Ler o JSON como `unknown`, validar estrutura, campos, IDs, classes obrigatórias, referências e dimensões das caixas antes de disponibilizar o dataset para a interface.
- **Consequências:** Entradas inválidas são recusadas com mensagens de validação. Um COCO completamente vazio é aceito para que a interface mostre os estados vazios.
- **Evidência:** `validateCocoDataset` e `DatasetLoaderService`.

### ADR-004 — Associação de imagens pelo nome do arquivo

- **Status:** Implementada
- **Contexto:** A imagem escolhida precisa corresponder ao `file_name` registrado no COCO.
- **Decisão:** Associar usando o nome base do arquivo, ignorando diferenças entre maiúsculas e minúsculas e removendo diretórios do caminho COCO.
- **Consequências:** A seleção funciona mesmo quando o COCO contém caminho relativo. Arquivos com nomes diferentes não são associados automaticamente; a interface informa imagens ausentes.
- **Limitação conhecida:** Nomes base iguais em diretórios diferentes podem ser ambíguos, pois o caminho é descartado.
- **Evidência:** `DatasetLoaderService.normalizeFileName` e registro de imagens selecionadas.

### ADR-005 — URLs temporárias para imagens selecionadas

- **Status:** Implementada
- **Contexto:** As imagens locais precisam ser mostradas no navegador sem serem copiadas para o projeto.
- **Decisão:** Criar URLs temporárias com `URL.createObjectURL` para exibição e liberá-las quando novas imagens são registradas ou a página é destruída.
- **Consequências:** Evita cópias persistentes no app; URLs e imagens são locais à sessão do navegador.
- **Evidência:** `DatasetLoaderService.registerImageFiles`, `releaseImageUrls` e `DatasetPage.ngOnDestroy`.

### ADR-006 — SVG para caixas de anotação

- **Status:** Implementada
- **Contexto:** As caixas COCO devem permanecer relacionadas às dimensões originais da imagem.
- **Decisão:** Renderizar a imagem e as caixas em SVG, usando `viewBox` definido por largura e altura do COCO.
- **Consequências:** As coordenadas COCO são usadas diretamente no mesmo sistema de referência da imagem.
- **Evidência:** `ImagePreview`.

### ADR-007 — Signals e valores derivados

- **Status:** Implementada
- **Contexto:** Galeria, filtro e estatísticas dependem do dataset ativo e precisam atualizar juntas.
- **Decisão:** Usar Signals para estado da página e `computed` para contagens, filtro, seleção e estatísticas; componentes usam `OnPush`.
- **Consequências:** Os valores são recalculados quando o estado relacionado muda, sem executar agregações em métodos chamados pelo template.
- **Evidência:** `DatasetPage` e componentes standalone do recurso dataset.

### ADR-010 — ESLint flat config e análise de templates

- **Status:** Implementada
- **Contexto:** O projeto precisava de lint para TypeScript e templates, mantendo compatibilidade com Angular 22.
- **Decisão:** Usar `angular-eslint` 22, ESLint 10, configuração flat e os conjuntos recomendados para TypeScript, templates e acessibilidade.
- **Consequências:** `npm run lint` aplica as regras Angular ao app; Prettier continua responsável pela formatação.
- **Segurança de dependências:** O audit identificou `minimatch` vulnerável nas árvores do ESLint e TypeScript-ESLint. O override está limitado a essas dependências e resolve para `minimatch` 11.0.8; `npm audit` fica sem vulnerabilidades. Build, lint e testes passaram com essa resolução.
- **Evidência:** `eslint.config.js`, alvo `lint` em `angular.json`, `package.json` e `package-lock.json`.

## 3. Decisões pendentes

| ID      | Assunto                  | Pendente                                                                                                       |
| ------- | ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| ADR-008 | Estratégia de testes E2E | Definir ferramenta e escopo, caso os testes E2E sejam implementados.                                           |
| ADR-009 | Colisões de nomes        | Decidir se nomes base duplicados serão rejeitados ou se a resolução futura usará caminhos relativos completos. |

## 4. Histórico

| Data       | Alteração                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| 2026-11-12 | Decisões atuais documentadas após implementação do upload, validação, galeria e pré-visualização.           |
| 2026-11-12 | ESLint flat config adicionado; os overrides de segurança foram verificados com audit, build, lint e testes. |
