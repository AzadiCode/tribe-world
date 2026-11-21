// ═══ مسیریابی شهروندان (شبکهٔ هزینه‌دار + A*) و مالکیت خانه‌ها. ═══
'use strict';
// ═══ ناوبری v6: شبکهٔ دقیق U با «هزینه» (پیاده‌رو کم‌هزینه، جاده پرهزینه) + A*
const NS=U,NN=360,NO=-45,nav=new Uint8Array(NN*NN),cost=new Float32Array(NN*NN),gs=new Float32Array(NN*NN),prv=new Int32Array(NN*NN);
let regH=[],hqH=null,homes=[],mkts=[],farms=[],treeSp=[],roadC=[],pathC=[],ctr=[0,0],RAD=10;const roadSet=new Set(),pathSet=new Set(),homeById=new Map();
let homesN=0,carRoadVer=0; // فاز ۰: homesN = تعداد خانه‌های غیر-HQ (مصرف stepCars؛ قبلاً هر تیک filter می‌ساخت)؛ carRoadVer = نسخهٔ گراف خودرو (مصرف 06-world-cars.js)
const _roadSig=new Map(),_roadSigNext=new Map(); // امضای عددی گراف خودرو: کلید مرکز شبکه‌ای ← (gx,gz,tl) بسته‌شده — همان معنای رشتهٔ قدیمی، بدون تخصیص
const ci=v=>Math.floor((v-NO)/NS),cw=i=>NO+(i+.5)*NS,walk=(x,z)=>{const i=ci(x),j=ci(z);return i>=0&&j>=0&&i<NN&&j<NN&&!nav[j*NN+i]};
const NAV_RIVER=[[-146,22],[-96,22],[-96,6],[-40,6],[-40,24],[16,24],[16,4],[72,4],[72,18],[146,18]]; // مسیر شکستهٔ رود — هماهنگ با RIVER_PTS در 06-world-scenery.js
const pondM=(x,z)=>{for(let i=1;i<NAV_RIVER.length;i++){const a=NAV_RIVER[i-1],b=NAV_RIVER[i],dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));if(Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz)<4.1)return true}return false}; // حریم رودخانه برای جلوگیری از عبور شهروند از آب
function blk(x0,x1,z0,z1){for(let j=Math.max(0,ci(z0));j<=Math.min(NN-1,ci(z1));j++)for(let i=Math.max(0,ci(x0));i<=Math.min(NN-1,ci(x1));i++)nav[j*NN+i]=1}
const PW=FOOT.road[0]*U*PATH_WIDTH_RATIO,ROADC=3.5,dry=(x,z)=>cost[ci(z)*NN+ci(x)]<3;
function setCost(X,Z,hx,hz,v,force,clip){for(let j=ci(Z-hz);j<=ci(Z+hz);j++)for(let i=ci(X-hx);i<=ci(X+hx);i++){if(i<0||j<0||i>=NN||j>=NN)continue;if(Math.abs(cw(i)-X)>hx||Math.abs(cw(j)-Z)>hz)continue;if(clip&&!inNavRegions(clip,i,j))continue;const k=j*NN+i;cost[k]=force?v:Math.min(cost[k],v)}}
// ─── فاز ۱ — لایهٔ ایستای ناوبری + پچ ناحیه‌ای ───
// مرز نقشه و حریم رود هرگز با تغییر ساختمان‌ها عوض نمی‌شود: اسکن ۱۲۹٬۶۰۰سلولیِ pondM (~۵۰ms که در فاز ۰ بر
// هر rebuildNav غالب بود) فقط «یک‌بار» در navStaticInit انجام و در NAV_STATIC انبار می‌شود؛ بعد از آن پایهٔ nav
// یک memcpy است. بازسازی افزایشی فقط ناحیه‌های WDIFF را reset و مشارکت‌کنندگانِ همان ناحیه‌ها را دوباره می‌نشاند —
// اثبات هم‌ارزی: تمام نوشته‌های هر سازه داخل bounds خودش است (بلوکه = rect؛ هزینهٔ جاده = همان ۹×۹
// bounds؛ پیاده‌رو/اتصال‌گر = سلول مرکز/جادهٔ مجاور)؛ پس سلول‌های بیرون ناحیه ارزش‌شان عوض نمی‌شود و داخل ناحیه
// از پایهٔ ایستا بازسازی می‌شود. دو نکتهٔ ظریف که fuzz گرفت: ۱) نوشتهٔ «force» جاده بازنویسیِ مطلق است و نباید
// بیرون ناحیه بنویسد وگرنه min اتصال‌گرِ پیاده‌رویِ خارجِ ناحیه را نابود می‌کند ⇒ در حالت پچ setCost با clip
// به ناحیه‌ها محدود می‌شود؛ ۲) اتصال‌گرِ پیاده‌رو داخل bounds جادهٔ مجاورش است ⇒ انتخاب پیاده‌رو = برخورد
// bounds خودش «یا» جادهٔ مجاورش با ناحیه. ترتیب (جاده‌ها force، بعد پیاده‌روها min) عین مسیر کامل.
// واپس‌زنی امن: بدون diff یا اولین بار ← مسیر کامل.
const NAV_STATIC=new Uint8Array(NN*NN);let navStaticReady=0,navBuilt=0;const NAV_OFF=Math.round(-NO/NS);
function navStaticInit(){for(let j=0;j<NN;j++)for(let i=0;i<NN;i++){const x=cw(i),z=cw(j);if(Math.abs(x)>38.5||Math.abs(z)>38.5||pondM(x,z))NAV_STATIC[j*NN+i]=1}navStaticReady=1}
// ناحیه‌های تغییر (مختصات خرده‌سلول): bounds هر مدخلِ WDIFF ±۱ + برای مدخل‌های پیاده‌رو، bounds جاده‌های
// مجاورشان هم (اتصال‌گرِ پیاده‌رو یک بلوک ۲×۲ دورِ مرکزِ لبهٔ جاده می‌نویسد و از ±۱ِ خودِ path بیرون می‌زند)؛
// نزدیک‌ها ادغام؛ بیش از ۱۲۸ مدخل ← یک جعبهٔ یکپارچه (افت تدریجی به رفتار «کامل» — هرگز نادرست).
function navRegions(diff){const raw=[];
 const grow=(gx,gz,rot,type)=>{const bd=fpBounds({type,gx,gz,rot:rot||0});raw.push([bd.x0-1,bd.x1+1,bd.z0-1,bd.z1+1]);
  if(type==='path')for(const rb of fpAdjacent({type,gx,gz,rot:rot||0}))if(rb.type==='road'){const rd=fpBounds(rb);raw.push([rd.x0-1,rd.x1+1,rd.z0-1,rd.z1+1])}};
 for(const a of diff.adds)grow(a.gx,a.gz,a.rot,a.type);
 for(const r of diff.removes)grow(r.gx,r.gz,r.rot,r.type);
 for(const m of diff.moves){grow(m.from.gx,m.from.gz,m.from.rot,m.type);grow(m.to.gx,m.to.gz,m.to.rot,m.type)}
 if(!raw.length)return[];
 if(raw.length>128){let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(const r of raw){if(r[0]<x0)x0=r[0];if(r[1]>x1)x1=r[1];if(r[2]<z0)z0=r[2];if(r[3]>z1)z1=r[3]}return[[x0,x1,z0,z1]]}
 const rs=raw.slice();let merged=true;
 while(merged){merged=false;
  for(let i=0;i<rs.length&&!merged;i++)for(let j=i+1;j<rs.length;j++){const a=rs[i],b=rs[j];
   if(a[0]<=b[1]+1&&b[0]<=a[1]+1&&a[2]<=b[3]+1&&b[2]<=a[3]+1){a[0]=Math.min(a[0],b[0]);a[1]=Math.max(a[1],b[1]);a[2]=Math.min(a[2],b[2]);a[3]=Math.max(a[3],b[3]);rs.splice(j,1);merged=true;break}}}
 return rs}
