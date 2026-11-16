# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui.

O formato segue a estrutura de [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto pretende adotar [Versionamento Semântico](https://semver.org/lang/pt-BR/) a partir da primeira versão publicada. Ainda não existem tags ou releases no repositório; a seção `0.1.0` identifica apenas a linha de base deste changelog.

## [Não lançado]

### Adicionado

- Visualização em tela cheia (`ImageFullscreenViewer`) com abertura por botão, duplo clique na prévia ou em um cartão da galeria, navegação por ←/→ com wrap-around dentro do filtro ativo, fechamento por Esc, foco preso ao diálogo e restauração do foco e da rolagem (ADR-011).
- Filtro de visibilidade por classe na tela cheia: checkbox por classe presente na imagem, contagem, cor e rótulo acessível, além de **Marcar tudo** / **Tirar tudo**; as ações em massa valem para todas as classes do dataset, inclusive as ausentes na imagem, e a seleção é mantida ao navegar entre imagens (ADR-013).
- Confirmação visual do JSON validado e da quantidade de imagens selecionadas nos cartões de importação, com ✓, `role="status"` e botões **Trocar JSON** / **Trocar imagens** (ADR-012).
- Seis testes novos da tela cheia e do filtro por classe.
- Suíte E2E com Playwright 1.65 + Chromium: 9 testes contra o dataset real, cobrindo estado vazio, JSON inválido, totais, estatísticas, aviso de imagens ausentes, miniaturas, filtro por classe, cores das caixas, tela cheia, navegação por teclado e galeria vazia.
- Capturas de tela reproduzíveis em `docs/screenshots/` (4 estados desktop, 1 viewport mobile e `demo.gif`), geradas por `npm run screenshots`.
- `tools/dataset/audit_annotations.py`: auditoria geométrica read-only que separa erros objetivos de avisos para inspeção humana.
- `core/utils/file-name.ts`: normalização de nome base extraída e reutilizada pelo serviço, pela página e pela galeria.

### Alterado

- Dataset reimportado a partir do export revisado do MakeSense de 2026-11-16; as 31 imagens passaram a ter **261 anotações** (`pessoa` 104, `capacete` 67, `colete` 59, `sem_capacete` 31). O COCO e os 31 arquivos YOLO foram regerados pelo pipeline CSV/ZIP → validador → importador.
- `README.md` reescrito como porta de entrada canônica do repositório.
- Adicionados `docs/arquitetura.md`, `docs/README.md`, `CHANGELOG.md` e `.github/PULL_REQUEST_TEMPLATE.md`.
- `CONTRIBUTING.md` e `app/README.md` ampliados com setup, gates de qualidade e política de dados.
- `README-documentacao.md` convertido em ponteiro para o índice de documentação.
- Guia de desenvolvimento renomeado para `docs/guia-de-desenvolvimento.md` e links corrigidos.
- Fichas de avaliação atualizadas com os números atuais (40 testes, 9 E2E e bundle de 279,27 kB).
- A contagem de imagens selecionadas agora usa apenas arquivos de imagem aceitos, em vez do total de arquivos escolhidos.

### Corrigido

- Removidas duas caixas `sem_capacete` com altura zero (46×0 e 2×0 px) em `acton-crawford-A4xwAcZOAyo-unsplash.jpg` no derivado de 2026-11-16, registradas em `corrections_2026-11-16.json`.
- Removida uma caixa falso-positiva da classe `colete` na imagem 5 na revisão de 2026-11-13, registrada em `corrections_2026-11-13.json`.
- Estendido o topo de duas caixas `pessoa` que cortavam a cabeça `sem_capacete` anotada: `emmanuel-ikwuegbu-KHO_jvns5Xc-unsplash.jpg` (10 px) e `jose-megias-7Qxn3y2CQcM-unsplash.jpg` (26 px). O bloco `geometry_review` de `corrections_2026-11-16.json` registra a decisão.
- Par derivado do MakeSense regerado pelo pipeline CSV/ZIP → validador → importador; o vigente é `makesense_annotations_reviewed_2026-11-16.csv` e `makesense_yolo_export_reviewed_2026-11-16.zip`.

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
