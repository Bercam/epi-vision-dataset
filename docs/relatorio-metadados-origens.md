# Relatório — Extração de metadados das imagens

Data: 2026-11-12

## Resumo

- Imagens únicas consideradas: 31
- Tentativas: 32 (uma URL da Unsplash foi repetida após o limite local)
- Extrações concluídas: 12 (11 Unsplash, 1 Wikimedia Commons)
- Imagens sem extração automática: 19 (todas Pexels, HTTP 403 anti-bot)
- Os metadados suplementares das 19 imagens Pexels foram informados pelo usuário; os 7 itens sinalizados por inferência/handle foram conferidos pelo usuário em 2026-11-12.
- A licença das 11 imagens da Unsplash foi preenchida como `Unsplash License`, com base na página oficial da plataforma.
- Nenhuma imagem foi confirmada ou salva novamente; os previews temporários foram descartados.
- `PEXELS_API_KEY` não estava configurada. O coletor informa que o acesso à API oficial pode evitar a dependência da página pública bloqueada.

## Metadados extraídos

| Arquivo | Autor | Título retornado | Licença | URL da licença |
|---|---|---|---|---|
| Groundbreaking_for_Roberts_Grocery_Carrollton_Claiborne_New_Orleans.jpg | Karen Apricot | Groundbreaking for Roberts Grocery Carrollton Claiborne New Orleans | CC BY-SA 2.0 | https://creativecommons.org/licenses/by-sa/2.0 |
| acton-crawford-A4xwAcZOAyo-unsplash.jpg | Acton Crawford | Foto de Acton Crawford na Unsplash | Unsplash License | https://unsplash.com/pt-br/licen%C3%A7a |
| angel-arcalle-Gz0gfUcCYsU-unsplash.jpg | Angel Arcalle | Foto de Angel Arcalle na Unsplash | Unsplash License | https://unsplash.com/pt-br/licen%C3%A7a |
| arron-choi-fYD54gVXFGM-unsplash.jpg | Arron Choi | Foto de Arron Choi na Unsplash | Unsplash License | https://unsplash.com/pt-br/licen%C3%A7a |
| emmanuel-ikwuegbu-KHO_jvns5Xc-unsplash.jpg | Emmanuel Ikwuegbu | Foto de Emmanuel Ikwuegbu na Unsplash | Unsplash License | https://unsplash.com/pt-br/licen%C3%A7a |
| eric-wang-umD2Bj4FmMU-unsplash.jpg | Eric Wang | Foto de Eric Wang na Unsplash | Unsplash License | https://unsplash.com/pt-br/licen%C3%A7a |
| glenov-brankovic-DWp5nUqTn6E-unsplash.jpg | Glenov Brankovic | Foto de Glenov Brankovic na Unsplash | Unsplash License | https://unsplash.com/pt-br/licen%C3%A7a |
| jose-megias-7Qxn3y2CQcM-unsplash.jpg | Jose Megias | Foto de Jose Megias na Unsplash | Unsplash License | https://unsplash.com/pt-br/licen%C3%A7a |
| mario-spencer-n2ZWj8uyAfQ-unsplash.jpg | Mario Spencer | Foto de Mario Spencer na Unsplash | Unsplash License | https://unsplash.com/pt-br/licen%C3%A7a |
| mark-potterton-sNVkn3507Oo-unsplash.jpg | Mark Potterton | Foto de Mark Potterton na Unsplash | Unsplash License | https://unsplash.com/pt-br/licen%C3%A7a |
| mihaly-koles-Q-fhedM5m14-unsplash.jpg | Mihály Köles | Foto de Mihály Köles na Unsplash | Unsplash License | https://unsplash.com/pt-br/licen%C3%A7a |
| samuel-cruz-1MsIpeOd_4o-unsplash.jpg | Samuel Cruz | Foto de Samuel Cruz na Unsplash | Unsplash License | https://unsplash.com/pt-br/licen%C3%A7a |

Os autores, títulos, URLs de licença e URLs diretas extraídos foram incorporados ao CSV. A licença da Unsplash foi identificada na página oficial da plataforma e aplicada às 11 imagens. Os títulos retornados pela Unsplash são genéricos e podem ser conferidos se for necessário descrever o conteúdo de cada foto.

## Condições relevantes da Licença Unsplash

- A licença permite uso gratuito, comercial e não comercial, sem exigir atribuição.
- Ela proíbe vender imagens sem modificações significativas e compilar imagens para replicar um serviço semelhante ou concorrente.
- Ela cobre os direitos autorais da fotografia, mas não concede automaticamente direitos sobre pessoas reconhecíveis, marcas, logotipos ou obras retratadas. A necessidade de permissões adicionais depende do uso pretendido; revisar cada imagem antes de publicação ou uso fora do escopo do dataset.

## Condições relevantes da Licença Pexels

- A página oficial identifica a licença como Pexels License; o CSV usa esse nome e registra `https://www.pexels.com/license/`.
- A licença informa que a atribuição não é obrigatória e permite modificar as imagens. Ela restringe cópias sem alteração, redistribuição em outros bancos de imagens, uso como marca e usos que impliquem endosso por pessoas ou marcas retratadas.

## O que falta verificar manualmente

### Unsplash
- A licença já foi registrada como `Unsplash License` nas 11 linhas correspondentes do CSV; não falta buscar o nome da licença.
- Revisar visualmente direitos de terceiros nas imagens: pessoas identificáveis, marcas/logotipos e obras de arte. A licença da fotografia não concede automaticamente esses direitos.

