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
// ۴٫۴ = تا بیرونی‌ترین لبهٔ چمنِ ساحل (نمونه‌ها روی نیم‌شبکه تا ~۴٫۰ + نیم‌کاشی ≈ ۴٫۲۸) ⇒ سازه هیچ‌وقت با ردیف
// چمن/سنگِ ساحل هم‌پوشان نمی‌شود — گزارش کاربر: «کنار رود هرچی می‌سازم دیده نمی‌شود؛ از جایی به بعد پیاده‌رو محو است».
const fpPondW=(X,Z)=>filletDist(X,Z)<4.4;
// ─── ارتفاعِ پایهٔ سازه روی زمینِ واقعی (ریشهٔ اصلیِ باگِ «محو شدن کنار رود»): زمینِ بازی تختِ همیشه‌صفر نیست —
// در حریم رود جالیِ ساحل تا ۰٫۰۶ بالا می‌آید (hgt در 06-world-scenery.js)، چمنِ ساحل تا ~۰٫۱۶۵ و سنگِ لبهٔ آب تا
// ~۰٫۲۴۵ می‌رسد؛ سازه‌ای که با y=۰ گذاشته شود زیرِ این ساحلِ بلندشده دفن می‌شود ⇒ پیاده‌رو از خطِ شروعِ جالی به بعد
// کاملاً محو است و کفِ خانه‌ها زیرِ چمن می‌رود. قاعدهٔ نشستن (نسخهٔ Engine 2.0): «بیشینهٔ مطلق» ارتفاعِ زمین روی
// ۴ گوشه + مرکزِ ردپا — یعنی هیچ گوشه‌ای در هیچ شیبی (ساحلِ رود، دامنهٔ تپه‌های حاشیهٔ نقشه) هرگز دفن نمی‌شود.
// (نسخهٔ قبلی سقفِ «مرکز+۰٫۰۳» داشت که در دامنهٔ تپه‌ها گوشهٔ بالایی را تا ~۳٫۸cm داخل زمین می‌برد — تست عددی:
// ۸۳۹ موقعیتِ دفن‌شده؛ با قاعدهٔ بیشینهٔ مطلق دفن=۰ و شناوریِ بیشینه فقط در تندترین شیبِ گوشه‌های نقشه است.)
// در مرکزِ شهرِ هموار hgt≡۰ ⇒ خروجی دقیقاً ۰ = رفتار قبل؛ هیچ سازهٔ موجودِ شهر جابه‌جا نمی‌شود.
function fpBaseY(type,x,z,rot=0){const[w,h]=fpDims(type,rot),hw=w*U/2,hh=h*U/2,wx=x*U,wz=z*U,c=hgt(wx,wz);let mx=c;
 for(const[ox,oz]of[[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]]){const v=hgt(wx+ox,wz+oz);if(v>mx)mx=v}
 return mx}
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

// ─── ایندکس مجاورت سلولی (فاز ۰) + به‌روزرسانی افزایشی (فاز ۱) ────────────────
// هدف: حذف حلقه‌های درجه‌دوِ roads()/rebuildNav (مسیر×سازه، تابلو×جاده) و کلیدهای رشته‌ای،
// با «خروجی بیت‌به‌بیت یکسان». مقیاس: هزاران ساختمان (هیچ فرض «صدها» در ساختار نیست).
// ایندکس فقط روی دنیای معتبر (بدون همپوشانی — تضمین check_place/fpCheck) معنا دارد؛ هر سلول یک ساکن.
// فاز ۰: fpWorldVer با هر تغییر ساختمان‌ها +۱ می‌شود (12-net-sync.js)؛ fpIndexEnsure فقط در تغییر بازسازی می‌کند.
// فاز ۱: fpIndexUpdate مدخل‌های WDIFF (add/remove/move با ID) را «افزایشی» روی ایندکس می‌نشاند — بدون پاک‌سازی
// کل Map (چرنِ حافظهٔ ۲۰۰ ساخت/حذف از ~۲۰هزار cell.set در هر تغییر به چند ده می‌رسد). نشانهٔ کهنگی = طول فهرست؛
// هر ناهنجاری (نبود رکورد، هم‌پوشانی غیرممکن، ناهم‌خوانی طول) ← بازسازی کاملِ امن. خروجی نهایی هر دو مسیر یکسان.
let fpWorldVer=0;
const FPIDX={src:null,ver:-1,n:-1,cell:new Map(),byType:{},ord:new WeakMap()},
 fpIdxKey=(x,z)=>(x+512)*2048+(z+512); // gx,gz ∈ [-512,511] — نقشهٔ ۳۲۰ خرده‌سلولی + حاشیهٔ رشد
