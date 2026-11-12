# Relatório — Fase 1: Preparação do Dataset

Data da inspeção: 2026-11-12

## Escopo

Inspeção da pasta `images/` e preparação de `dataset/images/` e do catálogo de procedência. Os originais em `images/` foram preservados.

## Resultados

| Verificação | Resultado |
|---|---:|
| Arquivos de imagem encontrados em `images/` | 32 |
| Arquivos JPEG decodificados e íntegros | 32 |
| Imagens únicas por SHA-256 | 31 |
| Dimensões distintas | 25 |
| Menor dimensão | 1050 × 750 px |
| Maior dimensão | 6336 × 9504 px |
| Imagens em `dataset/images/` após a preparação | 31 |
| Registros no CSV de procedência após a preparação | 31 |
| Arquivos com SHA-256 conferido contra o CSV | 31 |

## Inconsistências e pendências

1. Há um duplicado exato: `glenov-brankovic-DWp5nUqTn6E-unsplash.jpg` e `glenov-brankovic-DWp5nUqTn6E-unsplash (1).jpg` têm o mesmo SHA-256 e dimensões (4000 × 3000 px). Nenhum arquivo foi removido.
2. O CSV legado usava seis colunas e dois registros vazios (`image_001.jpg` e `image_002.jpg`). Foi preservada uma cópia em `dataset/sources/image_sources.csv.bak-2026-11-12`; o catálogo ativo usa as 16 colunas padrão da ferramenta e a coluna adicional `author_url`.
3. As 31 imagens únicas foram copiadas para `dataset/images/`. Os arquivos originais em `images/` permanecem intactos.
4. As URLs de origem foram associadas aos arquivos por seus identificadores de Unsplash/Pexels ou pelo nome exato do arquivo da Wikimedia, usando `ListaDeLinks.txt`. O catálogo foi complementado depois com metadados de Unsplash, Pexels e Wikimedia; consulte `docs/relatorio-metadados-origens.md` para a origem e o nível de verificação de cada campo. `download_date` continua vazio por falta de registro histórico confiável.
5. A adequação foi confirmada pelo responsável. A triagem visual preliminar continua registrada como observação, não como exclusão automática.

## Triagem visual preliminar

Foi montada uma folha de contato para comparação visual: `dataset-contact-sheet.jpg` (artefato de inspeção temporário, fora do dataset). Esta triagem não substitui a seleção e aprovação do responsável.

- A maioria das imagens mostra pessoas em canteiros, obras ou atividade de construção e parece compatível com o tema.
- `angel-arcalle-Gz0gfUcCYsU-unsplash.jpg` (item 02 da folha) mostra principalmente um edifício ao pôr do sol; não há pessoa identificável na miniatura. Recomenda-se excluir após confirmação visual em tamanho original.
- `emmanuel-ikwuegbu-KHO_jvns5Xc-unsplash.jpg` (item 04) mostra uma pessoa segurando um capacete, sem evidência clara de uso de EPI ou ambiente de obra na miniatura. A pertinência ao conjunto é duvidosa.
- `mihaly-koles-Q-fhedM5m14-unsplash.jpg` (item 12) mostra uma pessoa muito pequena na cena; confirmar se é possível identificar e anotar com confiabilidade antes de selecionar.
- A duplicata exata corresponde aos itens 06 e 07; manter no máximo uma cópia caso a imagem seja aprovada.

Os demais itens ainda precisam de revisão em tamanho original, especialmente para verificar visibilidade de pessoas e utilidade para as quatro classes. A contagem de 31 imagens únicas não garante que existam 30 imagens adequadas após essa triagem.

## Critério de conclusão

A etapa de organização está **concluída**: 31 imagens únicas foram colocadas em `dataset/images/`, e há um registro correspondente por arquivo com nome, origem, URL, dimensões, tamanho e SHA-256. A validação confirmou que os nomes e hashes do CSV correspondem aos arquivos.

Permanecem pendentes a revisão dos metadados de autor/licença e a anotação. A procedência tem URL rastreável, mas campos de licença não devem ser tratados como verificados até serem preenchidos e revisados.
