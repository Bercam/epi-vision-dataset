# Especificações Técnicas — Teste Técnico de Anotação de Dados + Angular

## 1. Visão geral

O projeto consiste no desenvolvimento de uma solução para anotação e exploração de imagens relacionadas à utilização de Equipamentos de Proteção Individual (EPIs).

O trabalho está dividido em duas partes:

1. **Anotação de dados:** construção de um dataset de imagens com identificação de pessoas e EPIs, utilizando bounding boxes e exportação nos formatos COCO e YOLO.
2. **Aplicação Angular:** desenvolvimento de uma interface web para carregar, visualizar, filtrar e analisar as imagens e suas respectivas anotações.

O desenvolvimento deve atender aos requisitos funcionais e técnicos descritos neste documento.

## 2. Prazo e condições gerais

- Prazo de entrega: 7 dias corridos a partir do recebimento do teste.
- A entrega deve ser disponibilizada em um repositório público no GitHub.
- A aplicação deve possuir instruções claras para instalação e execução.
- Dúvidas sobre o teste podem ser encaminhadas aos responsáveis.
- Decisões razoáveis, quando documentadas, também serão consideradas.
- Caso não seja possível concluir tudo dentro do prazo, priorizar qualidade, organização e documentação das funcionalidades implementadas e das pendências.

---

# PARTE 1 — ANOTAÇÃO DE DADOS

## 3. Objetivo

Construir um dataset de imagens contendo pessoas em ambientes de obras, indústrias ou contextos similares, identificando pessoas e equipamentos de proteção individual.

As imagens deverão ser anotadas por meio de bounding boxes, seguindo critérios de precisão e consistência.

## 4. Requisitos do dataset

### 4.1. Quantidade de imagens

- Reunir no mínimo 30 imagens.
- As imagens devem apresentar pessoas em obras, indústrias ou ambientes similares.
- Podem ser utilizadas imagens próprias ou provenientes de bancos públicos gratuitos, como Unsplash e Pexels.
- A origem de cada imagem deve ser informada.

### 4.2. Ferramenta de anotação

Ferramenta indicada pelo teste:

**makesense.ai**

Características:
- Gratuita.
- Utilização diretamente pelo navegador.
- Não exige instalação.
- Não exige cadastro.
- Não salva automaticamente o projeto na nuvem.

**Atenção:** exportar as anotações antes de fechar a ferramenta, pois o projeto não é armazenado na nuvem.

## 5. Classes obrigatórias

O dataset deve utilizar exatamente as seguintes classes:

| Classe | Definição |
|---|---|
| `pessoa` | Toda pessoa visível na imagem, mesmo parcialmente. |
| `capacete` | Capacete de segurança sendo utilizado pela pessoa. |
| `colete` | Colete refletivo sendo utilizado pela pessoa. |
| `sem_capacete` | Cabeça de uma pessoa que não está utilizando capacete. |

As classes devem ser utilizadas de maneira consistente em todas as imagens.

## 6. Critérios de anotação

### 6.1. Bounding boxes

As caixas delimitadoras devem:

- Envolver o objeto inteiro.
- Ser ajustadas ao objeto, sem excesso de espaço.
- Não cortar partes visíveis do objeto.
- Manter consistência entre objetos equivalentes.

### 6.2. Cobertura das anotações

- Marcar todos os objetos pertencentes às classes definidas.
- Não marcar apenas os objetos mais evidentes.
- Considerar pessoas parcialmente visíveis.
- Objetos muito pequenos ou cobertos em mais de 80% podem ser ignorados.
- As exclusões devem ser registradas no README.

### 6.3. Consistência

O mesmo critério deve ser aplicado em situações equivalentes.

Dificuldades, ambiguidades e situações de oclusão devem ser documentadas no README.

## 7. Formatos de exportação

O dataset deve ser entregue em dois formatos:

### 7.1. COCO JSON

Formato utilizado pela aplicação Angular para carregar e explorar as anotações.

O arquivo deve conter as informações necessárias para relacionar imagens, categorias e anotações.

Estruturas esperadas do formato COCO:

- `images`
- `annotations`
- `categories`

### 7.2. YOLO

Formato amplamente utilizado em projetos de treinamento de modelos de detecção de objetos.

As anotações devem ser exportadas no formato YOLO, mantendo a correspondência com as classes e os objetos anotados no dataset.

## 8. Entregáveis da Parte 1

- Diretório contendo as imagens.
- Arquivo de anotações COCO JSON.
- Diretório contendo as anotações YOLO.
- README documentando:
  - Critérios utilizados nas anotações.
  - Dificuldades encontradas.
  - Ambiguidades.
  - Situações de oclusão.
  - Origem das imagens.

---

# PARTE 2 — APLICAÇÃO ANGULAR

## 9. Objetivo

Desenvolver uma aplicação web para carregar e explorar o dataset criado na Parte 1.

A aplicação deve permitir visualizar as imagens, identificar suas anotações, filtrar por classe e consultar estatísticas gerais.

## 10. Requisitos tecnológicos

| Tecnologia | Requisito |
|---|---|
| Angular | Versão 17 ou superior |
| Arquitetura Angular | Standalone Components |
| Linguagem | TypeScript |
| Tipagem | Fortemente tipado |
| Formato de entrada | COCO JSON |
| Visualização de anotações | Canvas, SVG ou CSS |
| Execução | npm install e npm start |

### 10.1. TypeScript

O projeto deve utilizar tipagem forte.

Criar interfaces para representar:

- `images`
- `annotations`
- `categories`

Evitar a utilização de `any`.

Os dados carregados do JSON devem ser tratados de acordo com seus respectivos contratos.

## 11. Funcionalidades obrigatórias

### 11.1. Carregamento do dataset

