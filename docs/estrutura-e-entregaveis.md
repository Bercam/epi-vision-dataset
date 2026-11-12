# Estrutura do Projeto e Entregáveis

## 1. Estrutura sugerida

```text
teste-tecnico/
├── dataset/
│   ├── images/
│   ├── sources/
│   │   └── image_sources.csv
│   ├── annotations_coco.json
│   ├── annotations_yolo/
│   └── annotations/
│       └── makesense_source/
│   └── README.md
├── app/
├── docs/
│   ├── guia-de-desenvolvimento.md
│   ├── criterios-de-anotacao.md
│   ├── decisoes-tecnicas.md
│   └── estrutura-e-entregaveis.md
└── README.md
```

A estrutura é uma sugestão organizacional. A entrega final deve respeitar a estrutura exigida no documento original do teste:

```text
/
├── dataset/
│   ├── images/
│   ├── annotations_coco.json
│   └── annotations_yolo/
├── app/
└── README.md
```

Se os arquivos forem organizados em subdiretórios adicionais, garantir que os caminhos e a documentação continuem claros e que todos os entregáveis obrigatórios estejam presentes.

## 2. Entregáveis do dataset

- Pelo menos 30 imagens.
- Registro da origem de cada imagem.
- COCO JSON.
- Anotações YOLO.
- Documentação dos critérios de anotação.
- Registro de dificuldades, ambiguidades e oclusões.

## 3. Entregáveis da aplicação

- Projeto Angular standalone, versão 17 ou superior.
- Carregamento do COCO JSON por assets ou upload.
- Galeria com miniaturas, nome e quantidade de anotações.
- Visualizador com bounding boxes coloridas por classe.
- Filtro por classe.
- Estatísticas do dataset.
- Mensagens amigáveis para erros e estados vazios.
- Instruções para instalar e executar com `npm install` e `npm start`.

## 4. Estrutura Angular sugerida

```text
app/src/app/
├── core/
│   ├── models/
│   ├── services/
│   ├── validators/
│   └── utils/
├── shared/
│   ├── components/
│   └── pipes/
└── features/
    └── dataset/
        ├── components/
        ├── pages/
        └── services/
```

## 5. Componentes candidatos

- `DatasetPage`
- `DatasetHeader`
- `DatasetGallery`
- `DatasetCard`
- `AnnotationViewer`
- `AnnotationOverlay`
- `ClassFilter`
- `DatasetStatistics`
- `DatasetEmptyState`

A quantidade e divisão final devem seguir a complexidade real. Evitar criar componentes sem responsabilidade clara.

## 6. Serviços candidatos

- `DatasetLoaderService`: leitura do JSON e resolução de arquivos.
- `DatasetService`: acesso e consulta ao dataset carregado.
- `DatasetValidatorService`: validação estrutural e semântica.
- `AnnotationService`: consultas e agrupamentos de anotações.

## 7. Contratos TypeScript iniciais

```typescript
export interface CocoDataset {
  images: CocoImage[];
  annotations: CocoAnnotation[];
  categories: CocoCategory[];
}

export interface CocoImage {
  id: number;
  file_name: string;
  width: number;
  height: number;
}

export interface CocoAnnotation {
  id: number;
  image_id: number;
  category_id: number;
  bbox: [number, number, number, number];
  area: number;
  iscrowd: number;
}

export interface CocoCategory {
  id: number;
  name: string;
  supercategory: string;
}
```

Essas interfaces são um ponto de partida. Conferir o formato efetivamente exportado pela ferramenta e validar os dados em runtime.

## 8. Rastreabilidade dos requisitos

| Requisito | Evidência esperada |
|---|---|
| 30+ imagens | Contagem e arquivos em `dataset/images/` |
| Fontes identificadas | `image_sources.csv` preenchido |
| Classes exigidas | Categorias no COCO e mapeamento YOLO |
| COCO válido | Validador e arquivo exportado |
| YOLO válido | Arquivos por imagem e mapeamento documentado |
| Galeria | Componente funcional e teste |
| Bounding boxes | Visualizador e teste de alinhamento |
| Filtro por classe | Interação funcional e teste |
| Estatísticas | Indicadores e testes de cálculo |
| Tratamento de erro | Estados de erro testados |
| Execução | README com comandos testados |
