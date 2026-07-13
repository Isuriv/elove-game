/* True 2D canvas renderer — HD pixel, top-down, nearest-neighbor */
import { CFG, TILE } from "./config.js";
import { World } from "./world.js";
import {
  makeTiles,
  makePlayerFrames,
  makeCyborgFrames,
  makeLootSprites,
  makeMarkerGlow,
  makeSlashArc,
} from "./sprites.js";

const VIEW_SCALE = CFG.VIEW_SCALE; // canvas pixels per logical unit

export class Scene2D {
  constructor(wrap) {
    this.wrap = wrap;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "pixel-canvas";
    this.canvas.setAttribute("aria-label", "ELOVE lab escape game");
    wrap.insertBefore(this.canvas, wrap.firstChild);
    this.ctx = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;

    this.tiles = makeTiles();
    this.playerFrames = makePlayerFrames();
    this.cyborgFrames = makeCyborgFrames();
    this.lootSprites = makeLootSprites();
    this.markerGlow = makeMarkerGlow();
    this.slashArc = makeSlashArc();

    this.camX = 0;
    this.camY = 0;
    this.titleCam = true;
    this.fx = [];
    this.forceRing = null;
    this.dpr = 1;
    this.cssW = 0;
    this.cssH = 0;

    this._resize();
    window.addEventListener("resize", () => this._resize());
  }

