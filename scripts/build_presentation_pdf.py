# -*- coding: utf-8 -*-
"""Build a slide-style PDF presentation for Mars Love Blastar levels."""
from __future__ import annotations

from pathlib import Path

from fpdf import FPDF
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "screenshots" / "presentation"
OUT_DIR = ROOT / "docs"
OUT_PDF = OUT_DIR / "Mars-Love-Blastar-Levels.pdf"

W, H = 297, 210  # A4 landscape

BG = (18, 12, 28)
PANEL = (28, 20, 42)
PINK = (255, 105, 180)
CYAN = (80, 230, 255)
GOLD = (255, 204, 102)
TEXT = (245, 240, 250)
MUTED = (180, 170, 200)


class SlidePDF(FPDF):
    def __init__(self) -> None:
        super().__init__(orientation="L", unit="mm", format="A4")
        self.set_auto_page_break(auto=False)
        self.set_margins(0, 0, 0)

    def add_slide(self) -> None:
        self.add_page()
        self.set_fill_color(*BG)
        self.rect(0, 0, W, H, "F")
        self.set_fill_color(*PINK)
        self.rect(0, 0, W, 3.5, "F")
        self.set_fill_color(*CYAN)
        self.rect(0, H - 3.5, W, 3.5, "F")

    def footer_label(self, label: str) -> None:
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*MUTED)
        self.set_xy(12, H - 12)
        self.cell(80, 5, "Mars Love Blastar", align="L")
        self.set_xy(W - 92, H - 12)
        self.cell(80, 5, label, align="R")


def fit_image(path: Path, max_w: float, max_h: float) -> tuple[float, float]:
    with Image.open(path) as im:
        iw, ih = im.size
    scale = min(max_w / iw, max_h / ih)
    return iw * scale, ih * scale


def draw_title(pdf: SlidePDF) -> None:
    pdf.add_slide()
    pdf.set_fill_color(*PANEL)
    pdf.rect(28, 28, W - 56, H - 56, "F")

    pdf.set_font("Helvetica", "B", 42)
    pdf.set_text_color(*PINK)
    pdf.set_xy(0, 48)
    pdf.cell(W, 18, "MARS LOVE BLASTAR", align="C")

    pdf.set_font("Helvetica", "", 16)
    pdf.set_text_color(*CYAN)
    pdf.set_xy(0, 72)
    pdf.cell(W, 10, "Level Tour  |  How to Play", align="C")

    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(*TEXT)
    lines = [
        "A synthwave side-scroller across Planet Nars",
        "Four themed runs: canyon, cake, Gigafactory, Starbase",
        "Clear hostiles, grab power-ups, reach EXIT",
    ]
    y = 96
    for line in lines:
        pdf.set_xy(0, y)
        pdf.cell(W, 8, line, align="C")
        y += 10

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*MUTED)
    pdf.set_xy(0, 145)
    pdf.cell(W, 6, "ELOVE GAME  |  Canvas side-scroller  |  localhost:8081", align="C")
    pdf.footer_label("Title")


