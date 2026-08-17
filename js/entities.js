/* Side-scroller entities: cat-rocket player, ground cyborgs, flying drones */
import { CFG, TILE, frameScale } from "./config.js?v=play-freeze-20260815";
import { World } from "./world.js?v=play-freeze-20260815";
import { AudioFX } from "./audio.js";
import { Art } from "./assets.js?v=play-freeze-20260815";
import { tickAnim } from "./anim.js";

const HW = 8;
const HH = 10;
/** Player collision box - 30% smaller than shared enemy defaults. */
const PLAYER_HW = 6;
const PLAYER_HH = 7;
/** Level 3 car-droid boss - wide chassis hitbox. */
const CARBOT_HW = 22;
const CARBOT_HH = 16;
/** Level 4 rocket boss - tall narrow hitbox. */
const ROCKET_HW = 16;
const ROCKET_HH = 26;

function damp(v, factor, s) {
  return v * Math.pow(factor, s);
}

function blend(factor, s) {
  const f = Math.min(1, Math.max(0, factor));
  return 1 - Math.pow(1 - f, s);
}

function advance(entity, animKey, anims, holds, dt) {
  const list = anims?.[animKey] || [];
  tickAnim(entity.anim, animKey, list.length || 1, dt, holds, Art.animDefaults || undefined);
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
    this.jumpBufferUntil = 0;
    this.coyoteUntil = 0;
  }

  animKey() {
    if (this.state === "slash") return "slash";
    if (this.state === "hurt") return "hurt";
    if (!this.onGround || this.state === "walk") return "fly";
    return "idle";
  }

  update(dt, keys, now) {
    if (!this.alive) return;
    const s = frameScale(dt);
    if (now < this.slashUntil) {
      this.state = "slash";
    } else if (now < this.hurtUntil) {
      this.state = "hurt";
    }

    let ax = 0;
    if (keys.left) ax -= 1;
    if (keys.right) ax += 1;
    if (ax) this.facing = ax > 0 ? 1 : -1;

    const wasGround = this.onGround;
    this.onGround = World.onGround(this.x, this.y, PLAYER_HW, PLAYER_HH);
    const surface = this.onGround ? World.surfaceUnder(this.x, this.y, PLAYER_HW, PLAYER_HH) : TILE.EMPTY;
    const slippery = surface === TILE.PLAT_SLIP;

    if (slippery && this.onGround) {
      // Coast only when idle - lerp-to-0 on release canceled the ice slide.
      if (ax) {
        const target = ax * CFG.PLAYER_SPEED * 1.2;
        this.vx += (target - this.vx) * blend(CFG.SLIP_ACCEL, s);
      } else {
        this.vx = damp(this.vx, CFG.SLIP_FRICTION, s);
      }
      const cap = CFG.SLIP_MAX_SPEED;
      if (this.vx > cap) this.vx = cap;
      if (this.vx < -cap) this.vx = -cap;
    } else if (!this.onGround) {
      // Mario-style mid-air direction change - steer horizontally while airborne.
      const airCap = CFG.PLAYER_SPEED * (CFG.AIR_CONTROL ?? 1);
      if (ax) {
        const target = ax * airCap;
        // Snappy reverse when pressing opposite of current travel.
        if (this.vx !== 0 && Math.sign(this.vx) !== ax) {
          this.vx += ax * airCap * CFG.AIR_ACCEL * 2.2 * s;
        } else {
          this.vx += (target - this.vx) * blend(CFG.AIR_ACCEL, s);
        }
        if (this.vx > airCap) this.vx = airCap;
        if (this.vx < -airCap) this.vx = -airCap;
      } else {
        this.vx = damp(this.vx, CFG.AIR_FRICTION ?? 0.96, s);
      }
    } else {
      this.vx = ax * CFG.PLAYER_SPEED;
    }

    this.vy = Math.min(CFG.MAX_FALL, this.vy + CFG.GRAVITY * s);

    if (wasGround && !this.onGround) {
      this.coyoteUntil = now + (CFG.COYOTE_MS ?? 65);
    }
    if (this.onGround) this.coyoteUntil = now + (CFG.COYOTE_MS ?? 65);

    const buffered = now < this.jumpBufferUntil;
    const coyote = now < this.coyoteUntil;
    if ((keys.jump || buffered) && (this.onGround || coyote)) {
      this.vy = CFG.JUMP_VY;
      this.onGround = false;
      this.jumpBufferUntil = 0;
      this.coyoteUntil = 0;
    }

    const beforeY = this.y;
    const moved = World.tryMove(this.x, this.y, this.vx * s, this.vy * s, PLAYER_HW, PLAYER_HH);
    this.x = moved.x;
    this.y = moved.y;

    if (this.vy > 0 && this.y <= beforeY + 0.01) {
      this.vy = 0;
      this.onGround = true;
    } else if (this.vy < 0 && this.y >= beforeY - 0.01) {
      this.vy = 0;
    }

    this.onGround = World.onGround(this.x, this.y, PLAYER_HW, PLAYER_HH);
    const landed = this.onGround && !wasGround;
    if (landed && World.surfaceUnder(this.x, this.y, PLAYER_HW, PLAYER_HH) === TILE.PLAT_BOUNCE) {
      this.vy = CFG.BOUNCE_VY;
      this.onGround = false;
      this.coyoteUntil = 0;
    }

    if (now >= this.slashUntil && now >= this.hurtUntil) {
      if (!this.onGround || ax || (slippery && Math.abs(this.vx) > 0.2)) this.state = "walk";
      else this.state = "idle";
    }

    advance(this, this.animKey(), Art.playerAnims, Art.playerHolds, dt);

    if (this.y > World.pixelH() + 40) {
      this.hp = 0;
      this.alive = false;
    }
  }

  bufferJump(now = performance.now()) {
    this.jumpBufferUntil = now + (CFG.JUMP_BUFFER_MS ?? 125);
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
      x: this.x + this.facing * 36,
      y: this.y - 5,
      r: CFG.SLASH_RANGE / 2 + 5,
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
    const s = frameScale(dt);

    this.vy = Math.min(CFG.MAX_FALL, this.vy + CFG.GRAVITY * s);

    if (Math.abs(this.vx) > 0.05) {
      this.vx = damp(this.vx, 0.9, s);
    }

    if (now < this.stunUntil) {
      const moved = World.tryMove(this.x, this.y, this.vx * s, this.vy * s, HW, HH);
      this.x = moved.x;
      this.y = moved.y;
      if (World.onGround(this.x, this.y, HW, HH)) this.vy = 0;
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

    if (inRange && dist < 23 && now > this.attackCD) {
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
      const moved = World.tryMove(this.x, this.y, (this.facing * speed + this.vx) * s, this.vy * s, HW, HH);
      this.x = moved.x;
      this.y = moved.y;
      if (World.onGround(this.x, this.y, HW, HH) && this.vy > 0) this.vy = 0;
      this.state = this.headless ? "headless" : "walk";
    } else {
      const speed = 0.45;
      let mx = this.patrolDir * speed;
      const lookX = this.x + this.patrolDir * 10;
      if (!World.onGround(lookX, this.y, HW, HH) || World.tryMove(this.x, this.y, this.patrolDir * 4, 0, HW, HH).x === this.x) {
        this.patrolDir *= -1;
        mx = this.patrolDir * speed;
      }
      this.facing = this.patrolDir;
      const moved = World.tryMove(this.x, this.y, (mx + this.vx) * s, this.vy * s, HW, HH);
      this.x = moved.x;
      this.y = moved.y;
      if (World.onGround(this.x, this.y, HW, HH) && this.vy > 0) this.vy = 0;
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

  applyForce(px, py, now = performance.now()) {
    const dx = this.x - px;
    const dy = this.y - py;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > CFG.FORCE_RANGE) return false;
    const power = 5 * (1 - dist / CFG.FORCE_RANGE);
    this.vx = (dx / dist) * power;
    this.vy = (dy / dist) * power - 1.5;
    this.stunUntil = now + 400;
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
    this.pendingBullet = null;
    this.stunUntil = 0;
    this.vx = 0;
    this.vy = 0;
    this.phase = Math.random() * Math.PI * 2;
  }

  animKey() {
    if (this.state === "hurt") return "hurt";
    return "fly";
  }

  update(dt, player, now) {
    if (!this.alive) return;
    this.pendingBullet = null;
    const s = frameScale(dt);

    if (now < this.stunUntil) {
      this.x += this.vx * s;
      this.y += this.vy * s;
      this.vx = damp(this.vx, 0.9, s);
      this.vy = damp(this.vy, 0.9, s);
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
    this.x += ((dx / dist) * speed * 0.55 + this.vx) * s;
    this.y += ((dy / dist) * speed * 0.35 + bob + this.vy) * s;
    this.vx = damp(this.vx, 0.85, s);
    this.vy = damp(this.vy, 0.85, s);

    const groundY = (World.H - 3) * CFG.TILE;
    if (this.y > groundY - 8) this.y = groundY - 8;
    if (this.y < CFG.TILE * 2) this.y = CFG.TILE * 2;

    this.state = "fly";

    if (dist < CFG.DRONE_FIRE_RANGE && now > this.attackCD) {
      this.attackCD = now + CFG.DRONE_FIRE_INTERVAL;
      const nx = dx / dist;
      const ny = dy / dist;
      this.pendingBullet = {
        x: this.x + nx * 12,
        y: this.y + ny * 4,
        vx: nx * CFG.DRONE_BULLET_SPEED,
        vy: ny * CFG.DRONE_BULLET_SPEED,
      };
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

  applyForce(px, py, now = performance.now()) {
    const dx = this.x - px;
    const dy = this.y - py;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > CFG.FORCE_RANGE) return false;
    const power = 5.5 * (1 - dist / CFG.FORCE_RANGE);
    this.vx = (dx / dist) * power;
    this.vy = (dy / dist) * power;
    this.stunUntil = now + 350;
    return true;
  }
}

/** Tesla Optimus humanoid - ground foe using Optimus anim sheets (cyborg-like AI). */
export class Optimus {
  constructor(x, y) {
    this.kind = "optimus";
    this.x = x;
    this.y = y;
    this.facing = -1;
    this.hp = CFG.OPTIMUS_HP;
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
    const s = frameScale(dt);

    this.vy = Math.min(CFG.MAX_FALL, this.vy + CFG.GRAVITY * s);

    if (Math.abs(this.vx) > 0.05) {
      this.vx = damp(this.vx, 0.9, s);
    }

    const anims = Art.optimusAnims || Art.cyborgAnims;
    const holds = Art.optimusHolds || Art.cyborgHolds;

    if (now < this.stunUntil) {
      const moved = World.tryMove(this.x, this.y, this.vx * s, this.vy * s, HW, HH);
      this.x = moved.x;
      this.y = moved.y;
      if (World.onGround(this.x, this.y, HW, HH)) this.vy = 0;
      this.state = this.headless ? "headless" : "hurt";
      advance(this, this.animKey(), anims, holds, dt);
      return;
    }

    if (!player.alive) {
      this.state = "idle";
      advance(this, this.animKey(), anims, holds, dt);
      return;
    }

    const dx = player.x - this.x;
    const dist = Math.abs(dx);
    const inRange = dist < 240 && Math.abs(player.y - this.y) < 52;

    if (inRange && dist < 26 && now > this.attackCD) {
      this.state = "attack";
      this.attackUntil = now + 260;
      this.attackCD = now + 1000;
      this.facing = dx >= 0 ? 1 : -1;
      player.hurt(now, 1);
      AudioFX.hit();
    } else if (now < this.attackUntil) {
      this.state = "attack";
    } else if (inRange) {
      const speed = this.headless ? 0.5 : 0.75;
      this.facing = dx >= 0 ? 1 : -1;
      const moved = World.tryMove(this.x, this.y, (this.facing * speed + this.vx) * s, this.vy * s, HW, HH);
      this.x = moved.x;
      this.y = moved.y;
      if (World.onGround(this.x, this.y, HW, HH) && this.vy > 0) this.vy = 0;
      this.state = this.headless ? "headless" : "walk";
    } else {
      const speed = 0.4;
      let mx = this.patrolDir * speed;
      const lookX = this.x + this.patrolDir * 10;
      if (
        !World.onGround(lookX, this.y, HW, HH) ||
        World.tryMove(this.x, this.y, this.patrolDir * 4, 0, HW, HH).x === this.x
      ) {
        this.patrolDir *= -1;
        mx = this.patrolDir * speed;
      }
      this.facing = this.patrolDir;
      const moved = World.tryMove(this.x, this.y, (mx + this.vx) * s, this.vy * s, HW, HH);
      this.x = moved.x;
      this.y = moved.y;
      if (World.onGround(this.x, this.y, HW, HH) && this.vy > 0) this.vy = 0;
      this.state = "walk";
    }

    advance(this, this.animKey(), anims, holds, dt);

    if (this.y > World.pixelH() + 40) {
      this.alive = false;
    }
  }

  takeHit(now, fromX) {
    if (!this.alive) return null;
    this.hp -= 1;
    this.stunUntil = now + 180;
    this.facing = fromX < this.x ? -1 : 1;
    this.vx = this.facing * -2.2;
    this.vy = -1.6;
    AudioFX.hit();
    if (this.hp <= 0) {
      this.alive = false;
      return { type: "scrap", x: this.x, y: this.y };
    }
    if (this.hp === 1) this.headless = true;
    return null;
  }

  applyForce(px, py, now = performance.now()) {
    const dx = this.x - px;
    const dy = this.y - py;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > CFG.FORCE_RANGE) return false;
    const power = 4.8 * (1 - dist / CFG.FORCE_RANGE);
    this.vx = (dx / dist) * power;
    this.vy = (dy / dist) * power - 1.5;
    this.stunUntil = now + 400;
    return true;
  }
}

/**
 * Level 3 Tesla car-droid boss - large ground foe with ram melee + bolt shots.
 * Uses enemy-carbot anim sheets (same Optimus/drone pack pipeline).
 */
export class Carbot {
  constructor(x, y) {
    this.kind = "carbot";
    this.x = x;
    this.y = y;
    this.facing = -1;
    this.hp = CFG.CARBOT_HP;
    this.maxHp = CFG.CARBOT_HP;
    this.state = "walk";
    this.frame = 0;
    this.anim = { state: null, index: 0, elapsed: 0 };
    this.alive = true;
    this.attackUntil = 0;
    this.attackCD = 0;
    this.fireCD = 0;
    this.stunUntil = 0;
    this.vx = 0;
    this.vy = 0;
    this.patrolDir = -1;
    this.pendingBullet = null;
    this.ramming = false;
    this.hw = CARBOT_HW;
    this.hh = CARBOT_HH;
  }

  animKey() {
    if (this.state === "attack") return "attack";
    if (this.state === "walk") return "walk";
    if (this.state === "hurt") return "hurt";
    return "idle";
  }

  update(dt, player, now) {
    if (!this.alive) return;
    this.pendingBullet = null;
    const s = frameScale(dt);

    this.vy = Math.min(CFG.MAX_FALL, this.vy + CFG.GRAVITY * s);

    if (Math.abs(this.vx) > 0.05) {
      this.vx = damp(this.vx, 0.88, s);
    }

    const anims = Art.carbotAnims || Art.optimusAnims || Art.cyborgAnims;
    const holds = Art.carbotHolds || Art.optimusHolds || Art.cyborgHolds;
    const hw = this.hw;
    const hh = this.hh;

    if (now < this.stunUntil) {
      const moved = World.tryMove(this.x, this.y, this.vx * s, this.vy * s, hw, hh);
      this.x = moved.x;
      this.y = moved.y;
      if (World.onGround(this.x, this.y, hw, hh)) this.vy = 0;
      this.state = "hurt";
      this.ramming = false;
      advance(this, this.animKey(), anims, holds, dt);
      return;
    }

    if (!player.alive) {
      this.state = "idle";
      this.ramming = false;
      advance(this, this.animKey(), anims, holds, dt);
      return;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const inSight = dist < 320 && Math.abs(dy) < 72;

    // Mid-range bolt shots (drone-style) while approaching
    if (
      inSight &&
      dist > CFG.CARBOT_RAM_RANGE &&
      dist < CFG.CARBOT_FIRE_RANGE &&
      now > this.fireCD &&
      now > this.attackUntil
    ) {
      this.fireCD = now + CFG.CARBOT_FIRE_INTERVAL;
      const nx = dx / dist;
      const ny = dy / dist;
      this.pendingBullet = {
        x: this.x + this.facing * 18,
        y: this.y - 10,
        vx: nx * CFG.CARBOT_BULLET_SPEED,
        vy: ny * CFG.CARBOT_BULLET_SPEED * 0.55,
      };
    }

    if (inSight && dist < CFG.CARBOT_RAM_RANGE && now > this.attackCD) {
      this.state = "attack";
      this.ramming = true;
      this.attackUntil = now + 320;
      this.attackCD = now + 1100;
      this.facing = dx >= 0 ? 1 : -1;
      this.vx = this.facing * 3.4;
      player.hurt(now, CFG.CARBOT_RAM_DAMAGE);
      AudioFX.hit();
    } else if (now < this.attackUntil) {
      this.state = "attack";
      this.ramming = true;
      const moved = World.tryMove(
        this.x,
        this.y,
        (this.facing * 2.6 + this.vx) * s,
        this.vy * s,
        hw,
        hh
      );
      this.x = moved.x;
      this.y = moved.y;
      if (World.onGround(this.x, this.y, hw, hh) && this.vy > 0) this.vy = 0;
    } else if (inSight) {
      this.ramming = false;
      const speed = 0.95;
      this.facing = dx >= 0 ? 1 : -1;
      const moved = World.tryMove(
        this.x,
        this.y,
        (this.facing * speed + this.vx) * s,
        this.vy * s,
        hw,
        hh
      );
      this.x = moved.x;
      this.y = moved.y;
      if (World.onGround(this.x, this.y, hw, hh) && this.vy > 0) this.vy = 0;
      this.state = "walk";
    } else {
      this.ramming = false;
      const speed = 0.45;
      let mx = this.patrolDir * speed;
      const lookX = this.x + this.patrolDir * 16;
      if (
        !World.onGround(lookX, this.y, hw, hh) ||
        World.tryMove(this.x, this.y, this.patrolDir * 6, 0, hw, hh).x === this.x
      ) {
        this.patrolDir *= -1;
        mx = this.patrolDir * speed;
      }
      this.facing = this.patrolDir;
      const moved = World.tryMove(this.x, this.y, (mx + this.vx) * s, this.vy * s, hw, hh);
      this.x = moved.x;
      this.y = moved.y;
      if (World.onGround(this.x, this.y, hw, hh) && this.vy > 0) this.vy = 0;
      this.state = "walk";
    }

    advance(this, this.animKey(), anims, holds, dt);

    if (this.y > World.pixelH() + 40) {
      this.alive = false;
    }
  }

  takeHit(now, fromX) {
    if (!this.alive) return null;
    this.hp -= 1;
    this.stunUntil = now + 140;
    this.facing = fromX < this.x ? -1 : 1;
    this.vx = this.facing * -1.6;
    this.vy = -1.2;
    this.ramming = false;
    AudioFX.hit();
    if (this.hp <= 0) {
      this.alive = false;
      return { type: "scrap", x: this.x, y: this.y };
    }
    return null;
  }

  applyForce(px, py, now = performance.now()) {
    const dx = this.x - px;
    const dy = this.y - py;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > CFG.FORCE_RANGE + 12) return false;
    // Heavier boss - reduced knockback
    const power = 3.2 * (1 - dist / (CFG.FORCE_RANGE + 12));
    this.vx = (dx / dist) * power;
    this.vy = (dy / dist) * power - 1.1;
    this.stunUntil = now + 280;
    return true;
  }
}

/**
 * Level 4 SpaceX rocket boss - large ground foe with ram melee + bolt shots.
 * Uses enemy-rocket anim sheets (same Carbot/Optimus pack pipeline).
 */
export class RocketBoss {
  constructor(x, y) {
    this.kind = "rocket";
    this.x = x;
    this.y = y;
    this.facing = -1;
    this.hp = CFG.ROCKET_HP;
    this.maxHp = CFG.ROCKET_HP;
    this.state = "walk";
    this.frame = 0;
    this.anim = { state: null, index: 0, elapsed: 0 };
    this.alive = true;
    this.attackUntil = 0;
    this.attackCD = 0;
    this.fireCD = 0;
    this.stunUntil = 0;
    this.vx = 0;
    this.vy = 0;
    this.patrolDir = -1;
    this.pendingBullet = null;
    this.ramming = false;
    this.hw = ROCKET_HW;
    this.hh = ROCKET_HH;
  }

  animKey() {
    if (this.state === "attack") return "attack";
    if (this.state === "walk") return "walk";
    if (this.state === "hurt") return "hurt";
    return "idle";
  }

  update(dt, player, now) {
    if (!this.alive) return;
    this.pendingBullet = null;
    const s = frameScale(dt);

    this.vy = Math.min(CFG.MAX_FALL, this.vy + CFG.GRAVITY * s);

    if (Math.abs(this.vx) > 0.05) {
      this.vx = damp(this.vx, 0.88, s);
    }

    const anims = Art.rocketAnims || Art.carbotAnims || Art.optimusAnims || Art.cyborgAnims;
    const holds = Art.rocketHolds || Art.carbotHolds || Art.optimusHolds || Art.cyborgHolds;
    const hw = this.hw;
    const hh = this.hh;

    if (now < this.stunUntil) {
      const moved = World.tryMove(this.x, this.y, this.vx * s, this.vy * s, hw, hh);
      this.x = moved.x;
      this.y = moved.y;
      if (World.onGround(this.x, this.y, hw, hh)) this.vy = 0;
      this.state = "hurt";
      this.ramming = false;
      advance(this, this.animKey(), anims, holds, dt);
      return;
    }

    if (!player.alive) {
      this.state = "idle";
      this.ramming = false;
      advance(this, this.animKey(), anims, holds, dt);
      return;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const inSight = dist < 320 && Math.abs(dy) < 80;

    if (
      inSight &&
      dist > CFG.ROCKET_RAM_RANGE &&
      dist < CFG.ROCKET_FIRE_RANGE &&
      now > this.fireCD &&
      now > this.attackUntil
    ) {
      this.fireCD = now + CFG.ROCKET_FIRE_INTERVAL;
      const nx = dx / dist;
      const ny = dy / dist;
      this.pendingBullet = {
        x: this.x + this.facing * 14,
        y: this.y - 18,
        vx: nx * CFG.ROCKET_BULLET_SPEED,
        vy: ny * CFG.ROCKET_BULLET_SPEED * 0.55,
      };
    }

    if (inSight && dist < CFG.ROCKET_RAM_RANGE && now > this.attackCD) {
      this.state = "attack";
      this.ramming = true;
      this.attackUntil = now + 320;
      this.attackCD = now + 1100;
      this.facing = dx >= 0 ? 1 : -1;
      this.vx = this.facing * 3.4;
      player.hurt(now, CFG.ROCKET_RAM_DAMAGE);
      AudioFX.hit();
    } else if (now < this.attackUntil) {
      this.state = "attack";
      this.ramming = true;
      const moved = World.tryMove(
        this.x,
        this.y,
        (this.facing * 2.6 + this.vx) * s,
        this.vy * s,
        hw,
        hh
      );
      this.x = moved.x;
      this.y = moved.y;
      if (World.onGround(this.x, this.y, hw, hh) && this.vy > 0) this.vy = 0;
    } else if (inSight) {
      this.ramming = false;
      const speed = 0.95;
      this.facing = dx >= 0 ? 1 : -1;
      const moved = World.tryMove(
        this.x,
        this.y,
        (this.facing * speed + this.vx) * s,
        this.vy * s,
        hw,
        hh
      );
      this.x = moved.x;
      this.y = moved.y;
      if (World.onGround(this.x, this.y, hw, hh) && this.vy > 0) this.vy = 0;
      this.state = "walk";
    } else {
      this.ramming = false;
      const speed = 0.45;
      let mx = this.patrolDir * speed;
      const lookX = this.x + this.patrolDir * 16;
      if (
        !World.onGround(lookX, this.y, hw, hh) ||
        World.tryMove(this.x, this.y, this.patrolDir * 6, 0, hw, hh).x === this.x
      ) {
        this.patrolDir *= -1;
        mx = this.patrolDir * speed;
      }
      this.facing = this.patrolDir;
      const moved = World.tryMove(this.x, this.y, (mx + this.vx) * s, this.vy * s, hw, hh);
      this.x = moved.x;
      this.y = moved.y;
      if (World.onGround(this.x, this.y, hw, hh) && this.vy > 0) this.vy = 0;
      this.state = "walk";
    }

    advance(this, this.animKey(), anims, holds, dt);

    if (this.y > World.pixelH() + 40) {
      this.alive = false;
    }
  }

  takeHit(now, fromX) {
    if (!this.alive) return null;
    this.hp -= 1;
    this.stunUntil = now + 140;
    this.facing = fromX < this.x ? -1 : 1;
    this.vx = this.facing * -1.6;
    this.vy = -1.2;
    this.ramming = false;
    AudioFX.hit();
    if (this.hp <= 0) {
      this.alive = false;
      return { type: "scrap", x: this.x, y: this.y };
    }
    return null;
  }

  applyForce(px, py, now = performance.now()) {
    const dx = this.x - px;
    const dy = this.y - py;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist > CFG.FORCE_RANGE + 12) return false;
    const power = 3.2 * (1 - dist / (CFG.FORCE_RANGE + 12));
    this.vx = (dx / dist) * power;
    this.vy = (dy / dist) * power - 1.1;
    this.stunUntil = now + 280;
    return true;
  }
}
