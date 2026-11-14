# Contribuição

Obrigado pelo interesse no projeto. Este guia descreve o fluxo de trabalho, os padrões de commit, os gates de qualidade e a política para alterações de dados.

## 1. Pré-requisitos

- Node.js compatível com o Angular 22: `^22.22.3 || ^24.15.0 || >=26.0.0`.
- npm.
- Python 3 (apenas para validação/importação de exports do MakeSense; usa a biblioteca padrão).

Validado com Node.js 24.20.0, npm 11.19.0 e Python 3.14.7. A ferramenta `tools/image-collector` exige Node.js 20.11+.

## 2. Preparar o ambiente

```bash
cd app
npm install

cd ../tools/image-collector
npm install   # apenas se for mexer na ferramenta de coleta
```

Para rodar a aplicação: `cd app && npm start` e abrir `http://localhost:4200/`.

## 3. Branches

Crie uma branch de trabalho a partir de `main`:

| Prefixo | Uso |
| ------- | --- |
| `feat/<assunto>` | Funcionalidade nova. |
| `fix/<assunto>` | Correção de comportamento. |
| `data/<assunto>` | Imagens, metadados ou anotações. |
| `docs/<assunto>` | Documentação. |
| `refactor/<assunto>` | Refatoração sem mudança de comportamento. |
| `test/<assunto>` | Testes. |
| `chore/<assunto>` | Configuração, dependências e manutenção. |

Use nomes curtos, em minúsculas e separados por hífen. Exemplo: `feat/angular-dataset-explorer`.

## 4. Commits

Adote [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/): `<tipo>(<escopo>): <resumo curto>`, em inglês, no imperativo.

Tipos usados neste projeto: `feat`, `fix`, `data`, `docs`, `refactor`, `test`, `style` e `chore`.

Exemplos:

```text
feat(app): load COCO dataset
data(dataset): add PPE annotations
docs(dataset): record image sources
fix(viewer): align boxes with image
test(app): cover fullscreen class filter
chore(app): add Angular ESLint with secure dependencies
```

Regras:

- Um commit = uma mudança coesa e revisável.
- Não misture implementação, dados e documentação não relacionada no mesmo commit.
- Use o corpo do commit para explicar **por que**, quando o resumo não bastar.
- Referencie issues com `Closes #12` quando aplicável.

## 5. Gates de qualidade

Antes de abrir um Pull Request, execute e registre o resultado real:

```bash
cd app
npm test
npm run lint
npx prettier --check "src/**/*.{ts,html,scss}"
npm run build
npm audit
```

Se alterou a ferramenta de coleta:

```bash
cd tools/image-collector
npm test
npm run validate:manifest
```

Se alterou anotações:

```bash
python tools/dataset/validate_makesense_export.py --csv <arquivo.csv> --zip <arquivo.zip>
```

Nenhum resultado deve ser declarado como aprovado sem ter sido executado. Use os estados: não executado, revisão estática, testes unitários, teste solo no navegador, teste multi-cliente ou teste em servidor publicado.

## 6. Política para o dataset

O dataset é a fonte de verdade do projeto e não deve ser editado manualmente.

- **Não edite** `dataset/annotations_coco.json` nem `dataset/annotations_yolo/*.txt` à mão.
- Alterações passam por: export derivado do MakeSense (CSV + ZIP) → `validate_makesense_export.py` → `import_makesense_export.py`.
- Correções pontuais pós-export são registradas em `dataset/annotations/makesense_source/corrections_AAAA-MM-DD.json` e documentadas em `docs/relatorio-revisao-visual-anotacoes.md`.
- Toda imagem nova precisa de linha em `dataset/sources/image_sources.csv` e sidecar em `dataset/sources/records/`.
- Não invente autor, licença, título ou URL. Campos desconhecidos permanecem vazios e sinalizados.
- A licença da plataforma não substitui a verificação de direitos de terceiros visíveis na foto.
- Testes automatizados não podem escrever no dataset real; use arquivos sintéticos e diretórios temporários.

Fluxo completo em [`dataset/README.md`](dataset/README.md) e em [`docs/arquitetura.md`](docs/arquitetura.md#7-pipeline-do-dataset).

## 7. Padrões de código

- TypeScript estrito e templates estritos; evite `any`.
- Componentes Angular `standalone` com `ChangeDetectionStrategy.OnPush`.
- Estado local com Signals e derivados com `computed`.
- Todo `@for` usa `track` por ID estável.
- Sem `console.log`, `TODO` ou `FIXME` no código da aplicação.
- Prettier é a fonte de formatação; rode `npx prettier --write` antes de commitar.
- Mantenha a lógica de domínio fora dos componentes de apresentação.

## 8. Pull Request

Use o template em [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md). O PR deve conter:

1. Resumo e motivação.
2. Tipo de mudança e issue relacionada.
3. Comandos executados com resultado real.
4. Evidências visuais para mudanças de UI (desktop e mobile).
5. Riscos, limitações e o que não foi testado.
6. Atualização da documentação e do `CHANGELOG.md` quando aplicável.

Um PR é integrado após revisão e com os gates verdes. Mudanças de dados exigem também a validação do par MakeSense.

## 9. Checklist de revisão

- [ ] A mudança tem escopo único e commits coesos.
- [ ] Testes cobrem o comportamento novo ou corrigido.
- [ ] Nenhum dado, licença, URL ou resultado foi inventado.
- [ ] COCO/YOLO não foram editados manualmente.
- [ ] Testes não escrevem no dataset real.
- [ ] Documentação afetada foi atualizada.
- [ ] Dependências novas têm licença e manutenção verificadas.
- [ ] O que não foi testado está declarado.
