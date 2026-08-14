"""Capture gameplay screenshots for all Mars Love Blastar levels."""
from __future__ import annotations

import time
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8081"
OUT = Path(__file__).resolve().parents[1] / "screenshots" / "presentation"
LEVELS = [
    {"id": 1, "slug": "level-1-nars-canyon", "url": f"{BASE}/?level=1", "auto_start": False},
    {"id": 2, "slug": "level-2-cake-realm", "url": f"{BASE}/?level=2", "auto_start": True},
    {"id": 3, "slug": "level-3-tesla-works", "url": f"{BASE}/?level=3", "auto_start": True},
    {"id": 4, "slug": "level-4-spacex-ascent", "url": f"{BASE}/?level=4", "auto_start": True},
]


def ensure_playing(page, auto_start: bool) -> None:
    page.wait_for_function(
        "() => window.__ELOVE && window.__ELOVE.Game && typeof window.__ELOVE.Game.getMode === 'function'",
        timeout=20000,
    )
    page.wait_for_timeout(800)
    mode = page.evaluate("() => window.__ELOVE.Game.getMode()")
    if mode == "title" or not auto_start:
        page.keyboard.press("Enter")
        page.wait_for_timeout(400)
        # Wake animation then PLAY
        page.wait_for_function(
            "() => { const m = window.__ELOVE.Game.getMode(); return m === 'play' || m === 'wake'; }",
            timeout=8000,
        )
        page.wait_for_timeout(1400)
    else:
        page.wait_for_function(
            "() => { const m = window.__ELOVE.Game.getMode(); return m === 'play' || m === 'wake'; }",
            timeout=8000,
        )
        page.wait_for_timeout(1400)


def run_and_shoot(page, slug: str) -> list[Path]:
    saved: list[Path] = []
    wrap = page.locator("#game-wrap")
    wrap.wait_for(state="visible")

    # Start-of-level aesthetic
    start_path = OUT / f"{slug}-start.png"
    wrap.screenshot(path=str(start_path))
    saved.append(start_path)

    # Walk into the level to show platforms / enemies / theme
    page.keyboard.down("KeyD")
    page.wait_for_timeout(2200)
    page.keyboard.up("KeyD")
    page.wait_for_timeout(200)
    page.keyboard.press("KeyJ")
    page.wait_for_timeout(250)

    mid_path = OUT / f"{slug}-gameplay.png"
    wrap.screenshot(path=str(mid_path))
    saved.append(mid_path)

    # Nudge further for a second mid-run angle
    page.keyboard.down("KeyD")
    page.wait_for_timeout(1800)
    page.keyboard.press("Space")
    page.wait_for_timeout(400)
    page.keyboard.up("KeyD")
    page.wait_for_timeout(200)

    deep_path = OUT / f"{slug}-deeper.png"
    wrap.screenshot(path=str(deep_path))
    saved.append(deep_path)
    return saved


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    all_saved: list[Path] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1400, "height": 900},
            device_scale_factor=1,
        )
        page = context.new_page()
        for lvl in LEVELS:
            print(f"Capturing level {lvl['id']}…")
            page.goto(lvl["url"], wait_until="networkidle", timeout=60000)
            ensure_playing(page, lvl["auto_start"])
            saved = run_and_shoot(page, lvl["slug"])
            all_saved.extend(saved)
            for path in saved:
                print(f"  wrote {path}")
        # Title screen (default / no autoplay) for cover slide
        page.goto(f"{BASE}/?level=1", wait_until="networkidle", timeout=60000)
        page.wait_for_function(
            "() => window.__ELOVE && window.__ELOVE.Game.getMode() === 'title'",
            timeout=15000,
        )
        page.wait_for_timeout(600)
        title_path = OUT / "title-screen.png"
        page.locator("#game-wrap").screenshot(path=str(title_path))
        all_saved.append(title_path)
        print(f"  wrote {title_path}")
        browser.close()
    print(f"Done — {len(all_saved)} screenshots in {OUT}")


if __name__ == "__main__":
    main()
