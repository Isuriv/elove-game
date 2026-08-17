# ELOVE GAME (Mars Love Blastar)

Playable **Canvas 2D side-scroller** (synthwave campaign from Ultra Earth through Inside Starship). Native framebuffer **480×270**, integer nearest-neighbor upscale.

**To assemble, build, and run this snapshot on a clean machine, follow [`ASSEMBLY.md`](./ASSEMBLY.md).** That sheet pins toolchain versions, clone steps, verification, and what is (and is not) required.

## Quick start

```powershell
Set-Location path\to\elove-game
python -m http.server 8081
```

Open http://localhost:8081/ and hard-refresh (`Ctrl+Shift+R`).

There is nothing to compile. Do not open `index.html` as a `file://` URL. Serve **this directory** (the git root), not the parent folder.

## What you should see

Title screen **ELOVE GAME** with levels:

1 Ultra Earth · 2 Cake Realm · 2.5 Boring Company · 2.5.5 Neuralink · 3 Tesla Works · 4 SpaceX Ascent · 4.5 Moon Bouncing · 5 Inside Starship

Press **Enter** / **J** to start Ultra Earth. All levels are unlocked in this snapshot.

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

Stay off the **toxic fluid** floor; reach **EXIT**.

## Repo notes

- **GitHub:** https://github.com/Isuriv/elove-game
- **Assets:** all runtime art/audio-video used by the current build are in `assets/` (including `assets/imagine/`). Git LFS is not used.
- **Optional Node scripts** under `scripts/` regenerate or capture art. They need Node + (for some) Playwright / `XAI_API_KEY`. They are **not** required to play.
- Cross-chat context: [`CHAT-HANDOFF.md`](./CHAT-HANDOFF.md). Credits: [`CREDITS.md`](./CREDITS.md).

## Project layout

```
elove-game/
  index.html          # canvas host + HTML HUD
  css/style.css
  js/config.js        # palette, constants, build id
  js/audio.js         # Web Audio SFX + chiptune bed
  js/world.js         # collision / tiles
  js/entities.js      # player + enemies
  js/sprites.js       # procedural fallback sprites
  js/assets.js        # loads shipped PNGs / video
  js/render2d.js      # Canvas 2D scene
  js/game.js          # loop, pickups, HUD
  js/main.js          # entry
  js/levels.js        # campaign catalog
  js/level-data.js    # per-level layouts
  assets/             # shipped game assets
  ASSEMBLY.md         # full recreate-from-scratch instructions
```

## Tech

- Vanilla **Canvas 2D** (no p5.js / Three.js on the playable path)
- ES modules in the browser; Python `http.server` for local play
- Palette: pink / cyan / purple / gold
