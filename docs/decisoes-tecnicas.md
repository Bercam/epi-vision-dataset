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
- **Evidência:** `normalizeFileName` em `core/utils/file-name.ts`, usado por `DatasetLoaderService`, `DatasetPage` e `DatasetGallery`.

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

### ADR-008 — Testes E2E com Playwright

- **Status:** Implementada
- **Contexto:** A suíte unitária usa jsdom e não exercita upload de arquivos, object URLs, layout real nem foco do navegador. Os fluxos essenciais precisavam de cobertura em navegador real sem duplicar a suíte unitária.
- **Decisão:** Usar Playwright 1.65 com Chromium e o dev server iniciado automaticamente na porta 4300. Os testes ficam em `app/e2e/`, leem o COCO e as 31 imagens reais e derivam os valores esperados do próprio JSON, em vez de fixar números frágeis. `npm run e2e` executa os fluxos essenciais; `npm run screenshots` executa apenas os testes marcados com `@screenshots` e grava as capturas em `docs/screenshots/`.
- **Consequências:** Os fluxos principais são validados em navegador real e as capturas do README são reproduzíveis. O custo é um download de Chromium e alguns segundos por execução. Cross-browser e dispositivos físicos continuam fora do escopo.
- **Evidência:** `app/playwright.config.ts`, `app/e2e/support/dataset.ts`, `app/e2e/dataset-explorer.spec.ts` e `app/e2e/screenshots.spec.ts`.

### ADR-010 — ESLint flat config e análise de templates

- **Status:** Implementada
- **Contexto:** O projeto precisava de lint para TypeScript e templates, mantendo compatibilidade com Angular 22.
- **Decisão:** Usar `angular-eslint` 22, ESLint 10, configuração flat e os conjuntos recomendados para TypeScript, templates e acessibilidade.
- **Consequências:** `npm run lint` aplica as regras Angular ao app; Prettier continua responsável pela formatação.
- **Segurança de dependências:** O audit identificou `minimatch` vulnerável nas árvores do ESLint e TypeScript-ESLint. O override está limitado a essas dependências e resolve para `minimatch` 11.0.8; `npm audit` fica sem vulnerabilidades. Build, lint e testes passaram com essa resolução.
- **Evidência:** `eslint.config.js`, alvo `lint` em `angular.json`, `package.json` e `package-lock.json`.

### ADR-011 — Visualização em tela cheia como overlay

- **Status:** Implementada
- **Contexto:** A pré-visualização compacta limita a inspeção das caixas; era necessário ampliar a imagem sem perder o contexto da página.
- **Decisão:** Renderizar um overlay `position: fixed` com `role="dialog"`, `aria-modal`, foco inicial no botão de fechar, armadilha de foco por Tab, trava de rolagem do `body` e restauração do foco ao fechar. A abertura ocorre pelo botão da prévia, por duplo clique na imagem da prévia ou por duplo clique em um cartão da galeria. A navegação por ←/→ usa a ordem da galeria filtrada, com wrap-around; Esc fecha. Não foi usada a Fullscreen API do navegador.
- **Consequências:** O comportamento é consistente entre navegadores, testável em jsdom e mantém o estado da página intacto atrás do overlay. Em telas largas, o host da pré-visualização usa `position: sticky` para acompanhar a rolagem enquanto a galeria estiver visível; abaixo de 1050 px, o layout vira uma coluna e a prévia fica estática.
- **Evidência:** `ImageFullscreenViewer`, `ImagePreview`, `DatasetGallery`, `DatasetPage` (`openFullscreen`, `openImageFullscreen`, `moveFullscreenSelection`), `image-fullscreen-viewer.spec.ts` e `dataset-page.spec.ts`.

### ADR-012 — Confirmação visual dos arquivos importados

