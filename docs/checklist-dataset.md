# Checklist de Preparação e Revisão do Dataset

## 1. Antes de coletar imagens

- [ ] Confirmar que a imagem está relacionada a obra, indústria ou ambiente similar.
- [ ] Verificar se a imagem permite observar pessoas e possíveis EPIs.
- [ ] Conferir a origem e as condições de utilização.
- [ ] Evitar imagens repetidas.
- [ ] Priorizar variedade de cenas, distâncias, ângulos e iluminação.

## 2. Para cada imagem coletada

- [ ] Nome de arquivo único.
- [ ] Arquivo abre corretamente.
- [ ] Dimensões registradas.
- [ ] URL de origem registrada.
- [ ] Site de origem registrado.
- [ ] Licença/condições de uso registradas, quando disponíveis.
- [ ] Autor registrado, quando disponível.
- [ ] Observações relevantes registradas.

## 3. Durante a anotação

- [ ] Considerar todas as pessoas visíveis e identificáveis.
- [ ] Anotar `capacete` apenas quando estiver sendo utilizado.
- [ ] Anotar `colete` apenas quando estiver sendo utilizado.
- [ ] Anotar `sem_capacete` na cabeça, não no corpo inteiro.
- [ ] Usar caixas justas e completas.
- [ ] Manter consistência entre imagens.
- [ ] Registrar casos ambíguos.
- [ ] Registrar exclusões relevantes por tamanho ou oclusão.

## 4. Validação COCO

- [ ] JSON pode ser interpretado.
- [ ] Existem as listas `images`, `annotations` e `categories`.
- [ ] IDs de imagens são únicos.
- [ ] IDs de anotações são únicos.
- [ ] IDs de categorias são únicos.
- [ ] Toda anotação referencia uma imagem existente.
- [ ] Toda anotação referencia uma categoria existente.
- [ ] `bbox` possui quatro números.
- [ ] Largura e altura da caixa são positivas.
- [ ] Caixas estão dentro dos limites da imagem.
- [ ] Área é coerente com a caixa.
- [ ] Arquivos referenciados existem.

## 5. Validação YOLO

- [ ] Mapeamento de classes documentado.
- [ ] IDs de classe são zero-based.
- [ ] Coordenadas estão normalizadas.
- [ ] Valores estão dentro do intervalo esperado.
- [ ] Cada imagem possui arquivo de anotação correspondente, inclusive arquivo vazio quando não houver objetos, se essa for a convenção adotada.
- [ ] Conversão foi comparada com as anotações COCO originais.

## 6. Revisão final

- [ ] Quantidade mínima de imagens atingida.
- [ ] Todas as fontes registradas.
- [ ] Todas as classes obrigatórias presentes no esquema.
- [ ] Anotações revisadas visualmente.
- [ ] Ambiguidades e limitações documentadas.
- [ ] COCO e YOLO validados.
- [ ] Nenhum arquivo temporário ou duplicado desnecessário.