function fpIndexScan(blds){ // بازسازی کامل — تنها مرجعِ حقیقت؛ مسیر افزایشی هر ناهنجاری را به همین می‌فرستد
 const cell=FPIDX.cell,by=FPIDX.byType,ord=FPIDX.ord;
 cell.clear();for(const k in by)by[k].clear();
 for(let i=0;i<blds.length;i++){const b=blds[i],bd=fpBounds(b);ord.set(b,i);
  for(let x=bd.x0;x<=bd.x1;x++)for(let z=bd.z0;z<=bd.z1;z++)cell.set(fpIdxKey(x,z),b);
  let m=by[b.type];if(!m)m=by[b.type]=new Map(); // نقشهٔ «مرکز→ساختمان» به‌ازای نوع ( همان معنای byType قدیمی roads )
  m.set(fpIdxKey(b.gx??b.x,b.gz??b.z),b)}
 FPIDX.n=blds.length}
function fpIndexEnsure(blds){
 // n جزو نشانهٔ تازگی است: push/splice بدون bump (مستقیم در تست/بنچ) هم ایندکس را کهنه می‌کند — قبلاً پنهان می‌ماند و ماسک کهنه می‌داد
 if(FPIDX.src===blds&&FPIDX.ver===fpWorldVer&&FPIDX.n===blds.length)return FPIDX;
 FPIDX.src=blds;FPIDX.ver=fpWorldVer;
 fpIndexScan(blds);
 return FPIDX}
// فاز ۱ — اعمال افزایشی WDIFF: removes/moves/adds با ID و bounds از مدخلِ diff (data-only؛ مقایسه با id).
// ترتیب: حذف‌ها ← جابه‌جایی‌ها (drop از from + put رکورد واقعی در to) ← افزودن‌ها؛ سپس ord کامل O(N) (فقط WeakMap.set).
const _fpIdMap=new Map();
function fpIndexUpdate(blds,diff){
 const need=blds.length-(diff?diff.adds.length:0)+(diff?diff.removes.length:0);
 if(!diff||FPIDX.src!==blds||FPIDX.n!==need){fpIndexEnsure(blds);return FPIDX}
 const cell=FPIDX.cell,by=FPIDX.byType;let ok=true;
 const drop=o=>{const bd=fpBounds(o),m=by[o.type],ck=fpIdxKey(o.gx??o.x,o.gz??o.z);
  for(let x=bd.x0;x<=bd.x1;x++)for(let z=bd.z0;z<=bd.z1;z++){const k=fpIdxKey(x,z),c=cell.get(k);
   if(c===undefined)continue;else if(c.id===o.id)cell.delete(k);else ok=false} // سلولِ دیگری مالِ این مدخل نیست ← ناهنجاری
  if(m){const cur=m.get(ck);if(cur&&cur.id===o.id)m.delete(ck);else if(cur)ok=false}}
 const put=b=>{const bd=fpBounds(b);
  for(let x=bd.x0;x<=bd.x1;x++)for(let z=bd.z0;z<=bd.z1;z++)cell.set(fpIdxKey(x,z),b);
  let m=by[b.type];if(!m)m=by[b.type]=new Map();m.set(fpIdxKey(b.gx??b.x,b.gz??b.z),b)};
 if(diff.adds.length||diff.moves.length){_fpIdMap.clear();for(let i=0;i<blds.length;i++)_fpIdMap.set(blds[i].id,blds[i])}
 for(const r of diff.removes)drop(r);
 for(const mv of diff.moves){const b=_fpIdMap.get(mv.id);if(!b){ok=false;break}
  drop({id:mv.id,type:mv.type,gx:mv.from.gx,gz:mv.from.gz,rot:mv.from.rot});put(b)}
 if(ok)for(const a of diff.adds){const b=_fpIdMap.get(a.id);if(!b){ok=false;break}put(b)}
 FPIDX.src=blds;
 if(!ok){fpIndexScan(blds);return FPIDX} // برگشت امن به کامل — خروجی نهایی یکسان
 const ord=FPIDX.ord;for(let i=0;i<blds.length;i++)ord.set(blds[i],i);
 FPIDX.ver=fpWorldVer;FPIDX.n=blds.length;
 return FPIDX}