- **Status:** Implementada
- **Contexto:** Após escolher os arquivos, o usuário não tinha retorno imediato sobre qual JSON foi aceito nem quantas imagens entraram na seleção; o seletor nativo não permanece visível depois do upload.
- **Decisão:** Manter o estado da confirmação em `DatasetPage` (`datasetFileName` e `selectedImageCount`) e passá-lo ao `DatasetImportPanel` por inputs. O nome do JSON só é confirmado depois que o carregamento e a validação terminam com sucesso; uma nova tentativa limpa a confirmação anterior antes de validar. As imagens confirmam a quantidade selecionada, com rótulo no singular ou plural. Os cartões ganham a classe `.confirmed`, um ✓ verde com `role="status"` e o botão muda para "Trocar JSON" / "Trocar imagens".
- **Consequências:** O feedback é imediato, acessível e reflete apenas dados validados pelo serviço; seleções inválidas não deixam confirmação enganosa. O estado é local à página e não é persistido entre recargas.
- **Evidência:** `DatasetImportPanel` (`cocoFileName`, `selectedImageCount`, `imageCountLabel`), `DatasetPage` (`loadCocoFile`, `registerImages`), `dataset-import-panel.html`/`.scss` e testes em `dataset-page.spec.ts`.

### ADR-013 — Visibilidade de classes na tela cheia

- **Status:** Implementada
- **Contexto:** A tela cheia exibia todas as caixas da imagem, sem permitir isolar classes para conferir uma anotação específica; o filtro da página é único e fica atrás do overlay.
- **Decisão:** Adicionar ao `ImageFullscreenViewer` uma barra de classes com um checkbox por classe presente na imagem (nome, cor e contagem), além dos botões **Marcar tudo** e **Tirar tudo**. O viewer recebe todas as anotações da imagem e mantém um conjunto de classes ocultas, preservado ao navegar com ←/→. A página passa `initialHiddenCategoryIds` com todas as classes exceto a ativa quando há filtro de classe na página, mantendo a coerência com a pré-visualização; a legenda do rodapé foi substituída pela barra de filtros.
- **Consequências:** O usuário isola classes sem sair da tela cheia e sem alterar o filtro da página. O estado é local ao viewer e reiniciado ao fechar. Os contadores do rodapé e o rótulo acessível do SVG passam a refletir apenas as caixas visíveis.
- **Evidência:** `ImageFullscreenViewer` (`hiddenCategoryIds`, `categoryFilters`, `visibleAnnotations`, `setCategoryVisibility`, `showAllCategories`, `hideAllCategories`), `DatasetPage` (`allAnnotationsForSelectedImage`, `fullscreenInitialHiddenCategoryIds`), `image-fullscreen-viewer.spec.ts` e `dataset-page.spec.ts`.

## 3. Decisões pendentes

| ID      | Assunto                  | Pendente                                                                                                       |
| ------- | ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| ADR-009 | Colisões de nomes        | Decidir se nomes base duplicados serão rejeitados ou se a resolução futura usará caminhos relativos completos. |

## 4. Histórico

| Data       | Alteração                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| 2026-11-12 | Decisões atuais documentadas após implementação do upload, validação, galeria e pré-visualização.           |
| 2026-11-12 | ESLint flat config adicionado; os overrides de segurança foram verificados com audit, build, lint e testes. |
| 2026-11-13 | Visualização em tela cheia (teclado, foco e duplo clique) e prévia sticky documentadas em ADR-011.          |
| 2026-11-13 | Confirmação visual do JSON e da quantidade de imagens importados documentada em ADR-012.                     |
| 2026-11-13 | Filtro de visibilidade por classe na tela cheia (checkboxes e marcar/tirar tudo) documentado em ADR-013.     |
| 2026-11-16 | Testes E2E com Playwright e capturas reproduzíveis documentados em ADR-008; normalização de nomes centralizada. |
| 2026-11-16 | Auditoria geométrica read-only e correção de duas caixas `pessoa` registradas no relatório de anotações.      |
