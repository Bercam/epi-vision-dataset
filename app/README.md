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
- `src/app/core/services/`: leitura do JSON enviado e validação antes do uso.
- `src/app/features/dataset/`: próxima etapa, com galeria e visualização.

O dataset oficial fica em `../dataset/`; o COCO atual está em `../dataset/annotations/annotations_coco.json` e as imagens em `../dataset/images/`.

## Etapas

A base Angular e a arquitetura inicial estão prontas. A etapa seguinte implementará o carregamento interativo do dataset, a resolução das imagens, a galeria, os filtros, as estatísticas e a sobreposição das caixas.
