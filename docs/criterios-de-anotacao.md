# Critérios de Anotação — Detecção de EPIs

## 1. Objetivo

Definir critérios consistentes para anotar imagens de pessoas em obras, indústrias e ambientes similares, conforme o teste técnico.

Este documento deve ser tratado como referência operacional durante a anotação. Regras explícitas do teste têm prioridade sobre interpretações locais.

## 2. Classes obrigatórias

| Classe | Definição | Região a delimitar |
|---|---|---|
| `pessoa` | Toda pessoa visível, mesmo parcialmente | Corpo visível da pessoa |
| `capacete` | Capacete de segurança sendo usado | Capacete |
| `colete` | Colete refletivo sendo usado | Colete |
| `sem_capacete` | Cabeça de uma pessoa sem capacete | Cabeça |

**Atenção:** `sem_capacete` representa a cabeça, não a pessoa inteira.

Uma pessoa pode receber mais de uma anotação na mesma imagem. Por exemplo, uma pessoa usando capacete e colete pode ter as anotações `pessoa`, `capacete` e `colete`.

## 3. Regras gerais de anotação

1. Anotar todos os objetos identificáveis das classes exigidas, não apenas os mais evidentes.
2. Delimitar o objeto inteiro e visível com uma bounding box justa.
3. Evitar caixas com excesso de espaço vazio.
4. Não cortar partes visíveis do objeto.
5. Manter o mesmo critério em situações equivalentes.
6. Objetos muito pequenos ou cobertos em mais de 80% podem ser ignorados, conforme o teste. Registrar os casos relevantes no relatório.
7. Não inferir a presença de um EPI quando a imagem não oferece evidência visual suficiente.

## 4. Casos que exigem decisão consistente

O teste não especifica detalhadamente todos os cenários abaixo. Portanto, registre a decisão adotada antes de aplicá-la em todo o dataset.

| Situação | Conduta |
|---|---|
| Pessoa parcialmente visível | Anotar `pessoa` se for identificável; delimitar a região visível conforme o critério adotado |
| Cabeça parcialmente encoberta | Avaliar se é possível identificar a condição com segurança; registrar ambiguidades |
| Boné ou chapéu comum | Não classificar como `capacete` de segurança |
| Capacete próximo da pessoa, mas não utilizado | Não classificar como `capacete` sendo usado |
| Colete refletivo pendurado ou carregado | Não classificar como `colete` sendo usado |
| Pessoa ao fundo | Anotar se os objetos forem identificáveis e não se enquadrarem nos critérios de exclusão por tamanho/oclusão |
| Capacete parcialmente oculto | Anotar se a região identificável permitir uma caixa confiável; registrar ambiguidades |
| Cabeça sem capacete | Usar `sem_capacete` somente quando a ausência de capacete for visualmente verificável |

## 5. Convenções para bounding boxes

- Utilizar o formato COCO: `[x, y, width, height]`.
- `x` e `y` representam o canto superior esquerdo.
- `width` e `height` devem ser positivos.
- A caixa deve permanecer dentro das dimensões da imagem.
- A caixa deve envolver o objeto, sem margens excessivas.
- A caixa de `sem_capacete` deve envolver a cabeça, não o corpo.

## 6. Revisão de qualidade

Antes de aprovar uma imagem, verificar:

- [ ] Todas as pessoas identificáveis foram consideradas.
- [ ] Todas as ocorrências visíveis das classes foram consideradas.
- [ ] As classes correspondem ao que está efetivamente visível.
- [ ] As caixas estão ajustadas aos objetos.
- [ ] Não existem caixas com dimensões inválidas.
- [ ] Não existem anotações duplicadas acidentalmente.
- [ ] Casos ambíguos foram tratados de maneira consistente.
- [ ] Exclusões por tamanho ou oclusão foram registradas quando relevantes.

## 7. Registro de ambiguidades

Manter um registro com:

| Imagem | Situação | Decisão adotada | Justificativa |
|---|---|---|---|
| `image_001.jpg` | Exemplo de ambiguidade | A preencher | A preencher |

Não transformar uma decisão local em requisito original do teste. Identificar claramente o que é regra do teste e o que é convenção adotada no projeto.

## 8. Aprovação

A aprovação final das anotações é responsabilidade humana. Ferramentas automáticas podem apontar inconsistências geométricas e estruturais, mas não substituem a revisão visual.
