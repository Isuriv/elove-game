/* Side-scroller canvas renderer — 480×270 native resolution */
import { CFG, TILE } from "./config.js";
import { World } from "./world.js";
import { Art } from "./assets.js";
import { frameAt } from "./anim.js";
import { makeTiles, makeLootSprites, makeMarkerGlow, makeSlashArc, makeNeonSword, makeBigSlashBurst } from "./sprites.js";

const VIEW_SCALE = CFG.VIEW_SCALE;
const T = CFG.TILE;
const RES_W = CFG.INTERNAL_W;
const RES_H = CFG.INTERNAL_H;

/** Street props placed on ground / platforms */
const DECOR = [
  { kind: "pole", x: 9 * T, y: 12 * T },
  { kind: "kiosk", x: 15 * T, y: 12 * T },
  { kind: "pole", x: 26 * T, y: 12 * T },
  { kind: "kiosk", x: 33 * T, y: 12 * T },
  { kind: "pole", x: 44 * T, y: 12 * T },
  { kind: "kiosk", x: 52 * T, y: 12 * T },
  { kind: "pole", x: 64 * T, y: 12 * T },
  { kind: "kiosk", x: 71 * T, y: 12 * T },
  { kind: "pole", x: 84 * T, y: 12 * T },
  { kind: "track", x: 20 * T, y: 5 * T },
  { kind: "track", x: 55 * T, y: 4.5 * T },
  { kind: "track", x: 78 * T, y: 5.5 * T },
  { kind: "prop", idx: 7, x: 18 * T, y: 8 * T },
  { kind: "prop", idx: 8, x: 38 * T, y: 7 * T },
  { kind: "prop", idx: 14, x: 58 * T, y: 8 * T },
];

function makeFallbackTiles() {
  const base = makeTiles();
  const S = T;
  const solid = document.createElement("canvas");
  solid.width = S;
  solid.height = S;
  const sctx = solid.getContext("2d");
  sctx.fillStyle = CFG.COLORS.wallDark;
  sctx.fillRect(0, 0, S, S);
  sctx.fillStyle = CFG.COLORS.wall;
  sctx.fillRect(0, 0, S, 3);

  const plat = document.createElement("canvas");
  plat.width = S;
  plat.height = S;
  const pctx = plat.getContext("2d");
  pctx.fillStyle = CFG.COLORS.purple;
  pctx.fillRect(0, 0, S, 4);
  pctx.fillStyle = CFG.COLORS.pink;
  pctx.fillRect(0, 0, S, 2);

  return { solid, plat, exit: base.exit };
}

export class Scene2D {
  constructor(wrap) {
    this.wrap = wrap;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "pixel-canvas";
    this.canvas.setAttribute("aria-label", "ELOVE side-scroller");
    this.canvas.width = RES_W;
    this.canvas.height = RES_H;
    wrap.insertBefore(this.canvas, wrap.firstChild);
    this.ctx = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;

    this.fallbackTiles = makeFallbackTiles();
    this.lootSprites = makeLootSprites();
    this.markerGlow = makeMarkerGlow();
    this.slashArc = makeSlashArc();
    this.neonSword = makeNeonSword();
    this.bigSlash = makeBigSlashBurst();
    this._outlineCache = new Map();

    this.camX = 0;
    this.camY = 0;
    this.titleCam = true;
    this.fx = [];
    this.forceRing = null;
    /** Logical framebuffer size (always INTERNAL_W×INTERNAL_H). */
    this.cssW = RES_W;
    this.cssH = RES_H;

    this._resize();
    window.addEventListener("resize", () => this._resize());
  }

  _resize() {
    // Keep a fixed 480×270 framebuffer; CSS handles display upscale.
    this.cssW = RES_W;
    this.cssH = RES_H;
    if (this.canvas.width !== RES_W || this.canvas.height !== RES_H) {
      this.canvas.width = RES_W;
      this.canvas.height = RES_H;
    }
    this.ctx.imageSmoothingEnabled = false;
  }

  buildWorld() {
    this._resize();
  }
  rebuildLab() {
    this.fx = [];
    this.forceRing = null;
  }
  clearEntities() {
    this.fx = [];
    this.forceRing = null;
  }
  spawnPlayer() {}
  spawnEnemies() {}

