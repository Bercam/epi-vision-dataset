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

## Etapas

## Usar a galeria

1. Selecione `../dataset/annotations/annotations_coco.json`.
2. Selecione todas as imagens da pasta `../dataset/images/`.
3. A galeria relaciona cada imagem pelo nome do arquivo registrado no COCO; selecione um cartão para abrir a pré-visualização.

A versão atual mostra a quantidade de anotações por imagem, o resumo do dataset e as caixas COCO coloridas na pré-visualização. Filtros por classe e estatísticas detalhadas entram nas próximas etapas.
