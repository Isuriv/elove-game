/* Side-scroller entities: cat-rocket player, ground cyborgs, flying drones */
import { CFG } from "./config.js";
import { World } from "./world.js";
import { AudioFX } from "./audio.js";
import { Art } from "./assets.js";
import { tickAnim } from "./anim.js";

const HW = 6;
const HH = 8;

function advance(entity, animKey, anims, holds, dt) {
  const list = anims?.[animKey] || [];
  tickAnim(entity.anim, animKey, list.length || 1, dt, holds, Art.animDefaults);
  entity.frame = entity.anim.index;
}

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.hp = CFG.PLAYER_HP;
    this.maxHp = CFG.PLAYER_HP;
    this.state = "idle";
    this.frame = 0;
    this.anim = { state: null, index: 0, elapsed: 0 };
    this.slashUntil = 0;
    this.slashCD = 0;
    this.forceCD = 0;
    this.iframeUntil = 0;
    this.hurtUntil = 0;
    this.shieldCharges = 0;
    this.batteryBoost = false;
    this.alive = true;
    this.onGround = false;
    this.jumpBuffered = false;
  }

  animKey() {
    if (this.state === "slash") return "slash";
    if (this.state === "hurt") return "hurt";
    if (!this.onGround || this.state === "walk") return "fly";
    return "idle";
  }

  update(dt, keys, now) {
    if (!this.alive) return;
    if (now < this.slashUntil) {
      this.state = "slash";
    } else if (now < this.hurtUntil) {
      this.state = "hurt";
    }

    let ax = 0;
    if (keys.left) ax -= 1;
    if (keys.right) ax += 1;
    if (ax) this.facing = ax > 0 ? 1 : -1;

    this.vx = ax * CFG.PLAYER_SPEED;
    this.vy = Math.min(CFG.MAX_FALL, this.vy + CFG.GRAVITY);

    this.onGround = World.onGround(this.x, this.y, HW, HH);
    if ((keys.jump || this.jumpBuffered) && this.onGround) {
      this.vy = CFG.JUMP_VY;
      this.onGround = false;
      this.jumpBuffered = false;
    }

    const beforeY = this.y;
    const moved = World.tryMove(this.x, this.y, this.vx, this.vy, HW, HH);
    this.x = moved.x;
    this.y = moved.y;

    if (this.vy > 0 && this.y <= beforeY + 0.01) {
      this.vy = 0;
      this.onGround = true;
    } else if (this.vy < 0 && this.y >= beforeY - 0.01) {
      this.vy = 0;
    }

    this.onGround = World.onGround(this.x, this.y, HW, HH);

    if (now >= this.slashUntil && now >= this.hurtUntil) {
      if (!this.onGround || ax) this.state = "walk";
      else this.state = "idle";
    }

    advance(this, this.animKey(), Art.playerAnims, Art.playerHolds, dt);

    if (this.y > World.pixelH() + 40) {
      this.hp = 0;
      this.alive = false;
    }
  }

  bufferJump() {
    this.jumpBuffered = true;
  }

  trySlash(now) {
    if (!this.alive || now < this.slashCD) return false;
    this.slashUntil = now + (CFG.SLASH_DURATION || 240);
    this.slashCD = now + CFG.SLASH_COOLDOWN;
    this.state = "slash";
    AudioFX.slash();
    return true;
  }

  tryForce(now) {
    if (!this.alive || now < this.forceCD) return false;
    const cd = this.batteryBoost ? CFG.FORCE_COOLDOWN * 0.55 : CFG.FORCE_COOLDOWN;
    this.forceCD = now + cd;
    AudioFX.warp();
    return true;
  }

  hurt(now, dmg = 1) {
    if (!this.alive || now < this.iframeUntil) return;
    if (this.shieldCharges > 0) {
      this.shieldCharges -= 1;
      this.iframeUntil = now + CFG.HIT_IFRAME_MS * 0.6;
      AudioFX.hit();
      return;
    }
    this.hp -= dmg;
    this.iframeUntil = now + CFG.HIT_IFRAME_MS;
    this.hurtUntil = now + 280;
    this.state = "hurt";
    this.vy = -2.2;
    this.vx = -this.facing * 2;
    AudioFX.hurt();
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  slashHitbox() {
    return {
      x: this.x + this.facing * 28,
      y: this.y - 4,
      r: CFG.SLASH_RANGE / 2 + 4,
    };
  }
}

