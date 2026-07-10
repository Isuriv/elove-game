/* Player + cyborg entities (logic only — meshes synced in scene) */
import { CFG } from "./config.js";
import { World } from "./world.js";
import { AudioFX } from "./audio.js";

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.facing = 1;
    this.hp = CFG.PLAYER_HP;
    this.maxHp = CFG.PLAYER_HP;
    this.state = "idle";
    this.frame = 0;
    this.slashUntil = 0;
    this.slashCD = 0;
    this.forceCD = 0;
    this.iframeUntil = 0;
    this.alive = true;
  }

  update(dt, keys, now) {
    if (!this.alive) return;
    if (now < this.slashUntil) {
      this.state = "slash";
      this.frame += dt * 0.02;
      return;
    }

    let dx = 0;
    let dy = 0;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;

    if (dx || dy) {
      const len = Math.hypot(dx, dy) || 1;
      dx = (dx / len) * CFG.PLAYER_SPEED;
      dy = (dy / len) * CFG.PLAYER_SPEED;
      if (dx) this.facing = dx > 0 ? 1 : -1;
      this.lookX = dx;
      this.lookY = dy;
      const moved = World.tryMove(this.x, this.y, dx, dy);
      this.x = moved.x;
      this.y = moved.y;
      this.state = "walk";
      this.frame += dt * 0.02;
    } else {
      this.state = "idle";
      this.frame += dt * 0.01;
      this.lookX = this.facing;
      this.lookY = 0;
    }
  }

  trySlash(now) {
    if (!this.alive || now < this.slashCD) return false;
    this.slashUntil = now + 160;
    this.slashCD = now + CFG.SLASH_COOLDOWN;
    this.state = "slash";
    AudioFX.slash();
    return true;
  }

  tryForce(now) {
    if (!this.alive || now < this.forceCD) return false;
    this.forceCD = now + CFG.FORCE_COOLDOWN;
    AudioFX.warp();
    return true;
  }

  hurt(now, dmg = 1) {
    if (!this.alive || now < this.iframeUntil) return;
    this.hp -= dmg;
    this.iframeUntil = now + CFG.HIT_IFRAME_MS;
    this.state = "hurt";
    AudioFX.hurt();
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  slashHitbox() {
    return {
      x: this.x + this.facing * 14,
      y: this.y,
      r: CFG.SLASH_RANGE / 2,
    };
  }
}

export class Cyborg {
  constructor(x, y, dropsKey = false) {
    this.x = x;
    this.y = y;
    this.facing = -1;
    this.hp = CFG.CYBORG_HP;
    this.state = "walk";
    this.frame = 0;
    this.dropsKey = dropsKey;
    this.alive = true;
    this.headless = false;
    this.attackUntil = 0;
    this.attackCD = 0;
    this.stunUntil = 0;
    this.vx = 0;
    this.vy = 0;
  }

  update(dt, player, now) {
    if (!this.alive) return;

    if (Math.abs(this.vx) > 0.05 || Math.abs(this.vy) > 0.05) {
      const moved = World.tryMove(this.x, this.y, this.vx, this.vy, 6, 7);
      this.x = moved.x;
      this.y = moved.y;
      this.vx *= 0.85;
      this.vy *= 0.85;
    }

    if (now < this.stunUntil) {
      this.state = this.headless ? "headless" : "idle";
      return;
    }

    if (!player.alive) {
      this.state = this.headless ? "headless" : "idle";
      return;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (dist < 16 && now > this.attackCD) {
      this.state = "attack";
      this.attackUntil = now + 220;
      this.attackCD = now + 900;
      this.facing = dx >= 0 ? 1 : -1;
      if (dist < 18) player.hurt(now, 1);
      AudioFX.hit();
    } else if (now < this.attackUntil) {
      this.state = "attack";
    } else {
      const speed = this.headless ? 0.55 : 0.75;
      const mx = (dx / dist) * speed;
      const my = (dy / dist) * speed;
      this.facing = mx >= 0 ? 1 : -1;
      const moved = World.tryMove(this.x, this.y, mx, my, 6, 7);
      this.x = moved.x;
      this.y = moved.y;
      this.state = this.headless ? "headless" : "walk";
      this.frame += dt * 0.018;
    }
  }

  takeHit(now, fromX) {
    if (!this.alive) return null;
    this.hp -= 1;
    this.stunUntil = now + 180;
    this.facing = fromX < this.x ? -1 : 1;
    this.vx = this.facing * -2.2;
    AudioFX.hit();
    if (this.hp <= 0) {
      this.alive = false;
      this.state = "headless";
      return this.dropsKey ? { type: "eye", x: this.x, y: this.y } : { type: "scrap", x: this.x, y: this.y };
    }
    if (this.hp === 1) this.headless = true;
    return null;
  }

  applyForce(px, py) {
    const dx = this.x - px;
    const dy = this.y - py;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > CFG.FORCE_RANGE) return false;
    const power = 4.5 * (1 - dist / CFG.FORCE_RANGE);
    this.vx = (dx / dist) * power;
    this.vy = (dy / dist) * power;
    this.stunUntil = performance.now() + 400;
    return true;
  }
}
