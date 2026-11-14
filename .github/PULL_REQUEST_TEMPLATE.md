# Pull Request

## Resumo

<!-- Descreva o que muda e por quê, em 2 a 4 frases. -->

## Tipo de mudança

- [ ] `feat` — funcionalidade nova
- [ ] `fix` — correção de comportamento
- [ ] `data` — imagens, metadados ou anotações
- [ ] `docs` — documentação
- [ ] `refactor` — refatoração sem mudança de comportamento
- [ ] `test` — testes
- [ ] `chore` — configuração, dependências ou manutenção
- [ ] **Breaking change** (descreva abaixo)

## Issue relacionada

<!-- Ex.: Closes #12. Deixe em branco se não houver. -->

## Como foi testado

Descreva os comandos executados e o resultado real. Não marque o que não foi executado.

| Verificação | Comando | Resultado |
| ----------- | ------- | --------- |
| Testes da aplicação | `cd app && npm test` | |
| Lint | `cd app && npm run lint` | |
| Formatação | `cd app && npx prettier --check "src/**/*.{ts,html,scss}"` | |
| Build | `cd app && npm run build` | |
| Testes da ferramenta | `cd tools/image-collector && npm test` | |
| Catálogo de fontes | `cd tools/image-collector && npm run validate:manifest` | |
| Par MakeSense | `python tools/dataset/validate_makesense_export.py --csv … --zip …` | |

## Checklist

- [ ] A mudança tem um objetivo único e um commit coeso.
- [ ] Nenhum dado, licença, URL ou resultado de teste foi inventado.
- [ ] Alterações de anotação passaram pelo pipeline CSV/ZIP → validador → importador; COCO/YOLO não foram editados à mão.
- [ ] Testes automatizados não escrevem no dataset real.
- [ ] Documentação afetada foi atualizada (`README.md`, `docs/`, `dataset/README.md`, `app/README.md`).
- [ ] `CHANGELOG.md` foi atualizado quando a mudança é visível ao usuário.
- [ ] Novas dependências foram verificadas quanto a licença, manutenção e segurança.
- [ ] O que não foi testado está declarado explicitamente.

## Evidências visuais

<!-- Para mudanças de UI, anexe capturas de tela em desktop e mobile. -->

## Riscos e limitações

<!-- O que pode quebrar, o que ficou pendente e o que precisa de revisão humana. -->

## Breaking changes

<!-- Descreva impacto e migração, ou escreva "Nenhuma". -->