export class Cyborg {
  constructor(x, y) {
    this.kind = "cyborg";
    this.x = x;
    this.y = y;
    this.facing = -1;
    this.hp = CFG.CYBORG_HP;
    this.state = "walk";
    this.frame = 0;
    this.anim = { state: null, index: 0, elapsed: 0 };
    this.alive = true;
    this.headless = false;
    this.attackUntil = 0;
    this.attackCD = 0;
    this.stunUntil = 0;
    this.vx = 0;
    this.vy = 0;
    this.patrolDir = Math.random() < 0.5 ? -1 : 1;
  }

  animKey() {
    if (this.state === "attack") return "attack";
    if (this.state === "walk" || this.state === "headless") return "walk";
    if (this.state === "hurt") return "hurt";
    return "idle";
  }

  update(dt, player, now) {
    if (!this.alive) return;

    this.vy = Math.min(CFG.MAX_FALL, this.vy + CFG.GRAVITY);

    if (Math.abs(this.vx) > 0.05) {
      this.vx *= 0.9;
    }

    if (now < this.stunUntil) {
      const moved = World.tryMove(this.x, this.y, this.vx, this.vy, 6, 8);
      this.x = moved.x;
      this.y = moved.y;
      if (World.onGround(this.x, this.y, 6, 8)) this.vy = 0;
      this.state = this.headless ? "headless" : "hurt";
      advance(this, this.animKey(), Art.cyborgAnims, Art.cyborgHolds, dt);
      return;
    }

    if (!player.alive) {
      this.state = "idle";
      advance(this, this.animKey(), Art.cyborgAnims, Art.cyborgHolds, dt);
      return;
    }

    const dx = player.x - this.x;
    const dist = Math.abs(dx);
    const inRange = dist < 220 && Math.abs(player.y - this.y) < 48;

    if (inRange && dist < 18 && now > this.attackCD) {
      this.state = "attack";
      this.attackUntil = now + 220;
      this.attackCD = now + 900;
      this.facing = dx >= 0 ? 1 : -1;
      player.hurt(now, 1);
      AudioFX.hit();
    } else if (now < this.attackUntil) {
      this.state = "attack";
    } else if (inRange) {
      const speed = this.headless ? 0.55 : 0.85;
      this.facing = dx >= 0 ? 1 : -1;
      const moved = World.tryMove(this.x, this.y, this.facing * speed + this.vx, this.vy, 6, 8);
      this.x = moved.x;
      this.y = moved.y;
      if (World.onGround(this.x, this.y, 6, 8) && this.vy > 0) this.vy = 0;
      this.state = this.headless ? "headless" : "walk";
    } else {
      const speed = 0.45;
      let mx = this.patrolDir * speed;
      const lookX = this.x + this.patrolDir * 10;
      if (!World.onGround(lookX, this.y, 6, 8) || World.tryMove(this.x, this.y, this.patrolDir * 4, 0, 6, 8).x === this.x) {
        this.patrolDir *= -1;
        mx = this.patrolDir * speed;
      }
      this.facing = this.patrolDir;
      const moved = World.tryMove(this.x, this.y, mx + this.vx, this.vy, 6, 8);
      this.x = moved.x;
      this.y = moved.y;
      if (World.onGround(this.x, this.y, 6, 8) && this.vy > 0) this.vy = 0;
      this.state = "walk";
    }

    advance(this, this.animKey(), Art.cyborgAnims, Art.cyborgHolds, dt);

    if (this.y > World.pixelH() + 40) {
      this.alive = false;
    }
  }

