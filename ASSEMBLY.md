# Assembly sheet — recreate the current playable ELOVE game

This document is the source of truth for assembling, serving, and verifying the game **exactly as it is playable in this snapshot**. Follow it on a clean machine. Do not regenerate art unless you intend to change the shipped look.

The short overview lives in [`README.md`](./README.md).

---

## 1. What this repo is

**ELOVE GAME** (workspace name: Mars Love Blastar) is a **vanilla Canvas 2D side-scroller** served as static files. There is no compiled engine binary, no Unity/Godot project in the playable path, and no `npm start` for gameplay.

| Item | Value |
|------|--------|
| Playable entry | `index.html` → ES module `js/main.js` |
| Runtime | Browser Canvas 2D + Web Audio |
| Native framebuffer | **480×270**, integer nearest-neighbor CSS upscale (cap **×3** → 1440×810) |
| Current build id | `rainbow-bolts-20260816b` (`js/config.js` `CFG` / `BUILD`, cache-bust on `index.html`) |
| Default boot | Title screen, **Level 1 Ultra Earth** selected (`Game.start({ levelId: 1 })`) |
| GitHub | https://github.com/Isuriv/elove-game (this directory **is** the git root) |

Shipped campaign (title buttons / `?level=`):

| Id | Name | Query |
|----|------|--------|
| 1 | Ultra Earth | `?level=1` |
| 2 | Cake Realm | `?level=2` |
| 2.5 | Boring Company | `?level=2.5` |
| 2.55 | Neuralink | `?level=2.55` or `?level=2.5.5` |
| 3 | Tesla Works | `?level=3` |
| 4 | SpaceX Ascent | `?level=4` |
| 4.5 | Moon Bouncing | `?level=4.5` |
| 5 | Inside Starship | `?level=5` |

All levels are unlocked in this snapshot (`UNLOCK_ALL_FOR_TESTING = true` in `js/levels.js`).

**This repo already contains the baked sprites, backgrounds, videos, and data used at runtime.** You do **not** need Grok Imagine, Playwright, or ffmpeg to play.

---

## 2. Exact toolchain versions (detected from this machine / project)

Detected while publishing this snapshot (Windows development machine). Playing the game does not require matching Node; serving only needs a static HTTP server.

| Tool | Detected version | Required to **play**? |
|------|------------------|------------------------|
| OS | Windows 10/11, build **10.0.26200** (DisplayVersion **25H2**) | Any OS that can run a static file server + a modern browser |
| Git | **2.55.0.windows.4** | Clone only |
| Git LFS | **3.7.1** installed locally | **Not used** — no file in this tree exceeds GitHub’s 100 MB limit (largest game asset ≈ 3.8 MB) |
| Python | **3.14.6** (`MSC v.1944 64-bit`) | Recommended for `python -m http.server`. Any **Python 3.8+** with `http.server` works |
| Node.js | **v24.18.0** | Only for optional bake/capture/Imagine scripts |
| npm | **11.16.0** | Only with Node, for optional scripts |
| Playwright (local `node_modules`) | **1.49.1** (requires Node ≥ 18) | Optional capture/bake |
| ffmpeg-static (intended pin) | **5.3.0** (`package.json` `allowScripts`) | Optional movie encode scripts only |
| Three.js (bake HTML importmap) | **0.170.0** from `https://unpkg.com/three@0.170.0/build/three.module.js` | Optional sprite bake only; **not** on the playable path |
| Browser | Current Chromium (Chrome / Edge) or Firefox with ES modules | **Yes** — must support `<script type="module">` and Canvas 2D |

There is **no compiler**, CMake, MSVC game build, Godot export, or Unity player for the playable game.

`package.json` has `"type": "commonjs"` for Node scripts; browser game code uses native ES modules via `index.html`.

---

## 3. Prerequisites to install

### Required to play

1. **Git**
2. **A static HTTP server** — Python 3 is what this project uses:
   ```powershell
   python --version
   ```
3. **A modern desktop browser** (Chrome, Edge, or Firefox). Keyboard is required.

### Not required to play (optional pipeline only)

- Node.js **≥ 18** (this snapshot was published with **24.18.0**)
- `npm ci` / `npm install` for Playwright + ffmpeg-static
- Chromium for Playwright: `npx playwright install chromium`
- Environment variable `XAI_API_KEY` — **only** to regenerate Grok Imagine art. **Never commit it.** Playing uses files already in `assets/`.

