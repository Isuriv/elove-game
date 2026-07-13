# ELOVE GAME — Lab Escape Demo

True **2D top-down HD-pixel** action-puzzle demo (vanilla Canvas 2D), following the game-only [Implementation Plan: ELOVE GAME](https://app.notion.com/p/399c98a9f7ff810585f8d820c1ef51f6).

You play a cat-girl Meow Hybrid waking in a cracked lab pod on Planet Nars: explore, slash cyborgs, solve a timed eye-key door puzzle, find a cryptic console’s hidden button, and escape.

## How to run

A local static server is **required** (ES modules):

```bash
cd /Users/isurividyarathne/Projects/elove-game
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080) and hard-refresh (`Cmd+Shift+R` / `Ctrl+Shift+R`).

Works fully offline — no CDN / Three.js dependency.

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Move (polled each frame; cleared on blur) |
| J / Space | Slash |
| E | Interact / grab / console / door |
| F | Cute-energy force-warp (toss cyborgs) |
| R | Restart run |
| M | Mute SFX |
| Enter | Start (title screen) |

## Objective loop

On-screen **OBJ** text updates as you progress. Glowing markers + labels highlight the pod, closet, marked cyborg, door, console, hidden button, and exit.

1. Wake in the cracked pod (west room) — brief tutorial toast after Enter
2. **Grab the sword** from the glowing closet (optional but strong)
3. **Defeat the marked cyborg** (cyan “KEY!” marker) — drops an **eye-key**
4. **Use the eye-key on the east door** before the timer burns out
5. Read the **console** (north) → find the **hidden pink button** SE of it
6. Step on the **green EXIT pad** beyond the door to win
7. Beat your **localStorage** best time — press **R** to instantly retry

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
