# Contribuição e fluxo Git

## Branches

- `main`: versão estável e revisada do projeto.
- `feat/<assunto>`: funcionalidade nova, por exemplo `feat/angular-dataset-explorer`.
- `fix/<assunto>`: correção de comportamento.
- `data/<assunto>`: alteração de imagens, metadados ou anotações.
- `docs/<assunto>`: documentação.
- `chore/<assunto>`: configuração e manutenção.

Use nomes curtos, em minúsculas e separados por hífen. Desenvolva em uma branch de trabalho criada a partir de `main`; integre-a após revisar a alteração e validar o build correspondente.

## Commits

Adote Conventional Commits: `<tipo>(<escopo>): <resumo curto>`.

Tipos usados neste projeto: `feat`, `fix`, `data`, `docs`, `refactor`, `test` e `chore`.

Exemplos:

- `feat(app): load COCO dataset`
- `data(dataset): add PPE annotations`
- `docs(dataset): record image sources`
- `fix(viewer): align boxes with image`

Cada commit deve representar uma mudança coesa e revisável. Evite misturar implementação, alterações de dados e documentação não relacionada.

## Arquivos gerados

O `.gitignore` da raiz exclui dependências e builds locais, as imagens brutas duplicadas em `images/`, o pacote ZIP temporário para MakeSense e os exports vazios antigos. O dataset versionado fica em `dataset/`.
