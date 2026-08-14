/* Lightweight Web Audio SFX + chiptune bed */
export const AudioFX = (() => {
  let ctx = null;
  let muted = false;
  let paused = false;
  let bedGain = null;
  let bedNodes = [];
  let bedInterval = null;
  let bedStep = 0;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function beep(freq, dur, type = "square", vol = 0.08, slide = 0) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function slash() {
    beep(420, 0.08, "sawtooth", 0.06, -180);
    setTimeout(() => beep(280, 0.06, "square", 0.04, -80), 40);
  }

  function shoot() {
    beep(660, 0.04, "square", 0.045, -220);
  }

  function hit() {
    beep(160, 0.1, "triangle", 0.09, -60);
  }

  function pickup() {
    beep(520, 0.07, "square", 0.07);
    setTimeout(() => beep(780, 0.1, "square", 0.06), 60);
  }

  function unlock() {
    [440, 554, 659, 880].forEach((f, i) => setTimeout(() => beep(f, 0.12, "square", 0.06), i * 70));
  }

  function win() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.18, "triangle", 0.07), i * 100));
  }

  function hurt() {
    beep(110, 0.18, "sawtooth", 0.08, -40);
  }

  function warp() {
    beep(200, 0.2, "sine", 0.07, 400);
    setTimeout(() => beep(600, 0.15, "sine", 0.05, -300), 80);
  }

  function tick() {
    beep(880, 0.03, "square", 0.03);
  }

  function clearBedInterval() {
    if (bedInterval != null) {
      clearInterval(bedInterval);
      bedInterval = null;
    }
  }

  function tickBed() {
    if (!bedGain || muted || paused || document.hidden) return;
    const c = ctx;
    if (!c) return;
    bedNodes.forEach((n, idx) => {
      const on = idx === bedStep % bedNodes.length;
      n.g.gain.setTargetAtTime(on ? 0.4 : 0.02, c.currentTime, 0.05);
    });
    bedStep++;
  }

  function startBedInterval() {
    clearBedInterval();
    bedInterval = setInterval(tickBed, 420);
  }

  function stopBed() {
    clearBedInterval();
    for (const n of bedNodes) {
      try {
        n.o.stop();
      } catch (_) {}
    }
    bedNodes = [];
    if (bedGain) {
      try {
        bedGain.disconnect();
      } catch (_) {}
      bedGain = null;
    }
    bedStep = 0;
  }

  function setPaused(p) {
    paused = !!p;
    if (bedGain && !muted) {
      bedGain.gain.value = paused || document.hidden ? 0 : 0.025;
    }
  }

  function toggleMute() {
    muted = !muted;
    if (muted) {
      clearBedInterval();
      if (bedGain) bedGain.gain.value = 0;
    } else {
      if (bedGain) {
        bedGain.gain.value = paused || document.hidden ? 0 : 0.025;
        if (!bedInterval) startBedInterval();
      }
    }
    return muted;
  }

  function startBed() {
    if (muted) return;
    const c = ensure();
    if (!c || bedGain) return;
    bedGain = c.createGain();
    bedGain.gain.value = paused || document.hidden ? 0 : 0.025;
    bedGain.connect(c.destination);
    const notes = [196, 247, 294, 370, 294, 247];
    notes.forEach((freq) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.value = 0;
      o.connect(g);
      g.connect(bedGain);
      o.start();
      bedNodes.push({ o, g, freq });
    });
    bedStep = 0;
    startBedInterval();
  }

  return {
    slash,
    shoot,
    hit,
    pickup,
    unlock,
    win,
    hurt,
    warp,
    tick,
    toggleMute,
    startBed,
    stopBed,
    setPaused,
    isMuted: () => muted,
    ensure,
  };
})();