  _resize() {
    const rect = this.wrap.getBoundingClientRect();
    this.cssW = Math.max(320, Math.floor(rect.width));
    this.cssH = Math.max(240, Math.floor(rect.height));
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    // Internal buffer in CSS pixels (nearest-neighbor upscale via CSS)
    this.canvas.width = this.cssW;
    this.canvas.height = this.cssH;
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

  spawnPlayer(_player) {}
  spawnEnemies(_enemies) {}

  setTitleCamera() {
    this.titleCam = true;
    // Center on lab mid
    this.camX = World.pixelW() / 2 - this.cssW / (2 * VIEW_SCALE);
    this.camY = World.pixelH() / 2 - this.cssH / (2 * VIEW_SCALE);
  }

  playWinFlourish(_player) {
    this.fx.push({ type: "burst", x: _player.x, y: _player.y, until: performance.now() + 900, color: CFG.COLORS.gold });
  }

  playDeathFlourish(_player) {
    this.fx.push({ type: "burst", x: _player.x, y: _player.y, until: performance.now() + 700, color: CFG.COLORS.danger });
  }

  playSlashVfx(player) {
    this.fx.push({
      type: "slash",
      x: player.x + player.facing * 12,
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

  syncFrame(player, enemies, loot, inventory, now) {
    this.titleCam = false;
    this._player = player;
    this._enemies = enemies;
    this._loot = loot;
    this._inventory = inventory;
    this._now = now;

    // Pixel-perfect camera follow (integer scroll in screen space)
    const targetX = player.x - this.cssW / (2 * VIEW_SCALE);
    const targetY = player.y - this.cssH / (2 * VIEW_SCALE) - 4;
    this.camX = Math.floor(targetX);
    this.camY = Math.floor(targetY);

    // Clamp to world
    const maxX = Math.max(0, World.pixelW() - this.cssW / VIEW_SCALE);
    const maxY = Math.max(0, World.pixelH() - this.cssH / VIEW_SCALE);
    this.camX = Math.max(0, Math.min(maxX, this.camX));
    this.camY = Math.max(0, Math.min(maxY, this.camY));
  }

  _tileSprite(t, tx, ty) {
    switch (t) {
      case TILE.WALL:
        return this.tiles.wall;
      case TILE.FLOOR:
        return (tx + ty) % 2 === 0 ? this.tiles.floor : this.tiles.floorAlt;
      case TILE.POD:
        return this.tiles.pod;
      case TILE.CLOSET:
        return this.tiles.closet;
      case TILE.CONSOLE:
        return this.tiles.console;
      case TILE.HIDDEN_BTN:
        return this.tiles.hiddenBtn;
      case TILE.DOOR_LOCKED:
        return this.tiles.doorLocked;
      case TILE.DOOR_OPEN:
        return this.tiles.doorOpen;
      case TILE.EXIT:
        return this.tiles.exit;
      case TILE.DECOR:
        return this.tiles.decor;
      case TILE.BEANBAG:
        return this.tiles.beanbag;
      case TILE.CHAIR:
        return this.tiles.chair;
      case TILE.PLANT:
        return this.tiles.plant;
      case TILE.FRIDGE:
        return this.tiles.fridge;
      case TILE.LAMP:
        return this.tiles.lamp;
      case TILE.PLUSH:
        return this.tiles.plush;
      case TILE.TABLE:
        return this.tiles.table;
      case TILE.RUG:
        return this.tiles.rug;
      case TILE.SHELF:
        return this.tiles.shelf;
      default:
        return this.tiles.empty;
    }
  }

  _drawWorld(ctx) {
    const tilePx = CFG.TILE * VIEW_SCALE;
    const startTx = Math.max(0, Math.floor(this.camX / CFG.TILE) - 1);
    const startTy = Math.max(0, Math.floor(this.camY / CFG.TILE) - 1);
    const endTx = Math.min(World.W, Math.ceil((this.camX + this.cssW / VIEW_SCALE) / CFG.TILE) + 1);
    const endTy = Math.min(World.H, Math.ceil((this.camY + this.cssH / VIEW_SCALE) / CFG.TILE) + 1);

    for (let ty = startTy; ty < endTy; ty++) {
      for (let tx = startTx; tx < endTx; tx++) {
        const t = World.get(tx, ty);
        const spr = this._tileSprite(t, tx, ty);
        const sx = Math.floor(tx * CFG.TILE * VIEW_SCALE - this.camX * VIEW_SCALE);
        const sy = Math.floor(ty * CFG.TILE * VIEW_SCALE - this.camY * VIEW_SCALE);
        ctx.drawImage(spr, sx, sy, tilePx, tilePx);
      }
    }
  }

  _framePick(frames, state, anim) {
    const list = frames[state] || frames.idle || frames.walk;
    if (!list || !list.length) return null;
    const idx = Math.floor(anim) % list.length;
    return list[idx];
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

  _drawMarker(ctx, x, y, color, label, now, pulse = true) {
    const sx = Math.floor(x * VIEW_SCALE - this.camX * VIEW_SCALE);
    const sy = Math.floor(y * VIEW_SCALE - this.camY * VIEW_SCALE);
    const pulseAmt = pulse ? 0.65 + 0.35 * Math.sin(now * 0.008) : 0.8;
    ctx.save();
    ctx.globalAlpha = pulseAmt;
    ctx.drawImage(this.markerGlow, sx - 20, sy - 28, 40, 40);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sx, sy - 18, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = CFG.COLORS.cream;
    ctx.lineWidth = 1;
    ctx.stroke();
    // stem
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 12);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    ctx.restore();

    if (label) {
      ctx.save();
      ctx.font = "bold 11px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(20,12,32,0.75)";
      const tw = ctx.measureText(label).width;
      ctx.fillRect(sx - tw / 2 - 4, sy - 42, tw + 8, 14);
      ctx.fillStyle = color;
      ctx.fillText(label, sx, sy - 31);
      ctx.restore();
    }
  }

  _drawMarkers(ctx, inventory, enemies, now) {
    // Pod always
    this._drawMarker(ctx, 6 * CFG.TILE + 8, 5 * CFG.TILE + 8, CFG.COLORS.cyan, "POD", now, false);

    if (!inventory.sword) {
      this._drawMarker(ctx, 15 * CFG.TILE + 8, 11 * CFG.TILE + 8, CFG.COLORS.gold, "CLOSET", now);
    }

    if (!inventory.buttonPressed) {
      this._drawMarker(ctx, 19 * CFG.TILE + 8, 4 * CFG.TILE + 8, CFG.COLORS.purple, "CONSOLE", now);
      this._drawMarker(
        ctx,
        21 * CFG.TILE + 8,
        5 * CFG.TILE + 8,
        CFG.COLORS.pink,
        inventory.consoleRead ? "BTN?" : "",
        now,
        inventory.consoleRead
      );
    }

    this._drawMarker(
      ctx,
      33 * CFG.TILE + 8,
      18.5 * CFG.TILE,
      inventory.doorUnlocked ? CFG.COLORS.ok : CFG.COLORS.danger,
      inventory.doorUnlocked ? "OPEN" : "DOOR",
      now
    );

    if (inventory.doorUnlocked) {
      this._drawMarker(
        ctx,
        36 * CFG.TILE + 8,
        18.5 * CFG.TILE,
        CFG.COLORS.ok,
        inventory.buttonPressed ? "EXIT" : "EXIT (arm)",
        now
      );
    }

    const keyEnemy = enemies.find((e) => e.dropsKey && e.alive);
    if (keyEnemy) {
      this._drawMarker(ctx, keyEnemy.x, keyEnemy.y - 10, CFG.COLORS.cyan, "KEY!", now);
    }
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
          const r = 4 + t * 18;
          ctx.fillRect(sx + Math.cos(a) * r, sy + Math.sin(a) * r - t * 10, 3, 3);
        }
      } else if (fx.type === "burst") {
        const t = 1 - (fx.until - now) / 900;
        const sx = Math.floor(fx.x * VIEW_SCALE - this.camX * VIEW_SCALE);
        const sy = Math.floor(fx.y * VIEW_SCALE - this.camY * VIEW_SCALE);
        ctx.strokeStyle = fx.color;
        ctx.globalAlpha = 1 - t;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 8 + t * 40, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (fx.type === "ring") {
        const t = 1 - (fx.until - now) / 280;
        const sx = Math.floor(fx.x * VIEW_SCALE - this.camX * VIEW_SCALE);
        const sy = Math.floor(fx.y * VIEW_SCALE - this.camY * VIEW_SCALE);
        ctx.strokeStyle = CFG.COLORS.pink;
        ctx.globalAlpha = 0.7 * (1 - t);
        ctx.lineWidth = 3;
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
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, CFG.FORCE_RANGE * VIEW_SCALE, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      this.forceRing = null;
    }
  }

  _drawTitleBg(ctx, now) {
    // Soft vignette lab preview
    this._drawWorld(ctx);
    ctx.fillStyle = "rgba(20,12,32,0.45)";
    ctx.fillRect(0, 0, this.cssW, this.cssH);
    // floating sparkles
    ctx.fillStyle = CFG.COLORS.pink;
    for (let i = 0; i < 12; i++) {
      const x = ((Math.sin(now * 0.0007 + i * 1.7) * 0.5 + 0.5) * this.cssW) | 0;
      const y = ((Math.cos(now * 0.0009 + i * 2.3) * 0.5 + 0.5) * this.cssH) | 0;
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(now * 0.004 + i);
      ctx.fillRect(x, y, 3, 3);
    }
    ctx.globalAlpha = 1;
  }

  render() {
    const ctx = this.ctx;
    const now = performance.now();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#120818";
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    if (this.titleCam || !this._player) {
      this._drawTitleBg(ctx, now);
      return;
    }

    this._drawWorld(ctx);

    // Depth-sort entities by Y
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
        const spr = this.lootSprites[d.item.type];
        const bob = Math.sin(now * 0.006) * 2;
        this._drawSprite(ctx, spr, d.item.x, d.item.y, 1, bob);
        // glow under loot
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.2 * Math.sin(now * 0.008);
        const sx = Math.floor(d.item.x * VIEW_SCALE - this.camX * VIEW_SCALE);
        const sy = Math.floor(d.item.y * VIEW_SCALE - this.camY * VIEW_SCALE);
        ctx.fillStyle = d.item.type === "eye" ? CFG.COLORS.cyan : CFG.COLORS.gold;
        ctx.beginPath();
        ctx.ellipse(sx, sy + 2, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (d.kind === "enemy") {
        const e = d.e;
        const state = e.state === "attack" ? "attack" : e.headless ? "headless" : e.state === "idle" ? "idle" : "walk";
        const spr = this._framePick(this.cyborgFrames, state, e.frame);
        const flash = now < e.stunUntil ? Math.floor(now / 40) % 2 : 0;
        if (!flash) this._drawSprite(ctx, spr, e.x, e.y, e.facing);
        if (e.dropsKey) {
          // cyan crown marker on key cyborg
          const sx = Math.floor(e.x * VIEW_SCALE - this.camX * VIEW_SCALE);
          const sy = Math.floor(e.y * VIEW_SCALE - this.camY * VIEW_SCALE - 36);
          ctx.fillStyle = CFG.COLORS.cyan;
          ctx.fillRect(sx - 3, sy, 6, 6);
        }
      } else if (d.kind === "player") {
        const p = d.p;
        let state = p.state;
        if (state === "grab") state = "idle";
        if (!this.playerFrames[state]) state = "idle";
        const spr = this._framePick(this.playerFrames, state, p.frame);
        const iframe = now < p.iframeUntil && Math.floor(now / 50) % 2;
        if (!iframe) this._drawSprite(ctx, spr, p.x, p.y, p.facing);
      }
    }

    this._drawMarkers(ctx, this._inventory || {}, this._enemies || [], now);
    this._drawFx(ctx, now);

    // Soft vignette (atmosphere, no occlusion)
    const g = ctx.createRadialGradient(
      this.cssW / 2,
      this.cssH / 2,
      Math.min(this.cssW, this.cssH) * 0.35,
      this.cssW / 2,
      this.cssH / 2,
      Math.max(this.cssW, this.cssH) * 0.72
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(18,8,24,0.35)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.cssW, this.cssH);
  }
}
