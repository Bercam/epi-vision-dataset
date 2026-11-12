# Avaliação — Funcionalidades obrigatórias (25%)

## Resultado atual

**Atende aos requisitos funcionais identificados; compilação de produção e testes unitários concluídos.** A interação principal já havia sido conferida manualmente; a mudança do filtro foi coberta por teste unitário e ainda precisa de uma conferência rápida em navegador.

## Conferência requisito por requisito

| Requisito | Evidência atual | Estado |
|---|---|---|
| Carregar JSON COCO por upload | `app/src/app/features/dataset/components/dataset-import-panel.html` oferece seletor JSON; `DatasetLoaderService.loadJsonFile` lê e valida o conteúdo. | Atendido |
| Carregar as imagens correspondentes | O painel aceita seleção múltipla; `DatasetLoaderService` cria URLs temporárias e associa arquivos pelo nome normalizado. | Atendido |
| Galeria com miniatura, nome e número de anotações | `DatasetGallery` exibe miniatura lazy, nome e contagem para cada imagem. | Atendido |
| Selecionar imagem para visualização detalhada | Cada cartão emite a imagem selecionada para `DatasetPage`. | Atendido |
| Exibir caixas com cores por classe | `ImagePreview` usa SVG com `viewBox` nas dimensões COCO e cores por categoria. | Atendido |
| Filtrar por classe | `ClassFilter` filtra imagens; a prévia agora mostra somente as caixas da classe selecionada, e a contagem da prévia acompanha as caixas visíveis. | Atendido após ajuste |
| Estatísticas gerais e por classe | `DatasetPage` calcula totais, médias e contagens derivadas; `DatasetStatistics` apresenta os valores. | Atendido |
| Erros amigáveis de carregamento/JSON inválido | `DatasetLoaderService` converte erro de leitura/parse e validação em mensagem exibida com `role=alert`. | Atendido |
| Dataset vazio e imagem ausente | Há estados vazios para upload, galeria e prévia; imagens faltantes são contadas e informadas no painel. | Atendido |
| Instruções `npm install` e `npm start` | Presentes em `app/README.md` e no README principal. | Atendido |

## Ajuste realizado nesta revisão

O filtro de classe já limitava as imagens da galeria, porém a prévia ainda mostrava caixas de todas as classes. `selectedAnnotations` agora aplica a classe selecionada e o contador da prévia usa somente as anotações visíveis. As estatísticas globais permanecem inalteradas.

## Limitações e validações pendentes

- Conferir em navegador o filtro após a alteração e observar que somente as caixas da classe escolhida permanecem na prévia.
- A seleção do JSON e das imagens no app local pela UI ainda aguarda autorização do usuário; a aplicação já compilou, mas o servidor de desenvolvimento foi encerrado.
- A aplicação exige selecionar o COCO e os arquivos de imagem separadamente; essa limitação está documentada nas decisões técnicas e na interface.
- A associação por nome base pode ser ambígua em caso de arquivos homônimos; decisão futura registrada em `docs/decisoes-tecnicas.md`.

## Estimativa de pontuação

Pela cobertura do código, compilação de produção e conferência manual anterior do fluxo principal, a estimativa deste critério é **80–90% dos 25 pontos**. O ajuste de filtro foi compilado, mas sua interação específica ainda aguarda conferência manual em navegador. Não é uma nota oficial do avaliador.
