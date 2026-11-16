# Relatório de revisão das anotações

## Estado

O dataset vigente foi atualizado em 2026-11-16 a partir de um novo export revisado do MakeSense. O CSV bruto tinha 263 caixas; duas caixas `sem_capacete` com altura zero (46×0 e 2×0 px) em `acton-crawford-A4xwAcZOAyo-unsplash.jpg` foram removidas do par derivado, resultando em **261 caixas**. Na mesma data, uma auditoria geométrica estendeu o topo de duas caixas `pessoa` que cortavam a cabeça `sem_capacete` anotada, sem alterar as demais coordenadas. **`annotation_status` continua `in_review`; a aprovação final permanece humana.**

## Histórico de exports

- **2026-11-12:** o responsável informou que revisou as anotações, mas os hashes SHA-256 dos anexos coincidiram com o par bruto já arquivado no projeto. O CSV/ZIP continha 271 caixas e falhava na validação estrutural por uma caixa degenerada na linha 95 do CSV, também sem correspondência no ZIP. Essa caixa foi removida do derivado.
- **2026-11-13:** o responsável enviou o YOLO revisado de `pexels-themightynelson-5667685.jpg` sem a caixa `colete` `[4274, 1983, 36, 7]` (36×7 px, sobre uma faixa estreita da cena). A caixa foi removida do par derivado; os quatro rótulos restantes da imagem foram preservados.
- **2026-11-16:** foi recebido um novo par CSV/ZIP com 263 caixas. Duas caixas `sem_capacete` com altura zero foram removidas do derivado, que ficou com 261 caixas. O export também refinou coordenadas: 191 caixas ficaram idênticas ao COCO anterior e as demais foram ajustadas ou substituídas na revisão.
- **2026-11-16 (auditoria geométrica):** duas caixas `pessoa` começavam abaixo do topo da cabeça `sem_capacete` contida nelas e foram estendidas apenas no topo: `emmanuel-ikwuegbu-KHO_jvns5Xc-unsplash.jpg` (10 px) e `jose-megias-7Qxn3y2CQcM-unsplash.jpg` (26 px). O CSV e o ZIP derivados foram regerados e reimportados; o bloco `geometry_review` de `corrections_2026-11-16.json` registra a decisão.

Hashes SHA-256 confirmados dos arquivos:

- 2026-11-12 ZIP `labels_my-project-name_2026-11-12-05-27-43.zip`: `2610b74f6f273502b4a3260e04da6df6421f1400ae4059ed06264d63c08c4685`.
- 2026-11-12 CSV `labels_my-project-name_2026-11-12-05-28-02.csv`: `135ecc2ca7b5b285725600a21c7cb13381379e06fa717d39468989b27e3f4aa0`.
- 2026-11-16 CSV `labels_my-project-name_2026-11-16-03-14-30.csv`: `dcdd4025522893ae3345ca8d0b70e33b708ba60f286f1dc30848d685c8fa304a`.
- 2026-11-16 ZIP `labels_my-project-name_2026-11-16-03-14-19.zip`: `2b68de78c8652f4df4f4a83d924af1ccff7889864fa959236e80d1cc1cc14312`.

Hashes SHA-256 do par derivado vigente, **depois** da correção geométrica e da normalização de line endings:

- `makesense_annotations_reviewed_2026-11-16.csv`: `b245aa6898cc1204b1229ddba43bf3616a74f61fc719686005362f262df4a2ad`.
- `makesense_yolo_export_reviewed_2026-11-16.zip`: `33626b2e4a43854af2b281997c571baf8ef84bb4e4aef25fbc8da3d855aa0f09`.
- `corrections_2026-11-16.json`: `c80fb32869448c09f1abfa753371a13b3311ac9d70d010b65f10d2e6fb6e1dd1`.

## Dataset atual

