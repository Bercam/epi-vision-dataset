# Documentação

Índice da documentação do projeto. O ponto de entrada do repositório é o [`README.md`](../README.md); este arquivo organiza os documentos por finalidade e informa o status de cada um.

## Documentos canônicos

Descrevem o estado atual e devem ser mantidos em sincronia com o código.

| Documento | Conteúdo |
| --------- | -------- |
| [`../README.md`](../README.md) | Visão geral, funcionalidades, stack, execução, scripts, dataset e qualidade. |
| [`arquitetura.md`](arquitetura.md) | Camadas, fluxo de importação, estado, pipeline de dados, performance, acessibilidade, segurança e testes. |
| [`decisoes-tecnicas.md`](decisoes-tecnicas.md) | ADRs e histórico cronológico das decisões. |
| [`criterios-de-anotacao.md`](criterios-de-anotacao.md) | Regras das quatro classes, caixas, oclusão, ambiguidades e revisão humana. |
| [`checklist-dataset.md`](checklist-dataset.md) | Checklist operacional de coleta, anotação, validação e revisão. |
| [`estrutura-e-entregaveis.md`](estrutura-e-entregaveis.md) | Estrutura de pastas, entregáveis e rastreabilidade. |
| [`../dataset/README.md`](../dataset/README.md) | Conteúdo do dataset, contagens, validação e pipeline MakeSense. |
| [`../app/README.md`](../app/README.md) | Guia operacional da aplicação Angular. |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Branches, commits, gates de qualidade e política de dados. |
| [`../CHANGELOG.md`](../CHANGELOG.md) | Histórico de mudanças no formato Keep a Changelog. |

## Relatórios e evidências

Registram inspeções e revisões com data. Podem ficar desatualizados em relação ao código e devem ser lidos como evidência pontual, não como especificação vigente.

| Documento | Conteúdo | Data |
| --------- | -------- | ---- |
| [`relatorio-preparacao-dataset.md`](relatorio-preparacao-dataset.md) | Inspeção e preparação inicial do dataset. | 2026-11-12 |
| [`relatorio-metadados-origens.md`](relatorio-metadados-origens.md) | Extração de metadados e limitações de licença. | 2026-11-12 |
| [`relatorio-revisao-visual-anotacoes.md`](relatorio-revisao-visual-anotacoes.md) | Revisão visual, correções aplicadas e pendências. | 2026-11-13 |
| [`resultado-teste-lista-de-links.md`](resultado-teste-lista-de-links.md) | Teste da lista de links de origem. | 2026-11-11 |

## Avaliação do desafio

Documentos de autoavaliação por critério. As porcentagens são **estimativas locais**, não notas oficiais do avaliador.

| Documento | Critério |
| --------- | -------- |
| [`avaliacao-criterio-funcionalidades.md`](avaliacao-criterio-funcionalidades.md) | Funcionalidades obrigatórias (25%). |
| [`avaliacao-criterio-organizacao-codigo.md`](avaliacao-criterio-organizacao-codigo.md) | Organização do código e padrões (20%). |
| [`avaliacao-criterio-performance-angular.md`](avaliacao-criterio-performance-angular.md) | Performance e boas práticas Angular (20%). |
| [`avaliacao-criterio-readme-historico.md`](avaliacao-criterio-readme-historico.md) | README e histórico de commits (10%). |

## Documentos de referência do desafio

Materiais que descrevem o enunciado e o plano original. Servem de contexto histórico; quando divergirem do código, vale o README e a documentação canônica.

| Documento | Conteúdo |
| --------- | -------- |
| [`especificacoes-tecnicas.md`](especificacoes-tecnicas.md) | Especificações técnicas derivadas do enunciado. |
| [`guia-de-desenvolvimento.md`](guia-de-desenvolvimento.md) | Guia de desenvolvimento e plano de execução. |

## Convenções

- Nomes de arquivo em minúsculas com hífens.
- Datas em `AAAA-MM-DD`.
- Links relativos entre documentos.
- Resultados de teste sempre com data e comando; o que não foi executado é declarado como tal.
- Alterações de anotação seguem o pipeline descrito em [`arquitetura.md`](arquitetura.md#7-pipeline-do-dataset) e em [`../dataset/README.md`](../dataset/README.md).
