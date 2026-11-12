# Dataset — Detecção de EPIs

## Conteúdo

- `images/`: 31 imagens utilizadas no dataset.
- `sources/image_sources.csv`: procedência das imagens.
- `annotations/annotations_coco.json`: anotações no formato COCO.
- `annotations/yolo/`: arquivos YOLO, um por imagem, e `dataset.yaml`.
- `annotations/makesense_source/`: exports originais recebidos do MakeSense (CSV e ZIP), preservados para rastreabilidade.

## Classes e mapeamento YOLO

| ID YOLO | Classe |
|---:|---|
| 0 | `pessoa` |
| 1 | `capacete` |
| 2 | `colete` |
| 3 | `sem_capacete` |

Os IDs do ZIP original do MakeSense foram mapeados comparando as 261 caixas com as coordenadas e classes do CSV exportado.

## Anotações recebidas

- 261 caixas em 31 imagens.
- `pessoa`: 106; `capacete`: 68; `colete`: 59; `sem_capacete`: 28.
- As classes e as coordenadas do CSV correspondem às caixas YOLO do ZIP; todas as 261 caixas foram correspondidas.
- Bounding boxes têm largura/altura positivas e ficam dentro das dimensões indicadas no CSV.
- Esta conferência verificou consistência estrutural e correspondência entre exports; não substitui a revisão visual final das anotações.

## Critérios

Consultar `../docs/criterios-de-anotacao.md`.