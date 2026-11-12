# Dataset — Detecção de EPIs

## Conteúdo

- `images/`: 31 imagens utilizadas no dataset.
- `sources/image_sources.csv`: procedência das imagens.
- `annotations_coco.json`: anotações no formato COCO, no caminho solicitado pelo desafio.
- `annotations_yolo/`: arquivos YOLO, um por imagem, `classes.txt` e `dataset.yaml`, no caminho solicitado pelo desafio.
- `annotations/makesense_source/`: exports brutos e derivados do MakeSense preservados para rastreabilidade. O par bruto recebido em 2026-11-12 tinha uma caixa degenerada; ela foi removida do derivado de trabalho após conferência visual do local. O registro está em `corrections_2026-11-12.json` e os detalhes em `../docs/relatorio-revisao-visual-anotacoes.md`.

## Classes e mapeamento YOLO

| ID YOLO | Classe |
|---:|---|
| 0 | `pessoa` |
| 1 | `capacete` |
| 2 | `colete` |
| 3 | `sem_capacete` |

Os IDs de classe do ZIP foram mapeados comparando as caixas normalizadas com as coordenadas e classes do CSV. O export derivado usado no dataset contém 270 caixas.

## Anotações recebidas

- 270 caixas em 31 imagens.
- `pessoa`: 107; `capacete`: 70; `colete`: 63; `sem_capacete`: 30.
- As classes e coordenadas do CSV derivado correspondem às caixas YOLO; as 270 caixas foram correspondidas.
- Bounding boxes têm largura/altura positivas e ficam dentro das dimensões indicadas no CSV.
- Esta conferência verificou consistência estrutural e correspondência entre exports; não substitui a revisão visual final das anotações.

## Validação técnica

Revisão estrutural realizada em 2026-11-12:

- Os 31 nomes de imagem do COCO existem em `images/` e cada um possui um `.txt` YOLO correspondente.
- As 270 anotações COCO correspondem às 270 linhas YOLO; as caixas foram comparadas com o CSV derivado. A diferença máxima por arredondamento na conversão para YOLO foi de 0,005728 px.
- Não foram encontrados referências de imagem inválidas, caixas fora dos limites, labels ausentes, labels extras ou valores YOLO fora de `[0, 1]`.
- Os 31 hashes SHA-256 do catálogo de fontes correspondem aos arquivos em `images/`.

Essa validação não confirma visualmente se cada caixa representa corretamente o objeto nem resolve direitos de terceiros nas fotos. Os 31 registros estão com `annotation_status=in_review`; a aprovação visual ainda está pendente.

### Validar e importar novos exports do MakeSense

Antes de importar um novo par CSV/ZIP, execute no diretório raiz do repositório:

```bash
python tools/dataset/validate_makesense_export.py --csv caminho/labels.csv --zip caminho/labels.zip
```

O validador confere as imagens e dimensões contra o COCO atual, as quatro classes, caixas positivas e dentro dos limites, duplicatas, arquivos esperados no ZIP e correspondência entre as caixas CSV/YOLO. Ele não altera os arquivos nem substitui a revisão visual.

Depois da revisão humana e com o validador retornando `OK`, gere os formatos do projeto:

```bash
python tools/dataset/import_makesense_export.py --csv caminho/labels.csv --zip caminho/labels.zip
```

O importador valida o par antes de atualizar COCO/YOLO e cancela sem gravar saídas se encontrar inconsistências.

## Critérios

Consultar `../docs/criterios-de-anotacao.md`.
