# Relatório de revisão das anotações

## Estado

O responsável informou que revisou as anotações. Ao conferir os arquivos anexados em 2026-11-12, porém, os hashes SHA-256 coincidiram com o par bruto já arquivado no projeto; portanto, os anexos não representam um export alterado. O CSV/ZIP anexado contém 271 caixas e falha na validação estrutural por uma caixa degenerada na linha 95 do CSV, também sem correspondência no ZIP. O dataset derivado vigente contém 269 caixas após as duas exclusões documentadas. **`annotation_status` continua `in_review`; a aprovação final permanece humana.**

Hashes confirmados dos arquivos anexados (iguais às cópias brutas arquivadas):

- ZIP `labels_my-project-name_2026-11-12-05-27-43.zip`: `2610b74f6f273502b4a3260e04da6df6421f1400ae4059ed06264d63c08c4685`.
- CSV `labels_my-project-name_2026-11-12-05-28-02.csv`: `135ecc2ca7b5b285725600a21c7cb13381379e06fa717d39468989b27e3f4aa0`.

## Dataset atual

- 31 imagens e 269 anotações: `pessoa` 107, `capacete` 70, `colete` 62 e `sem_capacete` 30.
- Os exports brutos recebidos foram preservados em `dataset/annotations/makesense_source/`.
- A caixa `pessoa` da linha 95 do CSV bruto tinha dimensão `[1834, 2703, 6, 0]` na imagem `glenov-brankovic-DWp5nUqTn6E-unsplash.jpg`. O recorte ampliado mostra o ponto sobre o piso de concreto, sem pessoa visível. Essa caixa degenerada foi removida apenas dos exports derivados; a decisão está registrada em `dataset/annotations/makesense_source/corrections_2026-11-12.json`.
- O par derivado usado para gerar o dataset é `makesense_annotations_reviewed_2026-11-13.csv` e `makesense_yolo_export_reviewed_2026-11-13.zip`.
- Em 2026-11-13, o responsável enviou o YOLO revisado de `pexels-themightynelson-5667685.jpg` sem a caixa `colete` `[4274, 1983, 36, 7]` (36×7 px, sobre uma faixa estreita da cena). A caixa foi removida do par derivado e a decisão está em `corrections_2026-11-13.json`; os quatro rótulos restantes da imagem foram preservados sem alteração.

## Evidências estruturais

- `tools/dataset/validate_makesense_export.py` validou o par derivado: 269 caixas, 31 imagens, quatro classes, dimensões compatíveis, caixas positivas e dentro dos limites, sem duplicatas e com correspondência completa entre CSV e ZIP.
- `tools/dataset/import_makesense_export.py` gerou o COCO e os 31 arquivos YOLO a partir do CSV validado.
- A comparação independente encontrou 269 caixas no CSV e COCO, e 269 linhas YOLO. A multiconjunto de imagem, classe e coordenadas COCO corresponde exatamente ao CSV. A diferença máxima entre coordenadas em pixels e a conversão YOLO, por arredondamento, foi 0,005728 px.
- IDs, áreas e limites das caixas COCO foram conferidos. Todos os arquivos YOLO têm rótulos normalizados dentro do intervalo válido.

## Conferências visuais pontuais

| Imagem                                                                             | Resultado da revisão                                                                                                                                                                              | Estado                                                                            |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `glenov-brankovic-DWp5nUqTn6E-unsplash.jpg`                                        | A exportação revisada acrescentou uma caixa `pessoa` que associa geometricamente o colete e o capacete do trabalhador central. A caixa degenerada do piso foi removida do derivado.               | Melhoria aplicada; a aprovação final continua pendente.                           |
| `pexels-felix-schickel-2151168240-36840576.jpg`                                    | A caixa `sem_capacete` foi atualizada para `[2025, 4603, 904, 635]`, delimitando a cabeça do trabalhador que usa chapéu de tecido.                                                                | Revisada pelo responsável; sem erro estrutural encontrado.                        |
| `emmanuel-ikwuegbu-KHO_jvns5Xc-unsplash.jpg`                                       | O recorte mostra que a caixa `pessoa` `[117, 782, 2332, 3218]` começa abaixo do topo do cabelo. A caixa `sem_capacete` é `[820, 708, 545, 297]`. A caixa de pessoa corta parte visível da cabeça. | **Pendente:** ajustar o topo da caixa `pessoa` no MakeSense e enviar novo export. |
| `angel-arcalle-Gz0gfUcCYsU-unsplash.jpg` e `mihaly-koles-Q-fhedM5m14-unsplash.jpg` | Pessoas pequenas ou distantes exigem atenção à identificabilidade e à regra de oclusão. A seleção das imagens já foi confirmada pelo responsável.                                                 | Conferência visual final recomendada.                                             |
| `pexels-themightynelson-5667685.jpg`                                                | A caixa `colete` `[4274, 1983, 36, 7]` foi removida por não delimitar um colete; a imagem ficou com 2 `pessoa` e 2 `sem_capacete`.                                                                    | Corrigida pelo responsável em 2026-11-13; derivado atualizado.                    |
| `pexels-rookey-pain-2688457-14053428.jpg`                                          | Há marca/logotipo visível. A licença da fotografia não determina os direitos sobre marcas de terceiros.                                                                                           | Pendência do critério de fontes/direitos, separada da geometria das caixas.       |

### Fila geométrica residual

Seis caixas `pessoa` não têm o centro de uma caixa `capacete` ou `sem_capacete` dentro delas. Isso pode ocorrer por corte, tamanho ou oclusão; os casos abaixo são candidatos a revisão, não erros confirmados.

| Imagem                                      | Anotação COCO `pessoa` |
| ------------------------------------------- | ---------------------: |
| `acton-crawford-A4xwAcZOAyo-unsplash.jpg`   |                     47 |
| `arron-choi-fYD54gVXFGM-unsplash.jpg`       |                     62 |
| `glenov-brankovic-DWp5nUqTn6E-unsplash.jpg` |                     78 |
| `mark-potterton-sNVkn3507Oo-unsplash.jpg`   |               119, 120 |
| `pexels-bulat843-1243575272-38146879.jpg`   |                    152 |

## Pontuação estimada do critério de anotações (25%)

**Estimativa atual: 80–85% do critério; não é nota oficial.** A estimativa considera a revisão humana declarada, mais de 30 imagens, 269 caixas estruturalmente válidas e correspondência verificável entre COCO e YOLO. O limite inferior considera a caixa `pessoa` que ainda corta o cabelo na imagem 5 e os seis candidatos de cobertura geométrica. A aprovação final não foi marcada.

## Próximo passo

A correção da caixa falsa de `colete` em `pexels-themightynelson-5667685.jpg` já foi aplicada ao par derivado de 2026-11-13 e aos exports COCO/YOLO. Falta gerar e enviar um novo CSV/ZIP depois de salvar as alterações no MakeSense; antes disso, não importar o par anexado em 2026-11-12 novamente, pois a validação reproduz a falha da linha 95. No próximo export, corrigir o topo da caixa `pessoa` na imagem 5; revisar também os seis candidatos geométricos e as duas cenas com pessoas pequenas. Manter `annotation_status=in_review` até a aprovação humana final.
