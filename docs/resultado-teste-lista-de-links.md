# Resultado do teste com `ListaDeLinks.txt`

Data: 2026-11-11
Ferramenta: `tools/image-collector`
Entrada: `ListaDeLinks.txt` (33 linhas)
Método: servidor local isolado, `DATASET_ROOT` temporário, nenhuma escrita no `dataset/` real.

## Resumo

| Métrica | Valor |
|---|---|
| Linhas processadas | 33 |
| Extrações com status `ready` (metadados + imagem válidos) | 31 imagens únicas (32 linhas, incluindo a duplicata) |
| Duplicata detectada por SHA-256 | 1 (linha 3 = linha 2) |
| URL rejeitada por não ser uma foto individual | 1 (linha 29, página de busca) |
| Registros confirmados no dataset temporário | 1 (`image_001.jpg`) + sidecar + linha no CSV |
| PATCH de metadados | 1 (200, `annotation_status = in_review`) |
| Erros por bloqueio anti-bot do Pexels | 4 a 8 links em cada execução completa (ver limitação) |

Cada um dos 31 links de foto foi extraído com sucesso pelo menos uma vez durante os testes,
incluindo os links do Pexels que falharam nas execuções em lote.

## Comportamento por plataforma

- **Unsplash (12 linhas, 11 fotos únicas + 1 duplicata):** autor, título, página de origem,
  URL direta, dimensões, formato, tamanho e SHA-256 extraídos. A licença do Unsplash não é
  exposta na página pública, então o campo fica vazio e recebe
  `license_requires_manual_verification` + `license_missing`; a URL da licença é preservada
  (`https://unsplash.com/pt-br/licen%C3%A7a`).
- **Wikimedia Commons (1 link):** extração via API `imageinfo`; título, autor
  ("Karen Apricot"), licença `CC BY-SA 2.0`, URL da licença, 1050x750, JPEG, 837.767 bytes e
  SHA-256 `9ba2e167…27dc1`. Avisos `attribution_required` e `copyrighted_material`.
- **Pexels (20 linhas: 19 fotos + 1 busca):** autor, título, página de origem, URL direta sem
  parâmetros de transformação, dimensões e hash extraídos da página pública. Sem
  `PEXELS_API_KEY`, cada foto recebe `official_api_not_configured`.
- **Linha 29 (`/search/construction%20worker/`):** rejeitada com `UNSUPPORTED_URL` (HTTP 422),
  sem baixar imagem e sem gravar nada. Antes da correção, a ferramenta aceitava a página de
  busca e registrava a primeira foto do resultado como se fosse a foto enviada.

## Duplicata, confirmação e persistência

- Linha 3 repete a linha 2. A extração retornou `status: duplicate` e a confirmação retornou
  `409 DUPLICATE_IMAGE` com `fileName: image_001.jpg`; nenhum byte foi gravado.
- A linha 2 foi confirmada (`201`) e gerou:
  - `dataset/images/image_001.jpg` (bytes originais, sem recodificação);
  - `dataset/sources/records/image_001.json` (sidecar);
  - uma linha no CSV com o cabeçalho padrão de 16 colunas.
- O `PATCH` em `image_001.jpg` atualizou `annotation_status` para `in_review` e as observações,
  retornando `200`.
- `GET /api/records` retornou `200` com 1 registro e miniatura.

## Defeitos encontrados e corrigidos

1. **Página de busca do Pexels aceita como foto.** Agora URLs sem `/photo/<id>` são rejeitadas
   com `UNSUPPORTED_URL` antes de qualquer download.
2. **Rótulos genéricos usados como nome de licença.** Textos como "License" e "Free" viravam
   `license`, o que mascarava a ausência de licença. Agora só nomes reconhecíveis (CC, Pexels
   License, Unsplash License, domínio público etc.) são aceitos; rótulos genéricos mantêm
   apenas `license_url` e marcam verificação manual.
3. **Falhas transitórias sem retry e sem causa visível.** O cliente HTTP agora repete
   `429/408/425/5xx` até 2 vezes com backoff e respeita `Retry-After` (limite de 5 s), espaça
   requisições por host (`MIN_HOST_INTERVAL_MS`, padrão 1000 ms) e mostra o status HTTP do
   servidor remoto na mensagem de erro.

## Limitação observada: bloqueio anti-bot do Pexels

O Pexels responde `HTTP 403` para as páginas públicas depois de cerca de 15 a 30 requisições
em uma janela curta, mesmo com 1 s de intervalo entre requisições. O bloqueio dura alguns
minutos e atinge também URLs que funcionaram segundos antes. Evidências:

- Execuções em lote: os últimos links do Pexels falham com 403.
- Os mesmos links, testados isoladamente após o bloqueio expirar, retornam `ready` com todos
  os metadados.
- Requisição com conexão nova e `User-Agent` idêntico também recebe 403, então não é
  keep-alive nem cabeçalho.

A ferramenta não tenta contornar o bloqueio. Para uso em lote, configure `PEXELS_API_KEY`
(API oficial) ou processe os links do Pexels em pequenos lotes com pausa entre eles.

## Validação executada

- `npm test`: **81 testes passaram, 0 falharam** (`node --test`).
- `node --check` nos arquivos alterados.
- Servidor local com `DATASET_ROOT` temporário: health, config, UI (`/`), extração, confirmação,
  duplicata, PATCH, listagem e limpeza de previews.
- Nenhuma escrita no `dataset/` real: `dataset/images/` continua vazio e o CSV legado segue
  intacto (o cabeçalho padrão de 16 colunas é aplicado na primeira confirmação; `author_url` foi adicionado posteriormente ao catálogo ativo).

## Não executado

- Teste com múltiplos clientes simultâneos.
- Teste em experiência publicada com DataStore (não se aplica a esta ferramenta local).
- Revisão humana das licenças e da classificação visual das imagens.
- Geração de anotações COCO/YOLO (fora do escopo da ferramenta).