def draw_controls(pdf: SlidePDF) -> None:
    pdf.add_slide()
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(*CYAN)
    pdf.set_xy(18, 16)
    pdf.cell(0, 12, "How to Play")

    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*MUTED)
    pdf.set_xy(18, 30)
    pdf.cell(
        0,
        6,
        "Objective: defeat hostiles, stay off the toxic floor, step on the green EXIT pad.",
    )

    controls_l = [
        ("A / D  or  Arrows", "Move left / right"),
        ("W / Space / Up", "Jump"),
        ("J", "Slash (candy-cane neon blade)"),
        ("F", "Force-warp toss (knockback)"),
    ]
    controls_r = [
        ("R", "Restart run"),
        ("M", "Mute audio"),
        ("1 / 2 / 3 / 4", "Level select (title screen)"),
        ("Enter / J", "Start selected level"),
    ]

    def card(x: float, y: float, key: str, desc: str) -> None:
        pdf.set_fill_color(*PANEL)
        pdf.rect(x, y, 125, 22, "F")
        pdf.set_draw_color(*PINK)
        pdf.set_line_width(0.4)
        pdf.rect(x, y, 125, 22, "D")
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(*GOLD)
        pdf.set_xy(x + 4, y + 3)
        pdf.cell(117, 7, key)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(*TEXT)
        pdf.set_xy(x + 4, y + 12)
        pdf.cell(117, 6, desc)

    y0 = 42
    for i, (k, d) in enumerate(controls_l):
        card(18, y0 + i * 26, k, d)
    for i, (k, d) in enumerate(controls_r):
        card(154, y0 + i * 26, k, d)

    pdf.set_fill_color(*PANEL)
    pdf.rect(18, 152, 261, 28, "F")
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*PINK)
    pdf.set_xy(24, 156)
    pdf.cell(0, 6, "Pads & power-ups")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*TEXT)
    pdf.set_xy(24, 164)
    pdf.cell(
        0,
        6,
        "Purple grip | Cyan ice | Gold bounce   |   Guns auto-fire ~3s   |   Heart / shield / battery / magnet",
    )
    pdf.set_xy(24, 171)
    pdf.cell(0, 6, "L2-L4 themed collectibles: toffee | toys | moon/mars rocks")
    pdf.footer_label("Controls")


def draw_level(
    pdf: SlidePDF,
    num: int,
    name: str,
    subtitle: str,
    bullets: list[str],
    img_primary: Path,
    img_secondary: Path | None,
) -> None:
    pdf.add_slide()
    pdf.set_font("Helvetica", "B", 26)
    pdf.set_text_color(*PINK)
    pdf.set_xy(14, 12)
    pdf.cell(0, 11, f"Level {num}  -  {name}")

    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*CYAN)
    pdf.set_xy(14, 24)
    pdf.cell(0, 6, subtitle)

    max_w, max_h = 175, 130
    iw, ih = fit_image(img_primary, max_w, max_h)
    x, y = 14, 36
    pdf.set_fill_color(*PANEL)
    pdf.rect(x - 2, y - 2, iw + 4, ih + 4, "F")
    pdf.image(str(img_primary), x=x, y=y, w=iw, h=ih)

    bx = 200
    by = 36
    pdf.set_fill_color(*PANEL)
    pdf.rect(bx, by, 82, 130, "F")
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*GOLD)
    pdf.set_xy(bx + 5, by + 6)
    pdf.cell(72, 6, "Highlights")

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*TEXT)
    ty = by + 18
    for b in bullets:
        pdf.set_xy(bx + 5, ty)
        pdf.multi_cell(72, 5, f"-  {b}")
        ty = pdf.get_y() + 3

    if img_secondary and img_secondary.exists():
        sw, sh = fit_image(img_secondary, 72, 40)
        if ty + sh + 8 < by + 126:
            pdf.image(str(img_secondary), x=bx + 5, y=by + 126 - sh - 4, w=sw, h=sh)

    pdf.footer_label(f"Level {num}")


def draw_tips(pdf: SlidePDF) -> None:
    pdf.add_slide()
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(*CYAN)
    pdf.set_xy(18, 16)
    pdf.cell(0, 12, "Tips")

    tips = [
        ("Clear before EXIT", "EXIT stays locked until hostiles are down - FOES counter is your progress."),
        ("Candy-cane slash", "J swings a neon blade with a candy-cane overlay - close range, high impact."),
        ("Force-warp (F)", "Knock drones and bots back when crowded; battery loot shortens the cooldown."),
        ("Gun pickups", "Pistol, blaster, and cannon auto-fire for a few seconds - grab them mid-run."),
        ("Themed collectibles", "Cake toffee, Tesla toys, SpaceX moon/mars rocks - bonus flavor on L2-L4."),
        ("Boss finales", "L3 ends with the Carbot car-droid. L4 ends with the Rocket boss near EXIT."),
        ("Pads matter", "Grip, ice, and bounce pads change footing - read the color before you leap."),
        ("Beat your best", "Times save per level in localStorage - press R for an instant retry."),
    ]

    cols = 2
    card_w = 128
    card_h = 32
    gap = 6
    x0, y0 = 18, 36
    for i, (title, body) in enumerate(tips):
        col = i % cols
        row = i // cols
        x = x0 + col * (card_w + gap)
        y = y0 + row * (card_h + gap)
        pdf.set_fill_color(*PANEL)
        pdf.rect(x, y, card_w, card_h, "F")
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*GOLD)
        pdf.set_xy(x + 4, y + 3)
        pdf.cell(card_w - 8, 6, title)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*TEXT)
        pdf.set_xy(x + 4, y + 11)
        pdf.multi_cell(card_w - 8, 4.2, body)

    pdf.footer_label("Tips")


