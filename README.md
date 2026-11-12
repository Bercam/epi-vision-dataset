# EPI Vision Dataset

Projeto de anotação e exploração visual de imagens de ambientes de construção, com quatro classes de EPI: `pessoa`, `capacete`, `colete` e `sem_capacete`.

## Estado atual

- Dataset em `dataset/`: 31 imagens, 261 anotações COCO e exports YOLO. Os totais e a conferência estrutural entre os exports estão descritos em [`dataset/README.md`](dataset/README.md); a revisão visual segue pendente.
- Fontes e metadados das imagens: [`dataset/sources/image_sources.csv`](dataset/sources/image_sources.csv). Os registros incluem pendências de verificação manual; a licença da plataforma não substitui a verificação de direitos de terceiros visíveis nas fotos.
- Aplicação Angular em `app/`: upload do JSON COCO e das imagens, galeria com filtro por classe, pré-visualização com bounding boxes, estatísticas e estados para erros e datasets vazios.
- Os critérios de anotação estão em [`docs/criterios-de-anotacao.md`](docs/criterios-de-anotacao.md). A consistência estrutural das anotações foi conferida, mas isso não equivale a uma revisão visual final.

## Executar a aplicação

Requer Node.js compatível com a versão Angular declarada em `app/package.json`.

```bash
cd app
npm install
npm start
```

Abra `http://localhost:4200/`. Na tela, selecione `dataset/annotations/annotations_coco.json` e todos os arquivos de `dataset/images/`. Para compilar a versão de produção, execute `npm run build` dentro de `app/`.

## Documentação

- [Critérios de anotação](docs/criterios-de-anotacao.md)
- [Guia de desenvolvimento](docs/guia-de-Desenvolvimento.md)
- [Especificações técnicas](docs/especificacoes-tecnicas.md)
- [Decisões técnicas](docs/decisoes-tecnicas.md)
- [Relatório de preparação do dataset](docs/relatorio-preparacao-dataset.md)
- [Fontes e metadados](docs/relatorio-metadados-origens.md)
- [Instruções da aplicação](app/README.md)
- [Revisão visual das anotações](docs/relatorio-revisao-visual-anotacoes.md)
- [Avaliação das funcionalidades](docs/avaliacao-criterio-funcionalidades.md)
- [Avaliação da organização do código](docs/avaliacao-criterio-organizacao-codigo.md)
- [Avaliação de performance Angular](docs/avaliacao-criterio-performance-angular.md)
- [Avaliação do README e histórico](docs/avaliacao-criterio-readme-historico.md)

## Critérios de anotação e limitações

O dataset usa as classes `pessoa`, `capacete`, `colete` e `sem_capacete`. As caixas devem delimitar o objeto visível; `sem_capacete` delimita a cabeça, e bonés/chapéus comuns não são capacetes de segurança. Pessoas/objetos muito pequenos ou com mais de 80% de oclusão podem ser omitidos, desde que o critério seja aplicado de forma consistente. As decisões detalhadas estão em [`docs/criterios-de-anotacao.md`](docs/criterios-de-anotacao.md).

As principais dificuldades são pessoas pequenas ou parcialmente encobertas, identificação de EPI em cenas ao fundo e distinção entre capacete de segurança e chapéu comum. A consistência estrutural de COCO/YOLO foi conferida, mas a revisão visual e a aprovação humana das anotações permanecem pendentes. Consulte [`docs/relatorio-revisao-visual-anotacoes.md`](docs/relatorio-revisao-visual-anotacoes.md) antes de tratar os rótulos como finais.

## Origem das imagens

O catálogo por arquivo, com URL de origem, autor, licença, dimensões e hash, está em [`dataset/sources/image_sources.csv`](dataset/sources/image_sources.csv). As imagens vieram de Unsplash, Pexels e Wikimedia Commons. A licença da plataforma não substitui a revisão de marcas, obras ou pessoas reconhecíveis que possam aparecer nas fotos; pendências estão descritas em [`docs/relatorio-metadados-origens.md`](docs/relatorio-metadados-origens.md).

## Decisões técnicas e melhorias futuras

O app mantém dataset e código separados, carrega COCO e imagens por upload e associa arquivos pelo nome, valida o JSON em runtime e desenha as caixas em SVG usando o `viewBox` original. Os detalhes e limitações estão em [`docs/decisoes-tecnicas.md`](docs/decisoes-tecnicas.md).

Com mais tempo, as próximas melhorias seriam concluir a revisão visual do dataset, ampliar a cobertura de testes e adicionar testes E2E, criar thumbnails para coleções maiores e tratar colisões de nomes usando caminhos relativos completos.

## Testes e qualidade

A compilação Angular de produção, ESLint, formatação Prettier e nove testes unitários passaram nesta revisão. O audit do npm reportou zero vulnerabilidades após a atualização das dependências de lint. Para compilar, use `cd app` e `npm run build`; para executar os testes, `cd app` e `npm test`; para lint, `cd app` e `npm run lint`.

## Histórico de desenvolvimento

As alterações são organizadas em branches de funcionalidade e commits Conventional Commits, conforme [`CONTRIBUTING.md`](CONTRIBUTING.md). Consulte a seção [Testes e qualidade](#testes-e-qualidade) para os resultados mais recentes.