### Pexels — metadados informados após HTTP 403
- As páginas individuais não puderam ser verificadas pelo coletor; os dados abaixo vieram da lista enviada pelo usuário. URLs diretas, autorias e títulos não foram reabertos pelo coletor.
- O CSV agora contém `author_url`, URL direta, título, autor e `Pexels License` para as 19 imagens.

| Arquivo | Autor informado | Título informado | Verificação pendente |
|---|---|---|---|
| pexels-1433506698-39467054.jpg | 女子正真 | Construction Workers on Scaffolding with Brick Wall | não revalidado na página (HTTP 403) |
| pexels-akoonie-38706749.jpg | akoonie | Construction Workers Collaborating on Scaffolding | conferido pelo usuário em 2026-11-12 |
| pexels-alispective-32141074.jpg | Ali | Construction Workers Installing Reinforcement Bars at Site | conferido pelo usuário em 2026-11-12 |
| pexels-bulat843-1243575272-38146879.jpg | bulat843 | Construction Worker Shoveling Sand at Worksite | conferido pelo usuário em 2026-11-12 |
| pexels-felix-schickel-2151168240-36840576.jpg | Felix Schickel | Construction Worker in Front of Unfinished Building | não revalidado na página (HTTP 403) |
| pexels-freek-wolsink-508219-31249554.jpg | Freek Wolsink | Construction Workers Operating Heavy Machinery Outdoors | conferido pelo usuário em 2026-11-12 |
| pexels-jiang-hua-201207336-27944997.jpg | jiang hua | 日常记录 | não revalidado na página (HTTP 403) |
| pexels-keat007-31168936.jpg | keat007 | Construction Workers Operating Heavy Machinery Onsite | conferido pelo usuário em 2026-11-12 |
| pexels-malu-perez-609616616-19643543.jpg | Malú Pérez | Men on a Construction Field | não revalidado na página (HTTP 403) |
| pexels-matreding-4571558.jpg | Mathias Reding | Man working on construction object in modern city | não revalidado na página (HTTP 403) |
| pexels-njeromin-12314551.jpg | Niklas Jeromin | Construction Workers on a Building Site | não revalidado na página (HTTP 403) |
| pexels-osicooked-40195096.jpg | Osman İçli | Construction Workers Welding on Building Structure | não revalidado na página (HTTP 403) |
| pexels-peter-bk-3755520-31428953.jpg | Peter Bk | Nighttime Urban Construction Worker Scene | conferido pelo usuário em 2026-11-12 |
| pexels-ron-lach-8817846.jpg | Ron Lach | Men Constructing a Wooden House | não revalidado na página (HTTP 403) |
| pexels-rookey-pain-2688457-14053428.jpg | Rookey Pain | Workers Constructing a Road | não revalidado na página (HTTP 403) |
| pexels-safari-consoler-3290243-11293624.jpg | Safari Consoler | Men Working at a Construction Site | não revalidado na página (HTTP 403) |
| pexels-safari-consoler-3290243-11293626.jpg | Safari Consoler | People Working in the Construction Site | não revalidado na página (HTTP 403) |
| pexels-themightynelson-5667685.jpg | Nelson Axigoth | Workers on Street | não revalidado na página (HTTP 403) |
| pexels-wal_-172619-2156618639-37636256.jpg | wal_ | Construction Workers on Building Site | conferido pelo usuário em 2026-11-12 |

Os cinco pares de autor/título inferidos, o handle `wal_` e o nome `Ali` foram conferidos pelo usuário em 2026-11-12. Os dados foram registrados com essa confirmação; a ferramenta ainda não conseguiu reabrir as páginas individuais devido ao HTTP 403.
### Wikimedia Commons
- `Groundbreaking_for_Roberts_Grocery_Carrollton_Claiborne_New_Orleans.jpg` — o coletor retornou Karen Apricot e CC BY-SA 2.0. Revisar a atribuição exigida e o aviso `copyrighted_material` antes de publicar.

### Datas de download
- `download_date` permanece vazio: a ferramenta não consegue determinar a data histórica em que os arquivos originais foram baixados. Preencher somente se houver registro confiável.

### URLs dos autores
- O campo opcional `author_url` está preenchido nas 19 linhas Pexels e vazio nas 11 linhas Unsplash e na linha Wikimedia Commons. `source_url` permanece preenchido para as 31 imagens e identifica a página de origem; não inferir URLs de perfil a partir do nome do autor.

## Limitações da execução

- A página pública do Pexels respondeu HTTP 403 para todos os 19 links deste dataset. O coletor não tentou contornar o bloqueio.
- Uma URL da Unsplash atingiu o limite local temporário do coletor no primeiro passe; após o intervalo, a repetição funcionou e encontrou autor e título.
- Os estados `duplicate` retornados pelo coletor significam que o SHA-256 já existia no dataset; são extrações bem-sucedidas e nenhum arquivo foi gravado.
- O campo de licença vazio não significa que a imagem não tenha licença; significa que a ferramenta não conseguiu identificá-la com segurança.

## Estado atual do catálogo

Na revisão do dataset em 2026-11-12, os 31 registros ativos tinham autor e licença preenchidos, e todos os SHA-256 correspondiam aos arquivos de `dataset/images/`. `download_date` continua vazio nos 31 registros porque não há um registro histórico confiável para preencher esse campo. O responsável revisou as anotações, mas a aprovação final continua pendente; por isso, `annotation_status` permanece `in_review` nos 31 registros.