  setTitleCamera() {
    this.titleCam = true;
    this.camX = 0;
    this.camY = 0;
  }

  playWinFlourish(_player) {
    this.fx.push({
      type: "burst",
      x: _player.x,
      y: _player.y,
      until: performance.now() + 900,
      color: CFG.COLORS.gold,
    });
  }

  playDeathFlourish(_player) {
    this.fx.push({
      type: "burst",
      x: _player.x,
      y: _player.y,
      until: performance.now() + 700,
      color: CFG.COLORS.danger,
    });
  }

  playSlashVfx(player) {
    const now = performance.now();
    const reach = player.facing * 30;
    this.fx.push({
      type: "slash",
      x: player.x + reach,
      y: player.y - 6,
      facing: player.facing,
      until: now + 220,
    });
    this.fx.push({
      type: "bigSlash",
      x: player.x + player.facing * 22,
      y: player.y - 4,
      facing: player.facing,
      until: now + 200,
    });
    this.fx.push({
      type: "swordBeam",
      x: player.x,
      y: player.y - 6,
      facing: player.facing,
      until: now + 240,
    });
  }

  playHitSparks(x, y, color) {
    this.fx.push({ type: "sparks", x, y, color, until: performance.now() + 280, t0: performance.now() });
  }

  showForceRing(player, now) {
    this.forceRing = { x: player.x, y: player.y, until: now + 220 };
    this.fx.push({ type: "ring", x: player.x, y: player.y, until: now + 280, t0: now });
  }

  syncFrame(player, enemies, loot, inventory, now) {
    this.titleCam = false;
    this._player = player;
    this._enemies = enemies;
    this._loot = loot;
    this._inventory = inventory;
    this._now = now;

    const targetX = player.x - this.cssW / (2 * VIEW_SCALE);
    const targetY = player.y - this.cssH / (2 * VIEW_SCALE) - 8;
    this.camX = Math.floor(targetX);
    this.camY = Math.floor(targetY);

    const maxX = Math.max(0, World.pixelW() - this.cssW / VIEW_SCALE);
    const maxY = Math.max(0, World.pixelH() - this.cssH / VIEW_SCALE);
    this.camX = Math.max(0, Math.min(maxX, this.camX));
    this.camY = Math.max(0, Math.min(maxY, this.camY));
  }

  _drawParallaxPlate(ctx, img, speed, yAlign = 1, alpha = 1, coverH = 1) {
    if (!img) return;
    const h = Math.floor(this.cssH * coverH);
    const scale = h / img.height;
    const dw = Math.max(1, Math.floor(img.width * scale));
    const y = yAlign === 1 ? this.cssH - h : Math.floor(this.cssH * yAlign);
    const scroll = ((this.camX * speed) % dw + dw) % dw;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    for (let x = -scroll; x < this.cssW + dw; x += dw) {
      ctx.drawImage(img, Math.floor(x), y, dw, h);
    }
    ctx.restore();
  }

  _tileLayer(ctx, img, speed, yRatio, hRatio, alpha = 1) {
    if (!img) return;
    const h = Math.floor(this.cssH * hRatio);
    const y = Math.floor(this.cssH * yRatio);
    const scale = h / img.height;
    const dw = Math.max(1, Math.floor(img.width * scale));
    const scroll = ((this.camX * speed) % dw + dw) % dw;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    for (let x = -scroll; x < this.cssW + dw; x += dw) {
      ctx.drawImage(img, x, y, dw, h);
    }
    ctx.restore();
  }

