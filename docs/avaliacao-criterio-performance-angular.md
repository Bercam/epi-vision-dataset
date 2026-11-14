# Avaliação — Performance e boas práticas Angular (20%)

## Resultado atual

**Estimativa: 90–95% do critério.** Os padrões de performance pedidos estão implementados e a compilação de produção passou. A estimativa não é uma nota oficial do avaliador.

## Evidências

- Componentes Angular usam `ChangeDetectionStrategy.OnPush`.
- Estado local usa Signals e os valores derivados (estatísticas, filtro e seleção) usam `computed`; a visibilidade de classes na tela cheia usa `linkedSignal` para preservar a seleção ao navegar.
- Todos os loops `@for` encontrados usam `track` por ID estável.
- Miniaturas usam `loading="lazy"`.
- Imagens locais usam object URLs temporárias; a troca da seleção revoga URLs anteriores e `DatasetPage.ngOnDestroy` libera as URLs restantes.
- Quando arquivos selecionados têm o mesmo nome normalizado, a URL substituída é revogada antes de atualizar o mapa. Um teste do serviço confirma a liberação da URL substituída e da URL final.
- O único listener manual é o `keydown` da tela cheia; ele é removido em `ImageFullscreenViewer.ngOnDestroy`, junto com a restauração de `body.style.overflow` e do foco. Não há subscriptions nem timers pendentes.
- A compilação de produção gerou um bundle inicial de aproximadamente **279,76 kB** (≈ 74,39 kB transferidos), abaixo do limite de erro de 1 MB configurado no Angular.

## Oportunidades restantes

- A galeria chama `imageUrl(image)` no template para cada cartão; é uma busca simples no mapa, sem cálculo estatístico ou processamento pesado. Pode ser perfilada antes de otimizar.
- O projeto não possui medição automatizada de desempenho nem teste de carga. Para 31 imagens, a implementação atual atende ao escopo; uma ampliação do dataset pode exigir thumbnails redimensionadas.
