const fs = require("fs");
const { PNG } = require("pngjs");
const png = PNG.sync.read(fs.readFileSync("screenshots/cyborg-feet-canvas.png"));
const { width: w, height: h, data } = png;
function px(x,y){ const i=(w*y+x)<<2; return [data[i],data[i+1],data[i+2],data[i+3]]; }

// Metallic cyborg: cool gray / steel (b >= g ~ r), mid tones
function isSteel(r,g,b,a){
  if(a<220) return false;
  const avg=(r+g+b)/3;
  const sat=Math.max(r,g,b)-Math.min(r,g,b);
  // cool gray: b slightly >= r,g; low-mid sat; mid brightness
  return avg>=90 && avg<=170 && sat<=55 && b>=r-5 && b>=g-5 && Math.abs(r-g)<=25;
}
// Magenta lip #ff2ea6 and near
function isMagenta(r,g,b,a){
  if(a<200) return false;
  return r>=200 && g<=90 && b>=120 && b<=220 && r-g>=120;
}
// Cyan lip #00e8ff
function isCyan(r,g,b,a){
  if(a<200) return false;
  return r<=80 && g>=160 && b>=200;
}
function isLip(r,g,b,a){ return isMagenta(r,g,b,a)||isCyan(r,g,b,a); }

// Restrict search to typical playfield center (exclude HUD/edges)
const x0=Math.floor(w*0.25), x1=Math.floor(w*0.75);
const y0=Math.floor(h*0.35), y1=Math.floor(h*0.85);

const hits=new Array(w).fill(0);
const maxY=new Array(w).fill(-1);
for(let y=y0;y<y1;y++){
  for(let x=x0;x<x1;x++){
    const [r,g,b,a]=px(x,y);
    if(isSteel(r,g,b,a)){ hits[x]++; if(y>maxY[x]) maxY[x]=y; }
  }
}
let bestX=-1,best=-1;
for(let x=x0;x<x1;x++){
  const score=hits[x]*2 + (maxY[x]>0?maxY[x]*0.05:0);
  if(hits[x]>=12 && score>best){ best=score; bestX=x; }
}
console.log("best steel col", bestX, "hits", hits[bestX], "maxY", maxY[bestX]);

// contiguous steel blob around bestX
let L=bestX,R=bestX;
while(L>x0 && hits[L-1]>=6) L--;
while(R<x1-1 && hits[R+1]>=6) R++;
console.log("steel blob x", L, "..", R);

let footY=-1, footX=bestX;
for(let x=L;x<=R;x++){
  if(maxY[x]>footY){ footY=maxY[x]; footX=x; }
}
console.log("foot", footX, footY, px(footX,footY));

// lip: first lip pixel at or below foot in blob+/- margin
let platY=-1, platX=-1, platKind="";
const xLo=Math.max(x0,L-20), xHi=Math.min(x1-1,R+20);
for(let y=footY; y<Math.min(h, footY+40); y++){
  for(let x=xLo;x<=xHi;x++){
    const [r,g,b,a]=px(x,y);
    if(isLip(r,g,b,a)){
      platY=y; platX=x; platKind=isMagenta(r,g,b,a)?"magenta":"cyan";
      // break both
      x=xHi+1; y=h;
    }
  }
}
// If lip is ABOVE footY somehow (feet overlapping), find lip top near same x scanning full
if(platY<0){
  for(let y=y0;y<y1;y++){
    for(let x=xLo;x<=xHi;x++){
      const [r,g,b,a]=px(x,y);
      if(isLip(r,g,b,a)){ platY=y; platX=x; platKind=isMagenta(r,g,b,a)?"magenta":"cyan"; y=y1; break; }
    }
  }
}

console.log("platform", platX, platY, platKind, platY>=0?px(platX,platY):null);

// vertical dump at footX
console.log("\nProfile x="+footX);
for(let y=footY-10;y<=footY+25 && y<h;y++){
  const [r,g,b,a]=px(footX,y);
  let t="";
  if(isSteel(r,g,b,a)) t="STEEL";
  else if(isMagenta(r,g,b,a)) t="MAG";
  else if(isCyan(r,g,b,a)) t="CYAN";
  console.log(` y=${y} (${(y/2).toFixed(1)}c) rgb(${r},${g},${b}) ${t}`);
}

// For several columns in blob, compute gap using first magenta/cyan below foot
const gaps=[];
for(let x=L;x<=R;x++){
  const f=maxY[x];
  if(f<0) continue;
  let p=-1;
  for(let y=f;y<=f+30 && y<h;y++){
    const [r,g,b,a]=px(x,y);
    if(isLip(r,g,b,a)){ p=y; break; }
  }
  if(p>=0) gaps.push(p-f);
}
gaps.sort((a,b)=>a-b);
const med=gaps.length?gaps[Math.floor(gaps.length/2)]:null;

const gapImg = platY>=0 ? platY - footY : null;
console.log("\n=== RESULT ===");
console.log(JSON.stringify({
  imageSize: [w,h],
  canvasSize: [480,270],
  scale: 2,
  footX_img: footX,
  footY_img: footY,
  footY_canvas: footY/2,
  platformTopY_img: platY,
  platformTopY_canvas: platY/2,
  gapPx_img: gapImg,
  gapPx_canvas: gapImg/2,
  medianGap_img: med,
  medianGap_canvas: med!=null?med/2:null,
  perColGaps_img: gaps,
}, null, 2));
