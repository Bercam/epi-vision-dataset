# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui.

O formato segue a estrutura de [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto pretende adotar [Versionamento Semântico](https://semver.org/lang/pt-BR/) a partir da primeira versão publicada. Ainda não existem tags ou releases no repositório; a seção `0.1.0` identifica apenas a linha de base deste changelog.

## [Não lançado]

### Adicionado

- Visualização em tela cheia (`ImageFullscreenViewer`) com abertura por botão, duplo clique na prévia ou em um cartão da galeria, navegação por ←/→ com wrap-around dentro do filtro ativo, fechamento por Esc, foco preso ao diálogo e restauração do foco e da rolagem (ADR-011).
- Filtro de visibilidade por classe na tela cheia: checkbox por classe presente na imagem, contagem, cor e rótulo acessível, além de **Marcar tudo** / **Tirar tudo**; a seleção é mantida ao navegar entre imagens (ADR-013).
- Confirmação visual do JSON validado e da quantidade de imagens selecionadas nos cartões de importação, com ✓, `role="status"` e botões **Trocar JSON** / **Trocar imagens** (ADR-012).
- Cinco testes novos da tela cheia e do filtro por classe; a suíte Angular passou de 30 para **35 testes em 5 arquivos**.

### Alterado

- Dataset reimportado a partir do export revisado do MakeSense de 2026-11-16; as 31 imagens passaram a ter **261 anotações** (`pessoa` 104, `capacete` 67, `colete` 59, `sem_capacete` 31). O COCO e os 31 arquivos YOLO foram regerados pelo pipeline CSV/ZIP → validador → importador.
- `README.md` reescrito como porta de entrada canônica do repositório.
- Adicionados `docs/arquitetura.md`, `docs/README.md`, `CHANGELOG.md` e `.github/PULL_REQUEST_TEMPLATE.md`.
- `CONTRIBUTING.md` e `app/README.md` ampliados com setup, gates de qualidade e política de dados.
- `README-documentacao.md` convertido em ponteiro para o índice de documentação.
- Guia de desenvolvimento renomeado para `docs/guia-de-desenvolvimento.md` e links corrigidos.
- Fichas de avaliação atualizadas com os números atuais (35 testes e bundle de ≈ 279,76 kB).

### Corrigido

- Removidas duas caixas `sem_capacete` com altura zero (46×0 e 2×0 px) em `acton-crawford-A4xwAcZOAyo-unsplash.jpg` no derivado de 2026-11-16, registradas em `corrections_2026-11-16.json`.
- Removida uma caixa falso-positiva da classe `colete` na imagem 5, identificada na revisão visual; o dataset passou de 270 para **269 anotações**.
- Par derivado do MakeSense regerado pelo pipeline CSV/ZIP → validador → importador (`corrections_2026-11-13.json`, `makesense_annotations_reviewed_2026-11-13.csv`, `makesense_yolo_export_reviewed_2026-11-13.zip`).

### Segurança

- `npm audit` sem vulnerabilidades na aplicação após a atualização das dependências de lint.

## [0.1.0] - 2026-11-12

Linha de base do projeto: primeira versão funcional da aplicação e do dataset, sem tag publicada.

### Adicionado

- Dataset com 31 imagens e 269 anotações nas classes `pessoa`, `capacete`, `colete` e `sem_capacete`.
- Exportações COCO JSON e YOLO geradas a partir de export revisado do MakeSense.
- Catálogo de origem em `dataset/sources/image_sources.csv` com URL, autor, licença declarada, dimensões, tamanho e SHA-256.
- Validador read-only do catálogo de fontes (`npm run validate:manifest`).
- Validador e importador read-only de pares CSV/ZIP do MakeSense em Python.
- Ferramenta `tools/image-collector` para coleta, validação e registro de imagens.
- Aplicação Angular standalone com upload de COCO e imagens, validação estrutural e semântica, galeria com filtro por classe, pré-visualização com bounding boxes em SVG, estatísticas gerais e por classe, estados de erro e estados vazios.
- TypeScript estrito e templates estritos, ESLint com angular-eslint, Prettier e testes com Vitest via `@angular/build:unit-test`.
- Liberação de object URLs ao trocar a seleção, ao substituir arquivos homônimos e ao destruir a página.

### Segurança

- `npm audit` sem vulnerabilidades após atualização das dependências de lint e override restrito de `minimatch`.

<!--
Modelo para novas entradas:

## [Não lançado]

### Adicionado
### Alterado
### Descontinuado
### Removido
### Corrigido
### Segurança
-->
