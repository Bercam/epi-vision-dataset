# Guia de Desenvolvimento — Teste Técnico de Anotação de Dados + Angular

## 1. Objetivo

Desenvolver uma solução completa para o teste técnico de Estágio — Anotação de Dados + Angular, respeitando integralmente os requisitos do documento original.

O projeto possui duas entregas principais:

1. Dataset de imagens com anotações de equipamentos de proteção individual (EPIs), exportado nos formatos COCO e YOLO.
2. Aplicação Angular para exploração, visualização, filtragem e análise estatística do dataset.

O desenvolvimento deve priorizar:

- Correção dos dados.
- Consistência das anotações.
- Arquitetura organizada.
- Código tipado e desacoplado.
- Testes automatizados.
- Performance e boas práticas Angular.
- Documentação completa e rastreabilidade das decisões.

## 2. Documentos de referência

Antes de iniciar qualquer implementação, consulte:

- Documento original do teste técnico.
- `docs/criterios-de-anotacao.md`: regras de anotação definidas pelo responsável pelo dataset.
- `dataset/sources/image_sources.csv`: procedência individual das imagens.
- `docs/decisoes-tecnicas.md`: decisões arquiteturais e técnicas.
- Este guia: sequência de execução e critérios de qualidade.

O documento original do teste técnico é a fonte de verdade para os requisitos obrigatórios.

Não substitua requisitos explícitos por interpretações próprias.

Quando encontrar uma ambiguidade:
1. Identifique o requisito relacionado.
2. Apresente a interpretação proposta.
3. Registre a decisão em `docs/decisoes-tecnicas.md` ou `docs/criterios-de-anotacao.md`, conforme o assunto.
4. Aguarde aprovação humana quando a decisão puder alterar significativamente os dados ou o escopo.

## 3. Divisão de responsabilidades

### 3.1. Responsabilidades humanas

O responsável pelo projeto deve:

- Selecionar e aprovar as imagens utilizadas.
- Verificar a procedência e as condições de utilização das imagens.
- Manter o registro de fontes atualizado.
- Definir e aprovar os critérios de anotação.
- Realizar ou revisar manualmente as anotações.
- Aprovar o resultado final do dataset.
- Aprovar decisões que alterem requisitos ou escopo.

O agente pode auxiliar essas atividades, mas não deve considerar informações não verificadas como aprovadas.

### 3.2. Responsabilidades do agente

O agente deve:

- Preparar a estrutura do projeto.
- Desenvolver validadores e ferramentas de processamento.
- Implementar conversões entre COCO e YOLO.
- Implementar a aplicação Angular.
- Criar testes automatizados.
- Executar verificações de qualidade.
- Documentar decisões e limitações.
- Revisar continuamente a conformidade com os critérios de avaliação.

Não invente fontes, licenças, anotações, resultados de testes ou funcionalidades concluídas.

## 4. Requisitos obrigatórios

### 4.1. Dataset

- Mínimo de 30 imagens.
- Imagens relacionadas a obras, indústrias ou ambientes similares.
- Procedência identificável para cada imagem.
- Quatro classes obrigatórias:
  - `pessoa`
  - `capacete`
  - `colete`
  - `sem_capacete`
- Exportação COCO JSON.
- Exportação YOLO.
- README documentando critérios, dificuldades e ambiguidades.

### 4.2. Aplicação Angular

- Angular 17 ou superior.
- Componentes standalone.
- TypeScript fortemente tipado.
- Carregamento de COCO JSON por assets ou upload.
- Galeria de imagens com miniaturas, nomes e quantidades de anotações.
- Visualizador com bounding boxes sobrepostas.
- Cores distintas por classe.
- Filtro por classe.
- Estatísticas gerais do dataset.
- Tratamento amigável de erros de carregamento e JSON inválido.
- Execução com `npm install` e `npm start`.

## 5. Sequência obrigatória de desenvolvimento

O desenvolvimento deve acontecer por etapas pequenas e verificáveis.

Não implementar todas as funcionalidades de uma só vez.

### Fase 0 — Inspeção e planejamento

Objetivo: compreender o estado atual do repositório e preparar a execução.

Tarefas:
- Inspecionar os arquivos existentes.
- Consultar o documento original.
- Verificar a estrutura do projeto.
- Identificar arquivos já preparados pelo responsável.
- Definir a fonte oficial do dataset.
- Criar um plano de implementação.

