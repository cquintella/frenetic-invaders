"""Cut six approved cells from the 5×5 enemy board into sprites with real alpha.

The game ships A1, B1, D1, E2, C4 and E3. The other cells are not written.


Source is the file delivered in the workspace uploads folder. The sheet has
a metal grid, a title, corner labels and a starfield. Those go. The creature,
including thin legs and the black ink around them, stays.

The ship sheet in the same delivery is byte-identical to
img/Gemini_Generated_Image_72490g72490g7249.jpg, so the three poses already
cut from that file are kept.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE_CANDIDATES = [
    ROOT / "art" / "sources" / "enemies.png",
    Path("/home/ubuntu/.cursor/projects/workspace/uploads/enemies_9c81.png"),
]
OUT = ROOT / "public" / "sprites" / "aliens"

# Measured metal dividers on the 1312×1199 board. Inclusive start, exclusive end.
COL_EDGES = [10, 274, 536, 795, 1059, 1302]
ROW_EDGES = [87, 289, 492, 701, 910, 1175]


def dilate(mask: np.ndarray, radius: int) -> np.ndarray:
    height, width = mask.shape
    padded = np.pad(mask, radius, constant_values=False)
    out = np.zeros_like(mask)
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx * dx + dy * dy > radius * radius:
                continue
            out |= padded[radius + dy : radius + dy + height, radius + dx : radius + dx + width]
    return out


def components(mask: np.ndarray) -> list[list[tuple[int, int]]]:
    height, width = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    found: list[list[tuple[int, int]]] = []
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys.tolist(), xs.tolist()):
        if seen[y0, x0]:
            continue
        stack = [(y0, x0)]
        seen[y0, x0] = True
        pixels: list[tuple[int, int]] = []
        while stack:
            y, x = stack.pop()
            pixels.append((y, x))
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if ny < 0 or nx < 0 or ny >= height or nx >= width:
                    continue
                if seen[ny, nx] or not mask[ny, nx]:
                    continue
                seen[ny, nx] = True
                stack.append((ny, nx))
        found.append(pixels)
    return found


def flood(walkable: np.ndarray) -> np.ndarray:
    height, width = walkable.shape
    bg = np.zeros_like(walkable)
    stack: list[tuple[int, int]] = []
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


def label_mask(rgb: np.ndarray) -> np.ndarray:
    """Yellow corner tag such as A1. The letters are broken by black ink, so
    the whole corner patch is taken instead of one connected component."""
    height, width = rgb.shape[:2]
    red = rgb[:, :, 0].astype(np.int16)
    green = rgb[:, :, 1].astype(np.int16)
    blue = rgb[:, :, 2].astype(np.int16)
    text = (red > 200) & (green > 150) & (blue < 150) & (red > blue + 70)
    zone = np.zeros((height, width), dtype=bool)
    zone[: int(height * 0.22), : int(width * 0.42)] = True
    hit = text & zone
    if not 20 <= int(hit.sum()) <= 1600:
        return np.zeros((height, width), dtype=bool)
    return hit


def near(pixels: list[tuple[int, int]], boxes: list[tuple[int, int, int, int]], pad: int) -> bool:
    if not boxes:
        return False
    for y, x in pixels[::3]:
        for y0, y1, x0, x1 in boxes:
            if y0 - pad <= y <= y1 + pad and x0 - pad <= x <= x1 + pad:
                return True
    return False


def extract_cell(rgb: np.ndarray) -> np.ndarray:
    red = rgb[:, :, 0].astype(np.int16)
    green = rgb[:, :, 1].astype(np.int16)
    blue = rgb[:, :, 2].astype(np.int16)
    chroma = np.maximum(np.maximum(red, green), blue) - np.minimum(np.minimum(red, green), blue)
    avg = rgb.mean(axis=2)
    height, width = rgb.shape[:2]
    tag = label_mask(rgb)
    # Open sky is blue with almost no red. Blue armor carries more red, or a highlight.
    open_sky = (red < 32) & (blue > red + 28) & (avg < 85)
    paint = (chroma > 40) & (avg > 34) & (avg < 248) & ~open_sky & ~tag
    # Pale membranes (the B2 wings) are gray, not blue sky and not a star.
    membrane = (chroma < 36) & (avg > 48) & (avg < 248) & ~tag & ~open_sky
    kept = np.zeros(paint.shape, dtype=bool)
    boxes: list[tuple[int, int, int, int]] = []
    pending: list[list[tuple[int, int]]] = []
    for pixels in components(paint):
        ys = [p[0] for p in pixels]
        xs = [p[1] for p in pixels]
        box = (min(ys), max(ys), min(xs), max(xs))
        if len(pixels) >= 80 and min(ys) < height * 0.9:
            boxes.append(box)
            for y, x in pixels:
                kept[y, x] = True
        elif len(pixels) >= 16:
            pending.append(pixels)
    for pixels in pending:
        ys = [p[0] for p in pixels]
        if min(ys) > height * 0.9 and not near(pixels, boxes, 5):
            continue
        if near(pixels, boxes, 10):
            for y, x in pixels:
                kept[y, x] = True
    for pixels in components(membrane):
        ys = [p[0] for p in pixels]
        # Floor rubble is dull and sits under the feet. Wings do not.
        if min(ys) > height * 0.82 and not near(pixels, boxes, 4):
            continue
        if len(pixels) >= 70 or near(pixels, boxes, 8):
            for y, x in pixels:
                kept[y, x] = True
            boxes.append((min(ys), max(ys), min(p[1] for p in pixels), max(p[1] for p in pixels)))
    # Black contour and the gray shadow pressed against it. Blue sky is not black.
    # The rocky floor is the same dull color as a shadow. A limb that reaches
    # it is saturated; the rubble is not. Leaving the rubble in seals the
    # starfield between tentacles so the flood cannot enter.
    floor = np.zeros(paint.shape, dtype=bool)
    floor[int(height * 0.84) :, :] = True
    limb = (chroma > 46) & (avg > 40)
    kept[floor & ~limb] = False
    # Dark blue armor between two plates is the same color family as the sky.
    # Keep it only when paint sits a few pixels away on both sides, which is a
    # limb, not the open starfield.
    def spans(mask: np.ndarray, dist: int) -> np.ndarray:
        left = np.zeros_like(mask)
        right = np.zeros_like(mask)
        up = np.zeros_like(mask)
        down = np.zeros_like(mask)
        for step in range(1, dist + 1):
            left[:, step:] |= mask[:, :-step]
            right[:, :-step] |= mask[:, step:]
            up[step:, :] |= mask[:-step, :]
            down[:-step, :] |= mask[step:, :]
        return (left & right) | (up & down)

    bridge = spans(kept, 5) & open_sky & (red >= 12) & (avg > 28) & (avg < 88)
    kept |= bridge
    dark = np.maximum(np.maximum(red, green), blue) < 26
    shadow = (chroma < 32) & (avg < 58) & (avg > 6) & ~open_sky
    touch = dilate(kept, 3)
    claimed = kept | (touch & dark) | (dilate(kept, 2) & shadow)
    claimed[floor & ~dilate(limb & kept, 2)] = False
    # A black contour is a wall even when it sits far from the bright plates.
    # Without that, the flood walks through the line and deletes the dark limb.
    ink = np.maximum(np.maximum(red, green), blue) < 24
    claimed |= ink & ~tag
    outside = flood(~claimed)
    # The tag is cleared even where its ink touched a dilated shadow.
    alpha = np.where(outside | tag, 0, 255).astype(np.uint8)
    alpha[dilate(tag, 2) & ~dilate(kept, 1)] = 0
    # Navy pockets between legs are the starfield, not the ink. Ink and armor
    # sit against the paint; a pocket does not.
    opaque = alpha > 0
    body = opaque & (((chroma > 40) & (avg > 45)) | ((chroma < 34) & (avg > 55) & (avg < 245)))
    navy = (
        opaque
        & (red < 24)
        & (blue < 70)
        & (blue > red + 14)
        & (green < 48)
        & (avg < 42)
        & (chroma > 12)
        & ~dilate(body, 2)
    )
    # Only navy that already touches the cleared sky. Interior armor stays.
    alpha[navy & dilate(alpha == 0, 2)] = 0
    # Starfield sealed between warm limbs (the D5 tripod). A blue creature
    # keeps those pixels: they are its armor, not the sky.
    opaque = alpha > 0
    blue_body = opaque & (blue > red + 12) & (blue + 6 >= green)
    warm_body = opaque & (red > blue + 8) & (chroma > 16)
    if int(warm_body.sum()) > int(blue_body.sum()):
        ink_px = opaque & (avg < 22) & (chroma < 14)
        protector = warm_body | dilate(warm_body, 1) | ink_px
        sky_pocket = opaque & (blue > red + 16) & (red < 48) & (avg < 110) & ~protector
        alpha[sky_pocket] = 0
        # A dull band that is wider than the legs is the rocky floor.
        # Saturated toes inside that band stay.
        floor_top = None
        for y in range(height - 1, int(height * 0.78), -1):
            row = alpha[y] > 0
            if int(row.sum()) < 8:
                if floor_top is not None:
                    break
                continue
            dull = float(np.median(chroma[y][row])) < 36
            if float(row.mean()) > 0.58 and dull:
                floor_top = y
            elif floor_top is not None:
                break
        if floor_top is not None:
            toes = dilate((chroma > 44) & (avg > 48) & (alpha > 0), 2)
            below = np.zeros_like(toes)
            below[floor_top:, :] = True
            alpha[below & ~toes] = 0
    foot = np.zeros(paint.shape, dtype=bool)
    foot[int(height * 0.93) :, :] = True
    alpha[foot & ~dilate(body, 3)] = 0
    rgb = rgb.copy()
    rgb[alpha == 0] = 0
    return np.dstack([rgb, alpha])


def trim(image: Image.Image, pad: int = 2) -> Image.Image:
    arr = np.array(image)
    ys, xs = np.nonzero(arr[:, :, 3] > 16)
    if len(xs) == 0:
        return image
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(image.width, int(xs.max()) + pad + 1)
    y1 = min(image.height, int(ys.max()) + pad + 1)
    return image.crop((x0, y0, x1, y1))


def main() -> None:
    source = next((path for path in SOURCE_CANDIDATES if path.exists()), None)
    if source is None:
        raise SystemExit(f"missing enemy board: {SOURCE_CANDIDATES[0]}")
    board = np.array(Image.open(source).convert("RGBA"))
    OUT.mkdir(parents=True, exist_ok=True)
    shipped = {"A1", "B1", "D1", "E2", "C4", "E3"}
    report = []
    for row in range(5):
        for col in range(5):
            name = f"{'ABCDE'[col]}{row + 1}"
            if name not in shipped:
                continue
            y0, y1 = ROW_EDGES[row] + 4, ROW_EDGES[row + 1] - 4
            x0, x1 = COL_EDGES[col] + 4, COL_EDGES[col + 1] - 4
            rgba = extract_cell(board[y0:y1, x0:x1, :3])
            image = trim(Image.fromarray(rgba, "RGBA"))
            alpha = np.array(image)[:, :, 3]
            opaque = int((alpha > 16).sum())
            transparent = int((alpha == 0).sum())
            image.save(OUT / f"{name}.png")
            report.append({"id": name, "w": image.width, "h": image.height, "opaque": opaque, "clear": transparent})
            print(f"{name} {image.size} opaque {opaque} clear {transparent}")
    for stale in OUT.glob("*.png"):
        if stale.stem not in shipped:
            stale.unlink()
    (OUT / "index.json").write_text(json.dumps(report, indent=2) + "\n")
    if len(report) != 25 or any(item["opaque"] < 800 for item in report):
        raise SystemExit("a cell came out empty or the board was not 5×5")


if __name__ == "__main__":
    main()