def draw_outro(pdf: SlidePDF) -> None:
    pdf.add_slide()
    pdf.set_fill_color(*PANEL)
    pdf.rect(40, 50, W - 80, 100, "F")
    pdf.set_font("Helvetica", "B", 32)
    pdf.set_text_color(*PINK)
    pdf.set_xy(0, 70)
    pdf.cell(W, 14, "Ready to blast?", align="C")
    pdf.set_font("Helvetica", "", 13)
    pdf.set_text_color(*TEXT)
    pdf.set_xy(0, 95)
    pdf.cell(W, 8, "cd elove-game   ->   python -m http.server 8081", align="C")
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(*CYAN)
    pdf.set_xy(0, 110)
    pdf.cell(W, 8, "Open  http://127.0.0.1:8081/?level=1 ... 4", align="C")
    pdf.footer_label("Play")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pdf = SlidePDF()

    draw_title(pdf)
    draw_controls(pdf)

    levels = [
        (
            1,
            "Nars Canyon",
            "Synthwave canyon run - clear the hostiles!",
            [
                "Opening level on Planet Nars",
                "Neon city / canyon backdrop",
                "Cyborgs + flying drones",
                "Standard loot: hearts, guns, magnet",
                "No themed collectibles",
                "Reach green EXIT when clear",
            ],
            SHOTS / "level-1-nars-canyon-gameplay.png",
            SHOTS / "level-1-nars-canyon-deeper.png",
        ),
        (
            2,
            "Cake Realm",
            "Frosting skies & pastry floaters",
            [
                "Dessert dreamscape backdrop",
                "Cupcakes, macarons, croissants",
                "Cyborgs, drones, Optimus foes",
                "Collect toffee across platforms",
                "10 hostiles to clear",
                "Unlocks Tesla Works on win",
            ],
            SHOTS / "level-2-cake-realm-gameplay.png",
            SHOTS / "level-2-cake-realm-start.png",
        ),
        (
            3,
            "Tesla Works",
            "Gigafactory skies - cars in the clouds",
            [
                "Factory / skyline plates",
                "Floating Tesla vehicle art",
                "Optimus + drones + cyborgs",
                "Collect toy pickups (L3)",
                "Boss: Carbot car-droid at EXIT",
                "Unlocks SpaceX Ascent on win",
            ],
            SHOTS / "level-3-tesla-works-gameplay.png",
            SHOTS / "level-3-tesla-works-start.png",
        ),
        (
            4,
            "SpaceX Ascent",
            "Starbase skies - rockets on the rise",
            [
                "Launchpad / rocket backdrop",
                "Falcon-style cartoon rockets",
                "Moon rock & Mars rock loot",
                "Optimus + drones + cyborgs",
                "Boss: Rocket boss near EXIT",
                "Finale of the four-level tour",
            ],
            SHOTS / "level-4-spacex-ascent-gameplay.png",
            SHOTS / "level-4-spacex-ascent-deeper.png",
        ),
    ]

    for num, name, sub, bullets, primary, secondary in levels:
        if not primary.exists():
            raise SystemExit(f"Missing screenshot: {primary}")
        draw_level(pdf, num, name, sub, bullets, primary, secondary)

    draw_tips(pdf)
    draw_outro(pdf)

    pdf.output(str(OUT_PDF))
    print(f"Wrote {OUT_PDF}")
    print(f"Pages: {pdf.page}")


if __name__ == "__main__":
    main()