Critério de conclusão:
- Estrutura e responsabilidades definidas.
- Nenhum requisito obrigatório ignorado.
- Nenhuma implementação iniciada com dependências ainda indefinidas.

### Fase 1 — Preparação do dataset

Objetivo: garantir que os dados de entrada estejam organizados.

Tarefas:
- Verificar existência de pelo menos 30 imagens.
- Validar formatos e integridade dos arquivos.
- Verificar nomes únicos.
- Identificar duplicatas.
- Conferir o registro de procedência.
- Identificar dimensões das imagens.
- Gerar relatório de inconsistências.

Não alterar ou remover imagens sem autorização humana.

Critério de conclusão:
- Dataset organizado.
- Fontes rastreáveis.
- Problemas identificados e documentados.

### Fase 2 — Anotações e validação dos dados

Objetivo: garantir consistência e integridade das anotações.

As anotações devem respeitar os critérios aprovados em `docs/criterios-de-anotacao.md`.

Implementar validações para:

- IDs únicos.
- Referências válidas entre imagens, categorias e anotações.
- Classes permitidas.
- Bounding boxes com largura e altura positivas.
- Bounding boxes dentro dos limites das imagens.
- Área coerente com as dimensões da bounding box.
- Ausência de referências para imagens inexistentes.
- Ausência de arquivos de imagem não contabilizados no dataset.

Para COCO, respeitar a estrutura:

- `images`
- `annotations`
- `categories`

Para YOLO:
- Gerar um arquivo de anotação por imagem.
- Utilizar IDs de classe zero-based.
- Normalizar coordenadas.
- Garantir correspondência entre as classes COCO e YOLO.

Conversão COCO para YOLO:

- `xc = (x + width / 2) / imageWidth`
- `yc = (y + height / 2) / imageHeight`
- `normalizedWidth = width / imageWidth`
- `normalizedHeight = height / imageHeight`

Não considerar a conversão correta apenas porque o arquivo foi gerado. Comparar os dados convertidos e validar sua equivalência.

Critério de conclusão:
- COCO válido.
- YOLO válido.
- Mapeamento de classes consistente.
- Nenhuma inconsistência não documentada.

### Fase 3 — Arquitetura Angular

Objetivo: estabelecer uma base sustentável antes de implementar as funcionalidades.

Organização sugerida:

`core/`
- models
- services
- validators
- utils

`shared/`
- components
- pipes

`features/dataset/`
- components
- pages
- services

Separar responsabilidades:

- Componentes: apresentação e interação.
- Serviços: carregamento, processamento e regras de dados.
- Models: contratos TypeScript.
- Validators: validação de estruturas externas.
- Utils: funções puras reutilizáveis.

Criar interfaces para:

- CocoDataset
- CocoImage
- CocoAnnotation
- CocoCategory

Dados externos devem entrar como `unknown` e passar por validação em runtime antes de serem utilizados.

Evitar `any`.

Critério de conclusão:
- Arquitetura compilando.
- Modelos tipados.
- Responsabilidades separadas.
- Testes iniciais implementados.

### Fase 4 — Implementação funcional

Desenvolver na seguinte ordem:

1. Carregamento do COCO JSON.
2. Validação do conteúdo.
3. Resolução dos caminhos das imagens.
4. Galeria.
5. Seleção de imagem.
6. Visualizador de bounding boxes.
7. Filtro por classe.
8. Estatísticas.
9. Tratamento de estados de erro e carregamento.

O visualizador deve preservar a proporção entre imagem e bounding boxes.

Preferir SVG sobreposto à imagem, utilizando um `viewBox` compatível com as dimensões originais.

A aplicação deve tratar adequadamente:
- JSON inválido.
- Categorias desconhecidas.
- Imagens ausentes.
- Anotações sem imagem correspondente.
- Dataset vazio.
- Falhas de carregamento.

Importante: um JSON COCO não garante que os arquivos de imagem estejam disponíveis. Implementar uma estratégia clara de resolução de imagens e documentar as limitações do upload de JSON isolado.

### Fase 5 — Performance e qualidade Angular

Aplicar:

- `ChangeDetectionStrategy.OnPush`.
- Signals para estado local quando adequado.
- `computed` para valores derivados.
- `@for` com `track`.
- `@if` para renderização condicional.
- `async` pipe ou gerenciamento seguro de subscriptions.
- `takeUntilDestroyed` quando necessário.
- Lazy loading de imagens.
- Componentes pequenos e reutilizáveis.
- Funções puras para cálculos e transformações.