A aplicação deve permitir carregar o arquivo COCO JSON de uma das seguintes maneiras:

- Disponibilização por meio de assets.
- Upload do arquivo pelo usuário.

### 11.2. Galeria de imagens

Implementar uma galeria contendo:

- Miniatura da imagem.
- Nome do arquivo.
- Quantidade de anotações associadas.

A galeria deve permitir selecionar uma imagem para visualização detalhada.

### 11.3. Visualizador de imagens e anotações

Ao selecionar uma imagem, a aplicação deve apresentar:

- A imagem original.
- As bounding boxes correspondentes às anotações.
- A identificação visual das classes.

As caixas devem ser sobrepostas à imagem utilizando uma das abordagens permitidas:

- Canvas.
- SVG.
- CSS.

Cada classe deve possuir uma cor distinta para facilitar a identificação visual.

### 11.4. Filtro por classe

Implementar um filtro que permita selecionar uma classe específica.

Ao selecionar uma classe, a galeria deve apresentar somente as imagens que possuem pelo menos uma anotação daquela classe.

Classes disponíveis:

- `pessoa`
- `capacete`
- `colete`
- `sem_capacete`

### 11.5. Estatísticas do dataset

A aplicação deve apresentar:

- Total de imagens.
- Total de anotações.
- Quantidade de anotações por classe.
- Média de anotações por imagem.

Os valores devem corresponder aos dados carregados.

### 11.6. Tratamento de erros

A aplicação deve apresentar mensagens amigáveis quando:

- O JSON for inválido.
- O arquivo não puder ser carregado.
- Ocorrer algum problema durante a leitura dos dados.

O usuário deve receber uma indicação clara de que houve um problema, sem exposição desnecessária de detalhes técnicos.

## 12. Requisitos de execução

A aplicação deve permitir instalação e execução seguindo os comandos:

```bash
npm install
npm start
```

As instruções necessárias devem estar documentadas no README.

## 13. Entregáveis da Parte 2

- Código-fonte completo da aplicação Angular.
- Componentes necessários para as funcionalidades obrigatórias.
- Implementação do carregamento do COCO JSON.
- Galeria de imagens.
- Visualizador de bounding boxes.
- Filtro por classe.
- Estatísticas do dataset.
- Tratamento de erros.
- Instruções de instalação e execução.

---

# 14. Estrutura esperada do repositório

A estrutura de entrega indicada pelo teste é:

```text
/
├── dataset/
│   ├── images/
│   ├── annotations_coco.json
│   └── annotations_yolo/
│
├── app/
│
└── README.md
```

O diretório `dataset/` deve concentrar as imagens e suas respectivas anotações.

O diretório `app/` deve conter o projeto Angular.

O README principal deve documentar o projeto e suas instruções de execução.

---

# 15. Documentação obrigatória

O README deve conter:

1. Instruções para executar a aplicação.
2. Critérios utilizados nas anotações.
3. Dificuldades encontradas durante a anotação.
4. Decisões técnicas e suas justificativas.
5. Melhorias futuras.
6. Origens das imagens utilizadas.

A documentação deve refletir o que foi efetivamente desenvolvido.

Não declarar funcionalidades, testes ou resultados que não tenham sido realizados.

---

# 16. Critérios de avaliação

A avaliação será distribuída da seguinte maneira:

| Critério | Peso |
|---|---:|
| Qualidade e consistência das anotações | 25% |
| Funcionalidades obrigatórias implementadas | 25% |
| Organização do código e padrões de escrita | 20% |
| Performance e boas práticas Angular | 20% |
| README e histórico de commits | 10% |
| **Total** | **100%** |

## 17. Diretrizes para qualidade da implementação

O teste destaca a importância de organização, qualidade de código e boas práticas Angular.

Os pontos relevantes incluem:

- Separação de responsabilidades.
- Componentes para apresentação.
- Serviços para dados e lógica.
- Estrutura clara de diretórios.
- Nomes descritivos.
- Componentes pequenos e reutilizáveis.
- Comunicação por inputs e outputs.
- Ausência de lógica de negócio nos templates.
- Utilização de `ChangeDetectionStrategy.OnPush`.
- Utilização de `track` no `@for` ou `trackBy` no `*ngFor`.
- Utilização de `async` pipe ou Signals, evitando subscriptions manuais sem cancelamento.
- Cálculo eficiente das estatísticas, sem métodos de processamento repetidamente chamados pelo template.
- Lazy loading de imagens.
- Prevenção de vazamentos de memória.
- Utilização de Prettier.
- ESLint sem erros.
- Ausência de código morto, `console.log` esquecidos e arquivos gerados desnecessários.

## 18. Histórico de commits

O histórico de commits também faz parte da avaliação.

Manter commits organizados e coerentes com a evolução real do projeto.

O histórico deve permitir compreender as principais etapas de desenvolvimento.

---

# 19. Prioridades de execução

Considerando os requisitos e os pesos da avaliação, a execução deve priorizar:

1. Qualidade e consistência do dataset.
2. Implementação correta das funcionalidades obrigatórias.
3. Organização e qualidade do código Angular.
4. Performance e boas práticas.
5. Documentação e histórico de desenvolvimento.

Não sacrificar a qualidade das anotações ou a confiabilidade da aplicação para implementar funcionalidades adicionais não solicitadas.

## 20. Observação final

Este documento consolida os requisitos técnicos e funcionais descritos no teste original.

Ele deve ser utilizado como referência durante o desenvolvimento, a revisão e a validação da entrega.

Quando houver divergência entre este documento e o PDF original, o PDF original prevalece.

Decisões adicionais de arquitetura, ferramentas, bibliotecas ou funcionalidades devem ser registradas separadamente como decisões técnicas do projeto, sem serem apresentadas como exigências originais do teste.
