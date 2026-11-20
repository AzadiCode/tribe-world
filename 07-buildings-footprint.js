// ═══ ردپای یکپارچهٔ خرده‌سلولی: اشغال، برخورد، snap و اتصال ورودی‌ها ═══
'use strict';
const GRID=8,U=CELL/GRID;
const PATH_WIDTH_RATIO=1/4;
const FOOT={house:[6,6],hq:[8,8],farm:[8,8],market:[8,6],tree:[2,2],road:[8,8],crossing:[2,2],banner:[6,3]};
const PATH_CELLS=Math.max(1,Math.ceil(FOOT.road[0]*PATH_WIDTH_RATIO));FOOT.path=[PATH_CELLS,PATH_CELLS];
const FP_LO=-20*GRID,FP_HI=20*GRID-1;
const fpGrid=t=>t==='road'||t==='path',fpDi=(dx,dz)=>dz<0?0:dx>0?1:dz>0?2:3;
let fpHit=null;
const FP_RIVER=[[-146,22],[-96,22],[-96,6],[-40,6],[-40,24],[16,24],[16,4],[72,4],[72,18],[146,18]]; // مسیر شکستهٔ رود — هماهنگ با RIVER_PTS در 06-world-scenery.js
// حریم رود از مسیر «فِلِت‌شده» (filletDist در 06-world-scenery.js که قبل از این فایل بارگذاری می‌شود) اندازه گرفته
// می‌شود، نه از چندخطی خام — چون آب/ساحل/جالیِ زمین همه از مسیر فِلِت پیروی می‌کنند و کمانِ گوشه‌ها تا ~۱٫۷۶ داخل
// زاویه می‌بُرد؛ با گاردِ خام، سازهٔ مجاز در پیچ‌ها وسط جالیِ رود یا حلقهٔ سنگ ساحل می‌نشیند (باگ «محو شدن» کنار آب).
const fpPondW=(X,Z)=>filletDist(X,Z)<4.1;
const fpTiles=l=>{const s=new Set();for(const b of l)if(b.type==='path')s.add((b.gx??b.x)+','+(b.gz??b.z));return s};
const fpDims=(t,rot=0)=>{const f=FOOT[t]||FOOT.tree;return !fpGrid(t)&&rot%180?[f[1],f[0]]:f};
function fpCoreCells(b){const gx=b.gx??b.x,gz=b.gz??b.z,[w,h]=fpDims(b.type,b.rot||0),x0=gx-Math.floor(w/2),z0=gz-Math.floor(h/2),s=new Set();
 for(let x=x0;x<x0+w;x++)for(let z=z0;z<z0+h;z++)s.add(x+','+z);return s}
function fpCellParts(b,tiles){return[fpCoreCells(b)]}
function fpBounds(b){const gx=b.gx??b.x,gz=b.gz??b.z,[w,h]=fpDims(b.type,b.rot||0);return{x0:gx-Math.floor(w/2),x1:gx-Math.floor(w/2)+w-1,z0:gz-Math.floor(h/2),z1:gz-Math.floor(h/2)+h-1}}
// جهت تماسِ لبه‌به‌لبه از آیتم a به b؛ تماس گوشه‌ای اتصال محسوب نمی‌شود.
function fpTouchDir(a,b){const A=fpBounds(a),B=fpBounds(b),ovZ=A.z0<=B.z1&&B.z0<=A.z1,ovX=A.x0<=B.x1&&B.x0<=A.x1;
 if(A.x1+1===B.x0&&ovZ)return 1;if(B.x1+1===A.x0&&ovZ)return 3;
 if(A.z1+1===B.z0&&ovX)return 2;if(B.z1+1===A.z0&&ovX)return 0;return-1}
const fpPartsRect=parts=>parts.map(set=>{let xs=[],zs=[];for(const k of set){const[x,z]=k.split(',').map(Number);xs.push(x);zs.push(z)}
 return[Math.min(...xs)*U,(Math.max(...xs)+1)*U,Math.min(...zs)*U,(Math.max(...zs)+1)*U]});
function fpRects(b,TL){return fpPartsRect(fpCellParts(b,TL))}
const fpDim=(t,rot)=>fpDims(t,rot).map(v=>v*U);
function fpCheck(type,x,z,rot,others){fpHit=null;x=Math.round(x);z=Math.round(z);rot=fpGrid(type)?0:(Math.round((rot||0)/90)*90)%360;
 const b={type,x,z,gx:x,gz:z,rot},cells=fpCoreCells(b);
 for(const k of cells){const[cx,cz]=k.split(',').map(Number);if(cx<FP_LO||cx>FP_HI||cz<FP_LO||cz>FP_HI)return'خارج از نقشه';if(fpPondW((cx+.5)*U,(cz+.5)*U))return'حریم رودخانه'}
 const occ=new Map();for(const o of others)for(const k of fpCoreCells(o))if(!occ.has(k))occ.set(k,o);
 for(const k of cells)if(occ.has(k)){fpHit=occ.get(k);return'برخورد'}
 return true}

function fpSnap(type,rot,wx,wz,others){const gx0=Math.round(wx/U),gz0=Math.round(wz/U);
 for(let r=0;r<=24;r++){const cand=[];for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++)if(Math.max(Math.abs(dx),Math.abs(dz))===r)cand.push([gx0+dx,gz0+dz]);
  cand.sort((a,b)=>(a[0]-gx0)**2+(a[1]-gz0)**2-((b[0]-gx0)**2+(b[1]-gz0)**2));
  for(const[gx,gz]of cand)if(fpCheck(type,gx,gz,rot,others)===true)return[gx,gz]}
 return[gx0,gz0]}
function fpDoorMaskForPath(path,blds){let mask=0;for(const b of blds){if(fpGrid(b.type))continue;const d=fpTouchDir(path,b);if(d<0)continue;const a=(b.rot||0)*Math.PI/180,allowed=(b.type==='house'||b.type==='hq')?fpDi(Math.round(Math.sin(a)),Math.round(Math.cos(a))):-1;if(allowed<0||(d+2)%4===allowed)mask|=1<<d}return mask}
function fpDoorLinks(blds){const out=[],paths=blds.filter(b=>b.type==='path');
 for(const b of blds){if(fpGrid(b.type))continue;
  const a=(b.rot||0)*Math.PI/180,allowed=(b.type==='house'||b.type==='hq')?fpDi(Math.round(Math.sin(a)),Math.round(Math.cos(a))):-1;
  for(const p of paths){const d=fpTouchDir(p,b);if(d<0)continue;const fromBuilding=(d+2)%4;if(allowed>=0&&fromBuilding!==allowed)continue;
   out.push({cx:p.gx??p.x,cz:p.gz??p.z,d})}}
 return out}
