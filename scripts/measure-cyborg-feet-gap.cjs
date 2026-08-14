const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

function analyzeBuffer(buf, label) {
  const png = PNG.sync.read(buf);
  const { width, height, data } = png;
  console.log(`\n=== ${label} ===`);
  console.log(`imageSize: ${width}x${height}`);

  // Neon lip colors: magenta #ff2ea6, cyan #00e8ff
  function isNeonLip(r, g, b, a) {
    if (a < 200) return false;
    // magenta-ish
    const mag =
      r > 180 && g < 120 && b > 120 && r - g > 80 && Math.abs(r - b) < 100;
    // cyan-ish
    const cyan = b > 180 && g > 140 && r < 120 && b - r > 80;
    // bright neon magenta exact-ish
    const mag2 = r > 220 && g < 80 && b > 140;
    const cyan2 = r < 80 && g > 180 && b > 200;
    return mag || cyan || mag2 || cyan2;
  }

  // Cyborg gray metallic mid tones
  function isCyborgGray(r, g, b, a) {
    if (a < 200) return false;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const sat = mx - mn;
    const avg = (r + g + b) / 3;
    // mid gray, low saturation, not too dark/bright
    return sat < 45 && avg >= 70 && avg <= 190 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30;
  }

  // Find columns with cyborg pixels in lower half
  const yStart = Math.floor(height * 0.35);
  const yEnd = height - 2;
  const colHits = new Array(width).fill(0);
  const colMaxY = new Array(width).fill(-1);
  const colMinY = new Array(width).fill(height);

  for (let y = yStart; y < yEnd; y++) {
    for (let x = 0; x < width; x++) {
      const i = (width * y + x) << 2;
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (isCyborgGray(r, g, b, a)) {
        colHits[x]++;
        if (y > colMaxY[x]) colMaxY[x] = y;
        if (y < colMinY[x]) colMinY[x] = y;
      }
    }
  }

  // Pick best cyborg column: most hits with feet in lower portion
  let bestX = -1, bestScore = -1;
  for (let x = 0; x < width; x++) {
    if (colHits[x] < 8) continue;
    const footY = colMaxY[x];
    const score = colHits[x] + (footY > height * 0.5 ? 50 : 0);
    if (score > bestScore) {
      bestScore = score;
      bestX = x;
    }
  }

  if (bestX < 0) {
    // broaden search: any gray band
    console.log("No strong cyborg column found with strict gray; broadening...");
    for (let y = yStart; y < yEnd; y++) {
      for (let x = 0; x < width; x++) {
        const i = (width * y + x) << 2;
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a < 200) continue;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const avg = (r + g + b) / 3;
        if (mx - mn < 60 && avg >= 55 && avg <= 210) {
          colHits[x]++;
          if (y > colMaxY[x]) colMaxY[x] = y;
        }
      }
    }
    for (let x = 0; x < width; x++) {
      if (colHits[x] < 5) continue;
      const score = colHits[x] + colMaxY[x] * 0.1;
      if (score > bestScore) {
        bestScore = score;
        bestX = x;
      }
    }
  }

  if (bestX < 0) {
    console.log("FAILED: could not locate cyborg");
    return null;
  }

  // Search nearby columns for foot lowest Y
  let footY = -1;
  let footX = bestX;
  for (let dx = -12; dx <= 12; dx++) {
    const x = bestX + dx;
    if (x < 0 || x >= width) continue;
    if (colMaxY[x] > footY) {
      footY = colMaxY[x];
      footX = x;
    }
  }

  // Platform top: scan downward from footY in columns under cyborg for neon lip
  let platformTopY = -1;
  let platformX = footX;
  const xLo = Math.max(0, bestX - 40);
  const xHi = Math.min(width - 1, bestX + 40);

  for (let y = Math.min(footY + 1, height - 1); y < height; y++) {
    for (let x = xLo; x <= xHi; x++) {
      const i = (width * y + x) << 2;
      if (isNeonLip(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        platformTopY = y;
        platformX = x;
        y = height; // break outer
        break;
      }
    }
  }

  // If not found below feet, scan whole lower area for neon near cyborg x
  if (platformTopY < 0) {
    for (let y = Math.floor(height * 0.4); y < height; y++) {
      for (let x = xLo; x <= xHi; x++) {
        const i = (width * y + x) << 2;
        if (isNeonLip(data[i], data[i + 1], data[i + 2], data[i + 3])) {
          if (platformTopY < 0 || y < platformTopY) {
            platformTopY = y;
            platformX = x;
          }
        }
      }
    }
  }

  // Also sample a few pixels for debug
  function sample(x, y) {
    const i = (width * y + x) << 2;
    return `rgb(${data[i]},${data[i+1]},${data[i+2]})`;
  }

  const gapPx = platformTopY >= 0 && footY >= 0 ? platformTopY - footY : null;

  // Scale to 480x270 if image is larger (CSS/framebuffer vs native)
  const scaleX = width / 480;
  const scaleY = height / 270;
  const footYNative = footY / scaleY;
  const platformTopYNative = platformTopY / scaleY;
  const gapNative = gapPx != null ? gapPx / scaleY : null;

  console.log(`bestCyborgColX: ${bestX} (hits=${colHits[bestX]})`);
  console.log(`estimated footX/footY: ${footX}, ${footY} color=${sample(footX, footY)}`);
  console.log(`platformTopX/Y: ${platformX}, ${platformTopY}${platformTopY>=0 ? " color="+sample(platformX, platformTopY) : ""}`);
  console.log(`gapPx (image pixels): ${gapPx}`);
  console.log(`scale vs 480x270: ${scaleX.toFixed(3)}x, ${scaleY.toFixed(3)}y`);
  console.log(`canvas-space footY: ${footYNative.toFixed(2)}`);
  console.log(`canvas-space platformTopY: ${platformTopYNative.toFixed(2)}`);
  console.log(`canvas-space gapPx: ${gapNative != null ? gapNative.toFixed(2) : "N/A"}`);

  return { width, height, footY, platformTopY, gapPx, gapNative, footYNative, platformTopYNative };
}

// 1) Analyze existing screenshot
const shotPath = path.join("screenshots", "cyborg-feet-canvas.png");
const shotBuf = fs.readFileSync(shotPath);
analyzeBuffer(shotBuf, "screenshots/cyborg-feet-canvas.png");
