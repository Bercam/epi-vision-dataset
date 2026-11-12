#!/usr/bin/env python3
"""Validate a MakeSense CSV/YOLO ZIP pair against the current COCO image set."""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
REQUIRED_FIELDS = {
    "label_name",
    "bbox_x",
    "bbox_y",
    "bbox_width",
    "bbox_height",
    "image_name",
    "image_width",
    "image_height",
}
MATCH_TOLERANCE_PX = 1.01
EXPECTED_CLASSES = {"pessoa", "capacete", "colete", "sem_capacete"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Confere estrutura, limites, classes e correspondência entre o CSV "
            "e o ZIP YOLO exportados pelo MakeSense. O script não altera arquivos."
        )
    )
    parser.add_argument("--csv", required=True, type=Path, help="CSV exportado pelo MakeSense")
    parser.add_argument("--zip", required=True, type=Path, help="ZIP YOLO exportado pelo MakeSense")
    parser.add_argument(
        "--coco",
        type=Path,
        default=ROOT / "dataset/annotations_coco.json",
        help="COCO de referência para o conjunto de imagens e dimensões",
    )
    return parser.parse_args()


def load_csv(path: Path, errors: list[str]) -> list[dict[str, str]]:
    try:
        with path.open(encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)
            fields = set(reader.fieldnames or [])
            missing = sorted(REQUIRED_FIELDS - fields)
            if missing:
                errors.append(f"CSV sem colunas obrigatórias: {', '.join(missing)}")
                return []
            return list(reader)
    except (OSError, UnicodeError, csv.Error) as error:
        errors.append(f"Não foi possível ler o CSV: {error}")
        return []


def load_coco_images(path: Path, errors: list[str]) -> dict[str, tuple[int, int]]:
    try:
        dataset = json.loads(path.read_text(encoding="utf-8"))
        images = dataset["images"]
        result = {image["file_name"]: (int(image["width"]), int(image["height"])) for image in images}
        if len(result) != len(images):
            errors.append("COCO de referência contém nomes de imagem duplicados")
        return result
    except (OSError, UnicodeError, json.JSONDecodeError, KeyError, TypeError, ValueError) as error:
        errors.append(f"Não foi possível ler imagens/dimensões do COCO: {error}")
        return {}


def parse_csv_rows(
    rows: list[dict[str, str]],
    coco_images: dict[str, tuple[int, int]],
    errors: list[str],
) -> tuple[dict[str, list[tuple[int, tuple[float, float, float, float], str]]], Counter[str]]:
    by_image: dict[str, list[tuple[int, tuple[float, float, float, float], str]]] = defaultdict(list)
    class_counts: Counter[str] = Counter()
    seen: Counter[tuple[object, ...]] = Counter()

    for line_number, row in enumerate(rows, start=2):
        image_name = row["image_name"].strip()
        label = row["label_name"].strip().lower()
        try:
            x, y, width, height = (float(row[key]) for key in ("bbox_x", "bbox_y", "bbox_width", "bbox_height"))
            image_width = int(row["image_width"])
            image_height = int(row["image_height"])
        except (TypeError, ValueError):
            errors.append(f"CSV linha {line_number}: coordenadas/dimensões não numéricas")
            continue

        if not all(math.isfinite(value) for value in (x, y, width, height)):
            errors.append(f"CSV linha {line_number}: coordenadas não finitas")
            continue
        if label not in EXPECTED_CLASSES:
            errors.append(f"CSV linha {line_number}: classe desconhecida {label!r}")
        if image_name not in coco_images:
            errors.append(f"CSV linha {line_number}: imagem ausente no COCO de referência: {image_name}")
        elif (image_width, image_height) != coco_images[image_name]:
            errors.append(
                f"CSV linha {line_number}: dimensões {image_width}x{image_height} divergem do COCO "
                f"{coco_images[image_name][0]}x{coco_images[image_name][1]} ({image_name})"
            )
        if image_width <= 0 or image_height <= 0:
            errors.append(f"CSV linha {line_number}: dimensões da imagem devem ser positivas")
        if width <= 0 or height <= 0:
            errors.append(f"CSV linha {line_number}: bbox deve ter largura e altura positivas ({image_name}: {x:g},{y:g},{width:g},{height:g})")
        elif x < 0 or y < 0 or x + width > image_width or y + height > image_height:
            errors.append(f"CSV linha {line_number}: bbox fora dos limites da imagem ({image_name})")

        box = (x, y, width, height)
        by_image[image_name].append((line_number, box, label))
        class_counts[label] += 1
        key = (image_name, label, *box)
        seen[key] += 1

    for key, count in seen.items():
        if count > 1:
            errors.append(f"CSV contém {count} caixas duplicadas: {key[0]} classe={key[1]} bbox={key[2:]}")

    missing_classes = EXPECTED_CLASSES - set(class_counts)
    if missing_classes:
        errors.append(f"CSV sem anotações para as classes: {', '.join(sorted(missing_classes))}")

    expected_names = set(coco_images)
    csv_names = set(by_image)
    for name in sorted(expected_names - csv_names):
        errors.append(f"CSV não contém anotações para imagem: {name}")
    for name in sorted(csv_names - expected_names):
        errors.append(f"CSV contém imagem não listada no COCO: {name}")

    return by_image, class_counts


