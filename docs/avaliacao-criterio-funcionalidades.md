# Avaliação — Funcionalidades obrigatórias (25%)

## Resultado atual

**Atende aos requisitos funcionais identificados; compilação de produção, suíte Angular, testes E2E com o dataset real, upload pelos inputs e inicialização local foram verificadas.** Testes de integração acionam os inputs reais do componente com arquivos sintéticos nas duas ordens; os E2E repetem o fluxo com o COCO e as 31 imagens reais no Chromium. `npm start` serviu a página com HTTP 200 e o elemento raiz Angular. O filtro atual também foi verificado na página Angular.

## Conferência requisito por requisito

| Requisito                                              | Evidência atual                                                                                                                                              | Estado               |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| Carregar JSON COCO por upload                          | Seletor JSON visível; teste de integração envia um `File` pelo input, valida o COCO e confirma a galeria renderizada. O cartão exibe ✓ com o nome do arquivo após a validação. | Atendido             |
| Carregar as imagens correspondentes                    | Seletor múltiplo; teste envia arquivos pelo input e confirma miniatura, imagem de prévia e associação por nome. O cartão exibe ✓ com a quantidade de imagens selecionadas (singular/plural). | Atendido             |
| Selecionar arquivos em qualquer ordem                  | Testes de integração cobrem imagens antes do COCO e COCO antes das imagens.                                                                                  | Verificado           |
| Galeria com miniatura, nome e número de anotações      | `DatasetGallery` exibe miniatura lazy, nome e contagem para cada imagem.                                                                                     | Atendido             |
| Selecionar imagem para visualização detalhada          | Cada cartão emite a imagem selecionada para `DatasetPage`.                                                                                                   | Atendido             |
| Visualização em tela cheia com navegação por teclado   | `ImageFullscreenViewer` abre pelo botão da prévia, por duplo clique na prévia ou em um cartão da galeria; navega com ←/→ (com wrap-around e respeitando o filtro), fecha com Esc e restaura foco/rolagem; testes cobrem teclado, foco, duplo clique e filtro. A barra **Classes** tem caixa por classe presente na imagem (com contagem), botões **Marcar tudo**/**Tirar tudo** e mantém a seleção ao navegar; ao abrir com filtro de classe ativo, só essa classe começa visível. | Atendido             |
| Exibir caixas com cores por classe                     | `ImagePreview` usa SVG com `viewBox` nas dimensões COCO e cores por categoria.                                                                               | Atendido             |
| Filtrar por classe                                     | `ClassFilter` filtra imagens; a prévia agora mostra somente as caixas da classe selecionada, e a contagem da prévia acompanha as caixas visíveis.            | Atendido após ajuste |
| Estatísticas gerais e por classe                       | `DatasetPage` calcula totais, média e contagens; teste de página confirma no DOM 2 imagens, 3 anotações, média 1,5 e contagens `2/1/0/0` nas quatro classes. | Verificado           |
| Erros amigáveis de carregamento/JSON inválido          | `DatasetLoaderService` converte erro de leitura/parse e validação em mensagem `role=alert`; teste de página confirma a mensagem para JSON inválido.          | Atendido             |
| Dataset vazio e imagem ausente                         | Há estados vazios para upload, galeria e prévia; teste de página confirma aviso quando o nome do arquivo não corresponde ao COCO.                            | Atendido             |
| Instalação e inicialização `npm install` / `npm start` | Instruções presentes; `npm install` sem opções terminou com sucesso, e `npm start` compilou e serviu a página local.                                         | Verificado           |
| Inicialização pelo comando `npm start`                 | Servidor Angular compilou e respondeu HTTP 200 em `http://localhost:4200/`; o documento retornado contém `<app-root>`.                                       | Verificado           |

## Ajuste realizado nesta revisão

O filtro de classe já limitava as imagens da galeria, porém a prévia ainda mostrava caixas de todas as classes. `selectedAnnotations` agora aplica a classe selecionada e o contador da prévia usa somente as anotações visíveis. As estatísticas globais permanecem inalteradas.

## Limitações e validações pendentes

- O fluxo dos inputs foi verificado com arquivos sintéticos nos testes unitários e com o COCO e as 31 imagens reais nos testes E2E em Chromium. A conferência **manual** do mesmo fluxo em um navegador, por uma pessoa, ainda não foi registrada.
- A aplicação exige selecionar o COCO e os arquivos de imagem separadamente; essa limitação está documentada nas decisões técnicas e na interface.
- A associação por nome base pode ser ambígua em caso de arquivos homônimos; decisão futura registrada em `docs/decisoes-tecnicas.md`.
- As estatísticas agora são verificadas contra o dataset real no E2E, que deriva os totais do próprio COCO em vez de usar valores fixos.

## Estimativa de pontuação

Pela cobertura dos requisitos, compilação de produção, testes unitários, testes E2E com o dataset real e conferência manual anterior do fluxo principal, a estimativa deste critério é **90–95% dos 25 pontos**. A conferência visual humana das anotações e em dispositivos físicos segue pendente. Não é uma nota oficial do avaliador.
