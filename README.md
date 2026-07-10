# ELOVE GAME — Lab Escape Demo

Smooth **3D action-puzzle** demo built with **Three.js**, following the game-only [Implementation Plan: ELOVE GAME](https://app.notion.com/p/399c98a9f7ff810585f8d820c1ef51f6).

You play a cat-girl Meow Hybrid waking in a cracked lab pod on Planet Nars: explore, slash cyborgs, solve a timed eye-key door puzzle, find a cryptic console’s hidden button, and escape.

## How to run

A local static server is **required** (ES modules + Three.js CDN import map):

```bash
cd /Users/isurividyarathne/Projects/elove-game
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).

Requires network once to load Three.js from the CDN (`cdn.jsdelivr.net`).

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Move (only while held; cleared on blur) |
| J / Space | Slash |
| E | Interact / grab / console / door |
| F | Cute-energy force-warp (toss cyborgs) |
| R | Restart run |
| M | Mute SFX |
| Enter | Start (title screen) |

## Objective loop

On-screen **OBJ** text updates as you progress. Glowing 3D markers + floating labels highlight the pod, closet, marked cyborg, door, console, hidden button, and exit.

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
  js/config.js        # palette, constants, tile ids, world helpers
  js/stubs.js         # Phase 4 API stubs (inactive)
  js/audio.js         # Web Audio SFX + chiptune bed
  js/world.js         # lab tilemap + collision
  js/entities.js      # player + cyborg logic
  js/meshes.js        # low-poly characters & props
  js/scene3d.js       # Three.js scene, lights, camera, markers
  js/game.js          # loop, puzzles, score, HUD
  js/main.js          # entry: input + render loop
  README.md
```

## Tech notes

- **Three.js** WebGL renderer with antialiasing (no pixel scaling / nearest-neighbor)
- Elevated follow camera (readable overhead third-person)
- Same light pink / cyan / purple / gold palette as the original demo
- HTML/CSS HUD for timer, inventory, objectives, console, and end screens

## Implemented vs stubbed

**Implemented**

- Three.js lab (walls, floors, pod, closet, console, door, exit pad)
- Stylized low-poly cat-girl + cyborgs
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
- Hand-authored character models (procedural low-poly stand-ins used)

## Notion sources

- Plan: https://app.notion.com/p/399c98a9f7ff810585f8d820c1ef51f6
- Spec (game data reference): https://app.notion.com/p/218c98a9f7ff80939736cdb22ce9343d
