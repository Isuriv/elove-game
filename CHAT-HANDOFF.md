# ELOVE Game - Chat Handoff / Context Export

> **For future Cursor chats:** If the user asks for "previous game chat information," "Mars Love Blastar context," or "elove-game handoff," read this file first and/or call MCP `user-rag-context-memory` -> `search_chat_history` with queries like `Mars Love Blastar elove-game side scroller`.

| Field | Value |
|--------|--------|
| **Project** | Mars Love Blastar -> playable game in `elove-game/` |
| **Chat id** | `ac6d68ef-69c9-4014-be32-d9e57fcffa8c` |
| **Repo** | `https://github.com/Isuriv/elove-game` (local: `elove-game/`) |
| **Serve** | `python -m http.server 8081` (or `8080`) from `elove-game/` |
| **URL** | http://localhost:8081/ |
| **Last focus** | 2D Canvas side-scroller (synthwave), not the archived Three.js blaster |

---

## What the game is

Vanilla **Canvas 2D** side-scroller at native **480x270**, integer CSS upscale (nearest-neighbor), cyberpunk/synthwave look.

**Controls:** A/D move - W/Space/Up jump - J slash - F force-warp - R restart - M mute

**Goal:** Clear drones & cyborgs, reach EXIT. Bottom of the level is a **toxic acid sea** (hurts on contact); stay on platforms.

---

## Key paths

| What | Path |
|------|------|
| Entry | `index.html`, `js/main.js` |
| Config / tiles | `js/config.js` (`TILE.TOXIC = 5`) |
| World / collision | `js/world.js` |
| Entities | `js/entities.js` |
| Game loop | `js/game.js` |
| Renderer | `js/render2d.js` |
| Assets loader | `js/assets.js` |
| Neon / BG bake | `js/neon.js` |
| Anim timing | `js/anim.js` |
| Grok video pipeline | `scripts/grok-video-sprites.mjs` |
| Clean / pixelate scripts | `scripts/clean-sprite-frames.mjs`, `scripts/grok-pixelate-frames.mjs`, `scripts/grok-clean-frames.mjs` |
| Screenshots | `screenshots/pixel-diag-*.png` |

### Animation frames (game loads these first)

`assets/imagine/frames/video/`

- `player-cat-rocket/` - `idle`, `fly`, `slash`, `hurt`
- `enemy-drone/` - `fly`, `hurt`
- `enemy-cyborg/` - `idle`, `walk`, `attack`, `hurt`
- `pickup-blade/` - `spin`

Sheets + manifest: `assets/imagine/sheets/`  
Videos: `assets/imagine/video/`

---

## In-game sprite footprints (current)

| Asset | Box (WxH) |
|--------|-----------|
| Player (white chibi cat) | 52x39 |
| Drone | 42x29 |
| Cyborg | 31x42 |
| Blade / power-ups | 21x21 |
| Cable | 12x28 |

Frames are **bottom-aligned** in their boxes so feet sit on platforms. Draw foot offset ~ **13px** in `_drawSprite`.

---

## Decisions & fixes from this chat arc

1. **Art pipeline:** Prefer Grok Imagine **video** -> extract frames -> named folders -> sheets. Time-based `holdMs` playback.
2. **Player:** White chibi cat on rocket; neon outline was baked then user asked to remove neon outlines from assets (runtime outline off by default).
3. **Pixel crawl:** Caused by non-integer CSS scale (~1.99x). Fixed with **integer scale** display + content-box wrap + snapped draw/bob.
4. **View size:** Was capped at 960x540; now largest integer scale that fits the window.
5. **Toxic floor:** Bottom rows are `TILE.TOXIC` (not walkable); platforms + short solid pads for cyborgs; contact damages player.
6. **Atmosphere:** Mountains, cloud bank, parallax **flying cars** in `js/neon.js` / `_drawSky`.
7. **API key:** User pasted `XAI_API_KEY` in chat for Grok scripts - **do not commit**; use `$env:XAI_API_KEY`; rotate when done.
8. **Git:** Commits live in `elove-game/` (not parent folder). Pushed to `origin/master` earlier in the arc.

---

## Archives (do not confuse with live game)

- `archive/2d-side-scroller/` - older 2D snapshot  
- `archive/animated-assets/` - Grok sheet/video archive  
- Older chats also mention a **Three.js continual blaster**; current `index.html` / `main.js` path is **Scene2D side-scroller** again unless switched later.

---

## How to pull this into another conversation

1. **Ask in chat:** "Load previous Mars Love Blastar / elove-game chat context" or "search previous game chat."
2. **Agent should:**
   - Read `elove-game/CHAT-HANDOFF.md` (this file)
   - Call MCP `search_chat_history` on server `user-rag-context-memory` with query `Mars Love Blastar elove-game side scroller toxic platforms`
3. **Optional:** Copy this file into the new chat, or open it in the IDE so it's in context.

---

## Open / nice-to-have

- Neon outlines on sprites: user requested removal; confirm frames are outline-free after harden passes  
- Toxic / foot-sit / BG aesthetics: verify after hard-refresh; tune further if still floating  
- Grok Imagine edits can drift art (e.g. skateboard); prefer local harden over aggressive Grok pixelate when preserving subject  

---

*Generated for cross-chat handoff. Update this file when major gameplay or art pipeline decisions change.*
