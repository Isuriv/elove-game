"""Capture title + all theme screenshots for aesthetic review (2026-08-11)."""
from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8081"
OUT = Path(__file__).resolve().parents[1] / "screenshots" / "aesthetic-review-20260811"
SHOTS = [
    {"slug": "00-title", "url": f"{BASE}/", "start": False},
    {"slug": "01-ultra-earth", "url": f"{BASE}/?level=1", "start": True},
    {"slug": "02-cake-realm", "url": f"{BASE}/?level=2", "start": True},
    {"slug": "025-boring", "url": f"{BASE}/?level=2.5", "start": True},
    {"slug": "0255-neuralink", "url": f"{BASE}/?level=2.55", "start": True},
    {"slug": "03-tesla", "url": f"{BASE}/?level=3", "start": True},
    {"slug": "04-spacex", "url": f"{BASE}/?level=4", "start": True},
    {"slug": "045-moon", "url": f"{BASE}/?level=4.5", "start": True},
    {"slug": "05-starship", "url": f"{BASE}/?level=5", "start": True},
]


def wait_game(page) -> None:
    page.wait_for_function(
        "() => window.__ELOVE && window.__ELOVE.Game && typeof window.__ELOVE.Game.getMode === 'function'",
        timeout=30000,
    )
    page.wait_for_timeout(1200)


def ensure_playing(page) -> None:
    wait_game(page)
    mode = page.evaluate("() => window.__ELOVE.Game.getMode()")
    if mode == "title":
        page.keyboard.press("Enter")
        page.wait_for_timeout(500)
    page.wait_for_function(
        "() => { const m = window.__ELOVE.Game.getMode(); return m === 'play' || m === 'wake'; }",
        timeout=12000,
    )
    page.wait_for_timeout(1600)


def shoot_wrap(page, path: Path) -> None:
    wrap = page.locator("#game-wrap")
    wrap.wait_for(state="visible")
    wrap.screenshot(path=str(path))
    print(f"  wrote {path.name}")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1600, "height": 1000},
            device_scale_factor=1,
        )
        page = context.new_page()

        # Title (stay on title)
        print("Capturing title…")
        page.goto(SHOTS[0]["url"], wait_until="networkidle", timeout=90000)
        wait_game(page)
        page.wait_for_function(
            "() => window.__ELOVE.Game.getMode() === 'title'",
            timeout=15000,
        )
        page.wait_for_timeout(800)
        shoot_wrap(page, OUT / "00-title.png")

        for shot in SHOTS[1:]:
            print(f"Capturing {shot['slug']}…")
            page.goto(shot["url"], wait_until="networkidle", timeout=90000)
            ensure_playing(page)
            shoot_wrap(page, OUT / f"{shot['slug']}-start.png")
            page.keyboard.down("KeyD")
            page.wait_for_timeout(2400)
            page.keyboard.up("KeyD")
            page.wait_for_timeout(300)
            page.keyboard.press("KeyJ")
            page.wait_for_timeout(200)
            shoot_wrap(page, OUT / f"{shot['slug']}-gameplay.png")

        # Optional gallery
        print("Capturing gallery…")
        page.goto(f"{BASE}/gallery.html", wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(800)
        page.screenshot(path=str(OUT / "99-gallery.png"), full_page=True)
        print("  wrote 99-gallery.png")

        browser.close()
    print(f"Done — screenshots in {OUT}")


if __name__ == "__main__":
    main()
