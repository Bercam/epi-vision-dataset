# Dataset — Detecção de EPIs

## Conteúdo

- `images/`: 31 imagens utilizadas no dataset.
- `sources/image_sources.csv`: procedência das imagens.
- `annotations_coco.json`: anotações no formato COCO, no caminho solicitado pelo desafio.
- `annotations_yolo/`: arquivos YOLO, um por imagem, `classes.txt` e `dataset.yaml`, no caminho solicitado pelo desafio.
- `annotations/makesense_source/`: exports brutos e derivados do MakeSense preservados para rastreabilidade. Quatro revisões pós-export foram registradas em `corrections_2026-11-12.json` (caixa degenerada), `corrections_2026-11-13.json` (caixa falsa de `colete`), `corrections_2026-11-16.json` (duas caixas degeneradas de `sem_capacete`) e no bloco `geometry_review` do mesmo arquivo de 2026-11-16 (duas caixas `pessoa` estendidas até a cabeça anotada); os detalhes estão em `../docs/relatorio-revisao-visual-anotacoes.md`. O par derivado vigente é `makesense_annotations_reviewed_2026-11-16.csv` e `makesense_yolo_export_reviewed_2026-11-16.zip`.

## Classes e mapeamento YOLO

| ID YOLO | Classe |
|---:|---|
| 0 | `pessoa` |
| 1 | `capacete` |
| 2 | `colete` |
| 3 | `sem_capacete` |

Os IDs de classe do ZIP foram mapeados comparando as caixas normalizadas com as coordenadas e classes do CSV. O export derivado usado no dataset contém 261 caixas.

## Anotações recebidas

- 261 caixas em 31 imagens.
- `pessoa`: 104; `capacete`: 67; `colete`: 59; `sem_capacete`: 31.
- As classes e coordenadas do CSV derivado correspondem às caixas YOLO; as 261 caixas foram correspondidas.
- A caixa falsa de `colete` `[4274, 1983, 36, 7]` em `pexels-themightynelson-5667685.jpg` foi removida do par derivado em 2026-11-13 após revisão do responsável; a imagem ficou com 4 caixas (2 `pessoa` e 2 `sem_capacete`).
- Em 2026-11-16, duas caixas `sem_capacete` com altura zero (46×0 e 2×0 px) em `acton-crawford-A4xwAcZOAyo-unsplash.jpg` foram removidas do par derivado; a imagem ficou com 39 caixas (14 `pessoa`, 12 `capacete` e 13 `colete`).
- Na mesma revisão geométrica, o topo de duas caixas `pessoa` foi estendido até o topo da cabeça `sem_capacete` contida nelas: `emmanuel-ikwuegbu-KHO_jvns5Xc-unsplash.jpg` (10 px) e `jose-megias-7Qxn3y2CQcM-unsplash.jpg` (26 px). Largura, base e demais anotações foram preservadas.
- Bounding boxes têm largura/altura positivas e ficam dentro das dimensões indicadas no CSV.
- Esta conferência verificou consistência estrutural e correspondência entre exports; não substitui a revisão visual final das anotações.

## Validação técnica

Revisão estrutural realizada em 2026-11-12, atualizada em 2026-11-13 e em 2026-11-16:

- Os 31 nomes de imagem do COCO existem em `images/` e cada um possui um `.txt` YOLO correspondente.
- As 261 anotações COCO correspondem às 261 linhas YOLO; as caixas foram comparadas com o CSV derivado. A diferença máxima por arredondamento na conversão para YOLO foi de 0,00473 px.
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

### Auditar a geometria das anotações

Depois de qualquer importação, execute:

```bash
python tools/dataset/audit_annotations.py
```

O script é somente leitura e separa **erros objetivos** (caixas degeneradas, fora dos limites, duplicadas, cabeças/coletes órfãos) de **avisos** que exigem inspeção humana (recortes de cabeça, objetos minúsculos, caixas tocando a borda). Ele retorna código 1 apenas quando há erros objetivos.

## Critérios

Consultar `../docs/criterios-de-anotacao.md`.
