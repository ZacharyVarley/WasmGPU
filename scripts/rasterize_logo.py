"""
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""

from __future__ import annotations
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ASSETS = Path("assets")
OUT_LIGHTMODE = ASSETS / "logo-lightmode.png"
OUT_DARKMODE = ASSETS / "logo-darkmode.png"
OUT_FAVICON = ASSETS / "favicon.png"
FONT_PATH = ASSETS / "fonts" / "Montserrat-Medium.ttf"

SVG_VIEWBOX = 768.0
TEXT = "WasmGPU"
TEXT_CENTER = (390.0, 540.0)
TEXT_SIZE_VB = 140.0
C1 = "#005a9c"
C2 = "#3355c6"
C3 = "#654ff0"
C4 = "#8472f3"
C5 = "#9b8df5"
TRI_W1 = [(20.000, 140.000), (380.000, 140.000), (200.000, 451.769)]
TRI_W2 = [(380.000, 140.000), (290.000, 295.885), (470.000, 295.885)]
TRI_W3 = [(380.000, 451.769), (290.000, 295.885), (470.000, 295.885)]
TRI_W4 = [(470.000, 295.885), (425.000, 217.942), (515.000, 217.942)]
TRI_W5 = [(470.000, 140.000), (425.000, 217.942), (515.000, 217.942)]
TRI_A1 = [(510.000, 295.885), (420.000, 451.769), (600.000, 451.769)]
TRI_A2 = [(600.000, 140.000), (510.000, 295.885), (690.000, 295.885)]
TRI_A3 = [(600.000, 295.885), (690.000, 295.885), (645.000, 373.827)]
TRI_A4 = [(690.000, 295.885), (645.000, 373.827), (735.000, 373.827)]
TRI_A5 = [(645.000, 373.827), (735.000, 373.827), (690.000, 451.769)]
TRIS: list[tuple[list[tuple[float, float]], str]] = [
    (TRI_W1, C1),
    (TRI_W2, C2),
    (TRI_W3, C3),
    (TRI_W4, C4),
    (TRI_W5, C5),
    (TRI_A1, C5),
    (TRI_A2, C4),
    (TRI_A3, C3),
    (TRI_A4, C2),
    (TRI_A5, C1),
]

def vb_to_px(pt: tuple[float, float], scale: float) -> tuple[int, int]:
    return (int(round(pt[0] * scale)), int(round(pt[1] * scale)))

def draw_centered_text(draw: ImageDraw.ImageDraw, text: str, center_xy: tuple[float, float], font: ImageFont.FreeTypeFont, fill: str, scale: float) -> None:
    cx, cy = center_xy
    cx_px = cx * scale
    cy_px = cy * scale
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = int(round(cx_px - w / 2 - bbox[0]))
    y = int(round(cy_px - h / 2 - bbox[1]))
    draw.text((x, y), text, font=font, fill=fill)

def tri_bounds(tris: list[tuple[list[tuple[float, float]], str]]) -> tuple[float, float, float, float]:
    xs: list[float] = []
    ys: list[float] = []
    for pts, _ in tris:
        for x, y in pts:
            xs.append(x)
            ys.append(y)
    return (min(xs), min(ys), max(xs), max(ys))

def render_logo_png(out_path: Path, size_px: int, text_fill: str | None, supersample: int = 2) -> None:
    render_size = size_px * supersample
    scale = render_size / SVG_VIEWBOX
    img = Image.new("RGBA", (render_size, render_size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for pts, color in TRIS:
        pts_px = [vb_to_px(p, scale) for p in pts]
        d.polygon(pts_px, fill=color)
    if text_fill is not None:
        if not FONT_PATH.exists():
            raise FileNotFoundError(f"Font not found at {FONT_PATH}. Put Montserrat-Medium.ttf there, or change FONT_PATH.")
        font_size_px = max(1, int(round(TEXT_SIZE_VB * scale)))
        font = ImageFont.truetype(str(FONT_PATH), font_size_px)
        draw_centered_text(d, TEXT, TEXT_CENTER, font, text_fill, scale)
    if supersample != 1:
        img = img.resize((size_px, size_px), Image.LANCZOS)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path)

def render_favicon_png(out_path: Path, size_px: int = 144, supersample: int = 4) -> None:
    render_size = size_px * supersample * 6
    scale = render_size / SVG_VIEWBOX
    img = Image.new("RGBA", (render_size, render_size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for pts, color in TRIS:
        pts_px = [vb_to_px(p, scale) for p in pts]
        d.polygon(pts_px, fill=color)
    l, t, r, b = tri_bounds(TRIS)
    crop_box = (
        int(math.floor(l * scale)),
        int(math.floor(t * scale)),
        int(math.ceil(r * scale)),
        int(math.ceil(b * scale)),
    )
    tri_img = img.crop(crop_box)
    canvas = Image.new("RGBA", (size_px, size_px), (0, 0, 0, 0))
    tri_w, tri_h = tri_img.size
    s = min(size_px / tri_w, size_px / tri_h)
    new_w = max(1, int(round(tri_w * s)))
    new_h = max(1, int(round(tri_h * s)))
    tri_small = tri_img.resize((new_w, new_h), Image.LANCZOS)
    x = (size_px - new_w) // 2
    y = (size_px - new_h) // 2
    canvas.paste(tri_small, (x, y), tri_small)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out_path)

def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    render_logo_png(OUT_LIGHTMODE, size_px=1024, text_fill="#000000", supersample=2)
    render_logo_png(OUT_DARKMODE, size_px=1024, text_fill="#ffffff", supersample=2)
    render_favicon_png(OUT_FAVICON, size_px=144, supersample=4)
    print("Wrote:")
    print(f" - {OUT_LIGHTMODE}")
    print(f" - {OUT_DARKMODE}")
    print(f" - {OUT_FAVICON}")

if __name__ == "__main__":
    main()
