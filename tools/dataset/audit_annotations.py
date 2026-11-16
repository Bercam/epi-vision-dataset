#!/usr/bin/env python3
"""Audita geometricamente as anotações do COCO sem alterar nenhum arquivo.

O script separa problemas objetivos (caixas degeneradas, fora dos limites,
duplicadas, cabeças/coletes órfãos) de avisos que exigem inspeção humana
(recortes de cabeça, objetos minúsculos, caixas tocando a borda).
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path

from validate_makesense_export import ROOT

HEAD_CLASSES = {"capacete", "sem_capacete"}
MIN_HEAD_CUT_PX = 8.0
MIN_HEAD_CUT_RATIO = 0.10
DUPLICATE_IOU = 0.85
TINY_AREA_RATIO = 0.0002


@dataclass(frozen=True)
class Finding:
    severity: str
    check: str
    message: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Relata problemas geométricos nas anotações COCO do projeto. "
            "Somente leitura: não modifica COCO, YOLO nem o par do MakeSense."
        )
    )
    parser.add_argument(
        "--coco",
        type=Path,
        default=ROOT / "dataset/annotations_coco.json",
        help="COCO a auditar",
    )
    return parser.parse_args()


def load_dataset(path: Path) -> dict:
    try:
        dataset = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise SystemExit(f"Não foi possível ler o COCO: {error}") from error
    for key in ("images", "annotations", "categories"):
        if not isinstance(dataset.get(key), list):
            raise SystemExit(f"COCO inválido: campo {key!r} ausente ou não é lista")
    return dataset


def area(box: tuple[float, float, float, float]) -> float:
    return box[2] * box[3]


def center(box: tuple[float, float, float, float]) -> tuple[float, float]:
    return box[0] + box[2] / 2, box[1] + box[3] / 2


def iou(first: tuple[float, float, float, float], second: tuple[float, float, float, float]) -> float:
    intersection_width = max(0.0, min(first[0] + first[2], second[0] + second[2]) - max(first[0], second[0]))
    intersection_height = max(0.0, min(first[1] + first[3], second[1] + second[3]) - max(first[1], second[1]))
    intersection = intersection_width * intersection_height
    union = area(first) + area(second) - intersection
    return intersection / union if union else 0.0


def contains(box: tuple[float, float, float, float], point: tuple[float, float]) -> bool:
    return box[0] <= point[0] <= box[0] + box[2] and box[1] <= point[1] <= box[1] + box[3]


def audit(dataset: dict) -> tuple[list[Finding], Counter[str], dict[str, Counter[str]]]:
    images = {image["id"]: image for image in dataset["images"]}
    categories = {category["id"]: category["name"] for category in dataset["categories"]}
    annotations_by_image: dict[int, list[dict]] = defaultdict(list)
    for annotation in dataset["annotations"]:
        annotations_by_image[annotation["image_id"]].append(annotation)

    findings: list[Finding] = []
    class_counts: Counter[str] = Counter()
    per_image: dict[str, Counter[str]] = {}

    for image_id, annotations in annotations_by_image.items():
        image = images.get(image_id)
        if image is None:
            findings.append(Finding("error", "orphan_annotation", f"anotação aponta para image_id inexistente: {image_id}"))
            continue

        name = image["file_name"]
        width, height = float(image["width"]), float(image["height"])
        per_image[name] = Counter(categories[a["category_id"]] for a in annotations)
        class_counts.update(per_image[name])

        persons = [a for a in annotations if categories[a["category_id"]] == "pessoa"]
        heads = [a for a in annotations if categories[a["category_id"]] in HEAD_CLASSES]
        vests = [a for a in annotations if categories[a["category_id"]] == "colete"]

        for annotation in annotations:
            label = categories[annotation["category_id"]]
            box = tuple(float(value) for value in annotation["bbox"])
            x, y, box_width, box_height = box

            if box_width <= 0 or box_height <= 0:
                findings.append(Finding("error", "degenerate", f"{name} id={annotation['id']} {label} bbox={annotation['bbox']}"))
            if x < 0 or y < 0 or x + box_width > width or y + box_height > height:
                findings.append(Finding("error", "out_of_bounds", f"{name} id={annotation['id']} {label} bbox={annotation['bbox']}"))
            if area(box) / (width * height) < TINY_AREA_RATIO:
                findings.append(Finding("warning", "tiny", f"{name} id={annotation['id']} {label} bbox={annotation['bbox']}"))
            if x <= 1 or y <= 1 or x + box_width >= width - 1 or y + box_height >= height - 1:
                findings.append(Finding("warning", "touches_edge", f"{name} id={annotation['id']} {label} bbox={annotation['bbox']}"))

        for index, first in enumerate(annotations):
            for second in annotations[index + 1 :]:
                if categories[first["category_id"]] != categories[second["category_id"]]:
                    continue
                value = iou(tuple(first["bbox"]), tuple(second["bbox"]))
                if value > DUPLICATE_IOU:
                    findings.append(
                        Finding(
                            "error",
                            "duplicate",
                            f"{name} ids={first['id']},{second['id']} {categories[first['category_id']]} IoU={value:.3f}",
                        )
                    )

        for person in persons:
            person_box = tuple(person["bbox"])
            for head in heads:
                head_box = tuple(head["bbox"])
                if not contains(person_box, center(head_box)):
                    continue
                delta = person_box[1] - head_box[1]
                if delta > max(MIN_HEAD_CUT_PX, MIN_HEAD_CUT_RATIO * head_box[3]):
                    findings.append(
                        Finding(
                            "warning",
                            "head_cut",
                            f"{name} pessoa id={person['id']} começa {delta:.1f}px abaixo de "
                            f"{categories[head['category_id']]} id={head['id']}",
                        )
                    )
            if not any(contains(person_box, center(tuple(head["bbox"]))) for head in heads):
                findings.append(Finding("warning", "person_without_head", f"{name} pessoa id={person['id']} bbox={person['bbox']}"))

        for head in heads:
            if not any(contains(tuple(person["bbox"]), center(tuple(head["bbox"]))) for person in persons):
                findings.append(
                    Finding(
                        "warning",
                        "orphan_head",
                        f"{name} {categories[head['category_id']]} id={head['id']} bbox={head['bbox']}",
                    )
                )

        for vest in vests:
            if not any(contains(tuple(person["bbox"]), center(tuple(vest["bbox"]))) for person in persons):
                findings.append(Finding("warning", "orphan_vest", f"{name} colete id={vest['id']} bbox={vest['bbox']}"))

    return findings, class_counts, per_image


def main() -> int:
    args = parse_args()
    dataset = load_dataset(args.coco)
    findings, class_counts, per_image = audit(dataset)

    print(f"Imagens: {len(dataset['images'])}")
    print(f"Anotações: {len(dataset['annotations'])}")
    print("Contagem por classe:")
    for label, count in sorted(class_counts.items()):
        print(f"  {label}: {count}")
    print("Anotações por imagem:")
    for name, counts in sorted(per_image.items()):
        summary = ", ".join(f"{label}={count}" for label, count in sorted(counts.items()))
        print(f"  {name}: {summary}")

    errors = [finding for finding in findings if finding.severity == "error"]
    warnings = [finding for finding in findings if finding.severity != "error"]

    for title, group in (("ERROS", errors), ("AVISOS", warnings)):
        print(f"\n{title} ({len(group)})")
        if not group:
            print("  nenhum")
            continue
        for check in sorted({finding.check for finding in group}):
            items = [finding for finding in group if finding.check == check]
            print(f"  {check} ({len(items)})")
            for finding in items:
                print(f"    {finding.message}")

    print("\nAvisos exigem inspeção humana; erros bloqueiam a publicação do dataset.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
