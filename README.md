# ELOVE GAME

> **Cross-chat context:** See [`CHAT-HANDOFF.md`](./CHAT-HANDOFF.md) for the current side-scroller state, asset paths, decisions, and how to load this into a new Cursor conversation. Also searchable via MCP `user-rag-context-memory` -> `search_chat_history` ("Mars Love Blastar elove-game").

Playable **2D Canvas side-scroller** (synthwave / Planet Nars). Native framebuffer **480x270**, integer nearest-neighbor upscale.

## How to run

```powershell
Set-Location "C:\Users\ethra\Documents\Elove\Mars Love Blastar\elove-game"
python -m http.server 8081
```

Open http://localhost:8081/ and hard-refresh (`Ctrl+Shift+R`).

## Controls

| Key | Action |
|-----|--------|
| A/D or arrows | Move |
| W / Space / Up | Jump |
| J | Slash |
| F | Force-warp toss |
| R | Restart |
| M | Mute |
| Enter | Start (title) |

## Objective

Clear drones & cyborgs, stay off the **toxic fluid** floor, reach **EXIT**.

For full architecture, art pipeline, and prior chat decisions -> **[CHAT-HANDOFF.md](./CHAT-HANDOFF.md)**.

---

## Legacy note

Older README content described a top-down lab-escape demo and/or Three.js blaster. Archives live under `archive/`. Current live game is the side-scroller above.

6. Step on the **green EXIT pad** beyond the door to win
7. Beat your **localStorage** best time - press **R** to instantly retry

## Project layout

```
elove-game/
  index.html          # canvas host + HTML HUD overlays
  css/style.css
  js/config.js        # palette, constants, tile ids
  js/stubs.js         # Phase 4 API stubs (inactive)
  js/audio.js         # Web Audio SFX + chiptune bed
  js/world.js         # lab tilemap + collision
  js/entities.js      # player + cyborg logic
  js/sprites.js       # procedural HD-pixel sprite baking
  js/render2d.js      # Canvas 2D scene, camera, markers, VFX
  js/game.js          # loop, puzzles, score, HUD
  js/main.js          # entry: input + render loop
  README.md
```

## Tech notes

- **Vanilla Canvas 2D** (no p5.js / Three.js on the playable path)
- Procedural **HD-pixel** sprites (nearest-neighbor, detailed cat-girl / cyborgs / lab tiles)
- Pixel-perfect camera follow with integer scroll
- Open top-down lab (no roofs / tunnels hiding the player)
- HTML/CSS HUD for timer, inventory, objectives, console, and end screens
- Palette: pink / cyan / purple / gold

## Implemented vs stubbed

**Implemented**

- 2D lab (walls, floors, pod, closet, console, door, exit pad)
- Procedural HD-pixel cat-girl player and cyborg enemies
- Movement + follow camera
- Slash combat + sword power-up + force-warp
- Timed eye-key puzzle + door unlock
- Cryptic console + hidden button
- Escape win / death, run timer, **R** restart, high-score via `localStorage`
- Objective hints + glowing markers
- Web Audio SFX + looping bed

**Stubbed / deferred (Phase 4+)**

- Infection / item sabotage
- God/AI sabotage hooks
- Dimensional shift
- Summon assist / OP mode
- Partner-cat 2P, multiplanet progression

## Notion sources

- Plan: https://app.notion.com/p/399c98a9f7ff810585f8d820c1ef51f6
- Spec (game data reference): https://app.notion.com/p/218c98a9f7ff80939736cdb22ce9343d
