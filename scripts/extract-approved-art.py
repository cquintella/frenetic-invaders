"""Cut the approved ship sheet into three aligned poses with real alpha.

Source: img/Gemini_Generated_Image_72490g72490g7249.jpg
That file is the 2×2 sheet (flames, two 15% banks, and the rejected blue-shot
quadrant). The bottom-right panel is never written.

Checkerboard is removed by flood-filling gray cells from the panel edge and
stopping at the ink outline, so the white/gray hull is not treated as
background. Captions are a separate pale component and are dropped.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "img" / "Gemini_Generated_Image_72490g72490g7249.jpg"
OUT = ROOT / "public" / "sprites" / "ship"
ENEMY_SOURCE = ROOT / "art" / "sources" / "enemies.png"


def chroma(arr: np.ndarray) -> np.ndarray:
    return arr.max(axis=2) - arr.min(axis=2)


def flood_background(rgb: np.ndarray) -> np.ndarray:
    """True where the pixel is checkerboard outside the inked craft."""
    height, width = rgb.shape[:2]
    avg = rgb.mean(axis=2)
    ch = chroma(rgb)
    gray = ch <= 28
    dark = avg < 96
    # Ink, glass, bronze, flame and caption white all block the flood.
    barrier = dark | (ch > 26) | (avg > 228)
    # Close one-pixel jpeg gaps in the outline without eating the hull.
    padded = np.pad(barrier, 1, constant_values=False)
    closed = barrier.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            closed |= padded[1 + dy : 1 + dy + height, 1 + dx : 1 + dx + width]
    # Only gray checker can be traversed.
    walkable = gray & ~closed
    bg = np.zeros((height, width), dtype=bool)
    stack = []
    for x in range(width):
        if walkable[0, x]:
            stack.append((0, x))
        if walkable[height - 1, x]:
            stack.append((height - 1, x))
    for y in range(height):
        if walkable[y, 0]:
            stack.append((y, 0))
        if walkable[y, width - 1]:
            stack.append((y, width - 1))
    while stack:
        y, x = stack.pop()
        if bg[y, x] or not walkable[y, x]:
            continue
        bg[y, x] = True
        if y > 0:
            stack.append((y - 1, x))
        if y + 1 < height:
            stack.append((y + 1, x))
        if x > 0:
            stack.append((y, x - 1))
        if x + 1 < width:
            stack.append((y, x + 1))
    return bg


def dehalo(rgb: np.ndarray, bg: np.ndarray) -> np.ndarray:
    """Fringe pixels that still carry checker gray become partial alpha."""
    height, width = rgb.shape[:2]
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    avg = rgb.mean(axis=2)
    dist = np.minimum(np.abs(avg - 108), np.abs(avg - 195))
    padded = np.pad(bg, 1, constant_values=True)
    fringe = np.zeros_like(bg)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            fringe |= padded[1 + dy : 1 + dy + height, 1 + dx : 1 + dx + width]
    fringe &= ~bg
    soft = fringe & (chroma(rgb) < 30) & (dist < 36) & (avg > 90)
    fade = np.clip((dist - 10) / 22, 0, 1)
    alpha[soft] = (fade[soft] * 255).astype(np.uint8)
    return alpha


def components(mask: np.ndarray) -> list[tuple[int, int, int, int, int]]:
    """Return (area, x0, y0, x1, y1) for each 4-connected blob. Inclusive box."""
    height, width = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    found = []
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys.tolist(), xs.tolist()):
        if seen[y0, x0]:
            continue
        stack = [(y0, x0)]
        seen[y0, x0] = True
        area = 0
        minx = maxx = x0
        miny = maxy = y0
        while stack:
            y, x = stack.pop()
            area += 1
            minx = min(minx, x)
            maxx = max(maxx, x)
            miny = min(miny, y)
            maxy = max(maxy, y)
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if ny < 0 or nx < 0 or ny >= height or nx >= width:
                    continue
                if seen[ny, nx] or not mask[ny, nx]:
                    continue
                seen[ny, nx] = True
                stack.append((ny, nx))
        found.append((area, minx, miny, maxx, maxy))
    return found


def craft_bottom(alpha: np.ndarray, rgb: np.ndarray) -> int:
    """Lowest ink row of the craft, above the caption gap."""
    solid = alpha > 40
    dark = solid & (rgb.mean(axis=2) < 90)
    counts = dark.sum(axis=1)
    rows = np.nonzero(counts > 8)[0]
    if len(rows) == 0:
        ys = np.nonzero(solid)[0]
        return int(ys.max()) if len(ys) else 0
    gaps = np.diff(rows)
    if len(gaps) and gaps.max() > 12:
        return int(rows[int(np.argmax(gaps))])
    return int(rows.max())


def drop_caption_and_flame_checker(alpha: np.ndarray, rgb: np.ndarray) -> np.ndarray:
    """Below the hull, keep the orange plume and drop checker, glow-tinted
    squares and the caption. The hull itself is not in this band."""
    out = alpha.copy()
    if not (out > 40).any():
        return out
    bottom = craft_bottom(out, rgb)
    # The plume is painted over the checkerboard. Keeping it leaves gray
    # squares inside the fire. The hull and the bell mouths stay.
    red = rgb[:, :, 0].astype(np.int16)
    blue = rgb[:, :, 2].astype(np.int16)
    hot = (out > 40) & (red > 210) & (red > blue + 70) & (rgb[:, :, 1] > 70)
    rows = np.nonzero(hot.sum(axis=1) > 60)[0]
    cut = int(rows[0]) if len(rows) else bottom + 3
    out[cut:, :] = 0
    return out


def keep_craft(alpha: np.ndarray, rgb: np.ndarray) -> np.ndarray:
    solid = alpha > 40
    blobs = components(solid)
    if not blobs:
        return alpha
    blobs.sort(reverse=True)
    ship = blobs[0]
    _, sx0, sy0, sx1, sy1 = ship
    keep = np.zeros_like(solid)
    # Repaint kept components. The largest is the hull. Flames sit just
    # under it and share its x range. Captions are pale and low.
    seen = np.zeros_like(solid, dtype=bool)
    height, width = solid.shape
    ys, xs = np.nonzero(solid)
    for y0, x0 in zip(ys.tolist(), xs.tolist()):
        if seen[y0, x0]:
            continue
        stack = [(y0, x0)]
        seen[y0, x0] = True
        pixels = []
        minx = maxx = x0
        miny = maxy = y0
        while stack:
            y, x = stack.pop()
            pixels.append((y, x))
            minx = min(minx, x)
            maxx = max(maxx, x)
            miny = min(miny, y)
            maxy = max(maxy, y)
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if ny < 0 or nx < 0 or ny >= height or nx >= width:
                    continue
                if seen[ny, nx] or not solid[ny, nx]:
                    continue
                seen[ny, nx] = True
                stack.append((ny, nx))
        pale = 0
        for y, x in pixels:
            if rgb[y, x].min() > 210:
                pale += 1
        caption = maxy > height * 0.82 and pale > len(pixels) * 0.55
        touches = not (maxx < sx0 - 8 or minx > sx1 + 8 or maxy < sy0 - 8 or miny > sy1 + 48)
        if caption or (len(pixels) < 80 and not touches):
            continue
        if len(pixels) < ship[0] and not touches:
            continue
        for y, x in pixels:
            keep[y, x] = True
    out = alpha.copy()
    out[~keep] = 0
    return out


def panel_splits(rgb: np.ndarray) -> tuple[int, int]:
    avg = rgb.mean(axis=2)
    dark_col = (avg < 20).mean(axis=0)
    dark_row = (avg < 20).mean(axis=1)
    xs = np.nonzero(dark_col > 0.45)[0]
    ys = np.nonzero(dark_row > 0.45)[0]
    if len(xs) == 0 or len(ys) == 0:
        raise SystemExit("sheet dividers were not found")
    return int(xs.min()), int(ys.min())


def extract_pose(rgb: np.ndarray, box: tuple[int, int, int, int]) -> Image.Image:
    x0, y0, x1, y1 = box
    crop = rgb[y0:y1, x0:x1]
    bg = flood_background(crop)
    alpha = dehalo(crop, bg)
    alpha = keep_craft(alpha, crop)
    alpha = drop_caption_and_flame_checker(alpha, crop)
    alpha = keep_largest(alpha)
    rgba = np.dstack([crop, alpha])
    return Image.fromarray(rgba, "RGBA")


def hull_metrics(image: Image.Image) -> dict[str, int]:
    arr = np.array(image)
    alpha = arr[:, :, 3]
    rgb = arr[:, :, :3]
    orange = (rgb[:, :, 0] > rgb[:, :, 1] + 25) & (rgb[:, :, 0] > rgb[:, :, 2] + 40) & (alpha > 40)
    hull = (alpha > 40) & ~orange
    if not hull.any():
        hull = alpha > 40
    ys, xs = np.nonzero(hull)
    top = int(ys.min())
    # Nose is the median x of the top 12 hull rows, so a tilted outline
    # does not pull the pivot onto one shoulder.
    band = ys <= top + 12
    nose_x = int(np.median(xs[band]))
    nose_y = top
    return {
        "noseX": nose_x,
        "noseY": nose_y,
        "hullTop": top,
        "hullBottom": int(ys.max()),
        "hullLeft": int(xs.min()),
        "hullRight": int(xs.max()),
        "width": int(image.width),
        "height": int(image.height),
    }


def keep_largest(alpha: np.ndarray) -> np.ndarray:
    solid = alpha > 24
    blobs = components(solid)
    if not blobs:
        return alpha
    blobs.sort(reverse=True)
    _, x0, y0, x1, y1 = blobs[0]
    # Keep the main craft. A plume that barely separates stays if it sits
    # under the hull and is wide enough to be fire rather than a speck.
    keep = np.zeros_like(solid)
    seen = np.zeros_like(solid, dtype=bool)
    height, width = solid.shape
    ys, xs = np.nonzero(solid)
    for sy, sx in zip(ys.tolist(), xs.tolist()):
        if seen[sy, sx]:
            continue
        stack = [(sy, sx)]
        seen[sy, sx] = True
        pixels = []
        minx = maxx = sx
        miny = maxy = sy
        while stack:
            y, x = stack.pop()
            pixels.append((y, x))
            minx = min(minx, x)
            maxx = max(maxx, x)
            miny = min(miny, y)
            maxy = max(maxy, y)
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if ny < 0 or nx < 0 or ny >= height or nx >= width:
                    continue
                if seen[ny, nx] or not solid[ny, nx]:
                    continue
                seen[ny, nx] = True
                stack.append((ny, nx))
        main = len(pixels) == blobs[0][0]
        under = miny >= y0 and maxy <= y1 + 80 and not (maxx < x0 or minx > x1)
        if main or (under and len(pixels) > 120):
            for y, x in pixels:
                keep[y, x] = True
    out = alpha.copy()
    out[~keep] = 0
    return out


def trim(image: Image.Image, pad: int = 2) -> Image.Image:
    arr = np.array(image)
    ys, xs = np.nonzero(arr[:, :, 3] > 8)
    if len(xs) == 0:
        return image
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(image.width, int(xs.max()) + pad + 1)
    y1 = min(image.height, int(ys.max()) + pad + 1)
    return image.crop((x0, y0, x1, y1))


def align(poses: dict[str, Image.Image]) -> tuple[dict[str, Image.Image], dict[str, dict[str, int]]]:
    trimmed = {name: trim(image) for name, image in poses.items()}
    metrics = {name: hull_metrics(image) for name, image in trimmed.items()}
    target_hull = 640
    scaled = {}
    scaled_metrics = {}
    for name, image in trimmed.items():
        meta = metrics[name]
        hull_h = max(1, meta["hullBottom"] - meta["hullTop"])
        scale = target_hull / hull_h
        resized = image.resize(
            (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
            Image.Resampling.LANCZOS,
        )
        scaled[name] = resized
        scaled_metrics[name] = hull_metrics(resized)
    width = max(meta["width"] for meta in scaled_metrics.values()) + 8
    height = max(meta["height"] for meta in scaled_metrics.values()) + 8
    # Shared nose point. Extra room below covers the neutral flames.
    nose_x = width // 2
    nose_y = 6
    aligned = {}
    final_meta = {}
    for name, image in scaled.items():
        meta = scaled_metrics[name]
        canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        ox = nose_x - meta["noseX"]
        oy = nose_y - meta["noseY"]
        canvas.paste(image, (ox, oy), image)
        aligned[name] = canvas
        placed = hull_metrics(canvas)
        placed["offsetX"] = ox
        placed["offsetY"] = oy
        final_meta[name] = placed
    return aligned, final_meta


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"missing ship sheet: {SOURCE}")
    rgb = np.array(Image.open(SOURCE).convert("RGB"))
    split_x, split_y = panel_splits(rgb)
    height, width = rgb.shape[:2]
    panels = {
        "neutral": (0, 0, split_x, split_y),
        "bank-a": (split_x + 8, 0, width, split_y),
        "bank-b": (0, split_y + 8, split_x, height),
    }
    poses = {name: extract_pose(rgb, box) for name, box in panels.items()}
    # bank-a is the top-right panel, bank-b the bottom-left panel.
    # The nose stays near center; the bank shows up as the upper hull
    # shifting off the lower hull. Positive shift means the top sits to the right.
    named = {"neutral": poses["neutral"]}
    shifts = {}
    for key in ("bank-a", "bank-b"):
        image = trim(poses[key])
        arr = np.array(image)
        mask = arr[:, :, 3] > 40
        meta = hull_metrics(image)
        band = np.zeros_like(mask)
        band[meta["hullTop"] : meta["hullTop"] + 80, :] = True
        top = mask & band & (arr[:, :, 0] < 210)
        xs = np.nonzero(top)[1]
        lower = mask.copy()
        lower[: meta["hullBottom"] - 80, :] = False
        lower[meta["hullBottom"] :, :] = False
        base = np.nonzero(lower)[1]
        shift = float(np.median(xs) - np.median(base)) if len(xs) and len(base) else 0.0
        shifts[key] = shift
        print(key, "shift", round(shift, 2))
    # The panel whose top sits further right is the right bank.
    right_key = max(shifts, key=shifts.get)
    left_key = "bank-b" if right_key == "bank-a" else "bank-a"
    named["lean-right"] = poses[right_key]
    named["lean-left"] = poses[left_key]
    aligned, meta = align(named)
    OUT.mkdir(parents=True, exist_ok=True)
    files = {}
    for name, image in aligned.items():
        path = OUT / f"{name}.png"
        image.save(path)
        files[name] = str(path.relative_to(ROOT))
        opaque = int(np.array(image)[:, :, 3].max())
        print(name, image.size, "alphaMax", opaque, "nose", meta[name]["noseX"], meta[name]["noseY"])
    (OUT / "meta.json").write_text(json.dumps({"files": files, "poses": meta}, indent=2))
    if not ENEMY_SOURCE.exists():
        print(f"ENEMY_SOURCE_MISSING {ENEMY_SOURCE}")
        return
    print("enemy sheet present; extractor for the 5×5 board is a separate pass")


if __name__ == "__main__":
    main()
