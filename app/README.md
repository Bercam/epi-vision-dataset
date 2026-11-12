# Explorador de Dataset — ConcertLab

Aplicação Angular standalone para explorar o dataset de EPIs do projeto.

## Executar localmente

Requer Node.js compatível com a versão Angular usada no projeto.

```bash
npm install
npm start
```

Abra `http://localhost:4200/` no navegador. Para gerar a versão de produção:

```bash
npm run build
```

## Estrutura atual

- `src/app/core/models/`: contratos tipados do formato COCO.
- `src/app/core/validators/`: validação estrutural e semântica do JSON.
- `src/app/core/services/`: leitura do JSON, validação e associação das imagens carregadas.
- `src/app/features/dataset/pages/`: estado da página de exploração.
- `src/app/features/dataset/components/`: importação, galeria e pré-visualização.

O dataset oficial fica em `../dataset/`; o COCO atual está em `../dataset/annotations/annotations_coco.json` e as imagens em `../dataset/images/`.

## Usar a galeria

1. Selecione `../dataset/annotations/annotations_coco.json`.
2. Selecione todas as imagens da pasta `../dataset/images/`.
3. A galeria relaciona cada imagem pelo nome do arquivo registrado no COCO; selecione um cartão para abrir a pré-visualização.

A versão atual mostra o resumo do dataset, estatísticas gerais e por classe, filtro por classe, quantidade de anotações por imagem e caixas COCO coloridas na pré-visualização. Quando uma classe é selecionada, a galeria lista imagens que contêm a classe e a pré-visualização mostra apenas as caixas dessa classe; as estatísticas continuam considerando o dataset inteiro.

Se o JSON estiver inválido, a aplicação apresenta uma mensagem de validação. Um COCO totalmente vazio (listas de imagens, anotações e categorias vazias) é aceito e mostra estados vazios claros na galeria e na pré-visualização; erros de leitura de arquivo também são informados na tela.