  _drawSky(ctx) {
    const neon = Art.neon;

    // Full-bleed synthwave sunset (ref 1 palette)
    if (neon?.skySunset) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(neon.skySunset, 0, 0, this.cssW, this.cssH);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, this.cssH);
      g.addColorStop(0, "#1a0a2e");
      g.addColorStop(0.35, "#9020a0");
      g.addColorStop(0.55, "#ff4aa8");
      g.addColorStop(0.75, "#ff8a50");
      g.addColorStop(1, "#ffd060");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.cssW, this.cssH);
    }

    // Soft parallax from cropped refs (HUD stripped)
    this._drawParallaxPlate(ctx, Art.refSunset, 0.08, 0.12, 0.28, 0.7);
    this._drawParallaxPlate(ctx, Art.refNight, 0.18, 0.22, 0.28, 0.55);
    this._drawParallaxPlate(ctx, Art.refTrain, 0.3, 0.32, 0.22, 0.4);

    // Neon city bands
    if (neon?.cityFar) this._tileLayer(ctx, neon.cityFar, 0.24, 0.36, 0.48, 0.92);
    if (neon?.cityNear) this._tileLayer(ctx, neon.cityNear, 0.44, 0.44, 0.44, 1);

    // Magenta / orange horizon glow
    const bloom = ctx.createLinearGradient(0, this.cssH * 0.45, 0, this.cssH * 0.7);
    bloom.addColorStop(0, "rgba(255, 80, 160, 0)");
    bloom.addColorStop(0.4, "rgba(255, 46, 166, 0.18)");
    bloom.addColorStop(1, "rgba(255, 160, 70, 0.12)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, this.cssH * 0.45, this.cssW, this.cssH * 0.25);

    const vig = ctx.createLinearGradient(0, this.cssH * 0.65, 0, this.cssH);
    vig.addColorStop(0, "rgba(8, 4, 20, 0)");
    vig.addColorStop(1, "rgba(8, 4, 20, 0.45)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, this.cssH * 0.65, this.cssW, this.cssH * 0.35);
  }

  _drawDecor(ctx) {
    const neon = Art.neon;
    for (const d of DECOR) {
      let spr = null;
      if (d.kind === "pole") spr = neon?.pole;
      else if (d.kind === "kiosk") spr = neon?.kiosk;
      else if (d.kind === "track") spr = neon?.track;
      else if (d.kind === "prop" && Art.props[d.idx]) spr = Art.props[d.idx];
      if (!spr) continue;
      const sx = Math.floor(d.x * VIEW_SCALE - this.camX * VIEW_SCALE - spr.width / 2);
      const sy = Math.floor(d.y * VIEW_SCALE - this.camY * VIEW_SCALE - spr.height);
      if (sx + spr.width < -40 || sx > this.cssW + 40) continue;
      ctx.drawImage(spr, sx, sy);
    }
  }

  /** Twinkling sparkles + traveling neon flashes along a hanging wire. */
  _drawCableSparks(ctx, cx, cy, cable, seed, now) {
    const h = cable?.height || 24;
    const w = cable?.width || 10;
    const midX = cx + Math.floor(w / 2);

    // Traveling electrical flash down the cable
    const period = 720 + (seed % 9) * 110;
    const t = (now + seed * 137) % period;
    const flashOn = t < 90 || (t > 280 && t < 340);
    if (flashOn) {
      const travel = Math.floor(((now * 0.09 + seed * 3) % Math.max(6, h - 6)));
      const col = t < 90 ? "#ffffff" : seed % 2 === 0 ? "#00e8ff" : "#ff2ea6";
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = col;
      ctx.fillRect(midX - 1, cy + travel, 2, 4);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = col === "#ffffff" ? "#ffe066" : col;
      ctx.fillRect(midX - 2, cy + travel + 1, 4, 2);
      // Brief tip pop when flash reaches end
      if (travel > h - 10) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(midX - 1, cy + h - 3, 3, 2);
        ctx.fillRect(midX, cy + h - 5, 1, 1);
      }
      ctx.restore();
    }

    // Idle sparkle pixels (staggered blink)
    for (let i = 0; i < 4; i++) {
      const beat = Math.sin(now * (0.01 + i * 0.002) + seed * 0.61 + i * 1.7);
      if (beat < 0.25) continue;
      const sy = 3 + ((seed * 13 + i * 19 + Math.floor(now / 160)) % Math.max(4, h - 6));
      const sx = cx + 1 + ((seed + i * 5 + Math.floor(now / 210)) % Math.max(2, w - 2));
      ctx.save();
      ctx.globalAlpha = 0.35 + beat * 0.65;
      ctx.fillStyle = i % 2 === 0 ? "#ffe066" : "#7efcff";
      ctx.fillRect(sx, cy + sy, 1, 1);
      if (beat > 0.82) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(sx, cy + sy - 1, 1, 1);
        ctx.fillRect(sx + 1, cy + sy, 1, 1);
      }
      ctx.restore();
    }

    // Occasional magenta arc snap across two pixels
    const snapPeriod = 1400 + (seed % 5) * 220;
    const snapT = (now + seed * 53) % snapPeriod;
    if (snapT < 55) {
      const ay = 6 + ((seed * 7) % Math.max(4, h - 12));
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = "#ff2ea6";
      ctx.fillRect(midX - 2, cy + ay, 5, 1);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(midX, cy + ay - 1, 1, 3);
      ctx.restore();
    }
  }

  _drawWorld(ctx, now = performance.now()) {
    const tilePx = CFG.TILE * VIEW_SCALE;
    const startTx = Math.max(0, Math.floor(this.camX / CFG.TILE) - 1);
    const startTy = Math.max(0, Math.floor(this.camY / CFG.TILE) - 1);
    const endTx = Math.min(World.W, Math.ceil((this.camX + this.cssW / VIEW_SCALE) / CFG.TILE) + 1);
    const endTy = Math.min(World.H, Math.ceil((this.camY + this.cssH / VIEW_SCALE) / CFG.TILE) + 1);

    const ground = Art.neon?.ground || Art.tileGround || this.fallbackTiles.solid;
    const plat = Art.neon?.platform || Art.tilePlat || this.fallbackTiles.plat;
    const cables = Art.neon?.cables || Art.cables || [];

    for (let ty = startTy; ty < endTy; ty++) {
      for (let tx = startTx; tx < endTx; tx++) {
        const t = World.get(tx, ty);
        if (t === TILE.EMPTY) continue;
        const sx = Math.floor(tx * CFG.TILE * VIEW_SCALE - this.camX * VIEW_SCALE);
        const sy = Math.floor(ty * CFG.TILE * VIEW_SCALE - this.camY * VIEW_SCALE);

        if (t === TILE.SOLID) {
          ctx.drawImage(ground, sx, sy, tilePx, tilePx);
        } else if (t === TILE.PLATFORM) {
          const ph = Math.floor(tilePx * 0.4);
          ctx.drawImage(plat, sx, sy, tilePx, ph);
          // Pixel cables dangling off platform underside
          if (cables.length) {
            const above = ty > 0 ? World.get(tx, ty - 1) : TILE.SOLID;
            const below = ty + 1 < World.H ? World.get(tx, ty + 1) : TILE.SOLID;
            if (above === TILE.EMPTY && below === TILE.EMPTY) {
              const seed = (tx * 13 + ty * 7) >>> 0;
              if (seed % 3 !== 0) {
                const cable = cables[seed % cables.length];
                const cx = sx + ((seed % 5) + 2);
                const cy = sy + ph - 1;
                ctx.drawImage(cable, cx, cy);
                this._drawCableSparks(ctx, cx, cy, cable, seed, now);
              }
              // Occasional second wire near the far edge
              if (seed % 5 === 0) {
                const cable2 = cables[(seed + 2) % cables.length];
                const cx2 = sx + tilePx - 8;
                const cy2 = sy + ph;
                ctx.drawImage(cable2, cx2, cy2);
                this._drawCableSparks(ctx, cx2, cy2, cable2, seed + 17, now);
              }
            }
          }
        } else if (t === TILE.EXIT) {
          ctx.drawImage(this.fallbackTiles.exit, sx, sy, tilePx, tilePx);
          ctx.save();
          ctx.strokeStyle = CFG.COLORS.neonCyan || CFG.COLORS.cyan;
          ctx.globalAlpha = 0.7;
          ctx.lineWidth = 2;
          ctx.strokeRect(sx + 2, sy + 2, tilePx - 4, tilePx - 4);
          ctx.restore();
        }
      }
    }
  }

  _soldierSprite(e) {
    const state =
      e.state === "attack"
        ? "attack"
        : e.state === "walk" || e.state === "headless"
          ? "walk"
          : e.state === "hurt"
            ? "hurt"
            : "idle";
    return frameAt(Art.cyborgAnims, state, e.frame ?? e.anim?.index ?? 0, Art.soldierStand);
  }

  _playerSprite(p) {
    const state = typeof p.animKey === "function" ? p.animKey() : "idle";
    return frameAt(Art.playerAnims, state, p.frame ?? p.anim?.index ?? 0, Art.catRocket);
  }

  _droneSprite(e) {
    const state = typeof e.animKey === "function" ? e.animKey() : "fly";
    return frameAt(Art.droneAnims, state, e.frame ?? e.anim?.index ?? 0, Art.drone);
  }

  _neonSilhouette(spr, color) {
    if (!this._outlineBySpr) this._outlineBySpr = new WeakMap();
    let byColor = this._outlineBySpr.get(spr);
    if (!byColor) {
      byColor = Object.create(null);
      this._outlineBySpr.set(spr, byColor);
    }
    if (byColor[color]) return byColor[color];
    const c = document.createElement("canvas");
    c.width = spr.width;
    c.height = spr.height;
    const cctx = c.getContext("2d");
    cctx.imageSmoothingEnabled = false;
    cctx.drawImage(spr, 0, 0);
    cctx.globalCompositeOperation = "source-in";
    cctx.fillStyle = color;
    cctx.fillRect(0, 0, c.width, c.height);
    byColor[color] = c;
    return c;
  }

  _drawSprite(ctx, spr, x, y, facing = 1, bob = 0, opts = {}) {
    if (!spr) return;
    const outline = opts.outline !== false;
    const w = spr.width;
    const h = spr.height;
    const sx = Math.floor(x * VIEW_SCALE - this.camX * VIEW_SCALE - w / 2);
    const sy = Math.floor(y * VIEW_SCALE - this.camY * VIEW_SCALE - h + 4 + bob);
    ctx.save();
    if (facing < 0) {
      ctx.translate(sx + w, sy);
      ctx.scale(-1, 1);
      if (outline) this._blitNeonOutline(ctx, spr, 0, 0);
      else ctx.drawImage(spr, 0, 0);
    } else if (outline) {
      this._blitNeonOutline(ctx, spr, sx, sy);
    } else {
      ctx.drawImage(spr, sx, sy);
    }
    ctx.restore();
  }

  _blitNeonOutline(ctx, spr, dx, dy) {
    const pink = this._neonSilhouette(spr, CFG.COLORS.neonPink || "#ff2ea6");
    const cyan = this._neonSilhouette(spr, CFG.COLORS.neonCyan || "#00e8ff");
    // Soft neon glow
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.drawImage(pink, dx - 1, dy);
    ctx.drawImage(pink, dx + 1, dy);
    ctx.drawImage(cyan, dx, dy - 1);
    ctx.drawImage(cyan, dx, dy + 1);
    ctx.globalAlpha = 0.7;
    ctx.drawImage(pink, dx - 1, dy - 1);
    ctx.drawImage(cyan, dx + 1, dy + 1);
    ctx.restore();
    // Crisp body on top
    ctx.drawImage(spr, dx, dy);
  }

  _drawMarkers(ctx, inventory, now) {
    if (!inventory.cleared) return;
    const er = World.exitRect();
    const x = er.x + er.w / 2;
    const y = er.y;
    const sx = Math.floor(x * VIEW_SCALE - this.camX * VIEW_SCALE);
    const sy = Math.floor(y * VIEW_SCALE - this.camY * VIEW_SCALE);
    const pulse = 0.65 + 0.35 * Math.sin(now * 0.008);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.drawImage(this.markerGlow, sx - 10, sy - 16, 20, 20);
    ctx.fillStyle = CFG.COLORS.ok;
    ctx.font = "bold 8px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("EXIT", sx, sy - 18);
    ctx.restore();
  }

  _drawFx(ctx, now) {
    this.fx = this.fx.filter((fx) => now < fx.until);
    for (const fx of this.fx) {
      if (fx.type === "slash") {
        const spr = this.slashArc;
        const sx = Math.floor(fx.x * VIEW_SCALE - this.camX * VIEW_SCALE);
        const sy = Math.floor(fx.y * VIEW_SCALE - this.camY * VIEW_SCALE);
        ctx.save();
        ctx.globalAlpha = 0.95;
        if (fx.facing < 0) {
          ctx.translate(sx, sy);
          ctx.scale(-1, 1);
          ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
        } else {
          ctx.drawImage(spr, sx - spr.width / 2, sy - spr.height / 2);
        }
        ctx.restore();
      } else if (fx.type === "bigSlash") {
        const spr = this.bigSlash;
        const sx = Math.floor(fx.x * VIEW_SCALE - this.camX * VIEW_SCALE);
        const sy = Math.floor(fx.y * VIEW_SCALE - this.camY * VIEW_SCALE);
        const life = Math.max(0, (fx.until - now) / 200);
        ctx.save();
        ctx.globalAlpha = 0.35 + life * 0.65;
        if (fx.facing < 0) {
          ctx.translate(sx, sy);
          ctx.scale(-1.15, 1.15);
          ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
        } else {
          ctx.translate(sx, sy);
          ctx.scale(1.15, 1.15);
          ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
        }
        ctx.restore();
      } else if (fx.type === "swordBeam") {
        const sword = this.neonSword;
        const sx = Math.floor(fx.x * VIEW_SCALE - this.camX * VIEW_SCALE);
        const sy = Math.floor(fx.y * VIEW_SCALE - this.camY * VIEW_SCALE);
        const reach = fx.facing * 18;
        ctx.save();
        ctx.globalAlpha = 0.95;
        // Glow trail behind the blade
        ctx.strokeStyle = CFG.COLORS.neonPink;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx + fx.facing * 4, sy);
        ctx.lineTo(sx + fx.facing * 42, sy - 10);
        ctx.stroke();
        ctx.strokeStyle = CFG.COLORS.neonCyan;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx + fx.facing * 6, sy);
        ctx.lineTo(sx + fx.facing * 40, sy - 9);
        ctx.stroke();
        if (fx.facing < 0) {
          ctx.translate(sx + reach, sy - 8);
          ctx.scale(-1.4, 1.4);
          this._blitNeonOutline(ctx, sword, 0, 0);
        } else {
          ctx.translate(sx + reach, sy - 8);
          ctx.scale(1.4, 1.4);
          this._blitNeonOutline(ctx, sword, 0, 0);
        }
        ctx.restore();
      } else if (fx.type === "sparks") {
        const t = 1 - (fx.until - now) / 280;
        const sx = Math.floor(fx.x * VIEW_SCALE - this.camX * VIEW_SCALE);
        const sy = Math.floor(fx.y * VIEW_SCALE - this.camY * VIEW_SCALE);
        ctx.fillStyle = fx.color;
        for (let i = 0; i < 6; i++) {
          const a = i * 1.1 + t * 4;
          const r = 3 + t * 10;
          ctx.fillRect(sx + Math.cos(a) * r, sy + Math.sin(a) * r - t * 6, 2, 2);
        }
      } else if (fx.type === "burst") {
        const t = 1 - (fx.until - now) / 900;
        const sx = Math.floor(fx.x * VIEW_SCALE - this.camX * VIEW_SCALE);
        const sy = Math.floor(fx.y * VIEW_SCALE - this.camY * VIEW_SCALE);
        ctx.strokeStyle = fx.color;
        ctx.globalAlpha = 1 - t;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx, sy, 6 + t * 24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (fx.type === "ring") {
        const t = 1 - (fx.until - now) / 280;
        const sx = Math.floor(fx.x * VIEW_SCALE - this.camX * VIEW_SCALE);
        const sy = Math.floor(fx.y * VIEW_SCALE - this.camY * VIEW_SCALE);
        ctx.strokeStyle = CFG.COLORS.pink;
        ctx.globalAlpha = 0.7 * (1 - t);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, CFG.FORCE_RANGE * VIEW_SCALE * (0.35 + t * 0.65), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    if (this.forceRing && now < this.forceRing.until) {
      const sx = Math.floor(this.forceRing.x * VIEW_SCALE - this.camX * VIEW_SCALE);
      const sy = Math.floor(this.forceRing.y * VIEW_SCALE - this.camY * VIEW_SCALE);
      ctx.strokeStyle = CFG.COLORS.pink;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      this.forceRing = null;
    }
  }

  _drawTitleBg(ctx, now) {
    this.camX = ((now * 0.02) % 320);
    this.camY = 0;
    this._drawSky(ctx);
    this._drawDecor(ctx);
    this._drawWorld(ctx, now);

    ctx.fillStyle = "rgba(12, 6, 22, 0.35)";
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    if (Art.uiFrame) {
      const fw = Math.min(200, this.cssW * 0.45);
      const fh = fw * (Art.uiFrame.height / Art.uiFrame.width);
      ctx.drawImage(Art.uiFrame, (this.cssW - fw) / 2, this.cssH * 0.12, fw, fh);
    }

    if (Art.catRocket) {
      const x = this.cssW * 0.5 - Art.catRocket.width / 2;
      const y = this.cssH * 0.55 + Math.sin(now * 0.003) * 4;
      ctx.drawImage(Art.catRocket, x, y);
    }
    if (Art.drone) {
      ctx.drawImage(
        Art.drone,
        this.cssW * 0.72 + Math.sin(now * 0.002) * 8,
        this.cssH * 0.36 + Math.cos(now * 0.0025) * 5
      );
    }
    if (Art.soldierStand) {
      ctx.drawImage(Art.soldierStand, this.cssW * 0.18, this.cssH * 0.52);
    }
  }

  render() {
    const ctx = this.ctx;
    const now = performance.now();
    ctx.imageSmoothingEnabled = false;

    if (this.titleCam || !this._player) {
      this._drawTitleBg(ctx, now);
      return;
    }

    this._drawSky(ctx);
    this._drawDecor(ctx);
    this._drawWorld(ctx, now);

    const drawables = [];
    for (const item of this._loot || []) {
      if (item.taken) continue;
      drawables.push({ y: item.y, kind: "loot", item });
    }
    for (const e of this._enemies || []) {
      if (!e.alive) continue;
      drawables.push({ y: e.y, kind: "enemy", e });
    }
    drawables.push({ y: this._player.y, kind: "player", p: this._player });
    drawables.sort((a, b) => a.y - b.y);

    for (const d of drawables) {
      if (d.kind === "loot") {
        const holds = Art.bladeHolds || { spin: 130 };
        const hold = Array.isArray(holds.spin) ? holds.spin[0] : holds.spin || 130;
        const spin = Math.floor(now / hold);
        let spr = null;
        if (d.item.type === "sword") {
          spr = frameAt(Art.bladeAnims, "spin", spin, Art.gunIcon) || this.lootSprites[d.item.type];
        } else if (Art.powerups?.[d.item.type]) {
          spr = Art.powerups[d.item.type];
        } else {
          spr = this.lootSprites[d.item.type];
        }
        const bob = Math.sin(now * 0.006 + (d.item.x || 0)) * 2;
        if (spr) this._drawSprite(ctx, spr, d.item.x, d.item.y, 1, bob);
      } else if (d.kind === "enemy") {
        const e = d.e;
        const flash = now < e.stunUntil ? Math.floor(now / 40) % 2 : 0;
        if (flash) continue;
        if (e.kind === "drone") {
          const spr = this._droneSprite(e);
          if (spr) this._drawSprite(ctx, spr, e.x, e.y, e.facing < 0 ? 1 : -1);
        } else {
          const spr = this._soldierSprite(e);
          if (spr) this._drawSprite(ctx, spr, e.x, e.y, e.facing);
        }
      } else if (d.kind === "player") {
        const p = d.p;
        const iframe = now < p.iframeUntil && Math.floor(now / 50) % 2;
        if (iframe) continue;
        const bob = p.onGround ? (p.state === "walk" ? Math.sin(p.frame * 1.4) * 1.5 : 0) : 0;
        const spr = this._playerSprite(p);
        if (spr) this._drawSprite(ctx, spr, p.x, p.y, p.facing, bob);
        // Persistent long neon blade while slashing
        if (p.state === "slash" && this.neonSword) {
          const reach = p.facing * 14;
          const sx = Math.floor(p.x * VIEW_SCALE - this.camX * VIEW_SCALE + reach);
          const sy = Math.floor(p.y * VIEW_SCALE - this.camY * VIEW_SCALE - 18 + bob);
          ctx.save();
          if (p.facing < 0) {
            ctx.translate(sx, sy);
            ctx.rotate(-0.55);
            ctx.scale(-1.55, 1.55);
            this._blitNeonOutline(ctx, this.neonSword, 0, 0);
          } else {
            ctx.translate(sx, sy);
            ctx.rotate(0.55);
            ctx.scale(1.55, 1.55);
            this._blitNeonOutline(ctx, this.neonSword, 0, 0);
          }
          ctx.restore();
        }
      }
    }

    this._drawMarkers(ctx, this._inventory || {}, now);
    this._drawFx(ctx, now);
  }
}
