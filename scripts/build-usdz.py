"""
Write a .usdz beside every .glb in public/models.

Android's Scene Viewer reads the .glb directly, so AR there needs nothing
extra. An iPhone does not: Quick Look wants USDZ, and without one the "View in
your room" button never appears on iOS at all. Shopify derives the USDZ itself
for models uploaded to a product — this covers the models we serve ourselves.

    python scripts/build-usdz.py            # only the ones missing a .usdz
    python scripts/build-usdz.py --force    # rewrite all of them

Reads whatever .glb files are there, so it works the same for models built by
scripts/build-models.py and for models made in Blender and dropped in.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import trimesh
from pxr import Gf, Sdf, Usd, UsdGeom, UsdShade, UsdUtils

ROOT = Path(__file__).resolve().parent.parent
MODELS = ROOT / "public" / "models"


def base_colour(mesh: trimesh.Trimesh) -> tuple[float, float, float]:
    """The material colour, as USD wants it: linear, 0..1."""
    material = getattr(mesh.visual, "material", None)
    factor = getattr(material, "baseColorFactor", None)
    if factor is None:
        return (0.8, 0.8, 0.8)

    srgb = [channel / 255.0 if channel > 1 else float(channel) for channel in factor[:3]]
    # glTF stores base colour linear already; trimesh hands back 0-255 bytes.
    return tuple(round(channel, 4) for channel in srgb)


def write_usdz(glb: Path, out: Path) -> tuple[int, tuple[float, float, float]]:
    scene = trimesh.load(glb, force="scene")
    mesh = scene.to_geometry() if hasattr(scene, "to_geometry") else scene
    if isinstance(mesh, trimesh.Scene):
        mesh = trimesh.util.concatenate(list(mesh.geometry.values()))

    colour = base_colour(mesh)

    # Quick Look reads Y-up in metres, which is what the .glb already holds —
    # trimesh gives us the glTF axes back, so no rotation is applied here.
    stage = Usd.Stage.CreateNew(str(out.with_suffix(".usdc")))
    UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
    UsdGeom.SetStageMetersPerUnit(stage, 1.0)

    root = UsdGeom.Xform.Define(stage, "/Root")
    stage.SetDefaultPrim(root.GetPrim())

    geom = UsdGeom.Mesh.Define(stage, "/Root/Geom")
    geom.CreatePointsAttr([Gf.Vec3f(*point) for point in mesh.vertices.astype(float)])
    geom.CreateFaceVertexIndicesAttr(mesh.faces.astype(int).flatten().tolist())
    geom.CreateFaceVertexCountsAttr([3] * len(mesh.faces))
    geom.CreateSubdivisionSchemeAttr(UsdGeom.Tokens.none)
    geom.CreateExtentAttr(
        [Gf.Vec3f(*mesh.bounds[0].astype(float)), Gf.Vec3f(*mesh.bounds[1].astype(float))]
    )
    if mesh.vertex_normals is not None and len(mesh.vertex_normals):
        normals = geom.CreateNormalsAttr(
            [Gf.Vec3f(*normal) for normal in mesh.vertex_normals.astype(float)]
        )
        geom.SetNormalsInterpolation(UsdGeom.Tokens.vertex)

    material = UsdShade.Material.Define(stage, "/Root/Material")
    shader = UsdShade.Shader.Define(stage, "/Root/Material/Surface")
    shader.CreateIdAttr("UsdPreviewSurface")
    shader.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*colour))
    shader.CreateInput("roughness", Sdf.ValueTypeNames.Float).Set(0.6)
    shader.CreateInput("metallic", Sdf.ValueTypeNames.Float).Set(0.0)
    material.CreateSurfaceOutput().ConnectToSource(shader.ConnectableAPI(), "surface")
    UsdShade.MaterialBindingAPI(geom).Bind(material)

    stage.GetRootLayer().Save()

    # Package the layer into the single .usdz file Quick Look opens.
    UsdUtils.CreateNewUsdzPackage(Sdf.AssetPath(str(out.with_suffix(".usdc"))), str(out))
    out.with_suffix(".usdc").unlink(missing_ok=True)
    return len(mesh.faces), colour


def main() -> None:
    force = "--force" in sys.argv
    globs = sorted(MODELS.glob("*.glb"))
    if not globs:
        print("No .glb files in public/models.")
        return

    print(f"{'file':<44} {'tris':>7} {'size':>8}  colour")
    print("-" * 84)

    written = 0
    for glb in globs:
        usdz = glb.with_suffix(".usdz")
        if usdz.exists() and not force:
            continue
        faces, colour = write_usdz(glb, usdz)
        kb = usdz.stat().st_size / 1024
        print(f"{usdz.name:<44} {faces:>7,} {kb:>7.0f}K  {colour}")
        written += 1

    print(f"\n{written} written, {len(globs) - written} already had one.")


if __name__ == "__main__":
    main()
