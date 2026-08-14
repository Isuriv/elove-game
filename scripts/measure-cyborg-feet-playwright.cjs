const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto("http://localhost:8081/?v=cyborg-feet-1", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(800);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2000);
  for (let i = 0; i < 12; i++) {
    await page.keyboard.down("KeyD");
    await page.waitForTimeout(40);
    await page.keyboard.up("KeyD");
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(400);

  const result = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return { error: "no canvas" };
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    // Some games use offscreen buffers — try reading directly
    let data;
    try {
      data = ctx.getImageData(0, 0, w, h).data;
    } catch (e) {
      return { error: "getImageData failed: " + e.message, canvasSize: [w, h] };
    }

    function isNeonLip(r, g, b, a) {
      if (a < 200) return false;
      const mag = r > 180 && g < 120 && b > 120 && r - g > 80;
      const cyan = b > 180 && g > 140 && r < 120 && b - r > 80;
      const mag2 = r > 220 && g < 80 && b > 140;
      const cyan2 = r < 80 && g > 180 && b > 200;
      return mag || cyan || mag2 || cyan2;
    }
    function isCyborgGray(r, g, b, a) {
      if (a < 200) return false;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const avg = (r + g + b) / 3;
      return mx - mn < 45 && avg >= 70 && avg <= 190 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30;
    }

    const yStart = Math.floor(h * 0.35);
    const colHits = new Array(w).fill(0);
    const colMaxY = new Array(w).fill(-1);
    for (let y = yStart; y < h - 1; y++) {
      for (let x = 0; x < w; x++) {
        const i = (w * y + x) << 2;
        if (isCyborgGray(data[i], data[i+1], data[i+2], data[i+3])) {
          colHits[x]++;
          if (y > colMaxY[x]) colMaxY[x] = y;
        }
      }
    }
    let bestX = -1, bestScore = -1;
    for (let x = 0; x < w; x++) {
      if (colHits[x] < 4) continue;
      const score = colHits[x] + (colMaxY[x] > h * 0.5 ? 50 : 0);
      if (score > bestScore) { bestScore = score; bestX = x; }
    }
    if (bestX < 0) {
      // dump some stats
      let neonCount = 0, grayCount = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (isNeonLip(data[i], data[i+1], data[i+2], data[i+3])) neonCount++;
        if (isCyborgGray(data[i], data[i+1], data[i+2], data[i+3])) grayCount++;
      }
      return { error: "no cyborg", canvasSize: [w, h], neonCount, grayCount, css: [canvas.clientWidth, canvas.clientHeight] };
    }

    let footY = -1, footX = bestX;
    for (let dx = -12; dx <= 12; dx++) {
      const x = bestX + dx;
      if (x < 0 || x >= w) continue;
      if (colMaxY[x] > footY) { footY = colMaxY[x]; footX = x; }
    }

    let platformTopY = -1, platformX = footX;
    const xLo = Math.max(0, bestX - 40), xHi = Math.min(w - 1, bestX + 40);
    for (let y = Math.min(footY + 1, h - 1); y < h; y++) {
      for (let x = xLo; x <= xHi; x++) {
        const i = (w * y + x) << 2;
        if (isNeonLip(data[i], data[i+1], data[i+2], data[i+3])) {
          platformTopY = y; platformX = x; y = h; break;
        }
      }
    }
    if (platformTopY < 0) {
      for (let y = Math.floor(h * 0.4); y < h; y++) {
        for (let x = xLo; x <= xHi; x++) {
          const i = (w * y + x) << 2;
          if (isNeonLip(data[i], data[i+1], data[i+2], data[i+3])) {
            if (platformTopY < 0 || y < platformTopY) { platformTopY = y; platformX = x; }
          }
        }
      }
    }

    const gapPx = platformTopY >= 0 && footY >= 0 ? platformTopY - footY : null;
    const fi = (w * footY + footX) << 2;
    const pi = platformTopY >= 0 ? (w * platformTopY + platformX) << 2 : -1;
    return {
      canvasSize: [w, h],
      cssSize: [canvas.clientWidth, canvas.clientHeight],
      bestCyborgColX: bestX,
      footX, footY,
      footColor: [data[fi], data[fi+1], data[fi+2]],
      platformX, platformTopY,
      platformColor: pi >= 0 ? [data[pi], data[pi+1], data[pi+2]] : null,
      gapPx,
    };
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
