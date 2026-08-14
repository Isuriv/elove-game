/* Time-based sprite animation helpers (pixel-art hold timings). */
/**
 * Recommended holds (ms) from pixel-art guides:
 * idle 400-500, walk 100-150 (~8-12fps), float/fly ~150, attack wind-up slow / impact snap.
 * Refs: sprite-ai.art animation guides, pixnote.net learn/animation
 */

export const DEFAULT_HOLDS = {
  idle: 400,
  fly: 150,
  walk: 120,
  attack: 100,
  slash: 100,
  hurt: 120,
  spin: 110,
  float: 150,
};

export function holdFor(holds, state, index = 0, defaults = DEFAULT_HOLDS) {
  const raw = holds?.[state] ?? defaults[state] ?? defaults.float ?? 150;
  if (Array.isArray(raw)) return Math.max(40, raw[index % raw.length] ?? raw[0] ?? 150);
  return Math.max(40, Number(raw) || 150);
}

/** Advance a discrete animation index using per-frame hold times (dt in ms). */
export function tickAnim(anim, state, frameCount, dtMs, holds, defaults = DEFAULT_HOLDS) {
  if (!anim) anim = { state: null, index: 0, elapsed: 0 };
  const n = Math.max(1, frameCount | 0);
  if (anim.state !== state) {
    anim.state = state;
    anim.index = 0;
    anim.elapsed = 0;
  }
  anim.elapsed += Math.max(0, dtMs);
  let guard = 0;
  while (guard++ < 32) {
    const hold = holdFor(holds, state, anim.index, defaults);
    if (anim.elapsed < hold) break;
    anim.elapsed -= hold;
    anim.index = (anim.index + 1) % n;
  }
  return anim;
}

export function frameAt(anims, state, index, fallback = null) {
  if (!anims) return fallback;
  const list = anims[state] || anims.idle || anims.fly || anims.walk || Object.values(anims)[0];
  if (!list || !list.length) return fallback;
  return list[((index % list.length) + list.length) % list.length] || fallback;
}
