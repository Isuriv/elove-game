/* Side-scroller canvas renderer — 480×270 native resolution */
import { CFG, TILE } from "./config.js";
import { World } from "./world.js";
import { Art, animFrame, animHoldMs } from "./assets.js";
import { makeTiles, makeLootSprites, makeMarkerGlow, makeSlashArc } from "./sprites.js";

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
  { kind: "city", art: "cyberCity", x: 12 * T, y: 10 * T },
  { kind: "city", art: "cyberCity2", x: 48 * T, y: 10 * T },
  { kind: "city", art: "cyberCity", x: 76 * T, y: 10 * T },
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
    this.ctx.imageSmoothingEnabled = true;

    this.fallbackTiles = makeFallbackTiles();
    this.lootSprites = makeLootSprites();
    this.markerGlow = makeMarkerGlow();
    this.slashArc = makeSlashArc();

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
    this.ctx.imageSmoothingEnabled = true;
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
    this.fx.push({
      type: "slash",
      x: player.x + player.facing * 14,
      y: player.y - 4,
      facing: player.facing,
      until: performance.now() + 140,
    });
  }

  playHitSparks(x, y, color) {
    this.fx.push({ type: "sparks", x, y, color, until: performance.now() + 280, t0: performance.now() });
  }

  showForceRing(player, now) {
    this.forceRing = { x: player.x, y: player.y, until: now + 220 };
    this.fx.push({ type: "ring", x: player.x, y: player.y, until: now + 280, t0: now });
  }

  syncFrame(player, enemies, loot, inventory, now, extras = {}) {
    this.titleCam = false;
    this._player = player;
    this._enemies = enemies;
    this._loot = loot;
    this._inventory = inventory;
    this._now = now;
    this._bullets = extras.bullets || [];
    this._scrollX = extras.scrollX != null ? extras.scrollX : null;

    const viewW = this.cssW / VIEW_SCALE;
    const viewH = this.cssH / VIEW_SCALE;

    if (this._scrollX != null) {
      this.camX = Math.floor(this._scrollX);
      this.camY = Math.floor(player.y - viewH * 0.55);
    } else {
      const targetX = player.x - viewW / 2;
      const targetY = player.y - viewH / 2 - 8;
      this.camX = Math.floor(targetX);
      this.camY = Math.floor(targetY);
    }

    const maxX = Math.max(0, World.pixelW() - viewW);
    const maxY = Math.max(0, World.pixelH() - viewH);
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
    ctx.imageSmoothingEnabled = true;
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
    ctx.imageSmoothingEnabled = true;
    for (let x = -scroll; x < this.cssW + dw; x += dw) {
      ctx.drawImage(img, x, y, dw, h);
    }
    ctx.restore();
  }

  _drawSky(ctx) {
    const neon = Art.neon;

    // Full-bleed synthwave sunset (ref 1 palette)
    if (neon?.skySunset) {
      ctx.imageSmoothingEnabled = true;
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
      else if (d.kind === "city") spr = Art[d.art];
      else if (d.kind === "prop" && Art.props[d.idx]) spr = Art.props[d.idx];
      if (!spr) continue;
      const sx = Math.floor(d.x * VIEW_SCALE - this.camX * VIEW_SCALE - spr.width / 2);
      const sy = Math.floor(d.y * VIEW_SCALE - this.camY * VIEW_SCALE - spr.height);
      if (sx + spr.width < -40 || sx > this.cssW + 40) continue;
      ctx.drawImage(spr, sx, sy);
    }
  }

  _drawWorld(ctx) {
    const tilePx = CFG.TILE * VIEW_SCALE;
    const startTx = Math.max(0, Math.floor(this.camX / CFG.TILE) - 1);
    const startTy = Math.max(0, Math.floor(this.camY / CFG.TILE) - 1);
    const endTx = Math.min(World.W, Math.ceil((this.camX + this.cssW / VIEW_SCALE) / CFG.TILE) + 1);
    const endTy = Math.min(World.H, Math.ceil((this.camY + this.cssH / VIEW_SCALE) / CFG.TILE) + 1);

    const ground = Art.neon?.ground || Art.tileGround || this.fallbackTiles.solid;
    const plat = Art.neon?.platform || Art.tilePlat || this.fallbackTiles.plat;

    for (let ty = startTy; ty < endTy; ty++) {
      for (let tx = startTx; tx < endTx; tx++) {
        const t = World.get(tx, ty);
        if (t === TILE.EMPTY) continue;
        const sx = Math.floor(tx * CFG.TILE * VIEW_SCALE - this.camX * VIEW_SCALE);
        const sy = Math.floor(ty * CFG.TILE * VIEW_SCALE - this.camY * VIEW_SCALE);

        if (t === TILE.SOLID) {
          ctx.drawImage(ground, sx, sy, tilePx, tilePx);
        } else if (t === TILE.PLATFORM) {
          ctx.drawImage(plat, sx, sy, tilePx, Math.floor(tilePx * 0.4));
        } else if (t === TILE.EXIT) {
          ctx.drawImage(this.fallbackTiles.exit, sx, sy, tilePx, tilePx);
          // Cyan glow rim
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
          : "idle";
    const fromSheet = animFrame(Art.cyborgAnims, state, e.frame);
    if (fromSheet) return fromSheet;
    if (e.state === "attack" && Art.soldierShoot) return Art.soldierShoot;
    if ((e.state === "walk" || e.state === "headless") && Art.soldierWalk.length) {
      return Art.soldierWalk[Math.floor(e.frame) % Art.soldierWalk.length];
    }
    return Art.soldierStand || Art.soldierWalk[0] || null;
  }

  _playerSprite(p) {
    let state = "fly";
    if (p.state === "hurt") state = "hurt";
    return animFrame(Art.playerAnims, state, p.frame, Art.catRocket);
  }

  _droneSprite(e) {
    const state = e.state === "attack" ? "attack" : e.state === "hurt" ? "hurt" : "fly";
    return animFrame(Art.droneAnims, state, e.frame, Art.drone);
  }

  _drawSprite(ctx, spr, x, y, facing = 1, bob = 0) {
    if (!spr) return;
    const w = spr.width;
    const h = spr.height;
    const sx = Math.floor(x * VIEW_SCALE - this.camX * VIEW_SCALE - w / 2);
    const sy = Math.floor(y * VIEW_SCALE - this.camY * VIEW_SCALE - h + 4 + bob);
    ctx.save();
    if (facing < 0) {
      ctx.translate(sx + w, sy);
      ctx.scale(-1, 1);
      ctx.drawImage(spr, 0, 0);
    } else {
      ctx.drawImage(spr, sx, sy);
    }
    ctx.restore();
  }

  _drawMarkers(ctx, inventory, now) {
    // Continual blaster — no exit race marker
    if (!inventory || inventory.cleared == null) return;
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
        ctx.globalAlpha = 0.9;
        if (fx.facing < 0) {
          ctx.translate(sx, sy);
          ctx.scale(-1, 1);
          ctx.drawImage(spr, -spr.width / 2, -spr.height / 2);
        } else {
          ctx.drawImage(spr, sx - spr.width / 2, sy - spr.height / 2);
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
    this._drawWorld(ctx);

    ctx.fillStyle = "rgba(12, 6, 22, 0.35)";
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    if (Art.uiFrame) {
      const fw = Math.min(200, this.cssW * 0.45);
      const fh = fw * (Art.uiFrame.height / Art.uiFrame.width);
      ctx.drawImage(Art.uiFrame, (this.cssW - fw) / 2, this.cssH * 0.12, fw, fh);
    }

    if (Art.playerAnims || Art.catRocket) {
      const spr = animFrame(Art.playerAnims, "fly", now * 0.004, Art.catRocket);
      if (spr) {
        const x = this.cssW * 0.5 - spr.width / 2;
        const y = this.cssH * 0.55 + Math.sin(now * 0.003) * 4;
        ctx.drawImage(spr, x, y);
      }
    }
    if (Art.droneAnims || Art.drone) {
      const spr = animFrame(Art.droneAnims, "fly", now * 0.004, Art.drone);
      if (spr) {
        ctx.drawImage(
          spr,
          this.cssW * 0.72 + Math.sin(now * 0.002) * 8,
          this.cssH * 0.36 + Math.cos(now * 0.0025) * 5
        );
      }
    }
    if (Art.cyborgAnims || Art.soldierStand) {
      const spr = animFrame(Art.cyborgAnims, "walk", now * 0.0035, Art.soldierStand);
      if (spr) ctx.drawImage(spr, this.cssW * 0.18, this.cssH * 0.52);
    }
  }

  render() {
    const ctx = this.ctx;
    const now = performance.now();
    ctx.imageSmoothingEnabled = true;

    if (this.titleCam || !this._player) {
      this._drawTitleBg(ctx, now);
      return;
    }

    this._drawSky(ctx);
    this._drawDecor(ctx);
    this._drawWorld(ctx);

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
        const hold = animHoldMs("blade", "spin", 110);
        const spin = Math.floor(now / hold);
        const spr =
          d.item.type === "sword" || d.item.type === "power"
            ? animFrame(Art.bladeAnims, "spin", spin, Art.gunIcon) ||
              this.lootSprites.sword ||
              this.lootSprites.power
            : this.lootSprites[d.item.type];
        const bob = Math.sin(now * 0.006 + (d.item.bob || 0)) * 2;
        if (spr) this._drawSprite(ctx, spr, d.item.x, d.item.y, 1, bob);
        else {
          // Fallback power star
          const sx = Math.floor(d.item.x * VIEW_SCALE - this.camX * VIEW_SCALE);
          const sy = Math.floor(d.item.y * VIEW_SCALE - this.camY * VIEW_SCALE + bob);
          ctx.fillStyle = CFG.COLORS.gold;
          ctx.beginPath();
          ctx.arc(sx, sy, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = CFG.COLORS.pink;
          ctx.fillRect(sx - 2, sy - 5, 4, 10);
          ctx.fillRect(sx - 5, sy - 2, 10, 4);
        }
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
        const bob = Math.sin(p.frame * 1.2) * 1.2;
        const spr = this._playerSprite(p);
        if (spr) this._drawSprite(ctx, spr, p.x, p.y, p.facing, bob);
      }
    }

    // Auto-blast bolts
    for (const b of this._bullets || []) {
      if (!b.alive) continue;
      const sx = Math.floor(b.x * VIEW_SCALE - this.camX * VIEW_SCALE);
      const sy = Math.floor(b.y * VIEW_SCALE - this.camY * VIEW_SCALE);
      ctx.save();
      ctx.fillStyle = b.color || CFG.COLORS.cyan;
      ctx.shadowColor = b.color || CFG.COLORS.cyan;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(sx + 1, sy, 3, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    this._drawMarkers(ctx, this._inventory || {}, now);
    this._drawFx(ctx, now);
  }
}
