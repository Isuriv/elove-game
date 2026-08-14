const fs = require("fs");
const { PNG } = require("pngjs");
const png = PNG.sync.read(fs.readFileSync("screenshots/cyborg-feet-canvas.png"));
const { width: w, height: h, data } = png;

function px(x,y){ const i=(w*y+x)<<2; return [data[i],data[i+1],data[i+2],data[i+3]]; }
function isNeon(r,g,b,a){
  if(a<200) return false;
  return (r>220&&g<80&&b>140) || (r>180&&g<120&&b>120&&r-g>80) || (b>180&&g>140&&r<120&&b-r>80) || (r<80&&g>180&&b>200);
}
function isGray(r,g,b,a){
  if(a<200) return false;
  const mx=Math.max(r,g,b), mn=Math.min(r,g,b), avg=(r+g+b)/3;
  return mx-mn<45 && avg>=70 && avg<=190 && Math.abs(r-g)<30 && Math.abs(g-b)<30;
}

// find all neon lip top Y across image (global platform surface)
let globalNeonTop = new Array(w).fill(-1);
for(let x=0;x<w;x++){
  for(let y=0;y<h;y++){
    const [r,g,b,a]=px(x,y);
    if(isNeon(r,g,b,a)){ globalNeonTop[x]=y; break; }
  }
}

// cyborg bounding: dense gray cluster
const hits=[], maxY=[], minY=[];
for(let x=0;x<w;x++){ hits[x]=0; maxY[x]=-1; minY[x]=h; }
for(let y=Math.floor(h*0.3); y<h; y++){
  for(let x=0;x<w;x++){
    const [r,g,b,a]=px(x,y);
    if(isGray(r,g,b,a)){ hits[x]++; if(y>maxY[x]) maxY[x]=y; if(y<minY[x]) minY[x]=y; }
  }
}

// cyborg x range where hits > 10
let xs=[];
for(let x=0;x<w;x++) if(hits[x]>=10) xs.push(x);
const xMin=Math.min(...xs), xMax=Math.max(...xs);
const xMid=Math.round((xMin+xMax)/2);
console.log("cyborg x range:", xMin, xMax, "mid", xMid);

// foot bottom: lowest gray in cyborg band
let footY=-1, footX=-1;
for(let x=xMin;x<=xMax;x++){
  if(maxY[x]>footY){ footY=maxY[x]; footX=x; }
}
console.log("lowest foot pixel:", footX, footY, px(footX,footY));

// platform under cyborg: median neon top in band
const neonYs=[];
for(let x=xMin;x<=xMax;x++){
  if(globalNeonTop[x]>=0) neonYs.push(globalNeonTop[x]);
}
neonYs.sort((a,b)=>a-b);
const med = neonYs[Math.floor(neonYs.length/2)];
const minN = neonYs[0];
console.log("neon tops under cyborg: min", minN, "median", med, "count", neonYs.length);

// Also: for each foot column, gap
const gaps=[];
for(let x=xMin;x<=xMax;x++){
  if(maxY[x]<0 || globalNeonTop[x]<0) continue;
  if(globalNeonTop[x] > maxY[x]) gaps.push({x, foot:maxY[x], plat:globalNeonTop[x], gap:globalNeonTop[x]-maxY[x]});
}
gaps.sort((a,b)=>a.gap-b.gap);
console.log("gap stats image-px: min", gaps[0], "median", gaps[Math.floor(gaps.length/2)], "max", gaps[gaps.length-1]);

// Column under densest foot: scan vertical profile around footX
console.log("\nVertical profile at x="+footX+" (y foot-8 .. foot+20):");
for(let y=footY-8; y<=footY+20 && y<h; y++){
  const [r,g,b,a]=px(footX,y);
  const tag = isGray(r,g,b,a)?"GRAY": isNeon(r,g,b,a)?"NEON":"";
  console.log(`  y=${y} rgb(${r},${g},${b}) ${tag}`);
}

// Also check a few columns
for(const cx of [footX-4, footX, footX+4, xMid]){
  let f=-1,p=-1;
  for(let y=0;y<h;y++){
    const [r,g,b,a]=px(cx,y);
    if(isGray(r,g,b,a)) f=y;
  }
  for(let y=0;y<h;y++){
    const [r,g,b,a]=px(cx,y);
    if(isNeon(r,g,b,a)){ p=y; break; }
  }
  console.log(`col ${cx}: footY=${f} platTop=${p} gap=${p>=0&&f>=0?p-f:"n/a"}`);
}

const gapImg = minN - footY;
console.log("\n=== SUMMARY ===");
console.log("image:", w+"x"+h, "(2x of 480x270)");
console.log("footY_img:", footY, "-> canvas", footY/2);
console.log("platformTopY_img (min under cyborg):", minN, "-> canvas", minN/2);
console.log("gap_img:", gapImg, "-> gap_canvas:", gapImg/2);
console.log("median gap_img:", gaps[Math.floor(gaps.length/2)].gap, "-> canvas", gaps[Math.floor(gaps.length/2)].gap/2);