---

## 4. How to clone (assets included; no Git LFS)

The repo is **private** at the time of this snapshot. You need GitHub access to `Isuriv/elove-game`.

SSH (matches this machine’s `gh auth` git protocol):

```powershell
git clone git@github.com:Isuriv/elove-game.git
Set-Location elove-game
```

HTTPS:

```powershell
git clone https://github.com/Isuriv/elove-game.git
Set-Location elove-game
```

- **Do not** enable Git LFS for this repo; pointers are not used.
- **No submodules** (`.gitmodules` is absent).
- Clone **this repo root**, not the parent `Mars Love Blastar` folder. Parent-folder dumps (Unity installer, Godot zip, unused Photoshop/source packs) are **not** part of the playable game.

Confirm assets arrived (expect hundreds of PNGs plus MP4s):

```powershell
(Get-ChildItem -Recurse assets -File).Count
Get-ChildItem assets\imagine\starship\movie\*.mp4
```

---

## 5. Assemble / build / run from a clean machine

There is nothing to compile. The “build” is: clone → serve this directory → open the URL.

### Windows (PowerShell) — matches current working setup

```powershell
Set-Location path\to\elove-game
python -m http.server 8081
```

Open **http://localhost:8081/**  
Hard-refresh once: **Ctrl+Shift+R** (cache-bust query strings on CSS/JS).

### macOS / Linux

```bash
cd elove-game
python3 -m http.server 8081
```

Open http://localhost:8081/

### Important

- Serve **this folder** (`index.html` must be at `/`). Relative paths like `assets/imagine/...` and `js/main.js` break if you serve the parent directory.
- Do **not** open `index.html` via `file://` — ES modules and some media will fail.
- `npm install` is **not** required to play. `node_modules/` is gitignored on purpose.
- Do **not** re-run `scripts/grok-*.mjs` or `bake-*.mjs` if you want the shipped look. Those overwrite baked PNGs.

Optional other ports (this machine also used 8080 historically):

```powershell
python -m http.server 8080
```

Then open http://localhost:8080/

---

## 6. Editors, SDKs, environment variables

| Need | Notes |
|------|--------|
| Editor | Any text editor. Cursor/VS Code is what was used locally. Not required to play. |
| SDKs | None for gameplay. |
| Env vars to **play** | None. |
| `XAI_API_KEY` | Optional. Used only by `scripts/grok-imagine-*.mjs` / video sprite scripts. Set in the shell, never in the repo: `$env:XAI_API_KEY = "xai-..."` |
| localStorage keys | Best times and unlock flags (`elove-side-scroll-best`, `elove-level2-unlocked`, …). Created at runtime; not shipped. |

Optional Node tooling (does **not** change the playable files unless you run bake scripts):

```powershell
npm ci
npx playwright install chromium
```

If `npm ci` fails because you used `npm install` instead, `npm install` with the committed lockfile is equivalent.

Bake scripts that import `three` load **Three r170 from unpkg at runtime** (needs network). Shipped sprites already exist under `assets/imagine/`.

---

## 7. How to verify it matches the current playable game

1. Open http://localhost:8081/ (no query string).
2. You should see the **title card**: “ELOVE GAME”, subtitle **Side Scroller - Ultra Earth**, eight level buttons (1 / 2 / 2.5 / 2.5.5 / 3 / 4 / 4.5 / 5). Level 1 is selected. All levels are clickable (unlock-all is on).
3. Press **Enter** or **J** (or click the selected button) to start **Ultra Earth**.
4. Native canvas is 480×270, integer-scaled (typically ×2 or ×3). HUD chrome sits around the canvas; pixel art should not crawl (non-integer scale was a past bug).
5. Player is a **white chibi cat on a rocket**. Hostiles: drones (small) and cyborgs. Bottom of the world is a **toxic fluid** sea — contact hurts.
6. Pickups include neon guns (pistol / blaster / cannon): on pickup, auto-fire **rainbow** bolts for 3 seconds. Cake Realm has candy collectibles. Level-clear overlay uses holographic Elove mail (`assets/imagine/clues/holo-comm-panel.png` + `holo-elove.png`).
7. Optional deep links (skip title into a level):
   - http://localhost:8081/?level=3
   - http://localhost:8081/?level=2.5.5
   - http://localhost:8081/?level=5
