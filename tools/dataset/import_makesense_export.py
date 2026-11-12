#!/usr/bin/env python3
"""Import a structurally valid MakeSense CSV/YOLO pair into COCO and YOLO outputs."""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path

from validate_makesense_export import (
    ROOT,
    load_coco_images,
    load_csv,
    parse_csv_rows,
    parse_yolo_zip,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Valida um par CSV/ZIP do MakeSense e atualiza os exports COCO e YOLO. "
            "Nenhum arquivo de saída é alterado se a validação falhar."
        )
    )
    parser.add_argument("--csv", required=True, type=Path, help="CSV validado do MakeSense")
    parser.add_argument("--zip", required=True, type=Path, help="ZIP YOLO correspondente do MakeSense")
    parser.add_argument(
        "--coco",
        type=Path,
        default=ROOT / "dataset/annotations_coco.json",
        help="COCO de referência e destino",
    )
    parser.add_argument(
        "--yolo-dir",
        type=Path,
        default=ROOT / "dataset/annotations_yolo",
        help="Diretório de destino dos arquivos YOLO",
    )
    return parser.parse_args()


def number(value: float) -> int | float:
    return int(value) if value.is_integer() else value


def write_atomic(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as temp_file:
            temp_path = Path(temp_file.name)
            temp_file.write(content)
        os.replace(temp_path, path)
    finally:
        if temp_path is not None and temp_path.exists():
            temp_path.unlink()


def main() -> int:
    args = parse_args()
    errors: list[str] = []
    rows = load_csv(args.csv, errors)
    reference_images = load_coco_images(args.coco, errors)
    by_image, class_counts = parse_csv_rows(rows, reference_images, errors)
    parse_yolo_zip(args.zip, by_image, reference_images, errors)

    try:
        template = json.loads(args.coco.read_text(encoding="utf-8"))
        classes = [
            line.strip().lower()
            for line in (args.yolo_dir / "classes.txt").read_text(encoding="utf-8-sig").splitlines()
            if line.strip()
        ]
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        errors.append(f"Não foi possível ler os arquivos COCO/classes.txt: {error}")
        template = {}
        classes = []

    expected_classes = ["pessoa", "capacete", "colete", "sem_capacete"]
    if classes != expected_classes:
        errors.append(f"classes.txt deve seguir a ordem {expected_classes!r}; recebido: {classes!r}")

    images = template.get("images", [])
    categories = template.get("categories", [])
    image_ids = {image["file_name"]: image["id"] for image in images if "file_name" in image and "id" in image}
    category_ids = {category["name"]: category["id"] for category in categories if "name" in category and "id" in category}
    if set(image_ids) != set(reference_images):
        errors.append("A lista de imagens do COCO mudou durante a validação")
    if set(category_ids) != set(expected_classes):
        errors.append("As categorias do COCO não correspondem às quatro classes obrigatórias")

    if errors:
        print(f"Importação cancelada: {len(errors)} inconsistência(s).", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    annotations = []
    yolo_by_image: dict[str, list[str]] = {name: [] for name in image_ids}
    class_ids = {name: index for index, name in enumerate(classes)}
    for image_name, entries in by_image.items():
        image_width, image_height = reference_images[image_name]
        for _, (x, y, width, height), label in entries:
            annotations.append(
                {
                    "id": len(annotations) + 1,
                    "image_id": image_ids[image_name],
                    "category_id": category_ids[label],
                    "bbox": [number(x), number(y), number(width), number(height)],
                    "area": number(width * height),
                    "iscrowd": 0,
                }
            )
            xc = (x + width / 2) / image_width
            yc = (y + height / 2) / image_height
            normalized_width = width / image_width
            normalized_height = height / image_height
            yolo_by_image[image_name].append(
                f"{class_ids[label]} {xc:.6f} {yc:.6f} {normalized_width:.6f} {normalized_height:.6f}"
            )

    template["annotations"] = annotations
    coco_content = (json.dumps(template, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    outputs = {
        args.yolo_dir / (Path(image_name).stem + ".txt"): ("\n".join(lines) + "\n").encode("utf-8")
        for image_name, lines in yolo_by_image.items()
    }
    if not outputs:
        print("Importação cancelada: não há imagens para exportar.", file=sys.stderr)
        return 1

    for path, content in outputs.items():
        write_atomic(path, content)
    write_atomic(args.coco, coco_content)

    print(f"COCO atualizado: {len(annotations)} anotações em {len(images)} imagens.")
    for label in expected_classes:
        print(f"  {label}: {class_counts[label]}")
    print(f"YOLO atualizado: {len(outputs)} arquivos de anotação.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