Não executar cálculos estatísticos diretamente em métodos chamados repetidamente pelos templates.

As estatísticas devem ser derivadas de forma eficiente e evitar processamento redundante.

### Fase 6 — Testes automatizados

Toda funcionalidade relevante deve possuir testes.

Cobrir:

**Dataset**
- JSON válido.
- JSON inválido.
- IDs duplicados.
- Categoria inexistente.
- Referências inválidas.
- Bounding boxes fora dos limites.
- Conversão COCO para YOLO.
- Arquivos ausentes.

**Aplicação**
- Carregamento de dataset.
- Galeria.
- Seleção de imagem.
- Renderização das caixas.
- Filtro por classe.
- Estatísticas.
- Estados vazios.
- Tratamento de erros.

Executar testes após cada etapa, e não somente ao final.

Quando uma alteração quebrar um teste, corrigir antes de avançar.

### Fase 7 — Revisão e entrega

Executar:

- Testes unitários.
- Testes de integração.
- Testes E2E, quando implementados.
- ESLint.
- Prettier.
- Build de produção.
- Verificação de erros no console.
- Verificação de arquivos desnecessários.
- Conferência da estrutura final.
- Conferência das instruções de execução.

O README principal deve explicar:
- Objetivo do projeto.
- Estrutura.
- Tecnologias.
- Como executar.
- Como executar os testes.
- Critérios de anotação.
- Origem das imagens.
- Decisões técnicas.
- Dificuldades encontradas.
- Melhorias futuras.

## 6. Regras obrigatórias de implementação

1. Não desenvolver funcionalidades não solicitadas antes de concluir os requisitos obrigatórios.
2. Não implementar várias fases simultaneamente.
3. Não avançar com testes falhando.
4. Não ignorar erros de compilação, lint ou build.
5. Não introduzir dependências sem justificativa.
6. Não duplicar fontes oficiais de dados sem uma estratégia de sincronização.
7. Não utilizar tipos genéricos ou `any` para contornar problemas de tipagem.
8. Não adicionar lógica de negócio aos templates.
9. Não deixar `console.log`, código morto ou arquivos temporários.
10. Não declarar uma etapa concluída sem evidências de validação.
11. Não alterar critérios de anotação sem registrar e aprovar a decisão.
12. Preservar os arquivos originais do dataset.

## 7. Estratégia de trabalho do agente

Para cada etapa:

1. Inspecionar o contexto e os arquivos relacionados.
2. Apresentar o objetivo da etapa.
3. Identificar dependências e riscos.
4. Propor a implementação.
5. Implementar apenas o escopo aprovado.
6. Executar testes e verificações.
7. Corrigir falhas.
8. Apresentar os arquivos alterados.
9. Apresentar os resultados dos testes.
10. Informar pendências e solicitar autorização para avançar.

O agente deve trabalhar incrementalmente e manter o responsável informado.

Não presumir autorização para avançar quando existirem decisões pendentes.

## 8. Critérios de avaliação

| Critério | Peso |
|---|---:|
| Qualidade e consistência das anotações | 25% |
| Funcionalidades obrigatórias | 25% |
| Organização do código e padrões de escrita | 20% |
| Performance e boas práticas Angular | 20% |
| README e histórico de commits | 10% |

Priorizar os requisitos com maior impacto na avaliação, sem negligenciar os demais.

## 9. Padrão de commits

Utilizar commits pequenos, objetivos e relacionados a uma única entrega.

Exemplos:

- `chore: initialize Angular project structure`
- `feat: implement COCO dataset loader`
- `feat: add image gallery`
- `feat: render annotation bounding boxes`
- `feat: implement class filtering`
- `test: add dataset validation tests`
- `docs: document annotation criteria`

Não criar commits artificiais para simular histórico de desenvolvimento.

## 10. Definition of Done

Uma etapa só pode ser considerada concluída quando:

- [ ] Todos os requisitos da etapa foram atendidos.
- [ ] Os testes relacionados passaram.
- [ ] O código está tipado e organizado.
- [ ] Não existem erros de lint.
- [ ] A implementação foi revisada.
- [ ] As decisões relevantes foram documentadas.
- [ ] As limitações conhecidas foram registradas.
- [ ] O responsável foi informado do resultado.

**Princípio central:** desenvolver uma solução correta, testável e rastreável. A prioridade não é produzir a maior quantidade de código, mas entregar uma implementação confiável, que cumpra integralmente os critérios de avaliação.