- 31 imagens e 261 anotações: `pessoa` 104, `capacete` 67, `colete` 59 e `sem_capacete` 31.
- Os exports brutos recebidos foram preservados em `dataset/annotations/makesense_source/`.
- O par derivado usado para gerar o dataset é `makesense_annotations_reviewed_2026-11-16.csv` e `makesense_yolo_export_reviewed_2026-11-16.zip`.
- A caixa `pessoa` da linha 95 do CSV bruto de 2026-11-12 tinha dimensão `[1834, 2703, 6, 0]` na imagem `glenov-brankovic-DWp5nUqTn6E-unsplash.jpg`. O recorte ampliado mostra o ponto sobre o piso de concreto, sem pessoa visível. Essa caixa degenerada foi removida apenas dos exports derivados; a decisão está registrada em `corrections_2026-11-12.json`.
- A caixa falsa de `colete` de 2026-11-13 está documentada em `corrections_2026-11-13.json`.
- Em 2026-11-16, duas caixas `sem_capacete` com altura zero foram removidas de `acton-crawford-A4xwAcZOAyo-unsplash.jpg`; a imagem ficou com 39 caixas (14 `pessoa`, 12 `capacete` e 13 `colete`). A decisão está em `corrections_2026-11-16.json`.
- As duas caixas `pessoa` corrigidas na auditoria geométrica estão registradas no bloco `geometry_review` do mesmo arquivo; o COCO e o YOLO foram regerados a partir do par derivado corrigido.

## Evidências estruturais

- `tools/dataset/validate_makesense_export.py` validou o par derivado: 261 caixas, 31 imagens, quatro classes, dimensões compatíveis, caixas positivas e dentro dos limites, sem duplicatas e com correspondência completa entre CSV e ZIP.
- `tools/dataset/import_makesense_export.py` gerou o COCO e os 31 arquivos YOLO a partir do CSV validado.
- A comparação independente encontrou 261 caixas no CSV e COCO, e 261 linhas YOLO. O multiconjunto de imagem, classe e coordenadas COCO corresponde exatamente ao CSV. A diferença máxima entre coordenadas em pixels e a conversão YOLO final, por arredondamento, foi **0,00473 px**.
- IDs, áreas e limites das caixas COCO foram conferidos. Todos os arquivos YOLO têm rótulos normalizados dentro do intervalo válido.
- `npm run validate:manifest` confirmou que os 31 registros do catálogo continuam correspondendo às imagens e às referências do COCO.
- `tools/dataset/audit_annotations.py` foi executado sobre o COCO vigente: **0 erros objetivos** (sem caixas degeneradas, fora dos limites, duplicadas, cabeças/coletes órfãos ou maiores que a pessoa) e **38 avisos** para inspeção humana.

## Conferências visuais pontuais

| Imagem | Resultado da revisão | Estado |
| --- | --- | --- |
| `acton-crawford-A4xwAcZOAyo-unsplash.jpg` | Duas caixas `sem_capacete` com altura zero (46×0 e 2×0 px) foram removidas; a imagem ficou com 39 caixas (14 `pessoa`, 12 `capacete`, 13 `colete`). | Corrigida no derivado de 2026-11-16; revisão visual final pendente. |
| `glenov-brankovic-DWp5nUqTn6E-unsplash.jpg` | A exportação revisada acrescentou uma caixa `pessoa` que associa geometricamente o colete e o capacete do trabalhador central. A caixa degenerada do piso foi removida do derivado. | Melhoria aplicada; a aprovação final continua pendente. |
| `pexels-felix-schickel-2151168240-36840576.jpg` | A caixa `sem_capacete` foi atualizada para `[2025, 4603, 904, 635]`, delimitando a cabeça do trabalhador que usa chapéu de tecido. | Revisada pelo responsável; sem erro estrutural encontrado. |
| `emmanuel-ikwuegbu-KHO_jvns5Xc-unsplash.jpg` | A caixa `pessoa` `[117, 718, 2332, 3282]` começava 10 px abaixo do topo da cabeça `sem_capacete` `[820, 708, 545, 297]`. O topo foi estendido para `y=708` e a altura para `3292`, preservando largura e base. | Corrigida no derivado e no COCO em 2026-11-16; revisão visual final pendente. |
| `jose-megias-7Qxn3y2CQcM-unsplash.jpg` | A caixa `pessoa` `[1472, 2718, 750, 1448]` começava 26 px abaixo do topo da cabeça `sem_capacete` anotada. O topo foi estendido para `y=2692` e a altura para `1474`, preservando largura e base. | Corrigida no derivado e no COCO em 2026-11-16; revisão visual final pendente. |
| `angel-arcalle-Gz0gfUcCYsU-unsplash.jpg` e `mihaly-koles-Q-fhedM5m14-unsplash.jpg` | Pessoas pequenas ou distantes exigem atenção à identificabilidade e à regra de oclusão. A seleção das imagens já foi confirmada pelo responsável. | Conferência visual final recomendada. |
| `pexels-themightynelson-5667685.jpg` | A caixa `colete` `[4274, 1983, 36, 7]` foi removida por não delimitar um colete; a imagem ficou com 2 `pessoa` e 2 `sem_capacete`. | Corrigida pelo responsável em 2026-11-13; derivado atualizado. |
| `pexels-rookey-pain-2688457-14053428.jpg` | Há marca/logotipo visível. A licença da fotografia não determina os direitos sobre marcas de terceiros. | Pendência do critério de fontes/direitos, separada da geometria das caixas. |

