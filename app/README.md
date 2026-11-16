# Aplicação — Explorador de Dataset

Aplicação Angular standalone para carregar, explorar e validar visualmente o dataset de EPIs do projeto.

O dataset não é embutido no bundle: o usuário seleciona o COCO e as imagens no navegador. Todo o processamento é client-side e nenhum arquivo é enviado a um servidor.

## Stack

| Item | Versão / escolha |
| ---- | ---------------- |
| Angular | 22.2 standalone, Signals, `OnPush`, templates estritos |
| TypeScript | 6 com `strict: true` |
| Testes | Vitest 5 + jsdom via `@angular/build:unit-test` |
| Testes E2E | Playwright 1.65 + Chromium (desktop e viewport mobile) |
| Lint | ESLint 10 + angular-eslint 22 |
| Formatação | Prettier 3 |
| Build | Angular CLI 22 / `@angular/build` |

**Node.js:** `^22.22.3 || ^24.15.0 || >=26.0.0`. Validado com Node.js 24.20.0 e npm 11.19.0.

## Executar

```bash
npm install
npm start
```

Abra `http://localhost:4200/`.

## Scripts

| Comando | Descrição |
| ------- | --------- |
| `npm start` | Servidor de desenvolvimento em `localhost:4200`. |
| `npm run build` | Build de produção em `dist/app/`. |
| `npm test` | Testes com Vitest, sem watch. |
| `npm run e2e` | Testes E2E Playwright com o dataset real. |
| `npm run e2e:headed` | E2E com navegador visível. |
| `npm run screenshots` | Regenera as capturas em `../docs/screenshots/`. |
| `npm run lint` | ESLint para TypeScript e templates Angular. |
| `npx prettier --check "src/**/*.{ts,html,scss}" "e2e/**/*.ts"` | Verifica a formatação. |
| `npx prettier --write "src/**/*.{ts,html,scss}" "e2e/**/*.ts"` | Aplica a formatação. |

## Estrutura

```text
src/app/
├── app.config.ts            # providers globais e rotas
├── app.routes.ts            # rota única → DatasetPage
├── core/
│   ├── models/              # contratos tipados do COCO
│   ├── services/            # leitura do JSON e object URLs
│   ├── utils/               # filtro, cores e normalização de nomes
│   └── validators/          # validação estrutural e semântica
└── features/dataset/
    ├── pages/               # estado da página de exploração
    └── components/          # importação, estatísticas, filtro, galeria,
                             # pré-visualização e tela cheia

e2e/
├── support/dataset.ts       # leitura do dataset real e helpers
├── dataset-explorer.spec.ts # fluxos essenciais
└── screenshots.spec.ts      # capturas para docs/screenshots/
```

## Usar a galeria

1. Selecione `../dataset/annotations_coco.json`. Após a validação, o cartão confirma o arquivo com ✓ e o nome escolhido, e o botão passa a **Trocar JSON**.
2. Selecione todas as imagens de `../dataset/images/`. O cartão confirma a quantidade selecionada e o botão passa a **Trocar imagens**.
3. Selecione um cartão da galeria para abrir a pré-visualização. Em telas largas, a prévia acompanha a rolagem enquanto houver espaço ao lado da galeria.
4. Abra a tela cheia pelo botão ⛶, por **duplo clique na prévia** ou por **duplo clique em um cartão**. Navegue com **←** / **→** (com wrap-around e respeitando o filtro de classe) e feche com **Esc**. Os botões ‹ e › fazem a mesma navegação por mouse ou toque.
5. Na tela cheia, use as caixas da barra **Classes** para mostrar ou esconder cada classe presente na imagem, ou os botões **Marcar tudo** / **Tirar tudo**. A seleção é mantida ao navegar; ao abrir com um filtro de classe ativo na página, apenas essa classe começa visível.

O filtro de classe restringe a galeria e as caixas da prévia; as estatísticas continuam considerando o dataset inteiro. Um COCO totalmente vazio é aceito e mostra estados vazios claros. JSON inválido, falha de leitura e imagens ausentes geram mensagens amigáveis.

## Testes

A suíte unitária cobre o validador COCO, a leitura do JSON, o ciclo de vida das object URLs, o filtro puro, a normalização de nomes, inputs de upload nas duas ordens, confirmação visual, erros, imagens ausentes, estatísticas, filtro de classe na página e a tela cheia (teclado, foco, rolagem, duplo clique, wrap-around e visibilidade por classe).

**39 testes em 6 arquivos.** Os testes unitários usam arquivos sintéticos e não escrevem no dataset real.

Os testes E2E em `e2e/` usam o COCO e as 31 imagens reais. Cobrem carregamento, estatísticas, upload, miniaturas, filtro por classe, cores das caixas, tela cheia, navegação por teclado, erros e estados vazios. Execute com `npm run e2e`; o Playwright inicia o dev server automaticamente.

As capturas de tela da aplicação em `../docs/screenshots/` são geradas por `npm run screenshots`, que executa apenas os testes marcados com `@screenshots`.

## Documentação relacionada

- [`../docs/arquitetura.md`](../docs/arquitetura.md) — camadas, fluxo de dados, estado e decisões.
- [`../docs/decisoes-tecnicas.md`](../docs/decisoes-tecnicas.md) — ADRs.
- [`../dataset/README.md`](../dataset/README.md) — dataset e pipeline de anotações.
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — fluxo de contribuição e gates.

## Limitações

- Os E2E rodam em Chromium; não há execução cross-browser nem em dispositivos físicos.
- Associação de imagens pelo nome base; arquivos homônimos podem ser ambíguos.
- Sem paginação ou thumbnails redimensionadas para datasets muito maiores.
