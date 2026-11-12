import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, rowsToObjects } from './util/csv.js';
import { sha256Buffer } from './image/hash.js';
import { validateImage } from './image/validateImage.js';

const REQUIRED_FIELDS = [
  'file_name',
  'source_name',
  'source_url',
  'direct_image_url',
  'author',
  'title',
  'license',
  'license_url',
  'width',
  'height',
  'file_size',
  'sha256',
  'download_status',
  'annotation_status',
];

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, '../../../');
const datasetRoot = path.resolve(process.env.DATASET_ROOT || path.join(repositoryRoot, 'dataset'));

function addError(errors, message) {
  errors.push(message);
}

async function main() {
  const errors = [];
  const catalogPath = path.join(datasetRoot, 'sources', 'image_sources.csv');
  const imagesDirectory = path.join(datasetRoot, 'images');
  const cocoPath = path.join(datasetRoot, 'annotations_coco.json');

  let catalog;
  try {
    const rows = parseCsv(await readFile(catalogPath, 'utf8'));
    if (rows.length === 0) {
      throw new Error('CSV vazio.');
    }
    const header = rows[0].map((field) => field.trim());
    const missingColumns = REQUIRED_FIELDS.filter((field) => !header.includes(field));
    if (missingColumns.length > 0) {
      throw new Error(`Colunas obrigatórias ausentes: ${missingColumns.join(', ')}`);
    }
    const malformedRows = rows.slice(1).filter((row) => row.length !== header.length);
    if (malformedRows.length > 0) {
      throw new Error(`${malformedRows.length} linha(s) têm quantidade de colunas diferente do cabeçalho.`);
    }
    catalog = rowsToObjects(rows);
  } catch (error) {
    console.error(`Não foi possível ler o catálogo ${catalogPath}: ${error.message}`);
    return 1;
  }

  const records = catalog.records;
  const names = new Set();
  for (const [index, record] of records.entries()) {
    const rowNumber = index + 2;
    for (const field of REQUIRED_FIELDS) {
      if (!String(record[field] ?? '').trim()) {
        addError(errors, `CSV linha ${rowNumber}: campo obrigatório vazio (${field}).`);
      }
    }
    if (record.file_name && path.basename(record.file_name) !== record.file_name) {
      addError(errors, `CSV linha ${rowNumber}: file_name deve conter apenas o nome do arquivo.`);
    }
    if (names.has(record.file_name)) {
      addError(errors, `CSV linha ${rowNumber}: arquivo duplicado (${record.file_name}).`);
    }
    names.add(record.file_name);
  }

  let directoryNames = [];
  try {
    directoryNames = (await readdir(imagesDirectory, { withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  } catch (error) {
    addError(errors, `Não foi possível listar ${imagesDirectory}: ${error.message}`);
  }
  const diskNames = new Set(directoryNames);
  for (const name of names) {
    if (!diskNames.has(name)) {
      addError(errors, `Imagem do catálogo ausente em images/: ${name}.`);
    }
  }
  for (const name of diskNames) {
    if (!names.has(name)) {
      addError(errors, `Imagem sem registro no catálogo: ${name}.`);
    }
  }

  const dimensionsByName = new Map();
  let cocoImageCount = 0;
  for (const record of records) {
    if (!record.file_name || !diskNames.has(record.file_name)) {
      continue;
    }
    try {
      const imagePath = path.join(imagesDirectory, record.file_name);
      const buffer = await readFile(imagePath);
      const image = validateImage(buffer);
      const imageStats = await stat(imagePath);
      dimensionsByName.set(record.file_name, { width: image.width, height: image.height });

      if (Number(record.width) !== image.width || Number(record.height) !== image.height) {
        addError(errors, `${record.file_name}: dimensões do catálogo divergem do arquivo (${image.width}x${image.height}).`);
      }
      if (Number(record.file_size) !== imageStats.size) {
        addError(errors, `${record.file_name}: file_size do catálogo diverge do arquivo (${imageStats.size}).`);
      }
      if (record.sha256.toLowerCase() !== sha256Buffer(buffer)) {
        addError(errors, `${record.file_name}: SHA-256 do catálogo diverge do arquivo.`);
      }
    } catch (error) {
      addError(errors, `${record.file_name}: imagem não pôde ser validada (${error.message}).`);
    }
  }

  try {
    const coco = JSON.parse(await readFile(cocoPath, 'utf8'));
    const cocoImages = new Map((coco.images || []).map((image) => [image.file_name, image]));
    cocoImageCount = cocoImages.size;
    for (const record of records) {
      const image = cocoImages.get(record.file_name);
      const dimensions = dimensionsByName.get(record.file_name);
      if (!image) {
        addError(errors, `Imagem do catálogo ausente no COCO: ${record.file_name}.`);
      } else if (dimensions && (image.width !== dimensions.width || image.height !== dimensions.height)) {
        addError(errors, `${record.file_name}: dimensões do COCO divergem do arquivo.`);
      }
    }
    for (const name of cocoImages.keys()) {
      if (!names.has(name)) {
        addError(errors, `Imagem do COCO sem registro no catálogo: ${name}.`);
      }
    }
  } catch (error) {
    addError(errors, `Não foi possível ler/comparar o COCO ${cocoPath}: ${error.message}`);
  }

  const datesMissing = records.filter((record) => !record.download_date?.trim()).length;
  const statuses = Object.entries(
    records.reduce((counts, record) => {
      const status = record.annotation_status || '(vazio)';
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {}),
  );

  console.log(`Registros no catálogo: ${records.length}`);
  console.log(`Imagens no diretório: ${diskNames.size}`);
  console.log(`Registros de imagem no COCO: ${cocoImageCount}`);
  console.log(`Datas de download vazias: ${datesMissing} (informativo; não são inferidas).`);
  console.log(`Status de anotação: ${statuses.map(([status, count]) => `${status}=${count}`).join(', ') || 'nenhum'}`);
  console.log('Esta validação verifica estrutura e integridade; não aprova fontes, licenças, direitos de terceiros nem anotações.');

  if (errors.length > 0) {
    console.error(`FALHA: ${errors.length} inconsistência(s):`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    return 1;
  }

  console.log('OK: catálogo, arquivos de imagem e referências COCO correspondem.');
  return 0;
}

main().then((exitCode) => {
  process.exitCode = exitCode;
});