### Fila geométrica residual

Cinco caixas `pessoa` não têm o centro de uma caixa `capacete` ou `sem_capacete` dentro delas. Isso pode ocorrer por corte, tamanho ou oclusão; os casos abaixo são candidatos a revisão, não erros confirmados.

| Imagem                                      | Anotação COCO `pessoa` |
| ------------------------------------------- | ---------------------: |
| `acton-crawford-A4xwAcZOAyo-unsplash.jpg`   |                     47 |
| `arron-choi-fYD54gVXFGM-unsplash.jpg`       |                     62 |
| `mark-potterton-sNVkn3507Oo-unsplash.jpg`   |               111, 112 |
| `pexels-bulat843-1243575272-38146879.jpg`   |                    144 |

### Avisos da auditoria geométrica

`tools/dataset/audit_annotations.py` não encontrou erros objetivos. Os 38 avisos se distribuem assim:

| Verificação | Qtd. | Interpretação |
| --- | ---: | --- |
| `head_cut` | 8 | A caixa `pessoa` começa abaixo do topo de um `capacete` cujo centro está dentro dela. |
| `person_without_head` | 5 | Nenhum centro de `capacete`/`sem_capacete` cai dentro da caixa `pessoa` (corte, distância ou oclusão). |
| `tiny` | 2 | Caixas `capacete` com área inferior a 0,02% da imagem. |
| `touches_edge` | 23 | Caixa encosta na borda da imagem; frequente em pessoas parcialmente enquadradas. |

Os oito `head_cut` de `capacete` **não** foram alterados: o capacete é um objeto separado e o recorte da `pessoa` pode excluir o topo da cabeça por oclusão ou enquadramento. Somente os dois casos em que a cabeça `sem_capacete` anotada ficava comprovadamente cortada foram corrigidos. Os demais avisos continuam na fila de inspeção humana.

## Pontuação estimada do critério de anotações (25%)

**Estimativa atual: 82–87% do critério; não é nota oficial.** A estimativa considera a revisão humana declarada, mais de 30 imagens, 261 caixas estruturalmente válidas, correspondência verificável entre COCO e YOLO e zero erros objetivos na auditoria geométrica. O limite inferior considera os cinco candidatos de cobertura geométrica, as duas caixas `capacete` minúsculas e os avisos que ainda dependem de inspeção visual. A aprovação final não foi marcada.

## Próximo passo

O export de 2026-11-16 já foi validado e importado; o par derivado corrigido é o vigente. As duas caixas `pessoa` que cortavam a cabeça `sem_capacete` foram estendidas e reimportadas. Falta revisar os cinco candidatos geométricos, as duas caixas `capacete` minúsculas e as duas cenas com pessoas pequenas. As duas caixas degeneradas removidas não delimitavam objeto; se forem necessárias, devem ser redesenhadas no MakeSense e incluídas em um novo export. Não reimportar o par de 2026-11-12, que reproduz a falha da linha 95. Manter `annotation_status=in_review` até a aprovação humana final.
