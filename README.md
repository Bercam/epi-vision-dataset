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

## Histórico de desenvolvimento

As alterações são organizadas em branches de funcionalidade e commits Conventional Commits, conforme [`CONTRIBUTING.md`](CONTRIBUTING.md). A aplicação foi compilada após as etapas implementadas; testes automatizados ainda não foram executados.
