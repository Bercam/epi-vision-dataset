# Registro de Decisões Técnicas

## 1. Objetivo

Registrar decisões de arquitetura, implementação, organização e tratamento de dados que não estejam totalmente determinadas pelo documento original do teste.

Este arquivo deve evoluir junto com o projeto. Não apagar decisões relevantes sem registrar a alteração.

## 2. Como registrar uma decisão

Para cada decisão, preencher:

- **ID:** identificador sequencial, por exemplo `ADR-001`.
- **Status:** proposta, aprovada, rejeitada ou substituída.
- **Contexto:** problema ou necessidade.
- **Decisão:** solução escolhida.
- **Alternativas:** opções consideradas, quando relevante.
- **Consequências:** impactos, limitações e benefícios.
- **Responsável e data:** quem aprovou e quando.

## 3. Decisões iniciais propostas

As propostas abaixo são recomendações de organização do projeto, não exigências literais do teste. Devem ser confirmadas pelo responsável.

### ADR-001 — Separação entre dataset e aplicação

- **Status:** Proposta
- **Contexto:** O dataset e a aplicação possuem ciclos de validação diferentes.
- **Decisão proposta:** Manter os arquivos do dataset fora do código-fonte da aplicação, com uma estratégia explícita para disponibilizar os arquivos necessários em runtime.
- **Consequências:** Facilita validar e revisar os dados independentemente da aplicação. É necessário evitar cópias divergentes do dataset.

### ADR-002 — Fonte oficial das imagens

- **Status:** Proposta
- **Contexto:** A aplicação precisa localizar imagens referenciadas pelo COCO JSON.
- **Decisão proposta:** Manter `dataset/images/` como fonte oficial dos arquivos originais. Se a aplicação exigir cópia em `app/src/assets/`, documentar um processo de sincronização.
- **Consequências:** Evita divergência entre dataset entregue e imagens exibidas na aplicação.

### ADR-003 — Carregamento e validação do COCO JSON

- **Status:** Proposta
- **Contexto:** O JSON é uma entrada externa e pode estar inválido ou incompleto.
- **Decisão proposta:** Receber o conteúdo inicialmente como `unknown`, validar estrutura e referências em runtime e só então convertê-lo para os modelos internos.
- **Consequências:** Reduz risco de erros em tempo de execução e evita depender apenas de interfaces TypeScript.

### ADR-004 — Visualização das bounding boxes

- **Status:** Proposta
- **Contexto:** As caixas precisam permanecer alinhadas à imagem em diferentes dimensões de tela.
- **Decisão proposta:** Avaliar SVG sobreposto à imagem, utilizando um `viewBox` baseado nas dimensões originais da imagem.
- **Consequências:** Permite manter as coordenadas COCO no mesmo sistema de referência visual. A implementação deve testar redimensionamento e proporção.

### ADR-005 — Estado e valores derivados no Angular

- **Status:** Proposta
- **Contexto:** A galeria, os filtros e as estatísticas dependem do dataset carregado.
- **Decisão proposta:** Utilizar Signals para estado local e `computed` para valores derivados, quando adequado.
- **Consequências:** Evita cálculos repetidos em templates e facilita rastrear atualizações.

## 4. Decisões pendentes

| ID | Assunto | Pergunta | Status |
|---|---|---|---|
| ADR-006 | Upload | O upload será apenas do JSON ou também das imagens? | Pendente |
| ADR-007 | Imagens | Como será resolvido o caminho de cada imagem no Angular? | Pendente |
| ADR-008 | Testes E2E | Qual ferramenta será adotada, se houver tempo? | Pendente |

## 5. Histórico

| Data | ID | Alteração |
|---|---|---|
| A preencher | — | Criação do documento |
