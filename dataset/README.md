# Dataset — Detecção de EPIs

## Conteúdo

- `images/`: 31 imagens utilizadas no dataset.
- `sources/image_sources.csv`: procedência das imagens.
- `annotations/annotations_coco.json`: anotações no formato COCO.
- `annotations/yolo/`: arquivos YOLO, um por imagem, `classes.txt` e `dataset.yaml`.
- `annotations/makesense_source/`: exports do MakeSense preservados para rastreabilidade. O par recebido em 2026-11-12 após revisão está arquivado, mas ainda não foi importado porque contém uma caixa com altura zero; veja `../docs/relatorio-revisao-visual-anotacoes.md`. O COCO e o YOLO listados abaixo ainda representam o export anterior.

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

## Validação técnica

Revisão estrutural realizada em 2026-11-12:

- Os 31 nomes de imagem do COCO existem em `images/` e cada um possui um `.txt` YOLO correspondente.
- As 261 anotações COCO correspondem às 261 linhas YOLO; classes e caixas normalizadas foram conferidas, considerando até 1,01 px de diferença por arredondamento entre os formatos.
- Não foram encontrados referências de imagem inválidas, caixas fora dos limites, labels ausentes, labels extras ou valores YOLO fora de `[0, 1]`.
- Os 31 hashes SHA-256 do catálogo de fontes correspondem aos arquivos em `images/`.

Essa validação não confirma visualmente se cada caixa representa corretamente o objeto nem resolve direitos de terceiros nas fotos. Os 31 registros estão com `annotation_status=in_review`; a aprovação visual ainda está pendente.

### Validar novos exports do MakeSense

Antes de importar um novo par CSV/ZIP, execute no diretório raiz do repositório:

```bash
python tools/dataset/validate_makesense_export.py --csv caminho/labels.csv --zip caminho/labels.zip
```

O validador confere as imagens e dimensões contra o COCO atual, as quatro classes, caixas positivas e dentro dos limites, duplicatas, arquivos esperados no ZIP e correspondência entre as caixas CSV/YOLO. Ele não altera os arquivos nem substitui a revisão visual.

## Critérios

Consultar `../docs/criterios-de-anotacao.md`.