8. `gallery.html` lists shipped art; it is not the game.
9. Browser console should not show `Failed to load assets/...` for core sprites. Partial preload falls back to procedural neon, which is **not** the shipped look — if that happens, you are serving the wrong directory or assets did not clone.

### Controls (current)

| Input | Action |
|-------|--------|
| A / D or arrows | Move |
| W / Space / Up | Jump (buffer + coyote time) |
| J | Slash |
| F | Force-warp toss |
| R | Restart |
| M | Mute |
| Enter / J on title | Start |
| 1–5 and mid-level keys | Level select (see HUD help in `index.html`) |

Pads: purple grip, cyan ice/slip, gold bounce. Moon Bouncing (4.5) uses lower gravity.

Audio: Web Audio SFX + chiptune bed; first click/tap resumes AudioContext (`pointerdown` → `AudioFX.ensure()`).

Reference screenshots from this snapshot: `screenshots/viewport-x3-title.png`, `screenshots/viewport-x3-ingame.png`, `screenshots/viewport-laptop-1366-title.png`.

---

## 8. Large files, LFS, submodules, third-party downloads

- **Git LFS:** not configured, not required.
- **Submodules:** none.
- **Largest tracked assets:** background plates and Starship movie frames / MP4s under `assets/imagine/` (about 1.5–3.8 MB each). Full `assets/` tree is on the order of **~200 MB**.
- **CDN (optional bake only):** `unpkg.com/three@0.170.0` — unused when playing.
- **Kenney / KayKit GLTF** under `assets/models/` and `assets/blasters/` are **legacy / unused at runtime** (see `CREDITS.md`). They are still in git so the tree matches disk.
- **Do not download** Unity Hub, Godot editor zips, or parent-folder art packs. They are not loaded by this game.

---

## 9. Unusual facts that source-only would miss

1. **Git root is `elove-game/`, not the Cursor workspace folder** `Mars Love Blastar`. The workspace also contains unrelated dumps (Unity installer, Godot zip, Photoshop files, `25D Game Files`, `Character Files`, `GameLearning`). Those are **excluded** from GitHub on purpose.
2. **Playable renderer is Canvas 2D** (`js/render2d.js` `Scene2D`). Older Three.js blaster / top-down lab notes in leftover README fragments and `archive/` are **not** the live game.
3. **Must HTTP-serve this directory.** Relative ES module imports (`js/game.js?v=...`) and art URLs depend on it.
4. **Cache-bust query strings** on `index.html` / imports (`?v=rainbow-bolts-20260816b`, holo-notes CSS, etc.). After pull, hard-refresh.
5. **Art is pre-baked.** `js/neon.js` can procedurally fallback; shipped PNGs under `assets/imagine/` are what you should see.
6. **`UNLOCK_ALL_FOR_TESTING = true`** — a stranger cloning today gets every level open. Turning this off restores localStorage unlock progression.
7. **No `package-lock` was historically required to play.** This snapshot adds `package-lock.json` plus pinned **optional** `devDependencies` so capture/bake scripts can be restored. Installing them does not alter gameplay unless you run those scripts.
8. **No secrets in repo.** Imagine scripts read `process.env.XAI_API_KEY`. Do not paste keys into files.
9. **Scratch files** `_tmp_*`, `__pycache__/`, `node_modules/` are gitignored. They are not needed to recreate the playable game.
10. **Audio has no sound files** — tones are synthesized in `js/audio.js`.
11. **Starship ending movies** are the MP4s already under `assets/imagine/starship/movie/` (`mars-love-movie.mp4`, `mars-vacation-movie.mp4`). You do not need to run `encode:mars-movie`.

---

## Layout (playable + assets)

```
elove-game/
  index.html              # title + HUD + module entry
  gallery.html
  css/style.css
  js/                     # game runtime (main, game, render2d, assets, …)
  assets/game/            # landscape plate used at boot
  assets/imagine/         # shipped sprites, levels, clues, video, sheets
  assets/pixelwhale/      # extra pixel art (loader paths)
  assets/mypixels/
  archive/                # historical snapshots (not the live path)
  scripts/                # optional Imagine / bake / capture (not needed to play)
  screenshots/            # verification captures
  package.json            # optional Node scripts + pinned devDependencies
  package-lock.json
  ASSEMBLY.md             # this file
```
