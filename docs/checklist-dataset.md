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

- [x] JSON pode ser interpretado.
- [x] Existem as listas `images`, `annotations` e `categories`.
- [x] IDs de imagens são únicos.
- [x] IDs de anotações são únicos.
- [x] IDs de categorias são únicos.
- [x] Toda anotação referencia uma imagem existente.
- [x] Toda anotação referencia uma categoria existente.
- [x] `bbox` possui quatro números.
- [x] Largura e altura da caixa são positivas.
- [x] Caixas estão dentro dos limites da imagem.
- [x] Área é coerente com a caixa.
- [x] Arquivos referenciados existem.

## 5. Validação YOLO

- [x] Mapeamento de classes documentado.
- [x] IDs de classe são zero-based.
- [x] Coordenadas estão normalizadas.
- [x] Valores estão dentro do intervalo esperado.
- [x] Cada imagem possui arquivo de anotação correspondente; as 31 imagens têm anotações.
- [x] Conversão foi comparada com as anotações COCO originais.

## 6. Revisão final

- [x] Quantidade mínima de imagens atingida (31 imagens únicas; seleção confirmada pelo responsável).
- [x] Todas as fontes registradas no catálogo (metadados e direitos de terceiros ainda requerem revisão).
- [x] Todas as classes obrigatórias presentes no esquema.
- [x] Anotações revisadas visualmente pelo responsável; uma correção estrutural foi incorporada.
- [x] Ambiguidades e limitações documentadas em `relatorio-revisao-visual-anotacoes.md`.
- [x] COCO e YOLO validados estruturalmente e comparados.
- [ ] Aprovação humana final registrada (`annotation_status=approved`).
- [ ] Nenhum arquivo temporário ou duplicado desnecessário.