function navResetRegions(rs){for(const r of rs){const i0=Math.max(0,r[0]+NAV_OFF),i1=Math.min(NN-1,r[1]+NAV_OFF),j0=Math.max(0,r[2]+NAV_OFF),j1=Math.min(NN-1,r[3]+NAV_OFF);
 for(let j=j0;j<=j1;j++){const o=j*NN;for(let i=i0;i<=i1;i++){const k=o+i;nav[k]=NAV_STATIC[k];cost[k]=1.5}}}}
// ناحیه‌ها به مختصات سلول ناوبری — برای clip نوشته‌های هزینه و انتخاب مشارکت‌کنندگان
const navCellRects=rs=>rs.map(r=>[Math.max(0,r[0]+NAV_OFF),Math.min(NN-1,r[1]+NAV_OFF),Math.max(0,r[2]+NAV_OFF),Math.min(NN-1,r[3]+NAV_OFF)]);
const inNavRegions=(rs,i,j)=>{for(let n=0;n<rs.length;n++){const r=rs[n];if(i>=r[0]&&i<=r[1]&&j>=r[2]&&j<=r[3])return true}return false};
// انتخاب مشارکت‌کننده: rectِ سلولیِ bounds سازه با ناحیه‌ها برخورد کند (برای اتصال‌گر، جادهٔ مجاور هم آزموده می‌شود)
const selHit=(rs,bd)=>{const i0=bd.x0+NAV_OFF,i1=bd.x1+NAV_OFF,j0=bd.z0+NAV_OFF,j1=bd.z1+NAV_OFF;for(let n=0;n<rs.length;n++){const r=rs[n];if(i0<=r[1]&&r[0]<=i1&&j0<=r[3]&&r[2]<=j1)return true}return false};
const regHit=(rs,bd)=>{for(let i=0;i<rs.length;i++){const r=rs[i];if(bd.x0<=r[1]&&r[0]<=bd.x1&&bd.z0<=r[3]&&r[2]<=bd.z1)return true}return false};
function rebuildNav(w,diff){ // فاز ۱: diff=WDIFF اختیاری — با آن فقط ناحیهٔ تغییر؛ بدون آن کامل (خروجی بیت‌به‌بیت یکسان)
if(!navStaticReady)navStaticInit();
fpIndexUpdate(w.buildings,diff); // ایندکس مجاورت: افزایشی با WDIFF، وگرنه کامل — هر دو یک خروجی
const patch=navBuilt&&diff&&(diff.adds.length+diff.removes.length+diff.moves.length)>0;
const REG=patch?navRegions(diff):null;
const RN=patch?navCellRects(REG):null;
if(!patch){nav.set(NAV_STATIC);cost.fill(1.5)}else navResetRegions(REG);
homes=[];mkts=[];farms=[];treeSp=[];roadC=[];pathC=[];homeById.clear();occ.length=0;
const trees=[];let sx=0,sz=0,n=0;
// حلقهٔ فهرست‌ها همیشه کامل است (O(N) سبک و به ترتیب فهرست = خروجی یکسان)؛ فقط بلوکه‌سازی nav در حالت پچ
// به سازه‌های برخوردی با ناحیه محدود می‌شود. مستطیل occ مستقیم از fpBounds — بیت‌به‌بیت == fpRects قدیم، بدون Set/رشته.
for(const b of w.buildings){const X=b.x*U,Z=b.z*U,a=b.rot*Math.PI/180,fx=Math.sin(a),fz=Math.cos(a);const bd=fpBounds(b),rc=[bd.x0*U,(bd.x1+1)*U,bd.z0*U,(bd.z1+1)*U];occ.push(rc);const hit=!patch||regHit(REG,bd),bk=()=>blk(rc[0]+.001,rc[1]-.001,rc[2]+.001,rc[3]-.001);
if(b.type==='house'||b.type==='hq'){if(hit)bk();const h={id:b.id,x:X,z:Z,fx,fz,hq:b.type==='hq'};homes.push(h);homeById.set(b.id,h)}
else if(b.type==='market'){if(hit)bk();mkts.push({x:X+fx*1.25,z:Z+fz*1.25,cx:X,cz:Z})}
else if(b.type==='tree'){if(hit)bk();trees.push([X,Z])}
else if(b.type==='farm'){if(hit)bk();farms.push({x:X,z:Z})}
else if(b.type==='road')roadC.push({x:X,z:Z,b});
else if(b.type==='path')pathC.push({x:X,z:Z,b})
if(b.type!=='tree'){sx+=X;sz+=Z;n++}}
// شاخص‌های سریعِ کاشی جاده/پیاده‌رو برای خودروها و تشخیص محل گفت‌وگوی شهروندان.
// کلیدها همان مختصات شبکه‌ای‌اند که مصرف‌کننده‌ها با round(world/CELL) می‌سازند.
roadSet.clear();for(const r of roadC)roadSet.add(Math.round(r.x/CELL)+','+Math.round(r.z/CELL));
pathSet.clear();for(const p of pathC)pathSet.add(Math.round(p.x/CELL)+','+Math.round(p.z/CELL));
regH=homes.filter(h=>!h.hq).sort((a,b)=>a.id-b.id);hqH=homes.find(h=>h.hq)||null;ctr=n?[sx/n,sz/n]:[0,0];let E=0;for(const b of w.buildings)if(b.type!=='tree')E=Math.max(E,Math.hypot(b.x*U-ctr[0],b.z*U-ctr[1]));
RAD=Math.min(34,Math.max(8+2.6*Math.log2(1+((w.stats&&w.stats.pop)||1)),E+5)); // با رشد جمعیت، محدودهٔ حرکت بزرگ‌تر می‌شود
// هزینه‌ها: جاده‌ها force (پاس اول)، بعد پیاده‌روها min — ترتیب عین مسیر کامل؛ در حالت پچ فقط مشارکت‌کنندگانِ
// ناحیه، با clip نوشته‌ها به ناحیه (جادهٔ force نباید بیرون ناحیه بنویسد — بازنویسی min اتصال‌گرها را نابود می‌کند)
for(const{x:X,z:Z,b}of roadC){if(patch&&!selHit(RN,fpBounds(b)))continue;setCost(X,Z,1,1,ROADC,1,patch?RN:null)} // آسفالت: گران، برای ماشین‌هاست
for(const{x:X,z:Z,b}of pathC){let sel=!patch||selHit(RN,fpBounds(b));
 if(patch&&!sel)for(const rb of fpAdjacent(b))if(rb.type==='road'&&selHit(RN,fpBounds(rb))){sel=true;break} // اتصال‌گر داخل bounds جادهٔ مجاور است
 if(!sel)continue;const hw=PW/2;setCost(X,Z,hw,hw,.5,0,patch?RN:null);
 // مسیرهای مجاور از تماس واقعیِ footprint تشخیص داده می‌شوند؛ اتصال، سلول اضافه اشغال نمی‌کند.
 // فاز ۰: جفت‌ها از ایندکس مجاورت می‌آیند (همان مجموعه، بدون حلقهٔ مسیر×جاده) — خروجی بیت‌به‌بیت یکسان.
 for(const rb of fpAdjacent(b)){if(rb.type!=='road')continue;const d=fpTouchDir(rb,b);if(d<0)continue;
  const dx=[0,1,0,-1][d],dz=[-1,0,1,0][d],rx=rb.x*U+dx*(1-hw),rz=rb.z*U+dz*(1-hw),cx=dx?rx:X,cz=dz?rz:Z;setCost(cx,cz,hw,hw,.7,0,patch?RN:null)}}
for(const[X,Z]of trees)for(const[a,b]of[[.8,0],[-.8,0],[0,.8],[0,-.8]])if(walk(X+a,Z+b)){treeSp.push({x:X+a,z:Z+b,tx:X,tz:Z});break}
// فاز ۰ — شاخص تغییر گراف خودرو: امضای عددی (کلید شبکه‌ای مرکز ← gx,gz,tl) در برابر قبلی؛ فقط با تغییرِ واقعیِ جاده‌ها carRoadVer بالا می‌رود
// (ساخت/حذف خانه گراف خودرو را دست نمی‌زند — خودروها بی‌دلیل بیرون نمی‌روند). معادل دقیق امضای رشته‌ای قدیمی cars.js.
homesN=regH.length;
{let dirty=false;const next=_roadSigNext;next.clear();
 for(const r of roadC)next.set((Math.round(r.x/CELL)+512)*2048+(Math.round(r.z/CELL)+512),((r.b.gx??r.b.x)+512)*4096+((r.b.gz??r.b.z)+512)*8+(r.b.tl?1:0));
 if(next.size!==_roadSig.size)dirty=true;else for(const[k,v]of next){const o=_roadSig.get(k);if(o===undefined||o!==v){dirty=true;break}}
 if(dirty){carRoadVer++;_roadSig.clear();for(const[k,v]of next)_roadSig.set(k,v)}}
navBuilt=1;
refreshDeco()}
function freeNear(cx,cz,R){for(let t=0;t<40;t++){const x=cx+(Math.random()-.5)*2*R,z=cz+(Math.random()-.5)*2*R;if(walk(x,z)&&dry(x,z))return[x,z]}for(let r=1;r<80;r++)for(let a=0;a<12;a++){const x=cx+Math.cos(a/12*6.283)*r*.5,z=cz+Math.sin(a/12*6.283)*r*.5;if(walk(x,z))return[x,z]}return[0,0]}
const D8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]],hp=[],hf=[];
// با شبکهٔ U تعداد گره‌ها چهار برابر نسخهٔ قبلی است؛ فقط گره‌های لمس‌شده در هر جست‌وجو مقداردهی می‌شوند.
const pathSeen=new Uint32Array(NN*NN),PATH_NODE_BUDGET=MOB?2200:4800;let pathRun=0;
function hpush(f,n){let i=hp.length;hp.push(n);hf.push(f);while(i){const p=(i-1)>>1;if(hf[p]<=f)break;hp[i]=hp[p];hf[i]=hf[p];i=p}hp[i]=n;hf[i]=f}
function hpop(){const n=hp[0],ln=hp.pop(),lf=hf.pop();if(hp.length){let i=0;for(;;){let c=2*i+1;if(c>=hp.length)break;if(c+1<hp.length&&hf[c+1]<hf[c])c++;if(hf[c]>=lf)break;hp[i]=hp[c];hf[i]=hf[c];i=c}hp[i]=ln;hf[i]=lf}return n}
function findPath(sx,sz,tx,tz){
const si=ci(sx),sj=ci(sz),ti=ci(tx),tj=ci(tz);
if(si<0||sj<0||ti<0||tj<0||si>=NN||sj>=NN||ti>=NN||tj>=NN)return null;
const s=sj*NN+si,t=tj*NN+ti;if(nav[t]||nav[s])return null;if(s===t)return[];
pathRun=(pathRun+1)>>>0;if(!pathRun){pathSeen.fill(0);pathRun=1}const run=pathRun;
hp.length=hf.length=0;pathSeen[s]=run;gs[s]=0;prv[s]=s;
const tX=t%NN,tZ=(t/NN)|0,H=(x,z)=>{const a=Math.abs(x-tX),b=Math.abs(z-tZ);return(Math.max(a,b)+.414*Math.min(a,b))*NS};hpush(H(si,sj),s);let it=0;
while(hp.length&&it++<PATH_NODE_BUDGET){const c=hpop();if(c===t)break;const x=c%NN,z=(c/NN)|0,gc=gs[c];
for(const[dx,dz]of D8){const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=NN||nz>=NN)continue;const n=nz*NN+nx;if(nav[n])continue;if(dx&&dz&&(nav[z*NN+nx]||nav[nz*NN+x]))continue;const ng=gc+cost[n]*(dx&&dz?1.414:1);if(pathSeen[n]!==run||ng<gs[n]){pathSeen[n]=run;gs[n]=ng;prv[n]=c;hpush(ng+H(nx,nz),n)}}}
if(pathSeen[t]!==run||prv[t]<0)return null;const raw=[];for(let c=t;c!==s;c=prv[c]){if(c<0||pathSeen[c]!==run)return null;raw.push([cw(c%NN),cw((c/NN)|0)])}raw.reverse();
const out=[];for(let i=0;i<raw.length;i++){const a=raw[i-1]||[sx,sz],b=raw[i],n=raw[i+1];if(n&&Math.abs((b[0]-a[0])*(n[1]-b[1])-(b[1]-a[1])*(n[0]-b[0]))<1e-6)continue;out.push(b)}return out}
// ═══ مالکیت خانه‌ها: دفتر مدیرعامل = بنیان‌گذار؛ بقیه به ترتیب یک خانه برای هر نفر (اگر خانه کم باشد، چند نفر مشترک)
const homeFor=i=>i===0&&hqH?hqH:regH.length?regH[(i-(hqH?1:0))%regH.length]:null;
const ownersIdx=h=>{const r=[];for(let i=0;i<cits.length;i++)if(homeFor(i)===h)r.push(i);return r};
function bInfo(b){const h=homeById.get(b.id);if(!h)return W.catalog[b.type]||'';const o=ownersIdx(h);
if(h.hq)return(W.catalog.hq||'دفتر مدیرعامل')+' · '+nameOf(0);
if(!o.length)return'خانهٔ خالی (هنوز صاحبی ندارد)';const nm=o.slice(0,3).map(nameOf).join('، ');return'خانهٔ '+nm+(o.length>3?' و '+fa(o.length-3)+' نفر دیگر':'')}
function ownerHi(b){const h=homeById.get(b.id);if(!h)return;ownersIdx(h).slice(0,2).forEach(i=>{const c=cits[i];if(c&&!c.hid)dgSay(c,[h.hq?'ownq':'own'],2800,'o')})}
