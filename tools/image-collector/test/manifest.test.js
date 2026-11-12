import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { sha256Buffer } from "../src/image/hash.js";
import { REQUIRED_COLUMNS } from "../src/services/catalog.js";
import { stringifyCsv } from "../src/util/csv.js";
import { makeJpeg, makeTempDir, removeTempDir } from "./helpers/fixtures.js";

const validatorPath = fileURLToPath(
  new URL("../src/validateManifest.js", import.meta.url),
);

function sampleRecord(
  image,
  { sha256 = sha256Buffer(image), author = "Author" } = {},
) {
  return {
    file_name: "sample.jpg",
    source_name: "Pexels",
    source_url: "https://example.com/photo",
    direct_image_url: "https://example.com/photo.jpg",
    author,
    title: "Construction photo",
    license: "Pexels License",
    license_url: "https://www.pexels.com/license/",
    width: "8",
    height: "6",
    file_size: String(image.length),
    sha256,
    download_date: "",
    download_status: "downloaded",
    annotation_status: "in_review",
    notes: "",
    author_url: "https://example.com/author",
  };
}

async function createDataset(
  t,
  record,
  { fileName = "sample.jpg", cocoImages } = {},
) {
  const root = await makeTempDir("manifest-validation-test-");
  t.after(() => removeTempDir(root));
  await mkdir(path.join(root, "images"), { recursive: true });
  const image = makeJpeg(8, 6);
  const imagePath = path.join(root, "images", fileName);
  await writeFile(imagePath, image);
  const row = record(image);
  row.file_name = fileName;
  const csv = stringifyCsv(REQUIRED_COLUMNS, [row]);
  const csvPath = path.join(root, "sources", "image_sources.csv");
  await mkdir(path.dirname(csvPath), { recursive: true });
  await writeFile(csvPath, csv, "utf8");
  const coco = {
    images: cocoImages || [{ id: 1, file_name: fileName, width: 8, height: 6 }],
  };
  const cocoPath = path.join(root, "annotations_coco.json");
  await writeFile(cocoPath, `${JSON.stringify(coco)}\n`, "utf8");
  return { root, imagePath, csvPath, image, csv };
}

function runValidator(datasetRoot) {
  return spawnSync(process.execPath, [validatorPath], {
    encoding: "utf8",
    env: { ...process.env, DATASET_ROOT: datasetRoot },
  });
}

test("manifest validator accepts matching provenance without changing files or review status", async (t) => {
  const data = await createDataset(t, sampleRecord);
  const result = runValidator(data.root);

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /OK: catálogo, arquivos de imagem e referências COCO correspondem/,
  );
  assert.match(result.stdout, /Status de anotação: in_review=1/);
  assert.match(result.stdout, /Datas de download vazias: 1/);
  assert.deepEqual(await readFile(data.imagePath), data.image);
  assert.equal(await readFile(data.csvPath, "utf8"), data.csv);
});

test("manifest validator rejects a hash mismatch without changing source data", async (t) => {
  const data = await createDataset(t, (image) =>
    sampleRecord(image, { sha256: "0".repeat(64) }),
  );
  const result = runValidator(data.root);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /SHA-256 do catálogo diverge do arquivo/);
  assert.deepEqual(await readFile(data.imagePath), data.image);
  assert.equal(await readFile(data.csvPath, "utf8"), data.csv);
});

test("manifest validator rejects a file extension that does not match its image format", async (t) => {
  const data = await createDataset(t, sampleRecord, { fileName: "sample.png" });
  const result = runValidator(data.root);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /extensão do nome diverge do formato real \(\.jpg\)/,
  );
});

test("manifest validator rejects duplicate COCO image names", async (t) => {
  const duplicateImages = [
    { id: 1, file_name: "sample.jpg", width: 8, height: 6 },
    { id: 2, file_name: "sample.jpg", width: 8, height: 6 },
  ];
  const data = await createDataset(t, sampleRecord, {
    cocoImages: duplicateImages,
  });
  const result = runValidator(data.root);

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /COCO contém nome de imagem duplicado: sample\.jpg/,
  );
});
