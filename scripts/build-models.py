"""
Build a 3D model for every piece in the catalogue, from the measurements the
site already publishes.

The dimensions come from app/lib/product-spec.ts and the finish colours from
app/lib/swatches.ts, so a model is never a guess about size — a side table is
40cm across and 52cm tall here because that is what the spec sheet says, and
if the spec changes the models are rebuilt from it.

The shapes are honest approximations: primitives assembled into a silhouette,
not scans. They are right about proportion, height and colour, which is what a
shopper is judging in a 3D preview, and wrong about the fine detail of a
sculpted leg or a seam. Anything sold on the strength of its detail wants
photogrammetry instead.

    python scripts/build-models.py

Writes public/models/*.glb and prints each model's bounding box beside the
dimensions it was meant to hit.
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path

import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "models"

# ─── The catalogue, as the site describes it ────────────────────────────────
# Dimensions in centimetres, straight from app/lib/product-spec.ts.
SPECS = {
    "sofa": {"width": 210, "depth": 95, "height": 78, "seat": 43},
    "armchair": {"width": 78, "depth": 82, "height": 74, "seat": 42},
    "ottoman": {"width": 60, "depth": 60, "height": 42},
    "coffee_table": {"diameter": 90, "height": 34},
    "side_table": {"diameter": 40, "height": 52},
    "bedside_table": {"width": 40, "depth": 36, "height": 55},
    "dining_table": {"diameter": 120, "height": 75},
}

# app/lib/swatches.ts
SWATCH_HEX = {
    "natural": "#e8ded0",
    "chalk": "#ecebe5",
    "haze": "#cfcbc2",
    "oyster": "#ded8cf",
    "ivory": "#efe9df",
    "cream": "#f2ece1",
    "pine": "#ddc9a6",
    "light_oak": "#d9bf98",
    "oak": "#cdae83",
    "smoke_oak": "#6d5947",
    "walnut": "#6b4a32",
    "tan": "#a9713f",
    "clay": "#b98a6c",
    "sangria": "#8d3a34",
}

# Upholstery reads softer than timber; the roughness split is the only thing
# separating a bouclé sofa from an oiled oak top without textures.
SOFT_TYPES = {"sofa", "armchair", "ottoman"}

# Only the pieces this approach can do justice to.
#
# Timber furniture IS primitives — a disc on a pedestal, a plinth, a slab on
# two legs — so a built model reads as the piece. Upholstery is not: a sofa
# assembled from rounded boxes reads as a crate, and a bad 3D model of a sofa
# is worse than a good photograph of one. Seating wants photogrammetry or a
# real modeller; until then it keeps its photographs.
BUILDABLE = {"coffee_table", "side_table", "bedside_table", "dining_table"}


def cm(value: float) -> float:
    """Centimetres to metres — glTF is metres, and AR takes it literally."""
    return value / 100.0


def rgba(hex_colour: str) -> list[int]:
    value = hex_colour.lstrip("#")
    return [int(value[i : i + 2], 16) for i in (0, 2, 4)] + [255]


def box(width: float, depth: float, height: float, centre=(0.0, 0.0, 0.0)):
    mesh = trimesh.creation.box(extents=(width, height, depth))
    mesh.apply_translation((centre[0], centre[1] + height / 2, centre[2]))
    return mesh


def rounded_box(width: float, depth: float, height: float, radius: float, centre=(0.0, 0.0, 0.0)):
    """A box with softened vertical edges — every piece in this catalogue has
    them, and a hard-edged cube reads as a packing crate."""
    radius = min(radius, width / 2 - 0.001, depth / 2 - 0.001)
    if radius <= 0:
        return box(width, depth, height, centre)

    profile = []
    corners = [
        (width / 2 - radius, depth / 2 - radius, 0),
        (-(width / 2 - radius), depth / 2 - radius, math.pi / 2),
        (-(width / 2 - radius), -(depth / 2 - radius), math.pi),
        (width / 2 - radius, -(depth / 2 - radius), 3 * math.pi / 2),
    ]
    for cx, cz, start in corners:
        for step in range(5):
            angle = start + step * (math.pi / 2) / 4
            profile.append((cx + radius * math.cos(angle), cz + radius * math.sin(angle)))

    mesh = trimesh.creation.extrude_polygon(
        __import__("shapely.geometry", fromlist=["Polygon"]).Polygon(profile), height
    )
    # extrude_polygon builds along Z; stand it up so height runs along Y.
    mesh.apply_transform(trimesh.transformations.rotation_matrix(-math.pi / 2, (1, 0, 0)))
    # The rotation leaves the extrusion running 0..height along Y already, so
    # the centre is applied as-is — adding height again lifts the piece off it.
    mesh.apply_translation((centre[0], centre[1], centre[2]))
    return mesh


def cylinder(radius: float, height: float, centre=(0.0, 0.0, 0.0), sections: int = 48):
    mesh = trimesh.creation.cylinder(radius=radius, height=height, sections=sections)
    mesh.apply_transform(trimesh.transformations.rotation_matrix(math.pi / 2, (1, 0, 0)))
    mesh.apply_translation((centre[0], centre[1] + height / 2, centre[2]))
    return mesh


# ─── The pieces ─────────────────────────────────────────────────────────────


def build_side_table(spec):
    """A plinth: a soft cylinder with a slightly proud top, as photographed."""
    radius = cm(spec["diameter"]) / 2
    height = cm(spec["height"])
    top_thickness = cm(3.5)

    column = cylinder(radius * 0.82, height - top_thickness)
    top = cylinder(radius, top_thickness, centre=(0, height - top_thickness, 0))
    return trimesh.util.concatenate([column, top])


def build_coffee_table(spec):
    """An oval top on two slab legs — the Clem and Otis silhouette."""
    radius = cm(spec["diameter"]) / 2
    height = cm(spec["height"])
    top_thickness = cm(4)
    leg_thickness = cm(4)

    top = cylinder(radius, top_thickness, centre=(0, height - top_thickness, 0))
    # Softly oval, but never wider than the diameter the spec sheet publishes.
    top.apply_scale((1.0, 1.0, 0.74))

    # Slab legs, inset from the edge and never deeper than the top they carry —
    # a leg poking out past the tabletop is the first thing that reads as fake.
    leg_height = height - top_thickness
    leg_depth = radius * 0.74 * 1.15
    legs = [
        box(leg_thickness, leg_depth, leg_height, centre=(radius * 0.62, 0, 0)),
        box(leg_thickness, leg_depth, leg_height, centre=(-radius * 0.62, 0, 0)),
    ]
    return trimesh.util.concatenate([top, *legs])


def build_dining_table(spec):
    """Round top on a turned pedestal, on a disc foot."""
    radius = cm(spec["diameter"]) / 2
    height = cm(spec["height"])
    top_thickness = cm(4)

    top = cylinder(radius, top_thickness, centre=(0, height - top_thickness, 0))
    column = cylinder(cm(14), height - top_thickness, centre=(0, cm(2), 0))
    foot = cylinder(radius * 0.42, cm(4))
    return trimesh.util.concatenate([foot, column, top])


def build_bedside_table(spec):
    """A plinth with a drawer line scored across the front."""
    width, depth, height = cm(spec["width"]), cm(spec["depth"]), cm(spec["height"])
    body = rounded_box(width, depth, height - cm(1), cm(2), centre=(0, cm(1), 0))
    plinth = box(width * 0.86, depth * 0.86, cm(1))
    drawer = box(width * 0.92, cm(0.6), cm(1.2), centre=(0, height * 0.62, depth / 2))
    return trimesh.util.concatenate([plinth, body, drawer])


def build_ottoman(spec):
    """A soft cushion on short legs."""
    width, depth, height = cm(spec["width"]), cm(spec["depth"]), cm(spec["height"])
    leg_height = cm(9)
    cushion = rounded_box(width, depth, height - leg_height, cm(7), centre=(0, leg_height, 0))
    legs = [
        cylinder(cm(1.6), leg_height, centre=(x, 0, z))
        for x in (width / 2 - cm(7), -(width / 2 - cm(7)))
        for z in (depth / 2 - cm(7), -(depth / 2 - cm(7)))
    ]
    return trimesh.util.concatenate([cushion, *legs])


def _seat_and_back(width, depth, height, seat_height):
    """The shared body of a sofa and an armchair: base, seat cushion, back and
    two arms, each rounded."""
    leg_height = cm(9)
    arm_width = cm(11)
    back_thickness = cm(14)

    base = rounded_box(
        width, depth, seat_height - leg_height, cm(6), centre=(0, leg_height, 0)
    )
    cushion = rounded_box(
        width - arm_width * 2,
        depth - back_thickness,
        cm(12),
        cm(5),
        centre=(0, seat_height - cm(4), -back_thickness / 2),
    )
    back = rounded_box(
        width,
        back_thickness,
        height - seat_height + cm(6),
        cm(6),
        centre=(0, seat_height - cm(6), -(depth - back_thickness) / 2),
    )
    arms = [
        rounded_box(
            arm_width,
            depth - back_thickness * 0.4,
            seat_height + cm(14) - leg_height,
            cm(5),
            centre=(x, leg_height, cm(2)),
        )
        for x in ((width - arm_width) / 2, -(width - arm_width) / 2)
    ]
    legs = [
        cylinder(cm(2), leg_height, centre=(x, 0, z))
        for x in (width / 2 - cm(8), -(width / 2 - cm(8)))
        for z in (depth / 2 - cm(8), -(depth / 2 - cm(8)))
    ]
    return trimesh.util.concatenate([base, cushion, back, *arms, *legs])


def build_sofa(spec):
    return _seat_and_back(cm(spec["width"]), cm(spec["depth"]), cm(spec["height"]), cm(spec["seat"]))


def build_armchair(spec):
    return _seat_and_back(cm(spec["width"]), cm(spec["depth"]), cm(spec["height"]), cm(spec["seat"]))


BUILDERS = {
    "sofa": build_sofa,
    "armchair": build_armchair,
    "ottoman": build_ottoman,
    "coffee_table": build_coffee_table,
    "side_table": build_side_table,
    "bedside_table": build_bedside_table,
    "dining_table": build_dining_table,
}


def build(piece_type: str, colour_slug: str) -> trimesh.Trimesh:
    mesh = BUILDERS[piece_type](SPECS[piece_type])
    mesh.merge_vertices()

    # Sit it on the floor, centred on its footprint: AR places the origin where
    # the visitor taps, and a model that floats or sinks gives the game away.
    bounds = mesh.bounds
    mesh.apply_translation(
        (
            -(bounds[0][0] + bounds[1][0]) / 2,
            -bounds[0][1],
            -(bounds[0][2] + bounds[1][2]) / 2,
        )
    )

    hex_colour = SWATCH_HEX.get(colour_slug, SWATCH_HEX["oak"])
    mesh.visual = trimesh.visual.TextureVisuals(
        material=trimesh.visual.material.PBRMaterial(
            name=colour_slug,
            baseColorFactor=rgba(hex_colour),
            metallicFactor=0.0,
            roughnessFactor=0.85 if piece_type in SOFT_TYPES else 0.55,
        )
    )
    return mesh


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    catalogue = json.loads((ROOT / "scripts" / "model-targets.json").read_text(encoding="utf-8"))

    print(f"{'file':<44} {'size':>8}  bounding box (W×D×H cm)   expected")
    print("-" * 104)

    built: list[str] = []
    for entry in catalogue:
        if entry["type"] not in BUILDABLE:
            continue
        mesh = build(entry["type"], entry["colour"])
        path = OUT / f"{entry['handle']}.glb"
        path.write_bytes(trimesh.exchange.gltf.export_glb(trimesh.Scene(mesh)))

        size = mesh.extents * 100  # back to centimetres for the report
        spec = SPECS[entry["type"]]
        expected = (
            f"{spec.get('width', spec.get('diameter'))}×"
            f"{spec.get('depth', spec.get('diameter'))}×{spec['height']}"
        )
        kb = path.stat().st_size / 1024
        flag = "" if kb < 1024 else "  ← over 1MB"
        print(
            f"{path.name:<44} {kb:>7.0f}K  "
            f"{size[0]:>6.1f}×{size[2]:>5.1f}×{size[1]:>5.1f}      {expected}{flag}"
        )
        built.append(entry["handle"])

    # The manifest the storefront reads. A product is only offered in 3D if a
    # model for it actually came out of this run, so deleting a .glb and
    # rebuilding takes the 3D tab off that product too.
    (ROOT / "app" / "lib" / "local-models.json").write_text(
        json.dumps(sorted(built), indent=2) + "\n", encoding="utf-8"
    )

    skipped = sorted({e["type"] for e in catalogue if e["type"] not in BUILDABLE})
    print(f"\n{len(built)} models written to public/models.")
    print(f"Skipped as unsuitable for this method: {', '.join(skipped)}.")


if __name__ == "__main__":
    main()