// همسایه‌های چسبیدهٔ b (هر نوع)، مرتب به ترتیبِ فهرست ساختمان‌ها — معادل اسکن کامل با fpTouchDir.
// خروجی آرایهٔ مشترک است؛ قبل از فراخوانیِ بعدی مصرفش کن (بدون تخصیص در هر فراخوانی).
const _fpAdj=[],_fpAdjSeen=new Set();
function fpAdjacent(b){const r=_fpAdj,seen=_fpAdjSeen;r.length=0;seen.clear();
 const bd=fpBounds(b),cell=FPIDX.cell;
 const edge=(x,z)=>{const o=cell.get(fpIdxKey(x,z));if(o&&!seen.has(o)){seen.add(o);r.push(o)}};
 for(let z=bd.z0;z<=bd.z1;z++){edge(bd.x1+1,z);edge(bd.x0-1,z)}
 for(let x=bd.x0;x<=bd.x1;x++){edge(x,bd.z1+1);edge(x,bd.z0-1)}
 if(r.length>1)r.sort((a,c)=>FPIDX.ord.get(a)-FPIDX.ord.get(c));
 return r}
// ماسک اتصال با همان معنای دقیق roads() قدیم: همسایهٔ نوع t با «مرکز» دقیقاً (dim_a+dim_b)/2 خرده‌سلول دور؛ تأیید fpTouchDir.
const FP_MASK_DIM={road:FOOT.road[0],path:FOOT.path[0],crossing:FOOT.crossing[0]},FP_MASK_DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
function fpMaskFor(b,types){let m=0;const x=b.gx??b.x,z=b.gz??b.z;
 for(const t of types){const d=(FP_MASK_DIM[b.type]+FP_MASK_DIM[t])/2,map=FPIDX.byType[t];if(!map)continue;
  for(let i=0;i<4;i++){const o=map.get(fpIdxKey(x+FP_MASK_DIRS[i][0]*d,z+FP_MASK_DIRS[i][1]*d));if(o&&fpTouchDir(b,o)>=0)m|=1<<i}}
 return m}
// ماسکِ درِ همهٔ پیاده‌روها — همان قاعدهٔ fpDoorLinks (تماس واقعی + ضلعِ درِ خانه/دفتر)، با ایندکس و کلید عددی.
const _fpDoorM=new Map();
function fpDoorMask(blds){fpIndexEnsure(blds);const out=_fpDoorM;out.clear();
 for(const p of blds){if(p.type!=='path')continue;
  const k=fpIdxKey(p.gx??p.x,p.gz??p.z);
  for(const b of fpAdjacent(p)){if(fpGrid(b.type))continue;const d=fpTouchDir(p,b);if(d<0)continue;
   const a=(b.rot||0)*Math.PI/180,allowed=(b.type==='house'||b.type==='hq')?fpDi(Math.round(Math.sin(a)),Math.round(Math.cos(a))):-1;
   if(allowed>=0&&(d+2)%4!==allowed)continue;
   out.set(k,(out.get(k)||0)|(1<<d))}}
 return out}
// ماسک گذرگاه برای یک کاشی جاده: تابلوهای چسبیده با ایندکس — همان نگاشت جهت roadCrossingMask.
function fpCrossMaskFor(road){let mask=0;
 for(const s of fpAdjacent(road)){if(s.type!=='crossing')continue;const d=fpTouchDir(s,road);if(d>=0)mask|=[4,8,1,2][d]}
 return mask}
// اولین جادهٔ چسبیده به تابلو (به ترتیب فهرست ساختمان‌ها — همان «اولین rs» کد قدیم) برای جهت‌گیری صفحهٔ تابلو.
function fpFirstTouchRoad(c){for(const r of fpAdjacent(c))if(r.type==='road'){const d=fpTouchDir(c,r);if(d>=0)return r}return null}
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

