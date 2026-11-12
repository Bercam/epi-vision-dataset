# Avaliação — README e histórico de commits (10%)

## Resultado atual

**Estimativa: 85–90% do critério.** O README principal agora cobre os tópicos pedidos no desafio e o histórico existente usa commits pequenos com prefixos Conventional Commits. Não é uma nota oficial do avaliador.

## Evidências

- `README.md` descreve objetivo/estado, instalação e execução, tecnologias, estrutura documental, classes e critérios, dificuldades/ambiguidades, origem das imagens, decisões técnicas e melhorias futuras.
- Os artefatos principais agora seguem a estrutura de entrega do PDF: `dataset/annotations_coco.json` e `dataset/annotations_yolo/`; exports brutos do MakeSense ficam separados em `dataset/annotations/makesense_source/`.
- O catálogo de fontes pode ser auditado com `npm run validate:manifest` em `tools/image-collector/`; a ferramenta não altera dados e distingue integridade estrutural de aprovação humana.
- `CONTRIBUTING.md` documenta os padrões de commits e branches.
- O histórico em `feat/angular-dataset-explorer` inclui commits separados como `feat(gallery)`, `feat(viewer)`, `feat(gallery): filter`, `feat(dataset)`, `docs(adr)` e `data(dataset)`, sem commits artificiais adicionados nesta revisão.
- O README informa claramente que a revisão visual das anotações continua pendente. Também apresenta os comandos e o resultado registrado para build, ESLint, Prettier, 12 testes unitários e auditoria de dependências; os detalhes estão em `docs/avaliacao-criterio-organizacao-codigo.md`.
- A ferramenta de coleta tem 85 testes aprovados; quatro casos cobrem o validador de procedência, incluindo divergência de hash/extensão e nome duplicado no COCO. A validação do catálogo encontrou 31 registros de origem correspondentes às imagens e ao COCO, mantendo todos os rótulos `in_review`.

## Pendência

- O remoto `origin` está configurado para `https://github.com/Bercam/epi-vision-dataset.git`; `git ls-remote --heads origin` não retornou branches. Portanto, esta branch e os commits atuais estão apenas no clone local e a visibilidade pública/estado do GitHub não pôde ser confirmada. Não publiquei alterações.
