const fs = require("fs");
const { PNG } = require("pngjs");
const png = PNG.sync.read(fs.readFileSync("screenshots/cyborg-feet-canvas.png"));
const { width: w, height: h, data } = png;
function px(x,y){ const i=(w*y+x)<<2; return [data[i],data[i+1],data[i+2],data[i+3]]; }

// Broader steel including bright metal highlights
function isSteelLoose(r,g,b,a){
  if(a<220) return false;
  const avg=(r+g+b)/3;
  const sat=Math.max(r,g,b)-Math.min(r,g,b);
  return avg>=85 && avg<=230 && sat<=70 && b>=r-10 && Math.abs(r-g)<=30;
}
function isMag(r,g,b,a){ return a>=200 && r>=200 && g<=90 && b>=120 && b<=220 && r-g>=120; }

const x0=240,x1=720,y0=190,y1=460;
const maxY=new Array(w).fill(-1);
const hits=new Array(w).fill(0);
for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++){
  const [r,g,b,a]=px(x,y);
  if(isSteelLoose(r,g,b,a)){ hits[x]++; maxY[x]=y; }
}
let bestX=-1,best=0;
for(let x=x0;x<x1;x++) if(hits[x]>best){best=hits[x];bestX=x;}
let L=bestX,R=bestX;
while(L>x0&&hits[L-1]>=8)L--; while(R<x1&&hits[R+1]>=8)R++;

// Same-column measurement: for each col in blob, foot bottom then first magenta below
const rows=[];
for(let x=L;x<=R;x++){
  let f=-1;
  for(let y=y0;y<y1;y++){ const c=px(x,y); if(isSteelLoose(...c)) f=y; }
  let p=-1;
  for(let y=f+1;y<=f+40 && y<h;y++){ const c=px(x,y); if(isMag(...c)){ p=y; break; } }
  if(f>=0 && p>=0) rows.push({x,f,p,gap:p-f, gapEmpty:p-f-1});
}
rows.sort((a,b)=>a.gap-b.gap);
const mid=rows[Math.floor(rows.length/2)];
const min=rows[0];
// Prefer columns near center of blob (true feet under torso)
const midX=(L+R)/2;
rows.sort((a,b)=>Math.abs(a.x-midX)-Math.abs(b.x-midX));
const near=rows.slice(0,11);
near.sort((a,b)=>a.gap-b.gap);
const nearMed=near[Math.floor(near.length/2)];

console.log("blob", L, R, "bestX", bestX);
console.log("n cols with gap", rows.length);
console.log("min gap col", min);
console.log("center-ish median", nearMed);
console.log("near gaps img:", near.map(r=>r.gap));

// Report using center column of blob
const cx=Math.round(midX);
const crow=rows.find(r=>r.x===cx) || nearMed;
console.log("\nPRIMARY (blob center col)", crow);
console.log(JSON.stringify({
  canvasSize: "480x270 (image 960x540 @2x)",
  estimated_footY_canvas: crow.f/2,
  platformTopY_canvas: crow.p/2,
  gapPx_canvas: crow.gap/2,
  gapEmptyPx_canvas: crow.gapEmpty/2,
  note: "gapPx = platformTopY - footY in canvas space"
},null,2));
