# Avaliação — README e histórico de commits (10%)

## Resultado atual

**Estimativa local: 85–90% do critério; cumprimento integral ainda não comprovado.** O README principal cobre os tópicos pedidos no desafio e o histórico local usa commits pequenos com prefixos Conventional Commits. Como a entrega exige um repositório público e o remoto não anunciou referências, essa estimativa local não demonstra que o critério completo atingiu 80%. Não é uma nota oficial do avaliador.

## Evidências

- `README.md` é a porta de entrada canônica e cobre status, funcionalidades, stack, estrutura, pré-requisitos, execução, scripts, resumo do dataset, arquitetura, qualidade, índices de documentação, limitações, direitos e contribuição; o detalhamento técnico fica em `docs/arquitetura.md` e as decisões em `docs/decisoes-tecnicas.md`.
- `docs/README.md` indexa a documentação por finalidade (canônica, relatórios, avaliação e referência do desafio), e `CHANGELOG.md` registra as mudanças no formato Keep a Changelog.
- Os artefatos principais agora seguem a estrutura de entrega do PDF: `dataset/annotations_coco.json` e `dataset/annotations_yolo/`; exports brutos do MakeSense ficam separados em `dataset/annotations/makesense_source/`.
- O catálogo de fontes pode ser auditado com `npm run validate:manifest` em `tools/image-collector/`; a ferramenta não altera dados e distingue integridade estrutural de aprovação humana.
- `CONTRIBUTING.md` documenta branches, Conventional Commits, ambiente, gates de qualidade, política do dataset e checklist de revisão; `.github/PULL_REQUEST_TEMPLATE.md` padroniza a descrição de PRs.
- O histórico em `feat/angular-dataset-explorer` inclui commits separados como `feat(gallery)`, `feat(viewer)`, `feat(gallery): filter`, `feat(dataset)`, `docs(adr)` e `data(dataset)`, sem commits artificiais adicionados nesta revisão.
- O README informa claramente que a revisão visual das anotações continua pendente. Também apresenta os comandos e o resultado registrado para build, ESLint, Prettier, **35 testes unitários** e auditoria de dependências; os detalhes estão em `docs/avaliacao-criterio-organizacao-codigo.md`.
- A ferramenta de coleta tem 85 testes aprovados; quatro casos cobrem o validador de procedência, incluindo divergência de hash/extensão e nome duplicado no COCO. A validação do catálogo encontrou 31 registros de origem correspondentes às imagens e ao COCO, mantendo todos os rótulos `in_review`.

## Pendência

- O remoto `origin` está configurado para `https://github.com/Bercam/epi-vision-dataset.git`; a leitura de `git ls-remote --heads origin` terminou com código zero e não retornou referências. Portanto, esta branch e os commits atuais estão apenas no clone local; a existência de uma branch pública com a entrega não foi comprovada. Nenhuma alteração foi publicada.
