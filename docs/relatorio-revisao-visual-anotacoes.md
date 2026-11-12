# Relatório de revisão visual das anotações

## Estado

**Em revisão humana — não aprovado.** Esta inspeção é uma triagem visual e geométrica; não substitui a validação do responsável pelas anotações.

## Escopo e método

- Foram comparadas as 31 imagens anotadas nas quatro folhas de contato com a legenda das classes e as caixas COCO.
- Foram ampliados recortes das imagens 2, 10 e 16 para conferir caixas pequenas e a classe `sem_capacete`.
- A conferência estrutural anterior encontrou correspondência entre 261 caixas COCO e YOLO, mas isso não prova que os rótulos estejam semanticamente corretos.
- Regras de referência: `docs/criterios-de-anotacao.md` e os critérios do teste técnico. `sem_capacete` deve delimitar a cabeça; `capacete` significa capacete de segurança em uso; objetos pequenos/ocluídos podem ser omitidos; pessoas identificáveis devem ser consideradas.

## Casos para decisão/revisão humana

| Prioridade | Imagem | Achado observado | Revisão sugerida |
|---|---|---|---|
| Alta | `pexels-felix-schickel-2151168240-36840576.jpg` (imagem COCO 16, anotação 151) | A caixa `sem_capacete` é 882 × 647 px e cobre grande parte da cabeça e áreas próximas. O trabalhador usa chapéu/boné de tecido; a regra não classifica esse item como capacete de segurança. | Confirmar que a classe é `sem_capacete` e ajustar a caixa para a cabeça inteira visível, se aprovada. |
| Média | `angel-arcalle-Gz0gfUcCYsU-unsplash.jpg` (imagem COCO 3) | A folha mostra principalmente um edifício e uma pessoa minúscula/silhueta no topo. | Abrir em tamanho original e confirmar se a pessoa é identificável e se a cena atende ao requisito de pessoas em obra/ambiente similar. Se não, reconsiderar a imagem e suas anotações. |
| Média | `mihaly-koles-Q-fhedM5m14-unsplash.jpg` (imagem COCO 11) | Pessoa pequena em parede de escalada/estrutura; a identificação de EPIs pode ser difícil. | Confirmar se a pessoa e o capacete são visualmente identificáveis com confiança; registrar eventual exclusão por tamanho/oclusão. |
| Média | `emmanuel-ikwuegbu-KHO_jvns5Xc-unsplash.jpg` (imagem COCO 5) | Cena interna, pessoa segurando um capacete; a adequação ao contexto de obra e a interpretação de `sem_capacete` merecem conferência. | Confirmar que a cabeça está visível sem capacete e que o capacete não está sendo usado; conferir caixa da pessoa e da cabeça. |
| Baixa | `mark-potterton-sNVkn3507Oo-unsplash.jpg` (imagem COCO 10) | Capacetes de trabalhadores ao fundo têm caixas pequenas, mas parecem distinguíveis na folha e no recorte ampliado. | Conferir se as caixas abrangem cada capacete inteiro e se a pessoa correspondente foi anotada segundo o limite mínimo de visibilidade adotado. |
| Baixa | `pexels-rookey-pain-2688457-14053428.jpg` (imagem COCO 26) | A imagem contém marca/logotipo visível em equipamento/roupa. Isso não invalida por si só as caixas, mas é pendência de direitos de terceiros no catálogo de fontes. | Revisar marca/logotipo para a conformidade de uso, separadamente da qualidade das anotações. |

## Resultado da triagem

- **Estrutural:** 261 caixas correspondem entre COCO e YOLO; as referências e limites já foram conferidos na validação registrada em `dataset/README.md`.
- **Visual:** não há base suficiente para declarar as 31 imagens aprovadas. Há 1 caso de caixa claramente grande para a classe de cabeça e pelo menos 3 imagens que exigem decisão sobre adequação/identificabilidade.
- **Alterações nos rótulos:** nenhuma realizada nesta revisão. Os arquivos originais COCO, YOLO e MakeSense foram preservados.
- **Nota de consistência:** a imagem 16 também contém outros trabalhadores ao fundo. Conferir se os critérios locais de tamanho/oclusão foram aplicados de maneira consistente; objetos minúsculos não devem ser incluídos automaticamente.

## Próxima ação

Revisar as imagens listadas em tamanho original e aplicar as decisões aprovadas no export do MakeSense/COCO; depois regenerar YOLO e repetir a comparação estrutural. Até lá, manter `annotation_status=in_review`.
