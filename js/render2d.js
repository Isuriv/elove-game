/* Side-scroller canvas renderer - 480x270 native resolution */
import { CFG, TILE, isPlatformTile } from "./config.js?v=rainbow-bolts-20260816b";
import { World } from "./world.js?v=play-freeze-20260815";
import { Art, bakeHardOutline, SPRITE_OUTLINE_COLOR, PLAYER_TARGET_H } from "./assets.js?v=play-freeze-20260815";
import { frameAt } from "./anim.js";
import { makeTiles, makeLootSprites, makeMarkerGlow } from "./sprites.js";

const VIEW_SCALE = CFG.VIEW_SCALE;
const T = CFG.TILE;
const RES_W = CFG.INTERNAL_W;
const RES_H = CFG.INTERNAL_H;

/** Mix a hex color toward white for a still-tinted bolt core. */
function hexTint(hex, towardWhite = 0.5) {
  const n = String(hex || "").replace("#", "");
  if (n.length < 6) return "#ffffff";
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const mix = (c) => Math.min(255, Math.round(c + (255 - c) * towardWhite));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/** Street props placed on ground / platforms (disabled - keep powerups/background only) */
const DECOR = [];

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
  pctx.fillStyle = "#8f78d4";
  pctx.fillRect(0, 3, S, S - 3);
  pctx.fillStyle = CFG.COLORS.purple;
  pctx.fillRect(0, 0, S, 4);
  pctx.fillStyle = CFG.COLORS.purpleLight || "#d6b6ff";
  pctx.fillRect(0, 0, S, 2);
  pctx.fillStyle = "#9a6ef0";
  for (let x = 1; x < S - 1; x += 3) pctx.fillRect(x, 3, 2, 1);

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
    this._outlineCache = new Map();

    this.camX = 0;
    this.camY = 0;
    this.titleCam = true;
    this.fx = [];
    this.forceRing = null;
    /** Visual theme: "canyon" | "cake" | "boring" | "neuralink" | "tesla" | "spacex" | "moon" */
    this.theme = "canyon";
    /** Logical framebuffer size (always INTERNAL_WxINTERNAL_H). */
    this.cssW = RES_W;
    this.cssH = RES_H;

    this._resize();
    window.addEventListener("resize", () => this._resize());
  }

  _resize() {
    // Fixed 480x270 framebuffer; CSS nearest-neighbor integer upscale (cap x3).
    this.cssW = RES_W;
    this.cssH = RES_H;
    if (this.canvas.width !== RES_W || this.canvas.height !== RES_H) {
      this.canvas.width = RES_W;
      this.canvas.height = RES_H;
    }
    this.ctx.imageSmoothingEnabled = false;

    const wrap = this.wrap;
    if (!wrap) return;

    const root = document.documentElement;
    const vw = Math.max(320, root.clientWidth || window.innerWidth);
    const vh = Math.max(180, root.clientHeight || window.innerHeight);
    const app = document.getElementById("app");
    const topbar = document.querySelector("#app > .topbar");
    const help = document.querySelector("#app > .hud-help");
    const appCss = app ? getComputedStyle(app) : null;
    const padX = appCss
      ? (parseFloat(appCss.paddingLeft) || 0) + (parseFloat(appCss.paddingRight) || 0)
      : 20;
    const padY = appCss
      ? (parseFloat(appCss.paddingTop) || 0) + (parseFloat(appCss.paddingBottom) || 0)
      : 12;
    const gap = appCss && appCss.rowGap ? parseFloat(appCss.rowGap) || 0 : 4;

    let maxScale = CFG.DISPLAY_MAX_SCALE || 3;
    try {
      const forced = Number(new URLSearchParams(location.search).get("scale"));
      if (Number.isFinite(forced) && forced >= 1 && forced <= 4) maxScale = Math.floor(forced);
    } catch (_err) {
      /* keep DISPLAY_MAX_SCALE */
    }

    const availW = Math.max(320, vw - padX);
    const maxByWidth = Math.max(1, Math.min(maxScale, Math.floor(availW / RES_W)));
    // Size the stage first so the controls panel wraps at the candidate width.
    wrap.style.width = `${RES_W * maxByWidth}px`;
    wrap.style.maxWidth = "none";
    wrap.style.aspectRatio = "auto";

    const chromeH =
      (topbar ? topbar.offsetHeight : 0) +
      (help ? help.offsetHeight : 0) +
      padY +
      gap * 2;
    const availH = Math.max(180, vh - chromeH);

    const scale = Math.max(1, Math.min(maxByWidth, Math.floor(availH / RES_H)));
    const dw = RES_W * scale;
    const dh = RES_H * scale;

    wrap.style.width = `${dw}px`;
    wrap.style.height = `${dh}px`;
    this.canvas.style.width = `${dw}px`;
    this.canvas.style.height = `${dh}px`;
    if (app) app.style.width = `${dw + padX}px`;
    this.displayScale = scale;
    if (typeof window !== "undefined") {
      window.__ELOVE_DISPLAY = { internal: `${RES_W}x${RES_H}`, scale, css: `${dw}x${dh}` };
    }
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

  setTheme(theme) {
    if (
      theme === "cake" ||
      theme === "boring" ||
      theme === "neuralink" ||
      theme === "tesla" ||
      theme === "spacex" ||
      theme === "moon" ||
      theme === "starship"
    )
      this.theme = theme;
    else this.theme = "canyon";
  }

  setTitleCamera() {
    this.titleCam = true;
    this.camX = 0;
    this.camY = 0;
  }

  playWinFlourish(_player) {
    const now = performance.now();
    this.fx.push({
      type: "burst",
      x: _player.x,
      y: _player.y,
      t0: now,
      until: now + 900,
      color: CFG.COLORS.gold,
    });
  }

  /** Level 5 reunion cinematic - hug -> Mars movie -> vacation -> Mars save. */
  startEloveCinematic(player, now = performance.now()) {
    for (const vid of [Art.starship?.movieVideo, Art.starship?.vacationVideo]) {
      if (!vid) continue;
      try {
        vid.pause();
        vid.currentTime = 0;
      } catch (_) {
        /* ignore seek races before metadata */
      }
    }
    this._cine = {
      t0: now,
      px: player?.x ?? 0,
      py: player?.y ?? 0,
      videoStarted: false,
      vacationStarted: false,
    };
    this.fx.push({
      type: "burst",
      x: this._cine.px,
      y: this._cine.py,
      t0: now,
      until: now + 900,
      color: CFG.COLORS.pink || "#ff2ea6",
    });
  }

  clearEloveCinematic() {
    for (const vid of [Art.starship?.movieVideo, Art.starship?.vacationVideo]) {
      if (!vid) continue;
      try {
        vid.pause();
      } catch (_) {
        /* ignore */
      }
    }
    this._cine = null;
  }

  /** Cover-fit draw an HTMLVideoElement into the CSS viewport. */
  _drawCoverVideo(ctx, vid) {
    const vw = vid.videoWidth || 1280;
    const vh = vid.videoHeight || 720;
    if (vw < 2 || vh < 2) return;
    const scale = Math.max(this.cssW / vw, this.cssH / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    const dx = (this.cssW - dw) * 0.5;
    const dy = (this.cssH - dh) * 0.5;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(vid, dx, dy, dw, dh);
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
    const dur = (CFG.SLASH_DURATION || 240) + 90;
    // Single pink Three.js sword swing + afterimage trail
    this.fx.push({
      type: "swordSwing",
      x: player.x,
      y: player.y - 6,
      facing: player.facing,
      t0: now,
      until: now + dur,
    });
  }

  playHitSparks(x, y, color) {
    this.fx.push({ type: "sparks", x, y, color, until: performance.now() + 280, t0: performance.now() });
  }

  showForceRing(player, now) {
    this.forceRing = { x: player.x, y: player.y, until: now + 220 };
    this.fx.push({ type: "ring", x: player.x, y: player.y, until: now + 280, t0: now });
  }

  syncFrame(player, enemies, loot, inventory, now, bullets = [], helpers = []) {
    this.titleCam = false;
    this._player = player;
    this._enemies = enemies;
    this._loot = loot;
    this._inventory = inventory;
    this._bullets = bullets;
    this._helpers = helpers;
    this._now = now;

    const targetX = player.x - this.cssW / (2 * VIEW_SCALE);
    const targetY = player.y - this.cssH / (2 * VIEW_SCALE) - 8;
    this.camX = Math.floor(targetX);
    this.camY = Math.floor(targetY);

    const maxX = Math.max(0, World.pixelW() - this.cssW / VIEW_SCALE);
    const maxY = Math.max(0, World.pixelH() - this.cssH / VIEW_SCALE);
    this.camX = Math.floor(Math.max(0, Math.min(maxX, this.camX)));
    this.camY = Math.floor(Math.max(0, Math.min(maxY, this.camY)));
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
      ctx.drawImage(img, Math.floor(x), y, dw, h);
    }
    ctx.restore();
  }

  _drawSky(ctx) {
    if (this.theme === "cake") {
      this._drawCakeSky(ctx);
      return;
    }
    if (this.theme === "boring") {
      this._drawBoringSky(ctx);
      return;
    }
    if (this.theme === "neuralink") {
      this._drawNeuralinkSky(ctx);
      return;
    }
    if (this.theme === "tesla") {
      this._drawTeslaSky(ctx);
      return;
    }
    if (this.theme === "spacex") {
      this._drawSpaceXSky(ctx);
      return;
    }
    if (this.theme === "moon") {
      this._drawMoonSky(ctx);
      return;
    }
    if (this.theme === "starship") {
      this._drawStarshipSky(ctx);
      return;
    }
    const neon = Art.neon;
    const now = this._now || performance.now();

    // Full-bleed synthwave sunset (ref 1 palette)
    if (neon?.skySunset) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(neon.skySunset, 0, 0, this.cssW, this.cssH);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, this.cssH);
      g.addColorStop(0, CFG.COLORS.skyTop || "#6b3d9e");
      g.addColorStop(0.35, "#9a48c0");
      g.addColorStop(0.55, CFG.COLORS.skyMid || "#e050b8");
      g.addColorStop(0.75, "#ff9a78");
      g.addColorStop(1, CFG.COLORS.skyBot || "#ffd078");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.cssW, this.cssH);
    }

    // Soft parallax from cropped refs - keep light so baked sky stays dominant
    this._drawParallaxPlate(ctx, Art.refSunset, 0.08, 0.12, 0.28, 0.35);
    this._drawParallaxPlate(ctx, Art.refNight, 0.18, 0.22, 0.28, 0.22);
    this._drawParallaxPlate(ctx, Art.refTrain, 0.3, 0.32, 0.22, 0.18);

    // Far mountains + drifting cloud bank (behind city)
    if (neon?.mountains) this._tileLayer(ctx, neon.mountains, 0.1, 0.22, 0.38, 1);
    if (neon?.clouds) this._tileLayer(ctx, neon.clouds, 0.16, 0.08, 0.24, 0.9);

    // Distant flying cars (between clouds and city)
    this._drawFlyingCars(ctx, now);

    // Neon city bands
    if (neon?.cityFar) this._tileLayer(ctx, neon.cityFar, 0.24, 0.36, 0.48, 0.92);
    if (neon?.cityNear) this._tileLayer(ctx, neon.cityNear, 0.44, 0.44, 0.44, 1);

    // Magenta / peach horizon glow (warm, not muddy)
    const bloom = ctx.createLinearGradient(0, this.cssH * 0.4, 0, this.cssH * 0.78);
    bloom.addColorStop(0, "rgba(255, 110, 199, 0)");
    bloom.addColorStop(0.45, "rgba(255, 110, 199, 0.22)");
    bloom.addColorStop(1, "rgba(255, 200, 120, 0.28)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, this.cssH * 0.4, this.cssW, this.cssH * 0.38);

    // Soft peach-lilac haze (light) - avoids near-black vignette muddying ground
    const vig = ctx.createLinearGradient(0, this.cssH * 0.78, 0, this.cssH);
    vig.addColorStop(0, "rgba(214, 182, 255, 0)");
    vig.addColorStop(1, "rgba(255, 200, 160, 0.1)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, this.cssH * 0.78, this.cssW, this.cssH * 0.22);
  }

  /** Cake Realm - frosting parallax + tiny clouds + pink sparkle rain */
  _drawCakeSky(ctx) {
    const cake = Art.cake || Art.neon?.cake;
    const now = this._now || performance.now();

    if (cake?.sky) {
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.92;
      ctx.drawImage(cake.sky, 0, 0, this.cssW, this.cssH);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, this.cssH);
      g.addColorStop(0, "#8a58c0");
      g.addColorStop(0.35, "#ff8ad0");
      g.addColorStop(0.7, "#ffc0b0");
      g.addColorStop(1, "#fff5e8");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.cssW, this.cssH);
    }

    // Far cake mountains - softened so platforms stay readable
    if (cake?.mountains) {
      this._tileLayer(ctx, cake.mountains, 0.08, 0.22, 0.32, 0.4);
    }
    // Mid cake scenery - lighter wash, lower band
    if (cake?.midscape) {
      this._tileLayer(ctx, cake.midscape, 0.18, 0.45, 0.38, 0.32);
    }

    // Floating frosting clouds + pastries - patrol back and forth
    this._drawCakeClouds(ctx, now);
    this._drawCakePastries(ctx, now);

    // Soft magenta frosting bloom (kept gentle)
    const bloom = ctx.createLinearGradient(0, this.cssH * 0.5, 0, this.cssH * 0.88);
    bloom.addColorStop(0, "rgba(255, 110, 199, 0)");
    bloom.addColorStop(0.55, "rgba(255, 140, 200, 0.12)");
    bloom.addColorStop(1, "rgba(255, 210, 180, 0.16)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, this.cssH * 0.5, this.cssW, this.cssH * 0.38);

    // Sparse FG frosting accents - low alpha so gameplay stays crisp
    if (cake?.foreground) {
      this._tileLayer(ctx, cake.foreground, 0.55, 0, 0.18, 0.22);
      this._tileLayer(ctx, cake.foreground, 0.62, 0.84, 0.2, 0.18);
    }
  }

  _drawCakeClouds(ctx, now) {
    const cloud = Art.cake?.cloud || Art.neon?.cake?.cloud;
    if (!cloud) return;
    // 4x prior size (~14-24px -> ~56-96px)
    const flotilla = [
      { y: 0.08, amp: 55, speed: 0.00055, phase: 0.2, px: 84, alpha: 0.92, parallax: 0.1 },
      { y: 0.14, amp: 72, speed: 0.0004, phase: 1.7, px: 68, alpha: 0.82, parallax: 0.16 },
      { y: 0.06, amp: 48, speed: 0.0007, phase: 3.1, px: 96, alpha: 0.75, parallax: 0.07 },
      { y: 0.2, amp: 64, speed: 0.00048, phase: 4.4, px: 60, alpha: 0.88, parallax: 0.24 },
      { y: 0.12, amp: 88, speed: 0.00035, phase: 5.5, px: 80, alpha: 0.8, parallax: 0.18 },
      { y: 0.18, amp: 50, speed: 0.00062, phase: 2.3, px: 72, alpha: 0.78, parallax: 0.14 },
      { y: 0.1, amp: 78, speed: 0.00045, phase: 6.2, px: 68, alpha: 0.74, parallax: 0.2 },
      { y: 0.24, amp: 42, speed: 0.00058, phase: 0.9, px: 56, alpha: 0.7, parallax: 0.28 },
      { y: 0.05, amp: 60, speed: 0.0005, phase: 4.0, px: 60, alpha: 0.7, parallax: 0.09 },
      { y: 0.16, amp: 70, speed: 0.00042, phase: 1.1, px: 72, alpha: 0.76, parallax: 0.22 },
    ];
    this._drawCakeFlotilla(ctx, now, cloud, flotilla);
  }

  /** Floating pixel pastries - same size band as clouds, offset lanes */
  _drawCakePastries(ctx, now) {
    const pastries = Art.cake?.pastries || Art.neon?.cake?.pastries || [];
    if (!pastries.length) return;
    // Match cloud px sizes (4x); staggered phases so they don't stack on clouds
    const flotilla = [
      { y: 0.11, amp: 62, speed: 0.00048, phase: 0.8, px: 84, alpha: 0.9, parallax: 0.13 },
      { y: 0.19, amp: 58, speed: 0.00052, phase: 2.4, px: 68, alpha: 0.85, parallax: 0.19 },
      { y: 0.07, amp: 70, speed: 0.00038, phase: 3.9, px: 96, alpha: 0.8, parallax: 0.11 },
      { y: 0.22, amp: 45, speed: 0.0006, phase: 5.1, px: 60, alpha: 0.88, parallax: 0.26 },
      { y: 0.15, amp: 80, speed: 0.00044, phase: 1.3, px: 80, alpha: 0.82, parallax: 0.17 },
      { y: 0.09, amp: 52, speed: 0.00056, phase: 4.7, px: 72, alpha: 0.78, parallax: 0.15 },
      { y: 0.26, amp: 40, speed: 0.0005, phase: 6.0, px: 56, alpha: 0.75, parallax: 0.3 },
      { y: 0.13, amp: 66, speed: 0.00041, phase: 2.9, px: 72, alpha: 0.84, parallax: 0.21 },
    ];
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < flotilla.length; i++) {
      const f = flotilla[i];
      const spr = pastries[i % pastries.length];
      if (!spr) continue;
      const baseX = this.cssW * (0.12 + (i % 4) * 0.2);
      const patrol = Math.sin(now * f.speed + f.phase) * f.amp;
      const x = Math.floor(baseX + patrol - this.camX * f.parallax);
      const y = Math.floor(
        this.cssH * f.y + Math.sin(now * 0.0015 + f.phase) * 2.5
      );
      // Fit longest side to px so tall pastries match cloud visual size
      const fit = f.px / Math.max(spr.width, spr.height);
      const w = Math.max(2, Math.round(spr.width * fit));
      const h = Math.max(2, Math.round(spr.height * fit));
      ctx.globalAlpha = 0.5;
      const goingRight = Math.cos(now * f.speed + f.phase) >= 0;
      if (!goingRight) {
        ctx.save();
        ctx.translate(x + w, y);
        ctx.scale(-1, 1);
        ctx.drawImage(spr, 0, 0, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(spr, x, y, w, h);
      }
    }
    ctx.restore();
  }

  _drawCakeFlotilla(ctx, now, spr, flotilla) {
    if (!spr || !flotilla?.length) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < flotilla.length; i++) {
      const f = flotilla[i];
      const baseX = this.cssW * (0.06 + (i % 5) * 0.18);
      const patrol = Math.sin(now * f.speed + f.phase) * f.amp;
      const x = Math.floor(baseX + patrol - this.camX * f.parallax);
      const y = Math.floor(
        this.cssH * f.y + Math.sin(now * 0.0012 + f.phase) * 2
      );
      // Same fit rule as pastries - longest side = px
      const fit = f.px / Math.max(spr.width, spr.height);
      const w = Math.max(2, Math.round(spr.width * fit));
      const h = Math.max(2, Math.round(spr.height * fit));
      ctx.globalAlpha = 0.5;
      const goingRight = Math.cos(now * f.speed + f.phase) >= 0;
      if (!goingRight) {
        ctx.save();
        ctx.translate(x + w, y);
        ctx.scale(-1, 1);
        ctx.drawImage(spr, 0, 0, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(spr, x, y, w, h);
      }
    }
    ctx.restore();
  }

  /** Very small pink glowing sparkles raining across Cake Realm (full viewport). */
  _drawCakeSparkles(ctx, now) {
    const n = 110;
    const h = this.cssH;
    const w = this.cssW;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < n; i++) {
      const seed = i * 97.13 + 13.7;
      const fallSpeed = 0.04 + (i % 5) * 0.009;
      const fall = ((now * fallSpeed + seed * 40) % (h + 24)) - 12;
      const drift =
        ((seed * 17.3 + now * (0.01 + (i % 3) * 0.004) - this.camX * 0.05) %
          (w + 16)) -
        8;
      const x = Math.floor(((drift % w) + w) % w);
      const y = Math.floor(fall);
      const twinkle = 0.5 + 0.5 * Math.abs(Math.sin(now * 0.009 + seed));
      const size = i % 10 === 0 ? 2 : 1;
      // Soft pink glow halo (no additive wash -> stays pink, not white)
      ctx.globalAlpha = twinkle * 0.55;
      ctx.fillStyle = "#ff6ec7";
      ctx.fillRect(x - 1, y - 1, size + 2, size + 2);
      // Hot pink core
      ctx.globalAlpha = Math.min(1, twinkle * 0.95);
      ctx.fillStyle = "#ff2ea6";
      ctx.fillRect(x, y, size, size);
      // Tiny brighter pink tip
      if (size > 1) {
        ctx.globalAlpha = twinkle * 0.85;
        ctx.fillStyle = "#ff9ad5";
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.restore();
  }

  /** Boring Company - inside a lit Loop tunnel + horizon cars zooming by */
  _drawBoringSky(ctx) {
    const boring = Art.boring || Art.neon?.boring;
    const now = this._now || performance.now();

    if (boring?.sky) {
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.98;
      ctx.drawImage(boring.sky, 0, 0, this.cssW, this.cssH);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, this.cssH);
      g.addColorStop(0, "#c8d2da");
      g.addColorStop(0.4, "#d4dce2");
      g.addColorStop(0.75, "#e0e6ea");
      g.addColorStop(1, "#e8ecef");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.cssW, this.cssH);
    }

    // White-concrete wash - tunnel walls read pale, not charcoal
    const grade = ctx.createLinearGradient(0, 0, 0, this.cssH);
    grade.addColorStop(0, "rgba(235, 242, 248, 0.42)");
    grade.addColorStop(0.4, "rgba(228, 234, 238, 0.28)");
    grade.addColorStop(0.75, "rgba(220, 226, 230, 0.18)");
    grade.addColorStop(1, "rgba(210, 200, 180, 0.12)");
    ctx.fillStyle = grade;
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    // Far bore rings - stronger so it reads as being inside the tunnel
    if (boring?.tunnel) {
      this._tileLayer(ctx, boring.tunnel, 0.08, 0.1, 0.55, 0.42);
    }
    // Mid road / rib band along the horizon
    if (boring?.midscape) {
      this._tileLayer(ctx, boring.midscape, 0.18, 0.38, 0.42, 0.34);
    }

    // Giant TBM sitting in the far bore ahead of traffic
    this._drawBoringDrill(ctx, now);

    // Soft road lane wash under traffic
    const road = ctx.createLinearGradient(0, this.cssH * 0.48, 0, this.cssH * 0.72);
    road.addColorStop(0, "rgba(40, 48, 54, 0)");
    road.addColorStop(0.35, "rgba(40, 48, 54, 0.28)");
    road.addColorStop(0.7, "rgba(50, 56, 60, 0.22)");
    road.addColorStop(1, "rgba(40, 48, 54, 0)");
    ctx.fillStyle = road;
    ctx.fillRect(0, this.cssH * 0.48, this.cssW, this.cssH * 0.24);
    // Dashed horizon line
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#E8A84A";
    const dashY = Math.floor(this.cssH * 0.58);
    const scroll = Math.floor((now * 0.08 + this.camX * 0.2) % 28);
    for (let x = -scroll; x < this.cssW; x += 28) {
      ctx.fillRect(x, dashY, 12, 1);
    }
    ctx.restore();

    this._drawBoringVehicles(ctx, now);
    // Sparse rubble only - cars own the horizon
    this._drawBoringRocks(ctx, now);

    // Amber work-light bloom near lower third
    const bloom = ctx.createLinearGradient(0, this.cssH * 0.48, 0, this.cssH * 0.92);
    bloom.addColorStop(0, "rgba(232, 168, 74, 0)");
    bloom.addColorStop(0.5, "rgba(232, 168, 74, 0.1)");
    bloom.addColorStop(1, "rgba(160, 170, 175, 0.1)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, this.cssH * 0.48, this.cssW, this.cssH * 0.44);

    // Soft cyan vanishing-point accent
    const cyanAccent = ctx.createRadialGradient(
      this.cssW * 0.5,
      this.cssH * 0.36,
      4,
      this.cssW * 0.5,
      this.cssH * 0.36,
      this.cssW * 0.42
    );
    cyanAccent.addColorStop(0, "rgba(90, 200, 210, 0.1)");
    cyanAccent.addColorStop(1, "rgba(90, 200, 210, 0)");
    ctx.fillStyle = cyanAccent;
    ctx.fillRect(0, 0, this.cssW, this.cssH * 0.6);

    if (boring?.foreground) {
      this._tileLayer(ctx, boring.foreground, 0.55, 0, 0.12, 0.12);
      this._tileLayer(ctx, boring.foreground, 0.62, 0.88, 0.12, 0.1);
    }
  }

  /** Giant TBM in the far tunnel mouth - slow cutter spin + soft dust */
  _drawBoringDrill(ctx, now) {
    const drill = Art.boring?.drill || Art.neon?.boring?.drill;
    if (!drill) return;
    const targetH = this.cssH * 0.62;
    const fit = targetH / Math.max(1, drill.height);
    const w = Math.round(drill.width * fit);
    const h = Math.round(drill.height * fit);
    const x = Math.floor(this.cssW * 0.52 - w * 0.55 - this.camX * 0.05);
    const y = Math.floor(this.cssH * 0.18);
    const cx = x + w * 0.58;
    const cy = y + h * 0.48;
    const r = Math.min(w, h) * 0.28;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(drill, x, y, w, h);

    // Rotating cutter spokes on the face
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(now * 0.0014);
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = "#3a444c";
    ctx.lineWidth = Math.max(2, Math.round(r * 0.06));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18);
      ctx.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(232, 168, 74, 0.35)";
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.arc(
        Math.cos(a) * r * 0.7,
        Math.sin(a) * r * 0.7,
        Math.max(2, r * 0.05),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();

    // Soft cutter dust puff
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.004);
    const dust = ctx.createRadialGradient(cx, cy + r * 0.55, 2, cx, cy + r * 0.7, r * 1.1);
    dust.addColorStop(0, `rgba(210, 200, 180, ${0.18 + pulse * 0.1})`);
    dust.addColorStop(1, "rgba(210, 200, 180, 0)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = dust;
    ctx.fillRect(cx - r * 1.2, cy, r * 2.4, r * 1.3);
    ctx.restore();
  }

  /**
   * Horizon Loop traffic - all cars face + travel right ("forward").
   * Sprites already face right; no flip, no opposing lanes.
   */
  _drawBoringVehicles(ctx, now) {
    const vehicles = Art.boring?.vehicles || Art.neon?.boring?.vehicles || [];
    if (!vehicles.length) return;
    const flotilla = [
      { y: 0.5, speed: 0.092, phase: 0.0, px: 52, parallax: 0.2, trail: 22 },
      { y: 0.55, speed: 0.078, phase: 0.22, px: 40, parallax: 0.28, trail: 16 },
      { y: 0.48, speed: 0.105, phase: 0.48, px: 58, parallax: 0.16, trail: 26 },
      { y: 0.57, speed: 0.074, phase: 0.1, px: 36, parallax: 0.32, trail: 14 },
      { y: 0.52, speed: 0.098, phase: 0.66, px: 46, parallax: 0.22, trail: 20 },
      { y: 0.49, speed: 0.086, phase: 0.35, px: 44, parallax: 0.18, trail: 18 },
      { y: 0.56, speed: 0.112, phase: 0.8, px: 34, parallax: 0.3, trail: 24 },
      { y: 0.51, speed: 0.09, phase: 0.15, px: 50, parallax: 0.24, trail: 20 },
      { y: 0.47, speed: 0.07, phase: 0.55, px: 26, parallax: 0.14, trail: 12 },
      { y: 0.54, speed: 0.12, phase: 0.92, px: 30, parallax: 0.34, trail: 16 },
    ];
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < flotilla.length; i++) {
      const f = flotilla[i];
      const spr = vehicles[i % vehicles.length];
      if (!spr) continue;
      const fit = f.px / Math.max(spr.width, spr.height);
      const w = Math.max(2, Math.round(spr.width * fit));
      const h = Math.max(2, Math.round(spr.height * fit));
      const span = this.cssW + w + 64;
      const t = now * f.speed + f.phase * span;
      const progress = ((t % span) + span) % span;
      // Progress 0->span maps right edge -> left (travel left; art stays right-facing)
      const x = Math.floor(this.cssW + 20 - progress - this.camX * f.parallax);
      const y = Math.floor(this.cssH * f.y);
      // Amber headlight streak on nose (right / facing side)
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.38;
      ctx.fillStyle = "#E8A84A";
      ctx.fillRect(x + w - 2, y + Math.floor(h * 0.45), f.trail, 2);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.72;
      ctx.drawImage(spr, x, y, w, h);
    }
    ctx.restore();
  }

  /** Sparse rubble floaters - kept quiet so tunnel cars read clearly */
  _drawBoringRocks(ctx, now) {
    const rocks = Art.boring?.rocks || Art.neon?.boring?.rocks || [];
    if (!rocks.length) return;
    const flotilla = [
      { y: 0.08, speed: 0.014, phase: 0.0, px: 48, parallax: 0.1 },
      { y: 0.16, speed: 0.011, phase: 0.45, px: 36, parallax: 0.16 },
      { y: 0.12, speed: 0.013, phase: 0.7, px: 40, parallax: 0.12 },
    ];
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < flotilla.length; i++) {
      const f = flotilla[i];
      const spr = rocks[i % rocks.length];
      if (!spr) continue;
      const fit = f.px / Math.max(spr.width, spr.height);
      const w = Math.max(2, Math.round(spr.width * fit));
      const h = Math.max(2, Math.round(spr.height * fit));
      const span = this.cssW + w + 48;
      const t = now * f.speed + f.phase * span;
      const progress = ((t % span) + span) % span;
      const x = Math.floor(this.cssW + 16 - progress - this.camX * f.parallax);
      const y = Math.floor(
        this.cssH * f.y + Math.sin(now * 0.001 + f.phase * 6) * 2
      );
      ctx.globalAlpha = 0.28;
      ctx.drawImage(spr, x, y, w, h);
    }
    ctx.restore();
  }

  /** Amber / cyan dust motes for Boring Company tunnel atmosphere */
  _drawBoringSparkles(ctx, now) {
    const n = 70;
    const h = this.cssH;
    const w = this.cssW;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const seed = i * 9973;
      const x = Math.floor(((seed * 13 + now * (0.01 + (i % 5) * 0.0018)) % (w + 40)) - 20);
      const y = Math.floor(((seed * 17 + now * 0.007) % (h * 0.72)));
      const twinkle = 0.22 + 0.5 * (0.5 + 0.5 * Math.sin(now * 0.0038 + i));
      const size = i % 7 === 0 ? 2 : 1;
      ctx.globalAlpha = twinkle * 0.5;
      ctx.fillStyle = i % 3 === 0 ? "#E8A84A" : "#5AC8D2";
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore();
  }

  /** Neuralink - sterile OR parallax + floating brains */
  _drawNeuralinkSky(ctx) {
    const neuralink = Art.neuralink || Art.neon?.neuralink;
    const now = this._now || performance.now();

    if (neuralink?.sky) {
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.96;
      ctx.drawImage(neuralink.sky, 0, 0, this.cssW, this.cssH);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, this.cssH);
      g.addColorStop(0, "#c8d8e0");
      g.addColorStop(0.4, "#e0ecef");
      g.addColorStop(0.75, "#eef4f6");
      g.addColorStop(1, "#f6fafb");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.cssW, this.cssH);
    }

    // Cool sterile grade - lift whites / teal so OR never reads muddy
    const grade = ctx.createLinearGradient(0, 0, 0, this.cssH);
    grade.addColorStop(0, "rgba(140, 200, 210, 0.14)");
    grade.addColorStop(0.4, "rgba(220, 235, 238, 0.1)");
    grade.addColorStop(1, "rgba(240, 246, 248, 0.16)");
    ctx.fillStyle = grade;
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    // Softened pass2 - keep platforms/enemies readable over OR art
    if (neuralink?.orFar) {
      this._tileLayer(ctx, neuralink.orFar, 0.09, 0.22, 0.32, 0.3);
    }
    if (neuralink?.midscape) {
      this._tileLayer(ctx, neuralink.midscape, 0.2, 0.52, 0.32, 0.16);
    }

    this._drawNeuralinkBrains(ctx, now);

    // Soft surgical-light bloom near lower third
    const bloom = ctx.createLinearGradient(0, this.cssH * 0.48, 0, this.cssH * 0.92);
    bloom.addColorStop(0, "rgba(125, 223, 232, 0)");
    bloom.addColorStop(0.5, "rgba(77, 182, 172, 0.08)");
    bloom.addColorStop(1, "rgba(210, 220, 225, 0.12)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, this.cssH * 0.48, this.cssW, this.cssH * 0.44);

    // Soft cyan OR accent
    const cyanAccent = ctx.createRadialGradient(
      this.cssW * 0.75,
      this.cssH * 0.22,
      4,
      this.cssW * 0.75,
      this.cssH * 0.22,
      this.cssW * 0.36
    );
    cyanAccent.addColorStop(0, "rgba(125, 223, 232, 0.1)");
    cyanAccent.addColorStop(1, "rgba(125, 223, 232, 0)");
    ctx.fillStyle = cyanAccent;
    ctx.fillRect(0, 0, this.cssW, this.cssH * 0.55);

    if (neuralink?.foreground) {
      this._tileLayer(ctx, neuralink.foreground, 0.55, 0, 0.12, 0.1);
      this._tileLayer(ctx, neuralink.foreground, 0.62, 0.88, 0.12, 0.08);
    }
  }

  /**
   * Floating brains - same size band as L2 pastries / L2.5 rocks / L3 cars (56-96px),
   * low-mid opacity, slow leftward drift + gentle bob.
   */
  _drawNeuralinkBrains(ctx, now) {
    const brains = Art.neuralink?.brains || Art.neon?.neuralink?.brains || [];
    if (!brains.length) return;
    const flotilla = [
      { y: 0.1, speed: 0.028, phase: 0.0, px: 92, parallax: 0.12 },
      { y: 0.18, speed: 0.022, phase: 0.3, px: 72, parallax: 0.2 },
      { y: 0.06, speed: 0.032, phase: 0.55, px: 96, parallax: 0.1 },
      { y: 0.24, speed: 0.02, phase: 0.15, px: 64, parallax: 0.28 },
      { y: 0.14, speed: 0.026, phase: 0.7, px: 84, parallax: 0.16 },
      { y: 0.08, speed: 0.03, phase: 0.42, px: 76, parallax: 0.14 },
      { y: 0.22, speed: 0.018, phase: 0.88, px: 56, parallax: 0.3 },
      { y: 0.12, speed: 0.024, phase: 0.22, px: 80, parallax: 0.18 },
    ];
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < flotilla.length; i++) {
      const f = flotilla[i];
      const spr = brains[i % brains.length];
      if (!spr) continue;
      const fit = f.px / Math.max(spr.width, spr.height);
      const w = Math.max(2, Math.round(spr.width * fit));
      const h = Math.max(2, Math.round(spr.height * fit));
      const span = this.cssW + w + 48;
      const t = now * f.speed + f.phase * span;
      const progress = ((t % span) + span) % span;
      const x = Math.floor(this.cssW + 16 - progress - this.camX * f.parallax);
      const y = Math.floor(
        this.cssH * f.y + Math.sin(now * 0.0012 + f.phase * 6) * 3
      );
      ctx.globalAlpha = 0.4;
      ctx.drawImage(spr, x, y, w, h);
    }
    ctx.restore();
  }

  /** Teal / cyan sparkle motes for Neuralink OR atmosphere */
  _drawNeuralinkSparkles(ctx, now) {
    const n = 70;
    const h = this.cssH;
    const w = this.cssW;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const seed = i * 9973;
      const x = Math.floor(((seed * 13 + now * (0.01 + (i % 5) * 0.0018)) % (w + 40)) - 20);
      const y = Math.floor(((seed * 17 + now * 0.007) % (h * 0.72)));
      const twinkle = 0.22 + 0.5 * (0.5 + 0.5 * Math.sin(now * 0.0038 + i));
      const size = i % 7 === 0 ? 2 : 1;
      ctx.globalAlpha = twinkle * 0.5;
      ctx.fillStyle = i % 3 === 0 ? "#4DB6AC" : "#7DDFE8";
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore();
  }

  /** Tesla Works - soft Gigafactory parallax + floating cars / Cybertrucks */
  _drawTeslaSky(ctx) {
    const tesla = Art.tesla || Art.neon?.tesla;
    const now = this._now || performance.now();

    if (tesla?.sky) {
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.96;
      ctx.drawImage(tesla.sky, 0, 0, this.cssW, this.cssH);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, this.cssH);
      g.addColorStop(0, "#8aa8c8");
      g.addColorStop(0.4, "#d0dce8");
      g.addColorStop(0.75, "#eef2f6");
      g.addColorStop(1, "#f7f9fb");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.cssW, this.cssH);
    }

    // Stronger cool silver-blue grade (analogous cool harmony: steel + Tesla blue)
    const cool = ctx.createLinearGradient(0, 0, 0, this.cssH);
    cool.addColorStop(0, "rgba(100, 140, 185, 0.22)");
    cool.addColorStop(0.4, "rgba(190, 208, 224, 0.14)");
    cool.addColorStop(1, "rgba(236, 242, 248, 0.22)");
    ctx.fillStyle = cool;
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    // Far factory - slightly stronger presence for Gigafactory read
    if (tesla?.factory) {
      this._tileLayer(ctx, tesla.factory, 0.09, 0.2, 0.34, 0.48);
    }
    // Mid halls - lighter so pink leftovers stay subdued
    if (tesla?.midscape) {
      this._tileLayer(ctx, tesla.midscape, 0.2, 0.46, 0.38, 0.32);
    }

    // Vehicles only - no cloud/steam floaters on Tesla Works
    this._drawTeslaVehicles(ctx, now);

    // Soft Tesla-blue complementary accent bloom (blue vs warm platform lips)
    const bloom = ctx.createLinearGradient(0, this.cssH * 0.48, 0, this.cssH * 0.92);
    bloom.addColorStop(0, "rgba(62, 106, 225, 0)");
    bloom.addColorStop(0.5, "rgba(62, 106, 225, 0.1)");
    bloom.addColorStop(1, "rgba(180, 200, 220, 0.16)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, this.cssH * 0.48, this.cssW, this.cssH * 0.44);

    // Tiny red safety-light accent wash (Tesla brand red, very subtle)
    const redAccent = ctx.createRadialGradient(
      this.cssW * 0.82,
      this.cssH * 0.28,
      4,
      this.cssW * 0.82,
      this.cssH * 0.28,
      this.cssW * 0.35
    );
    redAccent.addColorStop(0, "rgba(232, 33, 39, 0.06)");
    redAccent.addColorStop(1, "rgba(232, 33, 39, 0)");
    ctx.fillStyle = redAccent;
    ctx.fillRect(0, 0, this.cssW, this.cssH * 0.55);

    // Sparse FG conduit accents - keep low so gameplay stays crisp
    if (tesla?.foreground) {
      this._tileLayer(ctx, tesla.foreground, 0.55, 0, 0.14, 0.14);
      this._tileLayer(ctx, tesla.foreground, 0.62, 0.86, 0.16, 0.12);
    }
  }

  _drawTeslaSteam(ctx, now) {
    const steam = Art.tesla?.steam || Art.neon?.tesla?.steam;
    if (!steam) return;
    const flotilla = [
      { y: 0.08, amp: 55, speed: 0.00055, phase: 0.2, px: 84, alpha: 0.5, parallax: 0.1 },
      { y: 0.14, amp: 72, speed: 0.0004, phase: 1.7, px: 68, alpha: 0.5, parallax: 0.16 },
      { y: 0.06, amp: 48, speed: 0.0007, phase: 3.1, px: 96, alpha: 0.5, parallax: 0.07 },
      { y: 0.2, amp: 64, speed: 0.00048, phase: 4.4, px: 60, alpha: 0.5, parallax: 0.24 },
      { y: 0.12, amp: 88, speed: 0.00035, phase: 5.5, px: 80, alpha: 0.5, parallax: 0.18 },
      { y: 0.18, amp: 50, speed: 0.00062, phase: 2.3, px: 72, alpha: 0.5, parallax: 0.14 },
      { y: 0.1, amp: 78, speed: 0.00045, phase: 6.2, px: 68, alpha: 0.5, parallax: 0.2 },
      { y: 0.24, amp: 42, speed: 0.00058, phase: 0.9, px: 56, alpha: 0.5, parallax: 0.28 },
    ];
    this._drawCakeFlotilla(ctx, now, steam, flotilla);
  }

  /** Floating cars + Cybertrucks - leftward-only scroll (no back-and-forth flip) */
  _drawTeslaVehicles(ctx, now) {
    const vehicles = Art.tesla?.vehicles || Art.neon?.tesla?.vehicles || [];
    if (!vehicles.length) return;
    // All lanes travel left; wrap continuously across the viewport
    const flotilla = [
      { y: 0.11, speed: 0.042, phase: 0.0, px: 84, parallax: 0.13 },
      { y: 0.19, speed: 0.036, phase: 0.28, px: 68, parallax: 0.19 },
      { y: 0.07, speed: 0.048, phase: 0.55, px: 96, parallax: 0.11 },
      { y: 0.22, speed: 0.033, phase: 0.12, px: 60, parallax: 0.26 },
      { y: 0.15, speed: 0.04, phase: 0.72, px: 80, parallax: 0.17 },
      { y: 0.09, speed: 0.045, phase: 0.4, px: 72, parallax: 0.15 },
      { y: 0.26, speed: 0.03, phase: 0.88, px: 56, parallax: 0.3 },
      { y: 0.13, speed: 0.038, phase: 0.2, px: 72, parallax: 0.21 },
    ];
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < flotilla.length; i++) {
      const f = flotilla[i];
      const spr = vehicles[i % vehicles.length];
      if (!spr) continue;
      const fit = f.px / Math.max(spr.width, spr.height);
      const w = Math.max(2, Math.round(spr.width * fit));
      const h = Math.max(2, Math.round(spr.height * fit));
      const span = this.cssW + w + 48;
      const t = now * f.speed + f.phase * span;
      // Progress 0->span maps right edge -> left (opposite of prior rightward scroll)
      const progress = ((t % span) + span) % span;
      const x = Math.floor(this.cssW + 16 - progress - this.camX * f.parallax);
      const y = Math.floor(
        this.cssH * f.y + Math.sin(now * 0.0015 + f.phase * 6) * 2.5
      );
      ctx.globalAlpha = 0.5;
      // Vehicle art already faces left - matches leftward travel (no flip)
      ctx.drawImage(spr, x, y, w, h);
    }
    ctx.restore();
  }

  /** SpaceX Ascent - night Starbase parallax + launching rockets */
  _drawSpaceXSky(ctx) {
    const spacex = Art.spacex || Art.neon?.spacex;
    const now = this._now || performance.now();

    if (spacex?.sky) {
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.97;
      ctx.drawImage(spacex.sky, 0, 0, this.cssW, this.cssH);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, this.cssH);
      g.addColorStop(0, "#0B1D36");
      g.addColorStop(0.45, "#1A3A4A");
      g.addColorStop(0.8, "#2A4A5C");
      g.addColorStop(1, "#3A5A68");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.cssW, this.cssH);
    }

    // Soft night grade (navy -> steel cyan)
    const night = ctx.createLinearGradient(0, 0, 0, this.cssH);
    night.addColorStop(0, "rgba(11, 29, 54, 0.18)");
    night.addColorStop(0.5, "rgba(26, 58, 74, 0.1)");
    night.addColorStop(1, "rgba(91, 192, 235, 0.08)");
    ctx.fillStyle = night;
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    if (spacex?.pad) {
      this._tileLayer(ctx, spacex.pad, 0.09, 0.22, 0.34, 0.42);
    }
    if (spacex?.midscape) {
      this._tileLayer(ctx, spacex.midscape, 0.2, 0.5, 0.36, 0.26);
    }

    this._drawSpaceXNebulas(ctx, now);
    this._drawSpaceXRockets(ctx, now);
    this._drawSpaceXRocketToMoon(ctx, now);

    // Warm pad glow near horizon (flame / floodlights)
    const bloom = ctx.createLinearGradient(0, this.cssH * 0.5, 0, this.cssH * 0.95);
    bloom.addColorStop(0, "rgba(255, 107, 44, 0)");
    bloom.addColorStop(0.55, "rgba(255, 107, 44, 0.07)");
    bloom.addColorStop(1, "rgba(196, 180, 154, 0.14)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, this.cssH * 0.5, this.cssW, this.cssH * 0.5);

    if (spacex?.foreground) {
      this._tileLayer(ctx, spacex.foreground, 0.55, 0, 0.14, 0.14);
      this._tileLayer(ctx, spacex.foreground, 0.62, 0.86, 0.16, 0.12);
    }
  }

  /** Soft nebula accents - fixed in world; scroll only via camera parallax */
  _drawSpaceXNebulas(ctx, _now) {
    const nebulas = Art.spacex?.nebulas || Art.neon?.spacex?.nebulas || [];
    if (!nebulas.length) return;
    const flotilla = [
      { x: 0.08, y: 0.12, px: 140, parallax: 0.04 },
      { x: 0.42, y: 0.08, px: 120, parallax: 0.06 },
      { x: 0.72, y: 0.18, px: 150, parallax: 0.05 },
      { x: 0.28, y: 0.28, px: 100, parallax: 0.08 },
      { x: 0.88, y: 0.1, px: 110, parallax: 0.03 },
    ];
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    for (let i = 0; i < flotilla.length; i++) {
      const f = flotilla[i];
      const spr = nebulas[i % nebulas.length];
      if (!spr) continue;
      const fit = f.px / Math.max(spr.width, spr.height);
      const w = Math.max(2, Math.round(spr.width * fit));
      const h = Math.max(2, Math.round(spr.height * fit));
      // Still in screen space aside from camX parallax (no sin-patrol / free drift)
      const x = Math.floor(this.cssW * f.x - this.camX * f.parallax);
      const y = Math.floor(this.cssH * f.y);
      ctx.globalAlpha = 0.38;
      ctx.drawImage(spr, x, y, w, h);
    }
    ctx.restore();
  }

  /**
   * Story accent: cartoon rocket cruising toward the moon
   * (slow upper-sky drift; larger than launch flotilla rockets).
   */
  _drawSpaceXRocketToMoon(ctx, now) {
    const spr =
      Art.spacex?.rocketToMoon || Art.neon?.spacex?.rocketToMoon || null;
    if (!spr) return;
    const px = 112;
    const fit = px / Math.max(spr.width, spr.height);
    const w = Math.max(2, Math.round(spr.width * fit));
    const h = Math.max(2, Math.round(spr.height * fit));
    const span = this.cssW + w + 160;
    const t = now * 0.018;
    const progress = ((t % span) + span) % span;
    const x = Math.floor(-w - 40 + progress - this.camX * 0.1);
    const y = Math.floor(
      this.cssH * 0.14 + Math.sin(now * 0.0009) * 10 - progress * 0.04
    );
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.55;
    ctx.drawImage(spr, x, y, w, h);
    ctx.restore();
  }

  /**
   * Cartoon pixel rockets / Starships blasting off (cake-pastry visual language) -
   * same size band as L2/L3 floaters (56-96px), 0.5 opacity, bottom->up launch + parallax.
   */
  _drawSpaceXRockets(ctx, now) {
    const rockets = Art.spacex?.rockets || Art.neon?.spacex?.rockets || [];
    if (!rockets.length) return;
    // Cake-style size/parallax lanes; motion is bottom-up launch (not side patrol).
    // Extra lanes densify Starship traffic in the Starbase sky.
    const flotilla = [
      { x: 0.12, speed: 0.036, phase: 0.0, px: 84, parallax: 0.12, drift: 0.008 },
      { x: 0.38, speed: 0.03, phase: 0.22, px: 68, parallax: 0.19, drift: -0.006 },
      { x: 0.62, speed: 0.042, phase: 0.48, px: 96, parallax: 0.11, drift: 0.01 },
      { x: 0.82, speed: 0.028, phase: 0.15, px: 60, parallax: 0.26, drift: -0.004 },
      { x: 0.25, speed: 0.034, phase: 0.7, px: 80, parallax: 0.17, drift: 0.005 },
      { x: 0.5, speed: 0.038, phase: 0.35, px: 72, parallax: 0.15, drift: -0.009 },
      { x: 0.72, speed: 0.026, phase: 0.85, px: 56, parallax: 0.3, drift: 0.007 },
      { x: 0.9, speed: 0.032, phase: 0.55, px: 72, parallax: 0.21, drift: -0.003 },
      { x: 0.05, speed: 0.029, phase: 0.92, px: 76, parallax: 0.14, drift: 0.004 },
      { x: 0.2, speed: 0.04, phase: 0.08, px: 64, parallax: 0.22, drift: -0.007 },
      { x: 0.45, speed: 0.033, phase: 0.6, px: 88, parallax: 0.16, drift: 0.006 },
      { x: 0.58, speed: 0.027, phase: 0.4, px: 58, parallax: 0.28, drift: -0.005 },
      { x: 0.78, speed: 0.037, phase: 0.18, px: 70, parallax: 0.18, drift: 0.009 },
      { x: 0.95, speed: 0.031, phase: 0.75, px: 90, parallax: 0.13, drift: -0.008 },
    ];
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < flotilla.length; i++) {
      const f = flotilla[i];
      const spr = rockets[i % rockets.length];
      if (!spr) continue;
      // Fit longest side to px - same rule as cake pastries
      const fit = f.px / Math.max(spr.width, spr.height);
      const w = Math.max(2, Math.round(spr.width * fit));
      const h = Math.max(2, Math.round(spr.height * fit));
      const span = this.cssH + h + 72;
      const t = now * f.speed + f.phase * span;
      // Progress 0->span: below screen -> above (blasting off)
      const progress = ((t % span) + span) % span;
      const y = Math.floor(this.cssH + 28 - progress);
      const x = Math.floor(
        this.cssW * f.x +
          Math.sin(now * 0.0012 + f.phase * 5) * 4 +
          now * f.drift -
          this.camX * f.parallax
      );
      ctx.globalAlpha = 0.5;
      ctx.drawImage(spr, x, y, w, h);
    }
    ctx.restore();
  }

  /** Moon Bouncing - lunar surface parallax + rail gun + patrolling satellites */
  _drawMoonSky(ctx) {
    const moon = Art.moon || Art.neon?.moon;
    const now = this._now || performance.now();

    if (moon?.sky) {
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.97;
      ctx.drawImage(moon.sky, 0, 0, this.cssW, this.cssH);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, this.cssH);
      g.addColorStop(0, "#0A0E18");
      g.addColorStop(0.45, "#121A2A");
      g.addColorStop(0.8, "#1A2438");
      g.addColorStop(1, "#2A3448");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.cssW, this.cssH);
    }

    // Soft lunar night grade
    const night = ctx.createLinearGradient(0, 0, 0, this.cssH);
    night.addColorStop(0, "rgba(10, 14, 24, 0.16)");
    night.addColorStop(0.55, "rgba(26, 36, 56, 0.08)");
    night.addColorStop(1, "rgba(126, 200, 232, 0.07)");
    ctx.fillStyle = night;
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    if (moon?.surface) {
      this._tileLayer(ctx, moon.surface, 0.09, 0.24, 0.34, 0.44);
    }
    if (moon?.midscape) {
      this._tileLayer(ctx, moon.midscape, 0.2, 0.5, 0.36, 0.28);
    }

    this._drawMoonRailgun(ctx, now);
    this._drawMoonSatellites(ctx, now);

    // Soft regolith bloom near horizon
    const bloom = ctx.createLinearGradient(0, this.cssH * 0.52, 0, this.cssH * 0.95);
    bloom.addColorStop(0, "rgba(168, 176, 192, 0)");
    bloom.addColorStop(0.55, "rgba(126, 200, 232, 0.06)");
    bloom.addColorStop(1, "rgba(154, 154, 168, 0.14)");
    ctx.fillStyle = bloom;
    ctx.fillRect(0, this.cssH * 0.52, this.cssW, this.cssH * 0.48);

    if (moon?.foreground) {
      this._tileLayer(ctx, moon.foreground, 0.55, 0, 0.14, 0.16);
      this._tileLayer(ctx, moon.foreground, 0.62, 0.86, 0.16, 0.14);
    }
  }

  /**
   * Background rail gun - anchored on lunar ridge, periodically fires cyan beams
   * toward patrolling satellite lanes (visual FX only).
   */
  _drawMoonRailgun(ctx, now) {
    const spr = Art.moon?.railgun || Art.neon?.moon?.railgun || null;
    const gunW = spr ? Math.max(40, Math.round(spr.width * (72 / Math.max(spr.width, spr.height)))) : 72;
    const gunH = spr ? Math.max(20, Math.round(spr.height * (72 / Math.max(spr.width, spr.height)))) : 28;
    const baseX = Math.floor(this.cssW * 0.08 - this.camX * 0.12);
    const baseY = Math.floor(this.cssH * 0.58);

    // Periodic shot pulse (~every 2.4s, beam visible ~0.45s)
    const cycle = 2400;
    const t = now % cycle;
    const firing = t < 450;
    const beamProgress = firing ? t / 450 : 0;

    if (firing) {
      const beamLen = this.cssW * (0.35 + beamProgress * 0.55);
      const y0 = baseY + gunH * 0.35;
      const x0 = baseX + gunW - 4;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      // Outer soft beam
      const grad = ctx.createLinearGradient(x0, y0, x0 + beamLen, y0 - beamLen * 0.12);
      grad.addColorStop(0, "rgba(126, 200, 232, 0.55)");
      grad.addColorStop(0.45, "rgba(255, 232, 160, 0.35)");
      grad.addColorStop(1, "rgba(126, 200, 232, 0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + beamLen, y0 - beamLen * 0.12);
      ctx.stroke();
      // Core bolt
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 - beamProgress * 0.4})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + beamLen * 0.92, y0 - beamLen * 0.11);
      ctx.stroke();
      // Muzzle flash
      ctx.fillStyle = `rgba(255, 232, 160, ${0.7 * (1 - beamProgress)})`;
      ctx.beginPath();
      ctx.ellipse(x0 + 2, y0, 8 + beamProgress * 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (spr) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 0.72;
      ctx.drawImage(spr, baseX, baseY, gunW, gunH);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "#A8B4C0";
      ctx.fillRect(baseX, baseY + 8, gunW, 10);
      ctx.fillStyle = "#7EC8E8";
      ctx.fillRect(baseX + 8, baseY + 10, gunW - 16, 4);
      ctx.fillStyle = "#FFE8A0";
      ctx.fillRect(baseX + gunW - 8, baseY + 8, 8, 10);
      ctx.restore();
    }
  }

  /** Satellites patrol back and forth - same sin-lane language as Cake clouds */
  _drawMoonSatellites(ctx, now) {
    const sats = Art.moon?.satellites || Art.neon?.moon?.satellites || [];
    if (!sats.length) return;
    const flotilla = [
      { y: 0.08, amp: 55, speed: 0.00052, phase: 0.2, px: 72, parallax: 0.1 },
      { y: 0.14, amp: 70, speed: 0.00038, phase: 1.7, px: 60, parallax: 0.16 },
      { y: 0.06, amp: 48, speed: 0.00065, phase: 3.1, px: 84, parallax: 0.07 },
      { y: 0.2, amp: 62, speed: 0.00045, phase: 4.4, px: 56, parallax: 0.22 },
      { y: 0.11, amp: 80, speed: 0.00034, phase: 5.5, px: 68, parallax: 0.18 },
      { y: 0.17, amp: 50, speed: 0.00058, phase: 2.3, px: 64, parallax: 0.14 },
      { y: 0.09, amp: 74, speed: 0.00042, phase: 6.2, px: 58, parallax: 0.2 },
      { y: 0.22, amp: 42, speed: 0.00055, phase: 0.9, px: 52, parallax: 0.26 },
      { y: 0.05, amp: 58, speed: 0.00048, phase: 4.0, px: 70, parallax: 0.09 },
      { y: 0.15, amp: 66, speed: 0.0004, phase: 1.1, px: 62, parallax: 0.21 },
    ];
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < flotilla.length; i++) {
      const f = flotilla[i];
      const spr = sats[i % sats.length];
      if (!spr) continue;
      const baseX = this.cssW * (0.14 + (i % 4) * 0.2);
      const patrol = Math.sin(now * f.speed + f.phase) * f.amp;
      const x = Math.floor(baseX + patrol - this.camX * f.parallax);
      const y = Math.floor(this.cssH * f.y + Math.sin(now * 0.0014 + f.phase) * 2.5);
      const fit = f.px / Math.max(spr.width, spr.height);
      const w = Math.max(2, Math.round(spr.width * fit));
      const h = Math.max(2, Math.round(spr.height * fit));
      ctx.globalAlpha = 0.55;
      const goingRight = Math.cos(now * f.speed + f.phase) >= 0;
      if (!goingRight) {
        ctx.save();
        ctx.translate(x + w, y);
        ctx.scale(-1, 1);
        ctx.drawImage(spr, 0, 0, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(spr, x, y, w, h);
      }
    }
    ctx.restore();
  }

  /** Inside Starship - warm cabin interior parallax */
  _drawStarshipSky(ctx) {
    const ship = Art.starship || Art.neon?.starship;
    const now = this._now || performance.now();

    if (ship?.cabin) {
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.98;
      ctx.drawImage(ship.cabin, 0, 0, this.cssW, this.cssH);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, this.cssH);
      g.addColorStop(0, "#1A2434");
      g.addColorStop(0.55, "#2A3848");
      g.addColorStop(1, "#243040");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.cssW, this.cssH);
    }

    // Soft cabin grade
    const grade = ctx.createLinearGradient(0, 0, 0, this.cssH);
    grade.addColorStop(0, "rgba(20, 28, 42, 0.2)");
    grade.addColorStop(0.55, "rgba(232, 192, 144, 0.05)");
    grade.addColorStop(1, "rgba(40, 52, 72, 0.18)");
    ctx.fillStyle = grade;
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    if (ship?.cabinNear) {
      this._tileLayer(ctx, ship.cabinNear, 0.18, 0.28, 0.42, 0.32);
    }

    // Ambient instrument twinkles
    ctx.save();
    for (let i = 0; i < 28; i++) {
      const seed = i * 7331;
      const x = Math.floor(((seed + now * (0.008 + (i % 4) * 0.001)) % (this.cssW + 20)) - 10);
      const y = Math.floor(this.cssH * (0.2 + (i % 7) * 0.08));
      const a = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(now * 0.004 + i));
      ctx.globalAlpha = a;
      ctx.fillStyle = i % 2 === 0 ? "#7EC8E8" : "#FFE8A0";
      ctx.fillRect(x, y, 2, 1);
    }
    ctx.restore();
  }

  /** Control console + black-cat Elove waiting at EXIT helm */
  _drawEloveAtControls(ctx, now) {
    if (this.theme !== "starship") return;
    const er = World.exitRect();
    // Console just behind EXIT tiles; Elove stands at the helm facing the player
    const consoleX = er.x + er.w * 0.5 + 6;
    const consoleY = er.y + 2;
    const eloveX = er.x - 10;
    const eloveY = er.y + 2;
    const bob = Math.round(Math.sin(now * 0.003) * 1.5);

    const cons = Art.starship?.console || Art.neon?.starship?.console;
    if (cons) {
      const sx = Math.floor(consoleX * VIEW_SCALE - this.camX * VIEW_SCALE);
      const sy = Math.floor(consoleY * VIEW_SCALE - this.camY * VIEW_SCALE);
      const fit = 36 / Math.max(cons.width, cons.height);
      const w = Math.max(2, Math.round(cons.width * fit));
      const h = Math.max(2, Math.round(cons.height * fit));
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.95;
      ctx.drawImage(cons, sx - w / 2, sy - h + 4, w, h);
      // Soft cyan screen pulse
      const pulse = 0.25 + 0.25 * (0.5 + 0.5 * Math.sin(now * 0.006));
      ctx.globalAlpha = pulse;
      ctx.fillStyle = "#7EC8E8";
      ctx.fillRect(sx - 8, sy - h + 10, 16, 5);
      ctx.restore();
    } else {
      const sx = Math.floor(consoleX * VIEW_SCALE - this.camX * VIEW_SCALE);
      const sy = Math.floor(consoleY * VIEW_SCALE - this.camY * VIEW_SCALE);
      ctx.save();
      ctx.fillStyle = "#2A3448";
      ctx.fillRect(sx - 14, sy - 22, 28, 20);
      ctx.fillStyle = "#7EC8E8";
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(now * 0.006);
      ctx.fillRect(sx - 10, sy - 18, 10, 6);
      ctx.fillStyle = "#FFE8A0";
      ctx.fillRect(sx + 2, sy - 16, 8, 4);
      ctx.restore();
    }

    const frames = Art.eloveAnims?.idle || (Art.elove ? [Art.elove] : []);
    const spr = frames.length
      ? frames[Math.floor(now / 450) % frames.length]
      : Art.elove;
    if (spr) {
      const prevSmooth = ctx.imageSmoothingEnabled;
      if (Art.playerPipeline?.pixelate === false) {
        ctx.imageSmoothingEnabled = true;
      }
      // Face left toward approaching player
      this._drawSprite(ctx, spr, eloveX, eloveY, -1, bob, { foot: 6 });
      ctx.imageSmoothingEnabled = prevSmooth;
    }

    // Soft "waiting" heart spark above Elove
    const hx = Math.floor(eloveX * VIEW_SCALE - this.camX * VIEW_SCALE);
    const hy = Math.floor(eloveY * VIEW_SCALE - this.camY * VIEW_SCALE) - 28 + bob;
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(now * 0.005));
    ctx.fillStyle = "#ff6eb4";
    ctx.beginPath();
    ctx.moveTo(hx, hy + 2);
    ctx.bezierCurveTo(hx - 5, hy - 4, hx - 8, hy + 2, hx, hy + 8);
    ctx.bezierCurveTo(hx + 8, hy + 2, hx + 5, hy - 4, hx, hy + 2);
    ctx.fill();
    ctx.restore();
  }

  /** Soft cabin sparkles for Inside Starship */
  _drawStarshipSparkles(ctx, now) {
    const n = 40;
    const h = this.cssH;
    const w = this.cssW;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const seed = i * 7919;
      const x = Math.floor(((seed * 13 + now * (0.01 + (i % 4) * 0.0015)) % (w + 30)) - 15);
      const y = Math.floor(((seed * 17 + now * 0.005) % (h * 0.85)));
      const twinkle = 0.18 + 0.45 * (0.5 + 0.5 * Math.sin(now * 0.003 + i));
      ctx.globalAlpha = twinkle * 0.45;
      ctx.fillStyle = i % 3 === 0 ? "#FFE8A0" : i % 3 === 1 ? "#7EC8E8" : "#E8C090";
      ctx.fillRect(x, y, i % 9 === 0 ? 2 : 1, 1);
    }
    ctx.restore();
  }

  /**
   * Cover-fit a plate with Ken Burns zoom/pan (origin 0-1 within the image).
   */
  _drawKenBurnsPlate(ctx, img, t, opts = {}) {
    if (!img) return;
    const w = this.cssW;
    const h = this.cssH;
    const zoom0 = opts.zoom0 ?? 1.04;
    const zoom1 = opts.zoom1 ?? 1.18;
    const zoom = zoom0 + (zoom1 - zoom0) * t;
    const ox0 = opts.ox0 ?? 0.5;
    const oy0 = opts.oy0 ?? 0.5;
    const ox1 = opts.ox1 ?? 0.5;
    const oy1 = opts.oy1 ?? 0.45;
    const ox = ox0 + (ox1 - ox0) * t;
    const oy = oy0 + (oy1 - oy0) * t;
    const scale = Math.max(w / img.width, h / img.height) * zoom;
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = w * 0.5 - dw * ox;
    const dy = h * 0.5 - dh * oy;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  /** Soft drifting satellite / star motes over movie panels. */
  _drawMovieDriftFX(ctx, now, intensity = 1) {
    const w = this.cssW;
    const h = this.cssH;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 28; i++) {
      const seed = i * 7919;
      const x = ((seed * 17 + now * (0.012 + (i % 4) * 0.004)) % (w + 30)) - 15;
      const y = ((seed * 29 + now * 0.004) % (h + 20)) - 10;
      const tw = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(now * 0.003 + i));
      ctx.globalAlpha = tw * intensity;
      ctx.fillStyle = i % 3 === 0 ? "#FFE8A0" : i % 3 === 1 ? "#7EC8E8" : "#E8A070";
      const s = i % 7 === 0 ? 2.5 : 1.2;
      ctx.fillRect(x, y, s, s);
    }
    ctx.restore();
  }

  /**
   * Fallback when Imagine movie plates are missing: thrust wash -> Mars plate.
   */
  _drawEloveCinematicLegacy(ctx, now, elapsed, HUG) {
    const BLAST = 2200;
    const MARS = 2400;
    const total = HUG + BLAST + MARS;
    if (elapsed >= total) {
      this._cine = null;
      return false;
    }
    if (elapsed < HUG + BLAST) {
      const t = (elapsed - HUG) / BLAST;
      const g = ctx.createLinearGradient(0, this.cssH, 0, 0);
      g.addColorStop(0, `rgba(255, 140, 60, ${0.55 + t * 0.35})`);
      g.addColorStop(0.4, `rgba(126, 200, 232, ${0.25 + t * 0.2})`);
      g.addColorStop(1, "rgba(10, 14, 24, 0.85)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.cssW, this.cssH);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 48; i++) {
        const seed = i * 9973;
        const x = (seed * 13) % this.cssW;
        const y =
          this.cssH -
          ((now * (0.2 + (i % 5) * 0.08) + seed) % (this.cssH + 40));
        ctx.globalAlpha = 0.35 + (i % 4) * 0.12;
        ctx.fillStyle = i % 2 === 0 ? "#FFE8A0" : "#7EC8E8";
        ctx.fillRect(x, y, 2, 6 + (i % 5));
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("Blast off - for Mars", this.cssW * 0.5, this.cssH * 0.28);
    } else {
      const t = (elapsed - HUG - BLAST) / MARS;
      const mars = Art.starship?.mars || Art.neon?.starship?.mars;
      if (mars) {
        this._drawKenBurnsPlate(ctx, mars, t, {
          zoom0: 1.0,
          zoom1: 1.22,
          oy0: 0.55,
          oy1: 0.48,
        });
      } else {
        ctx.fillStyle = "#181028";
        ctx.fillRect(0, 0, this.cssW, this.cssH);
      }
      ctx.fillStyle = `rgba(10, 14, 24, ${0.35 - t * 0.15})`;
      ctx.fillRect(0, 0, this.cssW, this.cssH);
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(now * 0.004);
      ctx.fillStyle = "#FFE8A0";
      ctx.font = "bold 16px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("He saved you", this.cssW * 0.5, this.cssH * 0.42);
      ctx.globalAlpha = 0.85;
      ctx.font = "12px ui-monospace, monospace";
      ctx.fillStyle = "#E8C090";
      ctx.fillText("Elove - forever", this.cssW * 0.5, this.cssH * 0.52);
      ctx.globalAlpha = 1;
    }
    return true;
  }

  /**
   * Full-viewport win cinematic: hug -> Mars movie -> vacation -> Mars save.
   * Prefer MP4s; fall back to Ken Burns stills / legacy.
   * Returns true while cinematic is still playing.
   */
  _drawEloveCinematic(ctx, now) {
    const cine = this._cine;
    if (!cine) return false;
    const elapsed = now - cine.t0;
    const HUG = 1800;
    const PANEL_MS = [2400, 2400, 2200, 2800];
    const CROSS = 320;
    const movie = Art.starship?.movie || [];
    const vacation = Art.starship?.vacation || [];
    const vid = Art.starship?.movieVideo;
    const vacVid = Art.starship?.vacationVideo;
    const panelMs = PANEL_MS.reduce((a, b) => a + b, 0);
    const videoMs =
      Art.starship?.movieVideoMs ||
      (vid && Number.isFinite(vid.duration) && vid.duration > 0
        ? Math.round(vid.duration * 1000)
        : 0);
    const vacationVideoMs =
      Art.starship?.vacationVideoMs ||
      (vacVid && Number.isFinite(vacVid.duration) && vacVid.duration > 0
        ? Math.round(vacVid.duration * 1000)
        : 0);
    const movieMs = videoMs > 0 ? videoMs : movie.length >= 4 ? panelMs : 2200 + 2400;
    const vacationMs =
      vacationVideoMs > 0
        ? vacationVideoMs
        : vacation.length >= 4
          ? panelMs
          : 0;
    const total = HUG + movieMs + vacationMs;
    if (elapsed >= total) {
      for (const v of [vid, vacVid]) {
        if (!v) continue;
        try {
          v.pause();
        } catch (_) {
          /* ignore */
        }
      }
      this._cine = null;
      return false;
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (elapsed < HUG) {
      // Soft cabin wash + two cats meeting
      ctx.fillStyle = "rgba(20, 28, 42, 0.55)";
      ctx.fillRect(0, 0, this.cssW, this.cssH);
      const t = elapsed / HUG;
      const midX = this.cssW * 0.5;
      const midY = this.cssH * 0.55;
      const gap = Math.max(0, 28 * (1 - t));
      const pSpr = Art.playerAnims?.idle?.[0] || Art.catRocket;
      const eSpr = Art.elove || Art.eloveAnims?.idle?.[0];
      ctx.imageSmoothingEnabled = true;
      if (pSpr) {
        const s = 1.15;
        const w = pSpr.width * s;
        const h = pSpr.height * s;
        ctx.drawImage(pSpr, midX - gap - w * 0.55, midY - h * 0.85, w, h);
      }
      if (eSpr) {
        const s = 1.15;
        const w = eSpr.width * s;
        const h = eSpr.height * s;
        ctx.save();
        ctx.translate(midX + gap + w * 0.55, midY - h * 0.85);
        ctx.scale(-1, 1);
        ctx.drawImage(eSpr, 0, 0, w, h);
        ctx.restore();
      }
      ctx.globalAlpha = 0.4 + 0.5 * t;
      ctx.fillStyle = "#ff6eb4";
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + now * 0.002;
        const r = 18 + t * 36 + Math.sin(now * 0.01 + i) * 4;
        const hx = midX + Math.cos(ang) * r;
        const hy = midY - 30 + Math.sin(ang) * r * 0.6;
        ctx.beginPath();
        ctx.arc(hx, hy, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#FFE8A0";
      ctx.font = "bold 14px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("A hug - snug at last", midX, this.cssH * 0.22);
      // Fade toward movie
      if (t > 0.82) {
        ctx.fillStyle = `rgba(8, 12, 22, ${(t - 0.82) / 0.18})`;
        ctx.fillRect(0, 0, this.cssW, this.cssH);
      }
    } else if (elapsed < HUG + movieMs && vid && vid.readyState >= 2) {
      const tMovie = elapsed - HUG;
      if (!cine.videoStarted) {
        cine.videoStarted = true;
        try {
          vid.currentTime = 0;
        } catch (_) {
          /* ignore */
        }
        const playP = vid.play();
        if (playP && typeof playP.catch === "function") playP.catch(() => {});
      }
      // Keep video clock roughly synced if tab throttled
      if (
        Number.isFinite(vid.duration) &&
        vid.duration > 0 &&
        Math.abs(vid.currentTime * 1000 - tMovie) > 350 &&
        tMovie / 1000 < vid.duration
      ) {
        try {
          vid.currentTime = Math.max(0, tMovie / 1000);
        } catch (_) {
          /* ignore */
        }
      }

      ctx.fillStyle = "#080c16";
      ctx.fillRect(0, 0, this.cssW, this.cssH);
      this._drawCoverVideo(ctx, vid);

      const captions = [
        "Blast off - together",
        "Past the Moon",
        "On our way to Mars",
        "He saved you",
      ];
      const prog = videoMs > 0 ? Math.min(0.999, tMovie / videoMs) : 0;
      const idx = Math.min(3, Math.floor(prog * 4));
      const local = prog * 4 - idx;
      ctx.fillStyle = "#FFE8A0";
      ctx.font = "bold 14px ui-monospace, monospace";
      ctx.textAlign = "center";
      const capAlpha = local < 0.12 ? local / 0.12 : local > 0.88 ? (1 - local) / 0.12 : 1;
      ctx.globalAlpha = Math.max(0, Math.min(1, capAlpha));
      ctx.fillText(captions[idx], this.cssW * 0.5, this.cssH * 0.18);
      if (idx === 3 && local > 0.35) {
        ctx.globalAlpha = Math.min(1, (local - 0.35) / 0.25) * 0.9;
        ctx.font = "12px ui-monospace, monospace";
        ctx.fillStyle = "#E8C090";
        ctx.fillText("Elove - forever", this.cssW * 0.5, this.cssH * 0.26);
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(4, 8, 14, 0.72)";
      const bar = Math.max(10, this.cssH * 0.06);
      ctx.fillRect(0, 0, this.cssW, bar);
      ctx.fillRect(0, this.cssH - bar, this.cssW, bar);
    } else if (elapsed >= HUG + movieMs && vacVid && vacVid.readyState >= 2) {
      // Pause blast-off reel; play Mars City vacation coda
      if (vid) {
        try {
          vid.pause();
        } catch (_) {
          /* ignore */
        }
      }
      const tVac = elapsed - HUG - movieMs;
      if (!cine.vacationStarted) {
        cine.vacationStarted = true;
        try {
          vacVid.currentTime = 0;
        } catch (_) {
          /* ignore */
        }
        const playP = vacVid.play();
        if (playP && typeof playP.catch === "function") playP.catch(() => {});
      }
      if (
        Number.isFinite(vacVid.duration) &&
        vacVid.duration > 0 &&
        Math.abs(vacVid.currentTime * 1000 - tVac) > 350 &&
        tVac / 1000 < vacVid.duration
      ) {
        try {
          vacVid.currentTime = Math.max(0, tVac / 1000);
        } catch (_) {
          /* ignore */
        }
      }

      ctx.fillStyle = "#080c16";
      ctx.fillRect(0, 0, this.cssW, this.cssH);
      this._drawCoverVideo(ctx, vacVid);

      const captions = [
        "Mars City vacation",
        "Plaza date",
        "Skybridge sunset",
        "Forever on Mars",
      ];
      const prog = vacationVideoMs > 0 ? Math.min(0.999, tVac / vacationVideoMs) : 0;
      const idx = Math.min(3, Math.floor(prog * 4));
      const local = prog * 4 - idx;
      ctx.fillStyle = "#FFE8A0";
      ctx.font = "bold 14px ui-monospace, monospace";
      ctx.textAlign = "center";
      const capAlpha = local < 0.12 ? local / 0.12 : local > 0.88 ? (1 - local) / 0.12 : 1;
      ctx.globalAlpha = Math.max(0, Math.min(1, capAlpha));
      ctx.fillText(captions[idx], this.cssW * 0.5, this.cssH * 0.18);
      if (idx === 3 && local > 0.35) {
        ctx.globalAlpha = Math.min(1, (local - 0.35) / 0.25) * 0.9;
        ctx.font = "12px ui-monospace, monospace";
        ctx.fillStyle = "#E8C090";
        ctx.fillText("Player - Elove - Mars", this.cssW * 0.5, this.cssH * 0.26);
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(4, 8, 14, 0.72)";
      const bar = Math.max(10, this.cssH * 0.06);
      ctx.fillRect(0, 0, this.cssW, bar);
      ctx.fillRect(0, this.cssH - bar, this.cssW, bar);
    } else if (elapsed < HUG + movieMs && movie.length < 4) {
      const ok = this._drawEloveCinematicLegacy(ctx, now, elapsed, HUG);
      ctx.restore();
      return ok;
    } else if (elapsed >= HUG + movieMs && vacation.length >= 4) {
      // Ken Burns vacation stills if MP4 missing
      const tVac = elapsed - HUG - movieMs;
      let acc = 0;
      let idx = 0;
      let local = tVac;
      for (let i = 0; i < PANEL_MS.length; i++) {
        if (tVac < acc + PANEL_MS[i]) {
          idx = i;
          local = tVac - acc;
          break;
        }
        acc += PANEL_MS[i];
        idx = i;
        local = PANEL_MS[i];
      }
      const dur = PANEL_MS[idx];
      const t = Math.min(1, local / dur);
      const ken = [
        { zoom0: 1.05, zoom1: 1.18, ox0: 0.46, oy0: 0.55, ox1: 0.54, oy1: 0.42 },
        { zoom0: 1.04, zoom1: 1.15, ox0: 0.44, oy0: 0.5, ox1: 0.56, oy1: 0.48 },
        { zoom0: 1.03, zoom1: 1.16, ox0: 0.5, oy0: 0.52, ox1: 0.52, oy1: 0.4 },
        { zoom0: 1.02, zoom1: 1.2, ox0: 0.42, oy0: 0.56, ox1: 0.55, oy1: 0.46 },
      ][idx];

      ctx.fillStyle = "#080c16";
      ctx.fillRect(0, 0, this.cssW, this.cssH);
      if (idx > 0 && local < CROSS) {
        const prev = vacation[idx - 1]?.img;
        ctx.globalAlpha = 1 - local / CROSS;
        this._drawKenBurnsPlate(ctx, prev, 0.98, ken);
        ctx.globalAlpha = Math.min(1, local / CROSS);
      } else {
        ctx.globalAlpha = 1;
      }
      this._drawKenBurnsPlate(ctx, vacation[idx]?.img, t, ken);
      ctx.globalAlpha = 1;

      const caption = vacation[idx]?.caption || "";
      const capAlpha =
        local < 220 ? local / 220 : local > dur - 280 ? (dur - local) / 280 : 1;
      ctx.globalAlpha = Math.max(0, Math.min(1, capAlpha));
      ctx.fillStyle = "#FFE8A0";
      ctx.font = "bold 14px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(caption, this.cssW * 0.5, this.cssH * 0.18);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(4, 8, 14, 0.72)";
      const bar = Math.max(10, this.cssH * 0.06);
      ctx.fillRect(0, 0, this.cssW, bar);
      ctx.fillRect(0, this.cssH - bar, this.cssW, bar);
    } else if (elapsed < HUG + movieMs) {
      const tMovie = elapsed - HUG;
      let acc = 0;
      let idx = 0;
      let local = tMovie;
      for (let i = 0; i < PANEL_MS.length; i++) {
        if (tMovie < acc + PANEL_MS[i]) {
          idx = i;
          local = tMovie - acc;
          break;
        }
        acc += PANEL_MS[i];
        idx = i;
        local = PANEL_MS[i];
      }
      const dur = PANEL_MS[idx];
      const t = Math.min(1, local / dur);
      const ken = [
        { zoom0: 1.06, zoom1: 1.2, ox0: 0.48, oy0: 0.58, ox1: 0.52, oy1: 0.42 },
        { zoom0: 1.05, zoom1: 1.16, ox0: 0.42, oy0: 0.5, ox1: 0.58, oy1: 0.46 },
        { zoom0: 1.04, zoom1: 1.14, ox0: 0.5, oy0: 0.52, ox1: 0.54, oy1: 0.44 },
        { zoom0: 1.02, zoom1: 1.2, ox0: 0.4, oy0: 0.55, ox1: 0.55, oy1: 0.48 },
      ][idx];

      ctx.fillStyle = "#080c16";
      ctx.fillRect(0, 0, this.cssW, this.cssH);

      // Crossfade previous panel under current
      if (idx > 0 && local < CROSS) {
        const prev = movie[idx - 1]?.img;
        const fade = 1 - local / CROSS;
        ctx.globalAlpha = fade;
        this._drawKenBurnsPlate(ctx, prev, 0.98, [
          { zoom0: 1.06, zoom1: 1.2, ox0: 0.48, oy0: 0.58, ox1: 0.52, oy1: 0.42 },
          { zoom0: 1.05, zoom1: 1.16, ox0: 0.42, oy0: 0.5, ox1: 0.58, oy1: 0.46 },
          { zoom0: 1.04, zoom1: 1.14, ox0: 0.5, oy0: 0.52, ox1: 0.54, oy1: 0.44 },
          { zoom0: 1.02, zoom1: 1.2, ox0: 0.4, oy0: 0.55, ox1: 0.55, oy1: 0.48 },
        ][idx - 1]);
        ctx.globalAlpha = Math.min(1, local / CROSS);
      } else {
        ctx.globalAlpha = 1;
      }
      this._drawKenBurnsPlate(ctx, movie[idx]?.img, t, ken);
      ctx.globalAlpha = 1;

      this._drawMovieDriftFX(ctx, now, idx === 1 || idx === 3 ? 1 : 0.55);

      // Soft vignette
      const vig = ctx.createRadialGradient(
        this.cssW * 0.5,
        this.cssH * 0.5,
        this.cssH * 0.2,
        this.cssW * 0.5,
        this.cssH * 0.5,
        this.cssH * 0.75
      );
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(8,12,22,0.45)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, this.cssW, this.cssH);

      const caption = movie[idx]?.caption || "";
      const capAlpha =
        local < 220 ? local / 220 : local > dur - 280 ? (dur - local) / 280 : 1;
      ctx.globalAlpha = Math.max(0, Math.min(1, capAlpha));
      ctx.fillStyle = "#FFE8A0";
      ctx.font = "bold 14px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(caption, this.cssW * 0.5, this.cssH * 0.18);
      if (idx === 3 && t > 0.35) {
        ctx.globalAlpha = Math.min(1, (t - 0.35) / 0.25) * 0.9;
        ctx.font = "12px ui-monospace, monospace";
        ctx.fillStyle = "#E8C090";
        ctx.fillText("Elove - forever", this.cssW * 0.5, this.cssH * 0.26);
      }
      ctx.globalAlpha = 1;

      // Letterbox bars for short-film feel
      ctx.fillStyle = "rgba(4, 8, 14, 0.72)";
      const bar = Math.max(10, this.cssH * 0.06);
      ctx.fillRect(0, 0, this.cssW, bar);
      ctx.fillRect(0, this.cssH - bar, this.cssW, bar);
    }

    ctx.restore();
    return true;
  }

  /** Soft cyan / pale-gold sparkles for Moon Bouncing atmosphere */
  _drawMoonSparkles(ctx, now) {
    const n = 64;
    const h = this.cssH;
    const w = this.cssW;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const seed = i * 8861;
      const x = Math.floor(((seed * 11 + now * (0.01 + (i % 5) * 0.0018)) % (w + 40)) - 20);
      const y = Math.floor(((seed * 19 + now * 0.006) % (h * 0.72)));
      const twinkle = 0.22 + 0.5 * (0.5 + 0.5 * Math.sin(now * 0.0035 + i));
      const size = i % 8 === 0 ? 2 : 1;
      ctx.globalAlpha = twinkle * 0.5;
      ctx.fillStyle = i % 3 === 0 ? "#FFE8A0" : "#7EC8E8";
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore();
  }

  /** Soft cyan / orange sparkles for SpaceX Ascent atmosphere */
  _drawSpaceXSparkles(ctx, now) {
    const n = 70;
    const h = this.cssH;
    const w = this.cssW;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const seed = i * 9973;
      const x = Math.floor(((seed * 13 + now * (0.012 + (i % 5) * 0.002)) % (w + 40)) - 20);
      const y = Math.floor(((seed * 17 + now * 0.008) % (h * 0.7)));
      const twinkle = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(now * 0.004 + i));
      const size = i % 7 === 0 ? 2 : 1;
      ctx.globalAlpha = twinkle * 0.55;
      ctx.fillStyle = i % 3 === 0 ? "#FF6B2C" : "#5BC0EB";
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore();
  }

  /** Tiny blue / silver sparkles for Tesla Works atmosphere */
  _drawTeslaSparkles(ctx, now) {
    const n = 80;
    const h = this.cssH;
    const w = this.cssW;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < n; i++) {
      const seed = i * 91.7 + 7.3;
      const fallSpeed = 0.028 + (i % 5) * 0.007;
      const fall = ((now * fallSpeed + seed * 36) % (h + 24)) - 12;
      const drift =
        ((seed * 15.1 + now * (0.008 + (i % 3) * 0.003) - this.camX * 0.04) %
          (w + 16)) -
        8;
      const x = Math.floor(((drift % w) + w) % w);
      const y = Math.floor(fall);
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(now * 0.008 + seed));
      const size = i % 12 === 0 ? 2 : 1;
      ctx.globalAlpha = twinkle * 0.4;
      ctx.fillStyle = i % 7 === 0 ? "#E82127" : "#3E6AE1";
      ctx.fillRect(x - 1, y - 1, size + 2, size + 2);
      ctx.globalAlpha = Math.min(1, twinkle * 0.85);
      ctx.fillStyle = i % 7 === 0 ? "#ff6a6a" : "#8eb0ff";
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore();
  }

  _drawFlyingCars(ctx, now) {
    const cars = Art.neon?.flyingCars;
    if (!cars?.length) return;
    // Integer scales only - fractional car sizes looked mushy against crisp sprites
    const lanes = [
      { y: 0.24, speed: 0.038, scale: 1, alpha: 0.75 },
      { y: 0.3, speed: -0.03, scale: 2, alpha: 0.85 },
      { y: 0.35, speed: 0.045, scale: 1, alpha: 0.7 },
      { y: 0.4, speed: -0.022, scale: 1, alpha: 0.6 },
    ];
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let li = 0; li < lanes.length; li++) {
      const lane = lanes[li];
      const car = cars[li % cars.length];
      const span = this.cssW + 60;
      let x = ((now * lane.speed + li * 90 - this.camX * 0.15) % span + span) % span - 30;
      const y = Math.floor(this.cssH * lane.y + Math.sin(now * 0.002 + li) * 2);
      const w = car.width * lane.scale;
      const h = car.height * lane.scale;
      ctx.globalAlpha = lane.alpha;
      if (lane.speed < 0) {
        ctx.save();
        ctx.translate(Math.floor(x) + w, y);
        ctx.scale(-1, 1);
        ctx.drawImage(car, 0, 0, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(car, Math.floor(x), y, w, h);
      }
      // Second car further along the lane
      const x2 = (x + span * 0.45) % span - 30;
      ctx.globalAlpha = lane.alpha * 0.75;
      ctx.drawImage(cars[(li + 1) % cars.length], Math.floor(x2), y + 3, w, h);
    }
    ctx.restore();
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
    const toxic = Art.neon?.toxic || ground;
    const cables = Art.neon?.cables || Art.cables || [];
    const tNow = this._now || now;
    const drawnPlats = new Set();

    for (let ty = startTy; ty < endTy; ty++) {
      for (let tx = startTx; tx < endTx; tx++) {
        const t = World.get(tx, ty);
        if (t === TILE.EMPTY) continue;
        const sx = Math.floor(tx * CFG.TILE * VIEW_SCALE - this.camX * VIEW_SCALE);
        const sy = Math.floor(ty * CFG.TILE * VIEW_SCALE - this.camY * VIEW_SCALE);

        if (t === TILE.TOXIC) {
          ctx.drawImage(toxic, sx, sy, tilePx, tilePx);
          // Animated surface glints / bubbles
          const wave = Math.floor(tNow / 140 + tx * 3 + ty) % 4;
          ctx.fillStyle = wave === 0 ? "#7effc8" : "#00e8ff";
          ctx.globalAlpha = 0.75;
          ctx.fillRect(sx + ((tx * 5 + wave * 3) % 12), sy + 1 + (wave % 2), 2, 1);
          ctx.fillStyle = "#ffe066";
          if ((tx + Math.floor(tNow / 220)) % 5 === 0) {
            ctx.fillRect(sx + 6, sy + 4 + wave, 1, 1);
          }
          // Rising bubble
          if ((tx * 7 + Math.floor(tNow / 180)) % 6 === 0) {
            ctx.fillStyle = "#a8ffd8";
            ctx.fillRect(sx + 4 + (wave % 3), sy + 6 + ((Math.floor(tNow / 90) + tx) % 8), 1, 1);
          }
          ctx.globalAlpha = 1;
          // Only top toxic row gets a bright hazard lip
          const above = ty > 0 ? World.get(tx, ty - 1) : TILE.SOLID;
          if (above !== TILE.TOXIC) {
            ctx.fillStyle = "#2dff9a";
            ctx.fillRect(sx, sy, tilePx, 1);
            ctx.fillStyle = "rgba(255, 80, 160, 0.35)";
            ctx.fillRect(sx, sy - 1, tilePx, 1);
          }
        } else if (t === TILE.SOLID) {
          ctx.drawImage(ground, sx, sy, tilePx, tilePx);
        } else if (isPlatformTile(t)) {
          const key = `${tx},${ty}`;
          if (drawnPlats.has(key)) continue;
          // Contiguous run of same platform type -> one Grok slab stretch
          let run = 1;
          while (tx + run < World.W && World.get(tx + run, ty) === t) run++;
          for (let i = 0; i < run; i++) drawnPlats.add(`${tx + i},${ty}`);

          const art = this._platArt(t);
          // Distinct silhouettes: bounce tallest, slip mid glass, grip compact tread
          const ph =
            t === TILE.PLAT_BOUNCE
              ? Math.floor(tilePx * 1.28)
              : t === TILE.PLAT_SLIP
                ? Math.floor(tilePx * 1.05)
                : Math.floor(tilePx * 0.88);
          const spanW = run * tilePx;
          // Keep walkable lip on the tile top; extra height hangs below
          const drawY = sy - Math.floor(tilePx * 0.08);
          ctx.drawImage(art, sx, drawY, spanW, ph);
          this._platFx(ctx, t, sx, drawY, spanW, ph, tNow, tx, ty);
          // Boring Company: warm concrete wash on platform body
          if (this.theme === "boring") {
            ctx.save();
            ctx.globalAlpha = 0.28;
            ctx.fillStyle = "#6a7068";
            ctx.fillRect(sx, drawY + 3, spanW, Math.max(1, ph - 3));
            ctx.restore();
          }
          // Neuralink: cool sterile teal-grey wash on platform body
          if (this.theme === "neuralink") {
            ctx.save();
            ctx.globalAlpha = 0.28;
            ctx.fillStyle = "#6a7a7e";
            ctx.fillRect(sx, drawY + 3, spanW, Math.max(1, ph - 3));
            ctx.restore();
          }
          // Tesla Works: cool grey wash on platform body (opacity 0.3), lips stay crisp
          if (this.theme === "tesla") {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = "#5c6672";
            ctx.fillRect(sx, drawY + 3, spanW, Math.max(1, ph - 3));
            ctx.restore();
          }
          // SpaceX Ascent: cool navy-steel wash on platform body
          if (this.theme === "spacex") {
            ctx.save();
            ctx.globalAlpha = 0.28;
            ctx.fillStyle = "#2a3a48";
            ctx.fillRect(sx, drawY + 3, spanW, Math.max(1, ph - 3));
            ctx.restore();
          }
          // Moon Bouncing: ash-grey lunar wash on platform body
          if (this.theme === "moon") {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = "#6a6a78";
            ctx.fillRect(sx, drawY + 3, spanW, Math.max(1, ph - 3));
            ctx.restore();
          }
          // Inside Starship: cool steel wash on platform body
          if (this.theme === "starship") {
            ctx.save();
            ctx.globalAlpha = 0.28;
            ctx.fillStyle = "#3a4a5c";
            ctx.fillRect(sx, drawY + 3, spanW, Math.max(1, ph - 3));
            ctx.restore();
          }

          // Grip pads keep dangling pixel cables under the slab
          if (t === TILE.PLATFORM && cables.length) {
            for (let i = 0; i < run; i++) {
              const ptx = tx + i;
              const psx = Math.floor(ptx * CFG.TILE * VIEW_SCALE - this.camX * VIEW_SCALE);
              const above = ty > 0 ? World.get(ptx, ty - 1) : TILE.SOLID;
              const below = ty + 1 < World.H ? World.get(ptx, ty + 1) : TILE.SOLID;
              if (above !== TILE.EMPTY || below !== TILE.EMPTY) continue;
              const seed = (ptx * 13 + ty * 7) >>> 0;
              if (seed % 3 !== 0) {
                const cable = cables[seed % cables.length];
                const cx = psx + ((seed % 5) + 2);
                const cy = drawY + ph - 2;
                ctx.drawImage(cable, cx, cy);
                this._drawCableSparks(ctx, cx, cy, cable, seed, now);
              }
            }
          }
        } else if (t === TILE.EXIT) {
          if (this.theme === "moon") {
            // Starship door / hatch - steel frame + cyan airlock glow
            ctx.save();
            ctx.fillStyle = "#2a3448";
            ctx.fillRect(sx, sy - tilePx, tilePx, tilePx * 2);
            ctx.fillStyle = "#c8d4e0";
            ctx.fillRect(sx + 2, sy - tilePx + 2, tilePx - 4, 3);
            ctx.fillRect(sx + 2, sy + tilePx - 5, tilePx - 4, 3);
            ctx.fillStyle = "#0a0e18";
            ctx.fillRect(sx + 4, sy - tilePx + 6, tilePx - 8, tilePx * 2 - 14);
            const pulse = 0.45 + 0.35 * (0.5 + 0.5 * Math.sin(tNow * 0.005));
            ctx.globalAlpha = pulse;
            ctx.fillStyle = "#7ec8e8";
            ctx.fillRect(sx + 6, sy - tilePx + 10, tilePx - 12, tilePx * 2 - 22);
            ctx.globalAlpha = 1;
            ctx.strokeStyle = "#ffe8a0";
            ctx.lineWidth = 1;
            ctx.strokeRect(sx + 3, sy - tilePx + 3, tilePx - 6, tilePx * 2 - 6);
            ctx.restore();
          } else if (this.theme === "starship") {
            // Helm / control pad - lit floor + amber guide lights
            ctx.save();
            ctx.fillStyle = "#1a2434";
            ctx.fillRect(sx, sy, tilePx, tilePx);
            ctx.fillStyle = "#3a4658";
            ctx.fillRect(sx + 1, sy + 1, tilePx - 2, tilePx - 2);
            const pulse = 0.4 + 0.4 * (0.5 + 0.5 * Math.sin(tNow * 0.006));
            ctx.globalAlpha = pulse;
            ctx.fillStyle = "#7ec8e8";
            ctx.fillRect(sx + 3, sy + 4, tilePx - 6, 3);
            ctx.fillStyle = "#ffe8a0";
            ctx.fillRect(sx + 4, sy + tilePx - 7, tilePx - 8, 3);
            ctx.globalAlpha = 1;
            ctx.strokeStyle = "#c8d4e0";
            ctx.lineWidth = 1;
            ctx.strokeRect(sx + 2, sy + 2, tilePx - 4, tilePx - 4);
            ctx.restore();
          } else {
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
  }

  _platArt(t) {
    if (t === TILE.PLAT_SLIP) {
      return Art.neon?.platformSlip || Art.tilePlatSlip || Art.neon?.platform || this.fallbackTiles.plat;
    }
    if (t === TILE.PLAT_BOUNCE) {
      return Art.neon?.platformBounce || Art.tilePlatBounce || Art.neon?.platform || this.fallbackTiles.plat;
    }
    return Art.neon?.platform || Art.tilePlat || this.fallbackTiles.plat;
  }

  /** Bold lip + motion cues so types read instantly at 480x270. */
  _platFx(ctx, t, sx, sy, w, h, now, tx, ty) {
    ctx.save();
    if (t === TILE.PLAT_SLIP) {
      // Thick cyan ice lip + frost shimmer band
      ctx.fillStyle = "#00e8ff";
      ctx.fillRect(sx, sy, w, 3);
      ctx.fillStyle = "#7df9ff";
      ctx.fillRect(sx, sy, w, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(sx, sy, w, 1);
      // Sliding specular streak
      const streak = Math.floor(now / 70 + tx * 5) % Math.max(8, w - 6);
      ctx.globalAlpha = 0.85;
      ctx.fillRect(sx + streak, sy + 1, 6, 1);
      ctx.fillStyle = "#b8ecff";
      ctx.globalAlpha = 0.5;
      ctx.fillRect(sx, sy + 3, w, 1);
      // Ice sparkles
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "#ffffff";
      const spark = Math.floor(now / 140 + tx) % 6;
      ctx.fillRect(sx + 3 + spark * 8, sy + 2, 2, 1);
      ctx.fillRect(sx + 7 + ((spark + 2) % 6) * 7, sy, 1, 1);
      // Soft cyan underglow (glass body cue)
      ctx.fillStyle = "rgba(0, 232, 255, 0.35)";
      ctx.fillRect(sx, sy + h - 2, w, 2);
    } else if (t === TILE.PLAT_BOUNCE) {
      // Pink underband + thick gold launch deck
      ctx.fillStyle = CFG.COLORS.neonPink || "#ff2ea6";
      ctx.fillRect(sx, sy + 2, w, 2);
      ctx.fillStyle = CFG.COLORS.gold || "#ffe066";
      ctx.fillRect(sx, sy, w, 3);
      ctx.fillStyle = "#fff0a8";
      ctx.fillRect(sx, sy, w, 1);
      // Repeating upward chevrons across the span
      const pulse = 0.45 + 0.5 * Math.sin(now / 160 + tx * 0.5 + ty);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = CFG.COLORS.neonPink || "#ff2ea6";
      for (let x = sx + 4; x < sx + w - 6; x += 12) {
        ctx.fillRect(x + 3, sy - 3, 2, 3);
        ctx.fillRect(x + 1, sy - 1, 6, 1);
        ctx.fillRect(x + 2, sy - 2, 4, 1);
      }
      ctx.globalAlpha = 1;
      // Warm gold underside LEDs
      ctx.fillStyle = "#ffe066";
      for (let x = sx + 3; x < sx + w - 2; x += 10) {
        ctx.fillRect(x, sy + h - 2, 3, 1);
      }
    } else {
      // Purple neon grip lip + tread dashes + corner brackets
      ctx.fillStyle = CFG.COLORS.purple || "#b388ff";
      ctx.fillRect(sx, sy, w, 3);
      ctx.fillStyle = CFG.COLORS.purpleLight || "#d6b6ff";
      ctx.fillRect(sx, sy, w, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(sx, sy, w, 1);
      ctx.fillStyle = "#9a6ef0";
      for (let x = sx + 2; x < sx + w - 2; x += 5) {
        ctx.fillRect(x, sy + 2, 3, 1);
      }
      // Corner brackets
      ctx.fillStyle = "#e8d4ff";
      ctx.fillRect(sx, sy, 3, 4);
      ctx.fillRect(sx + w - 3, sy, 3, 4);
      // Soft purple underglow
      ctx.fillStyle = "rgba(179, 136, 255, 0.4)";
      ctx.fillRect(sx, sy + h - 2, w, 2);
    }
    ctx.restore();
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
    if (e.kind === "carbot") {
      return frameAt(
        Art.carbotAnims || Art.optimusAnims || Art.cyborgAnims,
        state,
        e.frame ?? e.anim?.index ?? 0,
        Art.carbot || Art.optimus || Art.soldierStand
      );
    }
    if (e.kind === "rocket") {
      return frameAt(
        Art.rocketAnims || Art.carbotAnims || Art.optimusAnims || Art.cyborgAnims,
        state,
        e.frame ?? e.anim?.index ?? 0,
        Art.rocket || Art.carbot || Art.optimus || Art.soldierStand
      );
    }
    if (e.kind === "optimus") {
      return frameAt(
        Art.optimusAnims || Art.cyborgAnims,
        state,
        e.frame ?? e.anim?.index ?? 0,
        Art.optimus || Art.soldierStand
      );
    }
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

  /**
   * Pink overlay (0.3) + dark purple hard outline for drones/cyborgs.
   * Cached per source frame so anims stay cheap.
   * Boss uses stronger pink (0.42) + thicker purple rim via `strong`.
   */
  _tintEnemyPink(spr, strong = false) {
    if (!spr) return null;
    if (!this._enemyTintCache) this._enemyTintCache = new WeakMap();
    const cacheKey = strong ? "strong" : "normal";
    let byMode = this._enemyTintCache.get(spr);
    if (!byMode) {
      byMode = Object.create(null);
      this._enemyTintCache.set(spr, byMode);
    }
    if (byMode[cacheKey]) return byMode[cacheKey];
    const c = document.createElement("canvas");
    c.width = spr.width;
    c.height = spr.height;
    const cctx = c.getContext("2d");
    cctx.imageSmoothingEnabled = false;
    cctx.drawImage(spr, 0, 0);
    cctx.globalCompositeOperation = "source-atop";
    cctx.fillStyle = strong
      ? "rgba(255, 46, 166, 0.42)"
      : "rgba(255, 46, 166, 0.3)";
    cctx.fillRect(0, 0, c.width, c.height);
    cctx.globalCompositeOperation = "source-over";
    // Dark purple silhouette rim (boss gets a second thicker pass)
    let outlined = bakeHardOutline(c, strong ? "#5a2d8a" : "#3a2458");
    if (strong) outlined = bakeHardOutline(outlined, "#3a2458");
    byMode[cacheKey] = outlined;
    return outlined;
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
    // Sprites already carry a baked hard outline - skip soft multi-pass neon blit
    const outline = opts.outline === true;
    const scale = opts.scale != null ? opts.scale : 1;
    const w = Math.max(1, Math.round(spr.width * scale));
    const h = Math.max(1, Math.round(spr.height * scale));
    // Snap world coords + bob to the pixel grid so outlines don't crawl while moving
    const wx = Math.floor(x);
    const wy = Math.floor(y);
    const bobI = Math.round(bob);
    const sx = Math.floor(wx * VIEW_SCALE - this.camX * VIEW_SCALE - (w >> 1));
    // Align sprite box bottom to entity feet (pad matches sheet empty margin under boots)
    const foot = opts.foot ?? 8;
    const sy = Math.floor(wy * VIEW_SCALE - this.camY * VIEW_SCALE - h + foot + bobI);
    ctx.save();
    // Optional horizontal squash = fake Y-axis turntable for neon 3D pickups
    if (opts.squashX != null) {
      const cx = sx + (w >> 1);
      const cy = sy + (h >> 1);
      const sxScale = (facing < 0 ? -1 : 1) * opts.squashX;
      ctx.translate(cx, cy);
      ctx.scale(sxScale, 1);
      if (outline) this._blitNeonOutline(ctx, spr, -(w >> 1), -(h >> 1), w, h);
      else ctx.drawImage(spr, -(w >> 1), -(h >> 1), w, h);
    } else if (facing < 0) {
      ctx.translate(sx + w, sy);
      ctx.scale(-1, 1);
      if (outline) this._blitNeonOutline(ctx, spr, 0, 0, w, h);
      else ctx.drawImage(spr, 0, 0, w, h);
    } else if (outline) {
      this._blitNeonOutline(ctx, spr, sx, sy, w, h);
    } else {
      ctx.drawImage(spr, sx, sy, w, h);
    }
    ctx.restore();
  }

  _blitNeonOutline(ctx, spr, dx, dy, dw = spr.width, dh = spr.height) {
    const pink = this._neonSilhouette(spr, CFG.COLORS.neonPink || "#ff2ea6");
    const cyan = this._neonSilhouette(spr, CFG.COLORS.neonCyan || "#00e8ff");
    // Hard 1px outline only (no soft multi-offset glow - that crawls when scaled)
    ctx.drawImage(pink, dx - 1, dy, dw, dh);
    ctx.drawImage(cyan, dx + 1, dy, dw, dh);
    ctx.drawImage(pink, dx, dy - 1, dw, dh);
    ctx.drawImage(cyan, dx, dy + 1, dw, dh);
    ctx.drawImage(spr, dx, dy, dw, dh);
  }

  /** Ease-in-out for a snappy sword arc (0->1). */
  _slashEase(t) {
    const p = Math.max(0, Math.min(1, t));
    return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  }

  /**
   * Pink Three.js sword at a swing angle. Pivot near the grip; tip sweeps forward.
   * `angle` is radians from raised-back (negative) through follow-through (positive).
   */
  _blitPinkSword(ctx, sx, sy, facing, angle, alpha, scale = 1.45) {
    const sword = Art.pinkSword;
    if (!sword || alpha <= 0.01) return;
    const len = PLAYER_TARGET_H * scale;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.translate(sx, sy);
    ctx.scale(facing < 0 ? -1 : 1, 1);
    ctx.rotate(angle);
    // Grip near origin; tip points along +Y before rotate, then arc sweeps
    ctx.drawImage(sword, -len * 0.5, -len * 0.88, len, len);
    ctx.restore();
  }

  /**
   * Simple pink sword swing with fading afterimages along the arc.
   * `progress` 0 at wind-up, 1 at follow-through.
   */
  _drawPinkSwordSwing(ctx, sx, sy, facing, progress, baseAlpha = 1) {
    if (!Art.pinkSword) return;
    const ease = this._slashEase(progress);
    // Raised high behind -> full chop straight down past the feet
    const ang0 = -1.45;
    const ang1 = 2.05;
    const angle = ang0 + (ang1 - ang0) * ease;
    const pink = CFG.COLORS.neonPink || "#ff2ea6";

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // Soft pink crescent under the full arc
    ctx.globalAlpha = baseAlpha * (0.1 + (1 - Math.abs(ease - 0.5)) * 0.22);
    ctx.strokeStyle = pink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(
      sx + facing * 2,
      sy + 4,
      PLAYER_TARGET_H * 0.78,
      facing < 0 ? Math.PI - angle : ang0 - Math.PI * 0.5,
      facing < 0 ? Math.PI - ang0 : angle - Math.PI * 0.5
    );
    ctx.stroke();

    // Afterimages - older angles, fading pink ghosts (spaced for the longer chop)
    const ghosts = [
      { back: 0.16, alpha: 0.5 },
      { back: 0.32, alpha: 0.3 },
      { back: 0.48, alpha: 0.16 },
    ];
    for (let i = ghosts.length - 1; i >= 0; i--) {
      const g = ghosts[i];
      const gp = Math.max(0, ease - g.back);
      const ga = ang0 + (ang1 - ang0) * gp;
      this._blitPinkSword(ctx, sx, sy, facing, ga, baseAlpha * g.alpha, 1.4);
    }
    // Lead blade
    this._blitPinkSword(ctx, sx, sy, facing, angle, baseAlpha, 1.5);
    ctx.restore();
  }

  _drawBolt(ctx, b, sx, sy) {
    const col = b.color || CFG.COLORS.cyan;
    const ang = Math.atan2(b.vy || 0, b.vx || 1);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (b.rainbow) {
      const core = hexTint(col, 0.22);
      ctx.globalCompositeOperation = "source-over";
      for (let i = 4; i >= 1; i--) {
        const tx = sx - (b.vx || 0) * VIEW_SCALE * i * 1.15;
        const ty = sy - (b.vy || 0) * VIEW_SCALE * i * 1.15;
        ctx.globalAlpha = 0.2 + (4 - i) * 0.1;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(tx, ty, 7 + i * 0.35, 3.1, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.5;
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 12, 5.5, ang, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.shadowColor = col;
      ctx.shadowBlur = 8;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 9, 4, ang, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.ellipse(
        sx + Math.cos(ang) * 1.4,
        sy + Math.sin(ang) * 1.4,
        3.4,
        1.6,
        ang,
        0,
        Math.PI * 2
      );
      ctx.fill();
    } else {
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(sx + 1, sy, 3, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
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
    ctx.fillText(
      this.theme === "moon" ? "SHIP" : this.theme === "starship" ? "ELOVE" : "EXIT",
      sx,
      sy - 18
    );
    ctx.restore();
  }

  _drawFx(ctx, now) {
    this.fx = this.fx.filter((fx) => now < fx.until);
    for (const fx of this.fx) {
      if (fx.type === "swordSwing") {
        const sx = Math.floor(fx.x * VIEW_SCALE - this.camX * VIEW_SCALE + fx.facing * 12);
        const sy = Math.floor(fx.y * VIEW_SCALE - this.camY * VIEW_SCALE - 10);
        const dur = Math.max(1, fx.until - (fx.t0 || now));
        const progress = Math.max(0, Math.min(1, (now - (fx.t0 || now)) / dur));
        const life = Math.max(0, (fx.until - now) / dur);
        const fade = progress > 0.82 ? (1 - progress) / 0.18 : 1;
        this._drawPinkSwordSwing(ctx, sx, sy, fx.facing, progress, 0.55 + life * 0.45 * fade);
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
        const dur = Math.max(1, fx.until - (fx.t0 != null ? fx.t0 : fx.until - 900));
        const t = Math.max(0, Math.min(1, 1 - (fx.until - now) / dur));
        const sx = Math.floor(fx.x * VIEW_SCALE - this.camX * VIEW_SCALE);
        const sy = Math.floor(fx.y * VIEW_SCALE - this.camY * VIEW_SCALE);
        ctx.strokeStyle = fx.color;
        ctx.globalAlpha = 1 - t;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(0.5, 6 + t * 24), 0, Math.PI * 2);
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
    this._now = now;
    this.camX = Math.floor((now * 0.02) % 320);
    this.camY = 0;
    this._drawSky(ctx);
    this._drawDecor(ctx);
    this._drawWorld(ctx, now);

    ctx.fillStyle = "rgba(12, 6, 22, 0.35)";
    ctx.fillRect(0, 0, this.cssW, this.cssH);

    if (Art.uiFrame) {
      const fw = Math.min(200, this.cssW * 0.45);
      const fh = fw * (Art.uiFrame.height / Art.uiFrame.width);
      ctx.drawImage(
        Art.uiFrame,
        Math.floor((this.cssW - fw) / 2),
        Math.floor(this.cssH * 0.12),
        Math.floor(fw),
        Math.floor(fh)
      );
    }

    if (Art.catRocket) {
      const x = Math.floor(this.cssW * 0.5 - Art.catRocket.width / 2);
      const y = Math.floor(this.cssH * 0.55 + Math.sin(now * 0.003) * 4);
      ctx.drawImage(Art.catRocket, x, y);
    }
    if (Art.drone) {
      const drone = this._tintEnemyPink(Art.drone);
      ctx.drawImage(
        drone,
        Math.floor(this.cssW * 0.72 + Math.sin(now * 0.002) * 8),
        Math.floor(this.cssH * 0.36 + Math.cos(now * 0.0025) * 5)
      );
    }
    if (Art.soldierStand) {
      const soldier = this._tintEnemyPink(Art.soldierStand);
      ctx.drawImage(
        soldier,
        Math.floor(this.cssW * 0.18),
        Math.floor(this.cssH * 0.52)
      );
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
        const bob = Math.round(Math.sin(now * 0.006 + (d.item.x || 0)) * 2);
        // Elove notes - smooth pink hearts spinning (enable AA blit)
        if (d.item.type === "clue" && Art.clueHeartFrames?.length) {
          const n = Art.clueHeartFrames.length;
          const angle = now * 0.0032 + (d.item.x || 0) * 0.05;
          const idx = ((Math.floor((angle / (Math.PI * 2)) * n) % n) + n) % n;
          const prevSmooth = ctx.imageSmoothingEnabled;
          const prevQ = ctx.imageSmoothingQuality;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          this._drawSprite(ctx, Art.clueHeartFrames[idx], d.item.x, d.item.y, 1, bob, {
            scale: 0.4,
            foot: 6,
          });
          ctx.imageSmoothingEnabled = prevSmooth;
          ctx.imageSmoothingQuality = prevQ;
        } else if (d.item.type === "candy") {
          // Cake candies - transparent silhouette + black outline, heart-sized spin
          const kind = d.item.candyKind;
          const spr =
            (kind && Art.powerups?.candies?.[kind]) ||
            Art.powerups?.candy ||
            Art.powerups?.toffee;
          if (spr) {
            const angle = now * 0.0032 + (d.item.x || 0) * 0.05;
            const cosA = Math.cos(angle);
            const facing = cosA >= 0 ? 1 : -1;
            const squashX = Math.max(0.22, Math.abs(cosA));
            this._drawSprite(ctx, spr, d.item.x, d.item.y, facing, bob, {
              scale: 0.4,
              foot: 6,
              squashX,
            });
          }
        } else if (spr && Art.powerups?.[d.item.type] && d.item.type !== "sword") {
          // Continuous squash turntable for other neon 3D powerups / guns
          const angle = now * 0.0026 + (d.item.x || 0) * 0.04;
          const cosA = Math.cos(angle);
          const facing = cosA >= 0 ? 1 : -1;
          const squashX = Math.max(0.38, Math.abs(cosA));
          this._drawSprite(ctx, spr, d.item.x, d.item.y, facing, bob, { squashX });
        } else if (spr) {
          this._drawSprite(ctx, spr, d.item.x, d.item.y, 1, bob);
        }
      } else if (d.kind === "enemy") {
        const e = d.e;
        const flash = now < e.stunUntil ? Math.floor(now / 40) % 2 : 0;
        if (flash) continue;
        if (e.kind === "drone") {
          const spr = this._tintEnemyPink(this._droneSprite(e));
          if (spr) this._drawSprite(ctx, spr, e.x, e.y, e.facing < 0 ? 1 : -1);
        } else if (e.kind === "carbot") {
          const spr = this._tintEnemyPink(this._soldierSprite(e), true);
          // Large boss - wider chassis already loaded; slight extra scale + foot pad
          if (spr) {
            this._drawSprite(ctx, spr, e.x, e.y, e.facing, 0, {
              foot: 22,
              scale: 1.35,
            });
          }
        } else if (e.kind === "rocket") {
          const spr = this._tintEnemyPink(this._soldierSprite(e), true);
          // Large rocket boss - tall Starship; extra scale + foot pad
          if (spr) {
            this._drawSprite(ctx, spr, e.x, e.y, e.facing, 0, {
              foot: 24,
              scale: 1.4,
            });
          }
        } else {
          const spr = this._tintEnemyPink(this._soldierSprite(e));
          // Screenshot-tuned: +6px so boots sit on platform lip (was floating)
          // foot +1: bakeHardOutline pads +1px around sprite
          if (spr) this._drawSprite(ctx, spr, e.x, e.y, e.facing, 0, { foot: 17 });
        }
      } else if (d.kind === "player") {
        const p = d.p;
        // L3 orbiting helper droids (draw even while player i-frames)
        for (const h of this._helpers || []) {
          const sprH = Art.powerups?.["helper-droid"];
          if (!sprH) continue;
          const bobH = Math.round(Math.sin(now * 0.01 + (h.angle || 0)) * 1);
          this._drawSprite(ctx, sprH, h.x, h.y, 1, bobH, { scale: 0.85, foot: 6 });
        }
        const iframe = now < p.iframeUntil && Math.floor(now / 50) % 2;
        if (iframe) continue;
        const bob = p.onGround ? (p.state === "walk" ? Math.round(Math.sin(p.frame * 1.4) * 2) : 0) : 0;
        const spr = this._playerSprite(p);
        // Clean (non-pixel) player sheets - smooth blit so HD upscale stays soft
        const prevSmooth = ctx.imageSmoothingEnabled;
        const prevQuality = ctx.imageSmoothingQuality;
        if (Art.playerPipeline?.pixelate === false) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
        }
        if (spr) this._drawSprite(ctx, spr, p.x, p.y, p.facing, bob, { foot: 6 });
        ctx.imageSmoothingEnabled = prevSmooth;
        ctx.imageSmoothingQuality = prevQuality;
        // Pink sword swing is drawn via swordSwing FX (playSlashVfx) - no extra overlay here
      }
    }

    // Drone / helper / player rainbow bolts (same ellipse bolt, tinted by b.color)
    for (const b of this._bullets || []) {
      if (!b.alive) continue;
      const sx = Math.floor(b.x * VIEW_SCALE - this.camX * VIEW_SCALE);
      const sy = Math.floor(b.y * VIEW_SCALE - this.camY * VIEW_SCALE);
      this._drawBolt(ctx, b, sx, sy);
    }

    // Elove waits at the helm (drawn after platforms/enemies so he reads clearly)
    if (this.theme === "starship" && !this._cine) {
      this._drawEloveAtControls(ctx, now);
    }

    this._drawMarkers(ctx, this._inventory || {}, now);
    this._drawFx(ctx, now);

    // Cake Realm: pink sparkle rain over the full scene
    if (this.theme === "cake") {
      this._drawCakeSparkles(ctx, now);
    }
    // Boring Company: amber / cyan tunnel dust
    if (this.theme === "boring") {
      this._drawBoringSparkles(ctx, now);
    }
    // Neuralink: teal / cyan OR sparkles
    if (this.theme === "neuralink") {
      this._drawNeuralinkSparkles(ctx, now);
    }
    // Tesla Works: soft blue / silver sparkles
    if (this.theme === "tesla") {
      this._drawTeslaSparkles(ctx, now);
    }
    // SpaceX Ascent: soft cyan / orange sparkles
    if (this.theme === "spacex") {
      this._drawSpaceXSparkles(ctx, now);
    }
    // Moon Bouncing: soft cyan / pale-gold sparkles
    if (this.theme === "moon") {
      this._drawMoonSparkles(ctx, now);
    }
    // Inside Starship: warm cabin sparkles
    if (this.theme === "starship") {
      this._drawStarshipSparkles(ctx, now);
    }

    // Level 5 win cinematic: hug -> Imagine movie -> SAVED card
    if (this._cine) {
      this._drawEloveCinematic(ctx, now);
    }
  }
}