  takeHit(now, fromX) {
    if (!this.alive) return null;
    this.hp -= 1;
    this.stunUntil = now + 180;
    this.facing = fromX < this.x ? -1 : 1;
    this.vx = this.facing * -2.4;
    this.vy = -1.8;
    AudioFX.hit();
    if (this.hp <= 0) {
      this.alive = false;
      return { type: "scrap", x: this.x, y: this.y };
    }
    if (this.hp === 1) this.headless = true;
    return null;
  }

  applyForce(px, py) {
    const dx = this.x - px;
    const dy = this.y - py;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > CFG.FORCE_RANGE) return false;
    const power = 5 * (1 - dist / CFG.FORCE_RANGE);
    this.vx = (dx / dist) * power;
    this.vy = (dy / dist) * power - 1.5;
    this.stunUntil = performance.now() + 400;
    return true;
  }
}

export class Drone {
  constructor(x, y) {
    this.kind = "drone";
    this.x = x;
    this.y = y;
    this.homeY = y;
    this.facing = -1;
    this.hp = CFG.DRONE_HP;
    this.state = "fly";
    this.frame = 0;
    this.anim = { state: null, index: 0, elapsed: 0 };
    this.alive = true;
    this.attackCD = 0;
    this.stunUntil = 0;
    this.vx = 0;
    this.vy = 0;
    this.phase = Math.random() * Math.PI * 2;
  }

  animKey() {
    if (this.state === "attack") return "attack";
    if (this.state === "hurt") return "hurt";
    return "fly";
  }

  update(dt, player, now) {
    if (!this.alive) return;

    if (now < this.stunUntil) {
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.9;
      this.vy *= 0.9;
      this.state = "hurt";
      advance(this, this.animKey(), Art.droneAnims, Art.droneHolds, dt);
      return;
    }

    if (!player.alive) {
      this.state = "fly";
      advance(this, this.animKey(), Art.droneAnims, Art.droneHolds, dt);
      return;
    }

    this.phase += dt * 0.004;
    const dx = player.x - this.x;
    const dy = player.y - 18 - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    this.facing = dx >= 0 ? 1 : -1;

    const speed = dist < 260 ? 0.95 : 0.35;
    const bob = Math.sin(this.phase) * 0.35;
    this.x += (dx / dist) * speed * 0.55 + this.vx;
    this.y += (dy / dist) * speed * 0.35 + bob + this.vy;
    this.vx *= 0.85;
    this.vy *= 0.85;

    const groundY = (World.H - 3) * CFG.TILE;
    if (this.y > groundY - 8) this.y = groundY - 8;
    if (this.y < CFG.TILE * 2) this.y = CFG.TILE * 2;

    this.state = "fly";

    if (dist < 16 && now > this.attackCD) {
      this.attackCD = now + 800;
      player.hurt(now, 1);
      AudioFX.hit();
      this.state = "attack";
    }

    advance(this, this.animKey(), Art.droneAnims, Art.droneHolds, dt);
  }

  takeHit(now, fromX) {
    if (!this.alive) return null;
    this.hp -= 1;
    this.stunUntil = now + 160;
    this.facing = fromX < this.x ? -1 : 1;
    this.vx = this.facing * -2.8;
    this.vy = -1.2;
    AudioFX.hit();
    if (this.hp <= 0) {
      this.alive = false;
      return { type: "scrap", x: this.x, y: this.y };
    }
    return null;
  }

  applyForce(px, py) {
    const dx = this.x - px;
    const dy = this.y - py;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > CFG.FORCE_RANGE) return false;
    const power = 5.5 * (1 - dist / CFG.FORCE_RANGE);
    this.vx = (dx / dist) * power;
    this.vy = (dy / dist) * power;
    this.stunUntil = performance.now() + 350;
    return true;
  }
}
