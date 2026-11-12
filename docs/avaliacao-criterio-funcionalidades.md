# Avaliação — Funcionalidades obrigatórias (25%)

## Resultado atual

**Atende aos requisitos funcionais identificados; compilação de produção, suíte Angular, upload pelos inputs e inicialização local foram verificadas.** Testes de integração acionam os inputs reais do componente com arquivos sintéticos nas duas ordens; `npm start` serviu a página com HTTP 200 e o elemento raiz Angular. O filtro atual também foi verificado na página Angular.

## Conferência requisito por requisito

| Requisito                                         | Evidência atual                                                                                                                                       | Estado               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Carregar JSON COCO por upload                     | Seletor JSON visível; teste de integração envia um `File` pelo input, valida o COCO e confirma a galeria renderizada.                                  | Atendido             |
| Carregar as imagens correspondentes               | Seletor múltiplo; teste envia arquivos pelo input e confirma miniatura, imagem de prévia e associação por nome.                                        | Atendido             |
| Selecionar arquivos em qualquer ordem              | Testes de integração cobrem imagens antes do COCO e COCO antes das imagens.                                                                          | Verificado           |
| Galeria com miniatura, nome e número de anotações | `DatasetGallery` exibe miniatura lazy, nome e contagem para cada imagem.                                                                              | Atendido             |
| Selecionar imagem para visualização detalhada     | Cada cartão emite a imagem selecionada para `DatasetPage`.                                                                                            | Atendido             |
| Exibir caixas com cores por classe                | `ImagePreview` usa SVG com `viewBox` nas dimensões COCO e cores por categoria.                                                                        | Atendido             |
| Filtrar por classe                                | `ClassFilter` filtra imagens; a prévia agora mostra somente as caixas da classe selecionada, e a contagem da prévia acompanha as caixas visíveis.     | Atendido após ajuste |
| Estatísticas gerais e por classe                  | `DatasetPage` calcula totais, médias e contagens derivadas; `DatasetStatistics` apresenta os valores.                                                 | Atendido             |
| Erros amigáveis de carregamento/JSON inválido     | `DatasetLoaderService` converte erro de leitura/parse e validação em mensagem `role=alert`; teste de página confirma a mensagem para JSON inválido.      | Atendido             |
| Dataset vazio e imagem ausente                    | Há estados vazios para upload, galeria e prévia; teste de página confirma aviso quando o nome do arquivo não corresponde ao COCO.                       | Atendido             |
| Instruções `npm install` e `npm start`            | Presentes em `app/README.md` e no README principal.                                                                                                   | Atendido             |
| Inicialização pelo comando `npm start`            | Servidor Angular compilou e respondeu HTTP 200 em `http://localhost:4200/`; o documento retornado contém `<app-root>`.                                 | Verificado           |

## Ajuste realizado nesta revisão

O filtro de classe já limitava as imagens da galeria, porém a prévia ainda mostrava caixas de todas as classes. `selectedAnnotations` agora aplica a classe selecionada e o contador da prévia usa somente as anotações visíveis. As estatísticas globais permanecem inalteradas.

## Limitações e validações pendentes

- O fluxo dos inputs foi verificado com arquivos sintéticos em teste; ainda falta uma conferência manual no navegador selecionando o COCO e as imagens reais do dataset. A resposta HTTP confirma a inicialização, não essa conferência manual.
- A aplicação exige selecionar o COCO e os arquivos de imagem separadamente; essa limitação está documentada nas decisões técnicas e na interface.
- A associação por nome base pode ser ambígua em caso de arquivos homônimos; decisão futura registrada em `docs/decisoes-tecnicas.md`.

## Estimativa de pontuação

Pela cobertura dos requisitos, compilação de produção, conferência manual anterior do fluxo principal e teste de integração do filtro/caixas, a estimativa deste critério é **85–90% dos 25 pontos**. A carga dos arquivos do dataset no navegador ainda aguarda autorização. Não é uma nota oficial do avaliador.