def parse_yolo_zip(
    path: Path,
    by_image: dict[str, list[tuple[int, tuple[float, float, float, float], str]]],
    coco_images: dict[str, tuple[int, int]],
    errors: list[str],
) -> int:
    try:
        archive = zipfile.ZipFile(path)
    except (OSError, zipfile.BadZipFile) as error:
        errors.append(f"Não foi possível abrir o ZIP YOLO: {error}")
        return 0

    with archive:
        entries: dict[str, str] = {}
        for member in archive.namelist():
            if member.endswith("/"):
                continue
            name = Path(member).name
            if name.lower() == "classes.txt":
                continue
            if not name.lower().endswith(".txt"):
                errors.append(f"ZIP contém arquivo inesperado: {member}")
                continue
            if name in entries:
                errors.append(f"ZIP contém arquivo de rótulos duplicado: {name}")
            entries[name] = member

        expected_files = {Path(name).stem + ".txt" for name in coco_images}
        for name in sorted(expected_files - set(entries)):
            errors.append(f"ZIP sem arquivo YOLO correspondente: {name}")
        for name in sorted(set(entries) - expected_files):
            errors.append(f"ZIP contém rótulo para imagem desconhecida: {name}")

        class_mapping: dict[int, set[str]] = defaultdict(set)
        used_csv_rows: set[tuple[str, int]] = set()
        total = 0

        for txt_name, member in entries.items():
            image_name = Path(txt_name).stem + ".jpg"
            if image_name not in coco_images:
                continue
            image_width, image_height = coco_images[image_name]
            try:
                lines = archive.read(member).decode("utf-8-sig").splitlines()
            except (UnicodeError, KeyError) as error:
                errors.append(f"Não foi possível ler {member}: {error}")
                continue

            csv_rows = by_image.get(image_name, [])
            for yolo_line, line in enumerate(lines, start=1):
                if not line.strip():
                    continue
                total += 1
                parts = line.split()
                if len(parts) != 5:
                    errors.append(f"{member} linha {yolo_line}: esperados 5 campos, encontrados {len(parts)}")
                    continue
                try:
                    class_id = int(parts[0])
                    xc, yc, width, height = (float(value) for value in parts[1:])
                except ValueError:
                    errors.append(f"{member} linha {yolo_line}: classe/coordenadas inválidas")
                    continue
                if not all(math.isfinite(value) for value in (xc, yc, width, height)):
                    errors.append(f"{member} linha {yolo_line}: coordenadas não finitas")
                    continue
                if class_id < 0 or class_id >= len(EXPECTED_CLASSES):
                    errors.append(f"{member} linha {yolo_line}: ID de classe inválido {class_id}")
                    continue
                if width <= 0 or height <= 0:
                    errors.append(f"{member} linha {yolo_line}: largura/altura normalizada deve ser positiva")
                    continue
                left, top = xc - width / 2, yc - height / 2
                right, bottom = xc + width / 2, yc + height / 2
                if min(left, top) < -1e-6 or max(right, bottom) > 1 + 1e-6:
                    errors.append(f"{member} linha {yolo_line}: bbox normalizada fora de [0, 1]")
                    continue

                yolo_box = (left * image_width, top * image_height, width * image_width, height * image_height)
                candidates = []
                for csv_line, csv_box, label in csv_rows:
                    difference = max(abs(a - b) for a, b in zip(yolo_box, csv_box))
                    if difference <= MATCH_TOLERANCE_PX:
                        candidates.append((difference, csv_line, label))
                candidates.sort()
                match = next(
                    (candidate for candidate in candidates if (image_name, candidate[1]) not in used_csv_rows),
                    None,
                )
                if match is None:
                    errors.append(f"{member} linha {yolo_line}: caixa sem correspondência no CSV")
                    continue
                _, csv_line, label = match
                used_csv_rows.add((image_name, csv_line))
                class_mapping[class_id].add(label)
                if label not in EXPECTED_CLASSES:
                    errors.append(f"{member} linha {yolo_line}: classe do CSV não permitida: {label!r}")

        expected_total = sum(len(rows) for rows in by_image.values())
        if total != expected_total:
            errors.append(f"Total de caixas diverge: ZIP={total}, CSV={expected_total}")
        if len(used_csv_rows) != expected_total:
            errors.append(f"Caixas CSV sem correspondência no ZIP: {expected_total - len(used_csv_rows)}")
        inferred_labels = set()
        for class_id, labels in sorted(class_mapping.items()):
            if len(labels) > 1:
                errors.append(f"ID YOLO {class_id} corresponde a mais de uma classe no CSV: {sorted(labels)}")
            inferred_labels.update(labels)
        if inferred_labels != EXPECTED_CLASSES:
            errors.append(f"Classes inferidas do ZIP divergem das classes esperadas: {sorted(inferred_labels)}")
        if any(len(labels) == 1 for labels in class_mapping.values()):
            label_to_ids: dict[str, set[int]] = defaultdict(set)
            for class_id, labels in class_mapping.items():
                for label in labels:
                    label_to_ids[label].add(class_id)
            for label, ids in label_to_ids.items():
                if len(ids) > 1:
                    errors.append(f"Classe {label!r} aparece em mais de um ID YOLO: {sorted(ids)}")
        return total


def main() -> int:
    args = parse_args()
    errors: list[str] = []
    rows = load_csv(args.csv, errors)
    coco_images = load_coco_images(args.coco, errors)
    by_image, class_counts = parse_csv_rows(rows, coco_images, errors)
    zip_count = parse_yolo_zip(args.zip, by_image, coco_images, errors)

    print(f"Imagens no COCO: {len(coco_images)}")
    print(f"Imagens no CSV: {len(by_image)}")
    print(f"Anotações no CSV: {len(rows)}")
    print(f"Anotações no ZIP: {zip_count}")
    print("Contagem por classe:")
    for label in ("pessoa", "capacete", "colete", "sem_capacete"):
        print(f"  {label}: {class_counts[label]}")
    if errors:
        print(f"\nFALHA: {len(errors)} inconsistência(s):")
        for error in errors:
            print(f"- {error}")
        return 1
    print("\nOK: CSV e ZIP correspondem ao COCO de referência e passaram pelas validações estruturais.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