// ── fpSnap: نزدیک‌ترین جای آزاد به نقطهٔ لمس. روی «هر» pointerdown/move/up مود ساخت صدا زده می‌شود.
// نسخهٔ قدیم به‌ازای «هر کاندیدا» fpCheck کامل می‌زد که خودش نقشهٔ اشغال را از صفر می‌ساخت ⇒ هزینهٔ
// (سلول‌های شهر)×(تا ~۲۴۰۰ کاندیدا) — اندازه‌گیری واقعی: شهر ۲۵۰سازه‌ای، یک تپِ متراکم ۵۲۳ms (روی گوشی
// چند ثانیه انجماد به‌ازای هر تپ/درگ = «خونه نمیشه ساخت»). حالا: نقشهٔ اشغال یک‌بار به‌ازای هر فراخوان +
// حریم رود از حافظهٔ ایستا (FILLET از RIVER_PTS ثابت ساخته می‌شود؛ کلید = سلول، نقطهٔ ارزیابی همان مرکزِ
// سلولِ fpCheck) + بررسی درجای هر کاندیدا. خروجی بیت‌به‌بیت همان قدیم: همین ترتیب حلقه‌ها/مرتب‌سازی و همین
// شرط پذیرش «همهٔ سلول‌ها داخل نقشه ∧ خارج حریم رود ∧ خالی». fpCheck خودش دست‌نخورده ماند (مرجع درستی).
const POND_MEMO=new Map();
const fpPondCell=(x,z)=>{const k=(x+512)*2048+(z+512);let v=POND_MEMO.get(k);
 if(v===undefined){v=filletDist((x+.5)*U,(z+.5)*U)<4.4;if(POND_MEMO.size>150000)POND_MEMO.clear();POND_MEMO.set(k,v)}return v};
function fpSnap(type,rot,wx,wz,others){const gx0=Math.round(wx/U),gz0=Math.round(wz/U);
 const rotN=fpGrid(type)?0:(Math.round((rot||0)/90)*90)%360,[w,h]=fpDims(type,rotN),hw=Math.floor(w/2),hh=Math.floor(h/2);
 const occ=new Map();for(const o of others)for(const k of fpCoreCells(o))if(!occ.has(k))occ.set(k,o);
 for(let r=0;r<=24;r++){const cand=[];
  for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++)if(Math.max(Math.abs(dx),Math.abs(dz))===r)cand.push([gx0+dx,gz0+dz]);
  cand.sort((a,b)=>(a[0]-gx0)**2+(a[1]-gz0)**2-((b[0]-gx0)**2+(b[1]-gz0)**2));
  for(const[gx,gz]of cand){const x0=gx-hw,z0=gz-hh;let ok=true;
   for(let x=x0;x<x0+w&&ok;x++)for(let z=z0;z<z0+h&&ok;z++)
    if(x<FP_LO||x>FP_HI||z<FP_LO||z>FP_HI||fpPondCell(x,z)||occ.has(x+','+z))ok=false;
   if(ok)return[gx,gz]}}
 return[gx0,gz0]}
function fpDoorMaskForPath(path,blds){let mask=0;for(const b of blds){if(fpGrid(b.type))continue;const d=fpTouchDir(path,b);if(d<0)continue;const a=(b.rot||0)*Math.PI/180,allowed=(b.type==='house'||b.type==='hq')?fpDi(Math.round(Math.sin(a)),Math.round(Math.cos(a))):-1;if(allowed<0||(d+2)%4===allowed)mask|=1<<d}return mask}
function fpDoorLinks(blds){const out=[],paths=blds.filter(b=>b.type==='path');
 for(const b of blds){if(fpGrid(b.type))continue;
  const a=(b.rot||0)*Math.PI/180,allowed=(b.type==='house'||b.type==='hq')?fpDi(Math.round(Math.sin(a)),Math.round(Math.cos(a))):-1;
  for(const p of paths){const d=fpTouchDir(p,b);if(d<0)continue;const fromBuilding=(d+2)%4;if(allowed>=0&&fromBuilding!==allowed)continue;
   out.push({cx:p.gx??p.x,cz:p.gz??p.z,d})}}
 return out}
