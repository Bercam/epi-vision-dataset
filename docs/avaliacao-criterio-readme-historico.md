# Avaliação — README e histórico de commits (10%)

## Resultado atual

**Estimativa: 85–90% do critério.** O README principal agora cobre os tópicos pedidos no desafio e o histórico existente usa commits pequenos com prefixos Conventional Commits. Não é uma nota oficial do avaliador.

## Evidências

- `README.md` descreve objetivo/estado, instalação e execução, tecnologias, estrutura documental, classes e critérios, dificuldades/ambiguidades, origem das imagens, decisões técnicas e melhorias futuras.
- `CONTRIBUTING.md` documenta os padrões de commits e branches.
- O histórico em `feat/angular-dataset-explorer` inclui commits separados como `feat(gallery)`, `feat(viewer)`, `feat(gallery): filter`, `feat(dataset)`, `docs(adr)` e `data(dataset)`, sem commits artificiais adicionados nesta revisão.
- O README informa claramente que a revisão visual das anotações continua pendente. Também apresenta os comandos e o resultado registrado para build, ESLint, Prettier, nove testes unitários e auditoria de dependências; os detalhes estão em `docs/avaliacao-criterio-organizacao-codigo.md`.

## Pendência

- O remoto `origin` está configurado para `https://github.com/Bercam/epi-vision-dataset.git`; `git ls-remote --heads origin` não retornou branches. Portanto, esta branch e os commits atuais estão apenas no clone local e a visibilidade pública/estado do GitHub não pôde ser confirmada. Não publiquei alterações.
